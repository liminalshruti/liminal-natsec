import type {
  SpecialistInput,
  SpecialistRawOutput,
  Verdict
} from "./types.ts";

const VALID_VERDICTS: readonly Verdict[] = [
  "supported",
  "weakened",
  "contradicted",
  "refused"
];

export function validateRawOutput(
  value: unknown,
  sourceLabel = "specialist"
): SpecialistRawOutput {
  if (!value || typeof value !== "object") {
    throw new Error(`${sourceLabel} response: output is not an object`);
  }

  const v = value as Record<string, unknown>;
  if (!VALID_VERDICTS.includes(v.verdict as Verdict)) {
    throw new Error(`${sourceLabel} response: invalid verdict ${String(v.verdict)}`);
  }
  if (typeof v.summary !== "string") {
    throw new Error(`${sourceLabel} response: summary must be string`);
  }
  if (
    !Array.isArray(v.cited_observation_ids) ||
    !v.cited_observation_ids.every((x) => typeof x === "string")
  ) {
    throw new Error(`${sourceLabel} response: cited_observation_ids must be string[]`);
  }
  if (typeof v.confidence !== "number" || !Number.isFinite(v.confidence)) {
    throw new Error(`${sourceLabel} response: confidence must be finite number`);
  }
  if (
    !Array.isArray(v.unsupported_assertions) ||
    !v.unsupported_assertions.every((x) => typeof x === "string")
  ) {
    throw new Error(`${sourceLabel} response: unsupported_assertions must be string[]`);
  }

  return {
    verdict: v.verdict as Verdict,
    summary: v.summary,
    cited_observation_ids: v.cited_observation_ids as string[],
    confidence: v.confidence,
    unsupported_assertions: v.unsupported_assertions as string[]
  };
}

export function validateCitedObservationIds(
  input: SpecialistInput,
  raw: SpecialistRawOutput,
  sourceLabel = "specialist"
): void {
  const evidenceIds = new Set(input.evidence.map((evidence) => evidence.id));
  const missing = raw.cited_observation_ids.filter((id) => !evidenceIds.has(id));
  if (missing.length > 0) {
    throw new Error(
      `${sourceLabel} response: cited ids not present in request evidence: ${missing.join(", ")}`
    );
  }
}

export function parseJsonObject(text: string, sourceLabel = "specialist"): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`${sourceLabel} response: empty text`);
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1]);
    }

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw new Error(`${sourceLabel} response: valid JSON object not found`);
  }
}
