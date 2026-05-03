// MapInstrumentBezels — ASCII micro-grid frame around the stage map.
//
// Per the May-1 Whiteboard transcript: "ASCII rendered map / radar-style chart
// — this is cool, this is a topographical map that's extracting layers of
// information... it has this nostalgic sort of like, code breaker type thing."
//
// Four corner brackets + edge tick marks + coordinate readouts at the
// corners. Reads as a radar viewport bezel, instrument-grade. Pure CSS-
// positioned overlay; doesn't touch the map itself.
//
// Coordinate readouts use the AOI bbox literal so the operator sees the
// true Hormuz coordinates anchoring the viewport — small, mono, tracked-out.

const AOI_BBOX = { lon_min: 54.4, lat_min: 24.5, lon_max: 57.8, lat_max: 27.2 };

function fmtLat(lat: number): string {
  const dir = lat >= 0 ? "N" : "S";
  return `${Math.abs(lat).toFixed(2)}°${dir}`;
}

function fmtLon(lon: number): string {
  const dir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lon).toFixed(2)}°${dir}`;
}

export function MapInstrumentBezels() {
  // Tick mark count per edge — coprime spacing avoids visible regularity.
  const HORIZONTAL_TICKS = 13;
  const VERTICAL_TICKS = 11;

  return (
    <div className="map-bezel" aria-hidden="true">
      {/* Corner brackets — ASCII square brackets at each corner, instrument-
          grade, mono-rendered. Each bracket is two chars: a vertical and a
          horizontal stroke, offset to read as a frame corner. */}
      <span className="map-bezel__corner map-bezel__corner--tl">┌</span>
      <span className="map-bezel__corner map-bezel__corner--tr">┐</span>
      <span className="map-bezel__corner map-bezel__corner--bl">└</span>
      <span className="map-bezel__corner map-bezel__corner--br">┘</span>

      {/* Coordinate readouts at each corner — Hormuz AOI bbox values. */}
      <span className="map-bezel__coord map-bezel__coord--tl">
        {fmtLat(AOI_BBOX.lat_max)} · {fmtLon(AOI_BBOX.lon_min)}
      </span>
      <span className="map-bezel__coord map-bezel__coord--tr">
        {fmtLat(AOI_BBOX.lat_max)} · {fmtLon(AOI_BBOX.lon_max)}
      </span>
      <span className="map-bezel__coord map-bezel__coord--bl">
        {fmtLat(AOI_BBOX.lat_min)} · {fmtLon(AOI_BBOX.lon_min)}
      </span>
      <span className="map-bezel__coord map-bezel__coord--br">
        {fmtLat(AOI_BBOX.lat_min)} · {fmtLon(AOI_BBOX.lon_max)}
      </span>

      {/* Edge tick marks — small character indicators along each edge. The
          ticks themselves are CSS-only (background-image gradient repeat)
          on the bezel border lines. The character row below renders the
          actual mono-glyph instrument register. */}
      <div className="map-bezel__edge map-bezel__edge--top">
        {Array.from({ length: HORIZONTAL_TICKS }).map((_, i) => (
          <span key={i} className="map-bezel__tick">
            {i % 4 === 0 ? "│" : "·"}
          </span>
        ))}
      </div>
      <div className="map-bezel__edge map-bezel__edge--bottom">
        {Array.from({ length: HORIZONTAL_TICKS }).map((_, i) => (
          <span key={i} className="map-bezel__tick">
            {i % 4 === 0 ? "│" : "·"}
          </span>
        ))}
      </div>
      <div className="map-bezel__edge map-bezel__edge--left">
        {Array.from({ length: VERTICAL_TICKS }).map((_, i) => (
          <span key={i} className="map-bezel__tick">
            {i % 3 === 0 ? "─" : "·"}
          </span>
        ))}
      </div>
      <div className="map-bezel__edge map-bezel__edge--right">
        {Array.from({ length: VERTICAL_TICKS }).map((_, i) => (
          <span key={i} className="map-bezel__tick">
            {i % 3 === 0 ? "─" : "·"}
          </span>
        ))}
      </div>

      {/* Center crosshair — small + at the chokepoint geometric center.
          The strait midpoint is roughly (56.46°E, 26.60°N). */}
      <div className="map-bezel__crosshair">
        <span>+</span>
      </div>

      {/* Instrument-register label band at the top — like a sextant's
          aperture annotation. Names the projection + AOI. */}
      <div className="map-bezel__label-top">
        AOI · STRAIT OF HORMUZ · WGS84 · 54.4–57.8°E / 24.5–27.2°N
      </div>
    </div>
  );
}
