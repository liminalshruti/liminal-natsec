// Loads scenario state for the watchfloor shell. Tries the live server
// first, falls back to the bundled maritime fixture pack so the demo
// always has something to render even when the Tier B server is offline.

import type {
  ActionView,
  AlertView,
  ClaimView,
  HypothesisView,
  ScenarioStateView
} from "./types.ts";

import anomalyFixtures from "../../../fixtures/maritime/anomalies.json" with { type: "json" };
import claimFixtures from "../../../fixtures/maritime/claims.json" with { type: "json" };
import hypothesisFixtures from "../../../fixtures/maritime/hypotheses.json" with { type: "json" };
import actionFixtures from "../../../fixtures/maritime/actions.json" with { type: "json" };

interface FixtureFile {
  nodes?: Array<{ id: string; title?: string; data?: Record<string, unknown> }>;
}

const SERVER_PATH = "/scenario/state";
const FETCH_TIMEOUT_MS = 1500;

export interface LoadedScenario {
  source: "server" | "fallback";
  state: ScenarioStateView;
  loadedAt: string;
  warning?: string;
}

export async function loadScenario(): Promise<LoadedScenario> {
  const fallback = buildFallbackState();
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

function fallbackResult(state: ScenarioStateView, warning: string): LoadedScenario {
  return {
    source: "fallback",
    state,
    loadedAt: new Date().toISOString(),
    warning
  };
}

async function fetchWithTimeout(path: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(path, { signal: controller.signal, headers: { accept: "application/json" } });
  } finally {
    clearTimeout(timer);
  }
}

function projectServerState(
  raw: Record<string, unknown>,
  fallback: ScenarioStateView
): ScenarioStateView {
  const anomalies = asArray(raw.anomalies);
  const claims = asArray(raw.claims);
  const actions = asArray(raw.actions);

  return {
    scenarioRunId: typeof raw.scenarioRunId === "string" ? raw.scenarioRunId : fallback.scenarioRunId,
    seededAt: typeof raw.seededAt === "string" ? raw.seededAt : fallback.seededAt,
    alerts: anomalies.length > 0 ? anomalies.map(toAlertView) : fallback.alerts,
    hypotheses: claims.length > 0 ? claims.map(toHypothesisView) : fallback.hypotheses,
    claims: claims.length > 0 ? claims.map(toClaimView) : fallback.claims,
    actions: actions.length > 0 ? actions.map(toActionView) : fallback.actions
  };
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function toAlertView(record: Record<string, unknown>): AlertView {
  const id = (record.object_id as string) ?? (record.objectId as string) ?? "unknown";
  return {
    id,
    title: (record.summary as string) ?? (record.anomaly_type as string) ?? id,
    detectedAt: (record.detected_at as string) ?? (record.window_end as string) ?? "",
    severity: typeof record.score === "number" ? record.score : 0,
    rank: typeof record.rank === "number" ? record.rank : 99,
    status: (record.status as string) ?? "OPEN"
  };
}

function toHypothesisView(record: Record<string, unknown>): HypothesisView {
  const id = (record.object_id as string) ?? (record.objectId as string) ?? "unknown";
  return {
    id,
    label: (record.hypothesis as string) ?? id,
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

function buildFallbackState(): ScenarioStateView {
  const alerts: AlertView[] = ((anomalyFixtures as FixtureFile).nodes ?? []).map((node, index) => ({
    id: node.id,
    title: node.title ?? node.id,
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
      label: node.title ?? node.id,
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
    alerts,
    hypotheses,
    claims,
    actions
  };
}
