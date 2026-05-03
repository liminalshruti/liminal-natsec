import { ApiError, type OperationalStore } from "../domain/ontology.ts";
import { provenanceForAction, provenanceForAnomaly } from "../replay/scenario.ts";
import type { RouteApp } from "./common.ts";
import { routeError } from "./common.ts";

export function registerProvenanceRoutes(app: RouteApp, store: OperationalStore): void {
  app.get("/provenance/:actionId", async (context) => {
    try {
      const actionId = context.req.param("actionId");
      const provenance = await provenanceForAction(actionId);
      if (!provenance) {
        throw new ApiError(404, "NOT_FOUND", `Provenance for action ${actionId} was not found.`);
      }
      return context.json(provenance);
    } catch (error) {
      return routeError(context, error);
    }
  });

  app.get("/anomalies/:id/provenance", async (context) => {
    try {
      const anomalyId = context.req.param("id");
      const provenance = await provenanceForAnomaly(store, anomalyId);
      if (!provenance) {
        throw new ApiError(404, "NOT_FOUND", `Provenance for anomaly ${anomalyId} was not found.`);
      }
      return context.json(provenance);
    } catch (error) {
      return routeError(context, error);
    }
  });
}
