// SubstrateStateChyron — single persistent line at the bottom of the shell
// that names the system's continuous self-state in plain English.
//
// Per docs/design/INSPO_TO_SURFACE_MAP.md STRETCH-1 (Source 10 · aerockrose,
// Sequoia AI Ascent stage register):
//
//   "Single persistent live line in plain English:
//      substrate :: holding · 14 nodes wet · 3 specialists drying.
//    System's continuous self-narration. Gives non-technical judge a
//    thread to follow."
//
// What this is:
// A bottom chyron (sibling to the top broadcast chyron) that reports
// substrate state as a single line. Three segments:
//   1. system stance     "substrate :: holding" / "substrate :: settling"
//   2. wet count         "14 nodes wet"  (custody-held evidence)
//   3. drying count      "3 specialists drying" (consensus forming)
//
// Composes with SHIP-3 wet/drying/dry — the chyron names the same
// epistemic vocabulary at system scale that SHIP-3 names at row scale.
// Threads non-technical judges through any beat they miss.
//
// Source-derived from AlertView + scenario state — no new data wiring,
// no fixture-vs-AIP divergence.

import type { LoadedScenario } from "../lib/fixtures.ts";
import type { ScenarioState } from "./MapWatchfloor.tsx";

interface SubstrateStateChyronProps {
  scenario: LoadedScenario | null;
  scenarioState: ScenarioState | undefined;
}

export function SubstrateStateChyron({
  scenario,
  scenarioState
}: SubstrateStateChyronProps) {
  const phase = scenarioState?.phase ?? 1;
  const alertCount = scenario?.state.alerts?.length ?? 0;

  // Derive the substrate state from phase + alert count.
  // - holding: there's an active custody process (alerts present, phase >= 2)
  // - settling: no alerts, phase 1, system at rest
  // - reviewing: rule-fired phase (>= 6)
  const stance =
    phase >= 6
      ? "reviewing"
      : alertCount > 0 && phase >= 2
      ? "holding"
      : "settling";

  // Wet count: contested evidence + open hypotheses + draft cases.
  // Heuristic — N alerts × 5 wet nodes per alert as a proxy for the
  // evidence/hypothesis/observation graph density. Replaces a real
  // graph traversal with a believable readout for the demo. Same
  // shape in fixture-mode and AIP-mode (alerts come from the same
  // scenario state).
  const wetNodes = phase >= 2 ? Math.max(0, alertCount * 5 - phase) : 0;

  // Drying count: specialists currently mid-deliberation. Phase 2-4
  // is when specialists are working; phase 5+ they've reached verdict.
  const dryingSpecialists =
    phase === 2 ? 6 : phase === 3 ? 5 : phase === 4 ? 3 : phase === 5 ? 1 : 0;

  // Final segment: case-handoff state. After phase 6 a rule has been
  // applied to a second case — that's the durable-doctrine moment.
  const handoff =
    phase >= 6
      ? "rule R-001 applied · second case re-ranked"
      : phase === 5
      ? "intent refused · structural guard fired"
      : phase === 4
      ? "signal integrity contested · 3 specialists converged"
      : phase === 3
      ? "kalman fit predicted · track B reappeared"
      : phase === 2
      ? "track A dark-gap detected · 38m"
      : "watchfloor at rest";

  return (
    <div
      className="substrate-state-chyron"
      role="status"
      aria-live="polite"
      aria-label="Substrate state"
    >
      <span className="substrate-state-chyron__lead">substrate ::</span>
      <span
        className={`substrate-state-chyron__stance substrate-state-chyron__stance--${stance}`}
      >
        {stance}
      </span>
      <span className="substrate-state-chyron__sep" aria-hidden="true">·</span>
      <span className="substrate-state-chyron__seg">
        <strong>{wetNodes}</strong> nodes wet
      </span>
      <span className="substrate-state-chyron__sep" aria-hidden="true">·</span>
      <span className="substrate-state-chyron__seg">
        <strong>{dryingSpecialists}</strong> specialists drying
      </span>
      <span
        className="substrate-state-chyron__sep substrate-state-chyron__sep--leading"
        aria-hidden="true"
      >
        ·
      </span>
      <span className="substrate-state-chyron__handoff">{handoff}</span>
    </div>
  );
}
