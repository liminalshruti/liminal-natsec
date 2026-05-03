import { mkdir, writeFile } from "node:fs/promises";
import { loadConfigIniIntoEnv } from "./load-config-ini.mjs";

loadConfigIniIntoEnv();

const HORMUZ = {
  name: "Strait of Hormuz demo AOI",
  // Broad Hormuz/Gulf of Oman box: [minLon, minLat, maxLon, maxLat].
  bbox: [54.4, 24.5, 57.8, 27.2],
  aisstreamBoundingBoxes: [[[24.5, 54.4], [27.2, 57.8]]],
  polygon: {
    type: "Polygon",
    coordinates: [[
      [54.4, 24.5],
      [57.8, 24.5],
      [57.8, 27.2],
      [54.4, 27.2],
      [54.4, 24.5]
    ]]
  }
};

const outputDir = new URL("../fixtures/maritime/live-cache/", import.meta.url);
const generatedAt = new Date().toISOString();

await mkdir(outputDir, { recursive: true });

const results = [];
results.push(await cacheGlobalFishingWatchEvents());
results.push(await cacheAisstreamSample());
results.push(await cachePublicHtml("navarea-ix-warnings.html", "NAVAREA_IX", envOr("NAVAREA_IX_WARNINGS_URL", "https://hydrography.paknavy.gov.pk/navarea-ix-warnings/")));
results.push(await cachePublicHtml("ukmto-home.html", "UKMTO", envOr("UKMTO_URL", "https://www.ukmto.org/")));
results.push(await cacheOverpassMaritimeContext());

await writeJson("manifest.json", {
  generated_at: generatedAt,
  aoi: HORMUZ,
  note: "Cached live/public Strait of Hormuz context. No API keys are stored in this directory.",
  results
});

console.log(`Cached ${results.length} source groups under ${outputDir.pathname}`);
for (const result of results) {
  console.log(`${result.ok ? "ok" : "warn"} ${result.source}: ${result.detail}`);
}

async function cacheGlobalFishingWatchEvents() {
  const token = envOr("GLOBAL_FISHING_WATCH_API_KEY");
  const baseUrl = envOr("GLOBAL_FISHING_WATCH_BASE_URL", "https://gateway.api.globalfishingwatch.org").replace(/\/$/, "");
  if (!token) {
    return { source: "GLOBAL_FISHING_WATCH", ok: false, detail: "GLOBAL_FISHING_WATCH_API_KEY missing; skipped." };
  }

  const sourceResults = [];
  const datasets = [
    ["gfw-hormuz-gaps.json", "public-global-gaps-events:latest", ["GAP"]],
    ["gfw-hormuz-port-visits.json", "public-global-port-visits-events:latest", ["PORT_VISIT"]],
    ["gfw-hormuz-loitering.json", "public-global-loitering-events:latest", ["LOITERING"]]
  ];

  for (const [fileName, dataset, types] of datasets) {
    const payload = {
      datasets: [dataset],
      types,
      startDate: "2025-01-01",
      endDate: "2026-04-30",
      geometry: HORMUZ.polygon,
      limit: 50,
      offset: 0
    };

    sourceResults.push(await fetchJsonToFile({
      fileName,
      source: "GLOBAL_FISHING_WATCH",
      url: `${baseUrl}/v3/events?limit=50&offset=0`,
      options: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      },
      requestMetadata: { dataset, types, aoi: HORMUZ.name }
    }));
  }

  const okCount = sourceResults.filter((result) => result.ok).length;
  return {
    source: "GLOBAL_FISHING_WATCH",
    ok: okCount > 0,
    detail: `${okCount}/${sourceResults.length} event caches written.`,
    files: sourceResults.map((result) => result.fileName)
  };
}

async function cacheAisstreamSample() {
  const apiKey = envOr("AISSTREAM_API_KEY");
  if (!apiKey) {
    return { source: "AISSTREAM", ok: false, detail: "AISSTREAM_API_KEY missing; skipped." };
  }

  const messages = [];
  const errors = [];
  const maxMessages = Number(envOr("AISSTREAM_CACHE_MAX_MESSAGES", "120"));
  const durationMs = Number(envOr("AISSTREAM_CACHE_SECONDS", "45")) * 1000;

  await new Promise((resolve) => {
    const socket = new WebSocket("wss://stream.aisstream.io/v0/stream");
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // Ignore close races.
      }
      resolve();
    };

    const timer = setTimeout(finish, durationMs);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: HORMUZ.aisstreamBoundingBoxes,
        FilterMessageTypes: ["PositionReport", "ShipStaticData", "StaticDataReport"]
      }));
    });

    socket.addEventListener("message", (event) => {
      try {
        const parsed = JSON.parse(String(event.data));
        messages.push({
          cached_at: new Date().toISOString(),
          ...parsed
        });
        if (messages.length >= maxMessages) {
          finish();
        }
      } catch (error) {
        errors.push({ message: error instanceof Error ? error.message : String(error) });
      }
    });

    socket.addEventListener("error", () => {
      errors.push({ message: "AISstream WebSocket error" });
      finish();
    });

    socket.addEventListener("close", finish);
  });

  await writeJson("aisstream-hormuz-sample.json", {
    source: "AISSTREAM",
    generated_at: generatedAt,
    aoi: HORMUZ,
    message_count: messages.length,
    errors,
    messages
  });

  return {
    source: "AISSTREAM",
    ok: messages.length > 0,
    detail: `${messages.length} AIS messages cached.`,
    fileName: "aisstream-hormuz-sample.json"
  };
}

async function cachePublicHtml(fileName, source, url) {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "SeaForge hackathon cache/0.1" } });
    const text = await response.text();
    await writeFile(new URL(fileName, outputDir), text);
    await writeJson(fileName.replace(/\.html$/, ".metadata.json"), {
      source,
      generated_at: generatedAt,
      url,
      status: response.status,
      ok: response.ok,
      bytes: text.length
    });
    return { source, ok: response.ok, detail: `${response.status}; ${text.length} bytes cached.`, fileName };
  } catch (error) {
    await writeJson(fileName.replace(/\.html$/, ".error.json"), {
      source,
      generated_at: generatedAt,
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    return { source, ok: false, detail: `failed: ${error instanceof Error ? error.message : String(error)}`, fileName };
  }
}

async function cacheOverpassMaritimeContext() {
  const url = envOr("OVERPASS_API_URL", "https://overpass-api.de/api/interpreter");
  const query = `
    [out:json][timeout:25];
    (
      node["seamark:type"](${HORMUZ.bbox[1]},${HORMUZ.bbox[0]},${HORMUZ.bbox[3]},${HORMUZ.bbox[2]});
      way["seamark:type"](${HORMUZ.bbox[1]},${HORMUZ.bbox[0]},${HORMUZ.bbox[3]},${HORMUZ.bbox[2]});
      relation["seamark:type"](${HORMUZ.bbox[1]},${HORMUZ.bbox[0]},${HORMUZ.bbox[3]},${HORMUZ.bbox[2]});
      node["harbour"](${HORMUZ.bbox[1]},${HORMUZ.bbox[0]},${HORMUZ.bbox[3]},${HORMUZ.bbox[2]});
      way["harbour"](${HORMUZ.bbox[1]},${HORMUZ.bbox[0]},${HORMUZ.bbox[3]},${HORMUZ.bbox[2]});
      node["amenity"="ferry_terminal"](${HORMUZ.bbox[1]},${HORMUZ.bbox[0]},${HORMUZ.bbox[3]},${HORMUZ.bbox[2]});
      way["landuse"="port"](${HORMUZ.bbox[1]},${HORMUZ.bbox[0]},${HORMUZ.bbox[3]},${HORMUZ.bbox[2]});
    );
    out tags center 200;
  `;

  return fetchJsonToFile({
    fileName: "overpass-hormuz-maritime.json",
    source: "OVERPASS",
    url,
    options: {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: query }).toString()
    },
    requestMetadata: { aoi: HORMUZ.name, bbox: HORMUZ.bbox }
  });
}

async function fetchJsonToFile({ fileName, source, url, options, requestMetadata }) {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw_text: text };
    }

    const payload = {
      source,
      generated_at: generatedAt,
      request: {
        url,
        method: options?.method ?? "GET",
        metadata: requestMetadata
      },
      response: {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      },
      body
    };

    await writeJson(fileName, payload);
    return {
      source,
      ok: response.ok,
      detail: `${fileName}: ${response.status} ${response.statusText}`,
      fileName
    };
  } catch (error) {
    await writeJson(fileName, {
      source,
      generated_at: generatedAt,
      request: { url, method: options?.method ?? "GET", metadata: requestMetadata },
      response: { ok: false },
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      source,
      ok: false,
      detail: `${fileName}: failed: ${error instanceof Error ? error.message : String(error)}`,
      fileName
    };
  }
}

async function writeJson(fileName, value) {
  await writeFile(new URL(fileName, outputDir), `${JSON.stringify(value, null, 2)}\n`);
}

function envOr(key, fallback = "") {
  return process.env[key]?.trim() || fallback;
}
