export interface AlertView {
  id: string;
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
  alerts: AlertView[];
  hypotheses: HypothesisView[];
  claims: ClaimView[];
  actions: ActionView[];
}
