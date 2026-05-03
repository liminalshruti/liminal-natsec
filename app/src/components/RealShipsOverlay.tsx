// RealShipsOverlay — top-50 real MarineTraffic vessels rendered as
// directional flow arrows over the stage. M-4 fast-follow on the AI-draft
// case path; the demo's "why don't we have this in real life yet" moment.
//
// Design principles (creative-data-viz forward):
//
//   1. Arrows, not dots
//      Each ship renders as a directional triangle whose orientation = AIS
//      `course` and whose length = speed (bucketed). Operators see the
//      corridor flow direction at a glance — ships drifting NS through
//      Hormuz vs ships at anchor (course=0, speed=0).
//
//   2. FOC ring on flags-of-convenience
//      Ships flagged Panama / Liberia / Malta / Saint Kitts / Cook Islands
//      / Cyprus get a subtle outer ring in contested-amber. The operator
//      eye picks out FOC vessels without us labeling anything.
//
//   3. Layer-toggleable
//      Visibility tied to the existing MapLayers "AIS" chip. Listens to
//      the same `liminal:map-layers-changed` window event MapOverlays uses.
//
//   4. Hover popover
//      Mouseenter on a ship → small popover with name/MMSI/IMO/flag/length/
//      destination. Same vessel-card schema as DraftCaseDetail KV strip.
//
// Source: top 50 by Danti `score` from the SHIP category in
// danti-hormuz-ship-best-size-200.json (Shayaun's commit 6918a50, ~10k
// real MarineTraffic records). 50 keeps the map readable; the full 200
// would create visual mush against the Caldera hero tracks.

import { useEffect, useMemo, useState } from "react";

import dantiShips from "../../../fixtures/maritime/live-cache/danti-hormuz-ship-best-size-200.json" with { type: "json" };

const AOI_BBOX = { lon_min: 54.4, lat_min: 24.5, lon_max: 57.8, lat_max: 27.2 };

const FOC_FLAGS = new Set(["PA", "LR", "MT", "KN", "BS", "CY", "TG", "BZ", "CK", "IM"]);

interface ShipRecord {
  id: string;
  name: string;
  mmsi?: string;
  imo?: string;
  flag?: string;
  length_m?: number;
  speed_kn: number;
  course_deg: number;
  current_port?: string;
  destination?: string;
  lat: number;
  lon: number;
  isFoc: boolean;
}

interface DantiShipDoc {
  documentId?: string;
  geometry?: { coordinates?: number[] };
  score?: number;
  properties?: Record<string, string | undefined>;
}

interface DantiCacheShape {
  body?: { resultDocuments?: Array<{ category?: string; documents?: DantiShipDoc[] }> };
}

const MAX_SHIPS = 50;

function loadShips(): ShipRecord[] {
  const cache = dantiShips as DantiCacheShape;
  const ship = cache.body?.resultDocuments?.find((c) => c.category === "SHIP");
  const docs = ship?.documents ?? [];
  // Filter to docs with valid coords inside the AOI + sort by score.
  const inAoi = docs.filter((d) => {
    const c = d.geometry?.coordinates;
    if (!c || c.length < 2) return false;
    const lon = c[0];
    const lat = c[1];
    if (typeof lon !== "number" || typeof lat !== "number") return false;
    return (
      lon >= AOI_BBOX.lon_min &&
      lon <= AOI_BBOX.lon_max &&
      lat >= AOI_BBOX.lat_min &&
      lat <= AOI_BBOX.lat_max
    );
  });
  // Sort by score (Danti relevance) descending. Ties broken by length_m so
  // bigger vessels surface — they're more likely to be the operator's
  // procurement-grade subjects.
  inAoi.sort((a, b) => {
    const s = (b.score ?? 0) - (a.score ?? 0);
    if (s !== 0) return s;
    const aLen = Number(a.properties?.length ?? 0);
    const bLen = Number(b.properties?.length ?? 0);
    return bLen - aLen;
  });
  // De-dupe by MMSI — Danti returns multiple entries for the same vessel
  // (different timestamps); keep only the highest-scored entry per MMSI.
  const seen = new Set<string>();
  const out: ShipRecord[] = [];
  for (const doc of inAoi) {
    if (out.length >= MAX_SHIPS) break;
    const p = doc.properties ?? {};
    const mmsi = p.mmsi;
    if (mmsi && seen.has(mmsi)) continue;
    if (mmsi) seen.add(mmsi);
    const coords = doc.geometry?.coordinates ?? [];
    out.push({
      id: doc.documentId ?? `ship:${mmsi ?? out.length}`,
      name: p.ship_name ?? "UNKNOWN",
      mmsi: p.mmsi,
      imo: p.imo,
      flag: p.flag,
      length_m: p.length ? Number(p.length) : undefined,
      speed_kn: p.speed ? Number(p.speed) : 0,
      course_deg: p.course ? Number(p.course) : 0,
      current_port: p.current_port,
      destination: p.destination,
      lat: coords[1] as number,
      lon: coords[0] as number,
      isFoc: FOC_FLAGS.has(p.flag ?? "")
    });
  }
  return out;
}

function projectLon(lon: number, width: number): number {
  return ((lon - AOI_BBOX.lon_min) / (AOI_BBOX.lon_max - AOI_BBOX.lon_min)) * width;
}

function projectLat(lat: number, height: number): number {
  return ((AOI_BBOX.lat_max - lat) / (AOI_BBOX.lat_max - AOI_BBOX.lat_min)) * height;
}

/** Speed → glyph length in SVG units. Bucket-encoded so the operator
 *  reads 4-5 distinct flow speeds, not a continuous noise of slightly-
 *  different sizes. */
function speedGlyph(speedKn: number): number {
  if (speedKn === 0) return 4.5; // anchored — a small dot
  if (speedKn < 5) return 7; // slow
  if (speedKn < 10) return 10; // cruise
  if (speedKn < 15) return 13; // fast
  return 16; // very fast
}

export function RealShipsOverlay() {
  const ships = useMemo(loadShips, []);
  const [active, setActive] = useState(true); // AIS layer is default-on
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Listen to MapLayers chip toggles. AIS is the controlling layer.
  useEffect(() => {
    function handler(e: Event) {
      const ce = e as CustomEvent<{ active: string[] }>;
      if (!ce.detail?.active) return;
      setActive(ce.detail.active.includes("ais"));
    }
    window.addEventListener("liminal:map-layers-changed", handler);
    return () => window.removeEventListener("liminal:map-layers-changed", handler);
  }, []);

  if (!active) return null;

  const W = 1000;
  const H = 1000;
  const hovered = hoverId ? ships.find((s) => s.id === hoverId) : null;

  return (
    <>
      <svg
        className="real-ships-overlay"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="ship-glow">
            <feGaussianBlur stdDeviation="0.7" />
          </filter>
        </defs>
        {ships.map((ship) => {
          const cx = projectLon(ship.lon, W);
          const cy = projectLat(ship.lat, H);
          const len = speedGlyph(ship.speed_kn);
          const isHovered = hoverId === ship.id;
          // Anchored ships render as small circles; moving ships as
          // forward-pointing triangles rotated by AIS course.
          if (ship.speed_kn === 0) {
            return (
              <g
                key={ship.id}
                className={`real-ship real-ship--anchored${ship.isFoc ? " real-ship--foc" : ""}${
                  isHovered ? " real-ship--hover" : ""
                }`}
                transform={`translate(${cx} ${cy})`}
                onMouseEnter={() => setHoverId(ship.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                {ship.isFoc && (
                  <circle
                    className="real-ship__foc-ring"
                    cx={0}
                    cy={0}
                    r={len + 4}
                    fill="none"
                  />
                )}
                <circle
                  className="real-ship__hull"
                  cx={0}
                  cy={0}
                  r={len * 0.55}
                />
              </g>
            );
          }
          return (
            <g
              key={ship.id}
              className={`real-ship real-ship--moving${ship.isFoc ? " real-ship--foc" : ""}${
                isHovered ? " real-ship--hover" : ""
              }`}
              transform={`translate(${cx} ${cy}) rotate(${ship.course_deg})`}
              onMouseEnter={() => setHoverId(ship.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              {ship.isFoc && (
                <circle
                  className="real-ship__foc-ring"
                  cx={0}
                  cy={0}
                  r={len + 5}
                  fill="none"
                />
              )}
              {/* Forward-pointing arrow: length encodes speed, point at top
                  (rotation handles direction). */}
              <path
                className="real-ship__hull"
                d={`M 0 ${-len * 0.7} L ${len * 0.45} ${len * 0.4} L 0 ${len * 0.15} L ${-len * 0.45} ${len * 0.4} Z`}
                filter="url(#ship-glow)"
              />
            </g>
          );
        })}
      </svg>

      {/* Hover popover — rendered outside the SVG so it can use HTML
          typography. Position is computed from the hovered ship's
          projected coords. */}
      {hovered && (
        <ShipHoverCard ship={hovered} />
      )}
    </>
  );
}

function ShipHoverCard({ ship }: { ship: ShipRecord }) {
  // Position the card via percentage to make it scale with the stage.
  const W = 1000;
  const H = 1000;
  const xPct = (projectLon(ship.lon, W) / W) * 100;
  const yPct = (projectLat(ship.lat, H) / H) * 100;
  // Flip horizontally if too close to the right edge.
  const flipX = xPct > 65;
  const flipY = yPct > 70;
  return (
    <div
      className="real-ship-card"
      data-flip-x={flipX}
      data-flip-y={flipY}
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`
      }}
      role="tooltip"
    >
      <div className="real-ship-card__head">
        <span className="real-ship-card__name">{ship.name}</span>
        {ship.flag && (
          <span
            className={`real-ship-card__flag${ship.isFoc ? " real-ship-card__flag--foc" : ""}`}
          >
            {ship.flag}
            {ship.isFoc && " · FOC"}
          </span>
        )}
      </div>
      <dl className="real-ship-card__kv">
        {ship.mmsi && (
          <div><dt>MMSI</dt><dd>{ship.mmsi}</dd></div>
        )}
        {ship.imo && (
          <div><dt>IMO</dt><dd>{ship.imo}</dd></div>
        )}
        {ship.length_m && (
          <div><dt>length</dt><dd>{ship.length_m.toFixed(0)}m</dd></div>
        )}
        <div><dt>speed</dt><dd>{ship.speed_kn.toFixed(1)} kn</dd></div>
        <div><dt>course</dt><dd>{ship.course_deg.toFixed(0)}°</dd></div>
        {ship.current_port && (
          <div><dt>current</dt><dd>{ship.current_port}</dd></div>
        )}
        {ship.destination && (
          <div className="real-ship-card__dest">
            <dt>→</dt><dd>{ship.destination}</dd>
          </div>
        )}
      </dl>
      <div className="real-ship-card__footer">
        Danti · MarineTraffic AIS
      </div>
    </div>
  );
}
