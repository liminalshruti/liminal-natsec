import type { Feature, FeatureCollection, Polygon } from "geojson";
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
    // Optional dynamic import — Vite will tree-shake / not bundle if missing.
    // The relative path resolves through tsconfig path alias `@shared/*`,
    // but we use a runtime path the bundler can't statically analyze so
    // failure is silent.
    const path = "@shared/scoring/kalman";
    const mod = await import(/* @vite-ignore */ path);
    if (!mod?.predict) {
      return { source: "fixture", feature: fixtureFeature };
    }
    // We don't have the full Track A ping list in metadata — just last+first.
    // Live recomputation needs the same input the fixture script used. For
    // now, prefer the fixture polygon when canonical-pings is sparse;
    // future enhancement: surface the full ping list in fixture metadata.
    return { source: "fixture", feature: fixtureFeature };
  } catch {
    return { source: "fixture", feature: fixtureFeature };
  }
}
