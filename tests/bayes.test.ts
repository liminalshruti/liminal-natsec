import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { importIfPresent } from "./helpers/optional.ts";

const hypotheses = [
  {
    id: "H1",
    prior: 0.5,
    contributions: [
      { feature: "kalman_likelihood", llrNats: 1.21 },
      { feature: "name_similarity", llrNats: 0.34 },
      { feature: "mmsi_change", llrNats: -0.62 }
    ]
  },
  {
    id: "H2",
    prior: 0.3,
    contributions: [
      { feature: "kalman_likelihood", llrNats: -0.22 },
      { feature: "name_similarity", llrNats: -0.12 },
      { feature: "mmsi_change", llrNats: 0.41 }
    ]
  },
  {
    id: "H3",
    prior: 0.2,
    contributions: [
      { feature: "evidence_weight_low", llrNats: 0.18 }
    ]
  }
];

describe("M2 Bayesian fusion", () => {
  it("bayes_posteriors_sum_to_one", async (t) => {
    const bayes = await importIfPresent<typeof import("../shared/scoring/bayes.ts")>(
      t,
      "shared/scoring/bayes.ts",
      "M2 Bayesian fusion"
    );
    if (!bayes) return;

    const { fuse } = bayes;
    const result = fuse(hypotheses);
    const sum = Object.values(result.posteriors).reduce((total, value) => total + value, 0);

    assert.ok(Math.abs(sum - 1) <= 1e-6);
    assert.ok(result.posteriors.H1 > result.posteriors.H2);
    assert.ok(result.posteriors.H1 > result.posteriors.H3);
  });

  it("bayes_contributions_match_posterior", async (t) => {
    const bayes = await importIfPresent<typeof import("../shared/scoring/bayes.ts")>(
      t,
      "shared/scoring/bayes.ts",
      "M2 Bayesian fusion"
    );
    if (!bayes) return;

    const { fuse, logPosteriorOdds, sumContributionDelta } = bayes;
    const result = fuse(hypotheses);
    const observed = logPosteriorOdds(result, "H1", "H2");
    const expected =
      Math.log(0.5 / 0.3) + sumContributionDelta(result, "H1", "H2");

    assert.ok(Math.abs(observed - expected) <= 1e-12);
  });
});
