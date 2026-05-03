import type {
  SpecialistInput,
  SpecialistName,
  SpecialistRawOutput
} from "./types.ts";
import { validateCitedObservationIds, validateRawOutput } from "./output.ts";

export interface AipCallOptions {
  baseUrl?: string;
  token?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

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
  const raw = validateRawOutput(json.output, "AIP");
  validateCitedObservationIds(input, raw, "AIP");
  return raw;
}
