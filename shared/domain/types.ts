import type {
  ArchetypeMetadata,
  EdgeProvenance,
  EdgeType,
  NodeType,
  SpineEdge,
  SpineNode
} from "../../graph-spine/schema.ts";
import type { ProvenanceTrace } from "../../graph-spine/provenance.ts";
import type { ReviewRuleApplication } from "../../graph-spine/review-memory.ts";

export type {
  ArchetypeMetadata,
  EdgeProvenance,
  EdgeType,
  NodeType,
  ProvenanceTrace,
  ReviewRuleApplication,
  SpineEdge,
  SpineNode
};

export interface FixtureGraphSectionDto {
  nodes: SpineNode[];
  edges: SpineEdge[];
}

export interface ScenarioEventDto {
  event: string;
  id: string;
  case_id?: string;
  at?: string;
  summary?: string;
  refs?: string[];
}

export interface CaseDto {
  id: string;
  title: string;
  status: string;
  stage: string;
  node_id: string;
}

export interface ActionOptionDto {
  id: string;
  case_id: string;
  action_type: string;
  label: string;
  base_score: number;
  status: string;
  trigger: string;
}

export interface SpecialistReadDto {
  id: string;
  case_id: string;
  specialist: string;
  status: "OK" | "REFUSED";
  summary: string;
  citations: string[];
}

export interface FixturePackDto {
  observations: FixtureGraphSectionDto;
  anomalies: FixtureGraphSectionDto;
  hypotheses: FixtureGraphSectionDto;
  claims: FixtureGraphSectionDto;
  evidence: FixtureGraphSectionDto;
  actions: FixtureGraphSectionDto;
  reviewRules: FixtureGraphSectionDto;
  specialistReads: SpecialistReadDto[];
  scenarioEvents: ScenarioEventDto[];
}

// =============================================================================
// Specialist contracts (M3 + AIP). Canonical home — server runtime and frontend
// SpecialistReads UI both consume these. The simpler `SpecialistReadDto` above
// is the legacy spine/UI projection; new code should prefer GuardedSpecialistOutput.
// =============================================================================

export type SpecialistName =
  | "kinematics"
  | "identity"
  | "signal_integrity"
  | "intent"
  | "collection"
  | "visual";

export type Verdict = "supported" | "weakened" | "contradicted" | "refused";

export type SpecialistSource = "aip" | "pi-ai" | "anthropic" | "codex" | "cache" | "fixture";

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
  "signal_integrity",
  "intent",
  "collection",
  "visual"
] as const;

export const DEFAULT_CONFIDENCE_FLOOR = 0.55;
export const DEFAULT_VISUAL_THRESHOLD = 0.55;
