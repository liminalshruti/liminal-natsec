import type { SpineNode } from "../lib/spineGraph.ts";

interface HypothesisBoardProps {
  hypotheses: SpineNode[];
}

export function HypothesisBoard({ hypotheses }: HypothesisBoardProps) {
  if (hypotheses.length === 0) {
    return (
      <>
        <div className="subhead">Hypothesis Board</div>
        <div className="empty">no hypotheses for this case</div>
      </>
    );
  }
  return (
    <>
      <div className="subhead">Hypothesis Board</div>
      {hypotheses.slice(0, 3).map((node) => {
        const data = (node.data ?? {}) as Record<string, unknown>;
        const posterior = typeof data.posterior === "number" ? data.posterior : null;
        const status = node.status ?? (typeof data.status === "string" ? data.status : "unresolved");
        return (
          <div key={node.id} className="action-row">
            <div className="action-row__title">
              <span>{node.title}</span>
              <span className="tag tag--accent">
                {posterior == null ? "—" : `${(posterior * 100).toFixed(0)}%`}
              </span>
            </div>
            <div className="action-row__sub">{status}</div>
          </div>
        );
      })}
    </>
  );
}
