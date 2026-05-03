export type SpecialistName =
  | "kinematics"
  | "identity"
  | "intent"
  | "collection"
  | "visual";

export type Verdict = "supported" | "weakened" | "contradicted" | "refused";

export type SpecialistSource = "aip" | "anthropic" | "codex" | "cache" | "fixture";

export type EvidenceModality = "text" | "geo" | "kinematic" | "image";

export type EvidenceSource =
  | "MARINECADASTRE"
  | "AISHUB"
  | "BARENTSWATCH"
  | "DANTI"
  | "EXA"
  | "SHODAN"
  | "EDGE_FIXTURE";

export interface EvidenceItemRef {
  id: string;
  type: string;
  modality?: EvidenceModality;
  observed_at?: string;
  geometry?: unknown;
  source?: EvidenceSource;
}

export interface ClaimRef {
  id: string;
  posterior?: number;
}

export interface IdentityFeatures {
  dimensions_similarity_score: number | null;
  flag_match: boolean;
  imo_match: boolean;
}

export type VisualClass = "cargo" | "tanker" | "fishing" | "naval";

export interface VisualInput {
  observation_id: string;
  declared_ais_class: VisualClass | "unknown";
  visual_class_scores: Record<VisualClass, number>;
  match_threshold?: number;
}

export interface SpecialistInput {
  name: SpecialistName;
  anomaly_id: string;
  question?: string;
  evidence: EvidenceItemRef[];
  claim?: ClaimRef;
  identity_features?: IdentityFeatures;
  visual?: VisualInput;
  confidence_floor?: number;
}

export interface SpecialistRawOutput {
  verdict: Verdict;
  summary: string;
  cited_observation_ids: string[];
  confidence: number;
  unsupported_assertions: string[];
}

export interface GuardReport {
  applied_layers: string[];
  forced_refused: boolean;
  downgraded: boolean;
  stripped_assertions: string[];
}

export interface GuardedSpecialistOutput extends SpecialistRawOutput {
  source: SpecialistSource;
  guard: GuardReport;
}

export interface SpecialistCallResult {
  raw: SpecialistRawOutput;
  source: SpecialistSource;
}

export interface Specialist {
  name: SpecialistName;
  call(input: SpecialistInput): Promise<SpecialistCallResult>;
}

export const SPECIALIST_NAMES: readonly SpecialistName[] = [
  "kinematics",
  "identity",
  "intent",
  "collection",
  "visual"
] as const;

export const DEFAULT_CONFIDENCE_FLOOR = 0.55;
export const DEFAULT_VISUAL_THRESHOLD = 0.55;
