import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import type { HormuzEvidenceItem } from "../shared/hormuz/types.ts";
import { repoUrl } from "./helpers/optional.ts";

const evidence = JSON.parse(
  readFileSync(repoUrl("fixtures/maritime/hormuz-evidence-items.json"), "utf8")
) as HormuzEvidenceItem[];

describe("Hormuz scoring mapper", () => {
  it("satellite evidence affects cross-modal/context score only", async () => {
    const { buildHormuzScoringSummary } = await import("../shared/hormuz/scoring.ts");
    const summary = buildHormuzScoringSummary(evidence);
    const satellite = summary.contributions.filter(
      (item) =>
        item.category === "GEO_SPATIOTEMPORAL_CORROBORATION" ||
        item.category === "CROSS_MODAL_CONTEXT"
    );

    assert.ok(satellite.length > 0);
    assert.ok(satellite.every((item) => item.bucket === "cross_modal_context"));
    assert.ok(summary.totals.cross_modal_context > 0);
  });

  it("OpenSanctions affects identity/entity risk only", async () => {
    const { mapHormuzEvidenceToScoringContributions } = await import(
      "../shared/hormuz/scoring.ts"
    );
    const contributions = mapHormuzEvidenceToScoringContributions(evidence).filter(
      (item) => item.source === "OPENSANCTIONS"
    );

    assert.ok(contributions.length > 0);
    assert.ok(contributions.every((item) => item.bucket === "entity_risk"));
    assert.ok(
      contributions.every((item) =>
        item.excluded_claim_classes.includes("intent")
      )
    );
  });

  it("Exa, GDELT, PortWatch, NAVAREA, and UKMTO affect regional context only", async () => {
    const { mapHormuzEvidenceToScoringContributions } = await import(
      "../shared/hormuz/scoring.ts"
    );
    const regional = mapHormuzEvidenceToScoringContributions(evidence).filter(
      (item) => ["EXA", "GDELT", "PORTWATCH", "NAVAREA_IX", "UKMTO"].includes(item.source)
    );

    assert.ok(regional.length > 0);
    assert.ok(regional.every((item) => item.bucket === "regional_context"));
    assert.ok(regional.every((item) => item.delta >= 0));
  });

  it("GFW fallback rows affect identity/source corroboration only", async () => {
    const { mapHormuzEvidenceToScoringContributions } = await import(
      "../shared/hormuz/scoring.ts"
    );
    const gfw = mapHormuzEvidenceToScoringContributions(evidence).filter(
      (item) => item.source === "GLOBAL_FISHING_WATCH"
    );

    assert.ok(gfw.length > 0);
    assert.ok(
      gfw.every(
        (item) => item.bucket === "identity_source_corroboration" && item.delta > 0
      )
    );
    assert.ok(gfw.every((item) => item.available));
    assert.ok(
      gfw.every(
        (item) =>
          item.excluded_claim_classes.includes("kinematics") &&
          item.excluded_claim_classes.includes("vessel_behavior") &&
          item.excluded_claim_classes.includes("intent")
      )
    );
  });

  it("internet-exposure sources never support vessel behavior, kinematics, or intent", async () => {
    const { mapHormuzEvidenceToScoringContributions } = await import(
      "../shared/hormuz/scoring.ts"
    );
    const infrastructureOnly = mapHormuzEvidenceToScoringContributions(evidence).filter(
      (item) => item.source === "SHODAN"
    );

    assert.ok(infrastructureOnly.length > 0);
    assert.ok(infrastructureOnly.every((item) => item.bucket === "infrastructure_context"));
    for (const contribution of infrastructureOnly) {
      assert.deepEqual(contribution.allowed_claim_classes, ["infrastructure_context"]);
      assert.ok(contribution.excluded_claim_classes.includes("kinematics"));
      assert.ok(contribution.excluded_claim_classes.includes("vessel_behavior"));
      assert.ok(contribution.excluded_claim_classes.includes("intent"));
    }
  });
});

describe("Hormuz replay integration", () => {
  it("exposes curated Hormuz scoring in replay state", async () => {
    const { loadHormuzReplayIntel, buildHormuzReplayState } = await import(
      "../server/src/replay/hormuz.ts"
    );
    const intel = loadHormuzReplayIntel();
    const state = buildHormuzReplayState(intel);

    assert.equal(state.evidenceItemCount, evidence.length);
    assert.ok(state.scoring.contributions.length > 0);
    assert.ok(state.scoring.totals.cross_modal_context > 0);
  });
});
