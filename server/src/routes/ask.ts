import { askPiAi, piAiAvailable, piAiStatus } from "../specialists/pi-ai.ts";
import { jsonBody, type RouteApp, type RouteContext } from "./common.ts";

export interface AskRequestBody {
  question: string;
  context?: unknown;
}

export interface AskRouteError {
  error: string;
  code: "INVALID_INPUT" | "NOT_CONFIGURED" | "INTERNAL";
  detail?: string;
}

export interface AskRouteResponse {
  status: number;
  body: { answer: string; model: string; source: string } | AskRouteError;
}

const QUESTION_MAX_LENGTH = 2000;

export async function handleAskRoute(body: unknown): Promise<AskRouteResponse> {
  if (!body || typeof body !== "object") {
    return {
      status: 400,
      body: {
        error: "request body must be an object",
        code: "INVALID_INPUT",
        detail: "POST { question: string, context?: unknown }"
      }
    };
  }

  const { question, context } = body as Partial<AskRequestBody>;
  if (typeof question !== "string" || !question.trim()) {
    return {
      status: 400,
      body: { error: "question is required", code: "INVALID_INPUT" }
    };
  }
  if (question.length > QUESTION_MAX_LENGTH) {
    return {
      status: 400,
      body: {
        error: `question exceeds ${QUESTION_MAX_LENGTH} characters`,
        code: "INVALID_INPUT"
      }
    };
  }

  if (!piAiAvailable()) {
    const status = piAiStatus();
    return {
      status: 503,
      body: {
        error: "Pi-AI is not configured",
        code: "NOT_CONFIGURED",
        detail: status.detail
      }
    };
  }

  try {
    const result = await askPiAi(question.trim(), context);
    return {
      status: 200,
      body: { answer: result.answer, model: result.model, source: result.source }
    };
  } catch (err) {
    return {
      status: 502,
      body: {
        error: err instanceof Error ? err.message : String(err),
        code: "INTERNAL"
      }
    };
  }
}

export function registerAskRoutes(app: RouteApp): void {
  app.post("/ask", async (context: RouteContext) => {
    const body = await jsonBody<AskRequestBody>(context);
    const result = await handleAskRoute(body);
    return context.json(result.body, result.status);
  });
}
