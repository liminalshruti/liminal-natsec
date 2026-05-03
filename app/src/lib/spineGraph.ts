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

export function caseIdFromAlertId(alertId: string): string | null {
  const graph = getMaritimeGraph();
  const node = graph.getNode(alertId);
  return node?.case_id ?? null;
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

export type { ProvenanceTrace, ReviewRuleApplication, SpineEdge, SpineNode };
