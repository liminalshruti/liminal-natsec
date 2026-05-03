import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type {
  EvidenceItemRef,
  ClaimRef,
  IdentityFeatures,
  SpecialistName,
  SpecialistRawOutput,
  Verdict,
  VisualInput
} from "./types.ts";

export interface CacheEntryTestInput {
  evidence: EvidenceItemRef[];
  claim?: ClaimRef;
  identity_features?: IdentityFeatures;
  visual?: VisualInput;
  question?: string;
}

export interface CacheEntry {
  name: SpecialistName;
  anomaly_id: string;
  key: string;
  cached_at: string;
  expected_verdict?: Verdict;
  test_input: CacheEntryTestInput;
  output: SpecialistRawOutput;
}

export interface CacheFile {
  schemaVersion: "seaforge.specialist-reads.v1";
  entries: CacheEntry[];
  reads?: unknown[]; // co-resident UI consumer; ignored here
}

const CACHE_PATH = fileURLToPath(
  new URL("../../../fixtures/maritime/specialist-reads.json", import.meta.url)
);

let cached: CacheFile | null = null;

export function loadCacheFile(): CacheFile {
  if (cached) return cached;
  const raw = readFileSync(CACHE_PATH, "utf8");
  const parsed = JSON.parse(raw) as Partial<CacheFile>;
  if (parsed.schemaVersion !== "seaforge.specialist-reads.v1") {
    throw new Error(
      `specialist-reads.json schemaVersion mismatch: got ${String(parsed.schemaVersion)}`
    );
  }
  if (!Array.isArray(parsed.entries)) {
    throw new Error("specialist-reads.json missing 'entries' array");
  }
  cached = {
    schemaVersion: parsed.schemaVersion,
    entries: parsed.entries as CacheEntry[],
    reads: parsed.reads
  };
  return cached;
}

export function reloadCacheFile(): CacheFile {
  cached = null;
  return loadCacheFile();
}

export function cacheKey(name: SpecialistName, anomalyId: string): string {
  return `${name}::${anomalyId}`;
}

export function findCached(
  name: SpecialistName,
  anomalyId: string
): SpecialistRawOutput | null {
  const file = loadCacheFile();
  const key = cacheKey(name, anomalyId);
  const entry = file.entries.find((e) => e.key === key);
  return entry ? entry.output : null;
}

export function writeCache(entry: CacheEntry): void {
  const file = loadCacheFile();
  const next = file.entries.filter((e) => e.key !== entry.key);
  next.push(entry);
  const out: CacheFile = { ...file, entries: next };
  writeFileSync(CACHE_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  cached = out;
}

export function deleteCacheEntry(key: string): boolean {
  const file = loadCacheFile();
  const next = file.entries.filter((e) => e.key !== key);
  if (next.length === file.entries.length) return false;
  const out: CacheFile = { ...file, entries: next };
  writeFileSync(CACHE_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  cached = out;
  return true;
}

export interface CacheValidationReport {
  status: "ok" | "error";
  path: string;
  entryCount?: number;
  error?: string;
}

export function validateCacheFile(): CacheValidationReport {
  try {
    cached = null; // force a fresh disk read so /health is honest
    const file = loadCacheFile();
    return {
      status: "ok",
      path: CACHE_PATH,
      entryCount: file.entries.length
    };
  } catch (error) {
    return {
      status: "error",
      path: CACHE_PATH,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
