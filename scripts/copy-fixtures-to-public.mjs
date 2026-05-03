// Copies fixtures/maritime/ into app/public/fixtures/maritime/ before Vite runs.
// Vite serves app/public/ at /, so the map can fetch /fixtures/maritime/*.json.

import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const src = resolve(repoRoot, "fixtures");
const dst = resolve(repoRoot, "app/public/fixtures");

if (!existsSync(src)) {
  console.warn(`[copy-fixtures] source not found: ${src}`);
  process.exit(0);
}

mkdirSync(dirname(dst), { recursive: true });
cpSync(src, dst, { recursive: true });
console.log(`[copy-fixtures] ${src} -> ${dst}`);
