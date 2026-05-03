import {
  validateEdge,
  validateNode,
  type EdgeType,
  type NodeType,
  type SpineEdge,
  type SpineNode
} from "./schema.ts";

export interface FixtureSection {
  nodes?: unknown[];
  edges?: unknown[];
}

function sectionRecords(section: unknown): FixtureSection {
  if (Array.isArray(section)) {
    return { nodes: section };
  }

  if (typeof section !== "object" || section === null) {
    throw new Error("Fixture section must be an object or array");
  }

  const candidate = section as FixtureSection;
  if ("nodes" in candidate && !Array.isArray(candidate.nodes)) {
    throw new Error("Fixture section nodes must be an array");
  }

  if ("edges" in candidate && !Array.isArray(candidate.edges)) {
    throw new Error("Fixture section edges must be an array");
  }

  return candidate;
}

export class Graph {
  private readonly nodeMap = new Map<string, SpineNode>();
  private readonly edgeMap = new Map<string, SpineEdge>();

  constructor(nodes: unknown[] = [], edges: unknown[] = []) {
    for (const node of nodes) {
      this.addNode(node);
    }

    for (const edge of edges) {
      this.addEdge(edge);
    }
  }

  static fromFixture(sections: FixtureSection | FixtureSection[]): Graph {
    const sectionList = Array.isArray(sections) ? sections : [sections];
    const nodes: unknown[] = [];
    const edges: unknown[] = [];

    for (const section of sectionList) {
      const records = sectionRecords(section);
      nodes.push(...(records.nodes ?? []));
      edges.push(...(records.edges ?? []));
    }

    return new Graph(nodes, edges);
  }

  addNode(input: unknown): SpineNode {
    const node = validateNode(input);
    if (this.nodeMap.has(node.id)) {
      throw new Error(`Duplicate node id: ${node.id}`);
    }

    this.nodeMap.set(node.id, node);
    return node;
  }

  addEdge(input: unknown): SpineEdge {
    const edge = validateEdge(input);
    if (this.edgeMap.has(edge.id)) {
      throw new Error(`Duplicate edge id: ${edge.id}`);
    }

    if (!this.nodeMap.has(edge.from)) {
      throw new Error(`Edge source node does not exist: ${edge.from}`);
    }

    if (!this.nodeMap.has(edge.to)) {
      throw new Error(`Edge target node does not exist: ${edge.to}`);
    }

    this.edgeMap.set(edge.id, edge);
    return edge;
  }

  getNode(id: string): SpineNode | undefined {
    return this.nodeMap.get(id);
  }

  requireNode(id: string): SpineNode {
    const node = this.getNode(id);
    if (!node) {
      throw new Error(`Node not found: ${id}`);
    }
    return node;
  }

  getNodes(type?: NodeType): SpineNode[] {
    const nodes = [...this.nodeMap.values()];
    return type ? nodes.filter((node) => node.type === type) : nodes;
  }

  getEdges(type?: EdgeType): SpineEdge[] {
    const edges = [...this.edgeMap.values()];
    return type ? edges.filter((edge) => edge.type === type) : edges;
  }

  outgoing(nodeId: string, type?: EdgeType): SpineEdge[] {
    return this.getEdges(type).filter((edge) => edge.from === nodeId);
  }

  incoming(nodeId: string, type?: EdgeType): SpineEdge[] {
    return this.getEdges(type).filter((edge) => edge.to === nodeId);
  }

  edgesForNode(nodeId: string, type?: EdgeType): SpineEdge[] {
    return this.getEdges(type).filter((edge) => edge.from === nodeId || edge.to === nodeId);
  }
}
