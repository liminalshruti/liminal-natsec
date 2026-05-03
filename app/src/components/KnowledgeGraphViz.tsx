// KnowledgeGraphViz — force-directed graph visualization of the custody case
// graph. Renders the SAME data that ProvenanceTrace and the typed-grammar
// chips show — but as an actual graph element instead of text. Workshop
// substrate explicitly said: "even a static rendered graph that updates on
// rule-write is sufficient" — so this is the demo-grade rendering.
//
// SVG-based, no external library (no react-force-graph dependency added at
// H22). Force layout is a tiny implementation: nodes attract/repel via
// charge, edges pull via spring. ~150 iterations of simulation precomputed
// at mount; no continuous animation tax. When the case changes, layout
// recomputes from the new subgraph.
//
// Trigger: rendered as a CASE FILE section (section "Knowledge Graph") so it
// lives where the forensic-density work already lives. Operators in argument
// mode click into it; judges in Q&A click into it. Cmd+G keyboard shortcut
// expands it to fullscreen overlay (v3.3).
//
// Per workshop substrate: "Vector-based graph preferred — vectors support
// actions and rules via directionality and force." Each edge type gets a
// semantic color tone matching the typed-grammar canon (SUPPORTS green,
// WEAKENS amber, CONTRADICTS red, TRIGGERS/DERIVED_FROM neutral).

import { useEffect, useMemo, useRef, useState } from "react";

import { getMaritimeGraph } from "../lib/spineGraph.ts";
import type { NodeType, SpineEdge, SpineNode } from "../../../graph-spine/schema.ts";

interface KnowledgeGraphVizProps {
  caseId: string | null;
  /** When true, opens as a large overlay; otherwise inline at section size. */
  fullscreen?: boolean;
}

interface PositionedNode {
  id: string;
  type: NodeType;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface PositionedEdge {
  from: string;
  to: string;
  type: string;
}

const NODE_COLOR: Partial<Record<NodeType, string>> = {
  case: "#93a3b3",
  claim: "#6ea8fe",
  hypothesis: "#6ea8fe",
  evidence: "#d18b3c",
  observation: "#d18b3c",
  sourceIntegrityCheck: "#d18b3c",
  anomaly: "#93a3b3",
  track: "#93a3b3",
  entity: "#93a3b3",
  actionOption: "#4ea08a",
  reviewRule: "#5ad8c4"
};

const NODE_LABEL: Partial<Record<NodeType, string>> = {
  case: "CASE",
  claim: "CLAIM",
  hypothesis: "HYP",
  evidence: "EV",
  observation: "OBS",
  sourceIntegrityCheck: "SIC",
  anomaly: "ANOM",
  track: "TRK",
  entity: "ENT",
  actionOption: "ACT",
  reviewRule: "RULE"
};

const EDGE_COLOR: Record<string, string> = {
  SUPPORTS: "#4ea08a",
  WEAKENS: "#d18b3c",
  CONTRADICTS: "#d2604a",
  TRIGGERS: "#6ea8fe",
  DERIVED_FROM: "#93a3b3",
  OBSERVED_AS: "#5d6e80",
  RECOMMENDS: "#4ea08a",
  REVIEWED_BY: "#5ad8c4",
  APPLIES_TO: "#5ad8c4"
};

/**
 * Collect the subgraph relevant to a single case — hypotheses, claims,
 * actions, evidence, observations, plus any edges between them. Bounded
 * traversal: stops at observation nodes (no further descent). Keeps the
 * graph small enough to lay out cleanly in viewport-fit.
 */
function collectCaseSubgraph(caseId: string | null): {
  nodes: SpineNode[];
  edges: SpineEdge[];
} {
  if (!caseId) return { nodes: [], edges: [] };
  const graph = getMaritimeGraph();
  const visited = new Set<string>();
  const nodes: SpineNode[] = [];
  const edges: SpineEdge[] = [];

  const root = graph.getNode(caseId);
  if (!root) return { nodes: [], edges: [] };

  // BFS from the case node, bounded depth 4
  const queue: Array<{ id: string; depth: number }> = [{ id: caseId, depth: 0 }];
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = graph.getNode(id);
    if (!node) continue;
    nodes.push(node);
    if (depth >= 4) continue;
    const neighbors = graph.getEdges().filter((e) => e.from === id || e.to === id);
    for (const edge of neighbors) {
      const otherId = edge.from === id ? edge.to : edge.from;
      if (!visited.has(otherId)) {
        queue.push({ id: otherId, depth: depth + 1 });
      }
      const edgeKey = `${edge.from}→${edge.to}:${edge.type}`;
      if (!edges.some((e) => `${e.from}→${e.to}:${e.type}` === edgeKey)) {
        edges.push(edge);
      }
    }
  }
  return { nodes, edges };
}

/**
 * Tiny force-directed layout. ~150 iterations is enough to settle small
 * graphs (10–30 nodes) into legible positions. Algorithm:
 *   · charge force: every pair of nodes repels with 1/r²
 *   · spring force: every edge pulls connected nodes toward target distance
 *   · centering force: weak pull toward viewport center prevents drift
 */
function layoutForceDirected(
  rawNodes: SpineNode[],
  rawEdges: SpineEdge[],
  width: number,
  height: number
): { nodes: PositionedNode[]; edges: PositionedEdge[] } {
  if (rawNodes.length === 0) return { nodes: [], edges: [] };

  // Random initial positions in a small disc near the center
  const nodes: PositionedNode[] = rawNodes.map((n, i) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    x: width / 2 + (Math.cos(i * 2.4) * width) / 6 + (Math.random() - 0.5) * 30,
    y: height / 2 + (Math.sin(i * 2.4) * height) / 6 + (Math.random() - 0.5) * 30,
    vx: 0,
    vy: 0
  }));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const edges: PositionedEdge[] = rawEdges
    .map((e) => ({ from: e.from, to: e.to, type: e.type }))
    .filter((e) => nodeById.has(e.from) && nodeById.has(e.to));

  const ITERATIONS = 200;
  const SPRING_LENGTH = 80;
  const SPRING_K = 0.04;
  const CHARGE = 1200;
  const CENTER_K = 0.012;
  const DAMPING = 0.85;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Reset forces
    for (const n of nodes) {
      n.vx *= DAMPING;
      n.vy *= DAMPING;
    }
    // Charge (repulsion)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist2 = Math.max(dx * dx + dy * dy, 25);
        const dist = Math.sqrt(dist2);
        const force = CHARGE / dist2;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }
    // Spring (edges)
    for (const e of edges) {
      const a = nodeById.get(e.from)!;
      const b = nodeById.get(e.to)!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = (dist - SPRING_LENGTH) * SPRING_K;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
    // Center pull
    for (const n of nodes) {
      n.vx += (width / 2 - n.x) * CENTER_K;
      n.vy += (height / 2 - n.y) * CENTER_K;
    }
    // Apply velocity
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      // Clamp to viewport with margin
      n.x = Math.max(20, Math.min(width - 20, n.x));
      n.y = Math.max(20, Math.min(height - 20, n.y));
    }
  }

  return { nodes, edges };
}

export function KnowledgeGraphViz({ caseId, fullscreen = false }: KnowledgeGraphVizProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 480, height: 280 });

  // Recompute container size when fullscreen toggles or the container resizes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: rect.width, height: rect.height });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullscreen]);

  const { nodes, edges } = useMemo(() => {
    const sub = collectCaseSubgraph(caseId);
    return layoutForceDirected(sub.nodes, sub.edges, size.width, size.height);
  }, [caseId, size.width, size.height]);

  if (!caseId) {
    return (
      <div className="kg-viz kg-viz--empty">
        <span className="empty">no case selected</span>
      </div>
    );
  }
  if (nodes.length === 0) {
    return (
      <div className="kg-viz kg-viz--empty">
        <span className="empty">no graph for this case</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`kg-viz${fullscreen ? " kg-viz--fullscreen" : ""}`}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.width} ${size.height}`}
        style={{ display: "block" }}
      >
        <defs>
          {Object.entries(EDGE_COLOR).map(([type, color]) => (
            <marker
              key={type}
              id={`kg-arrow-${type}`}
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={color} opacity="0.7" />
            </marker>
          ))}
        </defs>

        {/* Edges */}
        {edges.map((e, i) => {
          const from = nodes.find((n) => n.id === e.from);
          const to = nodes.find((n) => n.id === e.to);
          if (!from || !to) return null;
          const color = EDGE_COLOR[e.type] ?? "#5d6e80";
          const isHover = hoveredNode === e.from || hoveredNode === e.to;
          return (
            <line
              key={`${e.from}→${e.to}:${e.type}:${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth={isHover ? 1.6 : 1}
              opacity={isHover ? 0.9 : 0.45}
              markerEnd={`url(#kg-arrow-${e.type})`}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const fill = NODE_COLOR[n.type] ?? "#5d6e80";
          const label = NODE_LABEL[n.type] ?? n.type.slice(0, 4).toUpperCase();
          const isHover = hoveredNode === n.id;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              onMouseEnter={() => setHoveredNode(n.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                r={isHover ? 14 : 10}
                fill={fill}
                opacity={isHover ? 1 : 0.85}
                stroke="#06090d"
                strokeWidth="1.5"
              />
              <text
                y="3"
                textAnchor="middle"
                fontSize="7"
                fontFamily="var(--font-mono)"
                fontWeight="600"
                fill="#06090d"
                style={{ pointerEvents: "none" }}
              >
                {label}
              </text>
              {isHover && (
                <text
                  y="26"
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  fill="#d8e2ec"
                  style={{ pointerEvents: "none" }}
                >
                  {n.title.length > 28 ? n.title.slice(0, 26) + "…" : n.title}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="kg-viz__legend">
        <span className="kg-viz__legend-item">
          <span className="kg-viz__legend-pip" style={{ background: "#6ea8fe" }} />
          BELIEF
        </span>
        <span className="kg-viz__legend-item">
          <span className="kg-viz__legend-pip" style={{ background: "#d18b3c" }} />
          EVIDENCE
        </span>
        <span className="kg-viz__legend-item">
          <span className="kg-viz__legend-pip" style={{ background: "#4ea08a" }} />
          ACTION
        </span>
        <span className="kg-viz__legend-item">
          <span className="kg-viz__legend-pip" style={{ background: "#5ad8c4" }} />
          RULE
        </span>
        <span className="kg-viz__legend-item">
          <span className="kg-viz__legend-pip" style={{ background: "#93a3b3" }} />
          ANCHOR
        </span>
      </div>
    </div>
  );
}
