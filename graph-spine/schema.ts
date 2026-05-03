// Domain adapters must keep domain nouns out of this package; forbidden examples: vessel, AIS, MMSI, AOI, port, harbor.
export const NODE_TYPES = [
  "observation",
  "entity",
  "track",
  "anomaly",
  "hypothesis",
  "claim",
  "evidence",
  "actionOption",
  "reviewRule",
  "case"
] as const;

export type NodeType = (typeof NODE_TYPES)[number];

export const EDGE_TYPES = [
  "OBSERVED_AS",
  "DERIVED_FROM",
  "SUPPORTS",
  "WEAKENS",
  "CONTRADICTS",
  "TRIGGERS",
  "RECOMMENDS",
  "REVIEWED_BY",
  "APPLIES_TO"
] as const;

export type EdgeType = (typeof EDGE_TYPES)[number];

export type ArchetypeRole =
  | "perception"
  | "persistence"
  | "epistemic"
  | "decision"
  | "review_memory";

export interface EdgeProvenance {
  created_at: string;
  created_by: "system" | "operator" | "fixture" | string;
  source_node_ids: string[];
  confidence?: number;
  rationale?: string;
}

export interface ArchetypeMetadata {
  archetype_primary?: "Sage" | "Magician" | "Judge" | "Sovereign" | "Trickster" | string;
  archetype_secondary?: string[];
  archetype_role?: ArchetypeRole;
}

export interface SpineNode<Data extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: NodeType;
  title: string;
  created_at?: string;
  case_id?: string;
  status?: string;
  data?: Data;
  metadata?: Record<string, unknown>;
  archetype?: ArchetypeMetadata;
}

export interface SpineEdge<Data extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: EdgeType;
  from: string;
  to: string;
  provenance: EdgeProvenance;
  data?: Data;
  metadata?: Record<string, unknown>;
}

const NODE_TYPE_SET = new Set<string>(NODE_TYPES);
const EDGE_TYPE_SET = new Set<string>(EDGE_TYPES);
const ARCHETYPE_ROLE_SET = new Set<string>([
  "perception",
  "persistence",
  "epistemic",
  "decision",
  "review_memory"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must include a non-empty ${key}`);
  }
  return value;
}

function validateOptionalRecord(record: Record<string, unknown>, key: string): void {
  if (key in record && !isRecord(record[key])) {
    throw new Error(`${key} must be an object when provided`);
  }
}

function validateOptionalString(record: Record<string, unknown>, key: string): void {
  if (key in record && typeof record[key] !== "string") {
    throw new Error(`${key} must be a string when provided`);
  }
}

function validateTimestamp(value: unknown, label: string): void {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be an ISO timestamp string`);
  }
}

export function validateArchetypeMetadata(input: unknown): ArchetypeMetadata {
  if (!isRecord(input)) {
    throw new Error("archetype must be an object");
  }

  if ("archetype_primary" in input && typeof input.archetype_primary !== "string") {
    throw new Error("archetype_primary must be a string when provided");
  }

  if (
    "archetype_secondary" in input &&
    (!Array.isArray(input.archetype_secondary) ||
      !input.archetype_secondary.every((item) => typeof item === "string"))
  ) {
    throw new Error("archetype_secondary must be a string array when provided");
  }

  if (
    "archetype_role" in input &&
    (typeof input.archetype_role !== "string" ||
      !ARCHETYPE_ROLE_SET.has(input.archetype_role))
  ) {
    throw new Error("archetype_role is unsupported");
  }

  return input as ArchetypeMetadata;
}

export function validateNode(input: unknown): SpineNode {
  if (!isRecord(input)) {
    throw new Error("Node must be an object");
  }

  requireString(input, "id", "Node");
  const type = requireString(input, "type", "Node");
  requireString(input, "title", "Node");

  if (!NODE_TYPE_SET.has(type)) {
    throw new Error(`Unsupported node type: ${type}`);
  }

  validateOptionalString(input, "created_at");
  validateOptionalString(input, "case_id");
  validateOptionalString(input, "status");
  validateOptionalRecord(input, "data");
  validateOptionalRecord(input, "metadata");

  if ("created_at" in input) {
    validateTimestamp(input.created_at, "created_at");
  }

  if ("archetype" in input) {
    validateArchetypeMetadata(input.archetype);
  }

  return input as unknown as SpineNode;
}

export function validateEdgeProvenance(input: unknown): EdgeProvenance {
  if (!isRecord(input)) {
    throw new Error("Edge provenance is required");
  }

  validateTimestamp(input.created_at, "provenance.created_at");
  if (typeof input.created_by !== "string" || input.created_by.length === 0) {
    throw new Error("provenance.created_by must be a non-empty string");
  }

  if (
    !Array.isArray(input.source_node_ids) ||
    input.source_node_ids.length === 0 ||
    !input.source_node_ids.every((item) => typeof item === "string" && item.length > 0)
  ) {
    throw new Error("provenance.source_node_ids must be a non-empty string array");
  }

  if (
    "confidence" in input &&
    (typeof input.confidence !== "number" || input.confidence < 0 || input.confidence > 1)
  ) {
    throw new Error("provenance.confidence must be between 0 and 1 when provided");
  }

  if ("rationale" in input && typeof input.rationale !== "string") {
    throw new Error("provenance.rationale must be a string when provided");
  }

  return input as unknown as EdgeProvenance;
}

export function validateEdge(input: unknown): SpineEdge {
  if (!isRecord(input)) {
    throw new Error("Edge must be an object");
  }

  requireString(input, "id", "Edge");
  const type = requireString(input, "type", "Edge");
  requireString(input, "from", "Edge");
  requireString(input, "to", "Edge");

  if (!EDGE_TYPE_SET.has(type)) {
    throw new Error(`Unsupported edge type: ${type}`);
  }

  if (!("provenance" in input)) {
    throw new Error("Edge provenance is required");
  }

  validateEdgeProvenance(input.provenance);
  validateOptionalRecord(input, "data");
  validateOptionalRecord(input, "metadata");

  return input as unknown as SpineEdge;
}
