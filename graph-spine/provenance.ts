import { Graph } from "./graph.ts";
import type { EdgeType, SpineEdge, SpineNode } from "./schema.ts";

export interface ProvenanceTraceStep {
  node: SpineNode;
  viaEdge?: SpineEdge;
}

export interface ProvenanceTrace {
  nodeId: string;
  nodes: SpineNode[];
  steps: ProvenanceTraceStep[];
}

function firstEdgeToType(
  graph: Graph,
  edges: SpineEdge[],
  endpoint: "from" | "to",
  type: SpineNode["type"]
): SpineEdge | undefined {
  return edges.find((edge) => graph.getNode(edge[endpoint])?.type === type);
}

function nextTraceEdge(graph: Graph, node: SpineNode): SpineEdge | undefined {
  if (node.type === "actionOption") {
    return firstEdgeToType(graph, graph.incoming(node.id, "TRIGGERS"), "from", "claim");
  }

  if (node.type === "claim") {
    return firstEdgeToType(graph, graph.incoming(node.id, "SUPPORTS"), "from", "hypothesis");
  }

  if (node.type === "hypothesis") {
    return firstEdgeToType(graph, graph.outgoing(node.id, "DERIVED_FROM"), "to", "anomaly");
  }

  if (node.type === "anomaly") {
    return firstEdgeToType(graph, graph.outgoing(node.id, "DERIVED_FROM"), "to", "observation");
  }

  return undefined;
}

function nextNodeId(node: SpineNode, edge: SpineEdge): string {
  return edge.from === node.id ? edge.to : edge.from;
}

export function traceBack(graph: Graph, nodeId: string, maxDepth = 8): ProvenanceTrace {
  const start = graph.requireNode(nodeId);
  const steps: ProvenanceTraceStep[] = [{ node: start }];
  const seen = new Set<string>([start.id]);
  let current = start;

  while (steps.length < maxDepth) {
    const edge = nextTraceEdge(graph, current);
    if (!edge) {
      break;
    }

    const nextId = nextNodeId(current, edge);
    if (seen.has(nextId)) {
      break;
    }

    const next = graph.requireNode(nextId);
    steps.push({ node: next, viaEdge: edge });
    seen.add(next.id);
    current = next;

    if (next.type === "observation") {
      break;
    }
  }

  return {
    nodeId,
    nodes: steps.map((step) => step.node),
    steps
  };
}

export function findContradictions(graph: Graph, claimId: string): SpineNode[] {
  const claim = graph.requireNode(claimId);
  if (claim.type !== "claim") {
    throw new Error(`Expected claim node: ${claimId}`);
  }

  const contradictionEdges = graph.edgesForNode(claimId, "CONTRADICTS");
  const nodes: SpineNode[] = [];
  const seen = new Set<string>();

  for (const edge of contradictionEdges) {
    const otherId = edge.from === claimId ? edge.to : edge.from;
    if (seen.has(otherId)) {
      continue;
    }

    const node = graph.requireNode(otherId);
    nodes.push(node);
    seen.add(otherId);
  }

  return nodes;
}

export function edgeTypesInTrace(trace: ProvenanceTrace): EdgeType[] {
  return trace.steps.flatMap((step) => (step.viaEdge ? [step.viaEdge.type] : []));
}
