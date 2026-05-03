import type { LayerSpecification } from "maplibre-gl";
import { COLORS } from "./tokens.ts";

// Source ids — referenced by the component when calling addSource.
export const SOURCES = {
  staticGeoJson: "tracks-static",         // monitored zone, predicted_ellipse_95, full hero_ping list
  heroPingsVisible: "hero-pings-visible", // time-sliced subset, refreshed by replay.ts
  dantiTrafficVisible: "danti-traffic-visible",
  dantiSanctionedOverlay: "danti-sanctioned-overlay" // 21 SDN/IRISL/NITC + 15 GFW AIS gaps
} as const;

export const DANTI_SANCTIONED_OVERLAY_PATH =
  "/fixtures/maritime/danti-sanctioned-overlay.geojson";

export interface LayerInputs {
  phase: number;
  // Retained on the interface so the caller doesn't need to change. No longer
  // used: selection emphasis lived on the (removed) hero-track line layers.
  selectedCaseId?: string | null;
}

// Build all layer specs. Static layers gate by `kind` + `phase_min` via
// MapLibre filter expressions — those are "hard" gates that survive any
// runtime bugs in the React component.
//
// Track-shape line layers (background_track, predicted_corridor, hero_track A,
// dark_gap, hero_track B, hero-selection-halo) were removed: the curves were
// unreadable as signal. Vessel position is communicated through the hero ping
// dots and ship-icon sprites; the dark-gap beat reads as a temporal gap in
// pings + an MMSI label change.
export function buildLayers(inputs: LayerInputs): LayerSpecification[] {
  const { phase } = inputs;
  const phaseAllowed = ["<=", ["get", "phase_min"], phase];

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
    },

    // Archived DANTI/MarineTraffic replay. This is not the hero dark-gap
    // scenario clock; MapWatchfloor maps the current scrubber progress onto
    // the April 2 archive window and feeds this source with the latest known
    // point per vessel. Keep it visually subordinate to the hero pings.
    {
      id: "layer:danti-traffic-points",
      type: "circle",
      source: SOURCES.dantiTrafficVisible,
      paint: {
        "circle-radius": [
          "case",
          ["==", ["get", "is_implausible_speed"], true], 6.2,
          ["==", ["get", "is_foreign_flag_iran_last_port"], true], 5.4,
          ["==", ["get", "is_iran_flag"], true], 4.8,
          ["==", ["get", "is_order_destination"], true], 4.2,
          ["==", ["get", "is_tanker"], true], 3.8,
          2.8
        ],
        "circle-color": [
          "case",
          ["==", ["get", "is_implausible_speed"], true], "#ffe082",
          ["==", ["get", "is_foreign_flag_iran_last_port"], true], "#b98cff",
          ["==", ["get", "is_iran_flag"], true], "#e36d5a",
          ["==", ["get", "is_order_destination"], true], "#67b8d6",
          ["==", ["get", "is_tanker"], true], "#78d7b1",
          "#6f8fa8"
        ],
        "circle-opacity": [
          "case",
          ["==", ["get", "is_underway"], true], 0.86,
          0.55
        ],
        "circle-stroke-color": "rgba(6,18,31,0.92)",
        "circle-stroke-width": 1
      }
    },
    {
      id: "layer:danti-traffic-labels",
      type: "symbol",
      source: SOURCES.dantiTrafficVisible,
      filter: [
        "any",
        ["==", ["get", "is_implausible_speed"], true],
        ["==", ["get", "is_foreign_flag_iran_last_port"], true],
        ["==", ["get", "is_iran_flag"], true],
        ["==", ["get", "is_order_destination"], true],
        ["==", ["get", "is_underway"], true]
      ],
      layout: {
        "text-field": ["get", "name"],
        "text-size": 10,
        "text-offset": [0.8, 0],
        "text-anchor": "left",
        "text-allow-overlap": false,
        "text-ignore-placement": false
      },
      paint: {
        "text-color": "#cfdbe8",
        "text-halo-color": "rgba(6,18,31,0.86)",
        "text-halo-width": 1.2,
        "text-opacity": 0.78
      }
    },

    // Sanctioned overlay — 21 IRISL/NITC/OFAC SDN vessels (red, with operator
    // label) + 15 GFW intentional AIS gap events (orange ring sized by gap
    // duration). Time-independent: this is canonical OFAC/sanctions context,
    // visible at every phase of the demo. Drawn last so it sits on top of the
    // archived danti-traffic dot field.
    {
      id: "layer:gfw-gap-ring",
      type: "circle",
      source: SOURCES.dantiSanctionedOverlay,
      filter: ["==", ["get", "kind"], "ais_gap"],
      paint: {
        // Visual encoding: ring radius scales with how long the vessel was
        // dark. Caps at ~24px so a multi-day gap doesn't swallow the map.
        "circle-radius": [
          "interpolate", ["linear"], ["get", "gap_duration_hours"],
          0, 6,
          24, 10,
          72, 16,
          168, 22,
          720, 28
        ],
        "circle-color": "rgba(255, 138, 64, 0.10)",
        "circle-stroke-color": "#ff8a40",
        "circle-stroke-width": 1.6,
        "circle-stroke-opacity": 0.85
      }
    },
    {
      id: "layer:gfw-gap-labels",
      type: "symbol",
      source: SOURCES.dantiSanctionedOverlay,
      filter: ["==", ["get", "kind"], "ais_gap"],
      layout: {
        "text-field": [
          "format",
          ["get", "ship_name"], { "font-scale": 1.0 },
          "\n", {},
          ["concat",
            ["to-string", ["round", ["get", "gap_duration_hours"]]],
            "h dark"
          ],
          { "font-scale": 0.78, "text-color": "#ffb380" }
        ],
        "text-size": 10,
        "text-offset": [0, 1.6],
        "text-anchor": "top",
        "text-allow-overlap": false,
        "text-ignore-placement": false
      },
      paint: {
        "text-color": "#ffd6b0",
        "text-halo-color": "rgba(6,18,31,0.92)",
        "text-halo-width": 1.4
      }
    },
    {
      id: "layer:sanctioned-halo",
      type: "circle",
      source: SOURCES.dantiSanctionedOverlay,
      filter: ["==", ["get", "kind"], "sanctioned_vessel"],
      paint: {
        "circle-radius": 11,
        "circle-color": "rgba(227, 109, 90, 0.18)",
        "circle-stroke-color": "rgba(227, 109, 90, 0.55)",
        "circle-stroke-width": 1
      }
    },
    {
      id: "layer:sanctioned-dot",
      type: "circle",
      source: SOURCES.dantiSanctionedOverlay,
      filter: ["==", ["get", "kind"], "sanctioned_vessel"],
      paint: {
        "circle-radius": 4.5,
        "circle-color": "#e36d5a",
        "circle-stroke-color": "rgba(6,18,31,0.95)",
        "circle-stroke-width": 1.4
      }
    },
    {
      id: "layer:sanctioned-labels",
      type: "symbol",
      source: SOURCES.dantiSanctionedOverlay,
      filter: ["==", ["get", "kind"], "sanctioned_vessel"],
      layout: {
        "text-field": [
          "format",
          ["get", "ship_name"], { "font-scale": 1.0 },
          "\n", {},
          ["get", "operator"], { "font-scale": 0.78 }
        ],
        "text-size": 10,
        "text-offset": [0.95, 0],
        "text-anchor": "left",
        "text-allow-overlap": false,
        "text-ignore-placement": false
      },
      paint: {
        "text-color": "#ffd1c4",
        "text-halo-color": "rgba(6,18,31,0.92)",
        "text-halo-width": 1.4
      }
    }
  ];
}
