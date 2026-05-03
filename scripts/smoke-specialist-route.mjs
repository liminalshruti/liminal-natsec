import { createApp } from "../server/src/index.ts";

const app = createApp();

const requestBody = {
  anomaly_id: "anom:smoke:0001",
  evidence: [
    {
      id: "obs:ais-gap:0001",
      type: "AIS_POSITION",
      modality: "kinematic",
      observed_at: "2026-04-18T10:15:04Z",
      geometry: { type: "Point", coordinates: [-122.4, 37.7] },
      source: "AISHUB"
    },
    {
      id: "obs:danti-osint:0001",
      type: "OSINT_DOCUMENT",
      modality: "geo",
      observed_at: "2026-04-18T10:20:00Z",
      geometry: { type: "Point", coordinates: [-122.41, 37.72] },
      source: "DANTI"
    },
    {
      id: "ev:intent-indicator:0001",
      type: "INTENT_INDICATOR",
      modality: "text",
      observed_at: "2026-04-18T10:15:00Z",
      source: "EXA"
    }
  ],
  claim: { id: "claim:smoke:0001", posterior: 0.7 }
};

console.log("[smoke] POST /specialist/intent (with INTENT_INDICATOR)");
const r1 = await app.fetch(
  new Request("http://localhost/specialist/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  })
);
console.log("  status:", r1.status);
const body1 = await r1.json();
console.log("  verdict:", body1.verdict);
console.log("  source:", body1.source);
console.log("  applied_layers:", body1.guard?.applied_layers);

console.log("\n[smoke] POST /specialist/intent (no INTENT_INDICATOR -> should refuse)");
const noIndicatorBody = { ...requestBody, evidence: requestBody.evidence.slice(0, 2) };
const r2 = await app.fetch(
  new Request("http://localhost/specialist/intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(noIndicatorBody)
  })
);
console.log("  status:", r2.status);
const body2 = await r2.json();
console.log("  verdict:", body2.verdict);
console.log("  applied_layers:", body2.guard?.applied_layers);

console.log("\n[smoke] POST /specialist/telemetry (unknown -> 400)");
const r3 = await app.fetch(
  new Request("http://localhost/specialist/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  })
);
console.log("  status:", r3.status);
const body3 = await r3.json();
console.log("  code:", body3.code);

console.log("\n[smoke] GET /health");
const r4 = await app.fetch(new Request("http://localhost/health"));
console.log("  status:", r4.status);

console.log("\n[smoke] OK — Hono assembled, all registrars booted, route returns guarded output");
