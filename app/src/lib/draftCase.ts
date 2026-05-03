// AI-proposed draft case — the third case Liminal Agents discovered while
// scanning the cached substrate. Real data, real provenance, but the case
// itself is in DRAFT state until the operator promotes it by attaching
// signals.
//
// Source: fixtures/maritime/live-cache/dark-vessel-marad-2026-004-overlap.json
//   Contains 5 real GFW-detected dark-vessel events flagged
//   intentionalDisabling: true, with MARAD 2026-004 advisory overlap
//   (Persian Gulf / Strait of Hormuz / Gulf of Oman corridor).
//
// Why this is the right kind of case to draft:
//   - Real cached data, sha256-verifiable, sourced from Shayaun's just-shipped
//     OFAC + GFW + MARAD pipeline (commits 384f76a → 6e843bc → 3d0bd43 → b9136ff)
//   - MARAD 2026-004 is an active maritime advisory naming Iranian attacks
//     and sanctions-evasion patterns in the Hormuz corridor
//   - intentionalDisabling: true is GFW's own algorithmic flag, not Liminal's
//     synthesis — this is the kind of substrate signal Liminal Agents would
//     pick up and propose as a custody case
//   - The pattern matches the demo's existing identity-churn narrative one
//     layer up: now the system is doing case discovery, not just analysis
//     of cases the operator already opened
//
// What the operator does:
//   - Sees a notice toast on demo start: "Liminal Agents discovered a new
//     pattern. Draft case stubbed."
//   - Sees the draft case in substrate panel with DRAFT · AI-PROPOSED visual
//     treatment (dashed border, lower opacity, badge)
//   - Clicks the draft case → working panel opens with candidate signals
//     listed
//   - Click-to-attach signals; once 2+ attached the "promote to case" button
//     activates
//   - Click promote → draft loses its proposal treatment and becomes a
//     regular case in the queue
//
// Fast-follow scope:
//   B-1: Drag-and-drop instead of click-to-attach
//   B-2: Temp-render attached signals on the map as ghosts
//   B-3: Reverse flow — attached signals fade out of substrate panel into
//        working panel via animation
//   B-4: Spine-graph mutation — promotion creates real anomaly + claim +
//        evidence nodes via server route

import marad from "../../../fixtures/maritime/live-cache/dark-vessel-marad-2026-004-overlap.json" with { type: "json" };

export interface DraftCandidateSignal {
  id: string;
  /** Human-readable label for the signal — appears as the chip text. */
  label: string;
  /** What kind of signal is this — drives the icon + color. */
  kind: "ais-gap" | "sanctions" | "advisory" | "imagery" | "osint";
  /** One-line summary the operator reads to decide whether to attach. */
  summary: string;
  /** Source citation — same Path γ shape used everywhere else. */
  source_file: string;
  source_pointer: string;
  source_provider: string;
  /** Whether the signal is currently attached to the draft case. */
  attached: boolean;
}

export interface DraftCase {
  id: string;
  title: string;
  /** Short tagline for the substrate-panel chip body. */
  tagline: string;
  /** Why the AI thought this was a case worth drafting. */
  rationale: string;
  /** Confidence the AI has in this draft (0..1). */
  confidence: number;
  /** Status — "draft" or "promoted." Promotion happens when operator
   *  attaches 2+ signals and clicks "promote to case." */
  status: "draft" | "promoted";
  /** Candidate signals the AI surfaced as evidence for this case.
   *  Operator decides which to attach. */
  candidateSignals: DraftCandidateSignal[];
}

interface MaradRow {
  name?: string;
  mmsi?: string;
  flag?: string;
  type?: string;
  start?: string;
  end?: string;
  durationHours?: number;
  intentionalDisabling?: boolean;
  marad_classification?: string;
  ofac_match?: boolean;
}

interface MaradFile {
  rows?: MaradRow[];
  summary?: { intentional_disabling_count?: number; rows?: number };
  marad_advisory?: { id?: string; title?: string; effective?: string };
}

const data = marad as MaradFile;
const rows: MaradRow[] = data.rows ?? [];

// Convert real MARAD rows into candidate signals. Each row becomes one signal.
const candidatesFromRows: DraftCandidateSignal[] = rows.slice(0, 5).map((row, i) => ({
  id: `sig:marad:${row.mmsi ?? i}`,
  label: `${row.name ?? "UNKNOWN"} · MMSI ${row.mmsi ?? "—"} · ${row.flag ?? "??"}`,
  kind: "ais-gap" as const,
  summary: `GFW detected ${row.durationHours?.toFixed(1) ?? "?"}h intentional broadcast gap (${row.start?.slice(0, 10)} → ${row.end?.slice(0, 10)}); MARAD 2026-004 corridor overlap.`,
  source_file: "fixtures/maritime/live-cache/dark-vessel-marad-2026-004-overlap.json",
  source_pointer: `$.rows[${i}]`,
  source_provider: "Global Fishing Watch + MARAD MSCI",
  attached: false
}));

// One synthesis-level signal naming the advisory itself.
const advisorySignal: DraftCandidateSignal = {
  id: "sig:marad-advisory",
  label: `MARAD MSCI ${data.marad_advisory?.id ?? "2026-004"} active`,
  kind: "advisory",
  summary: `${data.marad_advisory?.title ?? "Persian Gulf / Strait of Hormuz / Gulf of Oman"} — active ${data.marad_advisory?.effective ?? ""}.`,
  source_file: "fixtures/maritime/live-cache/marad-msci-advisories.json",
  source_pointer: "$.advisories[?(@.id=='2026-004')]",
  source_provider: "U.S. Maritime Administration (MARAD)",
  attached: false
};

// One sanctions-cross-check signal — gestures at the OFAC pipeline Shayaun
// just wired (6e843bc).
const sanctionsSignal: DraftCandidateSignal = {
  id: "sig:ofac-sanctions-check",
  label: "OFAC SDN cross-check · 7 vessels in AOI",
  kind: "sanctions",
  summary: "Vessel identity histories cross-checked against OFAC SDN list. Pending operator review.",
  source_file: "fixtures/maritime/live-cache/ofac-maritime-sanctions-matches.json",
  source_pointer: "$.records",
  source_provider: "OFAC + Global Fishing Watch identity histories",
  attached: false
};

export const DRAFT_CASE: DraftCase = {
  id: "case:draft:marad-2026-004-cluster",
  title: "Iran-corridor dark-vessel cluster",
  tagline: `${data.summary?.intentional_disabling_count ?? rows.length} vessels · MARAD 2026-004 overlap`,
  rationale:
    "Liminal Agents flagged a cluster of intentional-broadcast-gap events overlapping the active MARAD MSCI 2026-004 advisory corridor. Vessels exhibit threat indicators consistent with sanctions evasion in the Strait of Hormuz / Gulf of Oman.",
  confidence: 0.72,
  status: "draft",
  candidateSignals: [advisorySignal, ...candidatesFromRows, sanctionsSignal]
};

/** Threshold of attached signals that activates the promote-to-case action. */
export const PROMOTE_THRESHOLD = 2;
