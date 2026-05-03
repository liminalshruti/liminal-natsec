import type { Feature, FeatureCollection, Point } from "geojson";
import type { TracksFixture } from "./fixtureLoader.ts";
import { timelineBounds } from "./replay.ts";

export const DANTI_TRAFFIC_PATH =
  "/fixtures/maritime/live-cache/danti-hormuz-ship-paginated.json";

export interface DantiTrafficPointProps {
  kind: "danti_ship_position";
  source: "DANTI_MARINETRAFFIC";
  name: string;
  mmsi: string | null;
  imo: string | null;
  flag: string | null;
  ship_type: string | null;
  status: string | null;
  destination: string | null;
  current_port: string | null;
  speed_raw: number | null;
  course: number | null;
  observed_at: string;
  t_epoch_ms: number;
  is_tanker: boolean;
  is_iran_flag: boolean;
  is_underway: boolean;
  is_anchor_or_moored: boolean;
}

export interface DantiTrafficArchive {
  source: "DANTI_MARINETRAFFIC";
  generatedAt: string | null;
  points: Array<Feature<Point, DantiTrafficPointProps>>;
  startMs: number;
  endMs: number;
  totalRecords: number;
  uniqueVessels: number;
}

export interface VisibleDantiTraffic {
  featureCollection: FeatureCollection<Point, DantiTrafficPointProps>;
  archiveClockIso: string | null;
  visibleVessels: number;
  totalVessels: number;
}

interface DantiDocument {
  documentId?: string;
  authoredOn?: string;
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Record<string, unknown>;
  display?: Record<string, unknown>;
}

interface DantiShipPayload {
  generated_at?: string;
  documents?: DantiDocument[];
}

export async function loadDantiTraffic(
  url: string = DANTI_TRAFFIC_PATH
): Promise<DantiTrafficArchive | null> {
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`fetch ${url} -> HTTP ${response.status}`);
  }
  return buildDantiTrafficArchive((await response.json()) as DantiShipPayload);
}

export function buildDantiTrafficArchive(
  payload: DantiShipPayload
): DantiTrafficArchive | null {
  const docs = Array.isArray(payload.documents) ? payload.documents : [];
  const points = docs.flatMap((doc, index) => {
    const point = dantiDocumentToPoint(doc, index);
    return point ? [point] : [];
  });
  if (points.length === 0) return null;

  points.sort((left, right) => left.properties.t_epoch_ms - right.properties.t_epoch_ms);
  const startMs = points[0].properties.t_epoch_ms;
  const endMs = points[points.length - 1].properties.t_epoch_ms;
  const uniqueVessels = new Set(points.map(vesselKey)).size;

  return {
    source: "DANTI_MARINETRAFFIC",
    generatedAt: stringValue(payload.generated_at),
    points,
    startMs,
    endMs,
    totalRecords: points.length,
    uniqueVessels
  };
}

export function selectVisibleDantiTraffic(
  archive: DantiTrafficArchive,
  fixture: TracksFixture,
  clockMs: number
): VisibleDantiTraffic {
  const archiveClockMs = archiveTimeForScenarioClock(archive, fixture, clockMs);
  if (!Number.isFinite(archiveClockMs)) {
    return emptyVisibleDantiTraffic(archive);
  }

  const latestByVessel = new Map<string, Feature<Point, DantiTrafficPointProps>>();
  for (const point of archive.points) {
    if (point.properties.t_epoch_ms > archiveClockMs) break;
    latestByVessel.set(vesselKey(point), point);
  }

  const features = [...latestByVessel.values()].sort((left, right) =>
    vesselPriority(right) - vesselPriority(left) ||
    left.properties.name.localeCompare(right.properties.name)
  );

  return {
    featureCollection: { type: "FeatureCollection", features },
    archiveClockIso: new Date(archiveClockMs).toISOString(),
    visibleVessels: features.length,
    totalVessels: archive.uniqueVessels
  };
}

export function archiveTimeForScenarioClock(
  archive: DantiTrafficArchive,
  fixture: TracksFixture,
  clockMs: number
): number {
  const bounds = timelineBounds(fixture);
  const scenarioSpan = Math.max(1, bounds.endMs - bounds.startMs);
  const progress = clamp01((clockMs - bounds.startMs) / scenarioSpan);
  return archive.startMs + progress * Math.max(1, archive.endMs - archive.startMs);
}

export function emptyDantiTrafficFeatureCollection():
  FeatureCollection<Point, DantiTrafficPointProps> {
  return { type: "FeatureCollection", features: [] };
}

function emptyVisibleDantiTraffic(archive: DantiTrafficArchive): VisibleDantiTraffic {
  return {
    featureCollection: emptyDantiTrafficFeatureCollection(),
    archiveClockIso: null,
    visibleVessels: 0,
    totalVessels: archive.uniqueVessels
  };
}

function dantiDocumentToPoint(
  doc: DantiDocument,
  index: number
): Feature<Point, DantiTrafficPointProps> | null {
  const props = doc.properties ?? {};
  const display = doc.display ?? {};
  const coords = Array.isArray(doc.geometry?.coordinates)
    ? doc.geometry.coordinates
    : [];
  const lon = numberValue(coords[0]) ?? numberValue(props.longitude);
  const lat = numberValue(coords[1]) ?? numberValue(props.latitude);
  const observedAt = stringValue(doc.authoredOn) ?? stringValue(props.datetime);
  const tEpochMs = observedAt ? Date.parse(observedAt) : Number.NaN;
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(tEpochMs)) {
    return null;
  }

  const shipType = stringValue(props.type_name) ?? stringValue(display.ship_type);
  const status = stringValue(display.status) ?? stringValue(props.status);
  const flag = stringValue(props.flag) ?? stringValue(display.flag);

  return {
    type: "Feature",
    id: doc.documentId ?? `danti-ship-${index}`,
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties: {
      kind: "danti_ship_position",
      source: "DANTI_MARINETRAFFIC",
      name:
        stringValue(props.ship_name) ??
        stringValue(display.ship_name) ??
        `Vessel ${index + 1}`,
      mmsi: stringValue(props.mmsi) ?? stringValue(display.mmsi),
      imo: stringValue(props.imo) ?? stringValue(display.imo),
      flag,
      ship_type: shipType,
      status,
      destination: stringValue(props.destination),
      current_port: stringValue(props.current_port),
      speed_raw: numberValue(props.speed) ?? numberValue(display.speed),
      course: numberValue(props.course),
      observed_at: observedAt ?? new Date(tEpochMs).toISOString(),
      t_epoch_ms: tEpochMs,
      is_tanker: /tanker/i.test(shipType ?? ""),
      is_iran_flag: flag === "IR",
      is_underway: /under way/i.test(status ?? ""),
      is_anchor_or_moored: /anchor|moored/i.test(status ?? "")
    }
  };
}

function vesselKey(feature: Feature<Point, DantiTrafficPointProps>): string {
  return (
    feature.properties.mmsi ??
    feature.properties.imo ??
    feature.properties.name
  );
}

function vesselPriority(feature: Feature<Point, DantiTrafficPointProps>): number {
  const props = feature.properties;
  return (
    (props.is_iran_flag ? 100 : 0) +
    (props.is_tanker ? 40 : 0) +
    (props.is_underway ? 20 : 0) +
    (props.is_anchor_or_moored ? 5 : 0)
  );
}

function stringValue(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
