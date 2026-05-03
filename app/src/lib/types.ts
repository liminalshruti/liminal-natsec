export type ScenarioMode = "real" | "demo";

export interface AlertView {
  id: string;
  caseId?: string;
  title: string;
  detectedAt: string;
  severity: number;
  rank: number;
  status: string;
}

export interface HypothesisView {
  id: string;
  label: string;
  posterior: number;
  status: string;
}

export interface ClaimView {
  id: string;
  posterior: number;
  status: string;
}

export interface ActionView {
  id: string;
  actionType: string;
  rank: number;
  rankingScore: number;
  status: string;
}

export interface ScenarioStateView {
  scenarioRunId: string;
  seededAt: string;
  mode: ScenarioMode;
  strictReal?: boolean;
  caseGenerationStatus?: "READY" | "NO_REAL_CASE";
  lastRefreshAt?: string;
  emptyReason?: string | null;
  sourceStatuses?: SourceStatusView[];
  tracksUrl?: string;
  alerts: AlertView[];
  hypotheses: HypothesisView[];
  claims: ClaimView[];
  actions: ActionView[];
}

export interface SourceStatusView {
  source: string;
  status: "available" | "unavailable" | "excluded_fixture_fallback" | string;
  detail: string;
  fileName?: string;
  generatedAt?: string | null;
  recordCount?: number;
}
