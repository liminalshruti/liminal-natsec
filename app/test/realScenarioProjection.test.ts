import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { projectServerState } from "../src/lib/fixtures.ts";
import type { ScenarioStateView } from "../src/lib/types.ts";

const fallback: ScenarioStateView = {
  scenarioRunId: "fallback:demo",
  seededAt: "1970-01-01T00:00:00.000Z",
  mode: "demo",
  tracksUrl: "/fixtures/maritime/tracks.geojson",
  caseGenerationStatus: "READY",
  sourceStatuses: [
    {
      source: "HORMUZ_NORMALIZED_EVIDENCE",
      status: "available",
      detail: "cached normalized evidence items available"
    }
  ],
  alerts: [
    {
      id: "anom:identity-churn:huge",
      caseId: "case:alara-01:event-1",
      title: "OFAC-listed HUGE identity churn",
      detectedAt: "2026-05-02T00:00:00Z",
      severity: 0.8,
      rank: 1,
      status: "OPEN"
    }
  ],
  hypotheses: [],
  claims: [],
  actions: []
};

describe("real scenario projection", () => {
  it("uses cached case rows when the real server returns no generated custody cases", () => {
    const projected = projectServerState(
      {
        mode: "real",
        scenarioRunId: "real:hormuz:cache",
        seededAt: "2026-05-02T12:00:00Z",
        anomalies: [],
        claims: [],
        actions: [],
        caseGenerationStatus: "NO_REAL_CASE",
        emptyReason: "No real AIS observations were available.",
        sourceStatuses: [
          {
            source: "AISSTREAM",
            status: "excluded_fixture_fallback",
            detail: "Fixture-mode fallback excluded"
          }
        ]
      },
      fallback
    );

    assert.equal(projected.mode, "real");
    assert.equal(projected.caseGenerationStatus, "READY");
    assert.equal(projected.emptyReason, null);
    assert.equal(projected.tracksUrl, "/fixtures/maritime/tracks.geojson");
    assert.equal(projected.alerts[0]?.caseId, "case:alara-01:event-1");
    assert.match(projected.alerts[0]?.title ?? "", /HUGE/);
    assert.equal(projected.sourceStatuses?.[0]?.source, "HORMUZ_NORMALIZED_EVIDENCE");
  });

  it("preserves generated real case ids on alert rows", () => {
    const projected = projectServerState(
      {
        mode: "real",
        scenarioRunId: "real:hormuz:cache",
        seededAt: "2026-05-02T12:00:00Z",
        anomalies: [
          {
            object_id: "anom:real:hormuz:dark-gap:abc123",
            case_id: "case:real:hormuz:abc123",
            title: "Real Hormuz dark gap",
            detected_at: "2026-05-02T12:00:00Z",
            score: 0.7,
            rank: 1,
            status: "OPEN"
          }
        ],
        claims: [],
        actions: []
      },
      fallback
    );

    assert.equal(projected.alerts[0]?.id, "anom:real:hormuz:dark-gap:abc123");
    assert.equal(projected.alerts[0]?.caseId, "case:real:hormuz:abc123");
  });
});
