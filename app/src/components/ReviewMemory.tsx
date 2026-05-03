import { useEffect, useState } from "react";

import type { ReviewRuleApplication } from "../lib/spineGraph.ts";
import {
  loadSavedRules,
  saveRule,
  type SavedReviewRule
} from "../lib/reviewRulesStore.ts";

const SEED_RULE_ID = "rr:watchfloor:dark-gap-sar-first:v1";
const SEED_RULE_DSL =
  'WHEN claim_kind == "custody_hypothesis" AND trigger == "identity_churn" AND corroboration == false ' +
  'THEN block("escalate_watch_officer"), prefer("request_eo_sar_collection")';

interface ReviewMemoryProps {
  ruleApplication: ReviewRuleApplication | null;
  caseId: string | null;
}

export function ReviewMemory({ ruleApplication, caseId }: ReviewMemoryProps) {
  const [savedRules, setSavedRules] = useState<SavedReviewRule[]>([]);

  useEffect(() => {
    setSavedRules(loadSavedRules());
  }, []);

  function handleSaveSeed() {
    const rule: SavedReviewRule = {
      id: SEED_RULE_ID,
      title: "Dark gap → request SAR/RF first",
      dsl_text: SEED_RULE_DSL,
      saved_at: new Date().toISOString(),
      active: true
    };
    setSavedRules(saveRule(rule));
  }

  return (
    <>
      <div className="subhead">Review Memory</div>
      {!caseId && <div className="empty">no case selected</div>}
      {caseId && ruleApplication && (
        <div className="action-row">
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
              {truncId(ruleApplication.priorTopActionId)} →{" "}
              {truncId(ruleApplication.recommendedActionId)}
            </div>
          )}
        </div>
      )}
      {caseId && !ruleApplication && (
        <div className="empty">no review rule fires on this case</div>
      )}
      <div className="subhead">Saved Rules ({savedRules.length})</div>
      {savedRules.length === 0 && (
        <div className="empty">no rules saved yet</div>
      )}
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
        </div>
      ))}
      <button
        type="button"
        style={{ marginTop: 6, fontSize: 11 }}
        onClick={handleSaveSeed}
      >
        + save R-001 to memory
      </button>
    </>
  );
}

function truncId(id: string): string {
  if (id.length <= 28) return id;
  return `${id.slice(0, 12)}…${id.slice(-12)}`;
}
