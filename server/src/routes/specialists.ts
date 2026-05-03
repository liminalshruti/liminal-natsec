import { isSpecialistName, runSpecialist } from "../specialists/registry.ts";
import type {
  GuardedSpecialistOutput,
  SpecialistInput
} from "../specialists/types.ts";
import type { OperationalStore } from "../domain/ontology.ts";
import { jsonBody, type RouteApp, type RouteContext } from "./common.ts";

export interface SpecialistRouteRequest {
  name: string;
  body: unknown;
}

export interface SpecialistRouteError {
  error: string;
  code: "UNKNOWN_SPECIALIST" | "INVALID_INPUT" | "INTERNAL";
  hint?: string;
}

export interface SpecialistRouteResponse {
  status: number;
  body: GuardedSpecialistOutput | SpecialistRouteError;
}

function validateInput(body: unknown): SpecialistInput | SpecialistRouteError {
  if (!body || typeof body !== "object") {
    return {
      error: "request body must be an object",
      code: "INVALID_INPUT",
      hint: "POST a JSON SpecialistInput"
    };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.anomaly_id !== "string") {
    return {
      error: "anomaly_id is required",
      code: "INVALID_INPUT"
    };
  }
  if (!Array.isArray(b.evidence)) {
    return {
      error: "evidence must be an array",
      code: "INVALID_INPUT"
    };
  }
  return body as SpecialistInput;
}

export async function handleSpecialistRoute(
  req: SpecialistRouteRequest
): Promise<SpecialistRouteResponse> {
  if (!isSpecialistName(req.name)) {
    return {
      status: 400,
      body: {
        error: `unknown specialist: ${req.name}`,
        code: "UNKNOWN_SPECIALIST",
        hint: "valid names: kinematics, identity, intent, collection, visual"
      }
    };
  }

  const validated = validateInput(req.body);
  if ("code" in validated) {
    return { status: 400, body: validated };
  }

  const input: SpecialistInput = { ...validated, name: req.name };

  try {
    const guarded = await runSpecialist(req.name, input);
    return { status: 200, body: guarded };
  } catch (err) {
    return {
      status: 500,
      body: {
        error: err instanceof Error ? err.message : String(err),
        code: "INTERNAL"
      }
    };
  }
}

export function registerSpecialistRoutes(
  app: RouteApp,
  _store: OperationalStore
): void {
  app.post("/specialist/:name", async (context: RouteContext) => {
    const name = context.req.param("name");
    const body = await jsonBody<SpecialistInput>(context);
    const result = await handleSpecialistRoute({ name, body });
    return context.json(result.body, result.status);
  });
}
