import { ApiError } from "../domain/ontology.ts";

export interface RouteContext {
  req: {
    json(): Promise<unknown>;
    param(name: string): string;
  };
  json(body: unknown, status?: number): Response;
}

export interface RouteApp {
  get(path: string, handler: (context: RouteContext) => Promise<Response> | Response): void;
  post(path: string, handler: (context: RouteContext) => Promise<Response> | Response): void;
}

export async function jsonBody<T>(context: RouteContext): Promise<Partial<T>> {
  try {
    const body = await context.req.json();
    return body && typeof body === "object" ? (body as Partial<T>) : {};
  } catch {
    return {};
  }
}

export function routeError(context: RouteContext, error: unknown): Response {
  if (error instanceof ApiError) {
    return context.json(error.toBody(), error.status);
  }

  const message = error instanceof Error ? error.message : "Unknown server error.";
  return context.json(
    {
      error: message,
      code: "INTERNAL_ERROR"
    },
    500
  );
}
