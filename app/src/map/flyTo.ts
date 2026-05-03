import type { Feature, Point, Polygon, LineString } from "geojson";
import type maplibregl from "maplibre-gl";
import type { TracksFixture } from "./fixtureLoader.ts";
import { HUGE_LAST_KNOWN_AIS } from "./caseSignalScope.ts";
import type { Phase } from "./replay.ts";
import { INITIAL_VIEW } from "./style.ts";

// Camera utilities. Two option shapes — flyTo (center+zoom) and fitBounds
// (sw/ne corners). MapWatchfloor calls executeCamera which routes to the
// correct MapLibre method.

export interface FlyOptions {
  kind: "fly";
  center: [number, number];
  zoom: number;
  speed?: number;
  curve?: number;
  duration?: number;
}

export interface FitBoundsOptions {
  kind: "bounds";
  bounds: [[number, number], [number, number]]; // [SW, NE] as [lon, lat]
  padding?: number | { top: number; bottom: number; left: number; right: number };
  duration?: number;
  maxZoom?: number;
}

export type CameraOptions = FlyOptions | FitBoundsOptions;

const SOFT = { speed: 0.8, curve: 1.4 };
const CAMERA_CENTER_EPSILON = 0.00001;
const CAMERA_ZOOM_EPSILON = 0.01;

// Per-phase target. Phase 1 stays wide; phases 2–5 zoom into the dark gap;
// phase 6 frames the later review beat. Coordinates pulled from the fixture
// metadata so a future fixture update doesn't drift the camera.
export function flyForPhaseOptions(
  fixture: TracksFixture,
  phase: Phase
): CameraOptions {
  const pings = fixture.metadata?.canonical_pings;
  if (!pings) {
    return { kind: "fly", center: INITIAL_VIEW.center, zoom: INITIAL_VIEW.zoom, ...SOFT };
  }

  switch (phase) {
    case 1:
      return { kind: "fly", center: INITIAL_VIEW.center, zoom: INITIAL_VIEW.zoom, ...SOFT };
    case 2:
      // Dark gap moment — frame the last A ping with room for the zone.
      return {
        kind: "fly",
        center: [pings.event_1.track_a_last.lon, pings.event_1.track_a_last.lat],
        zoom: 9.0,
        ...SOFT
      };
    case 3:
    case 4:
    case 5:
      // Frame the connector + ellipse + Track B emergence.
      return {
        kind: "fly",
        center: [
          (pings.event_1.track_a_last.lon + pings.event_1.track_b_first.lon) / 2,
          (pings.event_1.track_a_last.lat + pings.event_1.track_b_first.lat) / 2
        ],
        zoom: 8.6,
        ...SOFT
      };
    case 6:
      return {
        kind: "fly",
        center: [pings.event_2.track_b2_first.lon, pings.event_2.track_b2_first.lat],
        zoom: 9.2,
        ...SOFT
      };
  }
}

// Frame the entire selected case as fitBounds — guaranteed to include both
// hero tracks plus the dark gap connector. Lets judges see the *shape* of
// the case at a glance rather than relying on a fixed phase zoom.
export function flyForCaseBoundsOptions(
  fixture: TracksFixture,
  caseId: string
): CameraOptions | null {
  const pings = fixture.metadata?.canonical_pings;
  if (!pings) return null;

  if (caseId === "case:alara-01:event-1") {
    const a1 = pings.event_1.track_a_last;
    const b1 = pings.event_1.track_b_first;
    return boundsFromPoints(
      [
        [a1.lon, a1.lat],
        [b1.lon, b1.lat]
      ],
      HUGE_LAST_KNOWN_AIS.coordinates
    );
  }
  if (caseId === "case:alara-01:event-2") {
    const a2 = pings.event_2.track_a2_last;
    const b2 = pings.event_2.track_b2_first;
    const danti = pings.event_2.danti;
    return boundsFromPoints(
      [
        [a2.lon, a2.lat],
        [b2.lon, b2.lat]
      ],
      [danti.lon, danti.lat]
    );
  }
  return null;
}

// Backwards-compatible name — the old API some callers may still use.
export function flyForCaseOptions(
  fixture: TracksFixture,
  caseId: string
): CameraOptions | null {
  return flyForCaseBoundsOptions(fixture, caseId);
}

// Fly to a specific feature/alert by id. Robust to whatever id convention
// the substrate panel emits. Falls back to the case-bounds framing on hit
// so the alert and the case stay visually aligned.
export function flyForAlertOptions(
  fixture: TracksFixture,
  alertId: string | null | undefined
): CameraOptions | null {
  if (!alertId) return null;

  if (alertId.includes("identity-churn") || alertId.includes("event-1") ||
      alertId.includes("trk-caldera")) {
    return flyForCaseBoundsOptions(fixture, "case:alara-01:event-1");
  }
  if (alertId.includes("event-2") || alertId.includes("271990222")) {
    return flyForCaseBoundsOptions(fixture, "case:alara-01:event-2");
  }

  // Fall through — try direct feature lookup.
  const feature = fixture.features.find((f) => f.id === alertId) as
    | Feature<Point | Polygon | LineString>
    | undefined;
  if (feature) {
    const center = featureCentroid(feature);
    if (center) return { kind: "fly", center, zoom: 9.0, ...SOFT };
  }
  return null;
}

export function executeCamera(
  map: maplibregl.Map | null,
  options: CameraOptions | null
): void {
  if (!map || !options) return;
  try {
    if (options.kind === "fly") {
      // MapLibre v5.24.x's flyTo animation can corrupt transform.zoom to NaN
      // when the next camera op fires during an in-progress animation —
      // observable in the SeaForge replay (phase advances in seconds, so
      // animations chain rapidly). easeTo with a short duration is stable
      // here; jumpTo is the absolute fallback. We pick easeTo so the camera
      // still feels animated to a viewer.
      if (isCameraAtTarget(map, options.center, options.zoom)) return;
      stopCurrentCamera(map);
      map.easeTo({
        center: options.center,
        zoom: options.zoom,
        duration: options.duration ?? 600
      });
      return;
    }
    const cam = map.cameraForBounds(options.bounds, {
      padding: options.padding ?? 80,
      maxZoom: options.maxZoom ?? 10
    });
    if (!cam || cam.center == null || !Number.isFinite(cam.zoom ?? NaN)) return;
    const camCenter = cam.center as
      | [number, number]
      | { lng: number; lat: number }
      | { lon: number; lat: number };
    const center: [number, number] = Array.isArray(camCenter)
      ? camCenter
      : [
          (camCenter as { lng?: number; lon?: number }).lng ??
            (camCenter as { lon?: number }).lon!,
          (camCenter as { lat: number }).lat
        ];
    if (!Number.isFinite(center[0]) || !Number.isFinite(center[1])) return;
    if (isCameraAtTarget(map, center, cam.zoom)) return;
    stopCurrentCamera(map);
    map.easeTo({
      center,
      zoom: cam.zoom,
      duration: options.duration ?? 700
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[map] camera op failed (likely pre-layout)", err);
  }
}

// Backwards-compatible alias.
export const executeFly = executeCamera;

// --- helpers --------------------------------------------------------------

function boundsFromPoints(
  required: Array<[number, number]>,
  optional: [number, number] | null = null
): FitBoundsOptions {
  const all = optional ? [...required, optional] : required;
  let minLon = Infinity, minLat = Infinity;
  let maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of all) {
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }
  // Inflate slightly so bounds aren't flush against the viewport edge.
  const dLon = (maxLon - minLon) * 0.18 || 0.05;
  const dLat = (maxLat - minLat) * 0.18 || 0.05;
  return {
    kind: "bounds",
    bounds: [
      [minLon - dLon, minLat - dLat],
      [maxLon + dLon, maxLat + dLat]
    ],
    padding: 90,
    maxZoom: 10
  };
}

function isCameraAtTarget(
  map: maplibregl.Map,
  center: [number, number],
  zoom: number
): boolean {
  if (!Number.isFinite(center[0]) || !Number.isFinite(center[1]) || !Number.isFinite(zoom)) {
    return false;
  }
  const current = map.getCenter();
  const currentZoom = map.getZoom();
  if (!Number.isFinite(current.lng) || !Number.isFinite(current.lat) || !Number.isFinite(currentZoom)) {
    return false;
  }
  return (
    Math.abs(current.lng - center[0]) < CAMERA_CENTER_EPSILON &&
    Math.abs(current.lat - center[1]) < CAMERA_CENTER_EPSILON &&
    Math.abs(currentZoom - zoom) < CAMERA_ZOOM_EPSILON
  );
}

function stopCurrentCamera(map: maplibregl.Map): void {
  try {
    if (map.isMoving()) map.stop();
  } catch {
    // Ignore pre-layout transform states; the following camera call will fail
    // through the outer guard if MapLibre is not ready yet.
  }
}

function featureCentroid(
  feature: Feature<Point | Polygon | LineString>
): [number, number] | null {
  if (feature.geometry.type === "Point") {
    return feature.geometry.coordinates as [number, number];
  }
  if (feature.geometry.type === "LineString") {
    const coords = feature.geometry.coordinates;
    return coords[Math.floor(coords.length / 2)] as [number, number];
  }
  if (feature.geometry.type === "Polygon") {
    const ring = feature.geometry.coordinates[0];
    let sx = 0, sy = 0;
    for (const [x, y] of ring) { sx += x; sy += y; }
    return [sx / ring.length, sy / ring.length];
  }
  return null;
}
