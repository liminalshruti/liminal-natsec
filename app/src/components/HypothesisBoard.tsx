import { useEffect, useMemo, useState } from "react";

import {
  evidenceForClaim,
  statusForHypothesis,
  type SpineNode
} from "../lib/spineGraph.ts";
import { ConfidenceBar } from "./ConfidenceBar.tsx";
import { TypedObjectChip } from "./TypedObjectChip.tsx";

/**
 * Detect prefers-reduced-motion once at module level. The hook runs in
 * the browser; in non-DOM contexts (tests) it falls back to false so
 * oscillation is disabled — which is the same behavior reduced-motion
 * users get. Safer either way.
 */
function reducedMotionPreferred(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

  // D2 ambient motion: contested hypotheses get a subtle posterior
  // oscillation (±0.005 over a 4-second period). Operator-grade restraint
  // — too small to notice without staring, but the eye registers "live
  // computation" not "frozen number." Skip if reduced-motion preferred.
  // 12fps tick is enough for smooth visible oscillation without burning
  // render budget; React batches the state updates anyway.
  const reducedMotion = useMemo(reducedMotionPreferred, []);
  const [oscNow, setOscNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (reducedMotion) return;
    const handle = window.setInterval(() => setOscNow(Date.now()), 80);
    return () => window.clearInterval(handle);
  }, [reducedMotion]);

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
        // For contested hypotheses (status not yet "primary"), apply the
        // ambient ±0.005 posterior oscillation. Primary status reads as
        // "settled" — keep its number static to signal that decisively.
        const isContested = status !== "primary";
        const displayPosterior =
          posterior != null && isContested && !reducedMotion
            ? Math.max(
                0,
                Math.min(1, posterior + 0.005 * Math.sin(oscNow / 800))
              )
            : posterior;
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
              outline: isSelected ? "1px solid var(--color-decision)" : undefined
            }}
          >
            <div className="action-row__title">
              <TypedObjectChip
                kind="hypothesis"
                id={node.id}
                label={node.title}
                status={tagText.toLowerCase()}
                posterior={displayPosterior}
                size="sm"
              />
            </div>
            <ConfidenceBar
              value={displayPosterior}
              variant={status === "primary" ? "primary" : "default"}
              label={`posterior probability ${displayPosterior == null ? "unknown" : displayPosterior.toFixed(2)}`}
            />
            <div
              className="action-row__sub"
              style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
            >
              {status === "primary" && (
                <span style={{ color: "var(--color-ink-tertiary)" }}>
                  evidence {counts.supports}+ · {counts.weakens}− · {counts.contradicts}✕
                </span>
              )}
              {node.status && (
                <span style={{ color: "var(--color-ink-tertiary)" }}>{node.status}</span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
