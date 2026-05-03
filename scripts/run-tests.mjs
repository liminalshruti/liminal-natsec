import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["tests", "server/test", "app/test"];
const testFiles = roots.flatMap((root) => collectTests(root)).sort();

if (testFiles.length === 0) {
  console.log("No test files found.");
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--test", ...testFiles],
  { stdio: "inherit" }
);

process.exit(result.status ?? 1);

function collectTests(root) {
  if (!existsSync(root)) {
    return [];
  }

  const entries = readdirSync(root)
    .map((entry) => join(root, entry))
    .filter((entry) => !entry.includes("node_modules"));

  const files = [];

  for (const entry of entries) {
    const stat = statSync(entry);

    if (stat.isDirectory()) {
      files.push(...collectTests(entry));
    } else if (
      entry.endsWith(".test.ts") ||
      entry.endsWith(".spec.ts") ||
      entry.endsWith(".test.mjs") ||
      entry.endsWith(".spec.mjs")
    ) {
      files.push(entry);
    }
  }

  return files;
}
