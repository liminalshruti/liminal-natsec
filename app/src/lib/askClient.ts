// Client for the server's POST /ask endpoint. Sends a free-form question plus
// the current case context (built by buildAskContext) and returns the model's
// answer text. Surfaces server-side error messages so the console can render
// them in place of the answer.

const ASK_TIMEOUT_MS = 30_000;

export interface AskResponse {
  answer: string;
  model: string;
  source: string;
}

export class AskError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly detail?: string;

  constructor(message: string, status: number, code?: string, detail?: string) {
    super(message);
    this.name = "AskError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export async function askAi(
  question: string,
  context: unknown,
  signal?: AbortSignal
): Promise<AskResponse> {
  if (typeof fetch !== "function") {
    throw new AskError("fetch unavailable in this runtime", 0);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener("abort", onParentAbort, { once: true });

  try {
    const response = await fetch("/ask", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ question, context }),
      signal: controller.signal
    });

    const payload = (await response.json().catch(() => null)) as
      | { answer?: string; model?: string; source?: string; error?: string; detail?: string; code?: string }
      | null;

    if (!response.ok) {
      const message = payload?.detail || payload?.error || `Pi-AI request failed (${response.status})`;
      throw new AskError(message, response.status, payload?.code, payload?.detail);
    }

    if (!payload || typeof payload.answer !== "string") {
      throw new AskError("Pi-AI returned no answer", response.status);
    }

    return {
      answer: payload.answer,
      model: typeof payload.model === "string" ? payload.model : "unknown",
      source: typeof payload.source === "string" ? payload.source : "pi-ai"
    };
  } catch (err) {
    if (err instanceof AskError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new AskError("Pi-AI request timed out or was aborted", 0, "ABORTED");
    }
    throw new AskError(err instanceof Error ? err.message : String(err), 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onParentAbort);
  }
}
