import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { publicSourcePath, publicText } from "../src/lib/presentationText.ts";
import {
  evidenceForClaim,
  nodeById,
  primaryClaimForCase
} from "../src/lib/spineGraph.ts";

const REAL_CASE_IDS = [
  "case:real:hormuz:sdn-live-fleet",
  "case:real:hormuz:loitering-clusters",
  "case:real:hormuz:iran-last-port-laundering",
  "case:real:hormuz:grey-market-china-routing",
  "case:real:hormuz:roshak-signal-integrity"
];

describe("presentation text", () => {
  it("removes storage/cache language from case-facing copy", () => {
    assert.equal(
      publicText("Cached DANTI/MarineTraffic rows show cached destination strings."),
      "DANTI/MarineTraffic rows show destination strings."
    );
    assert.equal(
      publicSourcePath("fixtures/maritime/live-cache/gfw-hormuz-gaps.json"),
      "maritime/live-sources/gfw-hormuz-gaps.json"
    );
  });

  it("does not expose cached-data language in real case labels or summaries", () => {
    for (const caseId of REAL_CASE_IDS) {
      const caseNode = nodeById(caseId);
      assert.ok(caseNode, `missing ${caseId}`);
      assertNoStorageLanguage(caseNode.title, `${caseId} title`);

      const leadSummary = caseNode.data?.lead_summary;
      if (typeof leadSummary === "string") {
        assertNoStorageLanguage(leadSummary, `${caseId} lead summary`);
      }

      const claim = primaryClaimForCase(caseId);
      assert.ok(claim, `missing claim for ${caseId}`);
      assertNoStorageLanguage(claim.title, `${caseId} claim title`);

      const evidence = evidenceForClaim(claim.id);
      for (const link of [...evidence.supports, ...evidence.weakens, ...evidence.contradicts]) {
        assertNoStorageLanguage(link.node.title, `${caseId} evidence title`);
        const summary = link.node.data?.summary;
        if (typeof summary === "string") {
          assertNoStorageLanguage(summary, `${caseId} evidence summary`);
        }
      }
    }
  });
});

function assertNoStorageLanguage(value: string, context: string) {
  assert.doesNotMatch(value, /\b(cached|cache|fixture|fallback)\b/i, context);
}
