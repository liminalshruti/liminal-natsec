import { ApiError, type OperationalStore } from "../domain/ontology.ts";
import type { RouteApp } from "./common.ts";
import { routeError } from "./common.ts";

export function registerAnomalyRoutes(app: RouteApp, store: OperationalStore): void {
  app.get("/anomalies", async (context) => {
    try {
      const anomalies = await store.query({ objectType: "Anomaly" });
      return context.json({
        anomalies: anomalies
          .sort((left, right) => numeric(left.properties.rank, 999) - numeric(right.properties.rank, 999))
          .map((object) => ({
            anomaly_id: object.objectId,
            ...object.properties
          }))
      });
    } catch (error) {
      return routeError(context, error);
    }
  });

  app.get("/anomalies/:id", async (context) => {
    try {
      const id = context.req.param("id");
      const anomaly = await store.getObject({ objectType: "Anomaly", objectId: id });
      if (!anomaly) {
        throw new ApiError(404, "NOT_FOUND", `Anomaly ${id} was not found.`);
      }
      return context.json({ anomaly_id: id, ...anomaly.properties });
    } catch (error) {
      return routeError(context, error);
    }
  });
}

function numeric(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}
