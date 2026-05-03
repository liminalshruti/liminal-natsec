// Builds the JSON payload sent to the Pi-AI /ask endpoint as "case data".
// Bundles the full scenario state, the spine fixtures (anomalies, hypotheses,
// claims, evidence, actions, observations) and the Hormuz intel summary.
// Field order is intentional: the most operationally relevant data comes
// first so that if the server truncates the serialized payload, the tail of
// the prompt drops the lowest-signal context.

import type { LoadedScenario } from "./fixtures.ts";

import anomalyFixtures from "../../../fixtures/maritime/anomalies.json" with { type: "json" };
import hypothesisFixtures from "../../../fixtures/maritime/hypotheses.json" with { type: "json" };
import claimFixtures from "../../../fixtures/maritime/claims.json" with { type: "json" };
import evidenceFixtures from "../../../fixtures/maritime/evidence.json" with { type: "json" };
import actionFixtures from "../../../fixtures/maritime/actions.json" with { type: "json" };
import observationFixtures from "../../../fixtures/maritime/observations.json" with { type: "json" };
import hormuzIntelSummary from "../../../fixtures/maritime/hormuz-intel-summary.json" with { type: "json" };

export interface AskContext {
  selectedAlertId: string | null;
  selectedAlert: unknown;
  scenario: unknown;
  spine: {
    anomalies: unknown;
    hypotheses: unknown;
    claims: unknown;
    evidence: unknown;
    actions: unknown;
    observations: unknown;
  };
  hormuzIntelSummary: unknown;
}

export function buildAskContext(
  scenario: LoadedScenario | null,
  selectedAlertId: string | null
): AskContext {
  const state = scenario?.state ?? null;
  const selectedAlert =
    state && selectedAlertId
      ? state.alerts.find((alert) => alert.id === selectedAlertId) ?? null
      : null;

  return {
    selectedAlertId,
    selectedAlert,
    scenario: state
      ? {
          scenarioRunId: state.scenarioRunId,
          seededAt: state.seededAt,
          mode: state.mode,
          strictReal: state.strictReal,
          caseGenerationStatus: state.caseGenerationStatus,
          lastRefreshAt: state.lastRefreshAt,
          emptyReason: state.emptyReason,
          sourceStatuses: state.sourceStatuses,
          alerts: state.alerts,
          hypotheses: state.hypotheses,
          claims: state.claims,
          actions: state.actions
        }
      : null,
    spine: {
      anomalies: anomalyFixtures,
      hypotheses: hypothesisFixtures,
      claims: claimFixtures,
      evidence: evidenceFixtures,
      actions: actionFixtures,
      observations: observationFixtures
    },
    hormuzIntelSummary
  };
}
