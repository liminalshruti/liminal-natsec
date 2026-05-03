import { useMemo } from "react";

import {
  topActionForClaim,
  traceForAction,
  type ProvenanceTrace as ProvenanceTraceType,
  type SpineNode
} from "../lib/spineGraph.ts";

interface ProvenanceTraceProps {
  claimId: string | null;
}

export function ProvenanceTrace({ claimId }: ProvenanceTraceProps) {
  const trace = useMemo<ProvenanceTraceType | null>(() => {
    if (!claimId) return null;
    const action = topActionForClaim(claimId);
    if (!action) return null;
    return traceForAction(action.id);
  }, [claimId]);

  if (!claimId) {
    return (
      <>
        <div className="subhead">Provenance Trace</div>
        <div className="empty">no claim selected</div>
      </>
    );
  }
  if (!trace) {
    return (
      <>
        <div className="subhead">Provenance Trace</div>
        <div className="empty">no trace for this claim</div>
      </>
    );
  }

  return (
    <>
      <div className="subhead">Provenance Trace</div>
      <div className="trace-strip">
        {trace.steps.map((step, index) => (
          <TraceStep
            key={step.node.id}
            node={step.node}
            edgeType={step.viaEdge?.type ?? null}
            isLast={index === trace.steps.length - 1}
          />
        ))}
      </div>
      <div className="action-row__sub" style={{ marginTop: 4, color: "var(--fg-2)" }}>
        action → claim → hypothesis → anomaly → observation
      </div>
    </>
  );
}

interface TraceStepProps {
  node: SpineNode;
  edgeType: string | null;
  isLast: boolean;
}

function TraceStep({ node, edgeType, isLast }: TraceStepProps) {
  return (
    <div className="trace-step">
      {edgeType && (
        <div className="trace-step__edge" title={`via ${edgeType}`}>
          <span className="trace-step__arrow">↓</span>
          <span className="trace-step__edge-type">{edgeType}</span>
        </div>
      )}
      <div className="trace-step__node">
        <div className="trace-step__type">{labelForType(node.type)}</div>
        <div className="trace-step__title">{node.title}</div>
        <div className="trace-step__id" title={node.id}>
          {truncId(node.id)}
        </div>
      </div>
      {isLast && <div className="trace-step__terminator">root</div>}
    </div>
  );
}

function labelForType(type: SpineNode["type"]): string {
  switch (type) {
    case "actionOption":
      return "ACTION";
    case "claim":
      return "CLAIM";
    case "hypothesis":
      return "HYPOTHESIS";
    case "anomaly":
      return "ANOMALY";
    case "observation":
      return "OBSERVATION";
    default:
      return type.toUpperCase();
  }
}

function truncId(id: string): string {
  if (id.length <= 36) return id;
  return `${id.slice(0, 16)}…${id.slice(-16)}`;
}
