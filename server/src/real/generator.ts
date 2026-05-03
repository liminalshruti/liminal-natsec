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

const WATCH_CONTEXT = {
  ruleAoiId: "aoi:alara-eez-box-01",
  watchBoxName: "Hormuz Watch Box 01",
  sourceLabel: "real cached AIS/GFW source window",
  scopeNote:
    "The review window is derived from real source timestamps. Archived context is not treated as current vessel behavior."
} as const;

const HORMUZ_AOI = {
  id: "aoi:real:hormuz",
  name: WATCH_CONTEXT.watchBoxName,
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

const DANTI_SOURCE_FILES = [
  "danti-hormuz-ship-all-paginated.json",
  "danti-hormuz-ship-best-size-1000.json",
  "danti-hormuz-all-size-1000.json"
] as const;

const SANCTIONED_FLEET_NAMES = [
  "ADRIAN DARYA",
  "HAMOUNA",
  "AZARGOUN",
  "KASHAN",
  "SHAYAN 1",
  "AMIR ABBAS",
  "MATIN",
  "KAMINEH",
  "DARYABAR",
  "NOUR 1",
  "BASKAR",
  "ARTARIA",
  "DARYA MAHER",
  "GOLSAN",
  "HOMA",
  "JAMIL 8",
  "OURA",
  "SAVAHEL",
  "SHAMIM",
  "ARAM 110",
  "PETUNIA"
] as const;

const FOREIGN_IRAN_LAST_PORT_NAMES = [
  "YEKTA II",
  "TINA II",
  "MARIVEX",
  "ELPIS",
  "KOTOKU MARU NO.10",
  "CAPILANO"
] as const;

const CHINA_ROUTING_NAMES = ["HAMOUNA", "DARYABAR"] as const;

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

interface DantiDocument {
  documentId: string;
  authoredOn: string | null;
  sourceFile: string;
  sourceSha256: string;
  sourcePointer: string;
  geometry: { coordinates?: unknown };
  properties: Record<string, unknown>;
}

interface CachedOsintCase {
  id: string;
  title: string;
  stage: string;
  leadSummary: string;
  keyFindings: string[];
  sourceMix: string[];
  onlineBackfill?: OnlineBackfill[];
  hypotheses?: CachedHypothesis[];
  features: Record<string, unknown>;
  caseKind: string;
  primarySignal: string;
  score: number;
  signals: CachedOsintSignal[];
}

interface OnlineBackfill {
  label: string;
  summary: string;
  source: string;
  url: string;
  captured_at: string;
  relevance: string;
}

interface CachedHypothesis {
  title: string;
  hypothesisKind: string;
  posterior: number;
  summary: string;
}

interface CachedOsintSignal {
  id: string;
  title: string;
  summary: string;
  detectedAt: string;
  score: number;
  signalKind: string;
  sourceFile: string;
  sourcePointer: string;
  sourceProvider: string;
  sourceSha256?: string;
  danti?: DantiVesselSnapshot;
  attributes?: Record<string, unknown>;
}

interface DantiVesselSnapshot {
  name: string;
  imo: string | null;
  mmsi: string | null;
  flag: string | null;
  shipType: string | null;
  status: string | null;
  currentPort: string | null;
  lastPort: string | null;
  destination: string | null;
  lat: number | null;
  lon: number | null;
  speedKn: number | null;
  courseDeg: number | null;
  observedAt: string;
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
  const cachedOsint = loadCachedOsintCases(liveCacheDir, maritimeDir);
  const sourceStatus = [...ais.statuses, ...gfw.statuses, ...cachedOsint.statuses];
  const observationsByMmsi = groupBy(ais.observations, (observation) => observation.mmsi);
  const anomalies = detectDarkGaps(observationsByMmsi, gfw.events, thresholdMin);
  const graph = buildGraphSections({
    generatedAt,
    observations: ais.observations,
    anomalies,
    cachedOsintCases: cachedOsint.cases,
    contextEvidence: cachedOsint.contextEvidence
  });
  const tracks = buildTracksGeoJson(ais.observations, anomalies);
  const generatedAnomalyCount = graph.anomalies.nodes.filter((node) => node.type === "anomaly").length;

  const summary: RealGenerationSummary = {
    mode: "real",
    generated_at: generatedAt,
    strict_real: true,
    dark_gap_threshold_min: thresholdMin,
    observation_count: ais.observations.length,
    track_count: observationsByMmsi.size,
    anomaly_count: generatedAnomalyCount,
    claim_count: graph.claims.nodes.length,
    evidence_count: graph.evidence.nodes.length,
    action_count: graph.actions.nodes.length,
    source_statuses: sourceStatus,
    empty_reason: emptyReason(ais.observations, generatedAnomalyCount, sourceStatus)
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
          detail: "AISstream cache is marked fixture_mode and is excluded from strict-real mode",
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
        detail: `${fileName} is marked fixture_mode and excluded from strict-real mode`,
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
  cachedOsintCases: CachedOsintCase[];
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
    const reviewWindowStart = anomaly.start.observedAt;
    const reviewWindowEnd = anomaly.end.observedAt;
    const reviewWindow = reviewWindowLabel(reviewWindowStart, reviewWindowEnd);
    const caseContext = realCaseContext(reviewWindowStart, reviewWindowEnd, reviewWindow);
    const caseTitle = `${anomaly.name ?? anomaly.mmsi} dark gap in ${WATCH_CONTEXT.watchBoxName}`;
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
        strict_real: true,
        features: {
          gap_minutes: Number(anomaly.gapMinutes.toFixed(2)),
          candidate_continuity_score: Number(anomaly.score.toFixed(2)),
          danti_geo_time_corroboration: anomaly.gfwEvents.length > 0,
          aoi_id: WATCH_CONTEXT.ruleAoiId,
          real_aoi_id: HORMUZ_AOI.id,
          aoi_name: WATCH_CONTEXT.watchBoxName,
          review_window_label: reviewWindow
        },
        case_context: caseContext,
        lead_summary:
          `Strict-real AIS/GFW sources generated a custody-review case for MMSI ${anomaly.mmsi} inside ${WATCH_CONTEXT.watchBoxName}.`
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
        aoi_id: WATCH_CONTEXT.ruleAoiId,
        real_aoi_id: HORMUZ_AOI.id,
        watch_box_name: WATCH_CONTEXT.watchBoxName,
        review_window_label: reviewWindow,
        review_window_start: reviewWindowStart,
        review_window_end: reviewWindowEnd,
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
          trigger: "REAL_AIS_DARK_GAP_IN_HORMUZ_WATCH_BOX"
        }
      });
      actions.edges.push(edge(`edge:${anomaly.claimId}:triggers:${id}`, "TRIGGERS", anomaly.claimId, id, input.generatedAt, [anomaly.claimId], 0.7));
    }
  });

  appendCachedOsintCases({
    generatedAt: input.generatedAt,
    cases: input.cachedOsintCases,
    anomalies,
    hypotheses,
    claims,
    evidence,
    actions,
    startingRank: input.anomalies.length + 1
  });

  return { observations, anomalies, hypotheses, claims, evidence, actions };
}

function appendCachedOsintCases(input: {
  generatedAt: string;
  cases: CachedOsintCase[];
  anomalies: FixtureSection;
  hypotheses: FixtureSection;
  claims: FixtureSection;
  evidence: FixtureSection;
  actions: FixtureSection;
  startingRank: number;
}): void {
  let rank = input.startingRank;
  for (const cachedCase of input.cases) {
    const caseRank = rank;
    const sourceWindow = sourceWindowForSignals(cachedCase.signals);
    const caseContext = {
      ...realCaseContext(sourceWindow.start, sourceWindow.end, sourceWindow.label),
      primary_real_signal: cachedCase.primarySignal,
      scope_note:
        "This case is generated only from cached OSINT files in the repository. No live refresh or fixture-mode provider fallback is used."
    };
    const claimId = `claim:${cachedCase.id.replace(/^case:/, "")}:custody:h1`;
    const hypothesisRows = cachedCase.hypotheses ?? defaultCachedHypotheses(cachedCase);

    input.anomalies.nodes.push({
      id: cachedCase.id,
      type: "case",
      title: cachedCase.title,
      created_at: input.generatedAt,
      case_id: cachedCase.id,
      status: "OPEN",
      data: {
        source_mode: "real",
        scenario_id: "hormuz-cached-osint",
        stage: cachedCase.stage,
        strict_real: true,
        cached_only: true,
        case_kind: cachedCase.caseKind,
        rank: caseRank,
        detected_at: sourceWindow.end,
        features: {
          ...cachedCase.features,
          signal_count: cachedCase.signals.length,
          candidate_continuity_score: cachedCase.score,
          aoi_id: WATCH_CONTEXT.ruleAoiId,
          real_aoi_id: HORMUZ_AOI.id,
          aoi_name: WATCH_CONTEXT.watchBoxName,
          review_window_label: sourceWindow.label
        },
        case_context: caseContext,
        lead_summary: cachedCase.leadSummary,
        key_findings: cachedCase.keyFindings,
        source_mix: cachedCase.sourceMix,
        online_backfill: cachedCase.onlineBackfill ?? []
      }
    });

    hypothesisRows.forEach((hypothesis, index) => {
      const hypothesisId = `hyp:${cachedCase.id.replace(/^case:/, "")}:h${index + 1}`;
      input.hypotheses.nodes.push({
        id: hypothesisId,
        type: "hypothesis",
        title: hypothesis.title,
        created_at: input.generatedAt,
        case_id: cachedCase.id,
        status: "UNRESOLVED",
        data: {
          hypothesis_kind: hypothesis.hypothesisKind,
          posterior: hypothesis.posterior,
          summary: hypothesis.summary
        }
      });
      input.hypotheses.edges.push(
        edge(
          `edge:${hypothesisId}:derived:${cachedCase.signals[0].id}`,
          "DERIVED_FROM",
          hypothesisId,
          cachedCase.signals[0].id,
          input.generatedAt,
          cachedCase.signals.map((signal) => signal.id).slice(0, 12),
          Math.max(0.1, Math.min(0.95, hypothesis.posterior))
        )
      );
    });

    input.claims.nodes.push({
      id: claimId,
      type: "claim",
      title: `${cachedCase.title} is supported by cached OSINT`,
      created_at: input.generatedAt,
      case_id: cachedCase.id,
      status: cachedCase.caseKind === "signal_integrity" ? "SUPPORTED" : "CONTESTED",
      data: {
        claim_kind: "CACHED_OSINT_CUSTODY_REVIEW",
        prior: 0.5,
        delta: Number((cachedCase.score - 0.5).toFixed(2)),
        posterior: cachedCase.score,
        confidence: cachedCase.score,
        summary:
          "The cached source rows are sufficient to open a custody case and task corroboration, not to assert hostile intent."
      }
    });
    const primaryHypothesisId = `hyp:${cachedCase.id.replace(/^case:/, "")}:h1`;
    input.hypotheses.edges.push(
      edge(
        `edge:${primaryHypothesisId}:supports:${claimId}`,
        "SUPPORTS",
        primaryHypothesisId,
        claimId,
        input.generatedAt,
        cachedCase.signals.map((signal) => signal.id).slice(0, 12),
        cachedCase.score
      )
    );

    for (const signal of cachedCase.signals) {
      const evidenceId = `ev:${signal.id.replace(/^anom:/, "")}`;
      const vessel = signal.danti;
      input.anomalies.nodes.push({
        id: signal.id,
        type: "anomaly",
        title: signal.title,
        created_at: input.generatedAt,
        case_id: cachedCase.id,
        status: "OPEN",
        data: {
          anomaly_type: signal.signalKind,
          summary: signal.summary,
          detected_at: signal.detectedAt,
          window_start: signal.detectedAt,
          window_end: signal.detectedAt,
          score: signal.score,
          rank,
          status: "OPEN",
          watch_box_name: WATCH_CONTEXT.watchBoxName,
          review_window_label: sourceWindow.label,
          source_file: signal.sourceFile,
          source_pointer: signal.sourcePointer,
          source_provider: signal.sourceProvider,
          source_sha256: signal.sourceSha256,
          vessel_name: vessel?.name,
          imo: vessel?.imo,
          mmsi: vessel?.mmsi,
          flag: vessel?.flag,
          ship_type: vessel?.shipType,
          current_port: vessel?.currentPort,
          last_port: vessel?.lastPort,
          destination: vessel?.destination,
          lat: vessel?.lat,
          lon: vessel?.lon,
          speed_kn: vessel?.speedKn,
          course_deg: vessel?.courseDeg,
          ...(signal.attributes ?? {})
        },
        archetype: {
          archetype_primary: cachedCase.caseKind === "signal_integrity" ? "Trickster" : "Sage",
          archetype_role: "perception"
        }
      });
      input.evidence.nodes.push({
        id: evidenceId,
        type: "evidence",
        title: signal.title,
        created_at: input.generatedAt,
        case_id: cachedCase.id,
        data: {
          evidence_type: signal.signalKind,
          llr_nats: Number((signal.score - 0.5).toFixed(2)),
          summary: signal.summary,
          source_file: signal.sourceFile,
          source_pointer: signal.sourcePointer,
          source_provider: signal.sourceProvider,
          source_sha256: signal.sourceSha256,
          cached_only: true
        }
      });
      input.evidence.edges.push(
        edge(
          `edge:${evidenceId}:supports:${claimId}`,
          "SUPPORTS",
          evidenceId,
          claimId,
          input.generatedAt,
          [signal.id],
          signal.score
        )
      );
      input.anomalies.edges.push(
        edge(
          `edge:${signal.id}:derived:${evidenceId}`,
          "DERIVED_FROM",
          signal.id,
          evidenceId,
          input.generatedAt,
          [evidenceId],
          signal.score
        )
      );
      rank += 1;
    }

    const primaryAction =
      cachedCase.caseKind === "signal_integrity"
        ? "REVIEW_AIS_SIGNAL_INTEGRITY"
        : "REQUEST_SAR_OR_RF_CORROBORATION";
    const actionRows = [
      [`act:${cachedCase.id.replace(/^case:/, "")}:request`, primaryAction, 1, "RECOMMENDED_REQUIRES_OPERATOR"],
      [`act:${cachedCase.id.replace(/^case:/, "")}:monitor`, "MONITOR_ONLY", 2, "AVAILABLE"],
      [`act:${cachedCase.id.replace(/^case:/, "")}:hold`, "HOLD_CUSTODY_OPEN", 3, "AVAILABLE"]
    ] as const;
    for (const [id, kind, priority, status] of actionRows) {
      input.actions.nodes.push({
        id,
        type: "actionOption",
        title: kind.replace(/_/g, " ").toLowerCase(),
        created_at: input.generatedAt,
        case_id: cachedCase.id,
        status,
        data: {
          caseId: cachedCase.id,
          kind,
          defaultPriority: priority,
          ranking_score: priority === 1 ? cachedCase.score : 0.35,
          trigger: cachedCase.caseKind.toUpperCase()
        },
        archetype: {
          archetype_primary: "Sovereign",
          archetype_role: "decision"
        }
      });
      if (priority === 1) {
        input.actions.edges.push(
          edge(
            `edge:${claimId}:triggers:${id}`,
            "TRIGGERS",
            claimId,
            id,
            input.generatedAt,
            [claimId],
            cachedCase.score
          )
        );
      }
      input.actions.edges.push(
        edge(
          `edge:${cachedCase.id}:recommends:${id}`,
          "RECOMMENDS",
          cachedCase.id,
          id,
          input.generatedAt,
          [cachedCase.id],
          priority === 1 ? cachedCase.score : 0.35
        )
      );
    }
  }
}

function realCaseContext(
  reviewWindowStart: string,
  reviewWindowEnd: string,
  label: string
): Record<string, unknown> {
  return {
    watch_box_id: WATCH_CONTEXT.ruleAoiId,
    generated_aoi_id: HORMUZ_AOI.id,
    watch_box_name: WATCH_CONTEXT.watchBoxName,
    primary_real_signal: WATCH_CONTEXT.sourceLabel,
    review_window_label: label,
    review_window_start: reviewWindowStart,
    review_window_end: reviewWindowEnd,
    scope_note: WATCH_CONTEXT.scopeNote
  };
}

function reviewWindowLabel(startIso: string, endIso: string): string {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return WATCH_CONTEXT.sourceLabel;
  const minutes = Math.max(0, Math.round((end - start) / 60_000));
  if (minutes < 60) return `${minutes} minute AIS gap window`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)} hour AIS gap window`;
  return `${shortDate(start)} to ${shortDate(end)} AIS gap window`;
}

function loadCachedOsintCases(
  liveCacheDir: URL,
  maritimeDir: URL
): {
  cases: CachedOsintCase[];
  statuses: RealProviderStatus[];
  contextEvidence: HormuzEvidenceItem[];
} {
  const danti = loadDantiDocuments(liveCacheDir);
  const contextEvidence = loadRealContextEvidence(maritimeDir);
  const statuses: RealProviderStatus[] = [
    ...danti.statuses,
    {
      source: "HORMUZ_NORMALIZED_EVIDENCE",
      status: contextEvidence.length > 0 ? "available" : "unavailable",
      detail:
        contextEvidence.length > 0
          ? `${contextEvidence.length} cached normalized evidence items available`
          : "No cached normalized Hormuz evidence items available",
      fileName: "hormuz-evidence-items.json",
      recordCount: contextEvidence.length
    }
  ];

  return {
    cases: danti.documents.length > 0
      ? buildCachedOsintCases(danti.documents, contextEvidence)
      : [],
    statuses,
    contextEvidence
  };
}

function buildCachedOsintCases(
  docs: DantiDocument[],
  contextEvidence: HormuzEvidenceItem[]
): CachedOsintCase[] {
  const cases: CachedOsintCase[] = [];
  const evidenceById = new Map(contextEvidence.map((item) => [item.id, item]));
  const sdnSummary = evidenceById.get("ev:hormuz:synthesis:live-sdn-coordinates");
  const routingSummary = evidenceById.get("ev:hormuz:synthesis:grey-market-routing");
  const roshakSummary = evidenceById.get("ev:hormuz:synthesis:roshak-spoofing-signal");

  const sanctionedSignals = SANCTIONED_FLEET_NAMES
    .map((name) => latestDantiByName(docs, name))
    .filter((doc): doc is DantiDocument => Boolean(doc))
    .map((doc) => dantiSignal({
      doc,
      idPrefix: "anom:real:hormuz:sdn-live-fleet",
      signalKind: "CACHED_DANTI_SANCTIONED_COORDINATE",
      score: 0.88,
      title: `${dantiSnapshot(doc).name} cached coordinate watchlist hit`,
      summary: `${dantiSnapshot(doc).name} (${identityLabel(dantiSnapshot(doc))}) appears in the cached DANTI/MarineTraffic ship pull with coordinates inside the Hormuz review area.`
    }));
  if (sanctionedSignals.length > 0) {
    cases.push({
      id: "case:real:hormuz:sdn-live-fleet",
      title: "Cached sanctioned-fleet coordinate watch",
      stage: "cached_sdn_coordinate_case",
      caseKind: "sanctioned_fleet",
      primarySignal: "Cached DANTI/MarineTraffic coordinates + normalized OFAC/NITC/IRISL synthesis",
      score: 0.88,
      leadSummary:
        sdnSummary?.summary ??
        "Cached DANTI/MarineTraffic rows identify Iranian-linked watchlist vessels with coordinates in the Hormuz source window.",
      keyFindings: [
        `${sanctionedSignals.length} named cached DANTI rows are mapped as individual alerts; missing rows are skipped rather than fabricated.`,
        "The case preserves identity/source custody and recommends corroboration before any behavior or intent assertion.",
        "Named examples include ADRIAN DARYA, HAMOUNA, AZARGOUN, KASHAN, SHAYAN 1, MATIN, KAMINEH, and DARYABAR."
      ],
      sourceMix: ["DANTI/MarineTraffic", "OFAC/OpenSanctions", "Treasury", "MARAD"],
      onlineBackfill: [
        {
          label: "OFAC maritime baseline",
          summary:
            "OFAC's Sanctions List Service is the authoritative source for SDN maritime vessels and aircraft; this supports sanctions-list custody without implying behavior.",
          source: "OFAC Sanctions List Service",
          url: "https://ofac.treasury.gov/sanctions-list-service",
          captured_at: "2026-05-03",
          relevance: "entity-risk enrichment"
        },
        {
          label: "Iran-linked tanker precedent",
          summary:
            "Treasury's Adrian Darya 1 action describes Iranian oil tankers as sanctions-relevant when used to mask and sell oil illicitly, so coordinate hits should trigger corroboration rather than intent assertion.",
          source: "U.S. Treasury press release sm765",
          url: "https://home.treasury.gov/news/press-releases/sm765",
          captured_at: "2026-05-03",
          relevance: "sanctioned-fleet review posture"
        }
      ],
      hypotheses: [
        {
          title: "Sanctioned fleet presence requires collection-first review",
          hypothesisKind: "SANCTIONED_FLEET_COORDINATE_REVIEW",
          posterior: 0.88,
          summary:
            "Cached DANTI rows place named Iranian-linked watchlist vessels in the Hormuz source window; the result supports a custody case and collection tasking."
        },
        {
          title: "Stale coordinate cache or stale sanctions join",
          hypothesisKind: "STALE_SOURCE_JOIN",
          posterior: 0.08,
          summary:
            "The rows could reflect stale DANTI coordinates or a stale watchlist join, so the system preserves the source-quality alternative."
        },
        {
          title: "Name collision without positive hull custody",
          hypothesisKind: "NAME_COLLISION_OR_HULL_AMBIGUITY",
          posterior: 0.04,
          summary:
            "A name-only collision remains possible where IMO/MMSI corroboration is missing; this is why SAR/RF is recommended."
        }
      ],
      features: {
        cached_sanctioned_coordinate_alerts: sanctionedSignals.length,
        normalized_synthesis_evidence_id: sdnSummary?.id ?? null
      },
      signals: sanctionedSignals
    });
  }

  const qeshmDocs = uniqueLatestByVessel(
    docs.filter((doc) => isQeshmStationarySignal(dantiSnapshot(doc)))
  );
  const bandarDocs = uniqueLatestByVessel(
    docs.filter((doc) => isBandarAbbasAnchorageSignal(dantiSnapshot(doc)))
  );
  const loiteringSignals = [
    clusterSignal({
      id: "anom:real:hormuz:loitering:qeshm",
      title: "Qeshm stationary cluster in cached DANTI pull",
      signalKind: "CACHED_DANTI_LOITERING_CLUSTER",
      score: 0.84,
      docs: qeshmDocs,
      center: { lat: 26.97, lon: 55.75 },
      summary: `${qeshmDocs.length} unique cached DANTI vessels are stationary near Qeshm around 26.97N, 55.75E.`
    }),
    clusterSignal({
      id: "anom:real:hormuz:loitering:bandar-abbas",
      title: "Bandar Abbas anchorage density cluster in cached DANTI pull",
      signalKind: "CACHED_DANTI_ANCHORAGE_CLUSTER",
      score: 0.83,
      docs: bandarDocs,
      center: { lat: 27.05, lon: 56.28 },
      summary: `${bandarDocs.length} unique cached DANTI vessels reference Bandar Abbas anchorage or adjacent anchorage routing.`
    })
  ].filter((signal) => Number(signal.attributes?.cluster_count) > 0);
  if (loiteringSignals.length > 0) {
    cases.push({
      id: "case:real:hormuz:loitering-clusters",
      title: "Cached Qeshm and Bandar Abbas loitering clusters",
      stage: "cached_loitering_cluster_case",
      caseKind: "loitering_clusters",
      primarySignal: "Cached DANTI/MarineTraffic stationary and anchorage rows",
      score: 0.84,
      leadSummary:
        "Cached DANTI/MarineTraffic rows show stationary or anchorage-density clusters near Qeshm and Bandar Abbas; the case opens collection review without inferring intent.",
      keyFindings: [
        `${qeshmDocs.length} unique vessels are stationary near Qeshm in the cached pull.`,
        `${bandarDocs.length} unique vessels reference Bandar Abbas anchorage or adjacent anchorage routing in the cached pull.`,
        "The alert rows are cluster-level because the leverage is the density pattern, not a single hull."
      ],
      sourceMix: ["DANTI/MarineTraffic", "IEA", "EIA", "MARAD"],
      onlineBackfill: [
        {
          label: "Chokepoint geometry",
          summary:
            "IEA identifies Hormuz as a 29-nautical-mile chokepoint with two 2-mile navigable channels, so anchorage density near the lanes materially affects custody and collection planning.",
          source: "IEA Strait of Hormuz factsheet",
          url: "https://www.iea.org/about/oil-security-and-emergency-response/strait-of-hormuz",
          captured_at: "2026-05-03",
          relevance: "traffic-density interpretation"
        },
        {
          label: "High-risk operating environment",
          summary:
            "MARAD advisory 2026-004 says commercial vessels in the Persian Gulf, Strait of Hormuz, and Gulf of Oman face high attack risk and degraded positional integrity.",
          source: "MARAD MSCI 2026-004",
          url: "https://www.maritime.dot.gov/msci/2026-004-persian-gulf-strait-hormuz-and-gulf-oman-iranian-attacks-commercial-vessels",
          captured_at: "2026-05-03",
          relevance: "collection priority"
        }
      ],
      hypotheses: [
        {
          title: "Anchorage-density pattern requires collection review",
          hypothesisKind: "ANCHORAGE_DENSITY_COLLECTION_REVIEW",
          posterior: 0.84,
          summary:
            "Qeshm and Bandar Abbas clusters create a custody-prioritization problem because density makes AIS-only association fragile."
        },
        {
          title: "Normal congestion or port-cycle staging",
          hypothesisKind: "NORMAL_PORT_CONGESTION",
          posterior: 0.11,
          summary:
            "The same density can arise from normal anchorage behavior; the case should not infer evasion without independent corroboration."
        },
        {
          title: "AIS reception artifact near dense shipping lanes",
          hypothesisKind: "AIS_RECEPTION_ARTIFACT",
          posterior: 0.05,
          summary:
            "High vessel density can create signal interference, so source integrity remains a live alternative until SAR/RF collection resolves it."
        }
      ],
      features: {
        qeshm_stationary_vessels: qeshmDocs.length,
        bandar_abbas_anchorage_vessels: bandarDocs.length
      },
      signals: loiteringSignals
    });
  }

  const foreignSignals = FOREIGN_IRAN_LAST_PORT_NAMES
    .map((name) => latestDantiByName(docs, name))
    .filter((doc): doc is DantiDocument => Boolean(doc))
    .map((doc) => dantiSignal({
      doc,
      idPrefix: "anom:real:hormuz:iran-last-port",
      signalKind: "CACHED_DANTI_FOREIGN_FLAG_IRAN_LAST_PORT",
      score: 0.81,
      title: `${dantiSnapshot(doc).name} foreign flag with Iranian last port`,
      summary: `${dantiSnapshot(doc).name} (${identityLabel(dantiSnapshot(doc))}) is foreign-flagged in the cached DANTI row and lists Iranian last_port ${dantiSnapshot(doc).lastPort ?? "unknown"}.`
    }));
  if (foreignSignals.length > 0) {
    cases.push({
      id: "case:real:hormuz:iran-last-port-laundering",
      title: "Cached foreign-flag Iranian last-port pattern",
      stage: "cached_iran_last_port_case",
      caseKind: "iran_last_port_laundering",
      primarySignal: "Cached DANTI/MarineTraffic foreign-flag rows with Iranian last_port",
      score: 0.81,
      leadSummary:
        "Six named foreign-flag cached DANTI rows carry Iranian last_port values, a sanctions-laundering review signal that remains bounded to routing/source custody.",
      keyFindings: [
        `${foreignSignals.length} named vessels are mapped as individual alerts: ${foreignSignals.map((signal) => signal.danti?.name).filter(Boolean).join(", ")}.`,
        "The case treats flag/last-port mismatch as a laundering indicator, not proof of cargo origin or intent."
      ],
      sourceMix: ["DANTI/MarineTraffic", "OFAC", "MARAD"],
      onlineBackfill: [
        {
          label: "Deceptive shipping practice context",
          summary:
            "The 2020 OFAC/State/Coast Guard maritime advisory frames Iran-focused shipping deception as a sanctions-evasion risk class, making last-port and flag inconsistencies useful but bounded indicators.",
          source: "OFAC maritime sanctions-evasion guidance",
          url: "https://ofac.treasury.gov/recent-actions/20200514",
          captured_at: "2026-05-03",
          relevance: "routing/source-risk interpretation"
        },
        {
          label: "Regional misidentification risk",
          summary:
            "MARAD's Hormuz advisory emphasizes identifying and differentiating threats; this supports a review posture instead of treating a last-port mismatch as proof of cargo origin.",
          source: "MARAD MSCI 2026-004",
          url: "https://www.maritime.dot.gov/msci/2026-004-persian-gulf-strait-hormuz-and-gulf-oman-iranian-attacks-commercial-vessels",
          captured_at: "2026-05-03",
          relevance: "guardrail against overclaiming"
        }
      ],
      hypotheses: [
        {
          title: "Foreign-flag Iranian last-port pattern is laundering-relevant",
          hypothesisKind: "FOREIGN_FLAG_IRAN_LAST_PORT_REVIEW",
          posterior: 0.81,
          summary:
            "Foreign flags paired with Iranian last-port values create a sanctions-laundering review signal that merits collection and registry cross-checks."
        },
        {
          title: "Benign bunkering or port-call sequence",
          hypothesisKind: "BENIGN_PORT_CALL_SEQUENCE",
          posterior: 0.13,
          summary:
            "A foreign flag with an Iranian last port can be legitimate bunkering, repair, or passage; cargo origin is not established."
        },
        {
          title: "Stale DANTI port metadata",
          hypothesisKind: "STALE_PORT_METADATA",
          posterior: 0.06,
          summary:
            "Cached last-port fields can lag real vessel movement, so the source-state alternative remains preserved."
        }
      ],
      features: {
        foreign_flag_iran_last_port_alerts: foreignSignals.length
      },
      signals: foreignSignals
    });
  }

  const orderDocs = uniqueByDocumentId(docs.filter((doc) => isOrderDestinationSignal(dantiSnapshot(doc).destination)));
  const orderSignals = orderDocs.map((doc) => {
    const snapshot = dantiSnapshot(doc);
    return dantiSignal({
      doc,
      idKey: sha(doc.documentId).slice(0, 12),
      idPrefix: "anom:real:hormuz:grey-market-order",
      signalKind: "CACHED_DANTI_GREY_MARKET_DESTINATION",
      score: 0.68,
      title: `${snapshot.name} grey-market destination string`,
      summary: `${snapshot.name} (${identityLabel(snapshot)}) carries cached destination "${snapshot.destination ?? "unknown"}".`
    });
  });
  const chinaSignals = CHINA_ROUTING_NAMES
    .map((name) => latestDantiByName(docs, name))
    .filter((doc): doc is DantiDocument => Boolean(doc))
    .map((doc) => dantiSignal({
      doc,
      idPrefix: "anom:real:hormuz:china-routing",
      signalKind: "CACHED_DANTI_CHINA_ROUTING",
      score: 0.78,
      title: `${dantiSnapshot(doc).name} China-routing evidence`,
      summary: `${dantiSnapshot(doc).name} (${identityLabel(dantiSnapshot(doc))}) carries cached China-routing context via last_port/destination ${[dantiSnapshot(doc).lastPort, dantiSnapshot(doc).destination].filter(Boolean).join(" / ")}.`
    }));
  const routingSignals = [...orderSignals, ...chinaSignals];
  if (routingSignals.length > 0) {
    cases.push({
      id: "case:real:hormuz:grey-market-china-routing",
      title: "Cached grey-market and China-routing indicators",
      stage: "cached_grey_market_routing_case",
      caseKind: "grey_market_china_routing",
      primarySignal: "Cached DANTI destination and last_port strings",
      score: 0.78,
      leadSummary:
        routingSummary?.summary ??
        "Cached DANTI destination and last_port strings show order/China-routing indicators across the Hormuz pull.",
      keyFindings: [
        `${orderSignals.length} unique cached DANTI documents contain TO ORDER / FOR ORDER / CHINA OWNER-style destination strings.`,
        "HAMOUNA and DARYABAR are retained as separate China-routing alerts because their cached last_port values are ZHUHAI and CJK.",
        "Routing strings are treated as grey-market indicators requiring review, not cargo or ownership proof."
      ],
      sourceMix: ["DANTI/MarineTraffic", "EIA", "IEA", "OFAC"],
      onlineBackfill: [
        {
          label: "Asia-bound flow context",
          summary:
            "EIA estimates that 84% of Hormuz crude/condensate and 83% of LNG moved to Asian markets in 2024, which makes China-routing strings operationally relevant but not dispositive.",
          source: "EIA Today in Energy, June 16 2025",
          url: "https://www.eia.gov/todayinenergy/detail.php?id=65504",
          captured_at: "2026-05-03",
          relevance: "routing baseline"
        },
        {
          label: "Sanctions-evasion guardrail",
          summary:
            "OFAC's maritime advisory treats deceptive shipping as a risk pattern; destination strings are therefore indicators for review, not evidence of ownership or intent.",
          source: "OFAC maritime sanctions-evasion guidance",
          url: "https://ofac.treasury.gov/recent-actions/20200514",
          captured_at: "2026-05-03",
          relevance: "grey-market interpretation"
        }
      ],
      hypotheses: [
        {
          title: "Order and China-routing strings indicate grey-market review",
          hypothesisKind: "GREY_MARKET_ROUTING_REVIEW",
          posterior: 0.78,
          summary:
            "Repeated FOR ORDER / TO ORDER / China-routing strings across cached rows support a routing-risk case and collection-first posture."
        },
        {
          title: "Normal commercial destination ambiguity",
          hypothesisKind: "NORMAL_COMMERCIAL_ORDER_DESTINATION",
          posterior: 0.16,
          summary:
            "FOR ORDER is also a normal tanker-market placeholder, so the pattern cannot establish sanctioned cargo by itself."
        },
        {
          title: "Duplicated destination rows inflate apparent volume",
          hypothesisKind: "DUPLICATED_CACHED_ROWS",
          posterior: 0.06,
          summary:
            "Repeated cached rows may overstate the number of distinct operational signals; vessel-level de-duplication remains required."
        }
      ],
      features: {
        grey_market_destination_alerts: orderSignals.length,
        china_routing_alerts: chinaSignals.length,
        normalized_synthesis_evidence_id: routingSummary?.id ?? null
      },
      signals: routingSignals
    });
  }

  const roshakDoc = latestDantiByName(docs, "ROSHAK");
  if (roshakDoc) {
    const snapshot = dantiSnapshot(roshakDoc);
    const roshakSignal = dantiSignal({
      doc: roshakDoc,
      idPrefix: "anom:real:hormuz:signal-integrity",
      signalKind: "CACHED_DANTI_IMPLAUSIBLE_SPEED",
      score: 0.86,
      title: "ROSHAK reports physically implausible speed",
      summary:
        roshakSummary?.summary ??
        `ROSHAK (${identityLabel(snapshot)}) reports speed=${snapshot.speedKn ?? "unknown"} kt in the cached DANTI row, a signal-integrity review indicator.`
    });
    cases.push({
      id: "case:real:hormuz:roshak-signal-integrity",
      title: "Cached ROSHAK signal-integrity review",
      stage: "cached_signal_integrity_case",
      caseKind: "signal_integrity",
      primarySignal: "Cached DANTI/MarineTraffic implausible speed row",
      score: 0.86,
      leadSummary:
        "ROSHAK reports a physically implausible speed in the cached DANTI/MarineTraffic pull; the case is limited to AIS/data-quality review.",
      keyFindings: [
        `Cached speed is ${snapshot.speedKn ?? "unknown"} kt for ${snapshot.name}, above the configured plausibility threshold.`,
        "The finding is treated as spoofing/data-quality evidence, not a movement or intent claim."
      ],
      sourceMix: ["DANTI/MarineTraffic", "MARAD", "IMO", "GFW"],
      onlineBackfill: [
        {
          label: "AIS spoofing caveat",
          summary:
            "MARAD advisory 2023-005 says AIS is open, unencrypted, and unprotected, so fake or missing AIS data is a known maritime signal-integrity problem.",
          source: "MARAD MSCI 2023-005",
          url: "https://www.maritime.dot.gov/msci/2023-005-various-gps-interference-ais-spoofing",
          captured_at: "2026-05-03",
          relevance: "signal-integrity refusal"
        },
        {
          label: "AIS carriage baseline",
          summary:
            "IMO states ships fitted with AIS should keep it operating except where rules protect navigational information, making implausible AIS reports reviewable but not automatically hostile.",
          source: "IMO AIS transponders",
          url: "https://www.imo.org/en/ourwork/safety/pages/ais.aspx",
          captured_at: "2026-05-03",
          relevance: "AIS-data-quality baseline"
        }
      ],
      hypotheses: [
        {
          title: "ROSHAK AIS row is a signal-integrity anomaly",
          hypothesisKind: "AIS_SIGNAL_INTEGRITY_ANOMALY",
          posterior: 0.86,
          summary:
            "A 31 kt cached speed is implausible enough to open an AIS integrity review and route to collection."
        },
        {
          title: "Parser or unit-conversion artifact",
          hypothesisKind: "PARSER_OR_UNIT_ARTIFACT",
          posterior: 0.09,
          summary:
            "The speed could be a source parser, units, or stale-field artifact; corroboration must precede any movement claim."
        },
        {
          title: "High-speed tow or emergency maneuver",
          hypothesisKind: "RARE_OPERATIONAL_EXCEPTION",
          posterior: 0.05,
          summary:
            "A rare operational exception remains possible, but it is weak without independent position and class corroboration."
        }
      ],
      features: {
        implausible_speed_kn: snapshot.speedKn,
        normalized_synthesis_evidence_id: roshakSummary?.id ?? null
      },
      signals: [roshakSignal]
    });
  }

  return cases;
}

function defaultCachedHypotheses(cachedCase: CachedOsintCase): CachedHypothesis[] {
  return [
    {
      title: `${cachedCase.title} requires collection-first review`,
      hypothesisKind: "CACHED_OSINT_REQUIRES_COLLECTION_REVIEW",
      posterior: cachedCase.score,
      summary:
        "Cached OSINT rows support a review case, but behavior and intent remain bounded by source provenance."
    },
    {
      title: "Cached source staleness explains the pattern",
      hypothesisKind: "CACHED_SOURCE_STALENESS",
      posterior: 0.1,
      summary:
        "The source rows may be stale or duplicated, so the system preserves the non-operational explanation."
    },
    {
      title: "False-positive source join",
      hypothesisKind: "FALSE_POSITIVE_SOURCE_JOIN",
      posterior: 0.05,
      summary:
        "A name, port, or identifier join may be wrong until an independent source confirms the signal."
    }
  ];
}

function loadDantiDocuments(liveCacheDir: URL): {
  documents: DantiDocument[];
  statuses: RealProviderStatus[];
} {
  const documents: DantiDocument[] = [];
  const statuses: RealProviderStatus[] = [];
  for (const fileName of DANTI_SOURCE_FILES) {
    const file = readCacheJson(liveCacheDir, fileName);
    if (!file.exists) {
      statuses.push({
        source: "DANTI_MARINETRAFFIC",
        status: "unavailable",
        detail: `${fileName} missing from cached OSINT inputs`,
        fileName
      });
      continue;
    }

    const before = documents.length;
    documents.push(...normalizeDantiFile(file.json, fileName, file.sha256));
    statuses.push({
      source: "DANTI_MARINETRAFFIC",
      status: documents.length > before ? "available" : "unavailable",
      detail: `${documents.length - before} cached DANTI ship records normalized from ${fileName}`,
      fileName,
      generatedAt:
        stringValue(file.json.collected_at) ??
        stringValue(file.json.generated_at) ??
        null,
      recordCount: documents.length - before
    });
  }
  return { documents, statuses };
}

function normalizeDantiFile(
  json: Record<string, unknown>,
  sourceFile: string,
  sourceSha256: string
): DantiDocument[] {
  const out: DantiDocument[] = [];
  const topDocs = arrayValue(json.documents);
  topDocs.forEach((value, index) => {
    const doc = normalizeDantiDocument(value, sourceFile, sourceSha256, `$.documents[${index}]`);
    if (doc) out.push(doc);
  });

  const body = recordValue(json.body);
  const categories = arrayValue(body.resultDocuments);
  categories.forEach((categoryValue, categoryIndex) => {
    const category = recordValue(categoryValue);
    if (stringValue(category.category) !== "SHIP") return;
    arrayValue(category.documents).forEach((value, index) => {
      const doc = normalizeDantiDocument(
        value,
        sourceFile,
        sourceSha256,
        `$.body.resultDocuments[${categoryIndex}].documents[${index}]`
      );
      if (doc) out.push(doc);
    });
  });
  return out;
}

function normalizeDantiDocument(
  value: unknown,
  sourceFile: string,
  sourceSha256: string,
  sourcePointer: string
): DantiDocument | null {
  const raw = recordValue(value);
  const properties = recordValue(raw.properties);
  const documentId = stringValue(raw.documentId) ?? stringValue(properties._dId);
  const authoredOn =
    stringValue(raw.authoredOn) ??
    stringValue(properties.datetime) ??
    stringValue(properties._dTimeOfIngest);
  if (!documentId || !stringValue(properties.ship_name)) return null;
  return {
    documentId,
    authoredOn,
    sourceFile: `fixtures/maritime/live-cache/${sourceFile}`,
    sourceSha256,
    sourcePointer,
    geometry: recordValue(raw.geometry),
    properties
  };
}

function dantiSignal(input: {
  doc: DantiDocument;
  idPrefix: string;
  idKey?: string;
  signalKind: string;
  score: number;
  title: string;
  summary: string;
}): CachedOsintSignal {
  const snapshot = dantiSnapshot(input.doc);
  const stableKey = input.idKey ?? slug(snapshot.imo ?? snapshot.mmsi ?? snapshot.name);
  return {
    id: `${input.idPrefix}:${stableKey}`,
    title: input.title,
    summary: input.summary,
    detectedAt: snapshot.observedAt,
    score: input.score,
    signalKind: input.signalKind,
    sourceFile: input.doc.sourceFile,
    sourcePointer: input.doc.sourcePointer,
    sourceProvider: "DANTI / MarineTraffic cached ship pull",
    sourceSha256: input.doc.sourceSha256,
    danti: snapshot
  };
}

function clusterSignal(input: {
  id: string;
  title: string;
  signalKind: string;
  score: number;
  docs: DantiDocument[];
  center: { lat: number; lon: number };
  summary: string;
}): CachedOsintSignal {
  const first = input.docs[0];
  const timestamps = input.docs
    .map((doc) => dantiSnapshot(doc).observedAt)
    .filter((value) => Number.isFinite(Date.parse(value)));
  const detectedAt = timestamps.sort()[timestamps.length - 1] ?? new Date(0).toISOString();
  return {
    id: input.id,
    title: input.title,
    summary: input.summary,
    detectedAt,
    score: input.score,
    signalKind: input.signalKind,
    sourceFile: first?.sourceFile ?? "fixtures/maritime/live-cache/danti-hormuz-ship-all-paginated.json",
    sourcePointer: "$.documents[?(@.properties.current_port || @.properties.last_port)]",
    sourceProvider: "DANTI / MarineTraffic cached ship pull",
    sourceSha256: first?.sourceSha256,
    attributes: {
      cluster_count: input.docs.length,
      cluster_center_lat: input.center.lat,
      cluster_center_lon: input.center.lon,
      cluster_vessels: input.docs.map((doc) => {
        const snapshot = dantiSnapshot(doc);
        return compactRecord({
          name: snapshot.name,
          imo: snapshot.imo,
          mmsi: snapshot.mmsi,
          flag: snapshot.flag,
          lat: snapshot.lat,
          lon: snapshot.lon,
          speed_kn: snapshot.speedKn,
          current_port: snapshot.currentPort,
          last_port: snapshot.lastPort
        });
      })
    }
  };
}

function dantiSnapshot(doc: DantiDocument): DantiVesselSnapshot {
  const p = doc.properties;
  const coords = Array.isArray(doc.geometry.coordinates) ? doc.geometry.coordinates : [];
  const observedAt =
    doc.authoredOn ??
    stringValue(p.datetime) ??
    stringValue(p._dTimeOfIngest) ??
    new Date(0).toISOString();
  return {
    name: normalizeName(stringValue(p.ship_name) ?? "UNKNOWN"),
    imo: nullableString(p.imo),
    mmsi: nullableString(p.mmsi),
    flag: nullableString(p.flag),
    shipType: nullableString(p.type_name) ?? nullableString(p.ship_type),
    status: nullableString(p.status),
    currentPort: nullableString(p.current_port),
    lastPort: nullableString(p.last_port),
    destination: nullableString(p.destination),
    lat: finiteNumberValue(p.latitude) ?? finiteNumberValue(coords[1]),
    lon: finiteNumberValue(p.longitude) ?? finiteNumberValue(coords[0]),
    speedKn: finiteNumberValue(p.speed),
    courseDeg: finiteNumberValue(p.course),
    observedAt
  };
}

function latestDantiByName(docs: DantiDocument[], name: string): DantiDocument | null {
  const normalized = normalizeName(name);
  return choosePreferredDantiDoc(
    docs.filter((doc) => dantiSnapshot(doc).name === normalized)
  );
}

function uniqueByDocumentId(docs: DantiDocument[]): DantiDocument[] {
  const byId = new Map<string, DantiDocument>();
  for (const doc of docs) {
    const previous = byId.get(doc.documentId);
    const preferred = choosePreferredDantiDoc([previous, doc].filter(Boolean) as DantiDocument[]);
    if (preferred) byId.set(doc.documentId, preferred);
  }
  return [...byId.values()].sort(compareDantiForDisplay);
}

function uniqueLatestByVessel(docs: DantiDocument[]): DantiDocument[] {
  const byVessel = new Map<string, DantiDocument>();
  for (const doc of docs) {
    const snapshot = dantiSnapshot(doc);
    const key = snapshot.imo && snapshot.imo !== "0"
      ? `imo:${snapshot.imo}`
      : snapshot.mmsi
      ? `mmsi:${snapshot.mmsi}`
      : `name:${snapshot.name}`;
    const previous = byVessel.get(key);
    const preferred = choosePreferredDantiDoc([previous, doc].filter(Boolean) as DantiDocument[]);
    if (preferred) byVessel.set(key, preferred);
  }
  return [...byVessel.values()].sort(compareDantiForDisplay);
}

function choosePreferredDantiDoc(docs: DantiDocument[]): DantiDocument | null {
  if (docs.length === 0) return null;
  return [...docs].sort((left, right) => compareDantiPreference(right, left))[0] ?? null;
}

function compareDantiPreference(left: DantiDocument, right: DantiDocument): number {
  const leftTime = Date.parse(dantiSnapshot(left).observedAt);
  const rightTime = Date.parse(dantiSnapshot(right).observedAt);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return sourcePriority(left.sourceFile) - sourcePriority(right.sourceFile);
}

function compareDantiForDisplay(left: DantiDocument, right: DantiDocument): number {
  const leftSnapshot = dantiSnapshot(left);
  const rightSnapshot = dantiSnapshot(right);
  return (
    leftSnapshot.name.localeCompare(rightSnapshot.name) ||
    (leftSnapshot.imo ?? "").localeCompare(rightSnapshot.imo ?? "") ||
    left.documentId.localeCompare(right.documentId)
  );
}

function sourcePriority(sourceFile: string): number {
  if (sourceFile.endsWith("danti-hormuz-ship-all-paginated.json")) return 3;
  if (sourceFile.endsWith("danti-hormuz-ship-best-size-1000.json")) return 2;
  if (sourceFile.endsWith("danti-hormuz-all-size-1000.json")) return 1;
  return 0;
}

function isQeshmStationarySignal(snapshot: DantiVesselSnapshot): boolean {
  if (snapshot.lat === null || snapshot.lon === null || snapshot.speedKn === null) return false;
  return (
    Math.abs(snapshot.lat - 26.97) <= 0.08 &&
    Math.abs(snapshot.lon - 55.75) <= 0.12 &&
    snapshot.speedKn <= 0.5
  );
}

function isBandarAbbasAnchorageSignal(snapshot: DantiVesselSnapshot): boolean {
  const text = normalizeName(
    [snapshot.currentPort, snapshot.lastPort, snapshot.destination].filter(Boolean).join(" ")
  );
  return text.includes("BANDAR ABBAS ANCH");
}

function isOrderDestinationSignal(destination: string | null): boolean {
  return /\b(TO ORDER|FOR ORDER|FOR ORDERS|ORDER|CHINA OWNER)\b/i.test(destination ?? "");
}

function sourceWindowForSignals(signals: CachedOsintSignal[]): {
  start: string;
  end: string;
  label: string;
} {
  const times = signals
    .map((signal) => Date.parse(signal.detectedAt))
    .filter((value) => Number.isFinite(value));
  if (times.length === 0) {
    const fallback = new Date(0).toISOString();
    return { start: fallback, end: fallback, label: "cached OSINT source window" };
  }
  const min = Math.min(...times);
  const max = Math.max(...times);
  return {
    start: new Date(min).toISOString(),
    end: new Date(max).toISOString(),
    label: `${shortDate(min)} to ${shortDate(max)} cached OSINT source window`
  };
}

function identityLabel(snapshot: DantiVesselSnapshot): string {
  if (snapshot.imo) return `IMO ${snapshot.imo}`;
  if (snapshot.mmsi) return `MMSI ${snapshot.mmsi}`;
  return "no IMO/MMSI";
}

function compactRecord(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== null && value !== undefined && value !== "")
  );
}

function normalizeName(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function nullableString(value: unknown): string | null {
  const parsed = stringValue(value);
  if (!parsed || parsed === "0") return null;
  return parsed;
}

function finiteNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function slug(value: string): string {
  return normalizeName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function shortDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
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
        source_window: WATCH_CONTEXT.sourceLabel,
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
      review_window: {
        label: WATCH_CONTEXT.sourceLabel,
        scope_note: WATCH_CONTEXT.scopeNote
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
  anomalyCount: number,
  statuses: RealProviderStatus[]
): string | null {
  if (anomalyCount > 0) return null;
  if (observations.length === 0) {
    const excluded = statuses.filter((status) => status.status === "excluded_fixture_fallback");
    if (excluded.length > 0) {
      return `No real AIS observations were available for ${WATCH_CONTEXT.watchBoxName}. Fixture-mode provider fallbacks were excluded from real mode.`;
    }
    return `No real AIS observations were available for ${WATCH_CONTEXT.watchBoxName} in the current refresh window.`;
  }
  return `${WATCH_CONTEXT.watchBoxName} real AIS observations were available, but no generated dark-gap case exceeded the configured threshold.`;
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
