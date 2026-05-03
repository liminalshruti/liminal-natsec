import { useEffect, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import type { TracksFixture } from "./fixtureLoader.ts";
import type { Phase } from "./replay.ts";

// HTML overlays anchored to lon/lat via map.project(). We use an HTML layer
// instead of MapLibre symbol/text layers so the demo stays token-free
// (no glyph PBF pack required).

interface LabelDef {
  id: string;
  lonLat: [number, number];
  text: string;
  variant: "vessel-A" | "vessel-B" | "ellipse" | "zone" | "predicted-state";
  visible: boolean;
}

export interface MapLabelsProps {
  map: maplibregl.Map | null;
  fixture: TracksFixture | null;
  phase: Phase | null;
}

export function MapLabels({ map, fixture, phase }: MapLabelsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tick, setTick] = useState(0);

  // Re-position labels in lock-step with the map. We listen to `render`
  // (fires every paint, so labels track the map even when source data
  // updates without a camera change), but coalesce via requestAnimationFrame
  // so React only re-renders at most once per browser frame — that kills the
  // per-paint flicker we used to see while staying visually glued to the map.
  useEffect(() => {
    if (!map) return;
    let pending = false;
    let rafId = 0;
    const bump = () => {
      if (pending) return;
      pending = true;
      rafId = requestAnimationFrame(() => {
        pending = false;
        setTick((t) => t + 1);
      });
    };
    map.on("move", bump);
    map.on("zoom", bump);
    map.on("render", bump);
    map.on("resize", bump);
    bump();
    return () => {
      map.off("move", bump);
      map.off("zoom", bump);
      map.off("render", bump);
      map.off("resize", bump);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [map]);

  if (!map || !fixture || phase == null) return <div ref={containerRef} className="map-labels-layer" />;

  const labels = computeLabels(fixture, phase);

  return (
    <div ref={containerRef} className="map-labels-layer" data-tick={tick} aria-hidden="true">
      {labels.map((label) => {
        if (!label.visible) return null;
        const projected = safeProject(map, label.lonLat);
        if (!projected) return null;
        return (
          <div
            key={label.id}
            className="map-label"
            data-variant={label.variant}
            style={{ transform: `translate(${projected.x}px, ${projected.y}px)` }}
          >
            <div className="map-label-dot" />
            <div className="map-label-text">{label.text}</div>
          </div>
        );
      })}
      <ZonePulseAnchor map={map} fixture={fixture} phase={phase} />
    </div>
  );
}

export default MapLabels;

// --- inner ---------------------------------------------------------------

function ZonePulseAnchor({
  map,
  fixture,
  phase
}: {
  map: maplibregl.Map;
  fixture: TracksFixture;
  phase: Phase;
}) {
  // Pulse fires while the dark gap is unresolved (phases 2–3). Anchored
  // to the AOI centroid, not the container, so pans/zooms keep it aligned.
  if (phase < 2 || phase >= 4) return null;
  const aoi = fixture.metadata?.aoi;
  if (!aoi) return null;
  const [west, south, east, north] = aoi.bbox;
  const center: [number, number] = [(west + east) / 2, (south + north) / 2];
  const projected = safeProject(map, center);
  if (!projected) return null;
  return (
    <div
      className="map-zone-pulse"
      style={{ transform: `translate(${projected.x}px, ${projected.y}px)` }}
    />
  );
}

function computeLabels(fixture: TracksFixture, phase: Phase): LabelDef[] {
  const pings = fixture.metadata?.canonical_pings;
  const ks = fixture.metadata?.kalman_event_1;
  if (!pings) return [];

  const ev1A = pings.event_1.track_a_last;
  const ev1B = pings.event_1.track_b_first;
  const ev2A = pings.event_2.track_a2_last;
  const ev2B = pings.event_2.track_b2_first;

  return [
    {
      id: "label:event-1:A",
      lonLat: [ev1A.lon, ev1A.lat],
      text: `MMSI-${ev1A.mmsi.slice(-3)} · MV CALDERA`,
      variant: "vessel-A",
      visible: phase >= 1
    },
    {
      id: "label:event-1:B",
      lonLat: [ev1B.lon, ev1B.lat],
      text: `MMSI-${ev1B.mmsi.slice(-3)} · CALDERA M`,
      variant: "vessel-B",
      visible: phase >= 3
    },
    ks
      ? {
          id: "label:event-1:predicted",
          lonLat: [ks.predicted_state.lon, ks.predicted_state.lat],
          text: `Predicted (95%) · M=${ks.mahalanobis.toFixed(2)}`,
          variant: "ellipse",
          visible: phase >= 3
        }
      : null,
    {
      id: "label:zone",
      lonLat: zoneTopLeft(fixture),
      text: fixture.metadata?.aoi?.name ?? "Monitored zone",
      variant: "zone",
      visible: true
    },
    {
      id: "label:event-2:A",
      lonLat: [ev2A.lon, ev2A.lat],
      text: `MMSI-${ev2A.mmsi.slice(-3)} · MV HARBOR KITE`,
      variant: "vessel-A",
      visible: phase >= 6
    },
    {
      id: "label:event-2:B",
      lonLat: [ev2B.lon, ev2B.lat],
      text: `MMSI-${ev2B.mmsi.slice(-3)} · HARBOR KITE reappear`,
      variant: "vessel-B",
      visible: phase >= 6
    }
  ].filter((l): l is LabelDef => l != null);
}

function zoneTopLeft(fixture: TracksFixture): [number, number] {
  const bbox = fixture.metadata?.aoi?.bbox;
  if (!bbox) return [0, 0];
  // top-left in screen terms = west + north.
  return [bbox[0], bbox[3]];
}

function safeProject(
  map: maplibregl.Map,
  lonLat: [number, number]
): { x: number; y: number } | null {
  try {
    const p = map.project(lonLat);
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    return { x: p.x, y: p.y };
  } catch {
    return null;
  }
}
