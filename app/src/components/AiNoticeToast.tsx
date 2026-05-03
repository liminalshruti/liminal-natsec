// AiNoticeToast — top-of-screen banner that announces a Liminal Agents
// discovery on demo start. Lives 8s as a full-width banner, then fades to
// a persistent low-opacity pill in the corner so judges still see "an AI
// found something" without it dominating the screen.
//
// Two visual modes:
//   - banner    full-width on first appearance, dismissable, prominent
//   - pill      collapsed corner indicator after the auto-fade
//
// Click on either mode = scroll/highlight the substrate panel's draft-case
// row. Operator action.

import { useEffect, useState } from "react";
import { useDraftCase } from "../lib/useDraftCase.ts";

const BANNER_TTL_MS = 8000;

export function AiNoticeToast({
  onClickDraft
}: {
  /** Called when the operator clicks the toast — parent should select the
   *  draft case in the substrate panel. */
  onClickDraft: (caseId: string) => void;
}) {
  const { draft } = useDraftCase();
  const [mode, setMode] = useState<"banner" | "pill" | "hidden">("banner");
  const [autoCollapsed, setAutoCollapsed] = useState(false);

  // Auto-collapse banner → pill after TTL.
  useEffect(() => {
    if (mode !== "banner") return;
    const t = setTimeout(() => {
      setMode("pill");
      setAutoCollapsed(true);
    }, BANNER_TTL_MS);
    return () => clearTimeout(t);
  }, [mode]);

  // Once promoted, the toast is no longer relevant — hide.
  useEffect(() => {
    if (draft.status === "promoted") {
      setMode("hidden");
    }
  }, [draft.status]);

  if (mode === "hidden") return null;

  const click = () => onClickDraft(draft.id);

  if (mode === "pill") {
    return (
      <button
        type="button"
        className="ai-notice-pill"
        onClick={click}
        aria-label="View AI-discovered draft case"
      >
        <span className="ai-notice-pill__pulse" aria-hidden="true" />
        <span className="ai-notice-pill__icon" aria-hidden="true">⊕</span>
        <span className="ai-notice-pill__text">
          AI draft · {draft.title}
        </span>
      </button>
    );
  }

  return (
    <div
      className="ai-notice-banner"
      role="status"
      aria-live="polite"
      data-auto-collapsed={autoCollapsed}
    >
      <button type="button" className="ai-notice-banner__body" onClick={click}>
        <span className="ai-notice-banner__icon" aria-hidden="true">◇</span>
        <div className="ai-notice-banner__content">
          <div className="ai-notice-banner__head">
            <span className="ai-notice-banner__label">LIMINAL AGENTS · DISCOVERY</span>
            <span className="ai-notice-banner__confidence">
              confidence {(draft.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="ai-notice-banner__title">{draft.title}</div>
          <div className="ai-notice-banner__sub">{draft.tagline}</div>
        </div>
        <span className="ai-notice-banner__cta">view draft ›</span>
      </button>
      <button
        type="button"
        className="ai-notice-banner__dismiss"
        onClick={(e) => {
          e.stopPropagation();
          setMode("pill");
          setAutoCollapsed(false);
        }}
        aria-label="Dismiss"
        title="Collapse to pill"
      >
        ✕
      </button>
    </div>
  );
}
