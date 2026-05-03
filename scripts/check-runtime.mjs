import { spawnSync } from "node:child_process";

const bun = spawnSync("bun", ["--version"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

if (bun.status === 0) {
  console.log(`Bun ${bun.stdout.trim()} available.`);
} else {
  console.warn("Bun is not available in this shell. Install Bun before demo runs.");
}

console.log(`Node ${process.version} available for fallback tests.`);
