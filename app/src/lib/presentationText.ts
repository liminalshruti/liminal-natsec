const NON_PRESENTATION_KEYS = new Set([
  "id",
  "object_id",
  "objectId",
  "case_id",
  "caseId",
  "from",
  "to",
  "source_file",
  "source_pointer",
  "source_sha256",
  "asset_file",
  "asset_sha256",
  "imo",
  "mmsi",
  "status",
  "source_status"
]);

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\b[Cc]ached sanctioned-fleet coordinate watch\b/g, "Sanctioned-fleet coordinate watch"],
  [
    /\b[Cc]ached Qeshm and Bandar Abbas loitering clusters\b/g,
    "Qeshm and Bandar Abbas loitering clusters"
  ],
  [
    /\b[Cc]ached foreign-flag Iranian last-port pattern\b/g,
    "Foreign-flag Iranian last-port pattern"
  ],
  [
    /\b[Cc]ached grey-market and China-routing indicators\b/g,
    "Grey-market and China-routing indicators"
  ],
  [/\b[Cc]ached ROSHAK signal-integrity review\b/g, "ROSHAK signal-integrity review"],
  [/\b[Cc]ached coordinate watchlist hit\b/g, "coordinate watchlist hit"],
  [/\b[Cc]ached DANTI\/MarineTraffic ship pull\b/g, "DANTI/MarineTraffic ship pull"],
  [/\b[Cc]ached DANTI\/MarineTraffic rows?\b/g, "DANTI/MarineTraffic rows"],
  [/\b[Cc]ached DANTI rows?\b/g, "DANTI rows"],
  [/\b[Cc]ached OSINT rows?\b/g, "OSINT rows"],
  [/\b[Cc]ached source rows?\b/g, "Source rows"],
  [/\b[Cc]ached rows?\b/g, "Source rows"],
  [/\b[Cc]ached source\b/g, "Source"],
  [/\b[Cc]ached data\b/g, "source data"],
  [/\b[Dd]anti cached\b/g, "Danti returned"],
  [/\b[Cc]ached\b/g, "source"],
  [/\bstatic real cache\b/g, "real source set"],
  [/\breal cache\b/g, "real source set"],
  [/\blive-cache\b/g, "live source"],
  [/\bfixture fallback\b/g, "local source set"],
  [/\bfixture-mode fallback\b/g, "local source"],
  [/\bfixture mode\b/g, "local sample mode"],
  [/\bfixture\b/g, "local source"],
  [/\bfallback\b/g, "local source"]
];

export function publicText(value: string): string {
  return PHRASE_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value
  ).replace(/\s{2,}/g, " ").trim();
}

export function publicSourcePath(value: string): string {
  return value
    .replace(/^fixtures\/maritime\/live-cache\//, "maritime/live-sources/")
    .replace(/^fixtures\/maritime\/real\//, "maritime/real-sources/")
    .replace(/^fixtures\/maritime\//, "maritime/");
}

export function publicStatusLabel(value: string): string {
  return publicText(value.replace(/_/g, " ")).replace("fixture-shape", "source-shaped");
}

export function fixturePackForPresentation<T>(pack: T): T {
  return scrubValue(pack, null) as T;
}

function scrubValue(value: unknown, key: string | null): unknown {
  if (typeof value === "string") {
    return key && NON_PRESENTATION_KEYS.has(key) ? value : publicText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, null));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        scrubValue(entryValue, entryKey)
      ])
    );
  }
  return value;
}
