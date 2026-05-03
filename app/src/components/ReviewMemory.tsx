import { useEffect, useState } from "react";

import { R001_DSL } from "../../../shared/rules/builtin.ts";
import type { ReviewRuleApplication } from "../lib/spineGraph.ts";
import {
  clearSavedRules,
  loadSavedRules,
  saveRule,
  type SavedReviewRule
} from "../lib/reviewRulesStore.ts";

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
    <>
      <div className="subhead">Review Memory</div>
      {!caseId && <div className="empty">no case selected</div>}
      {caseId && ruleApplication && (
        <div className="action-row" data-rule-changed={ruleApplication.changed}>
          <div className="action-row__title">
            <span>Prior rule applied</span>
            <span className={ruleApplication.changed ? "tag tag--ok" : "tag"}>
              {ruleApplication.changed ? "RECOMMENDATION CHANGED" : "no change"}
            </span>
          </div>
          <div className="action-row__sub" style={{ wordBreak: "break-all" }}>
            {ruleApplication.ruleId}
          </div>
          {ruleApplication.changed && (
            <div className="action-row__sub" style={{ marginTop: 4 }}>
              prior <code>{shortId(ruleApplication.priorTopActionId)}</code> →
              now <code>{shortId(ruleApplication.recommendedActionId)}</code>
            </div>
          )}
        </div>
      )}
      {caseId && !ruleApplication && (
        <div className="empty">no review rule fires on this case</div>
      )}

      <div className="subhead">Saved Rules ({savedRules.length})</div>
      {savedRules.length === 0 && <div className="empty">no rules saved yet</div>}
      {savedRules.map((rule) => (
        <div key={rule.id} className="action-row">
          <div className="action-row__title">
            <span>{rule.title}</span>
            <span className={rule.active ? "tag tag--ok" : "tag"}>
              {rule.active ? "ACTIVE" : "INACTIVE"}
            </span>
          </div>
          <div
            className="action-row__sub"
            style={{ fontSize: 10, wordBreak: "break-word" }}
          >
            {rule.dsl_text}
          </div>
          <div
            className="action-row__sub"
            style={{ color: "var(--fg-2)", fontSize: 10 }}
          >
            saved {rule.saved_at}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
        {!isSeedSaved ? (
          <button type="button" style={{ fontSize: 11 }} onClick={handleSaveSeed}>
            + save R-001 to memory
          </button>
        ) : (
          <span className="tag tag--ok" style={{ fontSize: 10 }}>
            R-001 in memory
          </span>
        )}
        {savedRules.length > 0 && (
          <button
            type="button"
            style={{ fontSize: 11, color: "var(--fg-2)" }}
            onClick={handleClear}
            title="Forget all saved rules (Phase 4 reset)"
          >
            clear
          </button>
        )}
      </div>

      {justSavedAt && (
        <div
          role="status"
          style={{
            marginTop: 8,
            padding: "6px 8px",
            border: "1px solid var(--ok)",
            color: "var(--ok)",
            background: "rgba(78, 160, 138, 0.08)",
            fontSize: 11,
            borderRadius: 2
          }}
        >
          R-001 saved · select Event 2 to see the changed recommendation.
        </div>
      )}
    </>
  );
}

function shortId(id: string): string {
  if (id.length <= 28) return id;
  return `${id.slice(0, 12)}…${id.slice(-12)}`;
}
