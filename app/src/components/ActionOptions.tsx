import { rankActionsForDisplay } from "../lib/actionRanking.ts";
import type { ReviewRuleApplication, SpineNode } from "../lib/spineGraph.ts";
import { TypedObjectChip } from "./TypedObjectChip.tsx";

interface ActionOptionsProps {
  actions: SpineNode[];
  ruleApplication: ReviewRuleApplication | null;
}

export function ActionOptions({ actions, ruleApplication }: ActionOptionsProps) {
  if (actions.length === 0) {
    return <div className="empty">no actions ranked for this case</div>;
  }
  const ranked = rankActionsForDisplay(actions, ruleApplication);
  // The rule-fire moment in textual form: when ruleApplication.changed is
  // true, exactly one row carries PRIOR TOP and one row carries RECOMMENDED.
  // The visual diff between those two rows IS the make-or-break beat in the
  // forensic surface — Zone 1 shows it as a verb crossfade; here it shows
  // as a labeled action diff.
  const ruleChanged = Boolean(ruleApplication?.changed);
  return (
    <div className="action-list">
      {ranked.map((entry, index) => {
        const data = (entry.node.data ?? {}) as Record<string, unknown>;
        const kind =
          typeof data.kind === "string" ? (data.kind as string) : null;
        const status = entry.isRecommended
          ? "recommended"
          : entry.wasPriorTop
          ? "prior top"
          : index === 0
          ? "primary"
          : null;
        const rowClass = entry.isRecommended
          ? "action-list__row action-list__row--recommended"
          : entry.wasPriorTop
          ? "action-list__row action-list__row--prior"
          : "action-list__row";
        const tagText = entry.isRecommended
          ? "RECOMMENDED"
          : entry.wasPriorTop
          ? "PRIOR TOP"
          : index === 0
          ? "PRIMARY"
          : null;
        return (
          <div key={entry.node.id} className={rowClass} data-rule-fire={ruleChanged}>
            <div className="action-list__row-head">
              <TypedObjectChip
                kind="action"
                id={entry.node.id}
                label={entry.node.title}
                status={status}
                size="sm"
              />
              {tagText && (
                <span
                  className="action-list__row-tag"
                  data-tag={tagText.toLowerCase().replace(/\s+/g, "-")}
                >
                  {tagText}
                </span>
              )}
            </div>
            {kind && <div className="action-list__kind">{kind}</div>}
          </div>
        );
      })}
    </div>
  );
}
