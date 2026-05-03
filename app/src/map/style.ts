import type { StyleSpecification } from "maplibre-gl";
import { COLORS } from "./tokens.ts";

// Build a MapLibre style spec that:
//   - never requires a token,
//   - never depends on a glyph PBF pack (no text rendered by MapLibre — we
//     overlay HTML labels via React for token-freedom),
//   - falls through to a pure dark-navy paint if the optional raster basemap
//     URL is missing or fails to load.
//
// Default raster basemap: CartoDB Voyager dark-matter (free, no token). It
// renders at any AOI the demo replays through (Alara EEZ in fixture mode,
// Hormuz in real-mode), unlike a fixed-bbox image-source. Tiles are fetched
// only on map render so the cost is one-time, not on every frame.

const DEFAULT_BASEMAP_TILES =
  "https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png";
const DEFAULT_BASEMAP_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OSM</a> · © <a href="https://carto.com/attributions">CARTO</a>';

export interface BuildStyleOptions {
  rasterTilesUrl?: string;     // override; if not set, defaults to CartoDB Voyager dark
  rasterAttribution?: string;
  /** Disable the default basemap entirely (test harness flag). */
  disableBasemap?: boolean;
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

  const tilesUrl = opts.disableBasemap
    ? undefined
    : opts.rasterTilesUrl ?? DEFAULT_BASEMAP_TILES;

  if (tilesUrl) {
    sources["basemap-raster"] = {
      type: "raster",
      tiles: [tilesUrl],
      tileSize: 256,
      attribution: opts.rasterAttribution ?? DEFAULT_BASEMAP_ATTRIBUTION
    };
    layers.push({
      id: "basemap-raster",
      type: "raster",
      source: "basemap-raster",
      // Subtle: layered at low opacity + slight saturation pull so the dark
      // navy substrate shows through and the basemap reads as terrain context,
      // not as the visual primary. Tracks/markers stay the focal layer.
      paint: { "raster-opacity": 0.42, "raster-saturation": -0.3 }
    });
  }

  return {
    version: 8,
    name: "liminal-custody-watchfloor",
    center: INITIAL_VIEW.center,
    zoom: INITIAL_VIEW.zoom,
    bearing: INITIAL_VIEW.bearing,
    pitch: INITIAL_VIEW.pitch,
    sources,
    layers
  } satisfies StyleSpecification;
}

// Initial camera centred on the Strait of Hormuz AOI. The fixture replay was
// relocated from Eastern Med (Alara EEZ stand-in) to Hormuz coordinates so the
// map matches every doc, pitch script, and exec summary. Internal IDs still
// reference "alara-01" since they're stable identifiers, not geography.
export const INITIAL_VIEW = {
  center: [56.55, 26.60] as [number, number],
  zoom: 8.6,
  bearing: 0,
  pitch: 0
};
