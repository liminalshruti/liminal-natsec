import { useEffect, useRef, useState } from "react";

import { R001_DSL } from "../../../shared/rules/builtin.ts";
import type { ReviewRuleApplication } from "../lib/spineGraph.ts";
import {
  clearSavedRules,
  loadSavedRules,
  onSavedRulesChanged,
  saveRule,
  type SavedReviewRule
} from "../lib/reviewRulesStore.ts";
import { TypedEdge, TypedObjectChip } from "./TypedObjectChip.tsx";

const SEED_RULE_ID = "rr:watchfloor:dark-gap-sar-first:v1";
const SEED_RULE_TITLE = "Hormuz Watch Box dark gap -> request SAR/RF first";
const SEED_RULE_DSL = R001_DSL;

// The default rule text the operator sees pre-populated in the writing field.
// They can edit it before saving; if they save unchanged, it commits as-is.
// Workshop principle: rule-writing should feel like writing, not clicking. The
// pre-populated text is a *suggestion in the operator's voice*, not a form field.
const SEED_RULE_DRAFT =
  "Inside Hormuz Watch Box 01, when a case matches the MMSI-111 / MV CALDERA dark-gap custody pattern during the 72-hour review window, request SAR/RF imagery before any Escalate option is offered.";

// Compact relative-time renderer for the correction stream. Watchfloor doctrine
// is chronological; the time format reads as a ledger entry, not a verbose
// timestamp. Falls back to a short ISO when the difference is large or input
// is malformed — never blank, since "no time" reads as broken in a stream.
function formatStreamTime(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso.slice(0, 19);
  }
}

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
    const refresh = () => setSavedRules(loadSavedRules());
    refresh();
    return onSavedRulesChanged(refresh);
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
          {/* STRETCH-6: rule-earning-its-weight compounding edges visual.
              Per docs/design/INSPO_TO_SURFACE_MAP.md STRETCH-6 (Source 4 ·
              Nyk · "mesh compounds visibly"). When a rule fires, the SVG
              fans out edges from the rule chip to N prior cases the rule
              now applies to — the durable-doctrine moment made visible.
              Compounding mesh; review memory as moat. */}
          {ruleApplication.changed && (
            <RuleCompoundingEdges ruleId={ruleApplication.ruleId} />
          )}
        </div>
      )}
      {caseId && !ruleApplication && (
        <div className="empty">no review rule fires on this case</div>
      )}

      {/* Correction stream — operator-authored doctrine, accumulating over
          time. Workshop principle (named explicitly): "correction stream as
          data is the moat." Visual treatment is a *ledger* — chronological,
          numbered, accumulating — not a flat list. Each entry is a durable
          act of human judgment that the system consults on every future case.
          v3.3 will add ledger-level filtering, rule-versioning, and
          rule-deprecation events. */}
      <div className="review-memory__section-header">
        <span>Watchfloor doctrine</span>
        <span className="review-memory__stream-count">
          {savedRules.length === 0
            ? "no entries"
            : savedRules.length === 1
            ? "1 entry"
            : `${savedRules.length} entries`}
        </span>
      </div>
      {savedRules.length === 0 && (
        <div className="review-memory__stream-empty">
          The doctrine is empty. Rules saved here apply on every future case.
        </div>
      )}
      <ol className="review-memory__stream">
        {savedRules.map((rule, index) => (
          <li key={rule.id} className="review-memory__stream-entry">
            <div className="review-memory__stream-marker" aria-hidden>
              <span className="review-memory__stream-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="review-memory__stream-rail" />
            </div>
            <div className="review-memory__stream-body">
              <div className="review-memory__stream-head">
                <TypedObjectChip
                  kind="rule"
                  id={rule.id}
                  label={rule.title}
                  status={rule.active ? "active" : "inactive"}
                  size="sm"
                />
                <span className="review-memory__stream-time">
                  {formatStreamTime(rule.saved_at)}
                </span>
              </div>
              <div className="review-memory__stream-dsl">{rule.dsl_text}</div>
            </div>
          </li>
        ))}
      </ol>

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

/** STRETCH-6: Rule-earning-its-weight compounding edges.
 *
 *  When R-001 fires on a case, fan out edges from the rule chip to
 *  prior cases the rule now applies to. Demo-grade — the prior cases
 *  are seeded for the demo (real graph wiring is V-Next), but the
 *  visual register is the actual point: review memory accumulates,
 *  rules earn their weight retroactively, doctrine compounds.
 *
 *  Per spec STRETCH-6 (Source 4 · Nyk · "mesh compounds visibly"):
 *    "render the rule's edges fanning out from the rule chip to every
 *     prior-case node it now touches. Compounding made visible. Judge
 *     sees the *moat* — review memory as durable doctrine."
 *
 *  Composes with SHIP-3: dried evidence in a prior case can be
 *  re-wetted by a newly-applied rule. Visual contract: dry → wet
 *  via doctrine.
 */
function RuleCompoundingEdges({ ruleId: _ruleId }: { ruleId: string }) {
  // Demo-seeded prior cases the rule now applies to. Same shape as the
  // V-Next graph traversal would yield; static for now to keep this
  // ship contained.
  const priorCases = [
    { id: "case_alara_01_event_2_", changed: true, label: "Event 2" },
    { id: "case_marad_2026_004_cluster_", changed: true, label: "MARAD cluster" },
    { id: "case_huge_imo9357183_", changed: false, label: "HUGE · IMO 9357183" },
    { id: "case_qeshm_anchorage_", changed: false, label: "Qeshm anchorage" }
  ];

  const changedCount = priorCases.filter((c) => c.changed).length;

  return (
    <div className="rule-compounding" role="region" aria-label="Rule retroactive application">
      <div className="rule-compounding__head">
        <span className="rule-compounding__lead">RULE EARNING ITS WEIGHT</span>
        <span className="rule-compounding__count">
          {changedCount}/{priorCases.length} prior cases re-ranked
        </span>
      </div>
      <svg
        className="rule-compounding__svg"
        viewBox="0 0 320 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Source node — the rule chip pivot */}
        <circle cx="40" cy="60" r="5" className="rule-compounding__source" />
        {priorCases.map((c, i) => {
          const y = 18 + i * 28;
          return (
            <g key={c.id} className={`rule-compounding__edge${c.changed ? " rule-compounding__edge--changed" : ""}`}>
              <path
                d={`M 45 60 Q 160 ${(60 + y) / 2} 290 ${y}`}
                className="rule-compounding__path"
                fill="none"
              />
              <circle
                cx="290"
                cy={y}
                r={c.changed ? 4 : 3}
                className={`rule-compounding__target${
                  c.changed ? " rule-compounding__target--changed" : ""
                }`}
              />
            </g>
          );
        })}
      </svg>
      <ul className="rule-compounding__list">
        {priorCases.map((c) => (
          <li
            key={c.id}
            className={`rule-compounding__item${
              c.changed ? " rule-compounding__item--changed" : ""
            }`}
          >
            <span
              className="rule-compounding__pip"
              aria-hidden="true"
            >
              {c.changed ? "●" : "○"}
            </span>
            <code className="rule-compounding__case-id">{c.id}</code>
            <span className="rule-compounding__case-label">{c.label}</span>
            <span className="rule-compounding__verdict">
              {c.changed ? "RE-RANKED" : "UNCHANGED"}
            </span>
          </li>
        ))}
      </ul>
      <div className="rule-compounding__footer">
        the rule fires on cases this case never knew about · doctrine compounds
      </div>
    </div>
  );
}
