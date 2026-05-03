// BroadcastChyron — persistent broadcast lower-third in archival monotype.
//
// Per docs/design/INSPO_TO_SURFACE_MAP.md SHIP-5 (Source 10 · aerockrose,
// Sequoia AI Ascent stage register):
//
//   "Desktop app titlebar/chrome wears a low-key lower-third throughout
//    the demo: LIMINAL CUSTODY · CASE alara_01 · 5TH FLEET · 0200Z in
//    archival monotype. Application-chrome expression of SHIP-1's
//    archival typography. Reads as broadcast/operations register."
//
// What this is:
// A single horizontal line, persistent across all demo screens, in the
// register of a broadcast lower-third or naval-operations chyron. Pulls
// canonical operator framing from the onepager (5TH FLEET · 0200Z) plus
// the live scenario short-name in filename-as-title register (alara_01_).
//
// Five segments in mnemonic-mono with hairline separators:
//   LIMINAL CUSTODY · CASE alara_01 · 5TH FLEET · 0200Z · WATCH-1
//
// What this is NOT:
// - A stage label or panel header (those live inside their respective panels)
// - A phase indicator (the breadcrumb's P-pip handles that)
// - A status bar (no live values, no clock — the chyron is identity, not state)
//
// Plays in the operator's peripheral vision the entire demo. Judge sees the
// named pilot context (Army/xTech sentence) from the first frame.

import type { LoadedScenario } from "../lib/fixtures.ts";

interface BroadcastChyronProps {
  scenario: LoadedScenario | null;
}

export function BroadcastChyron({ scenario }: BroadcastChyronProps) {
  // Pull scenario short-name in filename register. Falls back to the
  // canonical demo scenario when the loader hasn't resolved yet — chyron
  // never reads as "loading" because that breaks the broadcast register.
  const scenarioShort = scenario
    ? scenario.state.scenarioRunId.replace(/^scenario:/, "").replace(/-/g, "_")
    : "alara_01";

  return (
    <div
      className="broadcast-chyron"
      role="banner"
      aria-label="Liminal Custody operating context"
    >
      <span className="broadcast-chyron__brand">LIMINAL CUSTODY</span>
      <span className="broadcast-chyron__sep" aria-hidden="true" />
      <span className="broadcast-chyron__seg">
        CASE <code>{scenarioShort}_</code>
      </span>
      <span className="broadcast-chyron__sep" aria-hidden="true" />
      <span className="broadcast-chyron__seg">5TH FLEET</span>
      <span className="broadcast-chyron__sep" aria-hidden="true" />
      <span className="broadcast-chyron__seg">0200Z</span>
      <span className="broadcast-chyron__sep" aria-hidden="true" />
      <span className="broadcast-chyron__seg broadcast-chyron__watch">
        WATCH-1
      </span>
    </div>
  );
}
