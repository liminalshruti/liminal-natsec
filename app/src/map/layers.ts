import type { LayerSpecification } from "maplibre-gl";
import { COLORS } from "./tokens.ts";

// Source ids — referenced by the component when calling addSource.
export const SOURCES = {
  staticGeoJson: "tracks-static",         // monitored zone, background, hero LineStrings, dark_gap, predicted_corridor, predicted_ellipse_95, full hero_ping list
  heroPingsVisible: "hero-pings-visible"  // time-sliced subset, refreshed by replay.ts
} as const;

export interface LayerInputs {
  phase: number;
  // Case currently selected in the working panel — affects emphasis only,
  // never visibility (visibility is gated by phase_min). Pass null/undefined
  // for "no selection".
  selectedCaseId?: string | null;
}

// Build all layer specs. Static layers gate by `kind` + `phase_min` via
// MapLibre filter expressions — those are "hard" gates that survive any
// runtime bugs in the React component. Selection emphasis flows through
// case_id paint expressions on hero layers only.
export function buildLayers(inputs: LayerInputs): LayerSpecification[] {
  const { phase, selectedCaseId } = inputs;
  const phaseAllowed = ["<=", ["get", "phase_min"], phase];

  // Track A pre-gap: cyan while normal, muted blue-grey once the anomaly has
  // fired (phase >= 2). Implements the brief's "hero vessel styling changes
  // when anomaly fires" without depending on a separate event.
  const trackAColor =
    phase >= 2 ? COLORS.heroTrackAWarned : COLORS.heroTrackANormal;

  // Selection emphasis: when a case is selected, hero tracks belonging to
  // that case get a wider stroke; non-hero geometry dims. When nothing is
  // selected, hero tracks render at default emphasis.
  const isCaseSelected = Boolean(selectedCaseId);
  const isThisCaseSelected = (caseId: string): unknown =>
    isCaseSelected && selectedCaseId === caseId;

  // Background opacity drops a notch when any case is selected so the eye
  // tracks the highlighted hero pair, not random ambient traffic.
  const backgroundOpacity = isCaseSelected ? 0.22 : 0.45;
  const backgroundColor =
    isCaseSelected ? COLORS.backgroundTrackDim : COLORS.backgroundTrack;

  // Hero stroke width per case — selected gets a boost; non-selected stays
  // standard so the timeline's "compare both events" beat still reads.
  const heroWidthFor = (caseId: string): number =>
    isThisCaseSelected(caseId) ? 4.0 : 2.4;

  const heroOpacityFor = (caseId: string): number =>
    !isCaseSelected ? 0.95 : isThisCaseSelected(caseId) ? 1.0 : 0.55;

  return [
    // Monitored zone fill (under everything else).
    {
      id: "layer:monitored-zone-fill",
      type: "fill",
      source: SOURCES.staticGeoJson,
      filter: ["all", ["==", ["get", "kind"], "monitored_zone"], phaseAllowed],
      paint: {
        "fill-color": COLORS.monitoredZoneFill,
        "fill-outline-color": COLORS.monitoredZoneStroke
      }
    },
    {
      id: "layer:monitored-zone-line",
      type: "line",
      source: SOURCES.staticGeoJson,
      filter: ["all", ["==", ["get", "kind"], "monitored_zone"], phaseAllowed],
      paint: {
        "line-color": COLORS.monitoredZoneStroke,
        "line-width": 1.2,
        "line-opacity": 0.85
      }
    },

    // Background traffic — faint, no labels; dims further on selection.
    {
      id: "layer:background-tracks",
      type: "line",
      source: SOURCES.staticGeoJson,
      filter: ["all", ["==", ["get", "kind"], "background_track"], phaseAllowed],
      paint: {
        "line-color": backgroundColor,
        "line-width": 1.0,
        "line-opacity": backgroundOpacity
      }
    },

    // Predicted 95% ellipse — soft amber glow with a brighter outline.
    {
      id: "layer:predicted-ellipse-fill",
      type: "fill",
      source: SOURCES.staticGeoJson,
      filter: ["all", ["==", ["get", "kind"], "predicted_ellipse_95"], phaseAllowed],
      paint: { "fill-color": COLORS.predictedEllipseFill }
    },
    {
      id: "layer:predicted-ellipse-line",
      type: "line",
      source: SOURCES.staticGeoJson,
      filter: ["all", ["==", ["get", "kind"], "predicted_ellipse_95"], phaseAllowed],
      paint: {
        "line-color": COLORS.predictedEllipseLine,
        "line-width": 1.2,
        "line-dasharray": [2, 3]
      }
    },

    // Predicted corridor — dashed white centerline through the ellipse.
    {
      id: "layer:predicted-corridor",
      type: "line",
      source: SOURCES.staticGeoJson,
      filter: ["all", ["==", ["get", "kind"], "predicted_corridor"], phaseAllowed],
      paint: {
        "line-color": COLORS.predictedCorridor,
        "line-width": 1.4,
        "line-dasharray": [2, 4]
      }
    },

    // Selection halo — a wider, faint stroke under the hero line for the
    // selected case. Painted before the main hero strokes so it reads as a
    // glow. Filter resolves to "select nothing" when no case is selected.
    {
      id: "layer:hero-selection-halo",
      type: "line",
      source: SOURCES.staticGeoJson,
      filter: [
        "all",
        ["==", ["get", "kind"], "hero_track"],
        ["==", ["get", "case_id"], selectedCaseId ?? "__none__"],
        phaseAllowed
      ],
      paint: {
        "line-color": COLORS.selectedHighlight,
        "line-width": 8.0,
        "line-opacity": 0.22,
        "line-blur": 3
      }
    },

    // Hero Track A pre-gap (cyan → muted at phase >= 2).
    {
      id: "layer:hero-track-A",
      type: "line",
      source: SOURCES.staticGeoJson,
      filter: [
        "all",
        ["==", ["get", "kind"], "hero_track"],
        ["==", ["get", "role"], "A"],
        phaseAllowed
      ],
      paint: {
        "line-color": trackAColor,
        "line-width": [
          "case",
          ["==", ["get", "case_id"], selectedCaseId ?? "__none__"],
          heroWidthFor(selectedCaseId ?? ""),
          2.4
        ],
        "line-opacity": [
          "case",
          ["==", ["get", "case_id"], selectedCaseId ?? "__none__"],
          heroOpacityFor(selectedCaseId ?? ""),
          isCaseSelected ? 0.55 : 0.95
        ]
      }
    },

    // Dark gap — dashed amber LineString from last A to first B.
    {
      id: "layer:dark-gap",
      type: "line",
      source: SOURCES.staticGeoJson,
      filter: ["all", ["==", ["get", "kind"], "dark_gap"], phaseAllowed],
      paint: {
        "line-color": COLORS.heroTrackADarkGap,
        "line-width": 2.2,
        "line-dasharray": [1.5, 2.5],
        "line-opacity": 0.9
      }
    },

    // Hero Track B (post-gap, distinct identity).
    {
      id: "layer:hero-track-B",
      type: "line",
      source: SOURCES.staticGeoJson,
      filter: [
        "all",
        ["==", ["get", "kind"], "hero_track"],
        ["==", ["get", "role"], "B"],
        phaseAllowed
      ],
      paint: {
        "line-color": COLORS.heroTrackB,
        "line-width": [
          "case",
          ["==", ["get", "case_id"], selectedCaseId ?? "__none__"],
          heroWidthFor(selectedCaseId ?? ""),
          2.4
        ],
        "line-opacity": [
          "case",
          ["==", ["get", "case_id"], selectedCaseId ?? "__none__"],
          heroOpacityFor(selectedCaseId ?? ""),
          isCaseSelected ? 0.55 : 0.95
        ]
      }
    },

    // Hero ping markers — fed by the time-sliced source so they appear as
    // the replay clock advances. setData on this source per scrub frame.
    {
      id: "layer:hero-pings",
      type: "circle",
      source: SOURCES.heroPingsVisible,
      paint: {
        "circle-radius": [
          "case",
          ["==", ["get", "is_latest"], true], 6,
          3
        ],
        "circle-color": [
          "case",
          ["==", ["get", "role"], "A"],
            (phase >= 2 ? COLORS.heroTrackAWarned : COLORS.heroVesselNormal),
          COLORS.heroVesselAnomaly
        ],
        "circle-stroke-color": [
          "case",
          ["==", ["get", "is_latest"], true], COLORS.heroVesselHalo,
          "rgba(0,0,0,0)"
        ],
        "circle-stroke-width": [
          "case",
          ["==", ["get", "is_latest"], true], 4,
          0
        ],
        "circle-opacity": 0.95
      }
    },

    // Ship-icon sprites — workshop principle: "if it's a ship, make it a ship."
    // Renders a schematic ship-hull icon over the latest ping per role, on top
    // of the circle marker. Falls through silently if the icon images failed
    // to load (the circle layer below still shows vessel position).
    {
      id: "layer:hero-ships",
      type: "symbol",
      source: SOURCES.heroPingsVisible,
      filter: ["==", ["get", "is_latest"], true],
      layout: {
        // Choose the icon variant by Track A vs B. After phase 2 the system
        // is in alert state — Track A's icon also shifts to the alert sprite
        // to communicate "this vessel's identity chain is contested."
        "icon-image": [
          "case",
          ["==", ["get", "role"], "A"],
            (phase >= 2 ? "ship-icon-alert" : "ship-icon-normal"),
          "ship-icon-alert"
        ],
        "icon-size": 1,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-anchor": "center"
      }
    }
  ];
}
