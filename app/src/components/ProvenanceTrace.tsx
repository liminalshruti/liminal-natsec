import { useMemo, useState } from "react";

import {
  topActionForClaim,
  traceForAction,
  type ProvenanceTrace as ProvenanceTraceType,
  type SpineNode
} from "../lib/spineGraph.ts";

import { TypedEdge, TypedObjectChip, type TypedObjectKind } from "./TypedObjectChip.tsx";

interface ProvenanceTraceProps {
  claimId: string | null;
}

// v3.2 IA — provenance is rendered with typed-object grammar:
//   [TYPE] target ←[EDGE_TYPE]── [TYPE] target ←[EDGE_TYPE]── ...
// The graph isn't drawn — it's implied by the typed-link chain. Same
// information density as before, much higher legibility because object
// types and edge types are now visible-by-default rather than encoded in
// indented prose. Matches Palantir's typed-link rendering style.
//
// v3.3 promotion: clicking a node chip toggles a focus state that
// highlights the chip and shows its full id + properties in a detail
// panel. For now (demo-grade), chip-click flashes a peek panel below the
// trace with the selected node's id, type, and any data properties — no
// graph navigation, no drill-down, just a "what is this node, exactly?"
// inspector that appears in-place and dismisses on next click.
export function ProvenanceTrace({ claimId }: ProvenanceTraceProps) {
  const [peekedId, setPeekedId] = useState<string | null>(null);

  const trace = useMemo<ProvenanceTraceType | null>(() => {
    if (!claimId) return null;
    const action = topActionForClaim(claimId);
    if (!action) return null;
    return traceForAction(action.id);
  }, [claimId]);

  // Reset the peek state when the claim changes — a new case is a new
  // trace, no stale selection.
  const peekedNode = useMemo(() => {
    if (!peekedId || !trace) return null;
    return trace.steps.find((s) => s.node.id === peekedId)?.node ?? null;
  }, [peekedId, trace]);

  if (!claimId) {
    return <div className="empty" style={{ fontSize: 11 }}>no claim selected</div>;
  }
  if (!trace) {
    return <div className="empty" style={{ fontSize: 11 }}>no trace for this claim</div>;
  }

  return (
    <div className="provenance-tree">
      {trace.steps.map((step, index) => {
        const indent = index;
        const isRoot = index === trace.steps.length - 1;
        const isPeeked = peekedId === step.node.id;
        return (
          <div
            key={step.node.id}
            className={`provenance-tree__step ${
              isRoot ? "provenance-tree__step--root" : ""
            } ${isPeeked ? "provenance-tree__step--peeked" : ""}`}
            style={{ paddingLeft: indent * 14 }}
          >
            {step.viaEdge?.type && (
              <TypedEdge type={step.viaEdge.type} arrow="left" />
            )}
            <TypedObjectChip
              kind={kindOf(step.node.type)}
              id={step.node.id}
              label={step.node.title}
              size="sm"
              onClick={() =>
                setPeekedId((current) =>
                  current === step.node.id ? null : step.node.id
                )
              }
            />
            {isRoot && (
              <span style={{ color: "var(--color-ink-tertiary)", fontSize: 9, letterSpacing: "0.16em" }}>
                ROOT
              </span>
            )}
          </div>
        );
      })}
      {peekedNode && (
        <div className="provenance-tree__peek" role="region" aria-label="Node detail">
          <div className="provenance-tree__peek-head">
            <span className="provenance-tree__peek-label">peek</span>
            <code className="provenance-tree__peek-id">{peekedNode.id}</code>
          </div>
          {peekedNode.title && (
            <div className="provenance-tree__peek-title">{peekedNode.title}</div>
          )}
          {peekedNode.status && (
            <div className="provenance-tree__peek-status">
              status: <code>{peekedNode.status}</code>
            </div>
          )}
          {peekedNode.data && Object.keys(peekedNode.data).length > 0 && (
            <pre className="provenance-tree__peek-data">
              {JSON.stringify(peekedNode.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function kindOf(type: SpineNode["type"]): TypedObjectKind {
  switch (type) {
    case "actionOption":
      return "action";
    case "claim":
      return "claim";
    case "hypothesis":
      return "hypothesis";
    case "anomaly":
      return "anomaly";
    case "observation":
      return "observation";
    case "evidence":
      return "evidence";
    case "track":
      return "track";
    case "reviewRule":
      return "rule";
    case "case":
      return "case";
    default:
      return "entity";
  }
}
