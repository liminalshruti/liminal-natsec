import { aipAvailable, callAip } from "./aip.ts";
import { findCached } from "./cache.ts";
import type {
  Specialist,
  SpecialistCallResult,
  SpecialistInput,
  SpecialistRawOutput
} from "./types.ts";

function fixtureIdentityOutput(input: SpecialistInput): SpecialistRawOutput {
  const staticEvidence = input.evidence.filter(
    (e) => e.type === "AIS_STATIC" || e.type === "AIS_POSITION"
  );
  const cited = staticEvidence.map((e) => e.id);
  if (cited.length < 2) {
    return {
      verdict: "refused",
      summary: "Insufficient identity evidence to assert vessel continuity.",
      cited_observation_ids: cited,
      confidence: 0.2,
      unsupported_assertions: []
    };
  }
  return {
    verdict: "supported",
    summary: "Identity features cross-reference the cited static AIS records.",
    cited_observation_ids: cited,
    confidence: 0.6,
    unsupported_assertions: []
  };
}

export const identitySpecialist: Specialist = {
  name: "identity",
  async call(input: SpecialistInput): Promise<SpecialistCallResult> {
    if (aipAvailable()) {
      try {
        const raw = await callAip("identity", input);
        return { raw, source: "aip" };
      } catch {
        // fall through
      }
    }
    const cached = findCached("identity", input.anomaly_id);
    if (cached) return { raw: cached, source: "cache" };
    return { raw: fixtureIdentityOutput(input), source: "fixture" };
  }
};
