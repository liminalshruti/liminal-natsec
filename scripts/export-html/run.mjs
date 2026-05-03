// Orchestrates the UI/UX HTML export end-to-end.
//
// Steps:
//   1. Ensure the Vite dev server is reachable on :5173 (start one if not).
//   2. Run snapshot-screens.mjs → export/html/screens/*.html
//   3. Run snapshot-components.mjs → export/html/components/*.html
//   4. Run build-index.mjs → export/html/index.html
//
// We boot Vite from the app/ workspace via `bun run dev`. If a dev server is
// already listening on :5173 (the user is iterating in another terminal), we
// reuse it instead of double-binding.

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const appDir = join(repoRoot, "app");

const BASE_URL = process.env.SNAPSHOT_BASE_URL ?? "http://localhost:5173";

async function isUp(url) {
  try {
    const res = await fetch(url, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitUntilUp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUp(url)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

function startVite() {
  console.log("• Starting Vite dev server (app/ workspace) …");
  const proc = spawn("bun", ["run", "dev"], {
    cwd: appDir,
    env: { ...process.env, FORCE_COLOR: "0" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  proc.stdout.on("data", (chunk) => {
    const line = chunk.toString();
    if (process.env.SNAPSHOT_VERBOSE) process.stdout.write(`  vite> ${line}`);
  });
  proc.stderr.on("data", (chunk) => {
    const line = chunk.toString();
    if (process.env.SNAPSHOT_VERBOSE) process.stderr.write(`  vite! ${line}`);
  });
  return proc;
}

function runNode(scriptPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [scriptPath], {
      cwd: repoRoot,
      stdio: "inherit",
      env: { ...process.env, SNAPSHOT_BASE_URL: BASE_URL }
    });
    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptPath} exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

async function main() {
  let vite = null;
  let ownsServer = false;
  if (!(await isUp(BASE_URL))) {
    vite = startVite();
    ownsServer = true;
    const ready = await waitUntilUp(BASE_URL, 60_000);
    if (!ready) {
      vite.kill("SIGINT");
      throw new Error(`Vite dev server did not come up at ${BASE_URL} within 60s`);
    }
    console.log("• Vite up.\n");
  } else {
    console.log(`• Reusing dev server at ${BASE_URL}\n`);
  }

  try {
    console.log("• Capturing demo-beat screens …");
    await runNode(join(here, "snapshot-screens.mjs"));
    console.log("");
    console.log("• Capturing per-component renders …");
    await runNode(join(here, "snapshot-components.mjs"));
    console.log("");
    console.log("• Building landing index …");
    await runNode(join(here, "build-index.mjs"));
    console.log("\n✓ export/html/ ready. Open export/html/index.html.");
  } finally {
    if (vite && ownsServer) {
      vite.kill("SIGINT");
    }
  }
}

main().catch((err) => {
  console.error("\n✗", err);
  process.exit(1);
});
