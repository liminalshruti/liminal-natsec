import { useEffect, useState } from "react";

import type { ReviewRuleApplication } from "../lib/spineGraph.ts";
import { eventIdFromCaseId } from "../lib/spineGraph.ts";
import { loadSavedRules } from "../lib/reviewRulesStore.ts";

interface CaseHandoffBannerProps {
  caseId: string | null;
  ruleApplication: ReviewRuleApplication | null;
}

export function CaseHandoffBanner({
  caseId,
  ruleApplication
}: CaseHandoffBannerProps) {
  const [hasSavedRule, setHasSavedRule] = useState(false);

  useEffect(() => {
    setHasSavedRule(loadSavedRules().some((rule) => rule.active));
    function onStorage(event: StorageEvent) {
      if (event.key === "seaforge:review-rules:v1") {
        setHasSavedRule(loadSavedRules().some((rule) => rule.active));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [caseId]);

  if (!ruleApplication || !ruleApplication.changed) return null;
  const eventId = eventIdFromCaseId(caseId);
  if (eventId !== "event-2") return null;

  return (
    <div className="handoff-banner" role="status" aria-live="polite">
      <div className="handoff-banner__title">
        <span className="handoff-banner__pip" aria-hidden />
        Prior review rule changed this recommendation
      </div>
      <div className="handoff-banner__body">
        <code>{ruleApplication.ruleId}</code> applied because the case matched
        <span className="handoff-banner__cond">
          {" "}
          claim_kind=custody_hypothesis · trigger=identity_churn · corroboration=false
        </span>
        .
      </div>
      <div className="handoff-banner__diff">
        <span className="handoff-banner__before">
          prior top → <code>{shortId(ruleApplication.priorTopActionId)}</code>
        </span>
        <span className="handoff-banner__arrow">⇒</span>
        <span className="handoff-banner__after">
          now → <code>{shortId(ruleApplication.recommendedActionId)}</code>
        </span>
      </div>
      {!hasSavedRule && (
        <div className="handoff-banner__hint">
          Tip: save R-001 below to persist this rule across sessions.
        </div>
      )}
    </div>
  );
}

function shortId(id: string): string {
  if (id.length <= 28) return id;
  return `${id.slice(0, 12)}…${id.slice(-12)}`;
}
