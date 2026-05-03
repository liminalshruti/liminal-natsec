// Boot the Vite dev server (if not already running), wait for it, then launch Electron.
// Spawns are cleaned up on exit so Ctrl+C kills the whole tree.

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import waitOn from "wait-on";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const appDir = join(repoRoot, "app");
const devUrl = process.env.SEAFORGE_DEV_URL || "http://localhost:5173";
const skipVite = process.env.SEAFORGE_SKIP_VITE === "1";

const children = [];
function trackChild(child, label) {
  children.push({ child, label });
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[desktop] ${label} exited with code ${code}`);
    }
  });
}

function shutdown() {
  for (const { child, label } of children) {
    if (!child.killed) {
      try {
        child.kill("SIGTERM");
      } catch (err) {
        console.error(`[desktop] failed to kill ${label}:`, err);
      }
    }
  }
}
process.on("SIGINT", () => { shutdown(); process.exit(0); });
process.on("SIGTERM", () => { shutdown(); process.exit(0); });
process.on("exit", shutdown);

async function main() {
  if (!skipVite) {
    console.log("[desktop] starting Vite dev server in app/");
    const vite = spawn("bun", ["run", "dev"], {
      cwd: appDir,
      stdio: "inherit",
      env: { ...process.env }
    });
    trackChild(vite, "vite");
  }

  console.log(`[desktop] waiting for ${devUrl}`);
  await waitOn({
    resources: [devUrl],
    timeout: 60_000,
    interval: 500,
    validateStatus: (status) => status >= 200 && status < 500
  });

  console.log("[desktop] launching Electron");
  const electron = spawn("npx", ["electron", "."], {
    cwd: __dirname,
    stdio: "inherit",
    env: { ...process.env, SEAFORGE_DEV_URL: devUrl }
  });
  trackChild(electron, "electron");

  electron.on("exit", (code) => {
    shutdown();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error("[desktop] failed to start:", err);
  shutdown();
  process.exit(1);
});
