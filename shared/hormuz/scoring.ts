import type {
  HormuzEvidenceItem,
  HormuzExcludedClaimClass,
  HormuzIntelCategory,
  HormuzScoreBucket,
  HormuzScoringContribution,
  HormuzScoringSummary
} from "./types.ts";

export const HORMUZ_SCORE_BUCKETS: readonly HormuzScoreBucket[] = [
  "cross_modal_context",
  "entity_risk",
  "regional_context",
  "identity_source_corroboration",
  "infrastructure_context"
] as const;

const BEHAVIOR_EXCLUSIONS: HormuzExcludedClaimClass[] = [
  "kinematics",
  "vessel_behavior",
  "intent"
];

const CATEGORY_BUCKET: Record<HormuzIntelCategory, HormuzScoreBucket> = {
  GEO_SPATIOTEMPORAL_CORROBORATION: "cross_modal_context",
  CROSS_MODAL_CONTEXT: "cross_modal_context",
  ENTITY_RISK_ENRICHMENT: "entity_risk",
  REGIONAL_SECURITY_CONTEXT: "regional_context",
  VESSEL_IDENTITY_CORROBORATION: "identity_source_corroboration",
  MARITIME_INFRASTRUCTURE_CONTEXT: "infrastructure_context",
  INFRASTRUCTURE_CONTEXT_ONLY: "infrastructure_context"
};

const AVAILABLE_DELTAS: Record<HormuzIntelCategory, number> = {
  GEO_SPATIOTEMPORAL_CORROBORATION: 0.18,
  CROSS_MODAL_CONTEXT: 0.12,
  ENTITY_RISK_ENRICHMENT: 0.22,
  REGIONAL_SECURITY_CONTEXT: 0.1,
  VESSEL_IDENTITY_CORROBORATION: 0.16,
  MARITIME_INFRASTRUCTURE_CONTEXT: 0.04,
  INFRASTRUCTURE_CONTEXT_ONLY: 0.02
};

const CATEGORY_RATIONALE: Record<HormuzIntelCategory, string> = {
  GEO_SPATIOTEMPORAL_CORROBORATION:
    "Satellite metadata can corroborate time and area context only.",
  CROSS_MODAL_CONTEXT:
    "Satellite image chips provide cross-modal context without identity or intent claims.",
  ENTITY_RISK_ENRICHMENT:
    "OpenSanctions records affect entity-risk enrichment only.",
  REGIONAL_SECURITY_CONTEXT:
    "Public warning and OSINT records affect regional context only.",
  VESSEL_IDENTITY_CORROBORATION:
    "GFW vessel search records affect identity/source corroboration only.",
  MARITIME_INFRASTRUCTURE_CONTEXT:
    "Overpass records affect maritime infrastructure context only.",
  INFRASTRUCTURE_CONTEXT_ONLY:
    "Internet-exposure records affect infrastructure context only and do not support vessel behavior."
};

export function mapHormuzEvidenceToScoringContributions(
  evidenceItems: readonly HormuzEvidenceItem[]
): HormuzScoringContribution[] {
  return evidenceItems.map((item) => {
    const bucket = CATEGORY_BUCKET[item.category];
    const available = item.status === "available";
    const delta = available ? AVAILABLE_DELTAS[item.category] : 0;
    const excluded = exclusionsFor(item);

    return {
      evidence_id: item.id,
      title: item.title,
      source: item.source,
      category: item.category,
      bucket,
      delta,
      available,
      allowed_claim_classes: [bucket],
      excluded_claim_classes: excluded,
      rationale: CATEGORY_RATIONALE[item.category]
    };
  });
}

export function buildHormuzScoringSummary(
  evidenceItems: readonly HormuzEvidenceItem[]
): HormuzScoringSummary {
  const contributions = mapHormuzEvidenceToScoringContributions(evidenceItems);
  const totals = Object.fromEntries(
    HORMUZ_SCORE_BUCKETS.map((bucket) => [bucket, 0])
  ) as Record<HormuzScoreBucket, number>;

  for (const contribution of contributions) {
    totals[contribution.bucket] += contribution.delta;
  }

  return {
    contributions,
    totals
  };
}

function exclusionsFor(item: HormuzEvidenceItem): HormuzExcludedClaimClass[] {
  if (item.category === "INFRASTRUCTURE_CONTEXT_ONLY") {
    return BEHAVIOR_EXCLUSIONS;
  }

  if (item.category === "MARITIME_INFRASTRUCTURE_CONTEXT") {
    return BEHAVIOR_EXCLUSIONS;
  }

  return item.policy.excluded_claim_classes;
}
