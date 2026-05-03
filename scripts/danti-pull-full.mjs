import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { loadConfigIniIntoEnv } from "./load-config-ini.mjs";

loadConfigIniIntoEnv();

const args = parseArgs(process.argv.slice(2));
const SIZE = clampInt(args.size, 200, 1, 1000);

const outputDir = new URL("../fixtures/maritime/live-cache/", import.meta.url);
await mkdir(outputDir, { recursive: true });

const baseUrl = envOr("DANTI_BASE_URL", "https://ipa.gov.danti.ai").replace(/\/$/, "");
const apiKey = envOr("DANTI_API_KEY");
const username = envOr("DANTI_USERNAME");
const password = envOr("DANTI_PASSWORD");
const authBaseUrl = envOr("DANTI_AUTH_BASE_URL", "https://auth.gov.danti.ai/realms/gov").replace(/\/$/, "");
const appUrl = envOr("DANTI_APP_URL", "https://gov.danti.ai").replace(/\/$/, "");
const clientId = envOr("DANTI_CLIENT_ID", "bastet");
const scope = envOr("DANTI_SCOPE", "openid email roles");
const baseQuery = envOr("DANTI_QUERY", "Strait of Hormuz maritime security AIS dark gaps shipping traffic Iran Oman UAE");

if (!apiKey && (!username || !password)) {
  console.error("DANTI credentials missing in config.ini");
  process.exit(1);
}

console.log(`size=${SIZE} auth=${apiKey ? "static_bearer" : "oidc"}`);

const auth = apiKey
  ? { ok: true, token: apiKey, mode: "static_bearer" }
  : await getDantiOidcToken({ username, password, authBaseUrl, appUrl, clientId, scope });

if (!auth.ok || !auth.token) {
  console.error("Auth failed:", auth.error || "unknown");
  process.exit(2);
}
console.log("auth ok");

const probe = await runQuery({
  token: auth.token,
  size: SIZE,
  body: { query: baseQuery, filters: [] },
  label: "probe-no-filter"
});
const probeFile = `danti-hormuz-all-size-${SIZE}.json`;
await writeFullJson(probeFile, probe);
console.log(`written ${probeFile}`);
console.log("buckets:", JSON.stringify(bucketSummary(probe.body), null, 2));

const candidateFilters = [
  [{ field: "category", op: "eq", value: "SHIP" }],
  [{ field: "category", op: "in", value: ["SHIP"] }],
  [{ category: "SHIP" }],
  [{ type: "category", value: "SHIP" }],
  [{ name: "category", value: "SHIP" }],
  [{ field: "categories", op: "in", value: ["SHIP"] }]
];

let best = { count: 0, filter: null, response: null };
for (const filter of candidateFilters) {
  const res = await runQuery({
    token: auth.token,
    size: SIZE,
    body: { query: baseQuery, filters: filter },
    label: `filter ${JSON.stringify(filter)}`
  });
  const ship = (res.body?.resultDocuments || []).find((g) => g.category === "SHIP");
  const got = ship?.documents?.length || 0;
  console.log(`  -> SHIP returned=${got} total=${ship?.total?.value ?? 0}`);
  if (got > best.count) best = { count: got, filter, response: res };
}

const sortAttempts = [
  { sort: [{ field: "authoredOn", order: "desc" }] },
  { sort: "authoredOn:desc" },
  { sort: { authoredOn: "desc" } },
  { sortBy: "authoredOn", sortOrder: "desc" },
  { orderBy: "authoredOn", order: "desc" }
];
for (const sortFragment of sortAttempts) {
  const res = await runQuery({
    token: auth.token,
    size: SIZE,
    body: { query: baseQuery, filters: best.filter || [], ...sortFragment },
    label: `sort ${JSON.stringify(sortFragment)}`
  });
  const ship = (res.body?.resultDocuments || []).find((g) => g.category === "SHIP");
  const docs = ship?.documents || [];
  if (docs.length) {
    const tss = docs.map((d) => d.authoredOn).filter(Boolean).sort();
    console.log(`  -> got ${docs.length} SHIP, range ${tss[0]} … ${tss[tss.length - 1]}`);
    if (docs.length >= best.count) best = { count: docs.length, filter: best.filter, response: res };
  } else {
    console.log("  -> no SHIP rows");
  }
}

if (best.response) {
  const fname = `danti-hormuz-ship-best-size-${SIZE}.json`;
  await writeFullJson(fname, best.response);
  console.log(`SHIP best: count=${best.count} filter=${JSON.stringify(best.filter)} -> ${fname}`);
}

// Try the API-documented sort key: authorshipTime (per sortOptions in response).
console.log("\nattempting authorshipTime sort variants...");
for (const sortFragment of [
  { sort: "authorshipTime" },
  { sort: "authorshipTime:desc" },
  { sort: "authorshipTime:asc" },
  { sort: { authorshipTime: "desc" } },
  { sort: { value: "authorshipTime" } }
]) {
  const res = await runQuery({
    token: auth.token,
    size: SIZE,
    body: { query: baseQuery, filters: best.filter || [], ...sortFragment },
    label: `authorshipTime ${JSON.stringify(sortFragment)}`
  });
  const ship = (res.body?.resultDocuments || []).find((g) => g.category === "SHIP");
  const docs = ship?.documents || [];
  if (docs.length) {
    const tss = docs.map((d) => d.authoredOn).filter(Boolean).sort();
    console.log(`  -> ${docs.length} SHIP, range ${tss[0]} … ${tss[tss.length - 1]}, sort=${JSON.stringify(ship.sort)}`);
  }
}

// Pagination probe: identify which parameter (if any) shifts the SHIP page.
const baselineDocs = (best.response?.body?.resultDocuments || []).find((g) => g.category === "SHIP")?.documents || [];
const baselineIds = new Set(baselineDocs.map((d) => d.documentId));
console.log(`\npagination probe: baseline ${baselineIds.size} SHIP ids`);

const paginationCandidates = [
  { name: "qs-from", urlExtra: `&from=${baselineIds.size}`, bodyExtra: {} },
  { name: "qs-offset", urlExtra: `&offset=${baselineIds.size}`, bodyExtra: {} },
  { name: "qs-page", urlExtra: `&page=2`, bodyExtra: {} },
  { name: "body-from", urlExtra: "", bodyExtra: { from: baselineIds.size } },
  { name: "body-offset", urlExtra: "", bodyExtra: { offset: baselineIds.size } },
  { name: "body-page", urlExtra: "", bodyExtra: { page: 2 } },
  { name: "body-pageNumber", urlExtra: "", bodyExtra: { pageNumber: 2 } },
  { name: "body-skip", urlExtra: "", bodyExtra: { skip: baselineIds.size } }
];

let workingPager = null;
for (const cand of paginationCandidates) {
  const res = await runQueryRaw({
    token: auth.token,
    url: `${baseUrl}/v2/query?size=${SIZE}${cand.urlExtra}`,
    body: { query: baseQuery, filters: best.filter || [], ...cand.bodyExtra },
    label: `page ${cand.name}`
  });
  const ship = (res.body?.resultDocuments || []).find((g) => g.category === "SHIP");
  const docs = ship?.documents || [];
  const newIds = docs.map((d) => d.documentId).filter((id) => !baselineIds.has(id));
  console.log(`  -> ${cand.name}: status=${res.response.status} returned=${docs.length} new=${newIds.length}`);
  if (newIds.length >= 50 && !workingPager) workingPager = cand;
}

// Aggressive paginate via body.from. Re-auth per page since token expires under
// long loops. Tries multiple pager param names and keeps unique records.
console.log(`\nfull paginate via body.from with per-page re-auth`);
const allDocs = [];
const seen = new Set();
let token = auth.token;
let stallCount = 0;
const params = ["from", "offset", "skip"];
for (let from = 0; from < 5000 && stallCount < 6; from += SIZE) {
  if (from > 0 && from % 1500 === 0) {
    console.log("  re-authing...");
    const fresh = await getDantiOidcToken({ username, password, authBaseUrl, appUrl, clientId, scope });
    if (fresh.ok && fresh.token) token = fresh.token;
  }
  for (const param of params) {
    const res = await runQueryRaw({
      token,
      url: `${baseUrl}/v2/query?size=${SIZE}`,
      body: { query: baseQuery, filters: best.filter || [], [param]: from },
      label: `${param}=${from}`
    });
    if (res.response.status === 401) {
      console.log("  401, re-authing...");
      const fresh = await getDantiOidcToken({ username, password, authBaseUrl, appUrl, clientId, scope });
      if (fresh.ok && fresh.token) token = fresh.token;
      else { stallCount = 99; break; }
      continue;
    }
    const ship = (res.body?.resultDocuments || []).find((g) => g.category === "SHIP");
    const docs = ship?.documents || [];
    const before = allDocs.length;
    for (const d of docs) {
      if (!seen.has(d.documentId)) {
        seen.add(d.documentId);
        allDocs.push(d);
      }
    }
    console.log(`  ${param}=${from}: returned=${docs.length} new=${allDocs.length - before} unique=${allDocs.length}`);
  }
  if (allDocs.length === 0) break;
  if (allDocs.length < SIZE * (1 + from / SIZE) * 0.1) stallCount++;
}
const tss = allDocs.map((d) => d.authoredOn).filter(Boolean).sort();
console.log(`SHIP unique=${allDocs.length}, time range ${tss[0]} … ${tss[tss.length - 1]}`);
await writeFullJson(`danti-hormuz-ship-all-paginated.json`, {
  source: "DANTI",
  filter: best.filter,
  sort: "authorshipTime (advertised, ignored by API; sort=relevance returned)",
  collected_at: new Date().toISOString(),
  count: allDocs.length,
  timeRange: { earliest: tss[0], latest: tss[tss.length - 1] },
  documents: allDocs
});

let imagePayload = probe;
const probeImage = (probe.body?.resultDocuments || []).find((g) => g.category === "IMAGE");
const imageTotal = probeImage?.total?.value || 0;
if (imageTotal > (probeImage?.documents?.length || 0)) {
  for (const filter of [[{ field: "category", op: "eq", value: "IMAGE" }], [{ category: "IMAGE" }]]) {
    const res = await runQuery({
      token: auth.token,
      size: SIZE,
      body: { query: baseQuery, filters: filter },
      label: `IMAGE ${JSON.stringify(filter)}`
    });
    const img = (res.body?.resultDocuments || []).find((g) => g.category === "IMAGE");
    if ((img?.documents?.length || 0) >= (probeImage?.documents?.length || 0)) {
      imagePayload = res;
      break;
    }
  }
}
const imageFile = `danti-hormuz-image-full-size-${SIZE}.json`;
await writeFullJson(imageFile, imagePayload);
const finalImage = (imagePayload.body?.resultDocuments || []).find((g) => g.category === "IMAGE");
console.log(`IMAGE returned=${finalImage?.documents?.length || 0}/${finalImage?.total?.value || 0}`);

console.log("done");

async function runQueryRaw({ token, url, body, label }) {
  const startedAt = new Date();
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "SeaForge danti-pull-full/0.1"
    },
    body: JSON.stringify(body)
  }, 90_000);
  const text = await response.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { raw_text: text.slice(0, 4000) }; }
  console.log(`[${label}] ${response.status} ${response.statusText} (${text.length}b)`);
  return {
    request: { url, method: "POST", body, label, startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString() },
    response: { ok: response.ok, status: response.status, statusText: response.statusText, contentType: response.headers.get("content-type"), bytes: text.length },
    body: parsed
  };
}

async function runQuery({ token, size, body, label }) {
  const url = `${baseUrl}/v2/query?size=${size}`;
  const startedAt = new Date();
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "SeaForge danti-pull-full/0.1"
    },
    body: JSON.stringify(body)
  }, 90_000);
  const text = await response.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { raw_text: text.slice(0, 4000) }; }
  console.log(`[${label}] ${response.status} ${response.statusText} (${text.length}b)`);
  return {
    request: { url, method: "POST", body, label, startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString() },
    response: { ok: response.ok, status: response.status, statusText: response.statusText, contentType: response.headers.get("content-type"), bytes: text.length },
    body: parsed
  };
}

function bucketSummary(body) {
  const out = {};
  for (const g of body?.resultDocuments || []) {
    out[g.category] = { available: g.total?.value, returned: g.documents?.length || 0 };
  }
  return out;
}

async function writeFullJson(fileName, payload) {
  await writeFile(new URL(fileName, outputDir), JSON.stringify(payload, null, 2));
}

async function getDantiOidcToken({ username, password, authBaseUrl, appUrl, clientId, scope }) {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  const state = base64Url(randomBytes(16));
  const nonce = base64Url(randomBytes(16));
  const cookieJar = new Map();

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

  let { response, url } = await followRedirects(authUrl.toString(), {}, cookieJar);
  let html = await response.text();
  let context = extractLoginContext(html);

  for (let step = 0; step < 4; step += 1) {
    const cb = readCallback(url);
    if (cb.code) {
      const tok = await exchangeCode({ authBaseUrl, clientId, appUrl, code: cb.code, verifier });
      return { ...tok, ok: tok.response?.ok === true, mode: "oidc_authorization_code_pkce" };
    }
    if (!context.loginAction) {
      return { ok: false, error: context.error || cb.error || "no login action" };
    }
    const body = new URLSearchParams();
    body.set("username", username);
    if (context.pageId !== "login-username") {
      body.set("password", password);
      body.set("credentialId", "");
    }
    ({ response, url } = await followRedirects(context.loginAction, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: new URL(authBaseUrl).origin,
        Referer: url
      },
      body: body.toString()
    }, cookieJar));
    html = await response.text();
    context = extractLoginContext(html);
  }
  return { ok: false, error: context.error || "no auth code" };
}

async function exchangeCode({ authBaseUrl, clientId, appUrl, code, verifier }) {
  const response = await fetchWithTimeout(`${authBaseUrl}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: appUrl,
      code,
      code_verifier: verifier
    }).toString()
  }, 20_000);
  const text = await response.text();
  let body; try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 2000) }; }
  return { token: body.access_token, response: { ok: response.ok, status: response.status, statusText: response.statusText }, body, error: response.ok ? undefined : body.error_description || body.error };
}

async function followRedirects(url, options, cookieJar) {
  let response = await fetchWithCookies(url, options, cookieJar);
  for (let i = 0; i < 10 && response.status >= 300 && response.status < 400; i += 1) {
    const location = response.headers.get("location");
    if (!location) break;
    url = new URL(location, url).toString();
    response = await fetchWithCookies(url, { method: "GET" }, cookieJar);
  }
  return { response, url };
}

async function fetchWithCookies(url, options = {}, cookieJar) {
  const cookie = Array.from(cookieJar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
  const response = await fetchWithTimeout(url, {
    ...options,
    redirect: "manual",
    headers: {
      "User-Agent": "SeaForge danti-pull-full/0.1",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8",
      ...(options.headers ?? {}),
      ...(cookie ? { Cookie: cookie } : {})
    }
  }, 20_000);
  for (const setCookie of response.headers.getSetCookie?.() ?? []) {
    const pair = setCookie.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) cookieJar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return response;
}

function extractLoginContext(html) {
  const value = (key) => {
    const m = html.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"])*)"`));
    return m ? decodeJsonString(m[1]) : "";
  };
  const summary = html.match(/"summary"\s*:\s*"((?:\\.|[^"])*)"/);
  return { pageId: value("pageId"), templateName: value("templateName"), loginAction: value("loginAction"), error: summary ? decodeJsonString(summary[1]) : "" };
}

function readCallback(url) {
  const u = new URL(url);
  return { code: u.searchParams.get("code"), error: u.searchParams.get("error"), state: u.searchParams.get("state") };
}

function decodeJsonString(value) {
  try { return JSON.parse(`"${value}"`); }
  catch { return value.replace(/\\\//g, "/").replace(/&amp;/g, "&").replace(/&quot;/g, "\""); }
}

function base64Url(buffer) {
  return Buffer.from(buffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15_000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: ac.signal }); }
  finally { clearTimeout(t); }
}

function envOr(key, fallback = "") {
  return process.env[key]?.trim() || fallback;
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) out[m[1]] = m[2] ?? true;
  }
  return out;
}

function clampInt(v, fallback, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
