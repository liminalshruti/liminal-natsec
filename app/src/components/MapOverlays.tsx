// MapOverlays — translucent overhead-projector layers reading from the real
// Hormuz cache, projected onto the AOI bbox as SVG.
//
// Per the May-1 Whiteboard transcript: "you can layer multiple different data
// types on top of each other as views... topographic, AIS, signal, sanctions
// — like an overhead projector with translucent plastic sheets, each layer
// adds context."
//
// What this is:
// Four toggleable layers, each rendered as an absolutely-positioned SVG over
// the stage, reading geometry from the real cached source files (Path γ
// citation chain — same files cited per evidence chip):
//
//   GFW       gap polygons — broadcast-gap events, amber rings
//   SANCTIONS OpenSanctions hits — designated-vessel marker rings, red
//   NAVAREA   warning bbox — maritime safety warning zone, dashed yellow
//   SAR       Sentinel-1 footprint — radar capture extent, cyan rectangle
//
// Each layer toggles on/off in response to the MapLayers chip strip via a
// custom `liminal:map-layers-changed` event the chip strip emits. Default
// state mirrors MapLayers.tsx default-on / default-off per chip.
//
// What this is NOT:
// A MapLibre vector source. We don't react to map zoom/pan; the AOI bbox is
// fixed, the SVG stretches to fill the stage. This is an editorial register,
// not a navigation layer.

import { useEffect, useState } from "react";

import gfwGaps from "../../../fixtures/maritime/live-cache/gfw-hormuz-gaps.json" with { type: "json" };
import opensanctions from "../../../fixtures/maritime/live-cache/opensanctions-hormuz-maritime-entities.json" with { type: "json" };
import sentinel1 from "../../../fixtures/maritime/live-cache/sentinelhub-hormuz-sentinel1-vv.metadata.json" with { type: "json" };

const AOI_BBOX = { lon_min: 54.4, lat_min: 24.5, lon_max: 57.8, lat_max: 27.2 };

// Same default-on set as MapLayers.tsx — AIS only by default.
const DEFAULT_ACTIVE: ReadonlySet<string> = new Set(["ais"]);

function projectLon(lon: number, width: number): number {
  return ((lon - AOI_BBOX.lon_min) / (AOI_BBOX.lon_max - AOI_BBOX.lon_min)) * width;
}

function projectLat(lat: number, height: number): number {
  return ((AOI_BBOX.lat_max - lat) / (AOI_BBOX.lat_max - AOI_BBOX.lat_min)) * height;
}

interface GapEntry {
  id: string;
  position?: { lat: number; lon: number };
  durationHours?: number;
  vessel?: { name?: string };
}

interface SanctionEntity {
  caption?: string;
  id?: string;
  // OpenSanctions doesn't always carry geometry; we lay out points in a
  // deterministic pseudo-spread across the AOI for editorial purposes.
}

export function MapOverlays() {
  const [active, setActive] = useState<ReadonlySet<string>>(DEFAULT_ACTIVE);

  useEffect(() => {
    function handler(e: Event) {
      const ce = e as CustomEvent<{ active: string[] }>;
      if (ce.detail?.active) {
        setActive(new Set(ce.detail.active));
      }
    }
    window.addEventListener("liminal:map-layers-changed", handler);
    return () => window.removeEventListener("liminal:map-layers-changed", handler);
  }, []);

  const W = 1000;
  const H = 1000;

  // GFW gap entries — concrete real-cache geometry. Each gap is a "broadcast
  // went silent here" event with lat/lon and duration.
  const gapEntries: GapEntry[] =
    (gfwGaps as { body?: { entries?: GapEntry[] } }).body?.entries ?? [];

  // OpenSanctions entities — array under `results`. We don't have positions
  // for each (the cached file is identity-resolution data, not geographic),
  // so we lay them out around the strait centerline in a deterministic
  // arc as editorial markers. The chip strip's count is the truth; this
  // visualization is the gesture toward "these entities are present."
  const sanctionsResults: SanctionEntity[] =
    (opensanctions as { results?: SanctionEntity[] }).results ?? [];

  // Sentinel-1 SAR — the metadata names a bbox via request.metadata.bbox.
  const sarBbox: number[] | null =
    (sentinel1 as { request?: { metadata?: { bbox?: number[] } } }).request?.metadata
      ?.bbox ?? null;

  return (
    <svg
      className="map-overlays"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="overlay-glow">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* SAR footprint — cyan dashed rectangle outlining the Sentinel-1 capture
          bbox. Faintest layer so it sits behind the others. */}
      {active.has("sentinel") && sarBbox && sarBbox.length >= 4 && (
        <g className="map-overlay map-overlay--sar">
          <rect
            x={projectLon(sarBbox[0], W)}
            y={projectLat(sarBbox[3], H)}
            width={projectLon(sarBbox[2], W) - projectLon(sarBbox[0], W)}
            height={projectLat(sarBbox[1], H) - projectLat(sarBbox[3], H)}
            className="map-overlay__sar-rect"
            fill="none"
          />
          <text
            x={projectLon(sarBbox[0], W) + 8}
            y={projectLat(sarBbox[3], H) + 14}
            className="map-overlay__sar-label"
          >
            SENTINEL-1 VV · SAR FOOTPRINT
          </text>
        </g>
      )}

      {/* NAVAREA IX — covers the full Persian Gulf / Gulf of Oman / Arabian
          Sea hazard area. We render it as a faint dashed enclosing rectangle
          covering the AOI with a label. The cached metadata is single-shot
          (a 200 OK response), so this is editorial-grade. */}
      {active.has("navarea") && (
        <g className="map-overlay map-overlay--navarea">
          <rect
            x={2}
            y={2}
            width={W - 4}
            height={H - 4}
            className="map-overlay__navarea-rect"
            fill="none"
          />
          <text x={12} y={H - 12} className="map-overlay__navarea-label">
            NAVAREA IX · ACTIVE WARNING REGION
          </text>
        </g>
      )}

      {/* GFW gap polygons — each entry is a circular indicator at the gap
          centroid with radius proportional to durationHours. */}
      {active.has("gfw") &&
        gapEntries.map((gap, i) => {
          if (!gap.position) return null;
          const cx = projectLon(gap.position.lon, W);
          const cy = projectLat(gap.position.lat, H);
          const radius = Math.max(20, (gap.durationHours ?? 1) * 30);
          return (
            <g key={`gfw-${gap.id ?? i}`} className="map-overlay map-overlay--gfw">
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                className="map-overlay__gfw-ring"
                fill="none"
              />
              <circle
                cx={cx}
                cy={cy}
                r={4}
                className="map-overlay__gfw-dot"
              />
              <text
                x={cx + radius + 6}
                y={cy + 3}
                className="map-overlay__gfw-label"
              >
                GAP · {gap.vessel?.name ?? "unidentified"} · {(gap.durationHours ?? 0).toFixed(1)}h
              </text>
            </g>
          );
        })}

      {/* OpenSanctions hits — we lack per-entity geometry in the cache, so
          we lay them out along a deterministic arc on the strait centerline.
          The chip strip's count is the true source of truth; this is the
          gesture toward "these entities exist in the AOI." */}
      {active.has("opensanctions") &&
        sanctionsResults.slice(0, 10).map((entity, i) => {
          // Spread entities along the strait centerline — i / N produces a
          // deterministic arc from west (Bandar-e-Lengeh side) to east
          // (Gulf of Oman side).
          const t = (i + 0.5) / Math.min(sanctionsResults.length, 10);
          const lon = AOI_BBOX.lon_min + 0.5 + t * (AOI_BBOX.lon_max - AOI_BBOX.lon_min - 1);
          const lat = 26.05 + Math.sin(t * Math.PI) * 0.15; // arc up over Qeshm
          const cx = projectLon(lon, W);
          const cy = projectLat(lat, H);
          return (
            <g key={`os-${entity.id ?? i}`} className="map-overlay map-overlay--sanctions">
              <circle
                cx={cx}
                cy={cy}
                r={9}
                className="map-overlay__sanctions-ring"
                fill="none"
              />
              <circle
                cx={cx}
                cy={cy}
                r={3.5}
                className="map-overlay__sanctions-dot"
              />
              {i < 4 && entity.caption && (
                <text
                  x={cx}
                  y={cy + 22}
                  className="map-overlay__sanctions-label"
                  textAnchor="middle"
                >
                  {entity.caption.slice(0, 18).toUpperCase()}
                </text>
              )}
            </g>
          );
        })}
    </svg>
  );
}
