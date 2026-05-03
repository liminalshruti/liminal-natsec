// SignalGhostShips — temp ghost-ship overlay on the stage that renders
// each attached signal at its drop coordinates. Listens to the
// SIGNAL_ATTACHED_EVENT fired by SignalDropZone (B-1) and animates a
// ghost-ship sprite into place at those coordinates.
//
// Two modes per ghost:
//   1. Materializing (0–600ms): ghost fades in with a halo ring expanding
//      outward; ship svg fades in + scales from 0.4 → 1.0.
//   2. Settled (600–∞):       ghost holds at low opacity (~0.55) with a
//      subtle pulse; persists as long as the signal stays attached.
//
// Detach (toggleAttach again, or promote): ghost fades out over 360ms.
//
// What this is NOT:
// A MapLibre source. Coordinates here are stage-pixel-relative (from the
// SIGNAL_ATTACHED_EVENT detail.stageX/Y), not lat/lon. This is the
// editorial overlay that signals "the operator just attached this"; the
// real geographic projection happens via Shayaun's MapLibre layers.

import { useEffect, useMemo, useState } from "react";
import { useDraftCase } from "../lib/useDraftCase.ts";
import {
  SIGNAL_ATTACHED_EVENT,
  type SignalAttachedDetail
} from "../lib/signalDragTypes.ts";

interface Ghost {
  signalId: string;
  /** Pixel coords inside the stage panel where the signal was dropped. */
  x: number;
  y: number;
  /** Wall-clock ms when the ghost materialized. Used to gate the
   *  materialize → settled transition. */
  bornAt: number;
  /** Signal kind drives the icon + tone. */
  kind: string;
  /** Short label for the ghost's caption. */
  label: string;
}

const SIGNAL_KIND_GLYPH: Record<string, string> = {
  "ais-gap": "▲",
  sanctions: "✕",
  advisory: "⚑",
  imagery: "◉",
  "ship-vessel": "◆",
  osint: "◇"
};

const SIGNAL_KIND_TONE: Record<string, string> = {
  "ais-gap": "contested",
  sanctions: "refused",
  advisory: "decision",
  imagery: "decision",
  "ship-vessel": "decision",
  osint: "ink-tertiary"
};

export function SignalGhostShips() {
  const { draftCases } = useDraftCase();
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const signals = useMemo(
    () => draftCases.flatMap((draft) => draft.candidateSignals),
    [draftCases]
  );

  // Listen for drop events from SignalDropZone (B-1).
  useEffect(() => {
    function handler(e: Event) {
      const ce = e as CustomEvent<SignalAttachedDetail>;
      const { signalId, stageX, stageY } = ce.detail ?? {};
      if (!signalId) return;

      // Find the signal metadata from the draft store so we can label
      // and ic-on the ghost. If the signal doesn't exist (race), no-op.
      const signal = signals.find((s) => s.id === signalId);
      if (!signal) return;

      setGhosts((prev) => {
        // Dedupe — if the same signal already has a ghost, replace its
        // coords + bornAt rather than stacking another.
        const filtered = prev.filter((g) => g.signalId !== signalId);
        return [
          ...filtered,
          {
            signalId,
            x: stageX,
            y: stageY,
            bornAt: Date.now(),
            kind: signal.kind,
            label: signal.label
          }
        ];
      });
    }
    window.addEventListener(SIGNAL_ATTACHED_EVENT, handler);
    return () => window.removeEventListener(SIGNAL_ATTACHED_EVENT, handler);
    // We re-bind when draft signals change so the handler captures
    // the current signal list.
  }, [signals]);

  // Reconcile ghosts → only show ghosts for currently-attached signals.
  // When a signal detaches (toggle back to unattached) or the case is
  // promoted, the ghost fades out via the GhostShip's own state machine.
  useEffect(() => {
    setGhosts((prev) =>
      prev.filter((g) => {
        const sig = signals.find((s) => s.id === g.signalId);
        return sig?.attached;
      })
    );
  }, [signals]);

  if (ghosts.length === 0) return null;

  return (
    <div className="signal-ghosts" aria-hidden="true">
      {ghosts.map((g) => (
        <GhostShip key={g.signalId} ghost={g} />
      ))}
    </div>
  );
}

function GhostShip({ ghost }: { ghost: Ghost }) {
  const [phase, setPhase] = useState<"materializing" | "settled">("materializing");

  useEffect(() => {
    const t = setTimeout(() => setPhase("settled"), 600);
    return () => clearTimeout(t);
  }, []);

  const glyph = SIGNAL_KIND_GLYPH[ghost.kind] ?? "◇";
  const tone = SIGNAL_KIND_TONE[ghost.kind] ?? "ink-tertiary";

  return (
    <div
      className={`signal-ghost signal-ghost--${phase}`}
      style={{ left: `${ghost.x}px`, top: `${ghost.y}px` }}
      data-tone={tone}
    >
      {phase === "materializing" && (
        <span className="signal-ghost__halo" aria-hidden="true" />
      )}
      <span className="signal-ghost__icon" aria-hidden="true">
        {glyph}
      </span>
      <span className="signal-ghost__label">
        {ghost.label.slice(0, 28)}
      </span>
    </div>
  );
}
