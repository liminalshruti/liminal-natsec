// Source → family mapping for the OSINT intake band and the per-row family
// chips on Specialist Reads. The same family color reappears at every layer
// of the right pane so the eye traces Signals → Analysis → Verdict without
// hover.
//
// Six families, fixed order. Cool/neutral palette only — refusal amber and
// contested-orange remain the only warm tones in the pane.

export type SourceFamily =
  | "satellite"
  | "ais"
  | "sanctions"
  | "warnings"
  | "osint"
  | "infra";

export const FAMILY_ORDER: readonly SourceFamily[] = [
  "satellite",
  "ais",
  "sanctions",
  "warnings",
  "osint",
  "infra"
] as const;

export const FAMILY_LABEL: Record<SourceFamily, string> = {
  satellite: "Satellite",
  ais: "AIS",
  sanctions: "Sanctions",
  warnings: "Warnings",
  osint: "OSINT",
  infra: "Infra"
};

// Reveal order across the replay timeline. Phase-keyed so the band tells the
// "as the investigation deepens, more signals arrive" story without depending
// on per-tick wall-clock timestamps (which span 2012→2026 in the fixture pack).
//
// P1 standing watch: ambient context (sat / warnings / infra)
// P2 dark gap fires: AIS drops in to substantiate the gap claim
// P3 second identity: sanctions check + broader OSINT corroboration arrives
// P4–6: full pack visible
export const FAMILY_PHASE_MIN: Record<SourceFamily, number> = {
  satellite: 1,
  warnings: 1,
  infra: 1,
  ais: 2,
  sanctions: 3,
  osint: 3
};

// Source name → family. Source names match `evidence.source` in
// fixtures/maritime/hormuz-evidence-items.json and the SOURCE_LABEL keys in
// DataSourcesChips.tsx.
const SOURCE_TO_FAMILY: Record<string, SourceFamily> = {
  // Satellite imagery + EO
  COPERNICUS_CDSE_STAC: "satellite",
  COPERNICUS_CDSE_AUTH: "satellite",
  COPERNICUS_MARINE: "satellite",
  SENTINEL_HUB: "satellite",
  SENTINEL_HUB_PROCESS: "satellite",
  SATELLOGIC: "satellite",
  DANTI: "satellite",

  // AIS / vessel tracking
  AISSTREAM: "ais",
  AISHUB: "ais",
  BARENTSWATCH: "ais",
  GLOBAL_FISHING_WATCH: "ais",
  MARINETRAFFIC: "ais",

  // Sanctions / entity risk
  OPENSANCTIONS: "sanctions",
  OFAC: "sanctions",

  // Maritime safety warnings
  NAVAREA_IX: "warnings",
  UKMTO: "warnings",
  MARAD: "warnings",

  // General OSINT
  EXA: "osint",
  ACLED: "osint",
  GDELT: "osint",
  SEERIST: "osint",
  PORTWATCH: "osint",
  STANFORD: "osint",
  FOUNDRY: "osint",

  // Infrastructure context
  OVERPASS: "infra",
  SHODAN: "infra"
};

export function familyForSource(source: string | undefined | null): SourceFamily | null {
  if (!source) return null;
  return SOURCE_TO_FAMILY[source] ?? null;
}

// Map a citation source_file path back to a family. The Specialist Reads
// citations cite cache files (e.g. "live-cache/aisstream-hormuz-sample.json"),
// not source enum values; this helper recovers the family from the path so
// per-row family chips can color-trace back to the intake band.
export function familyForSourceFile(path: string | undefined | null): SourceFamily | null {
  if (!path) return null;
  const lower = path.toLowerCase();
  if (lower.includes("sentinel") || lower.includes("copernicus")) return "satellite";
  if (lower.includes("aisstream") || lower.includes("aishub")) return "ais";
  if (lower.includes("gfw-") || lower.includes("global-fishing") || lower.includes("global_fishing")) return "ais";
  if (lower.includes("opensanctions") || lower.includes("ofac")) return "sanctions";
  if (lower.includes("navarea") || lower.includes("ukmto") || lower.includes("marad")) return "warnings";
  if (lower.includes("exa-") || lower.includes("acled") || lower.includes("gdelt") || lower.includes("portwatch") || lower.includes("seerist") || lower.includes("stanford")) return "osint";
  if (lower.includes("overpass") || lower.includes("shodan")) return "infra";
  return null;
}

export interface IntakeItem {
  /** Source family this item belongs to. */
  family: SourceFamily;
  /** Stable id for animation keys. */
  id: string;
}

/**
 * Group a flat list of evidence items by family.
 * Items whose source doesn't map to any known family are dropped — better to
 * undercount than to mis-color. Caller is expected to pass `evidence.source`
 * style records.
 */
export function groupBySource<T extends { id?: string; source?: string | undefined }>(
  items: readonly T[]
): Record<SourceFamily, T[]> {
  const buckets: Record<SourceFamily, T[]> = {
    satellite: [],
    ais: [],
    sanctions: [],
    warnings: [],
    osint: [],
    infra: []
  };
  for (const item of items) {
    const fam = familyForSource(item.source);
    if (!fam) continue;
    buckets[fam].push(item);
  }
  return buckets;
}

/**
 * Per-family count, gated by the current replay phase. Families whose
 * `phase_min` exceeds `currentPhase` show 0 — they haven't "arrived" yet in
 * the demo timeline.
 */
export function countsForPhase<T extends { id?: string; source?: string | undefined }>(
  items: readonly T[],
  currentPhase: number
): Record<SourceFamily, number> {
  const buckets = groupBySource(items);
  const out: Record<SourceFamily, number> = {
    satellite: 0,
    ais: 0,
    sanctions: 0,
    warnings: 0,
    osint: 0,
    infra: 0
  };
  for (const fam of FAMILY_ORDER) {
    if (FAMILY_PHASE_MIN[fam] <= currentPhase) {
      out[fam] = buckets[fam].length;
    }
  }
  return out;
}
