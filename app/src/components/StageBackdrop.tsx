// StageBackdrop — atmospheric SVG register behind the stage map.
//
// Reference: Sequoia AI Ascent stage backdrop (Andrej Karpathy keynote).
// Deep dark canvas + hand-drawn flowing organic linework + sparse white
// stippled-dot constellation accents in the upper-right. Editorial-poster
// aesthetic that lives BEHIND the operator-grade chrome (DataSourcesChips,
// MapLayers, DemoPrompt) without breaking the operator register.
//
// Pure SVG, no library dependency, no runtime cost. Renders once at mount.
// Absolute-positioned at z-index 0 inside the stage panel, BEHIND the map.
// pointer-events: none so it never intercepts map interaction.
//
// The flowing curves and stippled dots are deterministic (seeded from a
// fixed sequence) so the backdrop is stable across reloads — judges see
// the same composition every time, no jitter.
//
// Apprenticeship: @rickyretouch's Houdini "Containment MUBs" — points
// driven by force, not keyframed. Each stipple dot carries a per-particle
// phase + amplitude. CSS keyframes advect the dots through a tiny noise
// envelope (~1.6px peak, 24-38s period). Read as instrument-alive, not
// decoration. Layout-stable: drift is composited on transform, no paint.

import { useMemo } from "react";

interface StippleDot {
  x: number;
  y: number;
  r: number;
  alpha: number;
  // Force-driven drift parameters per-particle. Phase scatters the start of
  // each dot's drift cycle so the field doesn't pulse in unison; ampX/ampY
  // are sampled from noise so denser corner dots can drift further than
  // peripheral ones — matching the Houdini reference where the field is
  // strongest where the lines bunch. Period jitters per-dot too, so the
  // composition never re-syncs into a visible beat.
  phase: number;
  ampX: number;
  ampY: number;
  period: number;
}

// Deterministic stipple field for the upper-right constellation. Two
// hundred dots distributed in a falloff cloud — denser at top-right corner,
// sparser as you move toward center. Seeded so positions are stable.
function generateStipple(): StippleDot[] {
  const dots: StippleDot[] = [];
  // Linear-congruential generator for deterministic "random" seeding.
  let seed = 7919;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < 220; i++) {
    // Bias toward upper-right corner with falloff
    const ux = rand();
    const uy = rand();
    // Skew x toward right (high values), y toward top (low values)
    const xWeight = 0.55 + Math.pow(rand(), 0.4) * 0.45;
    const yWeight = Math.pow(rand(), 0.5) * 0.4;
    const x = xWeight * 1800;
    const y = yWeight * 800;
    // Drop-off probability: sparser the further from corner
    const cornerDist = Math.sqrt(
      Math.pow((1800 - x) / 1800, 2) + Math.pow(y / 800, 2)
    );
    if (rand() < cornerDist * 0.7) continue; // discard for sparseness
    const r = 0.6 + rand() * 1.4;
    const alpha = 0.35 + rand() * 0.55;
    // Drift envelope. Closer to the dense corner (cornerDist→0) → larger
    // amp. Far from corner → near-still. Peak amplitude clamped to ~1.6px
    // so the motion stays sub-perceptual on first read but registers as
    // life when the eye lingers.
    const driftWeight = Math.max(0, 1 - cornerDist);
    const ampX = (0.4 + rand() * 1.2) * driftWeight;
    const ampY = (0.4 + rand() * 1.2) * driftWeight;
    const period = 24 + rand() * 14; // 24–38s
    const phase = rand() * period; // negative animation-delay scrubs into cycle
    dots.push({ x, y, r, alpha, phase, ampX, ampY, period });
  }
  return dots;
}

export function StageBackdrop() {
  const dots = useMemo(generateStipple, []);

  return (
    <div className="stage-backdrop" aria-hidden="true">
      <svg
        viewBox="0 0 1800 1080"
        preserveAspectRatio="xMidYMid slice"
        width="100%"
        height="100%"
      >
        {/* Subtle radial vignette behind the linework — concentrates focus
            toward the center of the stage where the hero map renders. */}
        <defs>
          <radialGradient id="stage-backdrop-vignette" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="rgba(20, 30, 45, 0.0)" />
            <stop offset="60%" stopColor="rgba(8, 12, 18, 0.0)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.55)" />
          </radialGradient>
        </defs>

        {/* Flow curves removed — read as confusing squiggles over the map. */}

        {/* Stipple field — bright white dots in the upper-right corner,
            sparser toward center. References the AI Ascent constellation.
            Each dot now wears a per-particle drift envelope (ampX/Y, phase,
            period) so the field reads as instrument-alive rather than
            static. CSS keyframes consume the variables; SVG paint is
            unchanged so this stays GPU-cheap. */}
        <g className="stage-backdrop__stipple">
          {dots.map((dot, i) => (
            // Outer <g> drifts on X, inner on Y. Two nested transforms
            // compose without fighting (a single element can only host
            // one animated `transform` at a time). Periods are coprime
            // so the field never re-syncs into a visible beat.
            <g
              key={i}
              className="stage-backdrop__stipple-dot stage-backdrop__stipple-dot--x"
              style={{
                ["--drift-amp" as string]: `${dot.ampX}px`,
                ["--drift-period" as string]: `${dot.period}s`,
                ["--drift-phase" as string]: `-${dot.phase}s`
              }}
            >
              <g
                className="stage-backdrop__stipple-dot--y"
                style={{
                  ["--drift-amp" as string]: `${dot.ampY}px`,
                  ["--drift-period" as string]: `${dot.period * 1.37}s`,
                  ["--drift-phase" as string]: `-${dot.phase * 0.83}s`
                }}
              >
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r={dot.r}
                  fill="rgba(216, 226, 236, 1)"
                  opacity={dot.alpha}
                />
              </g>
            </g>
          ))}
        </g>

        {/* Vignette on top — pulls focus inward, ensures the chrome at the
            corners (DataSourcesChips bottom-left, MapLayers top-right)
            still has enough contrast to read against the dotted region. */}
        <rect
          x="0"
          y="0"
          width="1800"
          height="1080"
          fill="url(#stage-backdrop-vignette)"
        />
      </svg>
    </div>
  );
}
