// Loads scenario state for the watchfloor shell. Tries the live server
// first, falls back to the bundled maritime fixture pack so the demo
// always has something to render even when the Tier B server is offline.

import type {
  ActionView,
  AlertView,
  ClaimView,
  HypothesisView,
  ScenarioStateView,
  SourceStatusView
} from "./types.ts";

import anomalyFixtures from "../../../fixtures/maritime/anomalies.json" with { type: "json" };
import claimFixtures from "../../../fixtures/maritime/claims.json" with { type: "json" };
import hypothesisFixtures from "../../../fixtures/maritime/hypotheses.json" with { type: "json" };
import actionFixtures from "../../../fixtures/maritime/actions.json" with { type: "json" };
import realAnomalyFixtures from "../../../fixtures/maritime/real/anomalies.json" with { type: "json" };
import realClaimFixtures from "../../../fixtures/maritime/real/claims.json" with { type: "json" };
import realHypothesisFixtures from "../../../fixtures/maritime/real/hypotheses.json" with { type: "json" };
import realActionFixtures from "../../../fixtures/maritime/real/actions.json" with { type: "json" };
import realGenerationSummary from "../../../fixtures/maritime/real/generation-summary.json" with { type: "json" };
import realSourceStatuses from "../../../fixtures/maritime/real/source-status.json" with { type: "json" };
import { publicText } from "./presentationText.ts";

interface FixtureFile {
  nodes?: FixtureNode[];
}

interface FixtureNode {
  id: string;
  type?: string;
  title?: string;
  case_id?: string;
  status?: string;
  created_at?: string;
  data?: Record<string, unknown>;
}

// Default to the real-cache path. The pitched demo runs against the OSINT-
// derived Hormuz dataset (HUGE identity case + sanctioned fleet + loitering
// clusters + Iran last-port). The synthetic alara-01 fixture is reachable
// only by explicit override (VITE_WATCHFLOOR_MODE=demo) and is NOT what
// judges or video-submission viewers should land on.
const WATCHFLOOR_MODE =
  ((import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_WATCHFLOOR_MODE) ?? "real";
const SERVER_PATH = `/scenario/state?mode=${WATCHFLOOR_MODE}`;
const FETCH_TIMEOUT_MS = 1500;

if (typeof console !== "undefined") {
  console.info(
    `[liminal-custody] watchfloor mode = "${WATCHFLOOR_MODE}" ` +
      (WATCHFLOOR_MODE === "real"
        ? "(OSINT-derived Hormuz dataset — pitched demo view)"
        : "(synthetic alara-01 fixture — override; not the pitched view)")
  );
}

export interface LoadedScenario {
  source: "server" | "fallback";
  state: ScenarioStateView;
  loadedAt: string;
  warning?: string;
}

export async function loadScenario(): Promise<LoadedScenario> {
  const fallback =
    WATCHFLOOR_MODE === "real" ? buildRealFallbackState() : buildDemoFallbackState();
  if (typeof fetch !== "function") {
    return fallbackResult(fallback, "fetch unavailable in runtime");
  }

  try {
    const response = await fetchWithTimeout(SERVER_PATH, FETCH_TIMEOUT_MS);
    if (!response.ok) {
      return fallbackResult(fallback, `server responded ${response.status}`);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    return {
      source: "server",
      state: projectServerState(payload, fallback),
      loadedAt: new Date().toISOString()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return fallbackResult(fallback, `fetch failed: ${message}`);
  }
}

export async function refreshRealScenario(): Promise<void> {
  if (typeof fetch !== "function") return;
  const response = await fetchWithTimeout("/real/refresh", 5000, { method: "POST" });
  if (!response.ok) {
    throw new Error(`real refresh responded ${response.status}`);
  }
}

function fallbackResult(state: ScenarioStateView, warning: string): LoadedScenario {
  return {
    source: "fallback",
    state,
    loadedAt: new Date().toISOString(),
    warning
  };
}

async function fetchWithTimeout(
  path: string,
  timeoutMs: number,
  init: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(path, {
      ...init,
      signal: controller.signal,
      headers: { accept: "application/json", ...init.headers }
    });
  } finally {
    clearTimeout(timer);
  }
}

export function projectServerState(
  raw: Record<string, unknown>,
  fallback: ScenarioStateView
): ScenarioStateView {
  const anomalies = asArray(raw.anomalies);
  const hypotheses = asArray(raw.hypotheses);
  const claims = asArray(raw.claims);
  const actions = asArray(raw.actions);
  const sourceStatuses = asArray(raw.sourceStatuses).map(toSourceStatusView);
  const mode = raw.mode === "real" ? "real" : "demo";
  const serverHasRows = anomalies.length > 0;
  const useFallbackRows = !serverHasRows && fallback.alerts.length > 0;

  return {
    scenarioRunId: typeof raw.scenarioRunId === "string" ? raw.scenarioRunId : fallback.scenarioRunId,
    seededAt: typeof raw.seededAt === "string" ? raw.seededAt : fallback.seededAt,
    mode,
    strictReal: raw.strictReal === true,
    caseGenerationStatus:
      useFallbackRows
        ? "READY"
        : raw.caseGenerationStatus === "READY" || raw.caseGenerationStatus === "NO_REAL_CASE"
          ? raw.caseGenerationStatus
          : undefined,
    lastRefreshAt: typeof raw.lastRefreshAt === "string" ? raw.lastRefreshAt : undefined,
    emptyReason: useFallbackRows
      ? null
      : typeof raw.emptyReason === "string" ? raw.emptyReason : null,
    sourceStatuses: useFallbackRows ? fallback.sourceStatuses : sourceStatuses,
    tracksUrl: typeof raw.tracksUrl === "string" ? raw.tracksUrl : fallback.tracksUrl,
    alerts: serverHasRows ? anomalies.map(toAlertView) : useFallbackRows ? fallback.alerts : [],
    hypotheses: hypotheses.length > 0
      ? hypotheses.map(toHypothesisView)
      : useFallbackRows ? fallback.hypotheses : [],
    claims: claims.length > 0
      ? claims.map(toClaimView)
      : useFallbackRows ? fallback.claims : [],
    actions: actions.length > 0
      ? actions.map(toActionView)
      : useFallbackRows ? fallback.actions : []
  };
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function toAlertView(record: Record<string, unknown>): AlertView {
  const id = (record.object_id as string) ?? (record.objectId as string) ?? "unknown";
  return {
    id,
    caseId: (record.case_id as string) ?? (record.caseId as string) ?? undefined,
    title: publicText(
      (record.summary as string) ?? (record.title as string) ?? (record.anomaly_type as string) ?? id
    ),
    detectedAt:
      (record.detected_at as string) ??
      (record.window_end as string) ??
      (record.updated_at as string) ??
      "",
    severity: typeof record.score === "number" ? record.score : 0,
    rank: typeof record.rank === "number" ? record.rank : 99,
    status: (record.status as string) ?? "OPEN"
  };
}

function toSourceStatusView(record: Record<string, unknown>): SourceStatusView {
  return {
    source: typeof record.source === "string" ? record.source : "UNKNOWN",
    status: typeof record.status === "string" ? record.status : "unavailable",
    detail: typeof record.detail === "string" ? publicText(record.detail) : "status unavailable",
    fileName: typeof record.fileName === "string" ? record.fileName : undefined,
    generatedAt:
      typeof record.generatedAt === "string" || record.generatedAt === null
        ? record.generatedAt
        : undefined,
    recordCount: typeof record.recordCount === "number" ? record.recordCount : undefined
  };
}

function toHypothesisView(record: Record<string, unknown>): HypothesisView {
  const id = (record.object_id as string) ?? (record.objectId as string) ?? "unknown";
  return {
    id,
    label: publicText((record.hypothesis as string) ?? (record.title as string) ?? id),
    posterior: typeof record.posterior === "number" ? record.posterior : 0,
    status: (record.status as string) ?? "UNRESOLVED"
  };
}

function toClaimView(record: Record<string, unknown>): ClaimView {
  const id = (record.object_id as string) ?? (record.objectId as string) ?? "unknown";
  return {
    id,
    posterior: typeof record.posterior === "number" ? record.posterior : 0,
    status: (record.status as string) ?? "CONTESTED"
  };
}

function toActionView(record: Record<string, unknown>): ActionView {
  const id = (record.object_id as string) ?? (record.objectId as string) ?? "unknown";
  return {
    id,
    actionType: (record.action_type as string) ?? "MONITOR_ONLY",
    rank: typeof record.rank === "number" ? record.rank : 99,
    rankingScore: typeof record.ranking_score === "number" ? record.ranking_score : 0,
    status: (record.status as string) ?? "RECOMMENDED"
  };
}

function buildRealFallbackState(): ScenarioStateView {
  const summary = realGenerationSummary as Record<string, unknown>;
  const curated = buildDemoFallbackState();
  const realNodes = (realAnomalyFixtures as FixtureFile).nodes ?? [];
  const cachedCaseNodes = realNodes.filter(
    (node) => node.type === "case" && node.data?.cached_only === true
  );
  const alertNodes =
    cachedCaseNodes.length > 0
      ? cachedCaseNodes
      : realNodes.filter((node) => node.type === "anomaly");
  const cachedAlerts = alertNodes
    .map((node) => toAlertView(fixtureNodeToRecord(node)));
  const cachedHypotheses = ((realHypothesisFixtures as FixtureFile).nodes ?? [])
    .filter((node) => node.type === "hypothesis")
    .map((node) => toHypothesisView(fixtureNodeToRecord(node)));
  const cachedClaims = ((realClaimFixtures as FixtureFile).nodes ?? [])
    .filter((node) => node.type === "claim")
    .map((node) => toClaimView(fixtureNodeToRecord(node)));
  const cachedActions = ((realActionFixtures as FixtureFile).nodes ?? [])
    .filter((node) => node.type === "actionOption")
    .map((node) => toActionView(fixtureNodeToRecord(node)));
  const alerts = mergeById(curated.alerts, cachedAlerts);
  const hypotheses = mergeById(curated.hypotheses, cachedHypotheses);
  const claims = mergeById(curated.claims, cachedClaims);
  const actions = mergeById(curated.actions, cachedActions);
  const generatedAt =
    typeof summary.generated_at === "string" ? summary.generated_at : new Date(0).toISOString();

  return {
    scenarioRunId: "real:hormuz:source-set",
    seededAt: generatedAt,
    mode: "real",
    strictReal: true,
    caseGenerationStatus: alerts.length > 0 ? "READY" : "NO_REAL_CASE",
    lastRefreshAt: generatedAt,
    emptyReason: typeof summary.empty_reason === "string" ? summary.empty_reason : null,
    sourceStatuses: Array.isArray(realSourceStatuses)
      ? (realSourceStatuses as Array<Record<string, unknown>>)
          .filter((status) => alerts.length === 0 || status.status !== "excluded_fixture_fallback")
          .map(toSourceStatusView)
      : [],
    tracksUrl: "/fixtures/maritime/tracks.geojson",
    alerts,
    hypotheses,
    claims,
    actions
  };
}

function mergeById<T extends { id: string }>(first: T[], second: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of [...first, ...second]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function buildDemoFallbackState(): ScenarioStateView {
  const alerts: AlertView[] = ((anomalyFixtures as FixtureFile).nodes ?? [])
    .filter((node) => node.type === "anomaly")
    .map((node, index) => ({
      id: node.id,
      caseId: node.case_id,
      title: publicText(node.title ?? node.id),
      detectedAt:
        typeof node.data?.detected_at === "string"
          ? (node.data.detected_at as string)
          : typeof node.data?.window_end === "string"
          ? (node.data.window_end as string)
          : "",
      severity: typeof node.data?.score === "number" ? (node.data.score as number) : 0.6,
      rank: index + 1,
      status: typeof node.data?.status === "string" ? (node.data.status as string) : "OPEN"
    }));

  const hypotheses: HypothesisView[] = ((hypothesisFixtures as FixtureFile).nodes ?? []).map(
    (node) => ({
      id: node.id,
      label: publicText(node.title ?? node.id),
      posterior:
        typeof node.data?.posterior === "number" ? (node.data.posterior as number) : 0.5,
      status:
        typeof node.data?.status === "string" ? (node.data.status as string) : "UNRESOLVED"
    })
  );

  const claims: ClaimView[] = ((claimFixtures as FixtureFile).nodes ?? []).map((node) => ({
    id: node.id,
    posterior:
      typeof node.data?.posterior === "number" ? (node.data.posterior as number) : 0.5,
    status:
      typeof node.data?.status === "string" ? (node.data.status as string) : "CONTESTED"
  }));

  const actions: ActionView[] = ((actionFixtures as FixtureFile).nodes ?? [])
    .filter((node) => node.id.startsWith("act:"))
    .map((node) => ({
      id: node.id,
      actionType:
        typeof node.data?.kind === "string" ? (node.data.kind as string) : "MONITOR_ONLY",
      rank:
        typeof node.data?.defaultPriority === "number"
          ? (node.data.defaultPriority as number)
          : 99,
      rankingScore:
        typeof node.data?.ranking_score === "number"
          ? (node.data.ranking_score as number)
          : 0,
      status: typeof node.data?.status === "string" ? (node.data.status as string) : "RECOMMENDED"
    }));

  return {
    scenarioRunId: "fallback:alara-01",
    seededAt: new Date(0).toISOString(),
    mode: "demo",
    alerts,
    hypotheses,
    claims,
    actions
  };
}

function fixtureNodeToRecord(node: FixtureNode): Record<string, unknown> {
  return {
    ...(node.data ?? {}),
    object_id: node.id,
    objectId: node.id,
    title: node.title ? publicText(node.title) : node.title,
    case_id: node.case_id,
    status: node.status ?? node.data?.status,
    updated_at: node.created_at
  };
}
