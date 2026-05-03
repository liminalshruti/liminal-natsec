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
const acledAuthAttempts = [];

await mkdir(outputDir, { recursive: true });

const results = [];
if (cacheProfile === "all" || cacheProfile === "fast") {
  results.push(await cacheFoundryConnection());
  results.push(await cacheGlobalFishingWatchVesselCapability());
  results.push(await cacheAcledHormuzEvents());
  results.push(await cacheExaHormuzOsint());
  results.push(await cacheShodanMaritimeIntel());
  results.push(await cacheCensysMaritimeInfrastructure());
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

if (cacheProfile === "acled") {
  results.push(await cacheAcledHormuzEvents());
}

if (cacheProfile === "fallbacks") {
  results.push(await cacheSyntheticMissingSourceFallbacks());
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

    const result = await fetchJsonToFile({
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
    });

    sourceResults.push(
      result.ok ? result : await writeSyntheticGfwEventFeed(fileName, dataset, types)
    );
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

async function cacheAcledHormuzEvents() {
  const auth = await getAcledAccessToken();
  const token = auth.token;
  const baseUrl = envOr("ACLED_READ_URL", "https://acleddata.com/api/acled/read");
  const url = new URL(baseUrl);
  url.searchParams.set("limit", envOr("ACLED_QUERY_LIMIT", "10"));
  url.searchParams.set("country", envOr("ACLED_COUNTRY", "Iran"));

  if (!token) {
    return writeSyntheticAcledEvents(auth.detail);
  }

  const response = await fetchJson({
    source: "ACLED",
    url: url.toString(),
    options: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    },
    timeoutMs: 20_000
  });

  await writeJson("acled-hormuz-events.json", {
    source: "ACLED",
    generated_at: generatedAt,
    request: {
      url: url.toString(),
      method: "GET",
    metadata: {
      country: url.searchParams.get("country"),
      limit: url.searchParams.get("limit"),
      auth_source: auth.source,
      token_cached: false
    }
    },
    response: response.response,
    body: response.body,
    error: response.error
  });

  if (!response.response?.ok) {
    return writeSyntheticAcledEvents(`live request ${response.response?.status ?? "failed"}`);
  }

  return {
    source: "ACLED",
    ok: true,
    detail: `acled-hormuz-events.json: ${response.response.status} ${response.response.statusText ?? "OK"}`,
    fileName: "acled-hormuz-events.json"
  };
}

async function getAcledAccessToken() {
  const username = envOr("ACLED_USERNAME");
  const password = envOr("ACLED_PASSWORD");
  const refreshToken = envOr("ACLED_REFRESH_TOKEN");
  const accessToken = envOr("ACLED_ACCESS_TOKEN");
  const tokenUrl = envOr("ACLED_TOKEN_URL", "https://acleddata.com/oauth/token");
  const clientId = envOr("ACLED_CLIENT_ID", "acled");

  if (username && password) {
    const auth = await fetchAcledToken({
      tokenUrl,
      clientId,
      body: {
        username,
        password,
        grant_type: "password"
      },
      source: "username_password"
    });
    if (auth.token) return auth;
  }

  if (refreshToken) {
    const auth = await fetchAcledToken({
      tokenUrl,
      clientId,
      body: {
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      },
      source: "refresh_token"
    });
    if (auth.token) return auth;
  }

  if (accessToken) {
    return {
      token: accessToken,
      source: "access_token",
      detail: "using configured ACLED_ACCESS_TOKEN"
    };
  }

  return {
    token: "",
    source: "missing",
    detail: "ACLED_USERNAME/ACLED_PASSWORD or ACLED_ACCESS_TOKEN missing"
  };
}

async function fetchAcledToken({ tokenUrl, clientId, body, source }) {
  const form = new URLSearchParams({ ...body, client_id: clientId });
  try {
    const response = await fetchWithTimeout(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      body: form
    }, 20_000);
    const text = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw_text: truncate(text, 10_000) };
    }

    const token = typeof parsed.access_token === "string" ? parsed.access_token : "";
    await writeAcledAuthAttempt({
      tokenUrl,
      clientId,
      source,
      response: {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type"),
        bytes: text.length
      },
      body: {
        token_type: typeof parsed.token_type === "string" ? parsed.token_type : null,
        expires_in: Number.isFinite(parsed.expires_in) ? parsed.expires_in : null,
        access_token_received: Boolean(parsed.access_token),
        refresh_token_received: Boolean(parsed.refresh_token),
        error: typeof parsed.error === "string" ? parsed.error : null,
        error_description:
          typeof parsed.error_description === "string"
            ? truncate(parsed.error_description, 300)
            : null
      }
    });

    return {
      token,
      source,
      detail: token
        ? `ACLED OAuth ${source} succeeded`
        : `ACLED OAuth ${source} failed with ${response.status} ${response.statusText}`
    };
  } catch (error) {
    await writeAcledAuthAttempt({
      tokenUrl,
      clientId,
      source,
      response: { ok: false },
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      token: "",
      source,
      detail: `ACLED OAuth ${source} failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function writeAcledAuthAttempt({ tokenUrl, clientId, source, response, body, error }) {
  acledAuthAttempts.push({
    request: {
      url: tokenUrl,
      method: "POST",
      metadata: {
        auth_source: source,
        client_id: clientId,
        credentials_cached: false
      }
    },
    response,
    body,
    error
  });

  await writeJson("acled-auth.json", {
    source: "ACLED_AUTH",
    generated_at: generatedAt,
    attempts: acledAuthAttempts
  });
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

async function cacheSyntheticMissingSourceFallbacks() {
  const results = [];
  results.push(await writeSyntheticGfwEventFeed("gfw-hormuz-gaps.json", "public-global-gaps-events:latest", ["GAP"]));
  results.push(await writeSyntheticGfwEventFeed("gfw-hormuz-loitering.json", "public-global-loitering-events:latest", ["LOITERING"]));
  results.push(await writeSyntheticGfwEventFeed("gfw-hormuz-port-visits.json", "public-global-port-visits-events:latest", ["PORT_VISIT"]));
  await writeJson("aisstream-hormuz-sample.json", syntheticAisstreamSample());
  results.push({ source: "AISSTREAM", ok: true, detail: "AISstream fixture fallback written.", fileName: "aisstream-hormuz-sample.json" });
  results.push(await writeSyntheticCopernicusMarineCurrents({
    metadataFileName: "copernicus-marine-hormuz-currents.metadata.json",
    start: startDate.toISOString(),
    end: endDate.toISOString()
  }));
  results.push(await writeSyntheticShodanMaritimeSearch());
  results.push(await writeSyntheticAcledEvents("fallback profile"));

  return {
    source: "SYNTHETIC_FALLBACKS",
    ok: results.every((result) => result.ok),
    detail: `${results.filter((result) => result.ok).length}/${results.length} fallback cache files written.`,
    files: results.map((result) => result.fileName).filter(Boolean)
  };
}

async function writeSyntheticGfwEventFeed(fileName, dataset, types) {
  const type = types[0] ?? "EVENT";
  const entriesByType = {
    GAP: [
      {
        id: "fixture:gfw:gap:alara-01:001",
        type: "GAP",
        start: new Date(startDate.getTime() + 8 * 60 * 60 * 1000).toISOString(),
        end: new Date(startDate.getTime() + 8.7 * 60 * 60 * 1000).toISOString(),
        position: { lat: 26.18, lon: 56.42 },
        vessel: { ssvid: "422120900", name: "ALARA", flag: "IRN", type: "TANKER" },
        distanceFromShoreKm: 22.4,
        durationHours: 0.7
      },
      {
        id: "fixture:gfw:gap:gulf-trader:001",
        type: "GAP",
        start: new Date(startDate.getTime() + 14 * 60 * 60 * 1000).toISOString(),
        end: new Date(startDate.getTime() + 15.1 * 60 * 60 * 1000).toISOString(),
        position: { lat: 25.98, lon: 56.71 },
        vessel: { ssvid: "636021118", name: "GULF TRADER", flag: "LBR", type: "CARGO" },
        distanceFromShoreKm: 35.8,
        durationHours: 1.1
      }
    ],
    LOITERING: [
      {
        id: "fixture:gfw:loitering:anchorage:001",
        type: "LOITERING",
        start: new Date(startDate.getTime() + 10 * 60 * 60 * 1000).toISOString(),
        end: new Date(startDate.getTime() + 13.5 * 60 * 60 * 1000).toISOString(),
        position: { lat: 26.08, lon: 56.18 },
        vessel: { ssvid: "538009876", name: "BANDAR SUPPLY", flag: "MHL", type: "SUPPORT" },
        totalDistanceKm: 6.2,
        durationHours: 3.5
      }
    ],
    PORT_VISIT: [
      {
        id: "fixture:gfw:port-visit:bandar-abbas:001",
        type: "PORT_VISIT",
        start: new Date(startDate.getTime() + 3 * 60 * 60 * 1000).toISOString(),
        end: new Date(startDate.getTime() + 21 * 60 * 60 * 1000).toISOString(),
        port: { id: "fixture:port:bandar-abbas", name: "Bandar Abbas", country: "IRN" },
        position: { lat: 27.14, lon: 56.22 },
        vessel: { ssvid: "422120900", name: "ALARA", flag: "IRN", type: "TANKER" },
        durationHours: 18
      }
    ]
  };
  const entries = entriesByType[type] ?? [];

  await writeJson(fileName, {
    source: "GLOBAL_FISHING_WATCH",
    generated_at: generatedAt,
    fixture_mode: true,
    fixture_reason: "Live GFW event feed was unavailable or empty; synthetic entries preserve v3 event-cache shape for offline demo use.",
    request: {
      url: "https://gateway.api.globalfishingwatch.org/v3/events?limit=10&offset=0",
      method: "POST",
      metadata: { dataset, types, aoi: HORMUZ.name, fixture_fallback: true }
    },
    response: {
      ok: true,
      status: 200,
      statusText: "Fixture Fallback",
      contentType: "application/json",
      bytes: JSON.stringify(entries).length
    },
    body: {
      metadata: {
        dataset,
        types,
        query: "fixture fallback",
        limit: 10,
        offset: 0,
        total: entries.length
      },
      entries
    }
  });

  return {
    source: "GLOBAL_FISHING_WATCH_EVENTS",
    ok: true,
    detail: `${fileName}: fixture fallback with ${entries.length} ${type} entries.`,
    fileName
  };
}

async function writeSyntheticShodanMaritimeSearch() {
  const matches = [
    {
      ip_str: "203.0.113.44",
      port: 80,
      hostnames: ["ais-gateway.fixture.invalid"],
      org: "Fixture Maritime Network",
      isp: "Fixture ISP",
      transport: "tcp",
      timestamp: new Date(startDate.getTime() + 6 * 60 * 60 * 1000).toISOString(),
      location: {
        country_name: "Oman",
        country_code: "OM",
        city: "Muscat",
        latitude: 23.588,
        longitude: 58.3829
      },
      product: "AIS receiver web status",
      data: "HTTP/1.1 200 OK\\nServer: ais-receiver-fixture\\nService banner references NMEA/AIS TCP forwarding."
    },
    {
      ip_str: "198.51.100.72",
      port: 8080,
      hostnames: ["vts-dashboard.fixture.invalid"],
      org: "Fixture Port Services",
      isp: "Fixture ISP",
      transport: "tcp",
      timestamp: new Date(startDate.getTime() + 7 * 60 * 60 * 1000).toISOString(),
      location: {
        country_name: "United Arab Emirates",
        country_code: "AE",
        city: "Fujairah",
        latitude: 25.1288,
        longitude: 56.3265
      },
      product: "VTS dashboard",
      data: "HTTP/1.1 401 Unauthorized\\nTitle: Vessel Traffic Service Console"
    }
  ];

  await writeJson("shodan-maritime-ais.json", {
    source: "SHODAN",
    generated_at: generatedAt,
    fixture_mode: true,
    fixture_reason: "Live Shodan AIS search returned 403; synthetic response preserves host-search shape for infrastructure-only demo use.",
    request: {
      url: "https://api.shodan.io/shodan/host/search?query=AIS&facets=country%3A20%2Cport%3A20%2Corg%3A20&minify=true",
      method: "GET",
      metadata: {
        query: "AIS",
        note: "Fixture fallback; no API key cached.",
        fixture_fallback: true
      }
    },
    response: {
      ok: true,
      status: 200,
      statusText: "Fixture Fallback",
      contentType: "application/json",
      bytes: JSON.stringify(matches).length
    },
    body: {
      total: matches.length,
      matches,
      facets: {
        country: [
          { value: "OM", count: 1 },
          { value: "AE", count: 1 }
        ],
        port: [
          { value: 80, count: 1 },
          { value: 8080, count: 1 }
        ]
      }
    }
  });

  return {
    source: "SHODAN",
    ok: true,
    detail: "shodan-maritime-ais.json: fixture fallback with 2 infrastructure matches.",
    fileName: "shodan-maritime-ais.json"
  };
}

async function writeSyntheticCensysMaritimeInfrastructure(reason) {
  const hits = [
    {
      host: {
        ip: "203.0.113.104",
        location: {
          country: "Oman",
          city: "Muscat"
        },
        autonomous_system: {
          name: "Fixture Maritime Network"
        },
        services: [
          {
            port: 10110,
            protocol: "TCP",
            transport_protocol: "TCP",
            banner: "Fixture NMEA/AIS TCP forwarding endpoint. Infrastructure-only demo record."
          }
        ]
      },
      matched_services: [
        {
          port: 10110,
          protocol: "TCP",
          transport_protocol: "TCP"
        }
      ]
    },
    {
      host: {
        ip: "198.51.100.118",
        location: {
          country: "United Arab Emirates",
          city: "Fujairah"
        },
        autonomous_system: {
          name: "Fixture Port Services"
        },
        services: [
          {
            port: 4001,
            protocol: "TCP",
            transport_protocol: "TCP",
            banner: "Fixture vessel traffic service status endpoint. Infrastructure-only demo record."
          }
        ]
      },
      matched_services: [
        {
          port: 4001,
          protocol: "TCP",
          transport_protocol: "TCP"
        }
      ]
    }
  ];

  await writeJson("censys-maritime-infrastructure.json", {
    source: "CENSYS",
    generated_at: generatedAt,
    fixture_mode: true,
    fixture_reason: `Live Censys Platform search unavailable (${reason}); synthetic rows preserve Platform global search shape for infrastructure-only demo use.`,
    request: {
      url: "https://api.platform.censys.io/v3/global/search/query",
      method: "POST",
      metadata: {
        query: "host.services.port=10110 or host.services.port=10111 or host.services.port=4001 or host.services.port=4002 or banner: AIS or banner: NMEA",
        evidence_type: "INFRASTRUCTURE_CONTEXT_ONLY",
        token_cached: false,
        fixture_fallback: true
      }
    },
    response: {
      ok: true,
      status: 200,
      statusText: "Fixture Fallback",
      contentType: "application/json",
      bytes: JSON.stringify(hits).length
    },
    body: {
      result: {
        total: hits.length,
        hits
      }
    }
  });

  return {
    source: "CENSYS",
    ok: true,
    detail: "censys-maritime-infrastructure.json: fixture fallback with 2 infrastructure matches.",
    fileName: "censys-maritime-infrastructure.json"
  };
}

async function writeSyntheticCopernicusMarineCurrents({ metadataFileName, start, end, result }) {
  const samples = [
    { latitude: 26.0, longitude: 56.0, depth_m: 0.5, uo_mps: 0.21, vo_mps: -0.08 },
    { latitude: 26.1, longitude: 56.1, depth_m: 0.5, uo_mps: 0.18, vo_mps: -0.05 },
    { latitude: 26.2, longitude: 56.2, depth_m: 0.5, uo_mps: 0.16, vo_mps: -0.03 }
  ];
  await writeJson(metadataFileName, {
    source: "COPERNICUS_MARINE",
    generated_at: generatedAt,
    fixture_mode: true,
    fixture_reason: "Copernicus Marine credentials were valid but subset output was unavailable; synthetic current vectors preserve the requested metadata/sample shape.",
    request: {
      command: `${copernicusMarineCommand()} subset`,
      dataset_id: "cmems_mod_glo_phy-cur_anfc_0.083deg_PT6H-i",
      variables: ["uo", "vo"],
      bbox: [56.0, 26.0, 56.2, 26.2],
      depth_range_m: [0, 1],
      time_range: [start, end],
      credentials_cached: false,
      fixture_fallback: true
    },
    response: {
      ok: true,
      status: 200,
      statusText: "Fixture Fallback",
      fileName: null,
      bytes: JSON.stringify(samples).length,
      original_exitCode: result?.exitCode,
      original_signal: result?.signal
    },
    body: {
      dataset_id: "cmems_mod_glo_phy-cur_anfc_0.083deg_PT6H-i",
      units: { uo: "m s-1", vo: "m s-1" },
      samples
    }
  });

  return {
    source: "COPERNICUS_MARINE",
    ok: true,
    detail: `${metadataFileName}: fixture fallback with ${samples.length} current vectors.`,
    fileName: metadataFileName
  };
}

async function writeSyntheticAcledEvents(reason) {
  const events = [
    acledEvent({
      id: "IRN-FIXTURE-20260502-001",
      date: new Date(startDate.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10),
      country: "Iran",
      admin1: "Hormozgan",
      location: "Bandar Abbas",
      latitude: 27.1832,
      longitude: 56.2666,
      eventType: "Strategic developments",
      subEventType: "Disrupted weapons use",
      actor1: "Military Forces of Iran (2024-)",
      notes: "Fixture event representing a coastal security disruption near the Strait of Hormuz; not a live ACLED assertion.",
      fatalities: 0
    }),
    acledEvent({
      id: "YEM-FIXTURE-20260502-001",
      date: new Date(startDate.getTime() + 18 * 60 * 60 * 1000).toISOString().slice(0, 10),
      country: "Yemen",
      admin1: "Al Hudaydah",
      location: "Red Sea coast",
      latitude: 14.7978,
      longitude: 42.9545,
      eventType: "Explosions/Remote violence",
      subEventType: "Shelling/artillery/missile attack",
      actor1: "Unidentified Armed Group (Yemen)",
      notes: "Fixture event representing regional maritime-threat context connected to Gulf shipping risk; not a live ACLED assertion.",
      fatalities: 0
    })
  ];

  await writeJson("acled-hormuz-events.json", {
    source: "ACLED",
    generated_at: generatedAt,
    fixture_mode: true,
    fixture_reason: `ACLED live read unavailable (${reason}); synthetic rows preserve ACLED read response shape for offline demo use.`,
    request: {
      url: "https://acleddata.com/api/acled/read?limit=10&country=Iran",
      method: "GET",
      metadata: { token_cached: false, fixture_fallback: true }
    },
    response: {
      ok: true,
      status: 200,
      statusText: "Fixture Fallback",
      contentType: "application/json",
      bytes: JSON.stringify(events).length
    },
    body: {
      status: 200,
      success: true,
      count: events.length,
      data: events
    }
  });

  return {
    source: "ACLED",
    ok: true,
    detail: `acled-hormuz-events.json: fixture fallback with ${events.length} events.`,
    fileName: "acled-hormuz-events.json"
  };
}

function acledEvent({ id, date, country, admin1, location, latitude, longitude, eventType, subEventType, actor1, notes, fatalities }) {
  return {
    event_id_cnty: id,
    event_date: date,
    year: String(new Date(date).getUTCFullYear()),
    time_precision: "1",
    disorder_type: eventType === "Strategic developments" ? "Strategic developments" : "Political violence",
    event_type: eventType,
    sub_event_type: subEventType,
    actor1,
    assoc_actor_1: "",
    inter1: "1",
    actor2: "",
    assoc_actor_2: "",
    inter2: "0",
    interaction: "10",
    civilian_targeting: "",
    iso: country === "Iran" ? "364" : "887",
    region: "Middle East",
    country,
    admin1,
    admin2: "",
    admin3: "",
    location,
    latitude: String(latitude),
    longitude: String(longitude),
    geo_precision: "1",
    source: "Fixture",
    source_scale: "Other",
    notes,
    fatalities: String(fatalities),
    tags: "fixture;offline-demo",
    timestamp: String(Math.floor(Date.parse(generatedAt) / 1000))
  };
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

  const payload = messages.length > 0
    ? {
        source: "AISSTREAM",
        generated_at: generatedAt,
        aoi: HORMUZ,
        fallback_aoi: REGIONAL_AIS_FALLBACK,
        message_count: messages.length,
        attempts,
        errors,
        messages
      }
    : syntheticAisstreamSample({ attempts, errors });

  await writeJson("aisstream-hormuz-sample.json", payload);

  return {
    source: "AISSTREAM",
    ok: payload.message_count > 0,
    detail: `${payload.message_count} AIS messages cached${payload.fixture_mode ? " (fixture fallback)" : ""}.`,
    fileName: "aisstream-hormuz-sample.json"
  };
}

function syntheticAisstreamSample({ attempts = [], errors = [] } = {}) {
  const messages = [
    aisstreamPosition({
      mmsi: 422120900,
      shipName: "ALARA",
      lat: 26.1841,
      lon: 56.2484,
      speed: 11.8,
      course: 91.4,
      heading: 92,
      timestamp: startDate.toISOString()
    }),
    aisstreamPosition({
      mmsi: 422120900,
      shipName: "ALARA",
      lat: 26.1818,
      lon: 56.3912,
      speed: 11.1,
      course: 94.2,
      heading: 94,
      timestamp: new Date(startDate.getTime() + 12 * 60 * 1000).toISOString()
    }),
    aisstreamPosition({
      mmsi: 636021118,
      shipName: "GULF TRADER",
      lat: 25.9344,
      lon: 56.683,
      speed: 8.4,
      course: 286.8,
      heading: 287,
      timestamp: new Date(startDate.getTime() + 18 * 60 * 1000).toISOString()
    })
  ];

  return {
    source: "AISSTREAM",
    generated_at: generatedAt,
    fixture_mode: true,
    fixture_reason: "Live AISstream WebSocket returned zero messages during bounded collection; synthetic messages preserve AISstream message shape for offline demo use.",
    aoi: HORMUZ,
    fallback_aoi: REGIONAL_AIS_FALLBACK,
    message_count: messages.length,
    attempts,
    errors,
    messages
  };
}

function aisstreamPosition({ mmsi, shipName, lat, lon, speed, course, heading, timestamp }) {
  return {
    MessageType: "PositionReport",
    MetaData: {
      MMSI: mmsi,
      MMSI_String: String(mmsi),
      ShipName: shipName,
      latitude: lat,
      longitude: lon,
      time_utc: timestamp
    },
    Message: {
      PositionReport: {
        MessageID: 1,
        UserID: mmsi,
        NavigationalStatus: 0,
        RateOfTurn: 0,
        Sog: speed,
        PositionAccuracy: true,
        Longitude: lon,
        Latitude: lat,
        Cog: course,
        TrueHeading: heading,
        Timestamp: Math.floor(Date.parse(timestamp) / 1000) % 60,
        ManeuverIndicator: 0,
        Raim: false,
        CommunicationState: 0
      }
    }
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

  const searchResult = search.ok ? search : await writeSyntheticShodanMaritimeSearch();

  return {
    source: "SHODAN",
    ok: apiInfo.ok || searchResult.ok,
    detail: `api-info ${apiInfo.ok ? "ok" : "failed"}; AIS search ${search.ok ? "ok" : "fixture fallback"}.`,
    files: ["shodan-api-info.json", "shodan-maritime-ais.json"]
  };
}

async function cacheCensysMaritimeInfrastructure() {
  const token = envOr("CENSYS_API_TOKEN");
  const baseUrl = envOr("CENSYS_BASE_URL", "https://api.platform.censys.io/v3").replace(/\/$/, "");
  const organizationId = envOr("CENSYS_ORGANIZATION_ID");
  if (!token) {
    return { source: "CENSYS", ok: false, detail: "CENSYS_API_TOKEN missing; skipped." };
  }
  if (!organizationId) {
    return writeSyntheticCensysMaritimeInfrastructure(
      "CENSYS_ORGANIZATION_ID missing; Censys free-plan Platform accounts have no organization ID and can only use Global Search through the Platform UI"
    );
  }

  const url = new URL(`${baseUrl}/global/search/query`);
  url.searchParams.set("organization_id", organizationId);

  const query = [
    "host.services.port=10110",
    "host.services.port=10111",
    "host.services.port=4001",
    "host.services.port=4002",
    'banner: "AIS"',
    'banner: "NMEA"'
  ].join(" or ");

  const search = await fetchJsonToFile({
    fileName: "censys-maritime-infrastructure.json",
    source: "CENSYS",
    url: url.toString(),
    options: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        query,
        page_size: 10,
        fields: [
          "host.ip",
          "host.location.country",
          "host.location.city",
          "host.autonomous_system.name",
          "host.services.port",
          "host.services.protocol",
          "host.services.transport_protocol",
          "host.services.banner"
        ]
      })
    },
    requestMetadata: {
      query,
      evidence_type: "INFRASTRUCTURE_CONTEXT_ONLY",
      note: "Censys Platform PAT is sent as a Bearer token and is not cached. Results must not support vessel behavior, intent, or kinematics claims."
    },
    timeoutMs: 20_000
  });

  if (!search.ok) {
    return writeSyntheticCensysMaritimeInfrastructure(search.detail);
  }

  return search;
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

  if (!(result.ok && fileSize > 0)) {
    await writeSyntheticCopernicusMarineCurrents({ metadataFileName, start, end, result });
    return {
      ok: true,
      fileName: metadataFileName,
      detail: "currents sample cached as fixture fallback."
    };
  }

  return {
    ok: true,
    detail: `currents sample cached (${fileSize} bytes).`,
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
  if (
    profile === "all" ||
    profile === "fast" ||
    profile === "slow" ||
    profile === "danti" ||
    profile === "acled" ||
    profile === "fallbacks"
  ) {
    return profile;
  }
  throw new Error(`Unsupported cache profile '${profile}'. Use all, fast, slow, danti, acled, or fallbacks.`);
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
