import { buildHormuzReplayState } from "../replay/hormuz.ts";
import type { ScenarioState } from "../replay/scenario.ts";
import {
  generateRealWatchfloor,
  type RealGenerationResult,
  type RealGenerationSummary,
  type RealProviderStatus
} from "./generator.ts";

export const REAL_SCENARIO_RUN_ID = "real:hormuz:cache";
export const REAL_TRACKS_URL = "/fixtures/maritime/real/tracks.geojson";

export interface RealScenarioState extends ScenarioState {
  mode: "real";
  seededAt: string;
  strictReal: true;
  caseGenerationStatus: "READY" | "NO_REAL_CASE";
  lastRefreshAt: string;
  emptyReason: string | null;
  sourceStatuses: RealProviderStatus[];
  tracksUrl: string;
  generationSummary: RealGenerationSummary;
}

export function getRealScenarioState(
  options: { write?: boolean } = {}
): RealScenarioState {
  return buildRealScenarioState(generateRealWatchfloor({ write: options.write }));
}

export function buildRealScenarioState(result: RealGenerationResult): RealScenarioState {
  const anomalyRows = result.anomalies.nodes
    .filter((node) => node.type === "anomaly")
    .map(nodeToScenarioProps);
  const claimRows = result.claims.nodes
    .filter((node) => node.type === "claim")
    .map(nodeToScenarioProps);
  const hypothesisRows = result.hypotheses.nodes
    .filter((node) => node.type === "hypothesis")
    .map(nodeToScenarioProps);
  const actionRows = result.actions.nodes
    .filter((node) => node.type === "actionOption")
    .map(nodeToScenarioProps);
  const trackRows = result.tracks.features
    .filter((feature) => feature.geometry.type === "LineString")
    .map((feature) => ({
      object_id: feature.id,
      objectId: feature.id,
      ...feature.properties
    }));

  return {
    mode: "real",
    scenarioRunId: REAL_SCENARIO_RUN_ID,
    seededAt: result.summary.generated_at,
    strictReal: true,
    caseGenerationStatus: anomalyRows.length > 0 ? "READY" : "NO_REAL_CASE",
    lastRefreshAt: result.summary.generated_at,
    emptyReason: result.summary.empty_reason,
    sourceStatuses: result.sourceStatus,
    tracksUrl: REAL_TRACKS_URL,
    generationSummary: result.summary,
    capabilities: { poll: true, stream: false, replay: false },
    tracks: trackRows,
    anomalies: anomalyRows,
    hypotheses: hypothesisRows,
    claims: claimRows,
    actions: actionRows,
    ranking: actionRows.map((action) => ({
      action_id: action.object_id,
      action_type: action.action_type,
      anomaly_id: action.anomaly_id,
      rank: action.rank,
      ranking_score: action.ranking_score,
      status: action.status
    })),
    perturbations: [],
    hormuzIntel: buildHormuzReplayState()
  };
}

function nodeToScenarioProps(node: Record<string, unknown>): Record<string, unknown> {
  const data = recordValue(node.data);
  const id = stringValue(node.id) ?? "unknown";
  const type = stringValue(node.type);
  const caseId = stringValue(node.case_id);
  const status = stringValue(node.status) ?? stringValue(data.status);
  const actionKind = stringValue(data.kind);
  const anomalyId = stringValue(data.anomaly_id);
  const priority = numberValue(data.defaultPriority);

  return {
    ...data,
    object_id: id,
    objectId: id,
    type,
    title: stringValue(node.title) ?? id,
    summary: stringValue(data.summary) ?? stringValue(node.title) ?? id,
    case_id: caseId,
    status,
    updated_at: stringValue(node.created_at),
    action_type: actionKind,
    anomaly_id: anomalyId,
    rank: numberValue(data.rank) ?? priority,
    ranking_score: numberValue(data.ranking_score)
  };
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
