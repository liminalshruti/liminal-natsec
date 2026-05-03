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
