import { aipAvailable, callAip } from "./aip.ts";
import { findCached } from "./cache.ts";
import type {
  Specialist,
  SpecialistCallResult,
  SpecialistInput,
  SpecialistRawOutput
} from "./types.ts";

function fixtureIntentOutput(input: SpecialistInput): SpecialistRawOutput {
  const indicators = input.evidence.filter((e) => e.type === "INTENT_INDICATOR");
  const cited = input.evidence
    .filter(
      (e) =>
        e.type === "AIS_POSITION" ||
        e.type === "OSINT_DOCUMENT" ||
        e.type === "INTENT_INDICATOR"
    )
    .map((e) => e.id);

  if (indicators.length === 0 || cited.length < 2) {
    return {
      verdict: "refused",
      summary:
        "Intent cannot be asserted: requires an INTENT_INDICATOR and at least two cited observations.",
      cited_observation_ids: cited,
      confidence: 0.2,
      unsupported_assertions: []
    };
  }

  return {
    verdict: "supported",
    summary:
      "Intent indicator corroborated by additional geo-time cited observations.",
    cited_observation_ids: cited.slice(0, 2),
    confidence: 0.65,
    unsupported_assertions: []
  };
}

export const intentSpecialist: Specialist = {
  name: "intent",
  async call(input: SpecialistInput): Promise<SpecialistCallResult> {
    if (aipAvailable()) {
      try {
        const raw = await callAip("intent", input);
        return { raw, source: "aip" };
      } catch {
        // fall through
      }
    }
    const cached = findCached("intent", input.anomaly_id);
    if (cached) return { raw: cached, source: "cache" };
    return { raw: fixtureIntentOutput(input), source: "fixture" };
  }
};
