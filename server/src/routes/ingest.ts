import { ApiError, type OperationalStore } from "../domain/ontology.ts";
import { injectPerturbation } from "../replay/scenario.ts";
import type { RouteApp } from "./common.ts";
import { jsonBody, routeError } from "./common.ts";

interface PerturbBody {
  scenario_run_id?: string;
  scenarioRunId?: string;
  source?: string;
  observedAt?: string;
  observed_at?: string;
  lat?: number;
  lon?: number;
  label?: string;
}

export function registerIngestRoutes(app: RouteApp, store: OperationalStore): void {
  app.post("/perturb", async (context) => {
    try {
      const body = await jsonBody<PerturbBody>(context);
      const observedAt = body.observedAt ?? body.observed_at;

      if (!observedAt || typeof body.lat !== "number" || typeof body.lon !== "number") {
        throw new ApiError(
          400,
          "INVALID_PERTURBATION",
          "Perturbation requires observedAt, lat, and lon.",
          "Send JSON like { observedAt, lat, lon, label }."
        );
      }

      const state = await injectPerturbation(store, {
        scenarioRunId: body.scenarioRunId ?? body.scenario_run_id,
        source: body.source,
        observedAt,
        lat: body.lat,
        lon: body.lon,
        label: body.label
      });

      return context.json({ status: "ok", state });
    } catch (error) {
      return routeError(context, error);
    }
  });
}
