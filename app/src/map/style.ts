import type { StyleSpecification } from "maplibre-gl";
import { COLORS } from "./tokens.ts";

// Build a MapLibre style spec that:
//   - never requires a token,
//   - never depends on a glyph PBF pack (no text rendered by MapLibre — we
//     overlay HTML labels via React for token-freedom),
//   - falls through to a pure dark-navy paint if the optional raster basemap
//     URL is missing or fails to load.
//
// The dark background is a real layer (not just CSS) so canvas-mode screenshots
// look right and so the demo never shows a white flash before tiles arrive.

export interface BuildStyleOptions {
  rasterTilesUrl?: string;     // e.g. https://tile.openfreemap.org/styles/dark/{z}/{x}/{y}.png
  rasterAttribution?: string;
}

export function buildMapStyle(opts: BuildStyleOptions = {}): StyleSpecification {
  const sources: StyleSpecification["sources"] = {};
  const layers: NonNullable<StyleSpecification["layers"]> = [
    {
      id: "navy-background",
      type: "background",
      paint: { "background-color": COLORS.background }
    }
  ];

  if (opts.rasterTilesUrl) {
    sources["basemap-raster"] = {
      type: "raster",
      tiles: [opts.rasterTilesUrl],
      tileSize: 256,
      attribution: opts.rasterAttribution ?? ""
    };
    layers.push({
      id: "basemap-raster",
      type: "raster",
      source: "basemap-raster",
      paint: { "raster-opacity": 0.55, "raster-saturation": -0.4 }
    });
  }

  return {
    version: 8,
    name: "seaforge-watchfloor",
    center: INITIAL_VIEW.center,
    zoom: INITIAL_VIEW.zoom,
    bearing: INITIAL_VIEW.bearing,
    pitch: INITIAL_VIEW.pitch,
    sources,
    layers
  } satisfies StyleSpecification;
}

// Initial camera centred on the AOI (TECHNICAL_PLAN §14.1).
export const INITIAL_VIEW = {
  center: [31.65, 34.92] as [number, number],
  zoom: 8.4,
  bearing: 0,
  pitch: 0
};
