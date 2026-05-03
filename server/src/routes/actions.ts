import { ApiError, type ActionEnvelope, type OperationalStore } from "../domain/ontology.ts";
import { stableId } from "../domain/ids.ts";
import type { RouteApp } from "./common.ts";
import { jsonBody, routeError } from "./common.ts";

interface ReviewRuleBody {
  rule_text?: string;
  ruleText?: string;
  rule_id?: string;
  ruleId?: string;
  author?: string;
}

interface OperatorDecisionBody {
  anomaly_id?: string;
  anomalyId?: string;
  decision?: string;
  operator_id?: string;
  operatorId?: string;
  rationale?: string;
}

export function registerActionRoutes(app: RouteApp, store: OperationalStore): void {
  app.post("/review-rules", async (context) => {
    try {
      const body = await jsonBody<ReviewRuleBody>(context);
      const ruleText = body.ruleText ?? body.rule_text;
      if (!ruleText) {
        throw new ApiError(400, "INVALID_REVIEW_RULE", "Review rule text is required.");
      }

      const ruleId = body.ruleId ?? body.rule_id ?? stableId("rr", ruleText);
      const action = actionEnvelope("saveReviewRule", {
        rule_id: ruleId,
        rule_text: ruleText,
        author: body.author ?? "operator"
      });
      const result = await store.applyAction(action);

      return context.json({
        ...result,
        rule_id: ruleId
      });
    } catch (error) {
      return routeError(context, error);
    }
  });

  app.post("/operator-decisions", async (context) => {
    try {
      const body = await jsonBody<OperatorDecisionBody>(context);
      const anomalyId = body.anomalyId ?? body.anomaly_id;
      if (!anomalyId || !body.decision) {
        throw new ApiError(
          400,
          "INVALID_OPERATOR_DECISION",
          "Operator decision requires anomalyId and decision."
        );
      }

      const decisionId = stableId("od", anomalyId, body.decision, body.operatorId ?? body.operator_id ?? "");
      const action = actionEnvelope("saveOperatorDecision", {
        decision_id: decisionId,
        anomaly_id: anomalyId,
        decision: body.decision,
        operator_id: body.operatorId ?? body.operator_id ?? "operator",
        rationale: body.rationale
      });
      const result = await store.applyAction(action);

      return context.json({
        ...result,
        decision_id: decisionId
      });
    } catch (error) {
      return routeError(context, error);
    }
  });
}

function actionEnvelope(
  actionApiName: ActionEnvelope["actionApiName"],
  params: Record<string, unknown>
): ActionEnvelope {
  return {
    actionApiName,
    params,
    idempotencyKey: stableId(actionApiName, JSON.stringify(params)),
    createdAt: new Date().toISOString()
  };
}
