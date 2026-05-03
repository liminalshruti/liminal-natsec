import type { OperationalStore } from "../domain/ontology.ts";
import { getRealScenarioState } from "../real/state.ts";
import { getScenarioState, runFixtureReplay } from "../replay/scenario.ts";
import type { RouteApp, RouteContext } from "./common.ts";
import { jsonBody, routeError } from "./common.ts";

interface ScenarioControlBody {
  command?: "play" | "pause" | "reset" | "inject_event_2";
  mode?: "real" | "demo";
  scenario_run_id?: string;
  scenarioRunId?: string;
}

export function registerScenarioRoutes(app: RouteApp, store: OperationalStore): void {
  app.post("/scenario/control", async (context) => {
    try {
      const body = await jsonBody<ScenarioControlBody>(context);
      const scenarioRunId = body.scenarioRunId ?? body.scenario_run_id;
      const mode = scenarioMode(context, body.mode);

      if (mode === "real") {
        return context.json({
          command: body.command ?? "refresh",
          state: getRealScenarioState({
            write: body.command === "reset" || body.command === "play"
          })
        });
      }

      if (body.command === "pause") {
        return context.json(await getScenarioState(store, scenarioRunId));
      }

      // inject_event_2 advances narrative phase only; the full fixture pack
      // (Event 1 + Event 2 with rule applied) already loaded on play/reset.
      // Returning current state avoids duplicate writes to curated datasets.
      if (body.command === "inject_event_2") {
        return context.json({
          command: body.command,
          state: await getScenarioState(store, scenarioRunId)
        });
      }

      const replay = await runFixtureReplay(store, {
        scenarioRunId,
        reset: body.command === "reset" || body.command === "play" || !body.command
      });
      return context.json({
        command: body.command ?? "play",
        state: replay.state
      });
    } catch (error) {
      return routeError(context, error);
    }
  });

  app.get("/scenario/state", async (context) => {
    try {
      if (scenarioMode(context) === "real") {
        return context.json(getRealScenarioState());
      }
      return context.json(await getScenarioState(store));
    } catch (error) {
      return routeError(context, error);
    }
  });

  app.get("/stream", async (context) => {
    try {
      const state = scenarioMode(context) === "real"
        ? getRealScenarioState()
        : await getScenarioState(store);
      return context.json({
        mode: "poll",
        capabilities: state.capabilities,
        state
      });
    } catch (error) {
      return routeError(context, error);
    }
  });
}

function scenarioMode(
  context: RouteContext,
  bodyMode?: "real" | "demo"
): "real" | "demo" {
  const requested = queryParam(context, "mode") ?? bodyMode ?? process.env.WATCHFLOOR_MODE;
  if (requested === "demo" || requested === "fixture") return "demo";
  return "real";
}

function queryParam(context: RouteContext, name: string): string | undefined {
  const request = context.req as {
    query?: (key: string) => string | undefined;
    url?: string;
  };
  const fromHono = request.query?.(name);
  if (fromHono) return fromHono;
  if (!request.url) return undefined;
  try {
    return new URL(request.url).searchParams.get(name) ?? undefined;
  } catch {
    return undefined;
  }
}
