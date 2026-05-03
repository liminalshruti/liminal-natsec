import type maplibregl from "maplibre-gl";

// Layered defence so a flaky basemap never blanks the demo:
//   tier 1: raster basemap loads → full Liminal look
//   tier 2: raster fails → strip the source, GeoJSON stays on the navy paint
//   tier 3 (component-level): MapLibre throws on construction → React error
//          boundary renders fallback.svg

export function attachTileFailureRecovery(map: maplibregl.Map): () => void {
  let warned = false;
  const handler = (event: { error?: Error; sourceId?: string; type?: string } & Record<string, unknown>) => {
    const sourceId = (event as { sourceId?: string }).sourceId;
    if (sourceId !== "basemap-raster") return;
    if (warned) return;
    warned = true;

    // eslint-disable-next-line no-console
    console.warn(
      "[map] basemap raster failed — falling back to GeoJSON on dark paint",
      event.error
    );

    // Remove the failed layer/source so MapLibre stops retrying every tile.
    try {
      if (map.getLayer("basemap-raster")) map.removeLayer("basemap-raster");
      if (map.getSource("basemap-raster")) map.removeSource("basemap-raster");
    } catch {
      // ignore — we tried, the navy paint is still there underneath
    }
  };

  map.on("error", handler as unknown as Parameters<maplibregl.Map["on"]>[1]);
  return () => map.off("error", handler as unknown as Parameters<maplibregl.Map["off"]>[1]);
}
