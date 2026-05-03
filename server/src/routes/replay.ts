import type { OperationalStore } from "../domain/ontology.ts";
import { resetReplay, runFixtureReplay } from "../replay/scenario.ts";
import type { RouteApp } from "./common.ts";
import { jsonBody, routeError } from "./common.ts";

interface ReplayRunBody {
  scenario_run_id?: string;
  scenarioRunId?: string;
}

export function registerReplayRoutes(app: RouteApp, store: OperationalStore): void {
  app.post("/replay/run", async (context) => {
    try {
      const body = await jsonBody<ReplayRunBody>(context);
      const replay = await runFixtureReplay(store, {
        scenarioRunId: body.scenarioRunId ?? body.scenario_run_id
      });
      return context.json(replay);
    } catch (error) {
      return routeError(context, error);
    }
  });

  app.post("/replay/reset", async (context) => {
    try {
      await resetReplay(store);
      return context.json({
        status: "ok",
        cleared: true
      });
    } catch (error) {
      return routeError(context, error);
    }
  });
}
