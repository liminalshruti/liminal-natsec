// Map bridge — shared map-instance accessor + reactive projection hook.
//
// Why this exists:
// All SVG overlays (RealShipsOverlay, MapInkBase, MapOverlays, etc.) were
// rendering against a fixed AOI bbox projection — when the operator zoomed
// or panned the underlying MapLibre map, the SVG overlays stayed frozen.
// This bridge gives overlays a reference to the live map instance and a
// hook that re-renders them on every move/zoom event so coordinates stay
// in lockstep with the basemap.
//
// Pattern: tiny pub/sub registry. MapWatchfloor calls registerMap(map) on
// load; overlays use useMapVersion() to subscribe to a tick that fires on
// every map move. Each overlay then calls map.project([lon, lat]) inline
// to compute current screen coords.

import { useEffect, useState } from "react";
import type maplibregl from "maplibre-gl";

let registered: maplibregl.Map | null = null;
let version = 0;
const listeners = new Set<() => void>();

function bumpVersion() {
  version++;
  listeners.forEach((l) => l());
}

/** Called by MapWatchfloor on map load. Wires move/zoom listeners that
 *  bump a global version counter; all overlay hooks re-render on bump. */
export function registerMap(map: maplibregl.Map): () => void {
  registered = map;
  // Bump on every move so overlays follow camera changes. `move` fires
  // continuously during pan/zoom; React 18 batches state updates so this
  // is fine. If perf becomes an issue, throttle here.
  const handler = () => bumpVersion();
  map.on("move", handler);
  map.on("zoom", handler);
  // Initial bump so overlays know the map is now ready.
  bumpVersion();
  return () => {
    map.off("move", handler);
    map.off("zoom", handler);
    if (registered === map) {
      registered = null;
      bumpVersion();
    }
  };
}

/** Returns the current map instance (or null before MapWatchfloor mounts).
 *  Subscribes the caller to re-render on every map move/zoom. */
export function useLiveMap(): { map: maplibregl.Map | null; version: number } {
  const [v, setV] = useState(version);
  useEffect(() => {
    const l = () => setV(version);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return { map: registered, version: v };
}

/** Project a single lat/lon to screen pixel coords using the live map.
 *  Returns null if the map isn't registered yet. The caller should also
 *  subscribe to useLiveMap() in the same component so re-renders fire on
 *  every map move (otherwise this only fires on initial mount). */
export function projectLatLon(
  map: maplibregl.Map | null,
  lon: number,
  lat: number
): { x: number; y: number } | null {
  if (!map) return null;
  const p = map.project([lon, lat]);
  return { x: p.x, y: p.y };
}
