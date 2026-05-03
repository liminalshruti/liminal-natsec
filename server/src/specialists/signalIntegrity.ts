// Signal Integrity specialist (B-now, C-roadmap).
//
// Demo-grade today: a single specialist row that asserts whether the source
// chain feeding this anomaly is trustworthy enough for downstream specialists
// (Intent in particular) to act on. The fixture path emits a deterministic
// CONTESTED verdict for the dark-gap + identity-churn case so the connector
// from Signal Integrity → Intent renders with causal force during the demo.
//
// v3.3 evolution (see docs/TECHNICAL_PLAN.md §0.2 "B-now, C-roadmap"): this
// row becomes a *convergence aggregator* over Identity-discontinuity,
// Visual-class-mismatch, and Kinematic continuity-in-spoofing-envelope. The
// summary text below already names that convergence so the row carries both
// the demo-density artifact and the procurement-density story in one field.

import { aipAvailable, callAip } from "./aip.ts";
import { findCached } from "./cache.ts";
import type {
  Specialist,
  SpecialistCallResult,
  SpecialistInput,
  SpecialistRawOutput
} from "./types.ts";

function fixtureSignalIntegrityOutput(input: SpecialistInput): SpecialistRawOutput {
  // Cite the AIS observations the system holds for this anomaly. Every
  // integrity claim must be traceable to the raw observations the convergence
  // is reading from. Two-citation minimum keeps the structural guard's
  // citation_min layer satisfied for supported verdicts; below two, the guard
  // forces refused regardless of what we return here.
  const aisEvidence = input.evidence.filter(
    (e) => e.type === "AIS_POSITION" || e.type === "AIS_STATIC"
  );
  const cited = aisEvidence.map((e) => e.id);

  if (cited.length < 2) {
    return {
      verdict: "refused",
      summary: "Insufficient AIS observations to evaluate source-chain integrity.",
      cited_observation_ids: cited,
      confidence: 0.2,
      unsupported_assertions: []
    };
  }

  // Demo case: dark-gap + identity churn produces a CONTESTED verdict. The
  // summary names the convergence — three independent signals collide on
  // source-chain compromise — so the row reads as a *verdict over multiple
  // specialists* rather than a single primary observation.
  return {
    verdict: "contradicted",
    summary:
      "Source chain contested. Identity flags MMSI metadata mismatch. " +
      "Visual flags AIS-class mismatch. Kinematic continuity within " +
      "plausible spoofing envelope. Three independent specialists " +
      "converge on source-chain compromise.",
    cited_observation_ids: cited,
    confidence: 0.78,
    unsupported_assertions: []
  };
}

export const signalIntegritySpecialist: Specialist = {
  name: "signal_integrity",
  async call(input: SpecialistInput): Promise<SpecialistCallResult> {
    if (aipAvailable()) {
      try {
        const raw = await callAip("signal_integrity", input);
        return { raw, source: "aip" };
      } catch {
        // fall through to cache → fixture
      }
    }
    const cached = findCached("signal_integrity", input.anomaly_id);
    if (cached) return { raw: cached, source: "cache" };
    return { raw: fixtureSignalIntegrityOutput(input), source: "fixture" };
  }
};
