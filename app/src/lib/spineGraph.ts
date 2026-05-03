// Builds a graph-spine Graph from the bundled maritime fixture pack so the
// app can call traceBack/findContradictions/applyReviewRules without going
// through the server.

import { Graph } from "../../../graph-spine/graph.ts";
import {
  findContradictions,
  traceBack,
  type ProvenanceTrace
} from "../../../graph-spine/provenance.ts";
import {
  applyReviewRules,
  type ReviewRuleApplication
} from "../../../graph-spine/review-memory.ts";
import type { SpineEdge, SpineNode } from "../../../graph-spine/schema.ts";

import observations from "../../../fixtures/maritime/observations.json" with { type: "json" };
import anomalies from "../../../fixtures/maritime/anomalies.json" with { type: "json" };
import hypotheses from "../../../fixtures/maritime/hypotheses.json" with { type: "json" };
import claims from "../../../fixtures/maritime/claims.json" with { type: "json" };
import evidence from "../../../fixtures/maritime/evidence.json" with { type: "json" };
import actions from "../../../fixtures/maritime/actions.json" with { type: "json" };
import reviewRules from "../../../fixtures/maritime/review-rules.json" with { type: "json" };
import realObservations from "../../../fixtures/maritime/real/observations.json" with { type: "json" };
import realAnomalies from "../../../fixtures/maritime/real/anomalies.json" with { type: "json" };
import realHypotheses from "../../../fixtures/maritime/real/hypotheses.json" with { type: "json" };
import realClaims from "../../../fixtures/maritime/real/claims.json" with { type: "json" };
import realEvidence from "../../../fixtures/maritime/real/evidence.json" with { type: "json" };
import realActions from "../../../fixtures/maritime/real/actions.json" with { type: "json" };

let cachedGraph: Graph | null = null;

export function getMaritimeGraph(): Graph {
  if (cachedGraph) return cachedGraph;
  cachedGraph = Graph.fromFixture([
    observations,
    anomalies,
    hypotheses,
    claims,
    evidence,
    actions,
    realObservations,
    realAnomalies,
    realHypotheses,
    realClaims,
    realEvidence,
    realActions,
    reviewRules
  ]);
  return cachedGraph;
}

export function traceForAction(actionId: string): ProvenanceTrace | null {
  const graph = getMaritimeGraph();
  if (!graph.getNode(actionId)) return null;
  try {
    return traceBack(graph, actionId);
  } catch {
    return null;
  }
}

export function contradictionsForClaim(claimId: string): SpineNode[] {
  const graph = getMaritimeGraph();
  if (!graph.getNode(claimId)) return [];
  try {
    return findContradictions(graph, claimId);
  } catch {
    return [];
  }
}

export function reviewApplicationForCase(caseId: string): ReviewRuleApplication | null {
  const graph = getMaritimeGraph();
  if (!graph.getNode(caseId)) return null;
  try {
    return applyReviewRules(graph, caseId);
  } catch {
    return null;
  }
}

export function hypothesesForCase(caseId: string): SpineNode[] {
  return getMaritimeGraph()
    .getNodes("hypothesis")
    .filter((node) => node.case_id === caseId);
}

export function actionsForCase(caseId: string): SpineNode[] {
  return getMaritimeGraph()
    .getNodes("actionOption")
    .filter((node) => node.case_id === caseId);
}

export function nodeById(id: string | null | undefined): SpineNode | null {
  if (!id) return null;
  return getMaritimeGraph().getNode(id) ?? null;
}

export function caseIdFromAlertId(alertId: string): string | null {
  const graph = getMaritimeGraph();

  // First pass: exact id match against the fixture spine.
  const direct = graph.getNode(alertId);
  if (direct?.case_id) return direct.case_id;

  // Second pass: server-side anomaly ids sometimes use underscores where the
  // fixture spine uses hyphens (e.g. `identity_churn` vs `identity-churn`).
  // Normalize and re-lookup before falling back.
  const normalized = alertId.replace(/_/g, "-");
  if (normalized !== alertId) {
    const normalizedNode = graph.getNode(normalized);
    if (normalizedNode?.case_id) return normalizedNode.case_id;
  }

  // Third pass: regex parse on event-1/event-2 if the id carries it.
  const match = alertId.match(/event[-_]?([12])/);
  if (match) return `case:alara-01:event-${match[1]}`;

  return null;
}

export function eventIdFromCaseId(caseId: string | null): "event-1" | "event-2" | null {
  if (!caseId) return null;
  if (caseId.endsWith("event-1")) return "event-1";
  if (caseId.endsWith("event-2")) return "event-2";
  return null;
}

export function topActionForClaim(claimId: string): SpineNode | null {
  const graph = getMaritimeGraph();
  const triggerEdges: SpineEdge[] = graph.outgoing(claimId, "TRIGGERS");
  for (const edge of triggerEdges) {
    const target = graph.getNode(edge.to);
    if (target?.type === "actionOption") return target;
  }
  return null;
}

export function claimsForCase(caseId: string): SpineNode[] {
  return getMaritimeGraph()
    .getNodes("claim")
    .filter((node) => node.case_id === caseId);
}

export function primaryClaimForCase(caseId: string | null): SpineNode | null {
  if (!caseId) return null;
  const claims = claimsForCase(caseId);
  if (claims.length === 0) return null;
  // Prefer a claim whose id matches the conventional `case:<...>:custody:h1` naming.
  const slug = caseId.replace(/^case:/, "");
  return (
    claims.find((claim) => claim.id === `claim:${slug}:custody:h1`) ?? claims[0]
  );
}

export interface EvidenceLink {
  node: SpineNode;
  edge: SpineEdge;
}

export interface EvidenceForClaim {
  supports: EvidenceLink[];
  weakens: EvidenceLink[];
  contradicts: EvidenceLink[];
}

export function evidenceForClaim(claimId: string): EvidenceForClaim {
  const graph = getMaritimeGraph();
  const result: EvidenceForClaim = { supports: [], weakens: [], contradicts: [] };
  if (!graph.getNode(claimId)) return result;
  for (const edge of graph.incoming(claimId)) {
    const source = graph.getNode(edge.from);
    if (!source || source.type !== "evidence") continue;
    if (edge.type === "SUPPORTS") result.supports.push({ node: source, edge });
    else if (edge.type === "WEAKENS") result.weakens.push({ node: source, edge });
    else if (edge.type === "CONTRADICTS") result.contradicts.push({ node: source, edge });
  }
  return result;
}

export type HypothesisStatus = "primary" | "alternative" | "unattached";

export function statusForHypothesis(
  hypothesisId: string,
  claimId: string | null
): HypothesisStatus {
  if (!claimId) return "unattached";
  const graph = getMaritimeGraph();
  const supports = graph.outgoing(hypothesisId, "SUPPORTS");
  const isPrimary = supports.some((edge) => edge.to === claimId);
  if (isPrimary) return "primary";
  return "alternative";
}

export type { ProvenanceTrace, ReviewRuleApplication, SpineEdge, SpineNode };
