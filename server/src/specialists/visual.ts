import { findCached } from "./cache.ts";
import { callLiveSpecialist } from "./live.ts";
import {
  DEFAULT_VISUAL_THRESHOLD,
  type Specialist,
  type SpecialistCallResult,
  type SpecialistInput,
  type SpecialistRawOutput,
  type VisualClass,
  type VisualInput
} from "./types.ts";

const VISUAL_CLASSES: readonly VisualClass[] = [
  "cargo",
  "tanker",
  "fishing",
  "naval"
] as const;

interface TopClass {
  cls: VisualClass;
  score: number;
}

function topClass(scores: Record<VisualClass, number>): TopClass {
  let best: TopClass = { cls: "cargo", score: -Infinity };
  for (const cls of VISUAL_CLASSES) {
    const score = scores[cls] ?? 0;
    if (score > best.score) {
      best = { cls, score };
    }
  }
  return best;
}

function fixtureVisualOutput(input: SpecialistInput): SpecialistRawOutput {
  const v: VisualInput | undefined = input.visual;
  if (!v) {
    return {
      verdict: "refused",
      summary: "Visual specialist requires a VisualInput payload.",
      cited_observation_ids: [],
      confidence: 0,
      unsupported_assertions: []
    };
  }

  const top = topClass(v.visual_class_scores);
  const threshold = v.match_threshold ?? DEFAULT_VISUAL_THRESHOLD;

  if (top.score < threshold) {
    return {
      verdict: "weakened",
      summary: `Visual class is ambiguous (top class ${top.cls} at ${top.score.toFixed(2)} below threshold ${threshold}).`,
      cited_observation_ids: [v.observation_id],
      confidence: top.score,
      unsupported_assertions: []
    };
  }

  if (v.declared_ais_class !== "unknown" && top.cls !== v.declared_ais_class) {
    return {
      verdict: "contradicted",
      summary: `Visual class (${top.cls}, score ${top.score.toFixed(2)}) disagrees with declared AIS class (${v.declared_ais_class}).`,
      cited_observation_ids: [v.observation_id],
      confidence: top.score,
      unsupported_assertions: []
    };
  }

  return {
    verdict: "supported",
    summary: `Visual class (${top.cls}, score ${top.score.toFixed(2)}) matches declared AIS class.`,
    cited_observation_ids: [v.observation_id],
    confidence: top.score,
    unsupported_assertions: []
  };
}

export const visualSpecialist: Specialist = {
  name: "visual",
  async call(input: SpecialistInput): Promise<SpecialistCallResult> {
    const live = await callLiveSpecialist("visual", input);
    if (live) return live;

    const cached = findCached("visual", input.anomaly_id);
    if (cached) return { raw: cached, source: "cache" };

    return { raw: fixtureVisualOutput(input), source: "fixture" };
  }
};
