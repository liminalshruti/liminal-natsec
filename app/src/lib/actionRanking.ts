import type { ReviewRuleApplication, SpineNode } from "./spineGraph.ts";

export interface RankedActionOption {
  node: SpineNode;
  actionType: string;
  trigger: string;
  priorScore: number;
  score: number;
  blocked: boolean;
  isRecommended: boolean;
  wasPriorTop: boolean;
}

export function rankActionsForDisplay(
  actions: SpineNode[],
  ruleApplication: ReviewRuleApplication | null
): RankedActionOption[] {
  const scored = new Map(
    (ruleApplication?.scoredActions ?? []).map((action) => [action.actionId, action])
  );

  return actions
    .map((node) => {
      const data = (node.data ?? {}) as Record<string, unknown>;
      const adjusted = scored.get(node.id);
      const priorScore = adjusted?.priorScore ?? numeric(data.baseScore, numeric(data.score, 0));
      const score = adjusted?.score ?? priorScore;
      const actionType = adjusted?.actionType ?? stringValue(data.actionType, node.title);

      return {
        node,
        actionType,
        trigger: stringValue(data.trigger, ""),
        priorScore,
        score,
        blocked: adjusted?.blocked ?? data.blocked === true,
        isRecommended: ruleApplication?.recommendedActionId === node.id,
        wasPriorTop: ruleApplication?.priorTopActionId === node.id
      };
    })
    .sort((left, right) => {
      if (left.blocked !== right.blocked) return left.blocked ? 1 : -1;
      const scoreDelta = right.score - left.score;
      return scoreDelta === 0
        ? left.node.id.localeCompare(right.node.id)
        : scoreDelta;
    });
}

function numeric(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}
