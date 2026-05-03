import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { importIfPresent, skipIfMissing } from "./helpers/optional.ts";

describe("M4 rule DSL", () => {
  it("dsl_parses_r001", async (t) => {
    if (
      skipIfMissing(
        t,
        ["shared/rules/builtin.ts", "shared/rules/dsl.ts"],
        "M4 rule DSL"
      )
    ) {
      return;
    }

    const { R001_DSL } = await import("../shared/rules/builtin.ts");
    const { parseRule } = await import("../shared/rules/dsl.ts");
    const parsed = parseRule(R001_DSL);

    assert.equal(parsed.conditions.length, 4);
    assert.deepEqual(parsed.conditions[0], {
      field: "gap_minutes",
      comparator: ">=",
      value: 20
    });
    assert.deepEqual(parsed.effects, [
      {
        kind: "boost",
        actionId: "REQUEST_SAR_OR_RF_CORROBORATION",
        priorityDelta: 1
      }
    ]);
  });

  it("dsl_rejects_invalid_grammar", async (t) => {
    const dsl = await importIfPresent<typeof import("../shared/rules/dsl.ts")>(
      t,
      "shared/rules/dsl.ts",
      "M4 rule DSL"
    );
    if (!dsl) return;

    const { safeParseRule } = dsl;
    const result = safeParseRule("WHEN gap_minutes >= THEN boost(\"REQUEST_SAR_OR_RF_CORROBORATION\", +1)");

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(typeof result.error.line, "number");
      assert.equal(typeof result.error.column, "number");
      assert.equal(typeof result.error.index, "number");
      assert.match(result.error.message, /Expected value/);
    }
  });

  it("dsl_evaluator_changes_action_ranking", async (t) => {
    if (
      skipIfMissing(
        t,
        ["shared/rules/builtin.ts", "shared/rules/dsl.ts"],
        "M4 rule DSL"
      )
    ) {
      return;
    }

    const { R001_RULE } = await import("../shared/rules/builtin.ts");
    const { applyRule } = await import("../shared/rules/dsl.ts");
    const result = applyRule(
      R001_RULE,
      {
        gap_minutes: 32,
        candidate_continuity_score: 0.71,
        danti_geo_time_corroboration: true,
        aoi_id: "aoi:alara-eez-box-01"
      },
      [
        { id: "monitor_only", score: 2 },
        { id: "REQUEST_SAR_OR_RF_CORROBORATION", score: 1.25 },
        { id: "escalate_watch_officer", score: 0.5 }
      ]
    );

    assert.equal(result.matched, true);
    assert.equal(result.rankedActions[0].id, "REQUEST_SAR_OR_RF_CORROBORATION");
    assert.equal(result.rankedActions[0].score, 2.25);
  });
});
