import { getRealScenarioState } from "../real/state.ts";
import type { RouteApp } from "./common.ts";
import { routeError } from "./common.ts";

export function registerRealRoutes(app: RouteApp): void {
  app.get("/real/status", (context) => {
    try {
      const state = getRealScenarioState({ write: false });
      return context.json({
        mode: state.mode,
        scenarioRunId: state.scenarioRunId,
        caseGenerationStatus: state.caseGenerationStatus,
        emptyReason: state.emptyReason,
        sourceStatuses: state.sourceStatuses,
        generationSummary: state.generationSummary,
        tracksUrl: state.tracksUrl
      });
    } catch (error) {
      return routeError(context, error);
    }
  });

  app.post("/real/refresh", (context) => {
    try {
      const state = getRealScenarioState({ write: true });
      return context.json({
        mode: state.mode,
        scenarioRunId: state.scenarioRunId,
        caseGenerationStatus: state.caseGenerationStatus,
        emptyReason: state.emptyReason,
        sourceStatuses: state.sourceStatuses,
        generationSummary: state.generationSummary,
        tracksUrl: state.tracksUrl
      });
    } catch (error) {
      return routeError(context, error);
    }
  });
}
