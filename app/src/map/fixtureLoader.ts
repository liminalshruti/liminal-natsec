import type { Feature, FeatureCollection, Polygon, Point } from "geojson";

// Schema for the fixture-side properties we depend on. Hand-written instead
// of zod to keep the bundle small and avoid an extra dep that the app shell
// agent might not have installed.

export type FeatureKind =
  | "monitored_zone"
  | "background_track"
  | "hero_track"
  | "hero_ping"
  | "dark_gap"
  | "predicted_corridor"
  | "predicted_ellipse_95";

export interface CommonProps {
  kind: FeatureKind;
  phase_min: number;
}

export interface HeroPingProps extends CommonProps {
  kind: "hero_ping";
  event_id: "event_1" | "event_2";
  role: "A" | "B";
  mmsi: string;
  t_iso: string;
  t_epoch_ms: number;
}

export interface HeroTrackProps extends CommonProps {
  kind: "hero_track";
  event_id: "event_1" | "event_2";
  role: "A" | "B";
  mmsi: string;
  vessel_name: string;
  case_id?: string;
  t_start_ms: number;
  t_end_ms: number;
}

export interface DarkGapProps extends CommonProps {
  kind: "dark_gap";
  event_id: "event_1" | "event_2";
  case_id?: string;
  gap_minutes: number;
  gap_start_ms: number;
  gap_end_ms: number;
}

export interface PredictedEllipseProps extends CommonProps {
  kind: "predicted_ellipse_95";
  event_id: "event_1" | "event_2";
  source: "fixture" | "kalman";
  mahalanobis: number;
  likelihood: number;
  predicted_lat: number;
  predicted_lon: number;
}

export interface CanonicalTimestamps {
  event1: {
    track_a_first_iso: string;
    track_a_last_iso: string;
    gap_start_iso: string;
    gap_end_iso: string;
    track_b_first_iso: string;
    track_b_last_iso: string;
  };
  event2: {
    track_a2_last_iso: string;
    danti_corroboration_iso: string;
    track_b2_reappear_iso: string;
  };
}

export interface TracksFixture extends FeatureCollection {
  metadata?: {
    schema_version: string;
    aoi: { aoi_id: string; name: string; bbox: [number, number, number, number] };
    canonical_timestamps: CanonicalTimestamps;
    canonical_pings: {
      event_1: {
        track_a_last:  { mmsi: string; iso: string; lat: number; lon: number };
        track_b_first: { mmsi: string; iso: string; lat: number; lon: number };
      };
      event_2: {
        track_a2_last:  { mmsi: string; iso: string; lat: number; lon: number };
        danti:          { iso: string; lat: number; lon: number };
        track_b2_first: { mmsi: string; iso: string; lat: number; lon: number };
      };
    };
    kalman_event_1?: {
      gap_seconds: number;
      mahalanobis: number;
      likelihood: number;
      predicted_state: { lat: number; lon: number };
      track_b_inside_ellipse: boolean;
    };
  };
}

export const TRACKS_FIXTURE_PATH = "/fixtures/maritime/tracks.geojson";

export async function loadTracks(
  url: string = TRACKS_FIXTURE_PATH
): Promise<TracksFixture> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new TracksFixtureError(`fetch ${url} → HTTP ${response.status}`);
  }
  const body = (await response.json()) as TracksFixture;
  validate(body);
  return body;
}

export class TracksFixtureError extends Error {}

function validate(fc: TracksFixture): void {
  if (fc?.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    throw new TracksFixtureError("not a FeatureCollection");
  }

  const requiredKinds = new Set<FeatureKind>([
    "monitored_zone",
    "background_track",
    "hero_track",
    "hero_ping",
    "dark_gap",
    "predicted_corridor",
    "predicted_ellipse_95"
  ]);
  const seen = new Set<string>();

  for (const f of fc.features) {
    const props = f.properties as CommonProps | null;
    if (!props || typeof props.kind !== "string") {
      throw new TracksFixtureError(`feature ${f.id} missing properties.kind`);
    }
    if (typeof props.phase_min !== "number") {
      throw new TracksFixtureError(`feature ${f.id} missing properties.phase_min`);
    }
    seen.add(props.kind);
  }

  for (const k of requiredKinds) {
    if (!seen.has(k)) {
      throw new TracksFixtureError(`fixture missing required kind: ${k}`);
    }
  }

  // Demo invariant: Track B's first ping must lie inside the predicted
  // 95% ellipse. The whole "second identity emerges where Kalman expected"
  // story collapses if this slips. Throw loudly so a bad fixture edit never
  // ships silently.
  const ellipse = fc.features.find(
    (f) =>
      (f.properties as PredictedEllipseProps | null)?.kind === "predicted_ellipse_95" &&
      (f.properties as PredictedEllipseProps).event_id === "event_1"
  ) as Feature<Polygon, PredictedEllipseProps> | undefined;
  const trackBFirst = fc.features.find(
    (f) =>
      (f.properties as HeroPingProps | null)?.kind === "hero_ping" &&
      (f.properties as HeroPingProps).event_id === "event_1" &&
      (f.properties as HeroPingProps).role === "B"
  ) as Feature<Point, HeroPingProps> | undefined;

  if (ellipse && trackBFirst) {
    const [lon, lat] = trackBFirst.geometry.coordinates;
    if (!pointInPolygon([lon, lat], ellipse.geometry.coordinates[0])) {
      throw new TracksFixtureError(
        "INVARIANT FAILED: Track B first ping is OUTSIDE the predicted 95% " +
        "ellipse — central demo claim would break. Re-run scripts/build-tracks-geojson.mjs."
      );
    }
  }
}

// Ray-casting point-in-polygon. Polygon ring is [lon, lat][].
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
