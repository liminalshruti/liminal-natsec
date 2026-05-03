import type {
  SpecialistInput,
  SpecialistName,
  SpecialistRawOutput,
  Verdict
} from "./types.ts";

export interface AipCallOptions {
  baseUrl?: string;
  token?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

const VALID_VERDICTS: readonly Verdict[] = [
  "supported",
  "weakened",
  "contradicted",
  "refused"
];

function envBaseUrl(): string | undefined {
  return process.env.AIP_LOGIC_BASE_URL?.trim() || process.env.FOUNDRY_BASE_URL?.trim() || undefined;
}

function envToken(): string | undefined {
  return process.env.AIP_LOGIC_TOKEN?.trim() || process.env.FOUNDRY_TOKEN?.trim() || undefined;
}

export function aipAvailable(opts: AipCallOptions = {}): boolean {
  const baseUrl = opts.baseUrl ?? envBaseUrl();
  const token = opts.token ?? envToken();
  return Boolean(baseUrl && token);
}

function validateRawOutput(value: unknown): SpecialistRawOutput {
  if (!value || typeof value !== "object") {
    throw new Error("AIP response: output is not an object");
  }
  const v = value as Record<string, unknown>;
  if (!VALID_VERDICTS.includes(v.verdict as Verdict)) {
    throw new Error(`AIP response: invalid verdict ${String(v.verdict)}`);
  }
  if (typeof v.summary !== "string") {
    throw new Error("AIP response: summary must be string");
  }
  if (
    !Array.isArray(v.cited_observation_ids) ||
    !v.cited_observation_ids.every((x) => typeof x === "string")
  ) {
    throw new Error("AIP response: cited_observation_ids must be string[]");
  }
  if (typeof v.confidence !== "number") {
    throw new Error("AIP response: confidence must be number");
  }
  if (
    !Array.isArray(v.unsupported_assertions) ||
    !v.unsupported_assertions.every((x) => typeof x === "string")
  ) {
    throw new Error("AIP response: unsupported_assertions must be string[]");
  }
  return {
    verdict: v.verdict as Verdict,
    summary: v.summary,
    cited_observation_ids: v.cited_observation_ids as string[],
    confidence: v.confidence,
    unsupported_assertions: v.unsupported_assertions as string[]
  };
}

export async function callAip(
  name: SpecialistName,
  input: SpecialistInput,
  opts: AipCallOptions = {}
): Promise<SpecialistRawOutput> {
  const baseUrl = opts.baseUrl ?? envBaseUrl();
  const token = opts.token ?? envToken();
  if (!baseUrl || !token) {
    throw new Error("AIP not configured (AIP_LOGIC_BASE_URL/TOKEN missing)");
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  const url = `${baseUrl.replace(/\/$/, "")}/functions/seaforge.specialist.${name}/execute`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ input }),
    signal: opts.signal
  });

  if (!res.ok) {
    throw new Error(`AIP call failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { output?: unknown };
  if (!json || typeof json !== "object" || !("output" in json)) {
    throw new Error("AIP response: missing 'output' field");
  }
  return validateRawOutput(json.output);
}
