// MapInkBase — ink-drawn Hormuz coastline as a translucent SVG overlay.
//
// Per the May-1 Whiteboard transcript: "imagine a topographical map that's
// extracting layers of information... a translucent overhead-projector idea
// where we layer multiple different data types on top of each other as
// views." And: "I'd love a map that looks like an ink drawing of the strait
// of hormuz — like my Liminal aesthetic."
//
// What this is:
// A hand-drawn-feeling SVG of the Hormuz chokepoint coastline, rendered at
// low opacity (≈45%) ABOVE the MapLibre raster basemap. The basemap stays
// underneath as the geographic substrate; the ink layer reads as the
// editorial register layered on top — the same instrument move as a
// transparent overlay on an overhead projector.
//
// What this is NOT:
// A MapLibre vector source. Coordinates are projected from the AOI bbox to
// the SVG viewport once at mount; we don't react to map zoom/pan. This is
// a stylistic register, not a live cartographic layer. The hero tracks +
// real evidence overlays still come from MapLibre's pipeline (Shayaun's
// lane). This component only adds the ink-drawn aesthetic.
//
// AOI bbox (per fixtures/maritime/live-cache/manifest.json): [54.4, 24.5, 57.8, 27.2]
// Coastline polylines authored from coarse Hormuz outlines — this is a
// teaching gesture, not a navigation chart.

const AOI_BBOX = { lon_min: 54.4, lat_min: 24.5, lon_max: 57.8, lat_max: 27.2 };

// Coarse Hormuz coastline traces — Iranian (north) coast and Omani / UAE
// (south) coast bracketing the strait, plus Qeshm Island. Authored at
// instrument-grade precision, not nav-grade. Each polyline is a continuous
// pen stroke; the painter renders them with stroke-dasharray pulse so they
// read as living ink rather than fixed geography.
const COASTLINES = [
  // Iranian north coast — Bandar Abbas → Strait of Hormuz → Bandar-e-Lengeh
  {
    id: "iran-coast",
    label: "Iran",
    points: [
      [54.45, 26.55], [54.7, 26.62], [55.0, 26.55], [55.25, 26.45],
      [55.5, 26.55], [55.75, 26.6], [55.95, 26.5], [56.15, 26.35],
      [56.25, 26.2], [56.35, 26.05], [56.45, 25.95], [56.6, 25.95],
      [56.75, 26.1], [57.0, 26.25], [57.3, 26.35], [57.6, 26.5], [57.78, 26.6]
    ]
  },
  // Omani / UAE south coast — Musandam peninsula
  {
    id: "musandam-coast",
    label: "Musandam (Oman)",
    points: [
      [56.05, 26.4], [56.15, 26.35], [56.25, 26.25], [56.32, 26.18],
      [56.4, 26.1], [56.45, 25.95], [56.55, 25.85], [56.6, 25.78],
      [56.55, 25.7], [56.45, 25.78], [56.35, 25.85], [56.25, 25.85],
      [56.15, 25.95], [56.05, 26.05], [56.0, 26.15], [55.95, 26.25]
    ]
  },
  // UAE coast — west of Musandam, into the Gulf
  {
    id: "uae-coast",
    label: "UAE",
    points: [
      [54.45, 25.0], [54.7, 25.05], [55.0, 25.1], [55.3, 25.0],
      [55.55, 24.95], [55.8, 24.85], [56.0, 24.85], [56.15, 24.95],
      [56.05, 25.15], [55.95, 25.35], [55.85, 25.55], [55.85, 25.75],
      [55.95, 25.85]
    ]
  },
  // Qeshm Island (largest in the Gulf, sits in the strait north channel)
  {
    id: "qeshm",
    label: "Qeshm",
    points: [
      [55.55, 26.55], [55.7, 26.6], [55.85, 26.55], [55.95, 26.45],
      [56.0, 26.35], [55.9, 26.3], [55.75, 26.32], [55.6, 26.4],
      [55.5, 26.5], [55.55, 26.55]
    ]
  }
];

// Strait centerline — a dashed sea-lane indicator threading the chokepoint.
// 24nm wide at narrowest; the centerline is the inbound TSS lane.
const STRAIT_CENTERLINE = [
  [55.65, 26.68], [55.95, 26.62], [56.25, 26.58], [56.46, 26.6],
  [56.75, 26.56], [57.05, 26.48]
];

function projectLon(lon: number, width: number): number {
  return ((lon - AOI_BBOX.lon_min) / (AOI_BBOX.lon_max - AOI_BBOX.lon_min)) * width;
}

function projectLat(lat: number, height: number): number {
  // SVG y-axis is inverted: lat increases northward, y increases southward.
  return ((AOI_BBOX.lat_max - lat) / (AOI_BBOX.lat_max - AOI_BBOX.lat_min)) * height;
}

function pointsToPath(
  points: number[][],
  width: number,
  height: number
): string {
  return points
    .map((pt, i) => {
      const x = projectLon(pt[0], width).toFixed(2);
      const y = projectLat(pt[1], height).toFixed(2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export function MapInkBase() {
  // 1000x1000 viewBox; absolute-positioned over the stage. preserveAspectRatio
  // none lets the SVG stretch to fill whatever the stage container is — same
  // strategy MapLibre uses for its canvas.
  const W = 1000;
  const H = 1000;
  return (
    <svg
      className="map-ink-base"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        {/* Filter — gives the ink stroke a subtle bleed/grain register. */}
        <filter id="ink-bleed" x="-2%" y="-2%" width="104%" height="104%">
          <feGaussianBlur stdDeviation="0.4" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="1.6" />
          </feComponentTransfer>
        </filter>
        <filter id="ink-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="1.2" />
        </filter>
      </defs>

      {/* Strait centerline — dashed sea-lane indicator. Drawn first so the
          coastlines render over its endpoints. */}
      <path
        className="map-ink-base__centerline"
        d={pointsToPath(STRAIT_CENTERLINE, W, H)}
        fill="none"
      />

      {/* Coastline ink strokes — one continuous pen path per coast.
          stroke-linecap="round" + stroke-linejoin="round" gives the
          hand-drawn register; dasharray pulse adds living-ink motion. */}
      {COASTLINES.map((c) => (
        <g key={c.id} className="map-ink-base__coast" filter="url(#ink-bleed)">
          <path
            d={pointsToPath(c.points, W, H)}
            fill="none"
            className="map-ink-base__stroke"
          />
        </g>
      ))}

      {/* Region labels — small uppercase tracked-out, positioned at coast
          mid-points. Mono register so they read as instrument annotations,
          not place names on a tourist map. */}
      <g className="map-ink-base__labels">
        <text
          x={projectLon(56.4, W)}
          y={projectLat(26.55, H)}
          className="map-ink-base__label"
        >
          IRAN
        </text>
        <text
          x={projectLon(56.4, W)}
          y={projectLat(25.55, H)}
          className="map-ink-base__label"
        >
          MUSANDAM · OMAN
        </text>
        <text
          x={projectLon(54.9, W)}
          y={projectLat(24.85, H)}
          className="map-ink-base__label"
        >
          UAE
        </text>
        <text
          x={projectLon(56.46, W)}
          y={projectLat(26.6, H)}
          className="map-ink-base__label map-ink-base__label--strait"
        >
          STRAIT OF HORMUZ
        </text>
      </g>
    </svg>
  );
}
