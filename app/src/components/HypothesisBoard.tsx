import { useMemo } from "react";

import {
  evidenceForClaim,
  statusForHypothesis,
  type SpineNode
} from "../lib/spineGraph.ts";
import { ConfidenceBar } from "./ConfidenceBar.tsx";

interface HypothesisBoardProps {
  hypotheses: SpineNode[];
  primaryClaimId: string | null;
  selectedHypothesisId: string | null;
  onSelectHypothesis: (id: string) => void;
}

export function HypothesisBoard({
  hypotheses,
  primaryClaimId,
  selectedHypothesisId,
  onSelectHypothesis
}: HypothesisBoardProps) {
  const counts = useMemo(() => {
    if (!primaryClaimId) return { supports: 0, weakens: 0, contradicts: 0 };
    const evidence = evidenceForClaim(primaryClaimId);
    return {
      supports: evidence.supports.length,
      weakens: evidence.weakens.length,
      contradicts: evidence.contradicts.length
    };
  }, [primaryClaimId]);

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
        const posterior =
          typeof data.posterior === "number" ? (data.posterior as number) : null;
        const status = statusForHypothesis(node.id, primaryClaimId);
        const isSelected = node.id === selectedHypothesisId;
        const tagClass =
          status === "primary"
            ? "tag tag--ok"
            : status === "alternative"
            ? "tag tag--warn"
            : "tag";
        const tagText =
          status === "primary"
            ? "PRIMARY"
            : status === "alternative"
            ? "ALTERNATIVE"
            : "UNATTACHED";
        return (
          <div
            key={node.id}
            className="action-row"
            data-active={isSelected}
            role="button"
            tabIndex={0}
            onClick={() => onSelectHypothesis(node.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectHypothesis(node.id);
              }
            }}
            style={{
              cursor: "pointer",
              outline: isSelected ? "1px solid var(--accent)" : undefined
            }}
          >
            <div className="action-row__title">
              <span>{node.title}</span>
              <span className={tagClass} style={{ fontSize: 9 }}>
                {tagText}
              </span>
            </div>
            <ConfidenceBar
              value={posterior}
              variant={status === "primary" ? "primary" : "default"}
              label={`posterior probability ${posterior == null ? "unknown" : posterior.toFixed(2)}`}
            />
            <div
              className="action-row__sub"
              style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
            >
              {status === "primary" && (
                <span style={{ color: "var(--fg-2)" }}>
                  evidence {counts.supports}+ · {counts.weakens}− · {counts.contradicts}✕
                </span>
              )}
              {node.status && (
                <span style={{ color: "var(--fg-2)" }}>{node.status}</span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
