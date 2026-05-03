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
  const { draftCases } = useDraftCase();
  const [mode, setMode] = useState<"banner" | "pill" | "hidden">("banner");
  const [autoCollapsed, setAutoCollapsed] = useState(false);
  const activeDraft = draftCases.find((draft) => draft.status === "draft") ?? null;

  // Auto-collapse banner → pill after TTL.
  useEffect(() => {
    if (mode !== "banner") return;
    const t = setTimeout(() => {
      setMode("pill");
      setAutoCollapsed(true);
    }, BANNER_TTL_MS);
    return () => clearTimeout(t);
  }, [mode]);

  // Once all drafts are promoted, the toast is no longer relevant — hide.
  useEffect(() => {
    if (!draftCases.some((draft) => draft.status === "draft")) {
      setMode("hidden");
    }
  }, [draftCases]);

  if (mode === "hidden" || !activeDraft) return null;

  const click = () => onClickDraft(activeDraft.id);

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
          AI drafts · {draftCases.filter((draft) => draft.status === "draft").length} vessels
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
              confidence {(activeDraft.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="ai-notice-banner__title">
            {draftCases.length} single-vessel drafts discovered
          </div>
          <div className="ai-notice-banner__sub">
            {activeDraft.title} · no aggregate case opened
          </div>
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
