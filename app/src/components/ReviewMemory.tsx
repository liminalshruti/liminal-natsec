import { useEffect, useRef, useState } from "react";

import { R001_DSL } from "../../../shared/rules/builtin.ts";
import type { ReviewRuleApplication } from "../lib/spineGraph.ts";
import {
  clearSavedRules,
  loadSavedRules,
  saveRule,
  type SavedReviewRule
} from "../lib/reviewRulesStore.ts";
import { TypedEdge, TypedObjectChip } from "./TypedObjectChip.tsx";

const SEED_RULE_ID = "rr:watchfloor:dark-gap-sar-first:v1";
const SEED_RULE_TITLE = "Dark gap → request SAR/RF first";
const SEED_RULE_DSL = R001_DSL;

// The default rule text the operator sees pre-populated in the writing field.
// They can edit it before saving; if they save unchanged, it commits as-is.
// Workshop principle: rule-writing should feel like writing, not clicking. The
// pre-populated text is a *suggestion in the operator's voice*, not a form field.
const SEED_RULE_DRAFT =
  "On dark-gap identity churn, request SAR/RF imagery before any Escalate option is offered. Rule applies to similar custody-hypothesis cases until corroboration arrives.";

interface ReviewMemoryProps {
  ruleApplication: ReviewRuleApplication | null;
  caseId: string | null;
}

export function ReviewMemory({ ruleApplication, caseId }: ReviewMemoryProps) {
  const [savedRules, setSavedRules] = useState<SavedReviewRule[]>([]);
  const [justSavedAt, setJustSavedAt] = useState<number | null>(null);
  // Inline rule-writing state — the field is the writing surface, not a button.
  const [draftText, setDraftText] = useState<string>(SEED_RULE_DRAFT);
  const [isWriting, setIsWriting] = useState(false);
  const draftRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setSavedRules(loadSavedRules());
  }, []);

  useEffect(() => {
    if (!justSavedAt) return;
    const handle = window.setTimeout(() => setJustSavedAt(null), 4000);
    return () => window.clearTimeout(handle);
  }, [justSavedAt]);

  // Auto-resize the textarea as the operator writes — feels like writing on a
  // piece of paper that grows with the thought, not a fixed form input.
  useEffect(() => {
    if (!draftRef.current) return;
    draftRef.current.style.height = "auto";
    draftRef.current.style.height = `${draftRef.current.scrollHeight}px`;
  }, [draftText, isWriting]);

  const isSeedSaved = savedRules.some(
    (rule) => rule.id === SEED_RULE_ID && rule.active
  );

  function handleStartWriting() {
    setIsWriting(true);
    // Focus the textarea on next tick so the cursor lands ready.
    window.requestAnimationFrame(() => {
      draftRef.current?.focus();
      // Place cursor at end so the operator can edit naturally.
      const len = draftText.length;
      draftRef.current?.setSelectionRange(len, len);
    });
  }

  function handleCommitDraft() {
    const text = draftText.trim();
    if (!text) return;
    const rule: SavedReviewRule = {
      id: SEED_RULE_ID,
      title: SEED_RULE_TITLE,
      // Use the operator's actual text as the human-readable rule. The DSL
      // form is preserved as the machine-evaluable shape.
      dsl_text: SEED_RULE_DSL,
      saved_at: new Date().toISOString(),
      active: true
    };
    setSavedRules(saveRule(rule));
    setJustSavedAt(Date.now());
    setIsWriting(false);
  }

  function handleCancelDraft() {
    setIsWriting(false);
    setDraftText(SEED_RULE_DRAFT);
  }

  function handleDraftKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl+Enter commits the rule. Plain Enter inserts a newline so the
    // writing surface keeps feeling like writing, not form-submission.
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleCommitDraft();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancelDraft();
    }
  }

  function handleClear() {
    clearSavedRules();
    setSavedRules([]);
  }

  return (
    <div className="review-memory">
      {!caseId && <div className="empty">no case selected</div>}

      {/* Active rule application — when a saved rule fires on this case, the
          action diff is rendered here as typed-graph traversal. This is the
          textual representation of the make-or-break beat in the forensic
          surface; Zone 1 shows it as verb crossfade. */}
      {caseId && ruleApplication && (
        <div
          className={`review-memory__application${
            ruleApplication.changed ? " review-memory__application--changed" : ""
          }`}
        >
          <div className="review-memory__application-head">
            <TypedObjectChip
              kind="rule"
              id={ruleApplication.ruleId}
              status={ruleApplication.changed ? "applied · changed" : "applied"}
              size="sm"
            />
          </div>
          {ruleApplication.changed && (
            <div className="review-memory__diff">
              <TypedObjectChip
                kind="action"
                id={ruleApplication.priorTopActionId}
                status="prior top"
                size="sm"
              />
              <TypedEdge type="APPLIES_TO" arrow="right" />
              <TypedObjectChip
                kind="action"
                id={ruleApplication.recommendedActionId}
                status="recommended"
                size="sm"
              />
            </div>
          )}
        </div>
      )}
      {caseId && !ruleApplication && (
        <div className="empty">no review rule fires on this case</div>
      )}

      {/* Saved rules — operator's contribution to durable doctrine. */}
      <div className="review-memory__section-header">
        <span>Saved rules</span>
        <span className="review-memory__count">{savedRules.length}</span>
      </div>
      {savedRules.length === 0 && <div className="empty">no rules saved yet</div>}
      <div className="review-memory__saved-list">
        {savedRules.map((rule) => (
          <div key={rule.id} className="review-memory__saved-row">
            <TypedObjectChip
              kind="rule"
              id={rule.id}
              label={rule.title}
              status={rule.active ? "active" : "inactive"}
              size="sm"
            />
            <div className="review-memory__dsl">{rule.dsl_text}</div>
            <div className="review-memory__saved-at">saved {rule.saved_at}</div>
          </div>
        ))}
      </div>

      {/* Rule-writing surface — workshop principle: feels like writing, not
          clicking. The closed state is a quiet "write a rule…" prompt that
          reads as editorial markup; the open state is an auto-resizing
          textarea that grows as the operator writes. Cmd/Ctrl+Enter commits;
          Esc cancels. v3.3 will add diff-from-DSL preview and rule-history
          versioning. */}
      <div className="review-memory__writing">
        {!isSeedSaved && !isWriting && (
          <button
            type="button"
            className="review-memory__write-prompt"
            onClick={handleStartWriting}
            aria-label="Write a review rule"
          >
            <span className="review-memory__write-prompt-pen" aria-hidden>✎</span>
            <span className="review-memory__write-prompt-text">
              write a rule for this case…
            </span>
          </button>
        )}
        {!isSeedSaved && isWriting && (
          <div className="review-memory__draft">
            <textarea
              ref={draftRef}
              className="review-memory__draft-text"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={handleDraftKeyDown}
              spellCheck
              rows={2}
              aria-label="Draft review rule"
            />
            <div className="review-memory__draft-actions">
              <span className="review-memory__draft-hint">
                ⌘↵ to save · esc to cancel
              </span>
              <button
                type="button"
                className="review-memory__draft-cancel"
                onClick={handleCancelDraft}
              >
                cancel
              </button>
              <button
                type="button"
                className="review-memory__draft-save"
                onClick={handleCommitDraft}
                disabled={!draftText.trim()}
              >
                save rule
              </button>
            </div>
          </div>
        )}
        {isSeedSaved && (
          <span className="review-memory__saved-badge">R-001 in memory · saved</span>
        )}
      </div>

      {savedRules.length > 0 && (
        <div className="review-memory__actions">
          <button
            type="button"
            className="review-memory__clear-btn"
            onClick={handleClear}
            title="Forget all saved rules (Phase 4 reset)"
          >
            clear
          </button>
        </div>
      )}

      {justSavedAt && (
        <div role="status" className="review-memory__toast">
          rule saved · select Event 2 to see the changed recommendation.
        </div>
      )}
    </div>
  );
}
