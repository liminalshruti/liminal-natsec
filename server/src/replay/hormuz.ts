import { existsSync, readFileSync } from "node:fs";

import { buildHormuzScoringSummary } from "../../../shared/hormuz/scoring.ts";
import type {
  HormuzEvidenceItem,
  HormuzScoringSummary,
  HormuzSourceDocument
} from "../../../shared/hormuz/types.ts";

const MARITIME_FIXTURE_DIR = new URL("../../../fixtures/maritime/", import.meta.url);

export interface HormuzReplayIntel {
  sourceDocuments: HormuzSourceDocument[];
  evidenceItems: HormuzEvidenceItem[];
  scoring: HormuzScoringSummary;
}

export function loadHormuzReplayIntel(): HormuzReplayIntel {
  const sourceDocuments = readJson<HormuzSourceDocument[]>(
    "hormuz-source-documents.json",
    []
  );
  const evidenceItems = readJson<HormuzEvidenceItem[]>(
    "hormuz-evidence-items.json",
    []
  );

  return {
    sourceDocuments,
    evidenceItems,
    scoring: buildHormuzScoringSummary(evidenceItems)
  };
}

export function buildHormuzReplayState(intel = loadHormuzReplayIntel()) {
  return {
    sourceDocumentCount: intel.sourceDocuments.length,
    evidenceItemCount: intel.evidenceItems.length,
    availableEvidenceCount: intel.evidenceItems.filter(
      (item) => item.status === "available"
    ).length,
    unavailableEvidenceCount: intel.evidenceItems.filter(
      (item) => item.status === "unavailable"
    ).length,
    scoring: intel.scoring
  };
}

function readJson<T>(fileName: string, fallback: T): T {
  const url = new URL(fileName, MARITIME_FIXTURE_DIR);
  if (!existsSync(url)) return fallback;
  return JSON.parse(readFileSync(url, "utf8")) as T;
}
