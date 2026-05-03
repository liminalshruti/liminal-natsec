import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { loadConfigIniIntoEnv } from "./load-config-ini.mjs";

const lane = process.argv[2];

if (!lane || !["app", "server", "desktop"].includes(lane)) {
  console.error("Usage: node scripts/dev-entry.mjs <app|server|desktop>");
  process.exit(1);
}

const bun = resolveBun();

if (!hasBun(bun)) {
  console.error("Bun is required for dev commands. Install Bun, then rerun this command.");
  process.exit(1);
}

const command = commandFor(lane, bun);

if (!command) {
  console.error(`${lane} dev entrypoint is not present yet.`);
  process.exit(1);
}

loadConfigIniIntoEnv();

const child = spawn(command.cmd, command.args, {
  stdio: "inherit",
  env: process.env,
  cwd: command.cwd
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }

  process.exit(code ?? 0);
});

function commandFor(target, bunCommand) {
  const packagePath = `${target}/package.json`;

  if (existsSync(packagePath)) {
    const manifest = JSON.parse(readFileSync(packagePath, "utf8"));

    if (manifest.scripts?.dev) {
      return { cmd: bunCommand, args: ["run", "--cwd", target, "dev"] };
    }
  }

  if (target === "server" && existsSync("server/src/index.ts")) {
    return { cmd: bunCommand, args: ["--watch", "server/src/index.ts"] };
  }

  if (target === "app" && existsSync("app/index.html")) {
    return { cmd: bunCommand, args: ["x", "vite", "--host", "0.0.0.0"], cwd: "app" };
  }

  if (target === "desktop" && existsSync("electron/start-desktop.mjs")) {
    return { cmd: "node", args: ["electron/start-desktop.mjs"] };
  }

  return null;
}

function hasBun(command) {
  return spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
}

function resolveBun() {
  const candidates = [
    process.env.BUN_BIN,
    process.env.BUN_INSTALL ? join(process.env.BUN_INSTALL, "bin", "bun") : undefined,
    join(homedir(), ".bun", "bin", "bun"),
    "bun"
  ].filter((candidate) => typeof candidate === "string" && candidate.length > 0);

  for (const candidate of candidates) {
    if (candidate === "bun" || existsSync(candidate)) {
      return candidate;
    }
  }

  return "bun";
}
