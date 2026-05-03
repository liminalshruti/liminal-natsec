import { Graph } from "./graph.ts";
import type { SpineNode } from "./schema.ts";

type Scalar = string | number | boolean | null;
type Operator = "==" | "!=" | "<" | ">" | "<=" | ">=";
type EffectKind = "boost" | "prefer" | "downgrade" | "block";

export interface RuleCondition {
  path: string;
  operator: Operator;
  value: Scalar;
}

export interface RuleEffect {
  kind: EffectKind;
  actionType?: string;
  actionId?: string;
  delta?: number;
}

export interface ReviewRuleApplication {
  caseId: string;
  ruleId: string;
  priorTopActionId: string;
  recommendedActionId: string;
  changed: boolean;
  appliedEffects: RuleEffect[];
  scoredActions: Array<{
    actionId: string;
    actionType?: string;
    priorScore: number;
    score: number;
    blocked: boolean;
  }>;
}

interface ActionCandidate {
  node: SpineNode;
  actionType?: string;
  priorScore: number;
  score: number;
  blocked: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dataOf(node: SpineNode): Record<string, unknown> {
  return isRecord(node.data) ? node.data : {};
}

function valueAtPath(input: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (!isRecord(current)) {
      return undefined;
    }
    return current[key];
  }, input);
}

function compareValues(actual: unknown, operator: Operator, expected: Scalar): boolean {
  switch (operator) {
    case "==":
      return actual === expected;
    case "!=":
      return actual !== expected;
    case "<":
      return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case ">":
      return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "<=":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case ">=":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
  }
}

function conditionRecords(input: unknown): RuleCondition[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((item): item is RuleCondition => {
    return (
      isRecord(item) &&
      typeof item.path === "string" &&
      typeof item.operator === "string" &&
      ["==", "!=", "<", ">", "<=", ">="].includes(item.operator) &&
      ("value" in item)
    );
  });
}

function effectRecords(input: unknown): RuleEffect[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((item): item is RuleEffect => {
    return (
      isRecord(item) &&
      typeof item.kind === "string" &&
      ["boost", "prefer", "downgrade", "block"].includes(item.kind)
    );
  });
}

function ruleMatches(rule: SpineNode, target: SpineNode): boolean {
  const ruleData = dataOf(rule);
  if (ruleData.active === false) {
    return false;
  }

  const targetContext = {
    id: target.id,
    type: target.type,
    ...dataOf(target)
  };

  const conditions = conditionRecords(ruleData.conditions);
  return conditions.length > 0
    ? conditions.every((condition) =>
        compareValues(valueAtPath(targetContext, condition.path), condition.operator, condition.value)
      )
    : false;
}

function numericValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function actionCandidates(graph: Graph, caseId: string): ActionCandidate[] {
  const fromEdges = graph.outgoing(caseId, "RECOMMENDS");
  const linked = fromEdges
    .map((edge) => graph.getNode(edge.to))
    .filter((node): node is SpineNode => node?.type === "actionOption");

  const source = linked.length > 0
    ? linked
    : graph.getNodes("actionOption").filter((node) => {
        const data = dataOf(node);
        return data.caseId === caseId || node.case_id === caseId;
      });

  return source.map((node) => {
    const data = dataOf(node);
    const priorScore = numericValue(
      data.baseScore,
      numericValue(data.ranking_score, numericValue(data.score, 0))
    );
    const actionType =
      typeof data.actionType === "string"
        ? data.actionType
        : typeof data.kind === "string"
          ? data.kind
          : undefined;

    return {
      node,
      actionType,
      priorScore,
      score: priorScore,
      blocked: data.blocked === true
    };
  });
}

function topAction(actions: ActionCandidate[]): ActionCandidate | undefined {
  return actions
    .filter((action) => !action.blocked)
    .sort((left, right) => {
      const scoreDelta = right.score - left.score;
      return scoreDelta === 0 ? left.node.id.localeCompare(right.node.id) : scoreDelta;
    })[0];
}

function effectTargets(effect: RuleEffect, action: ActionCandidate): boolean {
  if (effect.actionId && effect.actionId !== action.node.id) {
    return false;
  }

  if (effect.actionType && effect.actionType !== action.actionType) {
    return false;
  }

  return Boolean(effect.actionId || effect.actionType);
}

function applyEffects(actions: ActionCandidate[], effects: RuleEffect[]): void {
  for (const effect of effects) {
    for (const action of actions) {
      if (!effectTargets(effect, action)) {
        continue;
      }

      if (effect.kind === "block") {
        action.blocked = true;
      } else if (effect.kind === "prefer") {
        action.score += numericValue(effect.delta, 100);
      } else if (effect.kind === "downgrade") {
        action.score -= numericValue(effect.delta, 1);
      } else if (effect.kind === "boost") {
        action.score += numericValue(effect.delta, 1);
      }
    }
  }
}

export function applyReviewRules(graph: Graph, caseId: string): ReviewRuleApplication | null {
  const target = graph.requireNode(caseId);
  if (target.type !== "case") {
    throw new Error(`Expected case node: ${caseId}`);
  }

  const actions = actionCandidates(graph, caseId);
  const priorTop = topAction(actions);
  if (!priorTop) {
    return null;
  }

  const rules = graph.getNodes("reviewRule").filter((rule) => ruleMatches(rule, target));
  for (const rule of rules) {
    const effects = effectRecords(dataOf(rule).effects);
    if (effects.length === 0) {
      continue;
    }

    const adjusted = actions.map((action) => ({ ...action }));
    applyEffects(adjusted, effects);
    const recommendation = topAction(adjusted);
    if (!recommendation) {
      continue;
    }

    return {
      caseId,
      ruleId: rule.id,
      priorTopActionId: priorTop.node.id,
      recommendedActionId: recommendation.node.id,
      changed: priorTop.node.id !== recommendation.node.id,
      appliedEffects: effects,
      scoredActions: adjusted.map((action) => ({
        actionId: action.node.id,
        actionType: action.actionType,
        priorScore: action.priorScore,
        score: action.score,
        blocked: action.blocked
      }))
    };
  }

  return null;
}
