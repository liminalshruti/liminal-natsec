import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { repoUrl, skipIfMissing } from "../../tests/helpers/optional.ts";
import {
  archiveTimeForScenarioClock,
  buildDantiTrafficArchive,
  selectVisibleDantiTraffic
} from "../src/map/dantiTraffic.ts";
import { timelineBounds } from "../src/map/replay.ts";

const dantiPath = "fixtures/maritime/live-cache/danti-hormuz-ship-paginated.json";
const tracksPath = "fixtures/maritime/tracks.geojson";

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
    assert.match(new Date(archive.endMs).toISOString(), /^2026-04-02T/);

    const first = archive.features[0];
    assert.equal(first.geometry.type, "Point");
    assert.equal(first.properties.kind, "danti_traffic");
    assert.equal(first.properties.source, "DANTI/MARINETRAFFIC");
    assert.equal(typeof first.properties.name, "string");
    assert.equal(typeof first.properties.t_epoch_ms, "number");
    assert.equal(Date.parse(first.properties.observed_at), first.properties.t_epoch_ms);
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
});
