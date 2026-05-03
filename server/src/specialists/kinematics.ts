import { findCached } from "./cache.ts";
import { callLiveSpecialist } from "./live.ts";
import type {
  Specialist,
  SpecialistCallResult,
  SpecialistInput,
  SpecialistRawOutput
} from "./types.ts";

function fixtureKinematicsOutput(input: SpecialistInput): SpecialistRawOutput {
  const cited = input.evidence
    .filter((e) => e.modality === "kinematic" || e.type === "AIS_POSITION")
    .map((e) => e.id);
  return {
    verdict: cited.length >= 2 ? "supported" : "refused",
    summary:
      cited.length >= 2
        ? "Cited kinematic observations corroborate the predicted track corridor."
        : "Insufficient kinematic observations to assert track continuity.",
    cited_observation_ids: cited,
    confidence: cited.length >= 2 ? 0.66 : 0.2,
    unsupported_assertions: []
  };
}

export const kinematicsSpecialist: Specialist = {
  name: "kinematics",
  async call(input: SpecialistInput): Promise<SpecialistCallResult> {
    const live = await callLiveSpecialist("kinematics", input);
    if (live) return live;
    const cached = findCached("kinematics", input.anomaly_id);
    if (cached) return { raw: cached, source: "cache" };
    return { raw: fixtureKinematicsOutput(input), source: "fixture" };
  }
};
