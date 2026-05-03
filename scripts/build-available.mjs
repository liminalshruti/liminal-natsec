import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

checkTsconfigAliases();

for (const workspace of ["server", "app"]) {
  runBuildIfPresent(workspace);
}

console.log("Build contract checks completed.");

function checkTsconfigAliases() {
  const config = JSON.parse(readFileSync("tsconfig.json", "utf8"));
  const paths = config.compilerOptions?.paths ?? {};

  assert.deepEqual(paths["@app/*"], ["app/src/*"]);
  assert.deepEqual(paths["@server/*"], ["server/src/*"]);
  assert.deepEqual(paths["@shared/*"], ["shared/*"]);
  assert.deepEqual(paths["@graph-spine/*"], ["graph-spine/*"]);
  assert.deepEqual(paths["@fixtures/*"], ["fixtures/*"]);
}

function runBuildIfPresent(workspace) {
  const packagePath = `${workspace}/package.json`;

  if (!existsSync(packagePath)) {
    console.log(`${workspace} package not present; skipping workspace build.`);
    return;
  }

  const manifest = JSON.parse(readFileSync(packagePath, "utf8"));

  if (!manifest.scripts?.build) {
    console.log(`${workspace} build script not present; skipping workspace build.`);
    return;
  }

  const result = spawnSync(resolveBun(), ["run", "--cwd", workspace, "build"], {
    stdio: "inherit"
  });

  if (result.error) {
    console.error(`Failed to run Bun: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
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
