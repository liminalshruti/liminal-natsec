// DemoPrompt — phase-triggered handwritten annotation overlay on the stage.
//
// Three audiences, one component:
//   1. Shruti + Shayaun on stage — cognitive offload, prompts what to say next
//   2. Judges in the room — narrative scaffolding, follow-along legibility
//   3. Future-Shruti rewatching the recording — artifact comprehension
//
// Auto-triggers off the existing scenario state machine (no keyboard cue
// to remember during pitch). Renders in Liminal Hand (Editor's Hand local
// on the demo machine) → Caveat (free fallback shipped in app/public/fonts/)
// → cursive system family. Three audiences, one font register, no
// commercial-font redistribution.
//
// Per the brand-handwriting design canon: this is the operative-density
// narrative layer over the existing operative+forensic surfaces. Editorial
// markup on the live custody artifact, in the Liminal/Jen-Wagner brand
// register. NOT a teleprompter — the headline is the line; the next-beat
// preview gives delivery rhythm runway.
//
// Hide with ESC at any time during pitch.

import { useEffect, useState } from "react";

import type { Phase } from "../map/replay.ts";

interface DemoPromptProps {
  phase: Phase | null | undefined;
  /** Toggle to hide all prompts mid-pitch. ESC key handler also flips this. */
  hidden?: boolean;
}

interface PromptCue {
  phase: Phase;
  /** The line to deliver. Rendered LARGE in Liminal Hand. */
  headline: string;
  /** Tiny next-beat hint so the speaker has delivery rhythm runway. */
  next?: string;
}

// Phase cues are sized for what-to-say-next legibility from ~6 feet
// (judging distance), not editorial flourish. Headline IS the line.
// Subline is the next beat so the speaker isn't surprised.
const CUES: PromptCue[] = [
  {
    phase: 1,
    headline: "Normal traffic. The watch is quiet.",
    next: "A vessel is about to go dark."
  },
  {
    phase: 2,
    headline: "Vessel goes dark — 38 minutes of silence.",
    next: "Kalman corridor predicts where it should reappear."
  },
  {
    phase: 3,
    headline: "A different MMSI appears, same kinematics.",
    next: "Three custody hypotheses open — same vessel, receiver gap, or spoof."
  },
  {
    phase: 4,
    headline: "Signal Integrity is contested.",
    next: "Identity, Visual, Kinematics converge on source-chain compromise."
  },
  {
    phase: 5,
    headline: "Intent refuses — structurally enforced by the guard.",
    next: "Operator writes a review rule. The rule saves to memory."
  },
  {
    phase: 6,
    headline: "Next case — the rule changed the recommendation.",
    next: "Doctrine compounds. The unit now knows what this watch knew."
  }
];

const FADE_AFTER_MS = 8000;

export function DemoPrompt({ phase, hidden }: DemoPromptProps) {
  const [escHidden, setEscHidden] = useState(false);
  const [fading, setFading] = useState(false);

  // Reset fade state on phase change so each new cue gets the full 8s window
  useEffect(() => {
    setFading(false);
    if (phase == null) return;
    const handle = window.setTimeout(() => setFading(true), FADE_AFTER_MS);
    return () => window.clearTimeout(handle);
  }, [phase]);

  // ESC dismisses the overlay for the rest of the demo (operator can dismiss
  // mid-pitch if it crowds the moment). Toggle, not one-way: ESC again restores.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEscHidden((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (hidden || escHidden || phase == null) return null;
  const cue = CUES.find((c) => c.phase === phase);
  if (!cue) return null;

  return (
    <div
      className={`demo-prompt${fading ? " demo-prompt--fading" : ""}`}
      aria-live="polite"
      role="region"
      aria-label="Demo narration prompt"
    >
      <div className="demo-prompt__phase">P{phase}</div>
      <div className="demo-prompt__headline">{cue.headline}</div>
      {cue.next && (
        <div className="demo-prompt__next">
          <span className="demo-prompt__next-label">next</span>
          {cue.next}
        </div>
      )}
    </div>
  );
}
