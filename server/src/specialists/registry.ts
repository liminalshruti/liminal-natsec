import { cacheKey, writeCache, type CacheEntry } from "./cache.ts";
import { collectionSpecialist } from "./collection.ts";
import { applyGuard } from "./guard.ts";
import { identitySpecialist } from "./identity.ts";
import { intentSpecialist } from "./intent.ts";
import { kinematicsSpecialist } from "./kinematics.ts";
import {
  type GuardedSpecialistOutput,
  type Specialist,
  type SpecialistInput,
  type SpecialistName,
  SPECIALIST_NAMES
} from "./types.ts";
import { visualSpecialist } from "./visual.ts";

const REGISTRY: Record<SpecialistName, Specialist> = {
  kinematics: kinematicsSpecialist,
  identity: identitySpecialist,
  intent: intentSpecialist,
  collection: collectionSpecialist,
  visual: visualSpecialist
};

export function isSpecialistName(name: string): name is SpecialistName {
  return (SPECIALIST_NAMES as readonly string[]).includes(name);
}

export function getSpecialist(name: SpecialistName): Specialist {
  return REGISTRY[name];
}

export interface RunSpecialistOptions {
  persistAipToCache?: boolean;
}

export async function runSpecialist(
  name: SpecialistName,
  input: SpecialistInput,
  options: RunSpecialistOptions = {}
): Promise<GuardedSpecialistOutput> {
  const spec = REGISTRY[name];
  const { raw, source } = await spec.call(input);
  const guarded = applyGuard(input, raw);
  guarded.source = source;

  if (source === "aip" && options.persistAipToCache !== false) {
    persistAipToCache(name, input, raw);
  }

  return guarded;
}

function persistAipToCache(
  name: SpecialistName,
  input: SpecialistInput,
  raw: GuardedSpecialistOutput | { verdict: string; summary: string; cited_observation_ids: string[]; confidence: number; unsupported_assertions: string[] }
): void {
  try {
    const entry: CacheEntry = {
      name,
      anomaly_id: input.anomaly_id,
      key: cacheKey(name, input.anomaly_id),
      cached_at: new Date().toISOString(),
      test_input: {
        evidence: input.evidence,
        claim: input.claim,
        identity_features: input.identity_features,
        visual: input.visual,
        question: input.question
      },
      output: {
        verdict: raw.verdict as CacheEntry["output"]["verdict"],
        summary: raw.summary,
        cited_observation_ids: raw.cited_observation_ids,
        confidence: raw.confidence,
        unsupported_assertions: raw.unsupported_assertions
      }
    };
    writeCache(entry);
  } catch {
    // Cache writes are best-effort; never fail a request because the cache file is read-only.
  }
}
