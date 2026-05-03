import { useEffect, useState } from "react";

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

interface ReviewMemoryProps {
  ruleApplication: ReviewRuleApplication | null;
  caseId: string | null;
}

export function ReviewMemory({ ruleApplication, caseId }: ReviewMemoryProps) {
  const [savedRules, setSavedRules] = useState<SavedReviewRule[]>([]);
  const [justSavedAt, setJustSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setSavedRules(loadSavedRules());
  }, []);

  useEffect(() => {
    if (!justSavedAt) return;
    const handle = window.setTimeout(() => setJustSavedAt(null), 4000);
    return () => window.clearTimeout(handle);
  }, [justSavedAt]);

  const isSeedSaved = savedRules.some(
    (rule) => rule.id === SEED_RULE_ID && rule.active
  );

  function handleSaveSeed() {
    const rule: SavedReviewRule = {
      id: SEED_RULE_ID,
      title: SEED_RULE_TITLE,
      dsl_text: SEED_RULE_DSL,
      saved_at: new Date().toISOString(),
      active: true
    };
    setSavedRules(saveRule(rule));
    setJustSavedAt(Date.now());
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

      <div className="review-memory__actions">
        {!isSeedSaved ? (
          <button type="button" className="review-memory__save-btn" onClick={handleSaveSeed}>
            + save R-001 to memory
          </button>
        ) : (
          <span className="review-memory__saved-badge">R-001 in memory</span>
        )}
        {savedRules.length > 0 && (
          <button
            type="button"
            className="review-memory__clear-btn"
            onClick={handleClear}
            title="Forget all saved rules (Phase 4 reset)"
          >
            clear
          </button>
        )}
      </div>

      {justSavedAt && (
        <div role="status" className="review-memory__toast">
          R-001 saved · select Event 2 to see the changed recommendation.
        </div>
      )}
    </div>
  );
}
