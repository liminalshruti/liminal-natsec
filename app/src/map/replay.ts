import type { Feature, FeatureCollection, Point } from "geojson";
import type { HeroPingProps, TracksFixture } from "./fixtureLoader.ts";

// Pure functions. No React, no maplibre-gl, no globals — easy to unit-test
// and easy to reason about. Component code calls these and feeds the result
// into setData on the hero-pings source.

export type Phase = 1 | 2 | 3 | 4 | 5 | 6;

export function clockMs(iso: string | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY; // uncontrolled / "show everything"
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return t;
}

// Defence-in-depth phase gate. Layer filters already gate by phase_min, but
// duplicating here means even if a future layer change forgets the gate,
// Event-2 features still won't leak into Phase 1–5.
function phaseAllows(props: HeroPingProps, phase: Phase): boolean {
  return (props.phase_min ?? 1) <= phase;
}

export interface VisiblePingsOptions {
  phase: Phase;
  clockMs: number;        // pings with t_epoch_ms <= clockMs are visible
}

export function selectVisibleHeroPings(
  fixture: TracksFixture,
  opts: VisiblePingsOptions
): FeatureCollection<Point, HeroPingProps & { is_latest: boolean }> {
  type EnrichedFeature = Feature<Point, HeroPingProps & { is_latest: boolean }>;
  const candidates: EnrichedFeature[] = [];

  for (const f of fixture.features) {
    const props = f.properties as HeroPingProps | null;
    if (!props || props.kind !== "hero_ping") continue;
    if (!phaseAllows(props, opts.phase)) continue;
    if (typeof props.t_epoch_ms !== "number") continue;
    if (props.t_epoch_ms > opts.clockMs) continue;
    if (f.geometry.type !== "Point") continue;

    candidates.push({
      type: "Feature",
      id: f.id,
      properties: { ...props, is_latest: false },
      geometry: f.geometry
    });
  }

  // For each (event_id, role), the latest ping gets is_latest=true so the
  // layer can render it as a halo'd "current position" marker.
  const latestByGroup = new Map<string, EnrichedFeature>();
  for (const f of candidates) {
    const key = `${f.properties.event_id}:${f.properties.role}`;
    const existing = latestByGroup.get(key);
    if (!existing || f.properties.t_epoch_ms > existing.properties.t_epoch_ms) {
      latestByGroup.set(key, f);
    }
  }
  for (const f of latestByGroup.values()) {
    f.properties.is_latest = true;
  }

  return { type: "FeatureCollection", features: candidates };
}

// Phase tick markers for the timeline scrubber. Returns ISO strings the
// scrubber uses to draw vertical ticks under the playhead.
export function phaseTicks(fixture: TracksFixture): Array<{
  phase: Phase;
  iso: string;
  label: string;
}> {
  const ts = fixture.metadata?.canonical_timestamps;
  if (!ts) return [];
  return [
    { phase: 1, iso: ts.event1.track_a_first_iso,  label: "Normal traffic"   },
    { phase: 2, iso: ts.event1.gap_start_iso,      label: "Dark gap alert"   },
    { phase: 3, iso: ts.event1.track_b_first_iso,  label: "Second identity"  },
    { phase: 6, iso: ts.event2.track_b2_reappear_iso, label: "Review memory" }
  ];
}

// Derive "what phase are we in given this clock" so the uncontrolled
// (standalone) demo can advance phases automatically.
export function inferPhase(fixture: TracksFixture, clockMs: number): Phase {
  const ticks = phaseTicks(fixture);
  let phase: Phase = 1;
  for (const tick of ticks) {
    if (Date.parse(tick.iso) <= clockMs) phase = tick.phase;
  }
  return phase;
}

// First and last meaningful ms in the fixture timeline — clamps the scrubber
// and the rAF clock so it doesn't run off the end.
export function timelineBounds(
  fixture: TracksFixture
): { startMs: number; endMs: number } {
  const ts = fixture.metadata?.canonical_timestamps;
  if (!ts) {
    return { startMs: 0, endMs: 0 };
  }
  return {
    startMs: Date.parse(ts.event1.track_a_first_iso),
    endMs:   Date.parse(ts.event2.track_b2_reappear_iso) + 10 * 60_000 // pad 10 min after last reappearance
  };
}
