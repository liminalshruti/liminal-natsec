import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { loadConfigIniIntoEnv } from "./load-config-ini.mjs";

loadConfigIniIntoEnv();

const outputDir = new URL("../fixtures/maritime/live-cache/", import.meta.url);
const generatedAt = new Date().toISOString();
const HORMUZ_BBOX = [54.4, 24.5, 57.8, 27.2];
const REGIONAL_BBOX = [44.0, 20.0, 66.0, 32.0];

const SOURCE_URLS = {
  navareaIx: "https://hydrography.paknavy.gov.pk/navarea-ix-warnings/",
  ukmto: "https://www.ukmto.org/",
  maradAdvisories: "https://www.maritime.dot.gov/msci-advisories",
  ofacSdnCsv: "https://www.treasury.gov/ofac/downloads/sdn.csv",
  ofacConsolidatedCsv: "https://www.treasury.gov/ofac/downloads/consolidated/cons_prim.csv",
  stanfordRfi: "https://rfi.stanford.edu/"
};

const TERMS = [
  "hormuz",
  "gulf of oman",
  "persian gulf",
  "arabian gulf",
  "iran",
  "iranian",
  "irgc",
  "bandar abbas",
  "fujairah",
  "gnss",
  "gps",
  "jamming",
  "spoofing",
  "ais",
  "tanker",
  "vessel",
  "shipping",
  "maritime",
  "missile",
  "uav",
  "usv"
];

await mkdir(outputDir, { recursive: true });

const results = [];
results.push(await cacheNavareaFullText());
results.push(await cacheUkmtoProductPages());
results.push(await cacheMaradAdvisories());
results.push(await cacheOfacMaritimeMatches());
results.push(await cacheStanfordRfiProbe());
results.push(await cacheGfwNamedVesselSearches());
results.push(await cachePaidManualSourcePlan());

await writeJson("manifest-investigation-osint.json", {
  generated_at: generatedAt,
  aoi: {
    name: "Strait of Hormuz investigation AOI",
    bbox: HORMUZ_BBOX,
    regional_bbox: REGIONAL_BBOX
  },
  note: "Open-source investigation cache. No API keys or credentials are stored here.",
  results
});

console.log(`Cached ${results.length} investigation source groups under ${outputDir.pathname}`);
for (const result of results) {
  console.log(`${result.ok ? "ok" : "warn"} ${result.source}: ${result.detail}`);
}

async function cacheNavareaFullText() {
  const page = await fetchText(SOURCE_URLS.navareaIx);
  if (!page.ok) {
    return writeFailure("navarea-ix-warning-documents.json", "NAVAREA_IX_FULL_TEXT", page.detail);
  }

  const links = unique(
    [...page.text.matchAll(/href=["']([^"']*custom_uploaded_warnings_for_navarea[^"']+\.txt)["']/gi)]
      .map((match) => absoluteUrl(match[1], SOURCE_URLS.navareaIx))
  ).slice(0, 30);

  const documents = [];
  for (const url of links) {
    const response = await fetchText(url, { timeoutMs: 20_000 });
    documents.push({
      url,
      ok: response.ok,
      status: response.status,
      bytes: response.bytes,
      sha256: response.text ? sha256(response.text) : null,
      text: response.ok ? normalizeWhitespace(response.text).slice(0, 8000) : null,
      matched_terms: response.ok ? matchedTerms(response.text) : [],
      detail: response.detail
    });
  }

  const payload = {
    source: "NAVAREA_IX_FULL_TEXT",
    generated_at: generatedAt,
    request: {
      page_url: SOURCE_URLS.navareaIx,
      document_count_requested: links.length,
      note: "Full NAVAREA IX TXT warning documents parsed from the public page."
    },
    response: {
      ok: documents.some((doc) => doc.ok),
      status: page.status,
      contentType: page.contentType,
      bytes: page.bytes
    },
    documents,
    analysis: {
      documents_ok: documents.filter((doc) => doc.ok).length,
      term_hits: countTermHits(documents.flatMap((doc) => doc.matched_terms)),
      hormuz_related_documents: documents
        .filter((doc) => doc.matched_terms.some((term) => ["hormuz", "gulf of oman", "iran", "iranian"].includes(term)))
        .map((doc) => ({
          url: doc.url,
          matched_terms: doc.matched_terms,
          excerpt: excerpt(doc.text, TERMS)
        }))
        .slice(0, 12)
    }
  };
  await writeJson("navarea-ix-warning-documents.json", payload);
  return {
    source: "NAVAREA_IX_FULL_TEXT",
    ok: payload.response.ok,
    detail: `${payload.analysis.documents_ok}/${documents.length} warning TXT documents cached.`,
    fileName: "navarea-ix-warning-documents.json"
  };
}

async function cacheUkmtoProductPages() {
  const pages = [
    ["home", "https://www.ukmto.org/"],
    ["recent_incidents", "https://www.ukmto.org/recent-incidents"],
    ["warnings", "https://www.ukmto.org/ukmto-products/warnings"],
    ["advisories", "https://www.ukmto.org/ukmto-products/advisories"],
    ["jmic_products", "https://www.ukmto.org/partner-products/jmic-products"],
    ["cmf_products", "https://www.ukmto.org/partner-products/cmf-products"],
    ["industry_products", "https://www.ukmto.org/partner-products/industry"]
  ];
  const records = [];
  for (const [name, url] of pages) {
    const response = await fetchText(url, { timeoutMs: 25_000 });
    const text = response.ok ? htmlToText(response.text) : "";
    records.push({
      name,
      url,
      ok: response.ok,
      status: response.status,
      bytes: response.bytes,
      title: response.ok ? firstMatch(response.text, /<title[^>]*>(.*?)<\/title>/is) : null,
      matched_terms: matchedTerms(text),
      links: response.ok ? extractLinks(response.text, url).filter((link) => /incident|warning|advis|jmic|cmf|pdf|product/i.test(link.url)).slice(0, 80) : [],
      text_excerpt: excerpt(text, TERMS),
      detail: response.detail
    });
  }

  const payload = {
    source: "UKMTO_PRODUCTS",
    generated_at: generatedAt,
    response: {
      ok: records.some((record) => record.ok),
      pages_ok: records.filter((record) => record.ok).length,
      pages_requested: records.length
    },
    records,
    analysis: {
      term_hits: countTermHits(records.flatMap((record) => record.matched_terms)),
      relevant_pages: records
        .filter((record) => record.matched_terms.length > 0)
        .map((record) => ({
          name: record.name,
          url: record.url,
          matched_terms: record.matched_terms,
          excerpt: record.text_excerpt
        }))
    }
  };
  await writeJson("ukmto-product-pages.json", payload);
  return {
    source: "UKMTO_PRODUCTS",
    ok: payload.response.ok,
    detail: `${payload.response.pages_ok}/${records.length} UKMTO pages cached.`,
    fileName: "ukmto-product-pages.json"
  };
}

async function cacheMaradAdvisories() {
  const index = await fetchText(SOURCE_URLS.maradAdvisories, { timeoutMs: 25_000 });
  if (!index.ok) {
    return writeFailure("marad-msci-advisories.json", "MARAD_MSCI", index.detail);
  }

  const links = extractLinks(index.text, SOURCE_URLS.maradAdvisories)
    .filter((link) => /\/msci\/20\d{2}-/i.test(link.url))
    .map((link) => ({ ...link, title: normalizeWhitespace(link.text) }))
    .filter((link) => /hormuz|persian gulf|gulf of oman|arabian sea|red sea|global|worldwide|technology|cyber|houthi|iran/i.test(`${link.title} ${link.url}`));

  const uniqueLinks = uniqueBy(links, (link) => link.url).slice(0, 12);
  const advisories = [];
  for (const link of uniqueLinks) {
    const response = await fetchText(link.url, { timeoutMs: 25_000 });
    const text = response.ok ? htmlToText(response.text) : "";
    advisories.push({
      url: link.url,
      list_title: link.title,
      ok: response.ok,
      status: response.status,
      bytes: response.bytes,
      title: response.ok ? maradTitle(response.text) ?? link.title : link.title,
      matched_terms: matchedTerms(text),
      geographic_location: fieldAfter(text, "Geographic Location:"),
      threat_type: fieldAfter(text, "Threat Type:"),
      effective_date: fieldAfter(text, "Effective Date:"),
      status_text: fieldAfter(text, "Status:"),
      excerpt: maradDescriptionExcerpt(text) ?? excerpt(text, TERMS),
      detail: response.detail
    });
  }

  const payload = {
    source: "MARAD_MSCI",
    generated_at: generatedAt,
    request: {
      index_url: SOURCE_URLS.maradAdvisories,
      note: "U.S. MARAD Maritime Security Communications with Industry advisories."
    },
    response: {
      ok: advisories.some((advisory) => advisory.ok),
      status: index.status,
      contentType: index.contentType,
      bytes: index.bytes
    },
    active_index_excerpt: excerpt(htmlToText(index.text), ["Active Advisories", "2026-004", "Hormuz", "Persian Gulf"]),
    advisories,
    analysis: {
      advisories_ok: advisories.filter((advisory) => advisory.ok).length,
      hormuz_related: advisories
        .filter((advisory) => /hormuz|persian gulf|gulf of oman|iran/i.test(`${advisory.title} ${advisory.geographic_location} ${advisory.threat_type} ${advisory.excerpt}`))
        .map((advisory) => ({
          title: advisory.title,
          url: advisory.url,
          geographic_location: advisory.geographic_location,
          threat_type: advisory.threat_type,
          effective_date: advisory.effective_date,
          matched_terms: advisory.matched_terms,
          excerpt: advisory.excerpt
        }))
    }
  };
  await writeJson("marad-msci-advisories.json", payload);
  return {
    source: "MARAD_MSCI",
    ok: payload.response.ok,
    detail: `${payload.analysis.advisories_ok}/${advisories.length} MARAD advisory pages cached.`,
    fileName: "marad-msci-advisories.json"
  };
}

async function cacheOfacMaritimeMatches() {
  const datasets = [
    ["sdn", SOURCE_URLS.ofacSdnCsv],
    ["consolidated", SOURCE_URLS.ofacConsolidatedCsv]
  ];
  const records = [];
  for (const [name, url] of datasets) {
    const response = await fetchText(url, { timeoutMs: 60_000 });
    if (!response.ok) {
      records.push({
        name,
        url,
        ok: false,
        status: response.status,
        detail: response.detail,
        matches: []
      });
      continue;
    }
    const lines = response.text.split(/\r?\n/).filter(Boolean);
    const matches = lines
      .filter((line) => /IRISL|NITC|Iran|Iranian|tanker|vessel|shipping|maritime|petroleum|oil|Bandar Abbas|Hormuz/i.test(line))
      .slice(0, 250)
      .map((line) => ({
        raw_csv: sanitizeCsvLine(line),
        matched_terms: matchedTerms(line)
      }));
    records.push({
      name,
      url,
      ok: true,
      status: response.status,
      bytes: response.bytes,
      sha256: sha256(response.text),
      total_lines: lines.length,
      match_count: matches.length,
      matches
    });
  }

  const payload = {
    source: "OFAC_SANCTIONS",
    generated_at: generatedAt,
    request: {
      note: "Filtered official OFAC CSV downloads for maritime/Iran/Hormuz-relevant rows. Full CSV is not stored here."
    },
    response: {
      ok: records.some((record) => record.ok),
      datasets_ok: records.filter((record) => record.ok).length,
      datasets_requested: records.length
    },
    records,
    analysis: {
      total_matches: records.reduce((total, record) => total + (record.match_count ?? 0), 0),
      term_hits: countTermHits(records.flatMap((record) => record.matches ?? []).flatMap((match) => match.matched_terms))
    }
  };
  await writeJson("ofac-maritime-sanctions-matches.json", payload);
  return {
    source: "OFAC_SANCTIONS",
    ok: payload.response.ok,
    detail: `${payload.response.datasets_ok}/${records.length} OFAC datasets queried; ${payload.analysis.total_matches} filtered rows cached.`,
    fileName: "ofac-maritime-sanctions-matches.json"
  };
}

async function cacheStanfordRfiProbe() {
  const dates = recentDates(5);
  const attempts = [];
  const records = [];
  const pathTemplates = [
    (kind, yyyy, mm, dd, file) => `https://rfi.stanford.edu/${kind}/${yyyy}/${mm}/${dd}/${file}`,
    (kind, yyyy, mm, dd, file) => `https://rfi.stanford.edu/data/${kind}/${yyyy}/${mm}/${dd}/${file}`,
    (kind, yyyy, mm, dd, file) => `https://rfi.stanford.edu/files/${kind}/${yyyy}/${mm}/${dd}/${file}`
  ];

  for (const date of dates) {
    for (const kind of ["jamming", "spoofing"]) {
      for (const file of ["events.json", "heatmap.json"]) {
        let cached = false;
        for (const template of pathTemplates) {
          const url = template(kind, date.yyyy, date.mm, date.dd, file);
          const response = await fetchText(url, { timeoutMs: 20_000 });
          attempts.push({
            date: date.iso,
            kind,
            file,
            url,
            ok: response.ok,
            status: response.status,
            contentType: response.contentType,
            bytes: response.bytes,
            detail: response.detail
          });
          if (!response.ok) continue;
          const json = parseJsonSafe(response.text);
          const regionalHits = filterStanfordRegionalHits(json);
          records.push({
            date: date.iso,
            kind,
            file,
            url,
            ok: true,
            bytes: response.bytes,
            regional_hit_count: regionalHits.length,
            regional_hits: regionalHits.slice(0, 100)
          });
          cached = true;
          break;
        }
        if (cached) continue;
      }
    }
  }

  const payload = {
    source: "STANFORD_RFI",
    generated_at: generatedAt,
    attribution: "Data from rfi.stanford.edu, Stanford GPS Laboratory. CC BY-NC 4.0.",
    request: {
      homepage: SOURCE_URLS.stanfordRfi,
      docs: "https://rfi.stanford.edu/resources",
      note: "Probe for open GNSS interference JSON files over recent dates and filter to Persian Gulf/Hormuz regional bbox."
    },
    response: {
      ok: records.length > 0,
      attempts: attempts.length,
      records_ok: records.length
    },
    records,
    attempts,
    analysis: {
      regional_hit_count: records.reduce((total, record) => total + record.regional_hit_count, 0),
      limitation: records.length === 0
        ? "No Stanford RFI JSON files were reachable via the probed public URL patterns. Install/use rfi-fileparser if direct URLs change."
        : "Stanford RFI data is ADS-B-derived GNSS interference context, not maritime vessel behavior evidence."
    }
  };
  await writeJson("stanford-rfi-hormuz-probe.json", payload);
  return {
    source: "STANFORD_RFI",
    ok: payload.response.ok,
    detail: `${payload.response.records_ok} Stanford RFI JSON files cached; ${payload.analysis.regional_hit_count} regional hits.`,
    fileName: "stanford-rfi-hormuz-probe.json"
  };
}

async function cachePaidManualSourcePlan() {
  const payload = {
    source: "PAID_MANUAL_OSINT_PLAN",
    generated_at: generatedAt,
    records: [
      {
        source: "SPIRE_MARITIME",
        status: "credentials_or_export_required",
        desired_data: "Historical AIS position, static vessel, dark activity, port events for REGIONAL_BBOX over the past 72h+.",
        why_it_matters: "Best available route to real vessel behavior and dark-gap validation."
      },
      {
        source: "EXACTEARTH",
        status: "credentials_or_export_required",
        desired_data: "Satellite AIS history and static vessel identity for Hormuz/Gulf of Oman.",
        why_it_matters: "Corroborates AISstream/GFW where terrestrial AIS is sparse or delayed."
      },
      {
        source: "MARINETRAFFIC_OR_VESSELFINDER",
        status: "manual_export_or_paid_api_required",
        desired_data: "Vessel tracks, port calls, arrival/departure events, fleet lists for Bandar Abbas, Fujairah, Khor Fakkan, Sohar.",
        why_it_matters: "Commercial AIS history for demo-grade vessel movement, if licensing allows caching."
      },
      {
        source: "KPLER_OR_SIGNAL_OCEAN",
        status: "credentials_or_export_required",
        desired_data: "Cargo, tanker flows, oil/LNG load status, shadow fleet indicators, fixture/charter context.",
        why_it_matters: "Turns regional disruption into supply-chain and energy-flow impact analysis."
      },
      {
        source: "EQUASIS",
        status: "manual_login_export_required",
        desired_data: "Ownership, management, class, insurer, safety/PSC fields for vessels of interest.",
        why_it_matters: "Ownership/management chain for entity risk and sanctions enrichment."
      },
      {
        source: "IMO_GISIS",
        status: "manual_login_export_required",
        desired_data: "IMO number, ship particulars, company/registered owner fields, casualty/security circular references.",
        why_it_matters: "Primary registry-grade vessel identity reconciliation."
      },
      {
        source: "AISHUB",
        status: "deferred_by_user",
        desired_data: "Regional AIS feed/export if user later decides to onboard it.",
        why_it_matters: "Could improve free/low-cost live vessel behavior coverage, but current plan defers it."
      },
      {
        source: "ADS_B_EXCHANGE_OR_OPENSKY",
        status: "credentials_or_special_access_likely_required_for_history",
        desired_data: "ADS-B NACp/NIC history over Persian Gulf/Gulf of Oman for GNSS interference detection.",
        why_it_matters: "Independent RF/GNSS integrity context, not vessel behavior."
      }
    ]
  };
  await writeJson("paid-manual-osint-source-plan.json", payload);
  return {
    source: "PAID_MANUAL_OSINT_PLAN",
    ok: true,
    detail: `${payload.records.length} gated/manual sources documented.`,
    fileName: "paid-manual-osint-source-plan.json"
  };
}

async function cacheGfwNamedVesselSearches() {
  const token = envOr("GLOBAL_FISHING_WATCH_API_KEY");
  const baseUrl = envOr("GLOBAL_FISHING_WATCH_BASE_URL", "https://gateway.api.globalfishingwatch.org").replace(/\/$/, "");
  const queries = [
    "SARV SHAKTI",
    "HUGE",
    "VIGOR",
    "ELLY",
    "OCEANJET",
    "SEAWAY",
    "ABYAN",
    "BITU",
    "SAFEEN PRESTIGE",
    "MUBARAZ",
    "DESH GARIMA",
    "SANMAR HERALD"
  ];

  if (!token) {
    return writeFailure("gfw-hormuz-named-vessel-searches.json", "GFW_NAMED_VESSEL_SEARCH", "GLOBAL_FISHING_WATCH_API_KEY missing; skipped.");
  }

  const records = [];
  for (const query of queries) {
    const url = new URL(`${baseUrl}/v3/vessels/search`);
    url.searchParams.set("query", query);
    url.searchParams.set("datasets[0]", "public-global-vessel-identity:latest");
    url.searchParams.set("limit", "5");
    const response = await fetchJson(url.toString(), {
      timeoutMs: 30_000,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });
    const entries = Array.isArray(response.json?.entries) ? response.json.entries : [];
    records.push({
      query,
      ok: response.ok,
      status: response.status,
      detail: response.detail,
      result_count: entries.length,
      entries: entries.map(projectGfwVesselEntry)
    });
  }

  const payload = {
    source: "GFW_NAMED_VESSEL_SEARCH",
    generated_at: generatedAt,
    request: {
      dataset: "public-global-vessel-identity:latest",
      note: "Named vessel identity lookup for candidates surfaced by 72-hour open web / warning OSINT. Identity only; not behavior evidence."
    },
    response: {
      ok: records.some((record) => record.ok),
      searches_ok: records.filter((record) => record.ok).length,
      searches_requested: records.length
    },
    records,
    analysis: {
      matched_queries: records
        .filter((record) => record.result_count > 0)
        .map((record) => ({
          query: record.query,
          result_count: record.result_count,
          top_results: record.entries.slice(0, 3)
        }))
    }
  };
  await writeJson("gfw-hormuz-named-vessel-searches.json", payload);
  return {
    source: "GFW_NAMED_VESSEL_SEARCH",
    ok: payload.response.ok,
    detail: `${payload.response.searches_ok}/${records.length} named vessel searches completed; ${payload.analysis.matched_queries.length} queries returned results.`,
    fileName: "gfw-hormuz-named-vessel-searches.json"
  };
}

async function writeFailure(fileName, source, detail) {
  const existing = await readExistingJson(fileName);
  if (existing?.response?.ok === true) {
    return {
      source,
      ok: true,
      detail: `${detail}; kept previous successful cache from ${existing.generated_at ?? "unknown time"}.`,
      fileName
    };
  }
  await writeJson(fileName, {
    source,
    generated_at: generatedAt,
    response: {
      ok: false,
      detail
    }
  });
  return { source, ok: false, detail, fileName };
}

async function readExistingJson(fileName) {
  try {
    return JSON.parse(await readFile(new URL(fileName, outputDir), "utf8"));
  } catch {
    return null;
  }
}

async function fetchText(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "liminal-natsec-osint-cache/0.1",
        Accept: "text/html,application/json,text/plain,*/*",
        ...(options.headers ?? {})
      }
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
      bytes: Buffer.byteLength(text),
      text,
      detail: response.ok ? "OK" : `${response.status} ${response.statusText}`
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      contentType: null,
      bytes: 0,
      text: "",
      detail: error?.name === "AbortError" ? `timeout after ${timeoutMs}ms` : error?.message ?? "fetch failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetchText(url, options);
  return {
    ...response,
    json: response.ok ? parseJsonSafe(response.text) : null
  };
}

async function writeJson(fileName, value) {
  const url = new URL(fileName, outputDir);
  await writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
}

function extractLinks(html, baseUrl) {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis)].map((match) => ({
    url: absoluteUrl(decodeHtml(match[1]), baseUrl),
    text: normalizeWhitespace(htmlToText(match[2]))
  }));
}

function htmlToText(html = "") {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function absoluteUrl(url, baseUrl) {
  return new URL(url.replace(/&amp;/g, "&"), baseUrl).toString();
}

function normalizeWhitespace(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function matchedTerms(text = "") {
  const lower = String(text).toLowerCase();
  return TERMS.filter((term) => lower.includes(term));
}

function countTermHits(terms) {
  return Object.fromEntries(
    [...terms].reduce((map, term) => map.set(term, (map.get(term) ?? 0) + 1), new Map())
  );
}

function excerpt(text = "", terms = TERMS) {
  const normalized = normalizeWhitespace(text);
  const lower = normalized.toLowerCase();
  const index = terms
    .map((term) => lower.indexOf(term.toLowerCase()))
    .filter((value) => value >= 0)
    .sort((left, right) => left - right)[0];
  if (index == null) return normalized.slice(0, 900);
  return normalized.slice(Math.max(0, index - 240), index + 900);
}

function fieldAfter(text, label) {
  const normalized = normalizeWhitespace(text);
  const index = normalized.indexOf(label);
  if (index < 0) return null;
  const after = normalized.slice(index + label.length);
  const stop = after.search(/(?:Status:|Geographic Location:|Threat Type:|Effective Date:|U\.S\. DEPARTMENT|Contact Information:)/);
  return normalizeWhitespace((stop >= 0 ? after.slice(0, stop) : after).slice(0, 220)) || null;
}

function maradTitle(html) {
  const title = normalizeWhitespace(htmlToText(firstMatch(html, /<title[^>]*>(.*?)<\/title>/is) ?? ""));
  if (title && title !== "MARAD") return title.replace(/\s+\|\s+MARAD$/i, "");
  const headings = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gis)]
    .map((match) => normalizeWhitespace(htmlToText(match[1])))
    .filter(Boolean)
    .filter((value) => !/USA Banner|Main -|About MARAD/i.test(value));
  return headings[0] ?? null;
}

function maradDescriptionExcerpt(text) {
  const normalized = normalizeWhitespace(text);
  const start = normalized.indexOf("Description");
  if (start < 0) return null;
  const stop = normalized.indexOf("Status:", start);
  return normalized.slice(start, stop > start ? stop : start + 1400).slice(0, 1400);
}

function firstMatch(text, pattern) {
  return text.match(pattern)?.[1] ?? null;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

function unique(values) {
  return [...new Set(values)];
}

function uniqueBy(values, keyFn) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const key = keyFn(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function sanitizeCsvLine(line) {
  return line.replace(/\s+/g, " ").slice(0, 2000);
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function filterStanfordRegionalHits(json) {
  const hits = [];
  walk(json, (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const lat = numeric(value.latitude ?? value.lat);
    const lon = numeric(value.longitude ?? value.lon ?? value.lng);
    if (lat == null || lon == null || !insideBbox(lon, lat, REGIONAL_BBOX)) return;
    hits.push(value);
  });
  return hits;
}

function walk(value, visitor) {
  visitor(value);
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visitor);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) walk(item, visitor);
  }
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function insideBbox(lon, lat, bbox) {
  return lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
}

function recentDates(days) {
  const out = [];
  for (let i = 0; i < days; i += 1) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const yyyy = String(date.getUTCFullYear());
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    out.push({ yyyy, mm, dd, iso: `${yyyy}-${mm}-${dd}` });
  }
  return out;
}

function envOr(name, fallback = "") {
  const value = process.env[name];
  return value == null || value === "" ? fallback : value;
}

function projectGfwVesselEntry(entry) {
  const registry = Array.isArray(entry.registryInfo) ? entry.registryInfo[0] : null;
  const selfReported = Array.isArray(entry.selfReportedInfo) ? entry.selfReportedInfo[0] : null;
  const info = registry ?? selfReported ?? {};
  return {
    dataset: entry.dataset,
    shipname: info.shipname ?? info.nShipname ?? null,
    ssvid: info.ssvid ?? null,
    imo: info.imo ?? null,
    flag: info.flag ?? null,
    callsign: info.callsign ?? null,
    source_codes: info.sourceCode ?? [],
    latest_vessel_info: info.latestVesselInfo ?? null,
    transmission_date_from: info.transmissionDateFrom ?? null,
    transmission_date_to: info.transmissionDateTo ?? null,
    shiptypes: Array.isArray(entry.combinedSourcesInfo)
      ? unique(entry.combinedSourcesInfo.flatMap((item) => (item.shiptypes ?? []).map((shiptype) => shiptype.name)).filter(Boolean))
      : [],
    registry_info_total_records: entry.registryInfoTotalRecords ?? null
  };
}
