import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { repoUrl, skipIfMissing } from "../../tests/helpers/optional.ts";
import {
  archiveTimeForScenarioClock,
  buildDantiTrafficArchive,
  selectVisibleDantiTraffic
} from "../src/map/dantiTraffic.ts";
import {
  CASE_HORMUZ_SYNTHESIS,
  CASE_HUGE_IDENTITY,
  CASE_REAL_GREY_MARKET_ROUTING,
  CASE_REAL_IRAN_LAST_PORT,
  CASE_REAL_LOITERING_CLUSTERS,
  CASE_REAL_ROSHAK_SIGNAL,
  CASE_REAL_SANCTIONED_FLEET,
  matchesCaseScope
} from "../src/map/caseSignalScope.ts";
import { selectVisibleHeroPings, timelineBounds } from "../src/map/replay.ts";

const dantiPath = "fixtures/maritime/live-cache/danti-hormuz-ship-all-paginated.json";
const tracksPath = "fixtures/maritime/tracks.geojson";
const sanctionedOverlayPath = "fixtures/maritime/danti-sanctioned-overlay.geojson";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(repoUrl(path), "utf8")) as T;
}

describe("DANTI archived traffic replay", () => {
  it("normalizes cached MarineTraffic documents into timestamped map points", (t) => {
    if (skipIfMissing(t, [dantiPath], "DANTI ship cache")) return;

    const archive = buildDantiTrafficArchive(readJson(dantiPath));
    assert.ok(archive, "expected DANTI archive to build");
    assert.ok(archive.totalDocuments >= 500, "expected dense Hormuz ship cache");
    assert.ok(archive.totalVessels >= 250, "expected many unique vessels");
    assert.ok(archive.startMs < archive.endMs);
    assert.match(new Date(archive.startMs).toISOString(), /^2026-04-02T/);
    assert.ok(archive.endMs >= archive.startMs);

    const first = archive.features[0];
    assert.equal(first.geometry.type, "Point");
    assert.equal(first.properties.kind, "danti_traffic");
    assert.equal(first.properties.source, "DANTI/MARINETRAFFIC");
    assert.equal(typeof first.properties.name, "string");
    assert.equal(typeof first.properties.t_epoch_ms, "number");
    assert.equal(Date.parse(first.properties.observed_at), first.properties.t_epoch_ms);
    assert.ok(
      archive.features.some((feature) => feature.properties.is_implausible_speed),
      "expected at least one physically implausible speed signal"
    );
    assert.ok(
      archive.features.some((feature) => feature.properties.is_order_destination),
      "expected order/China destination routing signals"
    );
  });

  it("maps scenario scrubber progress onto the archive window", (t) => {
    if (skipIfMissing(t, [dantiPath, tracksPath], "DANTI ship cache + tracks fixture")) {
      return;
    }

    const archive = buildDantiTrafficArchive(readJson(dantiPath));
    assert.ok(archive, "expected DANTI archive to build");
    const tracks = readJson<any>(tracksPath);
    const bounds = timelineBounds(tracks);

    assert.equal(
      archiveTimeForScenarioClock(archive, tracks, bounds.startMs),
      archive.startMs
    );
    assert.equal(
      archiveTimeForScenarioClock(archive, tracks, bounds.endMs),
      archive.endMs
    );

    const atStart = selectVisibleDantiTraffic(archive, tracks, bounds.startMs);
    const atEnd = selectVisibleDantiTraffic(archive, tracks, bounds.endMs);

    assert.ok(atStart.visibleVessels > 0);
    assert.ok(atStart.visibleVessels < atEnd.visibleVessels);
    assert.equal(atEnd.visibleVessels, archive.totalVessels);
    assert.equal(atEnd.featureCollection.features.length, archive.totalVessels);
  });

  it("filters archived DANTI traffic to the selected case scope", (t) => {
    if (skipIfMissing(t, [dantiPath, tracksPath], "DANTI ship cache + tracks fixture")) {
      return;
    }

    const archive = buildDantiTrafficArchive(readJson(dantiPath));
    assert.ok(archive, "expected DANTI archive to build");
    const tracks = readJson<any>(tracksPath);
    const bounds = timelineBounds(tracks);
    const all = selectVisibleDantiTraffic(archive, tracks, bounds.endMs);
    const case2 = selectVisibleDantiTraffic(archive, tracks, bounds.endMs, {
      caseId: CASE_HORMUZ_SYNTHESIS,
    });
    const case1 = selectVisibleDantiTraffic(archive, tracks, bounds.endMs, {
      caseId: CASE_HUGE_IDENTITY,
    });

    assert.ok(case2.visibleVessels > 0, "expected Hormuz synthesis to retain mapped traffic");
    assert.ok(case2.visibleVessels < all.visibleVessels, "case scope should narrow all traffic");
    assert.ok(
      case2.featureCollection.features.every((feature) =>
        matchesCaseScope(feature.properties.case_ids, CASE_HORMUZ_SYNTHESIS)
      ),
      "every scoped DANTI feature should carry the case id"
    );
    assert.ok(
      case2.featureCollection.features.some((feature) => feature.properties.name === "ROSHAK"),
      "expected ROSHAK spoofing signal in the Hormuz synthesis scope"
    );
    assert.equal(case1.visibleVessels, 0, "HUGE identity history has no DANTI coordinate in cache");
  });

  it("filters archived DANTI traffic to cached-real OSINT case scopes", (t) => {
    if (skipIfMissing(t, [dantiPath, tracksPath], "DANTI ship cache + tracks fixture")) {
      return;
    }

    const archive = buildDantiTrafficArchive(readJson(dantiPath));
    assert.ok(archive, "expected DANTI archive to build");
    const tracks = readJson<any>(tracksPath);
    const bounds = timelineBounds(tracks);

    const sanctioned = selectVisibleDantiTraffic(archive, tracks, bounds.endMs, {
      caseId: CASE_REAL_SANCTIONED_FLEET,
    });
    const loitering = selectVisibleDantiTraffic(archive, tracks, bounds.endMs, {
      caseId: CASE_REAL_LOITERING_CLUSTERS,
    });
    const iranLastPort = selectVisibleDantiTraffic(archive, tracks, bounds.endMs, {
      caseId: CASE_REAL_IRAN_LAST_PORT,
    });
    const routing = selectVisibleDantiTraffic(archive, tracks, bounds.endMs, {
      caseId: CASE_REAL_GREY_MARKET_ROUTING,
    });
    const roshak = selectVisibleDantiTraffic(archive, tracks, bounds.endMs, {
      caseId: CASE_REAL_ROSHAK_SIGNAL,
    });

    assert.ok(sanctioned.visibleVessels > 0, "expected sanctioned fleet scope");
    assert.ok(
      sanctioned.featureCollection.features.some((feature) => feature.properties.name === "ADRIAN DARYA"),
      "expected ADRIAN DARYA in sanctioned fleet scope"
    );
    assert.ok(loitering.visibleVessels >= 7, "expected Qeshm/Bandar Abbas cluster scope");
    assert.ok(
      iranLastPort.featureCollection.features.some((feature) => feature.properties.name === "YEKTA II"),
      "expected YEKTA II in foreign-flag Iranian last-port scope"
    );
    assert.ok(routing.visibleVessels > 0, "expected grey-market routing scope");
    assert.deepEqual(
      roshak.featureCollection.features.map((feature) => feature.properties.name),
      ["ROSHAK"]
    );
  });

  it("filters archived DANTI traffic to AI-proposed draft vessel scopes", (t) => {
    if (skipIfMissing(t, [dantiPath, tracksPath], "DANTI ship cache + tracks fixture")) {
      return;
    }

    const archive = buildDantiTrafficArchive(readJson(dantiPath));
    assert.ok(archive, "expected DANTI archive to build");
    const tracks = readJson<any>(tracksPath);
    const bounds = timelineBounds(tracks);

    const wafraDraft = selectVisibleDantiTraffic(archive, tracks, bounds.endMs, {
      caseId: "case:draft:hormuz:352005822",
    });

    assert.equal(wafraDraft.visibleVessels, 1);
    assert.deepEqual(
      wafraDraft.featureCollection.features.map((feature) => feature.properties.name),
      ["WAFRA"]
    );
    assert.ok(
      wafraDraft.featureCollection.features.every((feature) =>
        matchesCaseScope(feature.properties.case_ids, "case:draft:hormuz:352005822")
      ),
      "every scoped DANTI feature should carry the draft case id"
    );
  });

  it("filters hero replay pings to the selected case event", () => {
    const tracks = readJson<any>(tracksPath);
    const bounds = timelineBounds(tracks);

    const all = selectVisibleHeroPings(tracks, {
      phase: 6,
      clockMs: bounds.endMs,
    });
    const case1 = selectVisibleHeroPings(tracks, {
      phase: 6,
      clockMs: bounds.endMs,
      caseId: CASE_HUGE_IDENTITY,
    });
    const case2 = selectVisibleHeroPings(tracks, {
      phase: 6,
      clockMs: bounds.endMs,
      caseId: CASE_HORMUZ_SYNTHESIS,
    });

    assert.ok(all.features.length > case1.features.length);
    assert.ok(all.features.length > case2.features.length);
    assert.ok(case1.features.every((feature) => feature.properties.event_id === "event_1"));
    assert.ok(case2.features.every((feature) => feature.properties.event_id === "event_2"));
  });

  it("includes sourced HUGE last-known AIS backfill for the identity case", (t) => {
    if (skipIfMissing(t, [sanctionedOverlayPath], "sanctions overlay")) return;

    const overlay = readJson<any>(sanctionedOverlayPath);
    const huge = overlay.features.find(
      (feature: any) => feature.id === "third-party-ais-huge-9357183-20260319T163100Z"
    );

    assert.ok(huge, "expected sourced HUGE last-known AIS marker");
    assert.deepEqual(huge.geometry.coordinates, [102.02867, 2.148]);
    assert.equal(huge.properties.kind, "third_party_ais_last_known");
    assert.equal(huge.properties.imo, "9357183");
    assert.equal(huge.properties.mmsi, "422206900");
    assert.equal(huge.properties.case_ids, "|case:alara-01:event-1|");
    assert.match(huge.properties.evidence_use, /not evidence of current Hormuz vessel behavior/);
  });
});
