export const HORMUZ_CLASSIFICATION = "UNCLASSIFIED//OSINT_FIXTURE" as const;

export const HORMUZ_DRAWER_GROUPS = [
  "Satellite",
  "Maritime Warnings",
  "OSINT",
  "Entity Risk",
  "Infrastructure Context"
] as const;

export type HormuzDrawerGroup = (typeof HORMUZ_DRAWER_GROUPS)[number];

export const HORMUZ_INTEL_CATEGORIES = [
  "GEO_SPATIOTEMPORAL_CORROBORATION",
  "CROSS_MODAL_CONTEXT",
  "ENTITY_RISK_ENRICHMENT",
  "REGIONAL_SECURITY_CONTEXT",
  "VESSEL_IDENTITY_CORROBORATION",
  "MARITIME_INFRASTRUCTURE_CONTEXT",
  "INFRASTRUCTURE_CONTEXT_ONLY"
] as const;

export type HormuzIntelCategory = (typeof HORMUZ_INTEL_CATEGORIES)[number];

export type HormuzIntelStatus = "available" | "unavailable";

export type HormuzIntelSource =
  | "ACLED"
  | "AISSTREAM"
  | "CENSYS"
  | "COPERNICUS_MARINE"
  | "COPERNICUS_CDSE_STAC"
  | "DANTI"
  | "GDELT"
  | "SENTINEL_HUB_PROCESS"
  | "OPENSANCTIONS"
  | "EXA"
  | "NAVAREA_IX"
  | "UKMTO"
  | "GLOBAL_FISHING_WATCH"
  | "OVERPASS"
  | "SHODAN";

export type HormuzScoreBucket =
  | "cross_modal_context"
  | "entity_risk"
  | "regional_context"
  | "identity_source_corroboration"
  | "infrastructure_context";

export type HormuzExcludedClaimClass =
  | "kinematics"
  | "vessel_behavior"
  | "intent";

export interface HormuzScorePolicy {
  allowed_score_buckets: HormuzScoreBucket[];
  excluded_claim_classes: HormuzExcludedClaimClass[];
  note: string;
}

export interface HormuzGeoJson {
  type: string;
  coordinates?: unknown;
  geometries?: unknown[];
  [key: string]: unknown;
}

export interface HormuzSourceDocument {
  id: string;
  type: "sourceDocument";
  title: string;
  source: HormuzIntelSource;
  provider: string;
  source_file: string;
  sha256: string | null;
  captured_at: string | null;
  retrieved_at: string | null;
  url: string | null;
  status: HormuzIntelStatus;
  status_detail: string;
  response_status: number | null;
  content_type: string | null;
  bytes: number | null;
  classification: typeof HORMUZ_CLASSIFICATION;
  categories: HormuzIntelCategory[];
  summary: string;
}

export interface HormuzEvidenceItem {
  id: string;
  type: "evidence";
  title: string;
  source: HormuzIntelSource;
  provider: string;
  category: HormuzIntelCategory;
  drawer_group: HormuzDrawerGroup;
  source_document_id: string;
  source_document_ids: string[];
  source_file: string;
  source_sha256: string | null;
  created_at: string;
  observed_at: string | null;
  status: HormuzIntelStatus;
  classification: typeof HORMUZ_CLASSIFICATION;
  confidence: number;
  reliability: number;
  summary: string;
  detail: string | null;
  url: string | null;
  bbox?: [number, number, number, number];
  geometry?: HormuzGeoJson;
  image_asset?: string;
  browser_asset_path?: string;
  entities?: string[];
  attributes?: Record<string, unknown>;
  policy: HormuzScorePolicy;
}

export interface HormuzScoringContribution {
  evidence_id: string;
  title: string;
  source: HormuzIntelSource;
  category: HormuzIntelCategory;
  bucket: HormuzScoreBucket;
  delta: number;
  available: boolean;
  allowed_claim_classes: HormuzScoreBucket[];
  excluded_claim_classes: HormuzExcludedClaimClass[];
  rationale: string;
}

export interface HormuzScoringSummary {
  contributions: HormuzScoringContribution[];
  totals: Record<HormuzScoreBucket, number>;
}

export interface HormuzIntelSummary {
  generated_at: string;
  normalizer_version: string;
  classification: typeof HORMUZ_CLASSIFICATION;
  source_document_count: number;
  evidence_item_count: number;
  available_evidence_count: number;
  unavailable_evidence_count: number;
  drawer_groups: Record<HormuzDrawerGroup, number>;
  categories: Record<HormuzIntelCategory, number>;
  scoring: HormuzScoringSummary;
}
