#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { loadConfigIniIntoEnv } from "./load-config-ini.mjs";

loadConfigIniIntoEnv();

const token = process.env.GLOBAL_FISHING_WATCH_API_KEY;
if (!token) {
  console.error("GLOBAL_FISHING_WATCH_API_KEY missing (config.ini or env).");
  process.exit(1);
}
const baseUrl = (process.env.GLOBAL_FISHING_WATCH_BASE_URL ?? "https://gateway.api.globalfishingwatch.org").replace(/\/$/, "");
const WINDOW_DAYS = Number(process.env.GFW_WINDOW_DAYS ?? "90");
const TIMEOUT_MS = Number(process.env.GFW_TIMEOUT_MS ?? "90000");
const LIMIT = Number(process.env.GFW_LIMIT ?? "100");
const OUT_DIR = new URL("../fixtures/maritime/live-cache/", import.meta.url);

const HORMUZ_AOI = "Strait of Hormuz demo AOI";
const HORMUZ_POLYGON = {
  type: "Polygon",
  coordinates: [[
    [54.4, 24.5],
    [57.8, 24.5],
    [57.8, 27.2],
    [54.4, 27.2],
    [54.4, 24.5]
  ]]
};

const endDate = new Date();
const startDate = new Date(endDate.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
const startStr = startDate.toISOString().slice(0, 10);
const endStr = endDate.toISOString().slice(0, 10);
const generatedAt = new Date().toISOString();

const datasets = [
  ["gfw-hormuz-gaps.json",         "public-global-gaps-events:latest",         ["GAP"]],
  ["gfw-hormuz-port-visits.json",  "public-global-port-visits-events:latest",  ["PORT_VISIT"]],
  ["gfw-hormuz-loitering.json",    "public-global-loitering-events:latest",    ["LOITERING"]]
];

console.error(`GFW window: ${startStr} -> ${endStr} (${WINDOW_DAYS} days), timeout ${TIMEOUT_MS}ms, limit ${LIMIT}`);

let allOk = true;
for (const [fileName, dataset, types] of datasets) {
  const requestPayload = {
    datasets: [dataset],
    types,
    startDate: startStr,
    endDate: endStr,
    geometry: HORMUZ_POLYGON,
    limit: LIMIT,
    offset: 0
  };
  const url = `${baseUrl}/v3/events?limit=${LIMIT}&offset=0`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
  let resp, text, status, statusText, contentType, parsedOk = false, body, errorMsg;
  const tStart = Date.now();
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    });
    text = await resp.text();
    status = resp.status;
    statusText = resp.statusText;
    contentType = resp.headers.get("content-type");
    try { body = JSON.parse(text); parsedOk = true; }
    catch { body = { raw_text: text.slice(0, 100_000) }; }
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
  } finally {
    clearTimeout(timer);
  }
  const elapsed = Date.now() - tStart;
  const ok = !!resp && resp.ok && parsedOk;
  if (!ok) allOk = false;
  const entriesArr = Array.isArray(body?.entries) ? body.entries : [];
  const total = body?.total ?? entriesArr.length;
  const cachePayload = {
    source: "GLOBAL_FISHING_WATCH",
    generated_at: generatedAt,
    fixture_mode: false,
    request: {
      url,
      method: "POST",
      metadata: { dataset, types, aoi: HORMUZ_AOI, window_days: WINDOW_DAYS, fixture_fallback: false }
    },
    response: {
      ok,
      status: status ?? 0,
      statusText: statusText ?? (errorMsg ?? "unreachable"),
      contentType: contentType ?? null,
      bytes: text?.length ?? 0,
      elapsed_ms: elapsed
    },
    error: errorMsg,
    body: parsedOk
      ? {
          metadata: {
            dataset,
            types,
            query: "live fetch",
            limit: LIMIT,
            offset: 0,
            total,
            window: { startDate: startStr, endDate: endStr }
          },
          entries: entriesArr
        }
      : body
  };
  await writeFile(new URL(fileName, OUT_DIR), `${JSON.stringify(cachePayload, null, 2)}\n`);
  console.error(`  ${fileName}: HTTP=${status ?? "ERR"} entries=${entriesArr.length} total=${total} ok=${ok} (${elapsed}ms)${errorMsg ? ` err=${errorMsg}` : ""}`);
}

if (!allOk) {
  console.error("WARN: at least one GFW request did not return ok; cache files written but real generator may exclude them.");
  process.exit(2);
}
