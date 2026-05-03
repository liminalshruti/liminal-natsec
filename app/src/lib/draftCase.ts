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
import dantiShips from "../../../fixtures/maritime/live-cache/danti-hormuz-ship-best-size-200.json" with { type: "json" };

export interface DraftCandidateSignal {
  id: string;
  /** Human-readable label for the signal — appears as the chip text. */
  label: string;
  /** What kind of signal is this — drives the icon + color. */
  kind: "ais-gap" | "sanctions" | "advisory" | "imagery" | "osint" | "ship-vessel";
  /** One-line summary the operator reads to decide whether to attach. */
  summary: string;
  /** Source citation — same Path γ shape used everywhere else. */
  source_file: string;
  source_pointer: string;
  source_provider: string;
  /** Whether the signal is currently attached to the draft case. */
  attached: boolean;
  /** Optional vessel-card data — when present, the signal renders as a
   *  richer card with MMSI, IMO, flag, port-of-origin, destination, length.
   *  Only set on `kind: "ship-vessel"` signals (real Danti MarineTraffic
   *  records). M-1 fast-follow on the AI-draft case. */
  vessel?: {
    name: string;
    mmsi?: string;
    imo?: string;
    flag?: string;
    length_m?: number;
    speed_kn?: number;
    course_deg?: number;
    last_port?: string;
    current_port?: string;
    destination?: string;
    eta?: string;
    /** lat/lon of the most recent AIS ping. */
    lat?: number;
    lon?: number;
    /** Why this vessel is interesting — derived heuristic, NOT an
     *  AI-asserted claim. Just shows the operator the AI's reasoning. */
    flag_note?: string;
  };
}

export interface DraftCaseContext {
  watchBoxName: string;
  watchBoxId: string;
  primaryRealSignal: string;
  reviewWindowLabel: string;
  scopeNote: string;
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
  /** Shared watchfloor context that makes proposed cases line up with the
   *  generated custody cases and the map replay. */
  context: DraftCaseContext;
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
const sourceWindowLabel = sourceWindowFromRows(rows);

const WATCH_CONTEXT: DraftCaseContext = {
  watchBoxName: "Hormuz Watch Box 01",
  watchBoxId: "aoi:alara-eez-box-01",
  primaryRealSignal: "MARAD 2026-004 + GFW intentional-disabling rows",
  reviewWindowLabel: sourceWindowLabel,
  scopeNote:
    "The review window is derived from the real GFW gap rows. Source timestamps keep their original dates; archived context is not treated as current vessel behavior."
};

// Convert real MARAD rows into candidate signals. Each row becomes one signal.
const candidatesFromRows: DraftCandidateSignal[] = rows.slice(0, 5).map((row, i) => ({
  id: `sig:marad:${row.mmsi ?? i}`,
  label: `${row.name ?? "UNKNOWN"} · MMSI ${row.mmsi ?? "—"} · ${row.flag ?? "??"}`,
  kind: "ais-gap" as const,
  summary: `GFW detected ${row.durationHours?.toFixed(1) ?? "?"}h intentional broadcast gap (${row.start?.slice(0, 10)} -> ${row.end?.slice(0, 10)}); ${watchBoxClassification(row)} ${WATCH_CONTEXT.watchBoxName}.`,
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
  summary: `${data.marad_advisory?.title ?? "Persian Gulf / Strait of Hormuz / Gulf of Oman"} - active ${data.marad_advisory?.effective ?? ""}; reviewed inside ${WATCH_CONTEXT.reviewWindowLabel}.`,
  source_file: "fixtures/maritime/live-cache/marad-msci-advisories.json",
  source_pointer: "$.advisories[?(@.id=='2026-004')]",
  source_provider: "U.S. Maritime Administration (MARAD)",
  attached: false
};

// One sanctions-cross-check signal — gestures at the OFAC pipeline Shayaun
// just wired (6e843bc).
const sanctionsSignal: DraftCandidateSignal = {
  id: "sig:ofac-sanctions-check",
  label: "OFAC SDN cross-check · Hormuz context",
  kind: "sanctions",
  summary: "Proposed gap rows are not OFAC-listed, while the surrounding Hormuz substrate has OFAC/GFW identity-risk context. Keep that distinction in review.",
  source_file: "fixtures/maritime/live-cache/ofac-maritime-sanctions-matches.json",
  source_pointer: "$.records",
  source_provider: "OFAC + Global Fishing Watch identity histories",
  attached: false
};

// M-1: Real ship-vessel candidate signals from Shayaun's just-shipped Danti
// SHIP corpus (commit 6918a50, ~10,000 MarineTraffic records over the AOI).
// We pre-pick 6 vessels with diverse flags-of-convenience (PA / MT / LR /
// KN / CK / CY) — exactly the kind of FOC pattern a sanctions-evasion case
// would surface. The AI's "rationale" for selecting these is the FOC flag,
// the vessel size class, and the corridor activity. Each carries full
// vessel-card data so the operator sees real ship name, MMSI, IMO, ports,
// destination on the chip — not just a placeholder.

interface DantiShipDoc {
  documentId?: string;
  geometry?: { coordinates?: number[] };
  properties?: Record<string, string | undefined>;
}

interface DantiCategoryShape {
  category?: string;
  documents?: DantiShipDoc[];
}

interface DantiCacheShape {
  body?: { resultDocuments?: DantiCategoryShape[] };
}

// Hand-picked MMSIs + reasons. MMSIs match real entries in the cache;
// looked up by Python preview at PR-time to avoid expensive runtime
// filtering on every render. Order mirrors the score-sorted Danti results.
const FEATURED_VESSEL_MMSIS: Array<{ mmsi: string; flag_note: string }> = [
  { mmsi: "352005822", flag_note: "Panama-flagged tanker · 224.8m · transiting Hormuz–UAE" },
  { mmsi: "229706000", flag_note: "Malta flag · Saudi-loaded · KFK→Jeddah corridor" },
  { mmsi: "636023725", flag_note: "Liberia flag · destination 'CHINA SHIP0WNER' (sic)" },
  { mmsi: "341317000", flag_note: "Saint Kitts flag · KFK anchorage · sub-100m" },
  { mmsi: "518998467", flag_note: "Cook Islands flag · last port Khor al-Zubair (Iraq)" },
  { mmsi: "212851000", flag_note: "Cyprus flag · Umm Al Quwain dry-docked · 121m" }
];

function buildVesselSignals(): DraftCandidateSignal[] {
  const cache = dantiShips as DantiCacheShape;
  const shipCat = cache.body?.resultDocuments?.find((c) => c.category === "SHIP");
  const docs: DantiShipDoc[] = shipCat?.documents ?? [];

  // Index docs by MMSI for fast pick.
  const byMmsi = new Map<string, DantiShipDoc>();
  for (const doc of docs) {
    const mmsi = doc.properties?.mmsi;
    if (mmsi) byMmsi.set(mmsi, doc);
  }

  const signals: DraftCandidateSignal[] = [];
  FEATURED_VESSEL_MMSIS.forEach((featured, i) => {
    const doc = byMmsi.get(featured.mmsi);
    if (!doc) return;
    const p = doc.properties ?? {};
    const coords = doc.geometry?.coordinates ?? [];
    const lon = typeof coords[0] === "number" ? coords[0] : undefined;
    const lat = typeof coords[1] === "number" ? coords[1] : undefined;
    const name = p.ship_name ?? "UNKNOWN";
    const flag = p.flag ?? "??";
    signals.push({
      id: `sig:vessel:${featured.mmsi}`,
      label: `${name} · MMSI ${featured.mmsi} · ${flag}`,
      kind: "ship-vessel",
      summary: featured.flag_note,
      source_file: "fixtures/maritime/live-cache/danti-hormuz-ship-best-size-200.json",
      source_pointer: `$.body.resultDocuments[?(@.category=='SHIP')].documents[?(@.properties.mmsi=='${featured.mmsi}')]`,
      source_provider: "Danti · MarineTraffic AIS",
      attached: false,
      vessel: {
        name,
        mmsi: featured.mmsi,
        imo: p.imo,
        flag,
        length_m: p.length ? Number(p.length) : undefined,
        speed_kn: p.speed ? Number(p.speed) : undefined,
        course_deg: p.course ? Number(p.course) : undefined,
        last_port: p.last_port,
        current_port: p.current_port,
        destination: p.destination,
        eta: p.eta,
        lat,
        lon,
        flag_note: featured.flag_note
      }
    });
  });
  return signals;
}

const vesselSignals: DraftCandidateSignal[] = buildVesselSignals();

export const DRAFT_CASE: DraftCase = {
  id: "case:draft:marad-2026-004-cluster",
  title: "Hormuz Watch Box dark-vessel proposal",
  tagline: `${(data.summary?.intentional_disabling_count ?? rows.length) + vesselSignals.length} vessels · ${WATCH_CONTEXT.watchBoxName} · real source window`,
  rationale:
    `Liminal Agents flagged intentional-broadcast-gap events overlapping the active MARAD MSCI 2026-004 advisory corridor and cross-cited the real Danti MarineTraffic feed: ${vesselSignals.length} vessels under flags-of-convenience match the corridor profile. The proposal stays in review until the operator attaches enough real signals.`,
  confidence: 0.72,
  status: "draft",
  candidateSignals: [advisorySignal, ...candidatesFromRows, ...vesselSignals, sanctionsSignal],
  context: WATCH_CONTEXT
};

/** Threshold of attached signals that activates the promote-to-case action. */
export const PROMOTE_THRESHOLD = 2;

function watchBoxClassification(row: MaradRow): string {
  if (row.marad_classification === "BOTH_INSIDE") return "both endpoints inside";
  if (row.marad_classification === "ONE_END_INSIDE") return "one endpoint inside";
  if (row.marad_classification === "OUTSIDE") return "outside the watch box but retained as advisory context for";
  return "pending geofence review for";
}

function sourceWindowFromRows(inputRows: MaradRow[]): string {
  const times = inputRows
    .flatMap((row) => [row.start, row.end])
    .map((value) => (typeof value === "string" ? Date.parse(value) : NaN))
    .filter((value) => Number.isFinite(value));
  if (times.length === 0) return "real source window";
  const min = Math.min(...times);
  const max = Math.max(...times);
  return `${shortDate(min)} to ${shortDate(max)} source window`;
}

function shortDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
