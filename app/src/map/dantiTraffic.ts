import type { Feature, FeatureCollection, Point } from "geojson";
import type { TracksFixture } from "./fixtureLoader.ts";
import { timelineBounds } from "./replay.ts";

export const DANTI_TRAFFIC_PATH =
  "/fixtures/maritime/live-cache/danti-hormuz-ship-paginated.json";

export interface DantiTrafficPointProps {
  kind: "danti_traffic";
  source: "DANTI/MARINETRAFFIC";
  document_id: string;
  name: string;
  mmsi: string;
  imo: string;
  flag: string;
  ship_type: string;
  status: string;
  destination: string;
  current_port: string;
  observed_at: string;
  t_epoch_ms: number;
  speed: number | null;
  course: number | null;
  is_tanker: boolean;
  is_iran_flag: boolean;
  is_underway: boolean;
  is_anchor_or_moored: boolean;
}

export interface DantiTrafficArchive {
  startMs: number;
  endMs: number;
  totalDocuments: number;
  totalVessels: number;
  features: Array<Feature<Point, DantiTrafficPointProps>>;
}

export interface VisibleDantiTraffic {
  featureCollection: FeatureCollection<Point, DantiTrafficPointProps>;
  archiveClockIso: string | null;
  archiveStartIso: string | null;
  archiveEndIso: string | null;
  visibleVessels: number;
  totalVessels: number;
}

interface DantiPayload {
  documents?: DantiDocument[];
}

interface DantiDocument {
  documentId?: string;
  authoredOn?: string;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
  properties?: Record<string, unknown>;
  display?: Record<string, unknown>;
  source?: string;
}

export async function loadDantiTraffic(
  url: string = DANTI_TRAFFIC_PATH
): Promise<DantiTrafficArchive | null> {
  const response = await fetch(url);
  if (!response.ok) return null;
  const payload = (await response.json()) as DantiPayload;
  return buildDantiTrafficArchive(payload);
}

export function buildDantiTrafficArchive(
  payload: DantiPayload
): DantiTrafficArchive | null {
  const documents = Array.isArray(payload.documents) ? payload.documents : [];
  const features: Array<Feature<Point, DantiTrafficPointProps>> = [];

  for (const doc of documents) {
    const props = doc.properties ?? {};
    const display = doc.display ?? {};
    const coords = pointCoordinates(doc, props);
    if (!coords) continue;

    const observedAt = stringValue(doc.authoredOn) || stringValue(props.datetime);
    const tEpochMs = Date.parse(observedAt);
    if (!Number.isFinite(tEpochMs)) continue;

    const name =
      stringValue(props.ship_name) ||
      stringValue(display.ship_name) ||
      "Unknown vessel";
    const mmsi = stringValue(props.mmsi) || stringValue(display.mmsi);
    const imo = stringValue(props.imo) || stringValue(display.imo);
    const flag = stringValue(props.flag) || stringValue(display.flag);
    const shipType =
      stringValue(props.type_name) ||
      stringValue(display.ship_type) ||
      stringValue(props.ship_type);
    const status = stringValue(display.status) || stringValue(props.status);
    const speed = numberValue(props.speed ?? display.speed);

    const feature: Feature<Point, DantiTrafficPointProps> = {
      type: "Feature",
      id: doc.documentId ?? `${mmsi || name}:${tEpochMs}`,
      properties: {
        kind: "danti_traffic",
        source: "DANTI/MARINETRAFFIC",
        document_id: doc.documentId ?? "",
        name,
        mmsi,
        imo,
        flag,
        ship_type: shipType,
        status,
        destination: stringValue(props.destination) || stringValue(display.destination),
        current_port: stringValue(props.current_port),
        observed_at: observedAt,
        t_epoch_ms: tEpochMs,
        speed,
        course: numberValue(props.course),
        is_tanker: isTanker(shipType, props.raw_vessel_data),
        is_iran_flag: isIranFlag(flag, props.raw_vessel_data),
        is_underway: isUnderway(status, props.status, speed),
        is_anchor_or_moored: isAnchorOrMoored(status, props.status, speed),
      },
      geometry: {
        type: "Point",
        coordinates: coords,
      },
    };
    features.push(feature);
  }

  if (features.length === 0) return null;

  features.sort(
    (a, b) =>
      a.properties.t_epoch_ms - b.properties.t_epoch_ms ||
      vesselKey(a).localeCompare(vesselKey(b))
  );

  const vesselKeys = new Set(features.map(vesselKey));
  return {
    startMs: features[0].properties.t_epoch_ms,
    endMs: features[features.length - 1].properties.t_epoch_ms,
    totalDocuments: features.length,
    totalVessels: vesselKeys.size,
    features,
  };
}

export function selectVisibleDantiTraffic(
  archive: DantiTrafficArchive | null,
  fixture: TracksFixture,
  clockMs: number
): VisibleDantiTraffic {
  if (!archive) {
    return {
      featureCollection: emptyDantiTrafficFeatureCollection(),
      archiveClockIso: null,
      archiveStartIso: null,
      archiveEndIso: null,
      visibleVessels: 0,
      totalVessels: 0,
    };
  }

  const archiveClockMs = archiveTimeForScenarioClock(archive, fixture, clockMs);
  const latestByVessel = new Map<string, Feature<Point, DantiTrafficPointProps>>();

  for (const feature of archive.features) {
    if (feature.properties.t_epoch_ms > archiveClockMs) break;
    latestByVessel.set(vesselKey(feature), feature);
  }

  const visible = Array.from(latestByVessel.values()).sort(compareVisibleVessels);
  return {
    featureCollection: { type: "FeatureCollection", features: visible },
    archiveClockIso: new Date(archiveClockMs).toISOString(),
    archiveStartIso: new Date(archive.startMs).toISOString(),
    archiveEndIso: new Date(archive.endMs).toISOString(),
    visibleVessels: visible.length,
    totalVessels: archive.totalVessels,
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

export function emptyDantiTrafficFeatureCollection(): FeatureCollection<Point, DantiTrafficPointProps> {
  return { type: "FeatureCollection", features: [] };
}

function pointCoordinates(
  doc: DantiDocument,
  props: Record<string, unknown>
): [number, number] | null {
  const coords = doc.geometry?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lon = numberValue(coords[0]);
    const lat = numberValue(coords[1]);
    if (lon !== null && lat !== null && validLonLat(lon, lat)) return [lon, lat];
  }

  const lon = numberValue(props.longitude);
  const lat = numberValue(props.latitude);
  if (lon !== null && lat !== null && validLonLat(lon, lat)) return [lon, lat];
  return null;
}

function validLonLat(lon: number, lat: number): boolean {
  return lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
}

function vesselKey(feature: Feature<Point, DantiTrafficPointProps>): string {
  const p = feature.properties;
  return p.mmsi || p.imo || p.name || p.document_id;
}

function compareVisibleVessels(
  a: Feature<Point, DantiTrafficPointProps>,
  b: Feature<Point, DantiTrafficPointProps>
): number {
  const ap = priority(a.properties);
  const bp = priority(b.properties);
  if (ap !== bp) return bp - ap;
  return a.properties.name.localeCompare(b.properties.name);
}

function priority(props: DantiTrafficPointProps): number {
  return (
    (props.is_iran_flag ? 100 : 0) +
    (props.is_tanker ? 25 : 0) +
    (props.is_underway ? 10 : 0)
  );
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isTanker(shipType: string, rawVesselData: unknown): boolean {
  const text = [
    shipType,
    typeof rawVesselData === "object" && rawVesselData
      ? Object.values(rawVesselData as Record<string, unknown>).map(stringValue).join(" ")
      : "",
  ]
    .join(" ")
    .toLowerCase();
  return /\b(tanker|crude|oil|lng|lpg|chemical|product)\b/.test(text);
}

function isIranFlag(flag: string, rawVesselData: unknown): boolean {
  const text = [
    flag,
    typeof rawVesselData === "object" && rawVesselData
      ? stringValue((rawVesselData as Record<string, unknown>).SHIP_COUNTRY)
      : "",
  ]
    .join(" ")
    .toUpperCase();
  return /\b(IR|IRAN|IRANIAN|ISLAMIC REPUBLIC OF IRAN)\b/.test(text);
}

function isUnderway(status: string, statusCode: unknown, speed: number | null): boolean {
  const text = status.toLowerCase();
  if (text.includes("underway") || text.includes("under way")) return true;
  if (stringValue(statusCode) === "0") return true;
  return speed !== null && speed > 0.5;
}

function isAnchorOrMoored(status: string, statusCode: unknown, speed: number | null): boolean {
  const text = status.toLowerCase();
  const code = stringValue(statusCode);
  if (text.includes("anchor") || text.includes("moored")) return true;
  if (code === "1" || code === "5") return true;
  return speed !== null && speed <= 0.5;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
