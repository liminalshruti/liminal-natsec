import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";

import type { HormuzEvidenceItem } from "../../../shared/hormuz/types.ts";

const MARITIME_DIR = new URL("../../../fixtures/maritime/", import.meta.url);
const LIVE_CACHE_DIR = new URL("../../../fixtures/maritime/live-cache/", import.meta.url);
const REAL_DIR = new URL("../../../fixtures/maritime/real/", import.meta.url);

const DEFAULT_DARK_GAP_THRESHOLD_MIN = Number(
  process.env.REAL_DARK_GAP_THRESHOLD_MIN ?? 20
);

const HORMUZ_AOI = {
  id: "aoi:real:hormuz",
  name: "Strait of Hormuz real-data AOI",
  bbox: [54.4, 24.5, 57.8, 27.2] as [number, number, number, number],
  polygon: [
    [
      [54.4, 24.5],
      [57.8, 24.5],
      [57.8, 27.2],
      [54.4, 27.2],
      [54.4, 24.5]
    ]
  ]
};

export type RealProviderStatusKind =
  | "available"
  | "unavailable"
  | "excluded_fixture_fallback";

export interface RealProviderStatus {
  source: string;
  status: RealProviderStatusKind;
  detail: string;
  fileName?: string;
  generatedAt?: string | null;
  recordCount?: number;
}

interface AisObservation {
  id: string;
  sourceRecordId: string;
  mmsi: string;
  name: string | null;
  observedAt: string;
  t: number;
  lat: number;
  lon: number;
  sog: number | null;
  cog: number | null;
  heading: number | null;
  sourceSha256: string;
}

interface GfwEvent {
  id: string;
  type: string;
  ssvid: string | null;
  name: string | null;
  start: string | null;
  end: string | null;
  lat: number | null;
  lon: number | null;
  sourceFile: string;
  sourceSha256: string;
}

interface RealAnomaly {
  id: string;
  caseId: string;
  claimId: string;
  key: string;
  mmsi: string;
  name: string | null;
  start: AisObservation;
  end: AisObservation;
  gapMinutes: number;
  gfwEvents: GfwEvent[];
  score: number;
}

export interface RealGenerationSummary {
  mode: "real";
  generated_at: string;
  strict_real: true;
  dark_gap_threshold_min: number;
  observation_count: number;
  track_count: number;
  anomaly_count: number;
  claim_count: number;
  evidence_count: number;
  action_count: number;
  source_statuses: RealProviderStatus[];
  empty_reason: string | null;
}

export interface RealGenerationResult {
  summary: RealGenerationSummary;
  observations: FixtureSection;
  anomalies: FixtureSection;
  hypotheses: FixtureSection;
  claims: FixtureSection;
  evidence: FixtureSection;
  actions: FixtureSection;
  tracks: TracksGeoJson;
  sourceStatus: RealProviderStatus[];
}

interface FixtureSection {
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
}

interface TracksGeoJson {
  type: "FeatureCollection";
  metadata?: Record<string, unknown>;
  features: GeoJsonFeature[];
}

interface GeoJsonFeature {
  type: "Feature";
  id: string;
  properties: Record<string, unknown>;
  geometry: {
    type: "Point" | "LineString" | "Polygon";
    coordinates: unknown;
  };
}

export function generateRealWatchfloor(
  options: {
    liveCacheDir?: URL;
    maritimeDir?: URL;
    outputDir?: URL;
    write?: boolean;
    darkGapThresholdMin?: number;
  } = {}
): RealGenerationResult {
  const liveCacheDir = options.liveCacheDir ?? LIVE_CACHE_DIR;
  const outputDir = options.outputDir ?? REAL_DIR;
  const maritimeDir = options.maritimeDir ?? MARITIME_DIR;
  const generatedAt = latestCacheTimestamp(liveCacheDir) ?? new Date().toISOString();
  const thresholdMin = options.darkGapThresholdMin ?? DEFAULT_DARK_GAP_THRESHOLD_MIN;

  const ais = loadAisObservations(liveCacheDir);
  const gfw = loadGfwEvents(liveCacheDir);
  const sourceStatus = [...ais.statuses, ...gfw.statuses];
  const observationsByMmsi = groupBy(ais.observations, (observation) => observation.mmsi);
  const anomalies = detectDarkGaps(observationsByMmsi, gfw.events, thresholdMin);
  const graph = buildGraphSections({
    generatedAt,
    observations: ais.observations,
    anomalies,
    contextEvidence: loadRealContextEvidence(maritimeDir)
  });
  const tracks = buildTracksGeoJson(ais.observations, anomalies);

  const summary: RealGenerationSummary = {
    mode: "real",
    generated_at: generatedAt,
    strict_real: true,
    dark_gap_threshold_min: thresholdMin,
    observation_count: ais.observations.length,
    track_count: observationsByMmsi.size,
    anomaly_count: anomalies.length,
    claim_count: graph.claims.nodes.length,
    evidence_count: graph.evidence.nodes.length,
    action_count: graph.actions.nodes.length,
    source_statuses: sourceStatus,
    empty_reason: emptyReason(ais.observations, anomalies, sourceStatus)
  };

  if (options.write) {
    mkdirSync(outputDir, { recursive: true });
    writeJson(new URL("observations.json", outputDir), graph.observations);
    writeJson(new URL("anomalies.json", outputDir), graph.anomalies);
    writeJson(new URL("hypotheses.json", outputDir), graph.hypotheses);
    writeJson(new URL("claims.json", outputDir), graph.claims);
    writeJson(new URL("evidence.json", outputDir), graph.evidence);
    writeJson(new URL("actions.json", outputDir), graph.actions);
    writeJson(new URL("tracks.geojson", outputDir), tracks);
    writeJson(new URL("source-status.json", outputDir), sourceStatus);
    writeJson(new URL("generation-summary.json", outputDir), summary);
  }

  return {
    summary,
    observations: graph.observations,
    anomalies: graph.anomalies,
    hypotheses: graph.hypotheses,
    claims: graph.claims,
    evidence: graph.evidence,
    actions: graph.actions,
    tracks,
    sourceStatus
  };
}

function loadAisObservations(liveCacheDir: URL): {
  observations: AisObservation[];
  statuses: RealProviderStatus[];
} {
  const fileName = "aisstream-hormuz-sample.json";
  const file = readCacheJson(liveCacheDir, fileName);
  if (!file.exists) {
    return {
      observations: [],
      statuses: [
        {
          source: "AISSTREAM",
          status: "unavailable",
          detail: "AISstream cache file missing",
          fileName
        }
      ]
    };
  }

  const generatedAt = stringValue(file.json.generated_at);
  if (file.json.fixture_mode === true) {
    return {
      observations: [],
      statuses: [
        {
          source: "AISSTREAM",
          status: "excluded_fixture_fallback",
          detail:
            stringValue(file.json.fixture_reason) ??
            "AISstream cache is marked fixture_mode and is excluded from real mode",
          fileName,
          generatedAt,
          recordCount: 0
        }
      ]
    };
  }

  const messages = arrayValue(file.json.messages);
  const observations = messages.flatMap((message, index) =>
    normalizeAisMessage(message, index, file.sha256)
  );

  return {
    observations: observations.sort((left, right) => left.t - right.t),
    statuses: [
      {
        source: "AISSTREAM",
        status: observations.length > 0 ? "available" : "unavailable",
        detail:
          observations.length > 0
            ? `${observations.length} real AIS messages normalized`
            : "AISstream cache contained no usable real position messages",
        fileName,
        generatedAt,
        recordCount: observations.length
      }
    ]
  };
}

function normalizeAisMessage(
  value: unknown,
  index: number,
  sourceSha256: string
): AisObservation[] {
  const message = recordValue(value);
  const meta = recordValue(message.MetaData);
  const report = recordValue(recordValue(message.Message).PositionReport);
  const mmsi =
    stringValue(meta.MMSI_String) ??
    stringValue(meta.MMSI) ??
    stringValue(report.UserID);
  const observedAt = stringValue(meta.time_utc);
  const lat = numberValue(meta.latitude) ?? numberValue(report.Latitude);
  const lon = numberValue(meta.longitude) ?? numberValue(report.Longitude);
  if (!mmsi || !observedAt || lat === null || lon === null) return [];
  const t = Date.parse(observedAt);
  if (!Number.isFinite(t)) return [];

  const sourceRecordId = `aisstream:${mmsi}:${observedAt}:${index}`;
  return [
    {
      id: `obs:real:hormuz:${sha(sourceRecordId).slice(0, 14)}`,
      sourceRecordId,
      mmsi,
      name: stringValue(meta.ShipName),
      observedAt,
      t,
      lat,
      lon,
      sog: numberValue(report.Sog),
      cog: numberValue(report.Cog),
      heading: numberValue(report.TrueHeading),
      sourceSha256
    }
  ];
}

function loadGfwEvents(liveCacheDir: URL): {
  events: GfwEvent[];
  statuses: RealProviderStatus[];
} {
  const files = [
    "gfw-hormuz-gaps.json",
    "gfw-hormuz-loitering.json",
    "gfw-hormuz-port-visits.json"
  ];
  const events: GfwEvent[] = [];
  const statuses: RealProviderStatus[] = [];

  for (const fileName of files) {
    const file = readCacheJson(liveCacheDir, fileName);
    if (!file.exists) {
      statuses.push({
        source: "GLOBAL_FISHING_WATCH",
        status: "unavailable",
        detail: `${fileName} missing`,
        fileName
      });
      continue;
    }

    const generatedAt = stringValue(file.json.generated_at);
    if (file.json.fixture_mode === true) {
      statuses.push({
        source: "GLOBAL_FISHING_WATCH",
        status: "excluded_fixture_fallback",
        detail:
          stringValue(file.json.fixture_reason) ??
          `${fileName} is marked fixture_mode and excluded from real mode`,
        fileName,
        generatedAt,
        recordCount: 0
      });
      continue;
    }

    const entries = arrayValue(recordValue(file.json.body).entries);
    const normalized = entries.flatMap((entry) => normalizeGfwEvent(entry, fileName, file.sha256));
    events.push(...normalized);
    statuses.push({
      source: "GLOBAL_FISHING_WATCH",
      status: normalized.length > 0 ? "available" : "unavailable",
      detail:
        normalized.length > 0
          ? `${normalized.length} real GFW events normalized from ${fileName}`
          : `${fileName} contained no usable real events`,
      fileName,
      generatedAt,
      recordCount: normalized.length
    });
  }

  return { events, statuses };
}

function normalizeGfwEvent(value: unknown, sourceFile: string, sourceSha256: string): GfwEvent[] {
  const event = recordValue(value);
  const vessel = recordValue(event.vessel);
  const position = recordValue(event.position);
  const id = stringValue(event.id);
  const type = stringValue(event.type);
  if (!id || !type) return [];
  return [
    {
      id,
      type,
      ssvid: stringValue(vessel.ssvid),
      name: stringValue(vessel.name),
      start: stringValue(event.start),
      end: stringValue(event.end),
      lat: numberValue(position.lat),
      lon: numberValue(position.lon),
      sourceFile,
      sourceSha256
    }
  ];
}

function detectDarkGaps(
  observationsByMmsi: Map<string, AisObservation[]>,
  gfwEvents: GfwEvent[],
  thresholdMin: number
): RealAnomaly[] {
  const anomalies: RealAnomaly[] = [];
  for (const [mmsi, observations] of observationsByMmsi.entries()) {
    const sorted = [...observations].sort((left, right) => left.t - right.t);
    for (let index = 1; index < sorted.length; index += 1) {
      const start = sorted[index - 1];
      const end = sorted[index];
      const gapMinutes = (end.t - start.t) / 60_000;
      if (gapMinutes < thresholdMin) continue;
      const key = sha(`${mmsi}:${start.observedAt}:${end.observedAt}`).slice(0, 12);
      const matchedEvents = gfwEvents.filter((event) => event.ssvid === mmsi);
      anomalies.push({
        id: `anom:real:hormuz:dark-gap:${key}`,
        caseId: `case:real:hormuz:${key}`,
        claimId: `claim:real:hormuz:${key}:custody:h1`,
        key,
        mmsi,
        name: end.name ?? start.name,
        start,
        end,
        gapMinutes,
        gfwEvents: matchedEvents,
        score: Math.min(0.95, 0.55 + Math.min(gapMinutes / 240, 0.25) + (matchedEvents.length > 0 ? 0.1 : 0))
      });
    }
  }

  return anomalies.sort((left, right) => right.score - left.score);
}

function buildGraphSections(input: {
  generatedAt: string;
  observations: AisObservation[];
  anomalies: RealAnomaly[];
  contextEvidence: HormuzEvidenceItem[];
}): {
  observations: FixtureSection;
  anomalies: FixtureSection;
  hypotheses: FixtureSection;
  claims: FixtureSection;
  evidence: FixtureSection;
  actions: FixtureSection;
} {
  const observations: FixtureSection = {
    nodes: input.observations.map((observation) => ({
      id: observation.id,
      type: "observation",
      title: `${observation.name ?? observation.mmsi} AIS position`,
      created_at: input.generatedAt,
      data: {
        source: "AISstream",
        source_record_id: observation.sourceRecordId,
        observed_at: observation.observedAt,
        mmsi: observation.mmsi,
        name: observation.name,
        lat: observation.lat,
        lon: observation.lon,
        sog_knots: observation.sog,
        cog_deg: observation.cog,
        source_sha256: observation.sourceSha256
      }
    })),
    edges: []
  };

  const anomalies: FixtureSection = { nodes: [], edges: [] };
  const hypotheses: FixtureSection = { nodes: [], edges: [] };
  const claims: FixtureSection = { nodes: [], edges: [] };
  const evidence: FixtureSection = { nodes: [], edges: [] };
  const actions: FixtureSection = { nodes: [], edges: [] };

  input.anomalies.forEach((anomaly, index) => {
    const caseTitle = `${anomaly.name ?? anomaly.mmsi} real dark gap`;
    anomalies.nodes.push({
      id: anomaly.caseId,
      type: "case",
      title: caseTitle,
      created_at: input.generatedAt,
      case_id: anomaly.caseId,
      status: "OPEN",
      data: {
        source_mode: "real",
        scenario_id: "hormuz-real-cache",
        strict_real: true
      }
    });
    anomalies.nodes.push({
      id: anomaly.id,
      type: "anomaly",
      title: caseTitle,
      created_at: input.generatedAt,
      case_id: anomaly.caseId,
      status: "OPEN",
      data: {
        anomaly_type: "REAL_AIS_DARK_GAP",
        detected_at: anomaly.end.observedAt,
        window_start: anomaly.start.observedAt,
        window_end: anomaly.end.observedAt,
        gap_minutes: Number(anomaly.gapMinutes.toFixed(2)),
        mmsi: anomaly.mmsi,
        name: anomaly.name,
        score: anomaly.score,
        status: "OPEN",
        rank: index + 1
      }
    });

    const hypothesisIds = [
      [`hyp:real:hormuz:${anomaly.key}:h1`, "Same physical vessel after AIS gap", 0.48],
      [`hyp:real:hormuz:${anomaly.key}:h2`, "Receiver or coverage gap", 0.32],
      [`hyp:real:hormuz:${anomaly.key}:h3`, "Different contact or identity ambiguity", 0.2]
    ] as const;
    for (const [id, title, posterior] of hypothesisIds) {
      hypotheses.nodes.push({
        id,
        type: "hypothesis",
        title,
        created_at: input.generatedAt,
        case_id: anomaly.caseId,
        status: "UNRESOLVED",
        data: { posterior }
      });
    }

    claims.nodes.push({
      id: anomaly.claimId,
      type: "claim",
      title: "Real AIS gap requires custody review",
      created_at: input.generatedAt,
      case_id: anomaly.caseId,
      status: "CONTESTED",
      data: {
        claim_kind: "REAL_DARK_GAP_CUSTODY_REVIEW",
        prior: 0.5,
        delta: 0.35 + anomaly.gfwEvents.length * 0.1,
        posterior: Number(Math.min(0.8, anomaly.score).toFixed(2)),
        confidence: Number(Math.min(0.8, anomaly.score).toFixed(2)),
        summary:
          "Real AIS observations contain a qualifying dark gap. The system preserves custody hypotheses instead of asserting continuity."
      }
    });

    hypotheses.edges.push(edge(`edge:${hypothesisIds[0][0]}:supports:${anomaly.claimId}`, "SUPPORTS", hypothesisIds[0][0], anomaly.claimId, input.generatedAt, [anomaly.start.id, anomaly.end.id], 0.55));
    claims.edges.push(edge(`edge:${anomaly.id}:derived:${anomaly.start.id}`, "DERIVED_FROM", anomaly.id, anomaly.start.id, input.generatedAt, [anomaly.start.id], 0.8));
    claims.edges.push(edge(`edge:${anomaly.id}:derived:${anomaly.end.id}`, "DERIVED_FROM", anomaly.id, anomaly.end.id, input.generatedAt, [anomaly.end.id], 0.8));

    const gapEvidenceId = `ev:real:hormuz:${anomaly.key}:ais-gap`;
    evidence.nodes.push({
      id: gapEvidenceId,
      type: "evidence",
      title: "Real AIS dark gap",
      created_at: input.generatedAt,
      case_id: anomaly.caseId,
      data: {
        evidence_type: "REAL_AIS_DARK_GAP",
        llr_nats: 0.35,
        summary: `${Number(anomaly.gapMinutes.toFixed(1))} minute gap between real AIS positions for ${anomaly.mmsi}.`
      }
    });
    evidence.edges.push(edge(`edge:${gapEvidenceId}:supports:${anomaly.claimId}`, "SUPPORTS", gapEvidenceId, anomaly.claimId, input.generatedAt, [anomaly.start.id, anomaly.end.id], 0.76));

    for (const gfwEvent of anomaly.gfwEvents.slice(0, 3)) {
      const eventEvidenceId = `ev:real:hormuz:${anomaly.key}:gfw:${sha(gfwEvent.id).slice(0, 8)}`;
      evidence.nodes.push({
        id: eventEvidenceId,
        type: "evidence",
        title: `GFW ${gfwEvent.type} context`,
        created_at: input.generatedAt,
        case_id: anomaly.caseId,
        data: {
          evidence_type: "GFW_SOURCE_CORROBORATION",
          llr_nats: 0.16,
          summary: `Real GFW ${gfwEvent.type} event references the same identifier ${anomaly.mmsi}.`,
          source_file: `fixtures/maritime/live-cache/${gfwEvent.sourceFile}`,
          source_sha256: gfwEvent.sourceSha256
        }
      });
      evidence.edges.push(edge(`edge:${eventEvidenceId}:supports:${anomaly.claimId}`, "SUPPORTS", eventEvidenceId, anomaly.claimId, input.generatedAt, [eventEvidenceId], 0.64));
    }

    const actionRows = [
      [`act:real:hormuz:${anomaly.key}:request-sar-rf`, "REQUEST_SAR_OR_RF_CORROBORATION", 1, "RECOMMENDED_REQUIRES_OPERATOR"],
      [`act:real:hormuz:${anomaly.key}:monitor`, "MONITOR_ONLY", 2, "AVAILABLE"],
      [`act:real:hormuz:${anomaly.key}:hold`, "HOLD_CUSTODY_OPEN", 3, "AVAILABLE"]
    ] as const;
    for (const [id, kind, priority, status] of actionRows) {
      actions.nodes.push({
        id,
        type: "actionOption",
        title: kind.replace(/_/g, " ").toLowerCase(),
        created_at: input.generatedAt,
        case_id: anomaly.caseId,
        status,
        data: {
          kind,
          anomaly_id: anomaly.id,
          defaultPriority: priority,
          ranking_score: priority === 1 ? anomaly.score : 0.35,
          trigger: "REAL_AIS_DARK_GAP"
        }
      });
      actions.edges.push(edge(`edge:${anomaly.claimId}:triggers:${id}`, "TRIGGERS", anomaly.claimId, id, input.generatedAt, [anomaly.claimId], 0.7));
    }
  });

  return { observations, anomalies, hypotheses, claims, evidence, actions };
}

function buildTracksGeoJson(
  observations: AisObservation[],
  anomalies: RealAnomaly[]
): TracksGeoJson {
  const features: GeoJsonFeature[] = [
    {
      type: "Feature",
      id: HORMUZ_AOI.id,
      properties: {
        kind: "monitored_zone",
        aoi_id: HORMUZ_AOI.id,
        name: HORMUZ_AOI.name,
        phase_min: 1
      },
      geometry: {
        type: "Polygon",
        coordinates: HORMUZ_AOI.polygon
      }
    }
  ];

  const tracks = groupBy(observations, (observation) => observation.mmsi);
  let backgroundIndex = 1;
  for (const [mmsi, trackObservations] of tracks.entries()) {
    const sorted = [...trackObservations].sort((left, right) => left.t - right.t);
    if (sorted.length < 2) continue;
    features.push(lineFeature(`track:real:background:${mmsi}`, "background_track", sorted, {
      track_id: `real:${mmsi}:${backgroundIndex++}`,
      phase_min: 1
    }));
  }

  const anomaly = anomalies[0];
  if (anomaly) {
    const before = [anomaly.start];
    const after = [anomaly.end];
    features.push(lineFeature(`track:real:${anomaly.key}:a`, "hero_track", before, {
      event_id: "event_1",
      role: "A",
      mmsi: anomaly.mmsi,
      vessel_name: anomaly.name ?? anomaly.mmsi,
      case_id: anomaly.caseId,
      t_start_ms: anomaly.start.t,
      t_end_ms: anomaly.start.t,
      phase_min: 1
    }));
    features.push(lineFeature(`track:real:${anomaly.key}:b`, "hero_track", after, {
      event_id: "event_1",
      role: "B",
      mmsi: anomaly.mmsi,
      vessel_name: anomaly.name ?? anomaly.mmsi,
      case_id: anomaly.caseId,
      t_start_ms: anomaly.end.t,
      t_end_ms: anomaly.end.t,
      phase_min: 3
    }));
    features.push(pointFeature(`ping:real:${anomaly.key}:a`, anomaly.start, {
      kind: "hero_ping",
      event_id: "event_1",
      role: "A",
      mmsi: anomaly.mmsi,
      t_iso: anomaly.start.observedAt,
      t_epoch_ms: anomaly.start.t,
      phase_min: 1
    }));
    features.push(pointFeature(`ping:real:${anomaly.key}:b`, anomaly.end, {
      kind: "hero_ping",
      event_id: "event_1",
      role: "B",
      mmsi: anomaly.mmsi,
      t_iso: anomaly.end.observedAt,
      t_epoch_ms: anomaly.end.t,
      phase_min: 3
    }));
    features.push(lineFeature(`gap:real:${anomaly.key}`, "dark_gap", [anomaly.start, anomaly.end], {
      event_id: "event_1",
      case_id: anomaly.caseId,
      gap_minutes: Number(anomaly.gapMinutes.toFixed(2)),
      gap_start_ms: anomaly.start.t,
      gap_end_ms: anomaly.end.t,
      phase_min: 2
    }));
    const corridor = corridorPolygon(anomaly.start, anomaly.end, 0.06);
    features.push({
      type: "Feature",
      id: `corridor:real:${anomaly.key}`,
      properties: {
        kind: "predicted_corridor",
        event_id: "event_1",
        case_id: anomaly.caseId,
        phase_min: 2
      },
      geometry: { type: "Polygon", coordinates: [corridor] }
    });
    features.push({
      type: "Feature",
      id: `ellipse:real:${anomaly.key}`,
      properties: {
        kind: "predicted_ellipse_95",
        event_id: "event_1",
        source: "kalman",
        mahalanobis: 0,
        likelihood: 1,
        predicted_lat: anomaly.end.lat,
        predicted_lon: anomaly.end.lon,
        phase_min: 3
      },
      geometry: { type: "Polygon", coordinates: [ellipseRing(anomaly.end.lon, anomaly.end.lat, 0.08)] }
    });
  }

  return {
    type: "FeatureCollection",
    metadata: {
      schema_version: "seaforge.real-tracks.v1",
      aoi: {
        aoi_id: HORMUZ_AOI.id,
        name: HORMUZ_AOI.name,
        bbox: HORMUZ_AOI.bbox
      },
      canonical_timestamps: anomaly
        ? {
            event1: {
              track_a_first_iso: anomaly.start.observedAt,
              track_a_last_iso: anomaly.start.observedAt,
              gap_start_iso: anomaly.start.observedAt,
              gap_end_iso: anomaly.end.observedAt,
              track_b_first_iso: anomaly.end.observedAt,
              track_b_last_iso: anomaly.end.observedAt
            },
            event2: {
              track_a2_last_iso: anomaly.end.observedAt,
              danti_corroboration_iso: anomaly.end.observedAt,
              track_b2_reappear_iso: anomaly.end.observedAt
            }
          }
        : null
    },
    features
  };
}

function lineFeature(
  id: string,
  kind: string,
  observations: AisObservation[],
  properties: Record<string, unknown>
): GeoJsonFeature {
  const coordinates = observations.length === 1
    ? [
        [observations[0].lon, observations[0].lat],
        [observations[0].lon, observations[0].lat]
      ]
    : observations.map((observation) => [observation.lon, observation.lat]);
  return {
    type: "Feature",
    id,
    properties: { kind, ...properties },
    geometry: { type: "LineString", coordinates }
  };
}

function pointFeature(
  id: string,
  observation: AisObservation,
  properties: Record<string, unknown>
): GeoJsonFeature {
  return {
    type: "Feature",
    id,
    properties,
    geometry: { type: "Point", coordinates: [observation.lon, observation.lat] }
  };
}

function loadRealContextEvidence(maritimeDir: URL): HormuzEvidenceItem[] {
  const evidence = readJson<HormuzEvidenceItem[]>(
    new URL("hormuz-evidence-items.json", maritimeDir),
    []
  );
  return evidence.filter((item) => item.attributes?.fixture_mode !== true);
}

function emptyReason(
  observations: AisObservation[],
  anomalies: RealAnomaly[],
  statuses: RealProviderStatus[]
): string | null {
  if (anomalies.length > 0) return null;
  if (observations.length === 0) {
    const excluded = statuses.filter((status) => status.status === "excluded_fixture_fallback");
    if (excluded.length > 0) {
      return "No real AIS observations were available. Fixture-mode provider fallbacks were excluded from real mode.";
    }
    return "No real AIS observations were available in the current refresh window.";
  }
  return "Real AIS observations were available, but no dark gap exceeded the configured threshold.";
}

function edge(
  id: string,
  type: string,
  from: string,
  to: string,
  createdAt: string,
  sourceNodeIds: string[],
  confidence: number
): Record<string, unknown> {
  return {
    id,
    type,
    from,
    to,
    provenance: {
      created_at: createdAt,
      created_by: "system",
      source_node_ids: sourceNodeIds,
      confidence
    }
  };
}

function readCacheJson(dir: URL, fileName: string): {
  exists: boolean;
  json: Record<string, unknown>;
  sha256: string;
} {
  const url = new URL(fileName, dir);
  if (!existsSync(url)) return { exists: false, json: {}, sha256: "" };
  const text = readFileSync(url, "utf8");
  return {
    exists: true,
    json: JSON.parse(text) as Record<string, unknown>,
    sha256: sha(text)
  };
}

function latestCacheTimestamp(liveCacheDir: URL): string | null {
  const manifest = readCacheJson(liveCacheDir, "manifest.json");
  return manifest.exists ? stringValue(manifest.json.generated_at) : null;
}

function readJson<T>(url: URL, fallback: T): T {
  if (!existsSync(url)) return fallback;
  return JSON.parse(readFileSync(url, "utf8")) as T;
}

function writeJson(url: URL, value: unknown): void {
  writeFileSync(url, `${JSON.stringify(value, null, 2)}\n`);
}

function groupBy<T>(
  values: T[],
  keyFn: (value: T) => string
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const value of values) {
    const key = keyFn(value);
    const bucket = grouped.get(key) ?? [];
    bucket.push(value);
    grouped.set(key, bucket);
  }
  return grouped;
}

function corridorPolygon(
  start: AisObservation,
  end: AisObservation,
  pad: number
): number[][] {
  const minLon = Math.min(start.lon, end.lon) - pad;
  const maxLon = Math.max(start.lon, end.lon) + pad;
  const minLat = Math.min(start.lat, end.lat) - pad;
  const maxLat = Math.max(start.lat, end.lat) + pad;
  return [
    [minLon, minLat],
    [maxLon, minLat],
    [maxLon, maxLat],
    [minLon, maxLat],
    [minLon, minLat]
  ];
}

function ellipseRing(lon: number, lat: number, radius: number): number[][] {
  const ring: number[][] = [];
  for (let i = 0; i <= 32; i += 1) {
    const angle = (Math.PI * 2 * i) / 32;
    ring.push([lon + Math.cos(angle) * radius, lat + Math.sin(angle) * radius * 0.65]);
  }
  return ring;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
