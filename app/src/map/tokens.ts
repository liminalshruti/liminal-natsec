// Liminal-grade signal/radar/topographic palette.
// Single source of truth for all map colours so the look stays coherent.

export const COLORS = {
  background:           "#06121f",   // deep navy — drawn as bottom paint layer
  graticule:            "#0e2236",
  backgroundTrack:      "#22344a",
  backgroundTrackDim:   "#172638",   // even fainter when a case is selected
  monitoredZoneStroke:  "#3a8cae",
  monitoredZoneFill:    "rgba(58, 140, 174, 0.06)",
  monitoredZonePulse:   "rgba(58, 140, 174, 0.45)",
  heroTrackANormal:     "#67b8d6",   // cyan — pre-anomaly
  heroTrackAWarned:     "#9aa9b8",   // muted blue-grey — Track A after anomaly fires
  heroTrackADarkGap:    "#b97f3f",   // amber dashed — the visible break
  heroTrackB:           "#f0a040",   // warmer amber — different identity
  predictedCorridor:    "rgba(255, 255, 255, 0.42)",
  predictedEllipseFill: "rgba(240, 160, 64, 0.10)",
  predictedEllipseLine: "rgba(240, 160, 64, 0.55)",
  heroVesselNormal:     "#67b8d6",
  heroVesselAnomaly:    "#f0a040",
  heroVesselHalo:       "rgba(240, 160, 64, 0.35)",
  selectedHighlight:    "#ffe082",   // warm gold — selected case emphasis
  selectedHaloA:        "rgba(103, 184, 214, 0.38)",
  selectedHaloB:        "rgba(240, 160, 64, 0.45)"
} as const;

export const PHASE_LABELS: Record<number, string> = {
  1: "Normal traffic",
  2: "Dark gap alert",
  3: "Second identity",
  4: "Custody case",
  5: "Refusal + action",
  6: "Review memory"
};

// Demo replay: jumps in seconds, but the timeline label says 72 hours so the
// scenario feels operationally grounded (per PRD §9.1).
export const TIMELINE_LABEL = "72-hour review window";
