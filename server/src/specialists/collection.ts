import { findCached } from "./cache.ts";
import { callLiveSpecialist } from "./live.ts";
import type {
  Specialist,
  SpecialistCallResult,
  SpecialistInput,
  SpecialistRawOutput
} from "./types.ts";

function fixtureCollectionOutput(input: SpecialistInput): SpecialistRawOutput {
  const cited = input.evidence
    .filter((e) => e.observed_at && e.geometry)
    .map((e) => e.id);
  if (cited.length < 2) {
    return {
      verdict: "refused",
      summary: "Insufficient geo-temporal evidence to recommend a collection action.",
      cited_observation_ids: cited,
      confidence: 0.2,
      unsupported_assertions: []
    };
  }
  return {
    verdict: "supported",
    summary:
      "Recommend SAR or RF corroboration over the predicted corridor; the recommendation discriminates same-vessel continuity from a receiver outage.",
    cited_observation_ids: cited.slice(0, 2),
    confidence: 0.62,
    unsupported_assertions: []
  };
}

export const collectionSpecialist: Specialist = {
  name: "collection",
  async call(input: SpecialistInput): Promise<SpecialistCallResult> {
    const live = await callLiveSpecialist("collection", input);
    if (live) return live;
    const cached = findCached("collection", input.anomaly_id);
    if (cached) return { raw: cached, source: "cache" };
    return { raw: fixtureCollectionOutput(input), source: "fixture" };
  }
};
