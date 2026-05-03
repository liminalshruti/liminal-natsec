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
  const recommendedId = ruleApplication?.recommendedActionId;
  const priorTopId = ruleApplication?.priorTopActionId;
  const ranked = orderByDefaultPriority(actions);
  return (
    <>
      <div className="subhead">Action Options</div>
      {ranked.map((node, index) => {
        const data = (node.data ?? {}) as Record<string, unknown>;
        const kind = typeof data.kind === "string" ? (data.kind as string) : node.title;
        const isRecommended = recommendedId === node.id;
        const wasPriorTop = priorTopId === node.id;
        const tagClass = isRecommended
          ? "tag tag--ok"
          : wasPriorTop && ruleApplication?.changed
          ? "tag tag--warn"
          : index === 0
          ? "tag tag--accent"
          : "tag";
        const tagText = isRecommended
          ? "RECOMMENDED"
          : wasPriorTop && ruleApplication?.changed
          ? "WAS TOP"
          : `#${index + 1}`;
        return (
          <div key={node.id} className="action-row">
            <div className="action-row__title">
              <span>{node.title}</span>
              <span className={tagClass}>{tagText}</span>
            </div>
            <div className="action-row__sub">{kind}</div>
          </div>
        );
      })}
    </>
  );
}

function orderByDefaultPriority(actions: SpineNode[]): SpineNode[] {
  return [...actions].sort((a, b) => {
    const pa = priorityOf(a);
    const pb = priorityOf(b);
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });
}

function priorityOf(node: SpineNode): number {
  const data = (node.data ?? {}) as Record<string, unknown>;
  if (typeof data.defaultPriority === "number") return data.defaultPriority as number;
  if (typeof data.priority === "number") return data.priority as number;
  return 99;
}
