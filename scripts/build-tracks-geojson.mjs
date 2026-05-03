// Generates fixtures/maritime/tracks.geojson from canonical scenario data.
// Computes the predicted 95% ellipse using shared/scoring/kalman.ts so the
// demo's central visual claim ("Track B emerges inside the ellipse") is
// guaranteed by the same math the unit tests exercise.
//
// Run: node --experimental-strip-types scripts/build-tracks-geojson.mjs

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const { predict, isPointInsidePredictionEllipse } = await import(
  resolve(repoRoot, "shared/scoring/kalman.ts")
);

const ms = (iso) => Date.parse(iso);

const HORMUZ_LON_OFFSET = 0.45;
const HORMUZ_LAT_OFFSET = 0.72;
const WATCH_BOX_NAME = "Hormuz Watch Box 01";
const ALARA_EEZ_BBOX = [56.0, 26.35, 57.1, 26.85];

function toHormuzPing(ping) {
  return {
    ...ping,
    lat: Number((ping.lat + HORMUZ_LAT_OFFSET).toFixed(6)),
    lon: Number((ping.lon + HORMUZ_LON_OFFSET).toFixed(6))
  };
}

function toHormuzCoord([lon, lat]) {
  return [
    Number((lon + HORMUZ_LON_OFFSET).toFixed(6)),
    Number((lat + HORMUZ_LAT_OFFSET).toFixed(6))
  ];
}

function bboxPolygon([west, south, east, north]) {
  return [[
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south]
  ]];
}

function last(values) {
  return values[values.length - 1];
}

// Canonical timestamps — single source of truth for the scenario.
// Mirrors TECHNICAL_PLAN.md §14.3 + §14.9. Other fixtures should reference
// these via metadata.canonical_timestamps when cross-checking.
const T = {
  event1: {
    track_a_first_iso: "2026-04-18T10:00:00Z",
    track_a_last_iso:  "2026-04-18T10:15:04Z",
    gap_start_iso:     "2026-04-18T10:15:04Z",
    gap_end_iso:       "2026-04-18T11:04:22Z",
    track_b_first_iso: "2026-04-18T11:04:22Z",
    track_b_last_iso:  "2026-04-18T11:14:22Z"
  },
  event2: {
    track_a2_last_iso:  "2026-04-18T12:20:00Z",
    danti_corroboration_iso: "2026-04-18T12:52:00Z",
    track_b2_reappear_iso:   "2026-04-18T13:05:00Z"
  }
};

// --- Event 1 — MMSI-111 → MMSI-222 (the headline scenario) -----------------

// Track A pre-gap: 6 pings, every ~3 minutes. Last two anchored on
// observations.json; earlier ones extrapolated backward at constant velocity
// for kalman.predict() to have enough data to estimate a stable initial state.
const trackA_pings = [
  { iso: "2026-04-18T10:00:00Z", lat: 25.80152, lon: 55.62828 },
  { iso: "2026-04-18T10:03:00Z", lat: 25.80344, lon: 55.67666 },
  { iso: "2026-04-18T10:06:00Z", lat: 25.80536, lon: 55.72504 },
  { iso: "2026-04-18T10:09:00Z", lat: 25.80728, lon: 55.77342 },
  { iso: "2026-04-18T10:12:04Z", lat: 25.8092,  lon: 55.8218,  sogKnots: 12.2, cogDeg: 83.9 },
  { iso: "2026-04-18T10:15:04Z", lat: 25.81112, lon: 55.87018, sogKnots: 12.4, cogDeg: 84.2 }
].map(toHormuzPing);

// Track B post-gap: first ping anchored on observations.json; subsequent
// pings extend along the AIS-reported course/speed.
const trackB_pings = [
  { iso: "2026-04-18T11:04:22Z", lat: 25.8191, lon: 56.36844, sogKnots: 12.0, cogDeg: 86.1 },
  { iso: "2026-04-18T11:09:22Z", lat: 25.8201, lon: 56.41    },
  { iso: "2026-04-18T11:14:22Z", lat: 25.821, lon: 56.455   }
].map(toHormuzPing);

const gapSeconds = (ms(T.event1.gap_end_iso) - ms(T.event1.gap_start_iso)) / 1000;

const candidatePing = {
  lat: trackB_pings[0].lat,
  lon: trackB_pings[0].lon,
  timestamp: trackB_pings[0].iso,
  sogKnots: trackB_pings[0].sogKnots,
  cogDeg: trackB_pings[0].cogDeg
};

const kalmanInputPings = trackA_pings.map(p => ({
  lat: p.lat,
  lon: p.lon,
  timestamp: p.iso,
  sogKnots: p.sogKnots,
  cogDeg: p.cogDeg
}));

// Tuned to land on the canonical Mahalanobis ≈ 0.83 from TECHNICAL_PLAN §14.4.
// Default kalman params produce a ~250 km ellipse (mathematically correct over a
// 49-minute extrapolation with constant-velocity assumption + default process
// noise) that overflows the demo viewport. These values yield the documented
// Mahalanobis 0.83 and an ellipse that still meaningfully encompasses Track B
// without visually swamping the AOI when the camera zooms to fit.
const KALMAN_TUNING = {
  processAccelerationStdMps2: 0.008,
  measurementStdMeters: 10
};

const prediction = predict(kalmanInputPings, gapSeconds, candidatePing, KALMAN_TUNING);

if (!isPointInsidePredictionEllipse(prediction, candidatePing, KALMAN_TUNING.chiSquareThreshold)) {
  throw new Error(
    "Kalman prediction places Track B OUTSIDE the 95% ellipse — fixture would " +
    "break the central visual claim. Adjust pings or covariance parameters."
  );
}

console.log(`Kalman result: mahalanobis=${prediction.mahalanobis.toFixed(3)} ` +
            `likelihood=${prediction.likelihood.toFixed(3)} ` +
            `predicted=(${prediction.predictedState.lat.toFixed(5)}, ` +
            `${prediction.predictedState.lon.toFixed(5)})`);

// --- Event 2 — MMSI-271990222 (HARBOR KITE) reappearance -------------------
//
// Hidden until phase >= 6 (gated by phase_min property). Coordinates from
// observations.json. We don't run Kalman here — Event 2 doesn't need the
// "B inside ellipse" visual; it only needs to demonstrate the rule re-ranking.

const trackA2_pings = [
  { iso: "2026-04-18T12:08:00Z", lat: 25.828, lon: 55.87 },
  { iso: "2026-04-18T12:14:00Z", lat: 25.83, lon: 55.91 },
  { iso: "2026-04-18T12:20:00Z", lat: 25.832, lon: 55.957, sogKnots: 9.3, cogDeg: 77.4 }
].map(toHormuzPing);
const dantiPing = toHormuzPing({
  iso: T.event2.danti_corroboration_iso,
  lat: 25.844,
  lon: 56.228
});
const trackB2_pings = [
  { iso: "2026-04-18T13:05:00Z", lat: 25.849, lon: 56.342, sogKnots: 9.1, cogDeg: 78.2 },
  { iso: "2026-04-18T13:11:00Z", lat: 25.85, lon: 56.39 },
  { iso: "2026-04-18T13:17:00Z", lat: 25.851, lon: 56.44 }
].map(toHormuzPing);

// --- Background traffic — 10 faint tracks scattered around the AOI ---------

const backgroundTracks = [
  { id: "bg:001", coords: [[55.66, 25.69], [55.87, 25.7], [56.12, 25.72], [56.37, 25.74]] },
  { id: "bg:002", coords: [[55.77, 26.04], [56.03, 26.01], [56.34, 25.98], [56.55, 25.95]] },
  { id: "bg:003", coords: [[55.49, 25.87], [55.73, 25.89], [55.97, 25.9], [56.23, 25.92]] },
  { id: "bg:004", coords: [[56.21, 25.65], [56.36, 25.72], [56.52, 25.79]] },
  { id: "bg:005", coords: [[55.63, 25.76], [55.83, 25.74], [56.03, 25.71]] },
  { id: "bg:006", coords: [[56.5, 25.98], [56.3, 25.95], [56.07, 25.92]] },
  { id: "bg:007", coords: [[55.87, 26.11], [56.13, 26.07], [56.4, 26.03]] },
  { id: "bg:008", coords: [[55.67, 25.64], [55.9, 25.67], [56.16, 25.69]] },
  { id: "bg:009", coords: [[56.57, 25.85], [56.36, 25.87], [56.14, 25.88]] },
  { id: "bg:010", coords: [[55.8, 25.92], [55.95, 25.97], [56.11, 26.01]] }
].map((track) => ({
  ...track,
  coords: track.coords.map(toHormuzCoord)
}));

// --- Build the FeatureCollection -------------------------------------------

const features = [];

// Monitored zone — phase_min: 1 (always visible).
features.push({
  type: "Feature",
  id: "zone:alara-eez-box-01",
  properties: {
    kind: "monitored_zone",
    aoi_id: "aoi:alara-eez-box-01",
    name: WATCH_BOX_NAME,
    phase_min: 1
  },
  geometry: {
    type: "Polygon",
    coordinates: bboxPolygon(ALARA_EEZ_BBOX)
  }
});

// Background tracks.
for (const t of backgroundTracks) {
  features.push({
    type: "Feature",
    id: `track:background:${t.id}`,
    properties: {
      kind: "background_track",
      track_id: t.id,
      phase_min: 1
    },
    geometry: { type: "LineString", coordinates: t.coords }
  });
}

// Track A LineString (full pre-gap path).
features.push({
  type: "Feature",
  id: "track:event-1:hero-A",
  properties: {
    kind: "hero_track",
    event_id: "event_1",
    role: "A",
    case_id: "case:alara-01:event-1",
    mmsi: "366700111",
    vessel_name: "MV CALDERA",
    t_start_iso: T.event1.track_a_first_iso,
    t_end_iso:   T.event1.track_a_last_iso,
    t_start_ms:  ms(T.event1.track_a_first_iso),
    t_end_ms:    ms(T.event1.track_a_last_iso),
    phase_min: 1
  },
  geometry: {
    type: "LineString",
    coordinates: trackA_pings.map(p => [p.lon, p.lat])
  }
});

// Track A pings as Points (for time-based replay scrubbing).
for (const p of trackA_pings) {
  features.push({
    type: "Feature",
    id: `ping:event-1:A:${p.iso}`,
    properties: {
      kind: "hero_ping",
      event_id: "event_1",
      role: "A",
      mmsi: "366700111",
      t_iso: p.iso,
      t_epoch_ms: ms(p.iso),
      phase_min: 1
    },
    geometry: { type: "Point", coordinates: [p.lon, p.lat] }
  });
}

// Dark gap — represented as a LineString from last A ping to first B ping
// plus metadata. Visible from phase >= 2.
features.push({
  type: "Feature",
  id: "darkgap:event-1",
  properties: {
    kind: "dark_gap",
    event_id: "event_1",
    case_id: "case:alara-01:event-1",
    gap_start_iso: T.event1.gap_start_iso,
    gap_end_iso:   T.event1.gap_end_iso,
    gap_start_ms:  ms(T.event1.gap_start_iso),
    gap_end_ms:    ms(T.event1.gap_end_iso),
    gap_minutes: 49.3,
    phase_min: 2
  },
  geometry: {
    type: "LineString",
    coordinates: [
      [trackA_pings.at(-1).lon, trackA_pings.at(-1).lat],
      [trackB_pings[0].lon,     trackB_pings[0].lat]
    ]
  }
});

// Predicted corridor — Kalman-derived center line. Visible from phase >= 3.
features.push({
  type: "Feature",
  id: "predicted-corridor:event-1",
  properties: {
    kind: "predicted_corridor",
    event_id: "event_1",
    source: "kalman",
    phase_min: 3
  },
  geometry: {
    type: "LineString",
    coordinates: [
      [trackA_pings.at(-1).lon, trackA_pings.at(-1).lat],
      [prediction.predictedState.lon, prediction.predictedState.lat]
    ]
  }
});

// Predicted 95% ellipse — Kalman-computed polygon. Visible from phase >= 3.
features.push({
  type: "Feature",
  id: "predicted-ellipse-95:event-1",
  properties: {
    kind: "predicted_ellipse_95",
    event_id: "event_1",
    source: "kalman",
    mahalanobis: prediction.mahalanobis,
    likelihood:  prediction.likelihood,
    predicted_lat: prediction.predictedState.lat,
    predicted_lon: prediction.predictedState.lon,
    phase_min: 3
  },
  geometry: prediction.ellipsePolygon
});

// Track B LineString and pings. Visible from phase >= 3.
features.push({
  type: "Feature",
  id: "track:event-1:hero-B",
  properties: {
    kind: "hero_track",
    event_id: "event_1",
    role: "B",
    case_id: "case:alara-01:event-1",
    mmsi: "538009771",
    vessel_name: "CALDERA M",
    t_start_iso: T.event1.track_b_first_iso,
    t_end_iso:   T.event1.track_b_last_iso,
    t_start_ms:  ms(T.event1.track_b_first_iso),
    t_end_ms:    ms(T.event1.track_b_last_iso),
    phase_min: 3
  },
  geometry: {
    type: "LineString",
    coordinates: trackB_pings.map(p => [p.lon, p.lat])
  }
});
for (const p of trackB_pings) {
  features.push({
    type: "Feature",
    id: `ping:event-1:B:${p.iso}`,
    properties: {
      kind: "hero_ping",
      event_id: "event_1",
      role: "B",
      mmsi: "538009771",
      t_iso: p.iso,
      t_epoch_ms: ms(p.iso),
      phase_min: 3
    },
    geometry: { type: "Point", coordinates: [p.lon, p.lat] }
  });
}

// Event 2 — Track A2 + danti corroboration + Track B2. All gated phase >= 6.

features.push({
  type: "Feature",
  id: "track:event-2:hero-A",
  properties: {
    kind: "hero_track",
    event_id: "event_2",
    role: "A",
    case_id: "case:alara-01:event-2",
    mmsi: "271990222",
    vessel_name: "MV HARBOR KITE",
    t_start_iso: trackA2_pings[0].iso,
    t_end_iso:   trackA2_pings.at(-1).iso,
    t_start_ms:  ms(trackA2_pings[0].iso),
    t_end_ms:    ms(trackA2_pings.at(-1).iso),
    phase_min: 6
  },
  geometry: {
    type: "LineString",
    coordinates: trackA2_pings.map(p => [p.lon, p.lat])
  }
});
for (const p of trackA2_pings) {
  features.push({
    type: "Feature",
    id: `ping:event-2:A:${p.iso}`,
    properties: {
      kind: "hero_ping",
      event_id: "event_2",
      role: "A",
      mmsi: "271990222",
      t_iso: p.iso,
      t_epoch_ms: ms(p.iso),
      phase_min: 6
    },
    geometry: { type: "Point", coordinates: [p.lon, p.lat] }
  });
}
features.push({
  type: "Feature",
  id: "darkgap:event-2",
  properties: {
    kind: "dark_gap",
    event_id: "event_2",
    case_id: "case:alara-01:event-2",
    gap_start_iso: T.event2.track_a2_last_iso,
    gap_end_iso:   T.event2.track_b2_reappear_iso,
    gap_start_ms:  ms(T.event2.track_a2_last_iso),
    gap_end_ms:    ms(T.event2.track_b2_reappear_iso),
    gap_minutes: 45,
    phase_min: 6
  },
  geometry: {
    type: "LineString",
    coordinates: [
      [trackA2_pings.at(-1).lon, trackA2_pings.at(-1).lat],
      [trackB2_pings[0].lon,     trackB2_pings[0].lat]
    ]
  }
});
features.push({
  type: "Feature",
  id: "ping:event-2:danti-corroboration",
  properties: {
    kind: "hero_ping",
    event_id: "event_2",
    role: "B",
    mmsi: "danti:unknown",
    t_iso: dantiPing.iso,
    t_epoch_ms: ms(dantiPing.iso),
    phase_min: 6,
    note: "Danti detection during dark gap"
  },
  geometry: { type: "Point", coordinates: [dantiPing.lon, dantiPing.lat] }
});
features.push({
  type: "Feature",
  id: "track:event-2:hero-B",
  properties: {
    kind: "hero_track",
    event_id: "event_2",
    role: "B",
    case_id: "case:alara-01:event-2",
    mmsi: "271990222",
    vessel_name: "MV HARBOR KITE",
    t_start_iso: trackB2_pings[0].iso,
    t_end_iso:   trackB2_pings.at(-1).iso,
    t_start_ms:  ms(trackB2_pings[0].iso),
    t_end_ms:    ms(trackB2_pings.at(-1).iso),
    phase_min: 6
  },
  geometry: {
    type: "LineString",
    coordinates: trackB2_pings.map(p => [p.lon, p.lat])
  }
});
for (const p of trackB2_pings) {
  features.push({
    type: "Feature",
    id: `ping:event-2:B:${p.iso}`,
    properties: {
      kind: "hero_ping",
      event_id: "event_2",
      role: "B",
      mmsi: "271990222",
      t_iso: p.iso,
      t_epoch_ms: ms(p.iso),
      phase_min: 6
    },
    geometry: { type: "Point", coordinates: [p.lon, p.lat] }
  });
}

// --- Top-level metadata block ----------------------------------------------

const fc = {
  type: "FeatureCollection",
  metadata: {
    schema_version: "seaforge.tracks.v1",
    aoi: {
      aoi_id: "aoi:alara-eez-box-01",
      name: WATCH_BOX_NAME,
      bbox: ALARA_EEZ_BBOX
    },
    canonical_timestamps: T,
    canonical_pings: {
      event_1: {
        track_a_last:  { mmsi: "366700111", iso: T.event1.track_a_last_iso,
                         lat: last(trackA_pings).lat, lon: last(trackA_pings).lon },
        track_b_first: { mmsi: "538009771", iso: T.event1.track_b_first_iso,
                         lat: trackB_pings[0].lat, lon: trackB_pings[0].lon }
      },
      event_2: {
        track_a2_last:  { mmsi: "271990222", iso: T.event2.track_a2_last_iso,
                          lat: last(trackA2_pings).lat, lon: last(trackA2_pings).lon },
        danti:          { iso: T.event2.danti_corroboration_iso,
                          lat: dantiPing.lat, lon: dantiPing.lon },
        track_b2_first: { mmsi: "271990222", iso: T.event2.track_b2_reappear_iso,
                          lat: trackB2_pings[0].lat, lon: trackB2_pings[0].lon }
      }
    },
    kalman_event_1: {
      gap_seconds: gapSeconds,
      mahalanobis: prediction.mahalanobis,
      likelihood:  prediction.likelihood,
      predicted_state: prediction.predictedState,
      track_b_inside_ellipse: true,
      tuning: KALMAN_TUNING,
      // shared/scoring/kalman.ts defines likelihood = exp(-0.5 * mahalanobis^2),
      // which gives ~0.71 for M=0.83. TECHNICAL_PLAN.md §14.4 cites L=0.91 in
      // its illustrative table — that figure corresponds to M ≈ 0.43 under
      // the same formula, so the doc table is internally inconsistent. We
      // surface the implementation's value here; if the docs are updated
      // later, regenerate this fixture.
      likelihood_formula: "exp(-0.5 * mahalanobis^2)"
    },
    rebuild_with: "node --experimental-strip-types scripts/build-tracks-geojson.mjs",
    generated_from: "TECHNICAL_PLAN.md §14.1, §14.3, §14.9 + shared/scoring/kalman.ts"
  },
  features
};

const outPath = resolve(repoRoot, "fixtures/maritime/tracks.geojson");
writeFileSync(outPath, JSON.stringify(fc, null, 2) + "\n");
console.log(`Wrote ${features.length} features to ${outPath}`);
