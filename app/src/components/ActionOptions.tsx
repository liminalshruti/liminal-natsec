import { rankActionsForDisplay } from "../lib/actionRanking.ts";
import type { ReviewRuleApplication, SpineNode } from "../lib/spineGraph.ts";

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
      {ranked.map((entry, index) => {
        const data = (entry.node.data ?? {}) as Record<string, unknown>;
        const kind =
          typeof data.kind === "string" ? (data.kind as string) : entry.node.title;
        const tagClass = entry.isRecommended
          ? "tag tag--ok"
          : entry.wasPriorTop
          ? "tag tag--warn"
          : index === 0
          ? "tag tag--accent"
          : "tag";
        const tagText = entry.isRecommended
          ? "RECOMMENDED"
          : entry.wasPriorTop
          ? "PRIOR TOP"
          : `#${index + 1}`;
        return (
          <div key={entry.node.id} className="action-row">
            <div className="action-row__title">
              <span>{entry.node.title}</span>
              <span className={tagClass}>{tagText}</span>
            </div>
            <div className="action-row__sub">{kind}</div>
          </div>
        );
      })}
    </>
  );
}
