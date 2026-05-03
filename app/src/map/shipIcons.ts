// Ship icon sprites — inline SVGs converted to image data URLs at module load.
//
// Workshop principle: "if it's a ship make it a ship." Currently the demo
// renders vessels as MapLibre circles, which are abstract dots. Replacing
// them with actual ship-shaped sprites is the smallest possible move that
// shifts the surface from "abstract data viz" to "operational instrument
// rendering real-world objects." The bare ship glyph below is intentionally
// schematic (not a photographic icon) so it reads as instrument-grade
// telemetry, not as a children's-book illustration. Two variants:
//
//   - "vessel-normal": cyan accent, normal-state hero track A
//   - "vessel-alert":  amber accent, anomaly-state hero (Track B / dark gap)
//
// The icons are 32×32 SVG strings. We expose them as ImageBitmap-loadable
// HTMLImageElement objects so MapLibre's addImage() accepts them. v3.3 may
// add per-vessel-type variants (cargo / tanker / patrol / fishing) keyed on
// AIS vessel_type. For now both heroes use the same hull silhouette and
// differ only in stroke color.

const VESSEL_NORMAL_HEX = "#67b8d6"; // cyan — matches COLORS.heroVesselNormal
const VESSEL_ALERT_HEX = "#f0a040"; // amber — matches COLORS.heroVesselAnomaly
const VESSEL_HALO_HEX = "rgba(240, 160, 64, 0.45)";

/**
 * Schematic ship hull, top-down view. Bow points up at zero rotation;
 * MapLibre symbol layers can rotate the icon via the bearing/heading data
 * field (icon-rotate expression) once we wire that. For now icons render
 * at 0° rotation — the heading arrow is implicit in the hull shape.
 */
function shipSvg(stroke: string, fillAlpha = 0.18, haloRgba?: string): string {
  const halo = haloRgba
    ? `<circle cx="16" cy="16" r="14.5" fill="none" stroke="${haloRgba}" stroke-width="1"/>`
    : "";
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  ${halo}
  <!-- Bridge / superstructure callout -->
  <rect x="13" y="11" width="6" height="3" fill="${stroke}" opacity="0.85"/>
  <!-- Hull silhouette: pointed bow up, flat stern down -->
  <path d="M16 4
           L22 11
           L22 22
           Q22 25 19 25
           L13 25
           Q10 25 10 22
           L10 11 Z"
        fill="${stroke}" fill-opacity="${fillAlpha}"
        stroke="${stroke}" stroke-width="1.4"
        stroke-linejoin="round"/>
  <!-- Centerline / heading marker -->
  <line x1="16" y1="6" x2="16" y2="14" stroke="${stroke}" stroke-width="1" opacity="0.7"/>
</svg>`.trim();
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const SHIP_ICON_NORMAL_ID = "ship-icon-normal";
export const SHIP_ICON_ALERT_ID = "ship-icon-alert";

/**
 * Returns icon-id → HTMLImageElement map. Load these into the MapLibre map
 * with `map.addImage(id, img)` after style loads. Calling addImage with an
 * already-loaded id is a no-op, so this is safe to call on every style
 * reload.
 */
export async function loadShipIcons(): Promise<Array<{ id: string; img: HTMLImageElement }>> {
  const variants = [
    {
      id: SHIP_ICON_NORMAL_ID,
      svg: shipSvg(VESSEL_NORMAL_HEX, 0.16)
    },
    {
      id: SHIP_ICON_ALERT_ID,
      svg: shipSvg(VESSEL_ALERT_HEX, 0.22, VESSEL_HALO_HEX)
    }
  ];

  return Promise.all(
    variants.map(
      ({ id, svg }) =>
        new Promise<{ id: string; img: HTMLImageElement }>((resolve, reject) => {
          const img = new Image(32, 32);
          img.onload = () => resolve({ id, img });
          img.onerror = (err) => reject(err);
          img.src = svgToDataUrl(svg);
        })
    )
  );
}
