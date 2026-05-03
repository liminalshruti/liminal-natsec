import {
  DEFAULT_CONFIDENCE_FLOOR,
  type EvidenceItemRef,
  type GuardedSpecialistOutput,
  type GuardReport,
  type SpecialistInput,
  type SpecialistRawOutput,
  type Verdict
} from "./types.ts";

const INTENT_PHRASE = /\b(hostile|threat|intent)\b/i;

function hasIntentIndicator(evidence: EvidenceItemRef[]): boolean {
  return evidence.some((e) => e.type === "INTENT_INDICATOR");
}

function citedEvidence(
  input: SpecialistInput,
  raw: SpecialistRawOutput
): EvidenceItemRef[] {
  const ids = new Set(raw.cited_observation_ids);
  return input.evidence.filter((e) => ids.has(e.id));
}

function stripUnsupported(
  summary: string,
  unsupported: string[]
): { summary: string; stripped: string[] } {
  const stripped: string[] = [];
  let next = summary;
  for (const phrase of unsupported ?? []) {
    if (!phrase) continue;
    if (next.includes(phrase)) {
      next = next.split(phrase).join("[redacted]");
      stripped.push(phrase);
    }
  }
  return { summary: next, stripped };
}

export function applyGuard(
  input: SpecialistInput,
  raw: SpecialistRawOutput
): GuardedSpecialistOutput {
  const layers: string[] = [];
  let verdict: Verdict = raw.verdict;
  let forced_refused = false;
  let downgraded = false;
  const floor = input.confidence_floor ?? DEFAULT_CONFIDENCE_FLOOR;

  // Layer 7 — operator question phrasing without an INTENT_INDICATOR
  if (
    input.question &&
    INTENT_PHRASE.test(input.question) &&
    !hasIntentIndicator(input.evidence)
  ) {
    layers.push("question_intent_phrasing_no_indicator");
    if (verdict !== "refused") {
      verdict = "refused";
      forced_refused = true;
    }
  }

  // Layer 1 — citation minimum (only on positive supported claims;
  // contradicted/weakened/refused pass through, including M5 single-citation contradictions)
  if (verdict === "supported" && raw.cited_observation_ids.length < 2) {
    layers.push("citation_min");
    verdict = "refused";
    forced_refused = true;
  }

  // Layer 2 — intent specialist requires at least one INTENT_INDICATOR
  if (
    verdict !== "refused" &&
    input.name === "intent" &&
    !hasIntentIndicator(input.evidence)
  ) {
    layers.push("intent_indicator");
    verdict = "refused";
    forced_refused = true;
  }

  // Layer 6 — Shodan cannot support vessel-behavior claims (kinematics, intent)
  if (
    verdict !== "refused" &&
    (input.name === "kinematics" || input.name === "intent")
  ) {
    const cited = citedEvidence(input, raw);
    if (cited.length > 0 && cited.every((e) => e.source === "SHODAN")) {
      layers.push("shodan_vessel_behavior");
      verdict = "refused";
      forced_refused = true;
    }
  }

  // Layer 4 — posterior below confidence_floor
  if (
    verdict !== "refused" &&
    input.claim?.posterior !== undefined &&
    input.claim.posterior < floor
  ) {
    layers.push("posterior_floor");
    verdict = "refused";
    forced_refused = true;
  }

  // Layer 3 — identity downgrade when no dimensions/flag/IMO match
  if (verdict === "supported" && input.name === "identity") {
    const idf = input.identity_features;
    if (
      !idf ||
      (idf.dimensions_similarity_score === null &&
        !idf.flag_match &&
        !idf.imo_match)
    ) {
      layers.push("identity_weak");
      verdict = "weakened";
      downgraded = true;
    }
  }

  // Layer 5 — purely textual evidence (no time + no geometry) downgrades
  if (verdict === "supported") {
    const cited = citedEvidence(input, raw);
    if (
      cited.length > 0 &&
      cited.every(
        (e) => e.modality === "text" && !e.observed_at && !e.geometry
      )
    ) {
      layers.push("textual_only");
      verdict = "weakened";
      downgraded = true;
    }
  }

  // Always — strip unsupported assertions from summary
  const { summary, stripped } = stripUnsupported(
    raw.summary,
    raw.unsupported_assertions
  );

  const guard: GuardReport = {
    applied_layers: layers,
    forced_refused,
    downgraded,
    stripped_assertions: stripped
  };

  return {
    verdict,
    summary,
    cited_observation_ids: raw.cited_observation_ids,
    confidence: raw.confidence,
    unsupported_assertions: raw.unsupported_assertions,
    source: "fixture",
    guard
  };
}
