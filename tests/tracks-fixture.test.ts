import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { repoUrl, hasRepoFile, skipIfMissing } from "./helpers/optional.ts";

// These tests validate the map lane's owned fixture and pure modules.
// They run alongside the rest of the suite via `npm test`.

const fixturePath = "fixtures/maritime/tracks.geojson";

function loadFixture(): any {
  return JSON.parse(readFileSync(repoUrl(fixturePath), "utf8"));
}

describe("tracks.geojson fixture", () => {
  it("is a non-empty FeatureCollection with required kinds", (t) => {
    if (skipIfMissing(t, [fixturePath], "tracks fixture")) return;
    const fc = loadFixture();
    assert.equal(fc.type, "FeatureCollection");
    assert.ok(Array.isArray(fc.features) && fc.features.length > 10);

    const kinds = new Set(fc.features.map((f: any) => f.properties?.kind));
    for (const required of [
      "monitored_zone",
      "background_track",
      "hero_track",
      "hero_ping",
      "dark_gap",
      "predicted_corridor",
      "predicted_ellipse_95"
    ]) {
      assert.ok(kinds.has(required), `missing kind: ${required}`);
    }
  });

  it("every feature carries phase_min for runtime gating", (t) => {
    if (skipIfMissing(t, [fixturePath], "tracks fixture")) return;
    const fc = loadFixture();
    for (const f of fc.features) {
      assert.equal(
        typeof f.properties?.phase_min,
        "number",
        `feature ${f.id} missing properties.phase_min`
      );
    }
  });

  it("event-2 features are all gated phase_min >= 6", (t) => {
    if (skipIfMissing(t, [fixturePath], "tracks fixture")) return;
    const fc = loadFixture();
    const event2 = fc.features.filter(
      (f: any) => f.properties?.event_id === "event_2"
    );
    assert.ok(event2.length > 0, "event_2 features expected");
    for (const f of event2) {
      assert.ok(
        f.properties.phase_min >= 6,
        `event_2 feature ${f.id} leaks before phase 6 (phase_min=${f.properties.phase_min})`
      );
    }
  });

  it("hero pings carry numeric t_epoch_ms for fast time scrubbing", (t) => {
    if (skipIfMissing(t, [fixturePath], "tracks fixture")) return;
    const fc = loadFixture();
    const pings = fc.features.filter(
      (f: any) => f.properties?.kind === "hero_ping"
    );
    assert.ok(pings.length >= 6, "expect at least 6 hero pings");
    for (const p of pings) {
      assert.equal(typeof p.properties.t_epoch_ms, "number");
      assert.equal(typeof p.properties.t_iso, "string");
      assert.equal(Date.parse(p.properties.t_iso), p.properties.t_epoch_ms);
    }
  });

  it("INVARIANT: Track B first ping lies inside the predicted 95% ellipse", (t) => {
    if (skipIfMissing(t, [fixturePath], "tracks fixture")) return;
    const fc = loadFixture();
    const ellipse = fc.features.find(
      (f: any) =>
        f.properties?.kind === "predicted_ellipse_95" &&
        f.properties?.event_id === "event_1"
    );
    const trackB = fc.features.find(
      (f: any) =>
        f.properties?.kind === "hero_ping" &&
        f.properties?.event_id === "event_1" &&
        f.properties?.role === "B"
    );
    assert.ok(ellipse, "predicted_ellipse_95 missing for event_1");
    assert.ok(trackB, "Track B first ping missing");

    const ring: number[][] = ellipse.geometry.coordinates[0];
    const [lon, lat] = trackB.geometry.coordinates;
    assert.ok(
      pointInPolygon([lon, lat], ring),
      "Track B is OUTSIDE the predicted ellipse — central demo claim broken"
    );
  });

  it("canonical timestamps cross-reference observations.json when present", (t) => {
    if (
      skipIfMissing(
        t,
        [fixturePath, "fixtures/maritime/observations.json"],
        "tracks + observations cross-ref"
      )
    ) {
      return;
    }
    const fc = loadFixture();
    const obs = JSON.parse(
      readFileSync(repoUrl("fixtures/maritime/observations.json"), "utf8")
    );

    const ts = fc.metadata?.canonical_timestamps;
    assert.ok(ts, "tracks.geojson missing metadata.canonical_timestamps");

    const lastA = obs.nodes.find(
      (n: any) =>
        n.id === "obs:aishub:366700111:20260418T101504Z"
    );
    assert.equal(
      lastA?.data?.observed_at,
      ts.event1.track_a_last_iso,
      "Track A last-seen timestamp drifted between fixtures"
    );

    const firstB = obs.nodes.find(
      (n: any) =>
        n.id === "obs:barentswatch:538009771:20260418T110422Z"
    );
    assert.equal(
      firstB?.data?.observed_at,
      ts.event1.track_b_first_iso,
      "Track B first-seen timestamp drifted between fixtures"
    );

    const a2Last = obs.nodes.find(
      (n: any) => n.id === "obs:aishub:271990222:20260418T122000Z"
    );
    assert.equal(
      a2Last?.data?.observed_at,
      ts.event2.track_a2_last_iso,
      "Event 2 Track A2 last-seen timestamp drifted between fixtures"
    );
  });
});

describe("map replay module — phase + clock gating", () => {
  it("selectVisibleHeroPings respects phase and clock bounds", async (t) => {
    if (
      skipIfMissing(
        t,
        [fixturePath, "app/src/map/replay.ts"],
        "map replay module"
      )
    ) {
      return;
    }
    const fc = loadFixture();
    const replay = await import(repoUrl("app/src/map/replay.ts").href);
    const ts = fc.metadata.canonical_timestamps;

    // At phase=1 with clock at start, only Track A pings up to that moment
    // are visible. Event 2 must NOT appear.
    const earlyClock = Date.parse(ts.event1.track_a_first_iso);
    const earlyResult = replay.selectVisibleHeroPings(fc, {
      phase: 1,
      clockMs: earlyClock
    });
    for (const f of earlyResult.features) {
      assert.notEqual(f.properties.event_id, "event_2");
      assert.ok(f.properties.t_epoch_ms <= earlyClock);
    }

    // At phase=6 with clock past everything, every hero ping is visible.
    const lateClock = Date.parse(ts.event2.track_b2_reappear_iso) + 60 * 60_000;
    const lateResult = replay.selectVisibleHeroPings(fc, {
      phase: 6,
      clockMs: lateClock
    });
    const allPings = fc.features.filter(
      (f: any) => f.properties.kind === "hero_ping"
    );
    assert.equal(lateResult.features.length, allPings.length);

    // Even at phase=5 (refusal+action), Event 2 pings remain hidden.
    const phase5Result = replay.selectVisibleHeroPings(fc, {
      phase: 5,
      clockMs: lateClock
    });
    for (const f of phase5Result.features) {
      assert.notEqual(
        f.properties.event_id,
        "event_2",
        `event_2 ping ${f.id} leaked into phase 5`
      );
    }
  });

  it("inferPhase advances through the canonical scenario", async (t) => {
    if (
      skipIfMissing(
        t,
        [fixturePath, "app/src/map/replay.ts"],
        "map replay module"
      )
    ) {
      return;
    }
    const fc = loadFixture();
    const replay = await import(repoUrl("app/src/map/replay.ts").href);
    const ts = fc.metadata.canonical_timestamps;

    assert.equal(replay.inferPhase(fc, Date.parse(ts.event1.track_a_first_iso)), 1);
    assert.equal(replay.inferPhase(fc, Date.parse(ts.event1.gap_start_iso)), 2);
    assert.equal(replay.inferPhase(fc, Date.parse(ts.event1.track_b_first_iso)), 3);
    assert.equal(replay.inferPhase(fc, Date.parse(ts.event2.track_b2_reappear_iso)), 6);
  });
});

describe("map layers — phase styling + selection emphasis", () => {
  it("Track A line color shifts cyan → muted at phase >= 2", async (t) => {
    if (
      skipIfMissing(
        t,
        ["app/src/map/layers.ts", "app/src/map/tokens.ts"],
        "map layers"
      )
    ) {
      return;
    }
    const layers = await import(repoUrl("app/src/map/layers.ts").href);
    const tokens = await import(repoUrl("app/src/map/tokens.ts").href);

    const phase1 = layers.buildLayers({ phase: 1 });
    const phase2 = layers.buildLayers({ phase: 2 });
    const trackAPhase1 = phase1.find((l: any) => l.id === "layer:hero-track-A");
    const trackAPhase2 = phase2.find((l: any) => l.id === "layer:hero-track-A");

    assert.equal(trackAPhase1.paint["line-color"], tokens.COLORS.heroTrackANormal);
    assert.equal(trackAPhase2.paint["line-color"], tokens.COLORS.heroTrackAWarned);
    assert.notEqual(
      trackAPhase1.paint["line-color"],
      trackAPhase2.paint["line-color"],
      "Track A must visually shift when the anomaly fires"
    );
  });

  it("selecting a case adds a halo layer + dims background traffic", async (t) => {
    if (skipIfMissing(t, ["app/src/map/layers.ts"], "map layers")) return;
    const layers = await import(repoUrl("app/src/map/layers.ts").href);

    const noSelection = layers.buildLayers({ phase: 3 });
    const withSelection = layers.buildLayers({
      phase: 3,
      selectedCaseId: "case:alara-01:event-1"
    });

    const haloNoSelection = noSelection.find(
      (l: any) => l.id === "layer:hero-selection-halo"
    );
    const haloWithSelection = withSelection.find(
      (l: any) => l.id === "layer:hero-selection-halo"
    );
    assert.ok(haloNoSelection, "halo layer must exist (with no-match filter when nothing is selected)");
    assert.ok(haloWithSelection, "halo layer must exist when a case is selected");

    const haloFilter = JSON.stringify(haloWithSelection.filter);
    assert.ok(
      haloFilter.includes("case:alara-01:event-1"),
      "halo filter must reference the selected case_id"
    );

    const bgNo = noSelection.find((l: any) => l.id === "layer:background-tracks");
    const bgYes = withSelection.find((l: any) => l.id === "layer:background-tracks");
    assert.ok(
      bgYes.paint["line-opacity"] < bgNo.paint["line-opacity"],
      "background traffic must dim when a case is selected"
    );
  });
});

describe("camera framing — fitBounds for case selection", () => {
  it("flyForCaseBoundsOptions returns bounds covering both hero tracks", async (t) => {
    if (
      skipIfMissing(
        t,
        ["fixtures/maritime/tracks.geojson", "app/src/map/flyTo.ts"],
        "case bounds"
      )
    ) {
      return;
    }
    const fc = loadFixture();
    const flyTo = await import(repoUrl("app/src/map/flyTo.ts").href);

    const opts1 = flyTo.flyForCaseBoundsOptions(fc, "case:alara-01:event-1");
    assert.equal(opts1.kind, "bounds");
    const [[swLon, swLat], [neLon, neLat]] = opts1.bounds;

    const aLast = fc.metadata.canonical_pings.event_1.track_a_last;
    const bFirst = fc.metadata.canonical_pings.event_1.track_b_first;

    assert.ok(swLon <= aLast.lon && swLon <= bFirst.lon, "SW lon contains both tracks");
    assert.ok(neLon >= aLast.lon && neLon >= bFirst.lon, "NE lon contains both tracks");
    assert.ok(swLat <= aLast.lat && swLat <= bFirst.lat, "SW lat contains both tracks");
    assert.ok(neLat >= aLast.lat && neLat >= bFirst.lat, "NE lat contains both tracks");

    const opts2 = flyTo.flyForCaseBoundsOptions(fc, "case:alara-01:event-2");
    assert.equal(opts2.kind, "bounds");
    const danti = fc.metadata.canonical_pings.event_2.danti;
    const [[sw2Lon, sw2Lat], [ne2Lon, ne2Lat]] = opts2.bounds;
    assert.ok(sw2Lon <= danti.lon && ne2Lon >= danti.lon, "Event 2 bounds include Danti detection");
    assert.ok(sw2Lat <= danti.lat && ne2Lat >= danti.lat);

    const miss = flyTo.flyForCaseBoundsOptions(fc, "case:nonexistent");
    assert.equal(miss, null);
  });

  it("flyForAlertOptions routes Event-1 anomalies to Event-1 case bounds", async (t) => {
    if (
      skipIfMissing(
        t,
        ["fixtures/maritime/tracks.geojson", "app/src/map/flyTo.ts"],
        "alert framing"
      )
    ) {
      return;
    }
    const fc = loadFixture();
    const flyTo = await import(repoUrl("app/src/map/flyTo.ts").href);

    const opts = flyTo.flyForAlertOptions(
      fc,
      "anom:identity-churn:trk-caldera:20260418T1015:1f44"
    );
    assert.ok(opts);
    assert.equal(opts.kind, "bounds");

    const opts2 = flyTo.flyForAlertOptions(
      fc,
      "anom:dark-gap:trk-271990222:20260418T1220:cc90"
    );
    assert.ok(opts2);
    assert.equal(opts2.kind, "bounds");

    const noId = flyTo.flyForAlertOptions(fc, null);
    assert.equal(noId, null);
  });
});

// Ray-casting point-in-polygon, duplicated here so tests stay self-contained.
function pointInPolygon(point: [number, number], ring: number[][]): boolean {
  let inside = false;
  const [x, y] = point;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
