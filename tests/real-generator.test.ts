import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";

import { generateRealWatchfloor } from "../server/src/real/generator.ts";

describe("real watchfloor generator", () => {
  it("excludes fixture-mode motion cache records in strict real mode", () => {
    const liveCacheDir = makeTempLiveCache({
      fixtureMode: true,
      gfwFixtureMode: true,
      messages: [
        aisMessage("538009999", "FIXTURE ONLY", "2026-05-02T10:00:00Z", 25.4, 56.1)
      ]
    });

    const result = generateRealWatchfloor({ liveCacheDir });

    assert.equal(result.summary.strict_real, true);
    assert.equal(result.summary.observation_count, 0);
    assert.equal(result.summary.anomaly_count, 0);
    assert.match(result.summary.empty_reason ?? "", /Fixture-mode provider fallbacks were excluded/);
    assert.ok(
      result.sourceStatus.some(
        (status) =>
          status.source === "AISSTREAM" &&
          status.status === "excluded_fixture_fallback"
      )
    );
  });

  it("derives stable real dark-gap cases from non-fixture AIS messages", () => {
    const liveCacheDir = makeTempLiveCache({
      fixtureMode: false,
      messages: [
        aisMessage("538009999", "REAL HORMUZ", "2026-05-02T10:00:00Z", 25.4, 56.1),
        aisMessage("538009999", "REAL HORMUZ", "2026-05-02T10:45:00Z", 25.7, 56.4)
      ]
    });

    const first = generateRealWatchfloor({ liveCacheDir, darkGapThresholdMin: 20 });
    const second = generateRealWatchfloor({ liveCacheDir, darkGapThresholdMin: 20 });

    assert.equal(first.summary.observation_count, 2);
    assert.equal(first.summary.anomaly_count, 1);
    assert.equal(first.summary.empty_reason, null);
    assert.deepEqual(
      first.anomalies.nodes.map((node) => node.id),
      second.anomalies.nodes.map((node) => node.id)
    );
    assert.ok(
      first.anomalies.nodes.some(
        (node) => node.id === first.anomalies.nodes.find((entry) => entry.type === "anomaly")?.case_id
      ),
      "real graph should include a case node for generated custody cases"
    );
  });

  it("does not convert fixture-mode GFW files into real corroboration", () => {
    const liveCacheDir = makeTempLiveCache({
      fixtureMode: false,
      gfwFixtureMode: true,
      messages: [
        aisMessage("538001111", "REAL GFW TEST", "2026-05-02T11:00:00Z", 25.2, 56.2),
        aisMessage("538001111", "REAL GFW TEST", "2026-05-02T11:45:00Z", 25.3, 56.5)
      ]
    });

    const result = generateRealWatchfloor({ liveCacheDir, darkGapThresholdMin: 20 });

    assert.equal(result.summary.anomaly_count, 1);
    assert.ok(
      result.sourceStatus.some(
        (status) =>
          status.source === "GLOBAL_FISHING_WATCH" &&
          status.status === "excluded_fixture_fallback"
      )
    );
    assert.equal(
      result.evidence.nodes.some(
        (node) =>
          typeof node.id === "string" &&
          node.id.includes(":gfw:")
      ),
      false
    );
  });

  it("derives cached-real OSINT cases from repository cache without live fetches", () => {
    const result = generateRealWatchfloor();
    const cases = result.anomalies.nodes.filter((node) => node.type === "case");
    const alerts = result.anomalies.nodes.filter((node) => node.type === "anomaly");

    assert.equal(result.summary.strict_real, true);
    assert.equal(result.summary.empty_reason, null);
    assert.equal(result.summary.anomaly_count, 97);
    assert.deepEqual(
      cases.map((node) => node.id).sort(),
      [
        "case:real:hormuz:grey-market-china-routing",
        "case:real:hormuz:iran-last-port-laundering",
        "case:real:hormuz:loitering-clusters",
        "case:real:hormuz:roshak-signal-integrity",
        "case:real:hormuz:sdn-live-fleet"
      ]
    );

    const signalCounts = new Map(
      cases.map((node) => [
        node.id,
        (node.data as Record<string, any>)?.features?.signal_count
      ])
    );
    assert.equal(signalCounts.get("case:real:hormuz:sdn-live-fleet"), 21);
    assert.equal(signalCounts.get("case:real:hormuz:loitering-clusters"), 2);
    assert.equal(signalCounts.get("case:real:hormuz:iran-last-port-laundering"), 6);
    assert.equal(signalCounts.get("case:real:hormuz:grey-market-china-routing"), 67);
    assert.equal(signalCounts.get("case:real:hormuz:roshak-signal-integrity"), 1);

    assert.ok(
      alerts.some(
        (node) =>
          node.case_id === "case:real:hormuz:roshak-signal-integrity" &&
          (node.data as Record<string, unknown>)?.speed_kn === 31
      ),
      "expected ROSHAK implausible-speed alert"
    );
    assert.ok(
      alerts.every((node) =>
        String((node.data as Record<string, unknown>)?.source_file ?? "").startsWith(
          "fixtures/maritime/live-cache/"
        )
      ),
      "every cached OSINT alert should carry a live-cache source file"
    );
    assert.ok(
      result.sourceStatus.some(
        (status) =>
          status.source === "DANTI_MARINETRAFFIC" &&
          status.status === "available"
      ),
      "expected cached DANTI status"
    );
  });
});

function makeTempLiveCache(input: {
  fixtureMode: boolean;
  gfwFixtureMode?: boolean;
  messages: unknown[];
}): URL {
  const dir = mkdtempSync(join(tmpdir(), "seaforge-real-cache-"));
  writeJson(join(dir, "manifest.json"), { generated_at: "2026-05-02T12:00:00Z" });
  writeJson(join(dir, "aisstream-hormuz-sample.json"), {
    generated_at: "2026-05-02T12:00:00Z",
    fixture_mode: input.fixtureMode,
    messages: input.messages
  });

  for (const fileName of [
    "gfw-hormuz-gaps.json",
    "gfw-hormuz-loitering.json",
    "gfw-hormuz-port-visits.json"
  ]) {
    writeJson(join(dir, fileName), {
      generated_at: "2026-05-02T12:00:00Z",
      fixture_mode: input.gfwFixtureMode === true,
      fixture_reason: "synthetic fallback for tests",
      body: { entries: [] }
    });
  }

  return pathToFileURL(`${dir}/`);
}

function aisMessage(
  mmsi: string,
  name: string,
  observedAt: string,
  lat: number,
  lon: number
): unknown {
  return {
    MetaData: {
      MMSI_String: mmsi,
      ShipName: name,
      time_utc: observedAt,
      latitude: lat,
      longitude: lon
    },
    Message: {
      PositionReport: {
        Sog: 12.4,
        Cog: 91.2,
        TrueHeading: 91
      }
    }
  };
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
