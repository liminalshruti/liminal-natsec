import { useMemo } from "react";

import {
  contradictionsForClaim,
  topActionForClaim,
  traceForAction,
  type ProvenanceTrace,
  type SpineNode
} from "../lib/spineGraph.ts";

interface EvidenceChainProps {
  caseId: string | null;
  claimId: string | null;
}

export function EvidenceChain({ caseId, claimId }: EvidenceChainProps) {
  const trace = useMemo<ProvenanceTrace | null>(() => {
    if (!claimId) return null;
    const action = topActionForClaim(claimId);
    if (!action) return null;
    return traceForAction(action.id);
  }, [claimId]);

  const contradictions = useMemo<SpineNode[]>(() => {
    if (!claimId) return [];
    return contradictionsForClaim(claimId);
  }, [claimId]);

  return (
    <>
      <div className="subhead">Evidence Chain</div>
      {!caseId && <div className="empty">no case selected</div>}
      {caseId && !trace && (
        <div className="empty">no provenance trace for this case</div>
      )}
      {trace && (
        <div className="action-row">
          <div className="action-row__title">
            <span>provenance · {trace.steps.length} steps</span>
            <span className="tag">graph-spine</span>
          </div>
          <div className="action-row__sub">
            {trace.nodes
              .map((node) => `${labelForType(node.type)} ${truncId(node.id)}`)
              .join(" → ")}
          </div>
        </div>
      )}
      <div className="subhead">Contradictions</div>
      {contradictions.length === 0 && (
        <div className="empty">no contradicting evidence</div>
      )}
      {contradictions.map((node) => (
        <div key={node.id} className="action-row">
          <div className="action-row__title">
            <span>{node.title}</span>
            <span className="tag tag--warn">CONTRADICTS</span>
          </div>
          <div className="action-row__sub" style={{ wordBreak: "break-all" }}>
            {node.id}
          </div>
        </div>
      ))}
    </>
  );
}

function labelForType(type: SpineNode["type"]): string {
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
    default:
      return type;
  }
}

function truncId(id: string): string {
  if (id.length <= 28) return id;
  return `${id.slice(0, 12)}…${id.slice(-12)}`;
}
