import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

import {
  complete as piComplete,
  getModel as piGetModel
} from "@mariozechner/pi-ai";
import { getOAuthApiKey } from "@mariozechner/pi-ai/oauth";

import {
  parseJsonObject,
  validateCitedObservationIds,
  validateRawOutput
} from "./output.ts";
import type {
  SpecialistCallResult,
  SpecialistInput,
  SpecialistName
} from "./types.ts";

type AuthSource = "pi-ai" | "codex";

interface OAuthCredentials {
  access: string;
  refresh: string;
  expires: number;
  [key: string]: unknown;
}

interface AssistantTextBlock {
  type: string;
  text?: string;
}

interface AssistantMessageLike {
  content?: AssistantTextBlock[];
  stopReason?: string;
  errorMessage?: string;
}

type CompleteImpl = (
  model: unknown,
  context: Record<string, unknown>,
  options?: Record<string, unknown>
) => Promise<AssistantMessageLike>;

type GetModelImpl = (provider: string, modelId: string) => unknown;

type GetOAuthApiKeyImpl = (
  providerId: string,
  credentials: Record<string, OAuthCredentials>
) => Promise<{ newCredentials: OAuthCredentials; apiKey: string } | null>;

export interface PiAiCallOptions {
  env?: Record<string, string | undefined>;
  existsImpl?: (path: string) => boolean;
  readFileImpl?: (path: string) => string;
  completeImpl?: CompleteImpl;
  getModelImpl?: GetModelImpl;
  getOAuthApiKeyImpl?: GetOAuthApiKeyImpl;
  now?: () => number;
  signal?: AbortSignal;
}

export interface PiAiStatus {
  status: "ok" | "NOT_CONFIGURED";
  code?: "DISABLED" | "AUTH_MISSING";
  detail: string;
  enabled: boolean;
  provider: string;
  model: string;
  piAuth: { path: string; present: boolean };
  codexAuth: { enabled: boolean; path: string; present: boolean };
}

interface ApiKeyResolution {
  apiKey: string;
  authSource: AuthSource;
}

const OAUTH_PROVIDER = "openai-codex";
const DEFAULT_MODEL = "gpt-5.4";
const DEFAULT_PI_AUTH_PATH = "~/.pi/agent/auth.json";
const DEFAULT_CODEX_AUTH_PATH = "~/.codex/auth.json";

export function piAiAvailable(options: PiAiCallOptions = {}): boolean {
  const status = piAiStatus(options);
  return status.status === "ok";
}

export function piAiStatus(options: PiAiCallOptions = {}): PiAiStatus {
  const env = options.env ?? process.env;
  const existsImpl = options.existsImpl ?? existsSync;
  const enabled = truthy(env.PI_AI_FALLBACK_ENABLED);
  const provider = env.PI_AI_PROVIDER?.trim() || OAUTH_PROVIDER;
  const model = env.PI_AI_MODEL?.trim() || env.CODEX_FALLBACK_MODEL?.trim() || DEFAULT_MODEL;
  const piAuthPath = resolveHome(env.PI_AI_AUTH_PATH || DEFAULT_PI_AUTH_PATH);
  const codexEnabled = truthy(env.CODEX_AUTH_FALLBACK_ENABLED);
  const codexAuthPath = resolveHome(env.CODEX_AUTH_PATH || DEFAULT_CODEX_AUTH_PATH);
  const piPresent = existsImpl(piAuthPath);
  const codexPresent = existsImpl(codexAuthPath);

  if (!enabled) {
    return {
      status: "NOT_CONFIGURED",
      code: "DISABLED",
      detail: "Pi-AI fallback is disabled. Set PI_AI_FALLBACK_ENABLED=true to enable it.",
      enabled,
      provider,
      model,
      piAuth: { path: piAuthPath, present: piPresent },
      codexAuth: { enabled: codexEnabled, path: codexAuthPath, present: codexPresent }
    };
  }

  if (piPresent || (codexEnabled && codexPresent)) {
    const source = piPresent ? "Pi auth" : "Codex dev auth";
    return {
      status: "ok",
      detail: `Pi-AI fallback enabled via ${source}.`,
      enabled,
      provider,
      model,
      piAuth: { path: piAuthPath, present: piPresent },
      codexAuth: { enabled: codexEnabled, path: codexAuthPath, present: codexPresent }
    };
  }

  return {
    status: "NOT_CONFIGURED",
    code: "AUTH_MISSING",
    detail: "Pi-AI fallback is enabled but no Pi auth file is present; Codex auth fallback is disabled or missing.",
    enabled,
    provider,
    model,
    piAuth: { path: piAuthPath, present: piPresent },
    codexAuth: { enabled: codexEnabled, path: codexAuthPath, present: codexPresent }
  };
}

export interface AskPiAiResult {
  answer: string;
  model: string;
  source: AuthSource;
}

const ASK_CONTEXT_BYTE_LIMIT = 80_000;

export async function askPiAi(
  question: string,
  context: unknown,
  options: PiAiCallOptions = {}
): Promise<AskPiAiResult> {
  const env = options.env ?? process.env;
  if (!truthy(env.PI_AI_FALLBACK_ENABLED)) {
    throw new Error("Pi-AI fallback is disabled");
  }

  const provider = env.PI_AI_PROVIDER?.trim() || OAUTH_PROVIDER;
  const modelId = env.PI_AI_MODEL?.trim() || env.CODEX_FALLBACK_MODEL?.trim() || DEFAULT_MODEL;
  if (provider !== OAUTH_PROVIDER) {
    throw new Error(`Pi-AI fallback currently supports provider ${OAUTH_PROVIDER}; got ${provider}`);
  }

  const { apiKey, authSource } = await resolveApiKey(options);
  const getModelImpl = options.getModelImpl ?? (piGetModel as unknown as GetModelImpl);
  const completeImpl = options.completeImpl ?? (piComplete as unknown as CompleteImpl);
  const model = getModelImpl(provider, modelId);

  const serialized = JSON.stringify(context ?? null);
  const truncated = serialized.length > ASK_CONTEXT_BYTE_LIMIT;
  const contextPayload = truncated ? serialized.slice(0, ASK_CONTEXT_BYTE_LIMIT) : serialized;

  const response = await completeImpl(
    model,
    {
      systemPrompt: askSystemPrompt(),
      messages: [
        {
          role: "user",
          content: askUserPrompt(question, contextPayload, truncated),
          timestamp: (options.now ?? Date.now)()
        }
      ]
    },
    {
      apiKey,
      signal: options.signal,
      timeoutMs: Number(env.PI_AI_TIMEOUT_MS ?? "20000"),
      maxRetries: 0,
      reasoningEffort: env.PI_AI_REASONING_EFFORT ?? "minimal",
      textVerbosity: env.PI_AI_TEXT_VERBOSITY ?? "low"
    }
  );

  if (response.stopReason === "error" || response.stopReason === "aborted") {
    throw new Error(`Pi-AI response failed: ${response.errorMessage ?? response.stopReason}`);
  }

  const answer = extractText(response);
  return { answer, model: modelId, source: authSource };
}

function askSystemPrompt(): string {
  return [
    "You are an analyst assistant for the Liminal Custody operator console.",
    "The user will ask a question about case data, which is provided as JSON.",
    "Answer concisely (no more than six sentences) in plain prose; do not use markdown formatting.",
    "Cite IDs from the JSON when relevant (e.g. anomaly ids, hypothesis ids, claim ids).",
    "If the data does not support an answer, say so plainly rather than speculating."
  ].join(" ");
}

function askUserPrompt(question: string, contextJson: string, truncated: boolean): string {
  const note = truncated
    ? "\n\n[Note: case data was truncated to fit the prompt budget.]"
    : "";
  return `Question: ${question}\n\nCase data (JSON):\n${contextJson}${note}`;
}

export async function callPiAi(
  name: SpecialistName,
  input: SpecialistInput,
  options: PiAiCallOptions = {}
): Promise<SpecialistCallResult> {
  const env = options.env ?? process.env;
  if (!truthy(env.PI_AI_FALLBACK_ENABLED)) {
    throw new Error("Pi-AI fallback is disabled");
  }

  const provider = env.PI_AI_PROVIDER?.trim() || OAUTH_PROVIDER;
  const modelId = env.PI_AI_MODEL?.trim() || env.CODEX_FALLBACK_MODEL?.trim() || DEFAULT_MODEL;
  if (provider !== OAUTH_PROVIDER) {
    throw new Error(`Pi-AI fallback currently supports provider ${OAUTH_PROVIDER}; got ${provider}`);
  }

  const { apiKey, authSource } = await resolveApiKey(options);
  const getModelImpl = options.getModelImpl ?? (piGetModel as unknown as GetModelImpl);
  const completeImpl = options.completeImpl ?? (piComplete as unknown as CompleteImpl);
  const model = getModelImpl(provider, modelId);
  const response = await completeImpl(
    model,
    {
      systemPrompt: specialistSystemPrompt(name),
      messages: [
        {
          role: "user",
          content: specialistUserPrompt(input),
          timestamp: (options.now ?? Date.now)()
        }
      ]
    },
    {
      apiKey,
      signal: options.signal,
      timeoutMs: Number(env.PI_AI_TIMEOUT_MS ?? "20000"),
      maxRetries: 0,
      reasoningEffort: env.PI_AI_REASONING_EFFORT ?? "minimal",
      textVerbosity: env.PI_AI_TEXT_VERBOSITY ?? "low"
    }
  );

  if (response.stopReason === "error" || response.stopReason === "aborted") {
    throw new Error(`Pi-AI response failed: ${response.errorMessage ?? response.stopReason}`);
  }

  const text = extractText(response);
  const parsed = parseJsonObject(text, "Pi-AI");
  const raw = validateRawOutput(parsed, "Pi-AI");
  validateCitedObservationIds(input, raw, "Pi-AI");

  return {
    raw,
    source: authSource === "codex" ? "codex" : "pi-ai"
  };
}

async function resolveApiKey(options: PiAiCallOptions): Promise<ApiKeyResolution> {
  const env = options.env ?? process.env;
  const existsImpl = options.existsImpl ?? existsSync;
  const readFileImpl = options.readFileImpl ?? ((path: string) => readFileSync(path, "utf8"));
  const getOAuthApiKeyImpl =
    options.getOAuthApiKeyImpl ?? (getOAuthApiKey as unknown as GetOAuthApiKeyImpl);

  const piAuthPath = resolveHome(env.PI_AI_AUTH_PATH || DEFAULT_PI_AUTH_PATH);
  if (existsImpl(piAuthPath)) {
    const credentials = credentialsFromAuthJson(readFileImpl(piAuthPath), "pi-ai", options.now);
    const result = await getOAuthApiKeyImpl(OAUTH_PROVIDER, credentials);
    if (result?.apiKey) {
      return { apiKey: result.apiKey, authSource: "pi-ai" };
    }
  }

  if (truthy(env.CODEX_AUTH_FALLBACK_ENABLED)) {
    const codexAuthPath = resolveHome(env.CODEX_AUTH_PATH || DEFAULT_CODEX_AUTH_PATH);
    if (existsImpl(codexAuthPath)) {
      const credentials = credentialsFromAuthJson(readFileImpl(codexAuthPath), "codex", options.now);
      const result = await getOAuthApiKeyImpl(OAUTH_PROVIDER, credentials);
      if (result?.apiKey) {
        return { apiKey: result.apiKey, authSource: "codex" };
      }
    }
  }

  throw new Error("Pi-AI fallback auth unavailable");
}

function credentialsFromAuthJson(
  text: string,
  source: AuthSource,
  now = Date.now
): Record<string, OAuthCredentials> {
  const parsed = JSON.parse(text) as unknown;
  const credential =
    credentialsFromProviderMap(parsed) ??
    credentialsFromCodexAuth(parsed, now);

  if (!credential) {
    throw new Error(`${source} auth file does not contain usable ${OAUTH_PROVIDER} credentials`);
  }

  return { [OAUTH_PROVIDER]: credential };
}

function credentialsFromProviderMap(value: unknown): OAuthCredentials | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return credentialsFromObject(record[OAUTH_PROVIDER]) ??
    credentialsFromObject(record.openaiCodex) ??
    credentialsFromObject(record.openai_codex);
}

function credentialsFromCodexAuth(
  value: unknown,
  now: () => number
): OAuthCredentials | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const tokens = record.tokens && typeof record.tokens === "object"
    ? (record.tokens as Record<string, unknown>)
    : record;
  const access = stringValue(tokens.access_token) ?? stringValue(tokens.access);
  const refresh = stringValue(tokens.refresh_token) ?? stringValue(tokens.refresh);
  if (!access) return null;

  const explicitExpires =
    numericDate(tokens.expires) ??
    numericDate(tokens.expires_at) ??
    numericDate(record.expires) ??
    numericDate(record.expires_at);
  const lastRefresh = numericDate(record.last_refresh) ?? numericDate(tokens.last_refresh);
  const expires = explicitExpires ?? (lastRefresh ? lastRefresh + 55 * 60 * 1000 : now() + 60 * 1000);

  return {
    access,
    refresh: refresh ?? "",
    expires
  };
}

function credentialsFromObject(value: unknown): OAuthCredentials | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const access = stringValue(record.access) ?? stringValue(record.access_token);
  const refresh = stringValue(record.refresh) ?? stringValue(record.refresh_token);
  const expires = numericDate(record.expires) ?? numericDate(record.expires_at);
  if (!access || !refresh || !expires) return null;
  return { ...record, access, refresh, expires };
}

function extractText(message: AssistantMessageLike): string {
  const text = (message.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (!text) {
    throw new Error("Pi-AI response: no text content");
  }
  return text;
}

function specialistSystemPrompt(name: SpecialistName): string {
  return [
    `You are the Liminal Custody ${name} specialist.`,
    "Return strict JSON only. Do not use markdown.",
    "Do not invent evidence or cite ids not present in the request.",
    "If the evidence is insufficient, return verdict \"refused\" and explain the missing evidence.",
    "Allowed verdicts: supported, weakened, contradicted, refused.",
    "Required JSON keys: verdict, summary, cited_observation_ids, confidence, unsupported_assertions."
  ].join(" ");
}

function specialistUserPrompt(input: SpecialistInput): string {
  return JSON.stringify({
    specialist: input.name,
    anomaly_id: input.anomaly_id,
    question: input.question,
    evidence: input.evidence,
    claim: input.claim,
    identity_features: input.identity_features,
    visual: input.visual,
    confidence_floor: input.confidence_floor,
    output_schema: {
      verdict: "supported | weakened | contradicted | refused",
      summary: "string",
      cited_observation_ids: "string[]; each id must come from evidence[].id",
      confidence: "number between 0 and 1",
      unsupported_assertions: "string[]"
    }
  });
}

function truthy(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(value?.trim().toLowerCase() ?? "");
}

function resolveHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return resolve(homedir(), path.slice(2));
  return resolve(path);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numericDate(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1000 : value;
  }
  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numericDate(numeric);
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export type { AuthSource };
