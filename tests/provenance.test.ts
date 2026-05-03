import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { skipIfMissing } from "./helpers/optional.ts";

describe("M7 confidence-flow provenance", () => {
  it("provenance_math_reproduces_posterior", async (t) => {
    if (
      skipIfMissing(
        t,
        ["shared/scoring/bayes.ts", "shared/scoring/provenance.ts"],
        "M7 confidence-flow provenance"
      )
    ) {
      return;
    }

    const { fuse } = await import("../shared/scoring/bayes.ts");
    const {
      buildConfidenceFlow,
      posteriorFromPriorAndDeltas,
      reproducePosteriorFromTrace
    } = await import("../shared/scoring/provenance.ts");
    const result = fuse([
      {
        id: "same_vessel",
        prior: 0.5,
        contributions: [
          { feature: "kalman_likelihood", llrNats: 1.21 },
          { feature: "name_similarity", llrNats: 0.34 },
          { feature: "mmsi_change", llrNats: -0.62 }
        ]
      },
      {
        id: "different_vessel",
        prior: 0.5,
        contributions: [
          { feature: "kalman_likelihood", llrNats: -0.22 },
          { feature: "name_similarity", llrNats: -0.12 },
          { feature: "mmsi_change", llrNats: 0.41 }
        ]
      }
    ]);
    const deltas = [1.21 - -0.22, 0.34 - -0.12, -0.62 - 0.41];
    const expectedPosterior = result.posteriors.same_vessel;
    const directPosterior = posteriorFromPriorAndDeltas(0.5, deltas);
    const flow = buildConfidenceFlow(0.5, [
      { id: "ev:kalman", label: "Kalman fit", delta: deltas[0] },
      { id: "ev:name", label: "Name similarity", delta: deltas[1] },
      { id: "ev:mmsi", label: "MMSI mismatch", delta: deltas[2] }
    ]);

    assert.ok(Math.abs(directPosterior - expectedPosterior) <= 1e-6);
    assert.ok(Math.abs(reproducePosteriorFromTrace(flow.steps) - expectedPosterior) <= 1e-6);
  });
});
