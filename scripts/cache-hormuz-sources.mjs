import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
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

const REGIONAL_AIS_FALLBACK = {
  name: "Arabian Gulf and Gulf of Oman AIS fallback AOI",
  aisstreamBoundingBoxes: [[[22.0, 48.0], [30.5, 62.5]]]
};

const outputDir = new URL("../fixtures/maritime/live-cache/", import.meta.url);
const generatedAt = new Date().toISOString();
const endDate = new Date();
const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
const isoDateTimeRange = `${startDate.toISOString()}/${endDate.toISOString()}`;
const cacheProfile = parseCacheProfile(process.argv.slice(2));

await mkdir(outputDir, { recursive: true });

const results = [];
if (cacheProfile === "all" || cacheProfile === "fast") {
  results.push(await cacheFoundryConnection());
  results.push(await cacheGlobalFishingWatchVesselCapability());
  results.push(await cacheExaHormuzOsint());
  results.push(await cacheShodanMaritimeIntel());
  results.push(await cacheOpenSanctionsMaritimeEntities());
  results.push(await cacheCopernicusCdseAuth());
  results.push(await cacheCopernicusStacSearches());
  results.push(await cacheSentinelHubAuthAndChips());
  results.push(await cachePublicHtml("navarea-ix-warnings.html", "NAVAREA_IX", envOr("NAVAREA_IX_WARNINGS_URL", "https://hydrography.paknavy.gov.pk/navarea-ix-warnings/")));
  results.push(await cachePublicHtml("ukmto-home.html", "UKMTO", envOr("UKMTO_URL", "https://www.ukmto.org/")));
  results.push(await cacheOverpassMaritimeContext());
}

if (cacheProfile === "all" || cacheProfile === "fast" || cacheProfile === "danti") {
  results.push(await cacheDantiHormuzSearch());
}

if (cacheProfile === "all" || cacheProfile === "slow") {
  results.push(await cacheGlobalFishingWatchEvents());
  results.push(await cacheAisstreamSample());
  results.push(await cacheCopernicusMarineCredentialCheck());
}

const manifest = {
  generated_at: generatedAt,
  profile: cacheProfile,
  aoi: HORMUZ,
  note: "Cached live/public Strait of Hormuz context. No API keys are stored in this directory.",
  results
};

const manifestFileName = cacheProfile === "all" ? "manifest.json" : `manifest-${cacheProfile}.json`;
await writeJson(manifestFileName, manifest);
if (cacheProfile === "fast") {
  await writeJson("manifest.json", manifest);
}

console.log(`Cached ${results.length} ${cacheProfile} source groups under ${outputDir.pathname}`);
for (const result of results) {
  console.log(`${result.ok ? "ok" : "warn"} ${result.source}: ${result.detail}`);
}

async function cacheFoundryConnection() {
  const baseUrl = envOr("FOUNDRY_BASE_URL").replace(/\/$/, "");
  const token = envOr("FOUNDRY_TOKEN");
  if (!baseUrl || !token) {
    return { source: "FOUNDRY", ok: false, detail: "FOUNDRY_BASE_URL or FOUNDRY_TOKEN missing; skipped." };
  }

  return fetchJsonToFile({
    fileName: "foundry-ontologies.json",
    source: "FOUNDRY",
    url: `${baseUrl}/api/v2/ontologies`,
    options: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    },
    requestMetadata: {
      purpose: "Verify Foundry token and discover visible ontology metadata. No token is cached."
    },
    timeoutMs: 15_000
  });
}

async function cacheGlobalFishingWatchEvents() {
  const token = envOr("GLOBAL_FISHING_WATCH_API_KEY");
  const baseUrl = envOr("GLOBAL_FISHING_WATCH_BASE_URL", "https://gateway.api.globalfishingwatch.org").replace(/\/$/, "");
  if (!token) {
    return { source: "GLOBAL_FISHING_WATCH", ok: false, detail: "GLOBAL_FISHING_WATCH_API_KEY missing; skipped." };
  }

  const sourceResults = [];

  const gfwStartDate = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const gfwEndDate = endDate.toISOString().slice(0, 10);
  const datasets = [
    ["gfw-hormuz-gaps.json", "public-global-gaps-events:latest", ["GAP"]],
    ["gfw-hormuz-port-visits.json", "public-global-port-visits-events:latest", ["PORT_VISIT"]],
    ["gfw-hormuz-loitering.json", "public-global-loitering-events:latest", ["LOITERING"]]
  ];

  for (const [fileName, dataset, types] of datasets) {
    const payload = {
      datasets: [dataset],
      types,
      startDate: gfwStartDate,
      endDate: gfwEndDate,
      geometry: HORMUZ.polygon,
      limit: 10,
      offset: 0
    };

    sourceResults.push(await fetchJsonToFile({
      fileName,
      source: "GLOBAL_FISHING_WATCH",
      url: `${baseUrl}/v3/events?limit=10&offset=0`,
      options: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      },
      requestMetadata: { dataset, types, aoi: HORMUZ.name },
      timeoutMs: 20_000
    }));
  }

  const okCount = sourceResults.filter((result) => result.ok).length;
  return {
    source: "GLOBAL_FISHING_WATCH_EVENTS",
    ok: okCount > 0,
    detail: `${okCount}/${sourceResults.length} event caches written.`,
    files: sourceResults.map((result) => result.fileName)
  };
}

async function cacheGlobalFishingWatchVesselCapability() {
  const token = envOr("GLOBAL_FISHING_WATCH_API_KEY");
  const baseUrl = envOr("GLOBAL_FISHING_WATCH_BASE_URL", "https://gateway.api.globalfishingwatch.org").replace(/\/$/, "");
  if (!token) {
    return { source: "GLOBAL_FISHING_WATCH", ok: false, detail: "GLOBAL_FISHING_WATCH_API_KEY missing; skipped." };
  }

  return cacheGlobalFishingWatchVesselSearch(baseUrl, token);
}

async function cacheGlobalFishingWatchVesselSearch(baseUrl, token) {
  const url = new URL(`${baseUrl}/v3/vessels/search`);
  url.searchParams.set("query", "IRISL");
  url.searchParams.set("datasets[0]", "public-global-vessel-identity:latest");
  url.searchParams.set("limit", "10");

  return fetchJsonToFile({
    fileName: "gfw-vessel-search-irisl.json",
    source: "GLOBAL_FISHING_WATCH",
    url: url.toString(),
    options: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    },
    requestMetadata: {
      query: "IRISL",
      dataset: "public-global-vessel-identity:latest",
      note: "Lightweight GFW key/capability check against the Vessel API."
    },
    timeoutMs: 15_000
  });
}

async function cacheDantiHormuzSearch() {
  const baseUrl = envOr("DANTI_BASE_URL", "https://ipa.gov.danti.ai").replace(/\/$/, "");
  const apiKey = envOr("DANTI_API_KEY");
  const username = envOr("DANTI_USERNAME");
  const password = envOr("DANTI_PASSWORD");
  const authBaseUrl = envOr("DANTI_AUTH_BASE_URL", "https://auth.gov.danti.ai/realms/gov").replace(/\/$/, "");
  const appUrl = envOr("DANTI_APP_URL", "https://gov.danti.ai").replace(/\/$/, "");
  const clientId = envOr("DANTI_CLIENT_ID", "bastet");
  const scope = envOr("DANTI_SCOPE", "openid email roles");
  const query = envOr("DANTI_QUERY", "Strait of Hormuz maritime security AIS dark gaps shipping traffic Iran Oman UAE");
  const size = Number(envOr("DANTI_QUERY_SIZE", "10"));

  if (!apiKey && (!username || !password)) {
    return {
      source: "DANTI",
      ok: false,
      detail: "DANTI_API_KEY or DANTI_USERNAME/DANTI_PASSWORD missing; skipped."
    };
  }

  const auth = apiKey
    ? {
        ok: true,
        mode: "static_bearer",
        token: apiKey,
        response: { ok: true, status: "static" },
        body: { token_type: "Bearer", has_access_token: true }
      }
    : await getDantiOidcToken({ username, password, authBaseUrl, appUrl, clientId, scope });

  await writeJson("danti-auth.json", {
    source: "DANTI_AUTH",
    generated_at: generatedAt,
    request: {
      url: authBaseUrl,
      method: apiKey ? "static bearer" : "OIDC authorization_code + PKCE",
      metadata: {
        appUrl,
        clientId,
        scope,
        username_present: Boolean(username),
        password_cached: false,
        token_cached: false,
        auth_mode: auth.mode
      }
    },
    response: auth.response,
    body: sanitizeAuthBody(auth.body),
    error: auth.error,
    stages: auth.stages
  });

  if (!auth.ok || !auth.token) {
    return {
      source: "DANTI",
      ok: false,
      detail: `${auth.response?.status ?? "failed"} auth; query skipped.`,
      fileName: "danti-auth.json"
    };
  }

  const url = `${baseUrl}/v2/query?size=${Number.isFinite(size) && size > 0 ? size : 10}`;
  const response = await fetchJson({
    source: "DANTI",
    url,
    options: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        query,
        filters: []
      })
    },
    timeoutMs: 90_000
  });

  await writeJson("danti-hormuz-query.json", {
    source: "DANTI",
    generated_at: generatedAt,
    request: {
      url,
      method: "POST",
      metadata: {
        query,
        aoi: HORMUZ.name,
        size: Number.isFinite(size) && size > 0 ? size : 10,
        token_cached: false,
        auth_mode: auth.mode
      }
    },
    response: response.response,
    body: limitJson(response.body),
    error: response.error
  });

  return {
    source: "DANTI",
    ok: Boolean(response.response?.ok),
    detail: `auth ${auth.response?.status ?? "ok"}; query ${response.response?.status ?? "failed"} ${response.response?.statusText ?? response.error ?? ""}`.trim(),
    files: ["danti-auth.json", "danti-hormuz-query.json"]
  };
}

async function getDantiOidcToken({ username, password, authBaseUrl, appUrl, clientId, scope }) {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  const state = base64Url(randomBytes(16));
  const nonce = base64Url(randomBytes(16));
  const cookieJar = new Map();
  const stages = [];

  const authUrl = new URL(`${authBaseUrl}/protocol/openid-connect/auth`);
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: appUrl,
    response_type: "code",
    scope,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256"
  }).toString();

  let { response, url } = await followDantiRedirects(authUrl.toString(), {}, cookieJar);
  let html = await response.text();
  let context = extractDantiLoginContext(html);

  for (let step = 0; step < 4; step += 1) {
    const callback = readDantiCallback(url);
    if (callback.code) {
      const token = await exchangeDantiCode({
        authBaseUrl,
        clientId,
        appUrl,
        code: callback.code,
        verifier
      });
      return {
        ...token,
        ok: token.response?.ok === true,
        mode: "oidc_authorization_code_pkce",
        stages: [
          ...stages,
          { step, pageId: "callback", state_matches: callback.state === state }
        ]
      };
    }

    if (!context.loginAction) {
      return {
        ok: false,
        mode: "oidc_authorization_code_pkce",
        response: { ok: false, status: response.status, statusText: response.statusText },
        error: context.error || callback.error || "Danti login action not found.",
        stages
      };
    }

    const body = new URLSearchParams();
    if (context.pageId === "login-username") {
      body.set("username", username);
    } else {
      body.set("username", username);
      body.set("password", password);
      body.set("credentialId", "");
    }

    stages.push({
      step,
      pageId: context.pageId,
      templateName: context.templateName,
      posting: context.pageId === "login-username" ? "username" : "password"
    });

    ({ response, url } = await followDantiRedirects(
      context.loginAction,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: new URL(authBaseUrl).origin,
          Referer: url
        },
        body: body.toString()
      },
      cookieJar
    ));
    html = await response.text();
    context = extractDantiLoginContext(html);
  }

  return {
    ok: false,
    mode: "oidc_authorization_code_pkce",
    response: { ok: false, status: response.status, statusText: response.statusText },
    error: context.error || "Danti login did not return an authorization code.",
    stages
  };
}

async function exchangeDantiCode({ authBaseUrl, clientId, appUrl, code, verifier }) {
  const response = await fetchWithTimeout(`${authBaseUrl}/protocol/openid-connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "SeaForge hackathon cache/0.1"
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: appUrl,
      code,
      code_verifier: verifier
    }).toString()
  }, 20_000);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw_text: truncate(text, 10_000) };
  }

  return {
    token: body.access_token,
    response: {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      bytes: text.length
    },
    body,
    error: response.ok ? undefined : body.error_description || body.error
  };
}

async function followDantiRedirects(url, options, cookieJar) {
  let response = await fetchDantiWithCookies(url, options, cookieJar);
  for (let i = 0; i < 10 && response.status >= 300 && response.status < 400; i += 1) {
    const location = response.headers.get("location");
    if (!location) break;
    url = new URL(location, url).toString();
    response = await fetchDantiWithCookies(url, { method: "GET" }, cookieJar);
  }
  return { response, url };
}

async function fetchDantiWithCookies(url, options = {}, cookieJar) {
  const cookie = Array.from(cookieJar.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
  const response = await fetchWithTimeout(url, {
    ...options,
    redirect: "manual",
    headers: {
      "User-Agent": "SeaForge hackathon cache/0.1",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8",
      ...(options.headers ?? {}),
      ...(cookie ? { Cookie: cookie } : {})
    }
  }, 20_000);

  for (const setCookie of response.headers.getSetCookie?.() ?? []) {
    const pair = setCookie.split(";")[0];
    const equalsIndex = pair.indexOf("=");
    if (equalsIndex > 0) {
      cookieJar.set(pair.slice(0, equalsIndex), pair.slice(equalsIndex + 1));
    }
  }

  return response;
}

function extractDantiLoginContext(html) {
  const value = (key) => {
    const match = html.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"])*)"`));
    return match ? decodeDantiJsonString(match[1]) : "";
  };
  const summary = html.match(/"summary"\s*:\s*"((?:\\.|[^"])*)"/);
  return {
    pageId: value("pageId"),
    templateName: value("templateName"),
    loginAction: value("loginAction"),
    error: summary ? decodeDantiJsonString(summary[1]) : ""
  };
}

function readDantiCallback(url) {
  const parsed = new URL(url);
  return {
    code: parsed.searchParams.get("code"),
    error: parsed.searchParams.get("error"),
    state: parsed.searchParams.get("state")
  };
}

function decodeDantiJsonString(value) {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value.replace(/\\\//g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, "\"");
  }
}

function base64Url(buffer) {
  return Buffer.from(buffer).toString("base64url");
}

async function cacheAisstreamSample() {
  const apiKey = envOr("AISSTREAM_API_KEY");
  if (!apiKey) {
    return { source: "AISSTREAM", ok: false, detail: "AISSTREAM_API_KEY missing; skipped." };
  }

  const messages = [];
  const errors = [];
  const maxMessages = Number(envOr("AISSTREAM_CACHE_MAX_MESSAGES", "100"));
  const durationMs = Number(envOr("AISSTREAM_CACHE_SECONDS", "30")) * 1000;
  const fallbackDurationMs = Number(envOr("AISSTREAM_FALLBACK_CACHE_SECONDS", "30")) * 1000;
  const attempts = [];

  attempts.push(await sampleAisstream({
    label: HORMUZ.name,
    boundingBoxes: HORMUZ.aisstreamBoundingBoxes,
    apiKey,
    messages,
    errors,
    maxMessages,
    durationMs
  }));

  if (messages.length === 0) {
    attempts.push(await sampleAisstream({
      label: REGIONAL_AIS_FALLBACK.name,
      boundingBoxes: REGIONAL_AIS_FALLBACK.aisstreamBoundingBoxes,
      apiKey,
      messages,
      errors,
      maxMessages,
      durationMs: fallbackDurationMs
    }));
  }

  await writeJson("aisstream-hormuz-sample.json", {
    source: "AISSTREAM",
    generated_at: generatedAt,
    aoi: HORMUZ,
    fallback_aoi: REGIONAL_AIS_FALLBACK,
    message_count: messages.length,
    attempts,
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

async function sampleAisstream({
  label,
  boundingBoxes,
  apiKey,
  messages,
  errors,
  maxMessages,
  durationMs
}) {
  const attempt = {
    label,
    duration_ms: durationMs,
    max_messages: maxMessages,
    opened: false,
    subscription_sent: false,
    started_at: new Date().toISOString(),
    messages_before: messages.length,
    messages_after: messages.length
  };

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
      attempt.opened = true;
      socket.send(JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: boundingBoxes
      }));
      attempt.subscription_sent = true;
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

    socket.addEventListener("close", (event) => {
      attempt.close_code = event.code;
      attempt.close_reason = event.reason;
      finish();
    });
  });

  attempt.finished_at = new Date().toISOString();
  attempt.messages_after = messages.length;
  attempt.messages_received = attempt.messages_after - attempt.messages_before;
  return attempt;
}

async function cacheExaHormuzOsint() {
  const apiKey = envOr("EXA_API_KEY");
  if (!apiKey) {
    return { source: "EXA", ok: false, detail: "EXA_API_KEY missing; skipped." };
  }

  const query = [
    "Strait of Hormuz maritime security warnings AIS dark gaps vessel traffic",
    "Iran Oman UAE shipping lane incidents NAVAREA UKMTO"
  ].join(" ");

  return fetchJsonToFile({
    fileName: "exa-hormuz-osint.json",
    source: "EXA",
    url: "https://api.exa.ai/search",
    options: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        query,
        type: "auto",
        category: "news",
        numResults: 12,
        startPublishedDate: "2026-01-01T00:00:00.000Z",
        contents: {
          text: { maxCharacters: 1200 },
          highlights: { numSentences: 2 },
          summary: { query: "Summarize maritime security relevance to Strait of Hormuz watchstanding." }
        }
      })
    },
    requestMetadata: {
      query,
      aoi: HORMUZ.name,
      note: "Exa API key is sent in x-api-key header and is not cached."
    },
    timeoutMs: 20_000
  });
}

async function cacheShodanMaritimeIntel() {
  const apiKey = envOr("SHODAN_API_KEY");
  if (!apiKey) {
    return { source: "SHODAN", ok: false, detail: "SHODAN_API_KEY missing; skipped." };
  }

  const apiInfoUrl = new URL("https://api.shodan.io/api-info");
  apiInfoUrl.searchParams.set("key", apiKey);
  const apiInfo = await fetchJsonToFile({
    fileName: "shodan-api-info.json",
    source: "SHODAN",
    url: apiInfoUrl.toString(),
    safeUrl: redactUrl(apiInfoUrl.toString(), ["key"]),
    options: { headers: { Accept: "application/json" } },
    requestMetadata: {
      note: "Low-cost key/account capability check; API key query parameter is redacted from cached metadata."
    },
    timeoutMs: 15_000
  });

  const searchUrl = new URL("https://api.shodan.io/shodan/host/search");
  searchUrl.searchParams.set("key", apiKey);
  searchUrl.searchParams.set("query", "AIS");
  searchUrl.searchParams.set("facets", "country:20,port:20,org:20");
  searchUrl.searchParams.set("minify", "true");

  const search = await fetchJsonToFile({
    fileName: "shodan-maritime-ais.json",
    source: "SHODAN",
    url: searchUrl.toString(),
    safeUrl: redactUrl(searchUrl.toString(), ["key"]),
    options: { headers: { Accept: "application/json" } },
    requestMetadata: {
      query: "AIS",
      note: "Global AIS-related infrastructure search; API key query parameter is redacted from cached metadata."
    },
    timeoutMs: 20_000
  });

  return {
    source: "SHODAN",
    ok: apiInfo.ok || search.ok,
    detail: `api-info ${apiInfo.ok ? "ok" : "failed"}; AIS search ${search.ok ? "ok" : "blocked/failed"}.`,
    files: ["shodan-api-info.json", "shodan-maritime-ais.json"]
  };
}

async function cacheOpenSanctionsMaritimeEntities() {
  const apiKey = envOr("OPENSANCTIONS_API_KEY");
  if (!apiKey) {
    return { source: "OPENSANCTIONS", ok: false, detail: "OPENSANCTIONS_API_KEY missing; skipped." };
  }

  const queries = [
    "IRISL",
    "Islamic Republic of Iran Shipping Lines",
    "National Iranian Tanker Company",
    "Iranian oil tanker"
  ];
  const responses = [];

  for (const query of queries) {
    const url = new URL("https://api.opensanctions.org/search/default");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");
    url.searchParams.set("schema", "Thing");

    const response = await fetchJson({
      source: "OPENSANCTIONS",
      url: url.toString(),
      options: {
        headers: {
          Authorization: `ApiKey ${apiKey}`,
          Accept: "application/json"
        }
      },
      timeoutMs: 15_000
    });

    responses.push({
      query,
      request: { url: url.toString(), method: "GET" },
      response: response.response,
      body: response.body,
      error: response.error
    });
  }

  await writeJson("opensanctions-hormuz-maritime-entities.json", {
    source: "OPENSANCTIONS",
    generated_at: generatedAt,
    request: {
      queries,
      note: "API key is sent in Authorization header and is not cached."
    },
    responses
  });

  const okCount = responses.filter((response) => response.response?.ok).length;
  return {
    source: "OPENSANCTIONS",
    ok: okCount > 0,
    detail: `${okCount}/${queries.length} entity searches cached.`,
    fileName: "opensanctions-hormuz-maritime-entities.json"
  };
}

async function cacheCopernicusCdseAuth() {
  const username = envOr("COPERNICUS_CDSE_USERNAME");
  const password = envOr("COPERNICUS_CDSE_PASSWORD");
  const clientId = envOr("COPERNICUS_CDSE_CLIENT_ID", "cdse-public");
  const tokenUrl = envOr(
    "COPERNICUS_TOKEN_URL",
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
  );

  if (!username || !password) {
    return { source: "COPERNICUS_CDSE_AUTH", ok: false, detail: "COPERNICUS_CDSE_USERNAME or COPERNICUS_CDSE_PASSWORD missing; skipped." };
  }

  const response = await fetchJson({
    source: "COPERNICUS_CDSE_AUTH",
    url: tokenUrl,
    options: {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: clientId,
        username,
        password
      }).toString()
    },
    timeoutMs: 20_000
  });

  const sanitizedBody = sanitizeAuthBody(response.body);
  await writeJson("copernicus-cdse-auth.json", {
    source: "COPERNICUS_CDSE_AUTH",
    generated_at: generatedAt,
    request: {
      url: tokenUrl,
      method: "POST",
      metadata: { clientId, username_present: true, password_cached: false }
    },
    response: response.response,
    body: sanitizedBody,
    error: response.error
  });

  return {
    source: "COPERNICUS_CDSE_AUTH",
    ok: Boolean(response.response?.ok && response.body?.access_token),
    detail: `${response.response?.status ?? "failed"}; access_token ${response.body?.access_token ? "received" : "not received"}.`,
    fileName: "copernicus-cdse-auth.json"
  };
}

async function cacheCopernicusStacSearches() {
  const baseUrl = envOr("COPERNICUS_STAC_BASE_URL", "https://stac.dataspace.copernicus.eu/v1").replace(/\/$/, "");
  const searches = [
    ["copernicus-cdse-sentinel1-stac.json", "sentinel-1-grd", { "sar:instrument_mode": { eq: "IW" } }],
    ["copernicus-cdse-sentinel2-stac.json", "sentinel-2-l2a", { "eo:cloud_cover": { lt: 70 } }]
  ];
  const sourceResults = [];

  for (const [fileName, collection, query] of searches) {
    const body = {
      collections: [collection],
      bbox: HORMUZ.bbox,
      datetime: isoDateTimeRange,
      limit: 12,
      query,
      sortby: [{ field: "datetime", direction: "desc" }]
    };

    sourceResults.push(await fetchJsonToFile({
      fileName,
      source: "COPERNICUS_CDSE_STAC",
      url: `${baseUrl}/search`,
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/geo+json, application/json"
        },
        body: JSON.stringify(body)
      },
      requestMetadata: { collection, aoi: HORMUZ.name, datetime: isoDateTimeRange, query },
      timeoutMs: 20_000
    }));
  }

  const okCount = sourceResults.filter((result) => result.ok).length;
  return {
    source: "COPERNICUS_CDSE_STAC",
    ok: okCount > 0,
    detail: `${okCount}/${sourceResults.length} STAC searches cached.`,
    files: sourceResults.map((result) => result.fileName)
  };
}

async function cacheSentinelHubAuthAndChips() {
  const clientId = envOr("SENTINEL_HUB_CLIENT_ID");
  const clientSecret = envOr("SENTINEL_HUB_CLIENT_SECRET");
  const tokenUrl = envOr(
    "SENTINEL_HUB_TOKEN_URL",
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
  );
  const baseUrl = envOr("SENTINEL_HUB_BASE_URL", "https://sh.dataspace.copernicus.eu").replace(/\/$/, "");

  if (!clientId || !clientSecret) {
    return { source: "SENTINEL_HUB", ok: false, detail: "SENTINEL_HUB_CLIENT_ID or SENTINEL_HUB_CLIENT_SECRET missing; skipped." };
  }

  const auth = await getSentinelHubToken({ clientId, clientSecret, tokenUrl });
  await writeJson("sentinelhub-auth.json", {
    source: "SENTINEL_HUB_AUTH",
    generated_at: generatedAt,
    request: {
      url: tokenUrl,
      method: "POST",
      metadata: { client_id_present: true, client_secret_cached: false }
    },
    response: auth.response,
    body: sanitizeAuthBody(auth.body),
    error: auth.error
  });

  if (!auth.response?.ok || !auth.body?.access_token) {
    return {
      source: "SENTINEL_HUB",
      ok: false,
      detail: `${auth.response?.status ?? "failed"} auth; chip fetch skipped.`,
      fileName: "sentinelhub-auth.json"
    };
  }

  const chipResults = [];
  chipResults.push(await cacheSentinelHubChip({
    baseUrl,
    token: auth.body.access_token,
    fileName: "sentinelhub-hormuz-sentinel2-truecolor.png",
    metadataFileName: "sentinelhub-hormuz-sentinel2-truecolor.metadata.json",
    dataType: "sentinel-2-l2a",
    evalscript: `//VERSION=3
function setup() {
  return { input: ["B04", "B03", "B02", "dataMask"], output: { bands: 4 } };
}
function evaluatePixel(sample) {
  return [2.5 * sample.B04, 2.5 * sample.B03, 2.5 * sample.B02, sample.dataMask];
}`,
    timeRange: { from: startDate.toISOString(), to: endDate.toISOString() },
    outputFormat: "image/png"
  }));
  chipResults.push(await cacheSentinelHubChip({
    baseUrl,
    token: auth.body.access_token,
    fileName: "sentinelhub-hormuz-sentinel1-vv.png",
    metadataFileName: "sentinelhub-hormuz-sentinel1-vv.metadata.json",
    dataType: "sentinel-1-grd",
    evalscript: `//VERSION=3
function setup() {
  return { input: ["VV", "dataMask"], output: { bands: 2 } };
}
function evaluatePixel(sample) {
  const value = Math.max(0, Math.min(1, 0.25 + Math.log(sample.VV + 0.0001) / 5));
  return [value, sample.dataMask];
}`,
    timeRange: { from: startDate.toISOString(), to: endDate.toISOString() },
    outputFormat: "image/png"
  }));

  const okCount = chipResults.filter((result) => result.ok).length;
  return {
    source: "SENTINEL_HUB",
    ok: okCount > 0,
    detail: `auth ok; ${okCount}/${chipResults.length} imagery chips cached.`,
    files: ["sentinelhub-auth.json", ...chipResults.map((result) => result.fileName)]
  };
}

async function cacheCopernicusMarineCredentialCheck() {
  const username = envOr("COPERNICUS_MARINE_USERNAME");
  const password = envOr("COPERNICUS_MARINE_PASSWORD");
  if (!username || !password) {
    return { source: "COPERNICUS_MARINE", ok: false, detail: "COPERNICUS_MARINE_USERNAME or COPERNICUS_MARINE_PASSWORD missing; skipped." };
  }

  const command = copernicusMarineCommand();
  const env = {
    ...process.env,
    COPERNICUSMARINE_SERVICE_USERNAME: username,
    COPERNICUSMARINE_SERVICE_PASSWORD: password
  };
  const result = await runCommand(command, ["login", "--check-credentials-valid", "--log-level", "QUIET"], {
    timeoutMs: 20_000,
    env,
    redact: [username, password]
  });

  await writeJson("copernicus-marine-credential-check.json", {
    source: "COPERNICUS_MARINE",
    generated_at: generatedAt,
    request: {
      command: `${command} login --check-credentials-valid --log-level QUIET`,
      credentials_cached: false
    },
    response: {
      ok: result.ok,
      exitCode: result.exitCode,
      signal: result.signal
    },
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error
  });

  if (!result.ok) {
    return {
      source: "COPERNICUS_MARINE",
      ok: false,
      detail: `credential check not completed: ${result.error || `exit ${result.exitCode ?? "unknown"}`}`,
      fileName: "copernicus-marine-credential-check.json"
    };
  }

  const sample = await cacheCopernicusMarineCurrentsSample({ command, env, redact: [username, password] });

  return {
    source: "COPERNICUS_MARINE",
    ok: sample.ok,
    detail: sample.ok ? `credential check passed; ${sample.detail}` : `credential check passed; ${sample.detail}`,
    files: ["copernicus-marine-credential-check.json", sample.fileName]
  };
}

async function cacheCopernicusMarineCurrentsSample({ command, env, redact }) {
  const outputFileName = "copernicus-marine-hormuz-currents.nc";
  const metadataFileName = "copernicus-marine-hormuz-currents.metadata.json";
  const start = new Date(endDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const end = endDate.toISOString();
  await rm(new URL(outputFileName, outputDir), { force: true });

  const args = [
    "subset",
    "--dataset-id", "cmems_mod_glo_phy-cur_anfc_0.083deg_PT6H-i",
    "--variable", "uo",
    "--variable", "vo",
    "--minimum-longitude", "56.0",
    "--maximum-longitude", "56.2",
    "--minimum-latitude", "26.0",
    "--maximum-latitude", "26.2",
    "--minimum-depth", "0",
    "--maximum-depth", "1",
    "--start-datetime", start,
    "--end-datetime", end,
    "--output-directory", outputDir.pathname,
    "--output-filename", outputFileName,
    "--file-format", "netcdf",
    "--overwrite",
    "--disable-progress-bar",
    "--log-level", "QUIET",
    "--response-fields", "all"
  ];

  const result = await runCommand(command, args, {
    timeoutMs: 120_000,
    env,
    redact
  });

  let fileSize = 0;
  try {
    fileSize = (await stat(new URL(outputFileName, outputDir))).size;
  } catch {
    fileSize = 0;
  }

  await writeJson(metadataFileName, {
    source: "COPERNICUS_MARINE",
    generated_at: generatedAt,
    request: {
      command: `${command} subset`,
      dataset_id: "cmems_mod_glo_phy-cur_anfc_0.083deg_PT6H-i",
      variables: ["uo", "vo"],
      bbox: [56.0, 26.0, 56.2, 26.2],
      depth_range_m: [0, 1],
      time_range: [start, end],
      credentials_cached: false
    },
    response: {
      ok: result.ok && fileSize > 0,
      exitCode: result.exitCode,
      signal: result.signal,
      fileName: fileSize > 0 ? outputFileName : null,
      bytes: fileSize
    },
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.error
  });

  return {
    ok: result.ok && fileSize > 0,
    detail: fileSize > 0
      ? `currents sample cached (${fileSize} bytes).`
      : `currents sample not cached: ${result.error || result.stderr || `exit ${result.exitCode ?? "unknown"}`}`,
    fileName: metadataFileName
  };
}

async function cachePublicHtml(fileName, source, url) {
  const errorFileName = fileName.replace(/\.html$/, ".error.json");
  try {
    const response = await fetchWithTimeout(url, { headers: { "User-Agent": "SeaForge hackathon cache/0.1" } }, 15_000);
    const text = await response.text();
    await writeFile(new URL(fileName, outputDir), text);
    await rm(new URL(errorFileName, outputDir), { force: true });
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
    await writeJson(errorFileName, {
      source,
      generated_at: generatedAt,
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    return { source, ok: false, detail: `failed: ${error instanceof Error ? error.message : String(error)}`, fileName };
  }
}

async function cacheOverpassMaritimeContext() {
  const primaryUrl = envOr("OVERPASS_API_URL", "https://overpass-api.de/api/interpreter");
  const urls = Array.from(new Set([
    primaryUrl,
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter"
  ]));
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

  const attempts = [];
  for (const url of urls) {
    const result = await fetchJsonToFile({
      fileName: "overpass-hormuz-maritime.json",
      source: "OVERPASS",
      url,
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "SeaForge hackathon cache/0.1"
        },
        body: new URLSearchParams({ data: query }).toString()
      },
      requestMetadata: { aoi: HORMUZ.name, bbox: HORMUZ.bbox, endpoint: url },
      timeoutMs: 25_000
    });
    attempts.push({ url, ok: result.ok, detail: result.detail });
    if (result.ok) {
      await writeJson("overpass-hormuz-maritime.attempts.json", {
        source: "OVERPASS",
        generated_at: generatedAt,
        attempts
      });
      return result;
    }
  }

  await writeJson("overpass-hormuz-maritime.attempts.json", {
    source: "OVERPASS",
    generated_at: generatedAt,
    attempts
  });
  return {
    source: "OVERPASS",
    ok: false,
    detail: attempts.map((attempt) => attempt.detail).join("; "),
    fileName: "overpass-hormuz-maritime.json"
  };
}

async function fetchJsonToFile({ fileName, source, url, safeUrl, options, requestMetadata, timeoutMs }) {
  try {
    const responsePayload = await fetchJson({ source, url, options, timeoutMs });

    const payload = {
      source,
      generated_at: generatedAt,
      request: {
        url: safeUrl ?? url,
        method: options?.method ?? "GET",
        metadata: requestMetadata
      },
      response: responsePayload.response,
      body: responsePayload.body,
      error: responsePayload.error
    };

    await writeJson(fileName, payload);
    return {
      source,
      ok: Boolean(responsePayload.response?.ok),
      detail: `${fileName}: ${responsePayload.response?.status ?? "failed"} ${responsePayload.response?.statusText ?? responsePayload.error ?? ""}`.trim(),
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

async function fetchJson({ source, url, options = {}, timeoutMs = 15_000 }) {
  try {
    const response = await fetchWithTimeout(url, options, timeoutMs);
    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw_text: truncate(text, 100_000) };
    }

    return {
      source,
      response: {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        bytes: text.length
      },
      body
    };
  } catch (error) {
    return {
      source,
      response: { ok: false },
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function writeJson(fileName, value) {
  await writeFile(new URL(fileName, outputDir), `${JSON.stringify(value, null, 2)}\n`);
}

async function getSentinelHubToken({ clientId, clientSecret, tokenUrl }) {
  return fetchJson({
    source: "SENTINEL_HUB_AUTH",
    url: tokenUrl,
    options: {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret
      }).toString()
    },
    timeoutMs: 20_000
  });
}

async function cacheSentinelHubChip({
  baseUrl,
  token,
  fileName,
  metadataFileName,
  dataType,
  evalscript,
  timeRange,
  outputFormat
}) {
  const url = `${baseUrl}/api/v1/process`;
  const body = {
    input: {
      bounds: {
        bbox: HORMUZ.bbox,
        properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" }
      },
      data: [{
        type: dataType,
        dataFilter: {
          timeRange,
          mosaickingOrder: "mostRecent"
        }
      }]
    },
    output: {
      width: 512,
      height: 512,
      responses: [{ identifier: "default", format: { type: outputFormat } }]
    },
    evalscript
  };

  try {
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: outputFormat
      },
      body: JSON.stringify(body)
    }, 30_000);
    const contentType = response.headers.get("content-type") ?? "";
    const bytes = Buffer.from(await response.arrayBuffer());
    const okImage = response.ok && contentType.startsWith("image/");

    if (okImage) {
      await writeFile(new URL(fileName, outputDir), bytes);
    } else {
      await writeJson(fileName.replace(/\.[^.]+$/, ".error.json"), {
        source: "SENTINEL_HUB_PROCESS",
        generated_at: generatedAt,
        request: { url, method: "POST", metadata: { dataType, aoi: HORMUZ.name, token_cached: false } },
        response: {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          contentType,
          bytes: bytes.length
        },
        body: truncate(bytes.toString("utf8"), 10_000)
      });
    }

    await writeJson(metadataFileName, {
      source: "SENTINEL_HUB_PROCESS",
      generated_at: generatedAt,
      request: {
        url,
        method: "POST",
        metadata: {
          dataType,
          aoi: HORMUZ.name,
          bbox: HORMUZ.bbox,
          timeRange,
          outputFormat,
          token_cached: false
        }
      },
      response: {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType,
        bytes: bytes.length
      },
      fileName: okImage ? fileName : null
    });

    return {
      ok: okImage,
      fileName: okImage ? fileName : metadataFileName,
      detail: `${dataType}: ${response.status} ${response.statusText}`
    };
  } catch (error) {
    await writeJson(metadataFileName, {
      source: "SENTINEL_HUB_PROCESS",
      generated_at: generatedAt,
      request: { url, method: "POST", metadata: { dataType, aoi: HORMUZ.name, token_cached: false } },
      response: { ok: false },
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      ok: false,
      fileName: metadataFileName,
      detail: `${dataType}: failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function runCommand(command, args, { timeoutMs, env, redact = [] }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { env });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ...result,
        stdout: redactSecrets(truncate(stdout, 20_000), redact),
        stderr: redactSecrets(truncate(stderr, 20_000), redact)
      });
    };

    const timer = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {
        // Ignore kill races.
      }
      finish({ ok: false, signal: "TIMEOUT", error: `timeout after ${timeoutMs}ms` });
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      finish({ ok: false, error: error.code === "ENOENT" ? `${command} not installed` : error.message });
    });
    child.on("close", (exitCode, signal) => {
      finish({ ok: exitCode === 0, exitCode, signal });
    });
  });
}

function sanitizeAuthBody(body) {
  if (!body || typeof body !== "object") return body;
  const sanitized = { ...body };
  for (const key of ["access_token", "refresh_token", "id_token"]) {
    if (typeof sanitized[key] === "string" && sanitized[key].length > 0) {
      sanitized[`has_${key}`] = true;
      delete sanitized[key];
    }
  }
  return sanitized;
}

function copernicusMarineCommand() {
  const localCli = new URL("../.venv-copernicus/bin/copernicusmarine", import.meta.url).pathname;
  return existsSync(localCli) ? localCli : "copernicusmarine";
}

function parseCacheProfile(args) {
  const profileArg = args.find((arg) => arg.startsWith("--profile="));
  const profile = profileArg?.split("=")[1] || envOr("SEAFORGE_CACHE_PROFILE", "all");
  if (profile === "all" || profile === "fast" || profile === "slow" || profile === "danti") {
    return profile;
  }
  throw new Error(`Unsupported cache profile '${profile}'. Use all, fast, slow, or danti.`);
}

function redactUrl(rawUrl, queryParams) {
  const url = new URL(rawUrl);
  for (const param of queryParams) {
    if (url.searchParams.has(param)) {
      url.searchParams.set(param, "<redacted>");
    }
  }
  return url.toString();
}

function redactSecrets(text, secrets) {
  return secrets.reduce((current, secret) => {
    if (!secret) return current;
    return current.split(secret).join("<redacted>");
  }, text);
}

function truncate(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...<truncated>` : text;
}

function limitJson(value, { maxDepth = 5, maxArrayLength = 20, maxStringLength = 2_000 } = {}) {
  const seen = new WeakSet();
  const limit = (current, depth) => {
    if (typeof current === "string") return truncate(current, maxStringLength);
    if (!current || typeof current !== "object") return current;
    if (seen.has(current)) return "<circular>";
    if (depth >= maxDepth) return Array.isArray(current) ? `[array length ${current.length}]` : "[object]";
    seen.add(current);

    if (Array.isArray(current)) {
      const values = current.slice(0, maxArrayLength).map((item) => limit(item, depth + 1));
      if (current.length > maxArrayLength) {
        values.push(`...<${current.length - maxArrayLength} more>`);
      }
      return values;
    }

    return Object.fromEntries(
      Object.entries(current).map(([key, item]) => [key, limit(item, depth + 1)])
    );
  };
  return limit(value, 0);
}

function envOr(key, fallback = "") {
  return process.env[key]?.trim() || fallback;
}
