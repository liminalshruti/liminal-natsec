import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { importIfPresent } from "./helpers/optional.ts";

const trackA = [
  { lat: 34.0, lon: 31.0, timestamp: "2026-04-18T10:00:00Z" },
  { lat: 34.0, lon: 31.05, timestamp: "2026-04-18T10:10:00Z" },
  { lat: 34.0, lon: 31.1, timestamp: "2026-04-18T10:20:00Z" }
];

const gapSeconds = 600;
const trackBInside = {
  lat: 34.0002,
  lon: 31.1503,
  timestamp: "2026-04-18T10:30:00Z"
};

describe("M1 Kalman dark-gap predictor", () => {
  it("kalman_likelihood_decreases_with_distance", async (t) => {
    const kalman = await importIfPresent<typeof import("../shared/scoring/kalman.ts")>(
      t,
      "shared/scoring/kalman.ts",
      "M1 Kalman dark-gap predictor"
    );
    if (!kalman) return;

    const { predict } = kalman;
    const near = predict(trackA, gapSeconds, trackBInside);
    const far = predict(trackA, gapSeconds, {
      ...trackBInside,
      lon: trackBInside.lon + 0.12
    });

    assert.ok(near.likelihood > far.likelihood);
    assert.ok(near.mahalanobis < far.mahalanobis);
    assert.ok(near.likelihood > 0);
    assert.ok(far.likelihood >= 0);
  });

  it("kalman_predicts_event1_track_b_inside_ellipse", async (t) => {
    const kalman = await importIfPresent<typeof import("../shared/scoring/kalman.ts")>(
      t,
      "shared/scoring/kalman.ts",
      "M1 Kalman dark-gap predictor"
    );
    if (!kalman) return;

    const { isPointInsidePredictionEllipse, predict } = kalman;
    const prediction = predict(trackA, gapSeconds, trackBInside);

    assert.ok(prediction.ellipsePolygon.coordinates[0].length >= 33);
    assert.equal(isPointInsidePredictionEllipse(prediction, trackBInside), true);
    assert.ok(prediction.mahalanobisSquared <= 5.991);
  });

  it("kalman_browser_safe_matches_server", async (t) => {
    const shared = await importIfPresent<typeof import("../shared/scoring/kalman.ts")>(
      t,
      "shared/scoring/kalman.ts",
      "M1 Kalman dark-gap predictor"
    );
    if (!shared) return;

    const sharedResult = shared.predict(trackA, gapSeconds, trackBInside);
    const serverUrl = new URL("../server/src/scoring/kalman.ts", import.meta.url);

    if (existsSync(serverUrl)) {
      const server = await import(serverUrl.href);
      assert.deepEqual(server.predict(trackA, gapSeconds, trackBInside), sharedResult);
      return;
    }

    const secondSharedResult = shared.predict(trackA, gapSeconds, trackBInside);
    const source = readFileSync(new URL("../shared/scoring/kalman.ts", import.meta.url), "utf8");

    assert.deepEqual(secondSharedResult, sharedResult);
    assert.equal(source.includes("node:"), false);
  });
});
