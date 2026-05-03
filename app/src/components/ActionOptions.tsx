import type { ReviewRuleApplication, SpineNode } from "../lib/spineGraph.ts";
import { rankActionsForDisplay } from "../lib/actionRanking.ts";

interface ActionOptionsProps {
  actions: SpineNode[];
  ruleApplication: ReviewRuleApplication | null;
}

export function ActionOptions({ actions, ruleApplication }: ActionOptionsProps) {
  if (actions.length === 0) {
    return (
      <>
        <div className="subhead">Action Options</div>
        <div className="empty">no actions ranked for this case</div>
      </>
    );
  }
  const ranked = rankActionsForDisplay(actions, ruleApplication);
  return (
    <>
      <div className="subhead">Action Options</div>
      {ranked.map((action, index) => {
        const tagClass = action.isRecommended
          ? "tag tag--ok"
          : action.wasPriorTop && ruleApplication?.changed
          ? "tag tag--warn"
          : index === 0
          ? "tag tag--accent"
          : "tag";
        const tagText = action.isRecommended
          ? "RECOMMENDED"
          : action.wasPriorTop && ruleApplication?.changed
          ? "WAS TOP"
          : `#${index + 1}`;
        return (
          <div key={action.node.id} className="action-row">
            <div className="action-row__title">
              <span>{action.node.title}</span>
              <span className={tagClass}>{tagText}</span>
            </div>
            <div className="action-row__sub">
              {action.actionType}
              {ruleApplication && (
                <span style={{ color: "var(--fg-2)" }}>
                  {" "}
                  · score {action.score.toFixed(2)}
                  {action.score !== action.priorScore
                    ? ` from ${action.priorScore.toFixed(2)}`
                    : ""}
                </span>
              )}
            </div>
            {action.trigger && (
              <div className="action-row__sub" style={{ marginTop: 3 }}>
                {action.trigger}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
