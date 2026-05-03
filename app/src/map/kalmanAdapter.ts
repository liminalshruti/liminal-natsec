import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import { predict, type GeoPing, type KalmanOptions } from "@shared/scoring/kalman.ts";
import type { TracksFixture, PredictedEllipseProps } from "./fixtureLoader.ts";

// If shared/scoring/kalman.ts is reachable at runtime AND the canonical
// pings are present, recompute the predicted state + 95% ellipse so the
// rendered geometry matches the live scoring module byte-for-byte.
//
// Otherwise fall back silently to the fixture polygon, which was already
// computed at fixture-build time by the same kalman code (see
// scripts/build-tracks-geojson.mjs). Either path produces the same answer
// today; this seam exists so a future change to kalman.ts (different
// noise model, better Kalman variant) propagates into the demo without
// requiring a fixture rebuild.

export interface LiveEllipseResult {
  source: "kalman-live" | "fixture";
  feature: Feature<Polygon, PredictedEllipseProps>;
}

export async function tryLiveKalmanEllipse(
  fixture: TracksFixture
): Promise<LiveEllipseResult | null> {
  const fixtureFeature = fixture.features.find(
    (f) =>
      (f.properties as PredictedEllipseProps | null)?.kind === "predicted_ellipse_95" &&
      (f.properties as PredictedEllipseProps).event_id === "event_1"
  ) as Feature<Polygon, PredictedEllipseProps> | undefined;

  if (!fixtureFeature) return null;

  const pings = fixture.metadata?.canonical_pings?.event_1;
  const ts = fixture.metadata?.canonical_timestamps?.event1;
  if (!pings || !ts) {
    return { source: "fixture", feature: fixtureFeature };
  }

  try {
    const trackA = eventPings(fixture, "A");
    const trackBFirst = eventPings(fixture, "B")[0];
    if (trackA.length < 2 || !trackBFirst) {
      return { source: "fixture", feature: fixtureFeature };
    }

    const prediction = predict(
      trackA,
      Math.max(0, (Date.parse(ts.track_b_first_iso) - Date.parse(ts.track_a_last_iso)) / 1000),
      trackBFirst,
      kalmanOptions(fixture)
    );
    const liveFeature: Feature<Polygon, PredictedEllipseProps> = {
      ...fixtureFeature,
      geometry: prediction.ellipsePolygon,
      properties: {
        ...fixtureFeature.properties,
        source: "kalman",
        mahalanobis: prediction.mahalanobis,
        likelihood: prediction.likelihood,
        predicted_lat: prediction.predictedState.lat,
        predicted_lon: prediction.predictedState.lon
      }
    };
    const index = fixture.features.indexOf(fixtureFeature);
    if (index >= 0) {
      fixture.features[index] = liveFeature;
    }

    return { source: "kalman-live", feature: liveFeature };
  } catch {
    return { source: "fixture", feature: fixtureFeature };
  }
}

function eventPings(fixture: TracksFixture, role: "A" | "B"): GeoPing[] {
  return fixture.features
    .filter(
      (feature): feature is Feature<Point, { kind: string; event_id: string; role: string; t_iso: string }> =>
        (feature.properties as { kind?: string; event_id?: string; role?: string } | null)?.kind ===
          "hero_ping" &&
        (feature.properties as { event_id?: string; role?: string }).event_id === "event_1" &&
        (feature.properties as { event_id?: string; role?: string }).role === role &&
        isPointFeature(feature)
    )
    .map((feature) => {
      const properties = feature.properties as { t_iso: string };
      const [lon, lat] = feature.geometry.coordinates;
      return {
        lat,
        lon,
        timestamp: properties.t_iso
      };
    })
    .sort((left, right) => Date.parse(String(left.timestamp)) - Date.parse(String(right.timestamp)));
}

function isPointFeature(feature: Feature): feature is Feature<Point> {
  return feature.geometry.type === "Point";
}

function kalmanOptions(fixture: TracksFixture): KalmanOptions {
  const kalmanEvent = fixture.metadata?.kalman_event_1 as
    | {
        tuning?: {
          measurementStdMeters?: number;
          processAccelerationStdMps2?: number;
        };
      }
    | undefined;
  const tuning = kalmanEvent?.tuning;

  return {
    measurementStdMeters: tuning?.measurementStdMeters,
    processAccelerationStdMps2: tuning?.processAccelerationStdMps2
  };
}
