// ReplayControls — manual prev/play-pause/next buttons next to the command line.
//
// Cut 08 had explicit "Previous beat" / "Advance beat" buttons. Our app
// previously auto-advanced phases via the scenario clock — meaning the
// speaker couldn't pause on a beat for Q&A or rewind during the demo.
// This is a real LIVE DEMO CONTROL gap that the cut anticipated.
//
// Three buttons, inline at the right edge of the command line:
//   ⏮ prev   — phase N → N-1, no-op at P1
//   ▶ / ⏸    — toggles isPlaying; icon swaps based on current state
//   ⏭ next   — phase N → N+1, no-op at P6
//
// Drives the existing controlled-mode contract MapWatchfloor exposes:
// state shape is { phase, clockIso, isPlaying }. The parent AppShell
// owns scenarioState; ReplayControls produces a new state and calls
// onScenarioStateChange. No server round-trip needed — the map's
// replay engine reacts to the controlled state immediately.

import type { ScenarioState } from "./MapWatchfloor.tsx";
import type { Phase } from "../map/replay.ts";

interface ReplayControlsProps {
  scenarioState?: ScenarioState;
  onScenarioStateChange?: (state: ScenarioState) => void;
}

const PHASE_MIN: Phase = 1;
const PHASE_MAX: Phase = 6;

// Beat-anchored timestamps for each phase, derived from the demo-video
// script's beat timing. When the operator jumps phases manually we don't
// want the clock to stay frozen at the previous beat's timestamp — the
// map's replay logic gates visibility on clockIso, so jumping the phase
// without bumping the clock leaves track-B hidden at P3, etc. These
// anchors are in the same ISO-8601 demo window as the seeded scenario.
const PHASE_ANCHOR_ISO: Record<Phase, string> = {
  1: "2026-04-18T09:55:00Z",
  2: "2026-04-18T10:25:00Z",
  3: "2026-04-18T11:10:00Z",
  4: "2026-04-18T12:30:00Z",
  5: "2026-04-18T13:00:00Z",
  6: "2026-04-18T13:15:00Z"
};

function clampPhase(n: number): Phase {
  if (n < PHASE_MIN) return PHASE_MIN;
  if (n > PHASE_MAX) return PHASE_MAX;
  return n as Phase;
}

export function ReplayControls({
  scenarioState,
  onScenarioStateChange
}: ReplayControlsProps) {
  // Render the controls even when scenarioState is undefined — buttons stay
  // disabled until the map has handed up state. Keeps layout stable across
  // the controlled/uncontrolled handoff at first mount.
  const phase = scenarioState?.phase ?? null;
  const isPlaying = scenarioState?.isPlaying ?? true;
  const ready = scenarioState !== undefined && Boolean(onScenarioStateChange);
  const atMin = phase === PHASE_MIN;
  const atMax = phase === PHASE_MAX;

  function jumpTo(nextPhase: Phase) {
    if (!scenarioState || !onScenarioStateChange) return;
    onScenarioStateChange({
      ...scenarioState,
      phase: nextPhase,
      clockIso: PHASE_ANCHOR_ISO[nextPhase]
    });
  }

  function togglePlay() {
    if (!scenarioState || !onScenarioStateChange) return;
    onScenarioStateChange({
      ...scenarioState,
      isPlaying: !scenarioState.isPlaying
    });
  }

  return (
    <div
      className="replay-controls"
      role="group"
      aria-label="Replay controls"
    >
      <button
        type="button"
        className="replay-controls__btn"
        onClick={() => phase != null && jumpTo(clampPhase(phase - 1))}
        disabled={!ready || atMin}
        title={atMin ? "At first beat" : `Previous beat (P${phase != null ? phase - 1 : "?"})`}
        aria-label="Previous beat"
      >
        <span aria-hidden>⏮</span>
        <span className="replay-controls__label">prev</span>
      </button>

      <button
        type="button"
        className={`replay-controls__btn replay-controls__btn--play${
          isPlaying ? " replay-controls__btn--playing" : ""
        }`}
        onClick={togglePlay}
        disabled={!ready}
        title={isPlaying ? "Pause replay" : "Play replay"}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        <span aria-hidden>{isPlaying ? "⏸" : "▶"}</span>
        <span className="replay-controls__label">
          {isPlaying ? "pause" : "play"}
        </span>
      </button>

      <button
        type="button"
        className="replay-controls__btn"
        onClick={() => phase != null && jumpTo(clampPhase(phase + 1))}
        disabled={!ready || atMax}
        title={atMax ? "At last beat" : `Next beat (P${phase != null ? phase + 1 : "?"})`}
        aria-label="Next beat"
      >
        <span className="replay-controls__label">next</span>
        <span aria-hidden>⏭</span>
      </button>
    </div>
  );
}
