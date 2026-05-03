import { spawn } from "node:child_process";

const entries = [
  ["server", ["scripts/dev-entry.mjs", "server"]],
  ["app", ["scripts/dev-entry.mjs", "app"]]
];

const children = entries.map(([name, args]) => {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    env: process.env
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} dev command exited with ${code}.`);
      stopAll();
      process.exit(code);
    }
  });

  return child;
});

process.on("SIGINT", () => {
  stopAll();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopAll();
  process.exit(143);
});

function stopAll() {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}
