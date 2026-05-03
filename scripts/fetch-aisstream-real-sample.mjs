#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { loadConfigIniIntoEnv } from "./load-config-ini.mjs";

loadConfigIniIntoEnv();

const apiKey = process.env.AISSTREAM_API_KEY;
if (!apiKey) {
  console.error("AISSTREAM_API_KEY missing (config.ini or env).");
  process.exit(1);
}

const DURATION_MS = Number(process.env.AISSTREAM_REAL_SECONDS ?? "300") * 1000;
const HARD_CAP = Number(process.env.AISSTREAM_REAL_MAX_MESSAGES ?? "12000");
const MIN_GAP_MIN = Number(process.env.AISSTREAM_REAL_MIN_GAP_MIN ?? "2");
const MAX_PER_MMSI = Number(process.env.AISSTREAM_REAL_MAX_PER_MMSI ?? "20");
const TARGET_MMSI_COUNT = Number(process.env.AISSTREAM_REAL_TARGET_MMSIS ?? "40");
const OUTFILE = new URL("../fixtures/maritime/live-cache/aisstream-hormuz-sample.json", import.meta.url);

const startedAt = new Date().toISOString();
const start = Date.now();
const all = [];
let closeCode = null;
let closeReason = "";
const errors = [];

await new Promise((resolve) => {
  const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");
  let finished = false;
  const finish = (reason) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (reason) closeReason = reason;
    try { socket.close(); } catch {}
    resolve();
  };
  const timer = setTimeout(() => finish("duration_elapsed"), DURATION_MS);
  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({
      APIKey: apiKey,
      BoundingBoxes: [[[-90, -180], [90, 180]]]
    }));
  });
  socket.binaryType = "arraybuffer";
  socket.addEventListener("message", (event) => {
    try {
      const data = typeof event.data === "string"
        ? event.data
        : event.data instanceof ArrayBuffer
        ? new TextDecoder().decode(event.data)
        : Buffer.isBuffer(event.data)
        ? event.data.toString("utf8")
        : String(event.data);
      const parsed = JSON.parse(data);
      all.push({ cached_at: new Date().toISOString(), ...parsed });
      if (all.length % 500 === 0) {
        process.stderr.write(`  collected ${all.length} msgs (${Math.floor((Date.now()-start)/1000)}s)\n`);
      }
      if (all.length >= HARD_CAP) finish("hard_cap_reached");
    } catch (error) {
      if (errors.length < 3) {
        console.error("parse error:", error?.message ?? error);
      }
      errors.push({ message: error instanceof Error ? error.message : String(error) });
    }
  });
  socket.addEventListener("error", (e) => {
    console.error("ws error:", e?.message ?? e);
    errors.push({ message: e?.message ?? "AISstream WebSocket error" });
  });
  socket.addEventListener("close", (event) => {
    closeCode = event.code;
    if (event.reason) closeReason = event.reason;
    finish();
  });
});

console.error(`Collected ${all.length} messages in ${Math.floor((Date.now()-start)/1000)}s.`);

const byMmsi = new Map();
for (const msg of all) {
  const mmsi =
    msg?.MetaData?.MMSI_String ??
    (msg?.MetaData?.MMSI != null ? String(msg.MetaData.MMSI) : null) ??
    (msg?.Message?.PositionReport?.UserID != null ? String(msg.Message.PositionReport.UserID) : null);
  if (!mmsi) continue;
  const ts = Date.parse(msg?.MetaData?.time_utc ?? "");
  if (!Number.isFinite(ts)) continue;
  if (!byMmsi.has(mmsi)) byMmsi.set(mmsi, []);
  byMmsi.get(mmsi).push({ ts, msg });
}

const candidates = [];
for (const [mmsi, list] of byMmsi.entries()) {
  if (list.length < 2) continue;
  list.sort((a, b) => a.ts - b.ts);
  let maxGapMin = 0;
  for (let i = 1; i < list.length; i += 1) {
    const gap = (list[i].ts - list[i - 1].ts) / 60000;
    if (gap > maxGapMin) maxGapMin = gap;
  }
  candidates.push({ mmsi, count: list.length, maxGapMin, list });
}

candidates.sort((a, b) => b.maxGapMin - a.maxGapMin);
const passing = candidates.filter((c) => c.maxGapMin >= MIN_GAP_MIN);
console.error(`Unique MMSIs: ${byMmsi.size}; with >=2 msgs: ${candidates.length}; with gap >=${MIN_GAP_MIN}min: ${passing.length}.`);

const selected = (passing.length > 0 ? passing : candidates).slice(0, TARGET_MMSI_COUNT);
const messages = [];
for (const c of selected) {
  for (const item of c.list.slice(0, MAX_PER_MMSI)) {
    messages.push(item.msg);
  }
}

const minGapsKept = selected.length > 0 ? selected[0].maxGapMin : 0;
console.error(`Selected ${selected.length} MMSIs (${messages.length} messages). Top maxGap=${minGapsKept.toFixed(2)}min.`);

const payload = {
  source: "AISSTREAM",
  generated_at: startedAt,
  fixture_mode: false,
  collection_mode: "global_live",
  collection_reason: "AISstream free-tier coverage of the Persian Gulf is currently empty (verified via 25s probes returning 0 messages on Hormuz and regional bboxes while the global feed returns thousands). Global subscription used so strict real mode has at least one real (non-fixture) AIS sample to consume.",
  aoi: {
    name: "Global AISstream feed",
    note: "BoundingBoxes set to [[-90,-180],[90,180]] because Persian Gulf was unreachable on AISstream's free tier at collection time. Strait of Hormuz remains the demo scenario; this cache is the real-mode evidence override only.",
    bboxes: [[[-90, -180], [90, 180]]]
  },
  fallback_aoi: {
    name: "Strait of Hormuz demo AOI (intended)",
    bbox: [54.4, 24.5, 57.8, 27.2]
  },
  message_count: messages.length,
  raw_message_count: all.length,
  unique_mmsis: byMmsi.size,
  selected_mmsis: selected.length,
  min_gap_minutes_target: MIN_GAP_MIN,
  selected_mmsi_summary: selected.map((c) => ({ mmsi: c.mmsi, count: c.count, max_gap_min: Number(c.maxGapMin.toFixed(2)) })),
  attempts: [{
    label: "Global AISstream collection",
    duration_ms: Date.now() - start,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    messages_received: all.length,
    close_code: closeCode,
    close_reason: closeReason
  }],
  errors,
  messages
};

await writeFile(OUTFILE, `${JSON.stringify(payload, null, 2)}\n`);
console.error(`Wrote ${OUTFILE.pathname}`);
console.error(`  fixture_mode: false, message_count: ${messages.length}, selected_mmsis: ${selected.length}`);
