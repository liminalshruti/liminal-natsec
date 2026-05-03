import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const NORMALIZER_VERSION = "hormuz-intel-normalizer@0.1.0";
export const HORMUZ_CLASSIFICATION = "UNCLASSIFIED//OSINT_FIXTURE";

export const REQUIRED_LIVE_CACHE_FILES = [
  "acled-hormuz-events.json",
  "aisstream-hormuz-sample.json",
  "copernicus-cdse-sentinel1-stac.json",
  "copernicus-cdse-sentinel2-stac.json",
  "copernicus-marine-hormuz-currents.metadata.json",
  "danti-hormuz-query.json",
  "sentinelhub-hormuz-sentinel1-vv.metadata.json",
  "sentinelhub-hormuz-sentinel1-vv.png",
  "sentinelhub-hormuz-sentinel2-truecolor.metadata.json",
  "sentinelhub-hormuz-sentinel2-truecolor.png",
  "opensanctions-hormuz-maritime-entities.json",
  "exa-hormuz-osint.json",
  "gdelt-hormuz-doc20-artlist.json",
  "portwatch-hormuz-chokepoint-transits.json",
  "portwatch-hormuz-disruptions.json",
  "navarea-ix-warnings.html",
  "navarea-ix-warnings.metadata.json",
  "ukmto-home.html",
  "ukmto-home.metadata.json",
  "gfw-vessel-search-irisl.json",
  "gfw-hormuz-gaps.json",
  "gfw-hormuz-loitering.json",
  "gfw-hormuz-port-visits.json",
  "overpass-hormuz-maritime.json",
  "overpass-hormuz-maritime.attempts.json",
  "shodan-maritime-ais.json"
];

const REPO_ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const DEFAULT_LIVE_CACHE_DIR = join(REPO_ROOT, "fixtures/maritime/live-cache");
const DEFAULT_OUTPUT_DIR = join(REPO_ROOT, "fixtures/maritime");
const LIVE_CACHE_PREFIX = "fixtures/maritime/live-cache";

const DRAWER_GROUPS = [
  "Satellite",
  "Maritime Warnings",
  "OSINT",
  "Entity Risk",
  "Infrastructure Context"
];

const SCORE_BUCKETS = [
  "cross_modal_context",
  "entity_risk",
  "regional_context",
  "identity_source_corroboration",
  "infrastructure_context"
];

const CATEGORY_BUCKET = {
  GEO_SPATIOTEMPORAL_CORROBORATION: "cross_modal_context",
  CROSS_MODAL_CONTEXT: "cross_modal_context",
  ENTITY_RISK_ENRICHMENT: "entity_risk",
  REGIONAL_SECURITY_CONTEXT: "regional_context",
  VESSEL_IDENTITY_CORROBORATION: "identity_source_corroboration",
  MARITIME_INFRASTRUCTURE_CONTEXT: "infrastructure_context",
  INFRASTRUCTURE_CONTEXT_ONLY: "infrastructure_context"
};

const AVAILABLE_DELTAS = {
  GEO_SPATIOTEMPORAL_CORROBORATION: 0.18,
  CROSS_MODAL_CONTEXT: 0.12,
  ENTITY_RISK_ENRICHMENT: 0.22,
  REGIONAL_SECURITY_CONTEXT: 0.1,
  VESSEL_IDENTITY_CORROBORATION: 0.16,
  MARITIME_INFRASTRUCTURE_CONTEXT: 0.04,
  INFRASTRUCTURE_CONTEXT_ONLY: 0.02
};

const CATEGORY_RATIONALE = {
  GEO_SPATIOTEMPORAL_CORROBORATION:
    "Satellite metadata can corroborate time and area context only.",
  CROSS_MODAL_CONTEXT:
    "Satellite image chips provide cross-modal context without identity or intent claims.",
  ENTITY_RISK_ENRICHMENT:
    "OpenSanctions records affect entity-risk enrichment only.",
  REGIONAL_SECURITY_CONTEXT:
    "Public warning and OSINT records affect regional context only.",
  VESSEL_IDENTITY_CORROBORATION:
    "Vessel identity/source records affect identity/source corroboration only.",
  MARITIME_INFRASTRUCTURE_CONTEXT:
    "Overpass records affect maritime infrastructure context only.",
  INFRASTRUCTURE_CONTEXT_ONLY:
    "Shodan records affect infrastructure context only and do not support vessel behavior."
};

const BEHAVIOR_EXCLUSIONS = ["kinematics", "vessel_behavior", "intent"];

export function normalizeHormuzIntel(options = {}) {
  const liveCacheDir = resolvePath(options.liveCacheDir, DEFAULT_LIVE_CACHE_DIR);
  const outputDir = resolvePath(options.outputDir, DEFAULT_OUTPUT_DIR);
  const write = options.write === true;
  const loaded = new Map();
  const sourceDocuments = [];
  const evidenceItems = [];
  const docsByFile = new Map();

  for (const fileName of REQUIRED_LIVE_CACHE_FILES) {
    loadFile(fileName);
  }

  processCopernicusStac(
    "copernicus-cdse-sentinel1-stac.json",
    "Sentinel-1 SAR STAC metadata",
    "Sentinel-1"
  );
  processCopernicusStac(
    "copernicus-cdse-sentinel2-stac.json",
    "Sentinel-2 optical STAC metadata",
    "Sentinel-2"
  );
  processCopernicusMarineCurrents();
  processSentinelHubChip(
    "sentinelhub-hormuz-sentinel1-vv.metadata.json",
    "sentinelhub-hormuz-sentinel1-vv.png",
    "Sentinel-1 VV image chip"
  );
  processSentinelHubChip(
    "sentinelhub-hormuz-sentinel2-truecolor.metadata.json",
    "sentinelhub-hormuz-sentinel2-truecolor.png",
    "Sentinel-2 true-color image chip"
  );
  processOpenSanctions();
  processDanti();
  processExa();
  processGdelt();
  processPortWatch();
  processAcled();
  processWarningPage(
    "NAVAREA_IX",
    "NAVAREA IX",
    "navarea-ix-warnings.html",
    "navarea-ix-warnings.metadata.json"
  );
  processWarningPage("UKMTO", "UKMTO", "ukmto-home.html", "ukmto-home.metadata.json");
  processAisstream();
  processGfwVesselSearch();
  processGfwUnavailableEventFeeds();
  processOverpass();
  processShodan();

  sourceDocuments.sort((left, right) => left.id.localeCompare(right.id));
  evidenceItems.sort((left, right) => left.id.localeCompare(right.id));

  const summary = buildIntelSummary(sourceDocuments, evidenceItems);

  if (write) {
    mkdirSync(outputDir, { recursive: true });
    writeJson(join(outputDir, "hormuz-source-documents.json"), sourceDocuments);
    writeJson(join(outputDir, "hormuz-evidence-items.json"), evidenceItems);
    writeJson(join(outputDir, "hormuz-intel-summary.json"), summary);
  }

  return {
    sourceDocuments,
    evidenceItems,
    summary,
    loadedFiles: [...loaded.keys()].sort()
  };

  function processCopernicusStac(fileName, title, label) {
    const doc = addSourceDocument(fileName, {
      source: "COPERNICUS_CDSE_STAC",
      provider: "Copernicus Data Space STAC",
      title,
      categories: ["GEO_SPATIOTEMPORAL_CORROBORATION"]
    });
    const features = asArray(doc.file.json?.body?.features).slice(0, 4);
    if (doc.status !== "available" || features.length === 0) {
      evidenceItems.push(
        buildEvidence({
          seed: ["copernicus-stac-unavailable", fileName],
          title: `${label} metadata unavailable`,
          source: "COPERNICUS_CDSE_STAC",
          provider: "Copernicus Data Space STAC",
          category: "GEO_SPATIOTEMPORAL_CORROBORATION",
          drawerGroup: "Satellite",
          sourceDocuments: [doc],
          status: "unavailable",
          confidence: 0,
          reliability: 0,
          summary: `${label} STAC cache is unavailable; no satellite context is added.`
        })
      );
      return;
    }

    for (const [index, feature] of features.entries()) {
      const properties = record(feature.properties);
      const observedAt =
        stringValue(properties.datetime) ?? stringValue(properties.start_datetime);
      const platform = stringValue(properties.platform) ?? label;
      const constellation = stringValue(properties.constellation) ?? label.toLowerCase();
      const cloudCover = numberValue(properties["eo:cloud_cover"]);
      const bbox = bboxValue(feature.bbox);
      evidenceItems.push(
        buildEvidence({
          seed: ["copernicus-stac", fileName, stringValue(feature.id) ?? index],
          title: `${label} acquisition over Hormuz`,
          source: "COPERNICUS_CDSE_STAC",
          provider: "Copernicus Data Space STAC",
          category: "GEO_SPATIOTEMPORAL_CORROBORATION",
          drawerGroup: "Satellite",
          sourceDocuments: [doc],
          observedAt,
          confidence: 0.72,
          reliability: 0.78,
          summary: `${label} metadata places ${platform} coverage over the Hormuz area${
            observedAt ? ` at ${observedAt}` : ""
          }.`,
          bbox,
          geometry: geometryValue(feature.geometry),
          attributes: compactRecord({
            source_feature_id: stringValue(feature.id),
            platform,
            constellation,
            instruments: stringArray(properties.instruments),
            product_type: stringValue(properties["product:type"]),
            orbit_state: stringValue(properties["sat:orbit_state"]),
            cloud_cover: cloudCover,
            asset_count: objectKeys(feature.assets).length
          })
        })
      );
    }
  }

  function processSentinelHubChip(metadataFile, imageFile, title) {
    const metadataDoc = addSourceDocument(metadataFile, {
      source: "SENTINEL_HUB_PROCESS",
      provider: "Sentinel Hub Process API",
      title: `${title} metadata`,
      categories: ["CROSS_MODAL_CONTEXT"]
    });
    const imageDoc = addSourceDocument(imageFile, {
      source: "SENTINEL_HUB_PROCESS",
      provider: "Sentinel Hub Process API",
      title,
      categories: ["CROSS_MODAL_CONTEXT"],
      responseOverride: {
        ok: metadataDoc.status === "available",
        status: metadataDoc.response_status,
        contentType: "image/png"
      }
    });
    const metadata = record(metadataDoc.file.json?.request?.metadata);
    const status =
      metadataDoc.status === "available" && imageDoc.status === "available"
        ? "available"
        : "unavailable";
    const timeRange = record(metadata.timeRange);
    const from = stringValue(timeRange.from);
    const to = stringValue(timeRange.to);
    const observedAt = to ?? from;
    evidenceItems.push(
      buildEvidence({
        seed: ["sentinelhub-chip", imageFile],
        title,
        source: "SENTINEL_HUB_PROCESS",
        provider: "Sentinel Hub Process API",
        category: "CROSS_MODAL_CONTEXT",
        drawerGroup: "Satellite",
        sourceDocuments: [metadataDoc, imageDoc],
        sourceFile: relLiveFile(imageFile),
        sourceSha256: imageDoc.sha256,
        observedAt,
        status,
        confidence: status === "available" ? 0.68 : 0,
        reliability: status === "available" ? 0.72 : 0,
        summary:
          status === "available"
            ? `${title} is cached as a visual chip for cross-modal context over the Hormuz AOI.`
            : `${title} is unavailable in the live cache; no image context is added.`,
        bbox: bboxValue(metadata.bbox),
        imageAsset: relLiveFile(imageFile),
        browserAssetPath: `/fixtures/maritime/live-cache/${imageFile}`,
        attributes: compactRecord({
          data_type: stringValue(metadata.dataType),
          output_format: stringValue(metadata.outputFormat),
          time_from: from,
          time_to: to
        })
      })
    );
  }

  function processCopernicusMarineCurrents() {
    const doc = addSourceDocument("copernicus-marine-hormuz-currents.metadata.json", {
      source: "COPERNICUS_MARINE",
      provider: "Copernicus Marine",
      title: "Copernicus Marine Hormuz surface-current sample",
      categories: ["CROSS_MODAL_CONTEXT"]
    });
    const samples = asArray(doc.file.json?.body?.samples);
    const request = record(doc.file.json?.request);
    const status = doc.status === "available" && samples.length > 0 ? "available" : "unavailable";
    const avg = averageCurrent(samples);
    evidenceItems.push(
      buildEvidence({
        seed: ["copernicus-marine", "surface-currents"],
        title: "Hormuz surface-current context",
        source: "COPERNICUS_MARINE",
        provider: "Copernicus Marine",
        category: "CROSS_MODAL_CONTEXT",
        drawerGroup: "Satellite",
        sourceDocuments: [doc],
        observedAt: firstString(request.time_range),
        status,
        confidence: status === "available" ? 0.52 : 0,
        reliability: status === "available" ? 0.58 : 0,
        summary:
          status === "available"
            ? `Copernicus Marine current vectors are cached near Hormuz; mean surface current is ${avg.speed.toFixed(2)} m/s.`
            : "Copernicus Marine current vectors are unavailable.",
        bbox: bboxValue(request.bbox),
        attributes: compactRecord({
          dataset_id: stringValue(request.dataset_id),
          variables: stringArray(request.variables),
          sample_count: samples.length,
          fixture_mode: Boolean(doc.file.json?.fixture_mode),
          mean_uo_mps: avg.uo,
          mean_vo_mps: avg.vo,
          mean_speed_mps: avg.speed
        })
      })
    );
  }

  function processOpenSanctions() {
    const doc = addSourceDocument("opensanctions-hormuz-maritime-entities.json", {
      source: "OPENSANCTIONS",
      provider: "OpenSanctions",
      title: "OpenSanctions Hormuz maritime entity searches",
      categories: ["ENTITY_RISK_ENRICHMENT"]
    });
    const responses = asArray(doc.file.json?.responses);
    let emitted = 0;
    for (const response of responses) {
      const query = stringValue(response.query) ?? "maritime entity";
      const result = asArray(response.body?.results)[0];
      if (!result) continue;
      const properties = record(result.properties);
      const topics = stringArray(properties.topics).slice(0, 5);
      const countries = stringArray(properties.country).slice(0, 5);
      const datasets = stringArray(result.datasets).slice(0, 5);
      const caption = sanitizeText(stringValue(result.caption) ?? query, 120);
      const schema = stringValue(result.schema) ?? "Entity";
      evidenceItems.push(
        buildEvidence({
          seed: ["opensanctions", query, stringValue(result.id) ?? caption],
          title: `${caption} entity-risk context`,
          source: "OPENSANCTIONS",
          provider: "OpenSanctions",
          category: "ENTITY_RISK_ENRICHMENT",
          drawerGroup: "Entity Risk",
          sourceDocuments: [doc],
          observedAt: firstString(properties.modifiedAt) ?? firstString(properties.createdAt),
          confidence: 0.7,
          reliability: 0.76,
          summary: `${caption} appears in OpenSanctions as ${schema}${
            topics.length > 0 ? ` with topics ${topics.join(", ")}` : ""
          }.`,
          url: firstString(properties.sourceUrl),
          entities: [caption],
          attributes: compactRecord({
            query,
            source_entity_id: stringValue(result.id),
            schema,
            topics,
            countries,
            datasets
          })
        })
      );
      emitted += 1;
    }
    if (doc.status !== "available" || emitted === 0) {
      evidenceItems.push(
        buildEvidence({
          seed: ["opensanctions-unavailable"],
          title: "OpenSanctions entity-risk cache unavailable",
          source: "OPENSANCTIONS",
          provider: "OpenSanctions",
          category: "ENTITY_RISK_ENRICHMENT",
          drawerGroup: "Entity Risk",
          sourceDocuments: [doc],
          status: "unavailable",
          confidence: 0,
          reliability: 0,
          summary: "OpenSanctions entity-risk search results are unavailable."
        })
      );
    }
  }

  function processDanti() {
    const doc = addSourceDocument("danti-hormuz-query.json", {
      source: "DANTI",
      provider: "Danti",
      title: "Danti Hormuz multi-int query",
      categories: [
        "REGIONAL_SECURITY_CONTEXT",
        "CROSS_MODAL_CONTEXT",
        "VESSEL_IDENTITY_CORROBORATION"
      ]
    });
    const groups = asArray(doc.file.json?.body?.resultDocuments);
    let emitted = 0;
    for (const group of groups) {
      const sourceCategory = stringValue(group.category) ?? "DANTI";
      const total = record(group.total);
      const docs = asArray(group.documents).slice(0, 3);
      if (docs.length === 0) continue;
      for (const [index, result] of docs.entries()) {
        const title = sanitizeText(
          stringValue(result.title) ?? `${sourceCategory} result ${index + 1}`,
          140
        );
        const category = dantiCategory(sourceCategory);
        evidenceItems.push(
          buildEvidence({
            seed: ["danti", sourceCategory, stringValue(result.documentId) ?? title, index],
            title,
            source: "DANTI",
            provider: "Danti",
            category,
            drawerGroup: "OSINT",
            sourceDocuments: [doc],
            observedAt: stringValue(result.authoredOn),
            confidence: 0.6,
            reliability: 0.62,
            summary: `Danti returned ${sourceCategory} context for the Hormuz query${
              numberValue(total.value) != null ? ` (${total.value} total)` : ""
            }.`,
            url: sanitizeUrl(stringValue(result.thumbnail)),
            geometry: geometryValue(result.geometry),
            entities: [sanitizeText(stringValue(result.source), 80)].filter(Boolean),
            attributes: compactRecord({
              query_id: stringValue(doc.file.json?.body?.queryId),
              source_category: sourceCategory,
              source_document_id: stringValue(result.documentId),
              source: sanitizeText(stringValue(result.source), 100),
              score: numberValue(result.score),
              total: numberValue(total.value),
              fixture_mode: Boolean(doc.file.json?.fixture_mode)
            })
          })
        );
        emitted += 1;
      }
    }
    if (doc.status !== "available" || emitted === 0) {
      evidenceItems.push(
        buildEvidence({
          seed: ["danti-unavailable"],
          title: "Danti multi-int query unavailable",
          source: "DANTI",
          provider: "Danti",
          category: "REGIONAL_SECURITY_CONTEXT",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          status: "unavailable",
          confidence: 0,
          reliability: 0,
          summary: "Danti query results are unavailable; no Danti context is added."
        })
      );
    }
  }

  function processExa() {
    const doc = addSourceDocument("exa-hormuz-osint.json", {
      source: "EXA",
      provider: "Exa",
      title: "Exa Hormuz OSINT search",
      categories: ["REGIONAL_SECURITY_CONTEXT"]
    });
    const results = asArray(doc.file.json?.body?.results).slice(0, 5);
    if (doc.status !== "available" || results.length === 0) {
      evidenceItems.push(
        buildEvidence({
          seed: ["exa-unavailable"],
          title: "Exa OSINT cache unavailable",
          source: "EXA",
          provider: "Exa",
          category: "REGIONAL_SECURITY_CONTEXT",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          status: "unavailable",
          confidence: 0,
          reliability: 0,
          summary: "Exa regional OSINT search results are unavailable."
        })
      );
      return;
    }

    for (const [index, result] of results.entries()) {
      const title = sanitizeText(stringValue(result.title) ?? `OSINT result ${index + 1}`, 140);
      const summary = sanitizeText(
        stripSummaryPrefix(stringValue(result.summary) ?? stringValue(result.text) ?? title),
        360
      );
      evidenceItems.push(
        buildEvidence({
          seed: ["exa", stringValue(result.url) ?? title, index],
          title,
          source: "EXA",
          provider: "Exa",
          category: "REGIONAL_SECURITY_CONTEXT",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          observedAt: stringValue(result.publishedDate),
          confidence: 0.58,
          reliability: 0.55,
          summary,
          url: sanitizeUrl(stringValue(result.url)),
          attributes: compactRecord({
            author: sanitizeText(stringValue(result.author), 100),
            result_id: sanitizeUrl(stringValue(result.id))
          })
        })
      );
    }
  }

  function processGdelt() {
    const doc = addSourceDocument("gdelt-hormuz-doc20-artlist.json", {
      source: "GDELT",
      provider: "GDELT DOC 2.0",
      title: "GDELT DOC 2.0 Hormuz article list",
      categories: ["REGIONAL_SECURITY_CONTEXT"]
    });
    const articles = asArray(doc.file.json?.body?.articles).slice(0, 8);
    if (doc.status !== "available" || articles.length === 0) {
      evidenceItems.push(
        buildEvidence({
          seed: ["gdelt-unavailable"],
          title: "GDELT DOC 2.0 article cache unavailable",
          source: "GDELT",
          provider: "GDELT DOC 2.0",
          category: "REGIONAL_SECURITY_CONTEXT",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          status: "unavailable",
          confidence: 0,
          reliability: 0,
          summary: "GDELT regional media context is unavailable."
        })
      );
      return;
    }

    for (const [index, article] of articles.entries()) {
      const title = sanitizeText(stringValue(article.title) ?? `GDELT article ${index + 1}`, 150);
      const domain = sanitizeText(stringValue(article.domain), 100);
      const country = sanitizeText(stringValue(article.sourcecountry), 80);
      const language = sanitizeText(stringValue(article.language), 50);
      evidenceItems.push(
        buildEvidence({
          seed: ["gdelt", stringValue(article.url) ?? title, index],
          title,
          source: "GDELT",
          provider: "GDELT DOC 2.0",
          category: "REGIONAL_SECURITY_CONTEXT",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          observedAt: gdeltSeenDate(stringValue(article.seendate)),
          confidence: 0.54,
          reliability: 0.52,
          summary: `GDELT DOC 2.0 returned regional media context${
            domain ? ` from ${domain}` : ""
          }${country ? ` (${country})` : ""}; not vessel behavior evidence.`,
          url: sanitizeUrl(stringValue(article.url)),
          attributes: compactRecord({
            domain,
            source_country: country,
            language,
            social_image: sanitizeUrl(stringValue(article.socialimage)),
            mobile_url: sanitizeUrl(stringValue(article.url_mobile)),
            fixture_mode: Boolean(doc.file.json?.fixture_mode)
          })
        })
      );
    }
  }

  function processPortWatch() {
    processPortWatchDataset(
      "portwatch-hormuz-chokepoint-transits.json",
      "IMF PortWatch Hormuz chokepoint transit estimates",
      "PortWatch chokepoint transit",
      "transits"
    );
    processPortWatchDataset(
      "portwatch-hormuz-disruptions.json",
      "IMF PortWatch Hormuz disruption events",
      "PortWatch disruption",
      "disruptions"
    );
  }

  function processPortWatchDataset(fileName, title, itemLabel, kind) {
    const doc = addSourceDocument(fileName, {
      source: "PORTWATCH",
      provider: "IMF PortWatch",
      title,
      categories: ["REGIONAL_SECURITY_CONTEXT"]
    });
    const features = asArray(doc.file.json?.body?.features ?? doc.file.json?.features).slice(0, 8);
    if (doc.status !== "available" || features.length === 0) {
      evidenceItems.push(
        buildEvidence({
          seed: ["portwatch-unavailable", fileName],
          title: `${title} unavailable`,
          source: "PORTWATCH",
          provider: "IMF PortWatch",
          category: "REGIONAL_SECURITY_CONTEXT",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          status: "unavailable",
          confidence: 0,
          reliability: 0,
          summary: "PortWatch trade-flow/disruption context is unavailable."
        })
      );
      return;
    }

    for (const [index, feature] of features.entries()) {
      const attrs = record(feature.attributes ?? feature.properties);
      const geometry = portWatchGeometry(feature.geometry, attrs);
      const name =
        sanitizeText(
          firstString([
            attrs.portname,
            attrs.PORT_NAME,
            attrs.fullname,
            attrs.eventname,
            attrs.htmlname,
            attrs.name,
            attrs.NAME,
            attrs.chokepoint,
            attrs.CHOKEPOINT
          ]),
          100
        ) ?? "Hormuz";
      const eventType =
        sanitizeText(
          firstString([
            attrs.eventtype,
            attrs.event_type,
            attrs.EVENT_TYPE,
            attrs.alertlevel,
            attrs.type,
            attrs.TYPE,
            attrs.portid,
            attrs.chokepointid,
            attrs.CHOKEPOINTID
          ]),
          100
        ) ?? itemLabel;
      const observedAt = portWatchDate(
        attrs.date ??
          attrs.DATE ??
          attrs.fromdate ??
          attrs.todate ??
          attrs.editdate ??
          attrs.event_date ??
          attrs.EVENT_DATE ??
          attrs.timestamp
      );
      const totalCalls = numberFromString(attrs.n_total ?? attrs.transit_calls ?? attrs.calls);
      const tankerCalls = numberFromString(attrs.n_tanker);
      const alertLevel = sanitizeText(stringValue(attrs.alertlevel), 40);
      const tankerPhrase =
        tankerCalls !== null
          ? `, including ${tankerCalls} tanker ${tankerCalls === 1 ? "call" : "calls"}`
          : "";
      evidenceItems.push(
        buildEvidence({
          seed: [
            "portwatch",
            fileName,
            attrs.ObjectId ?? attrs.OBJECTID ?? attrs.objectid ?? attrs.id ?? index
          ],
          title: `${itemLabel}: ${name}`,
          source: "PORTWATCH",
          provider: "IMF PortWatch",
          category: "REGIONAL_SECURITY_CONTEXT",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          observedAt,
          confidence: 0.6,
          reliability: 0.66,
          summary:
            kind === "transits"
              ? `IMF PortWatch estimates ${totalCalls ?? "unknown"} daily transit calls through ${name}${tankerPhrase}; trade-flow/regional context only.`
              : `IMF PortWatch returned ${alertLevel ? `${alertLevel} ` : ""}${eventType} disruption context for ${name}; regional context only.`,
          geometry,
          attributes: compactRecord({
            object_id: attrs.ObjectId ?? attrs.OBJECTID ?? attrs.objectid ?? attrs.id,
            event_type: eventType,
            event_id: stringValue(attrs.eventid),
            alert_level: alertLevel,
            affected_ports: sanitizeText(stringValue(attrs.affectedports), 160),
            port_id: stringValue(attrs.portid) ?? stringValue(attrs.chokepointid),
            port_name: sanitizeText(stringValue(attrs.portname), 100),
            chokepoint_id: attrs.portid ?? attrs.chokepointid ?? attrs.CHOKEPOINTID,
            transit_calls: totalCalls,
            tanker_calls: tankerCalls,
            cargo_calls: numberFromString(attrs.n_cargo),
            dry_bulk_calls: numberFromString(attrs.n_dry_bulk),
            capacity_total: numberFromString(attrs.capacity),
            capacity_tanker: numberFromString(attrs.capacity_tanker),
            trade_value_usd: numberFromString(
              attrs.trade_value_usd ?? attrs.TRADE_VALUE_USD ?? attrs.trade_usd ?? attrs.TRADE_USD
            ),
            fixture_mode: Boolean(doc.file.json?.fixture_mode)
          })
        })
      );
    }
  }

  function processAcled() {
    const doc = addSourceDocument("acled-hormuz-events.json", {
      source: "ACLED",
      provider: "ACLED",
      title: "ACLED regional event context",
      categories: ["REGIONAL_SECURITY_CONTEXT"]
    });
    const events = asArray(doc.file.json?.body?.data ?? doc.file.json?.body?.events).slice(0, 5);
    if (doc.status !== "available" || events.length === 0) {
      evidenceItems.push(
        buildEvidence({
          seed: ["acled-unavailable"],
          title: "ACLED event cache unavailable",
          source: "ACLED",
          provider: "ACLED",
          category: "REGIONAL_SECURITY_CONTEXT",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          status: "unavailable",
          confidence: 0,
          reliability: 0,
          summary: "ACLED regional event context is unavailable."
        })
      );
      return;
    }

    for (const [index, event] of events.entries()) {
      const eventType = stringValue(event.event_type) ?? "ACLED event";
      const location = sanitizeText(stringValue(event.location), 80) ?? "regional location";
      const country = sanitizeText(stringValue(event.country), 80);
      evidenceItems.push(
        buildEvidence({
          seed: ["acled", stringValue(event.event_id_cnty) ?? index],
          title: `${eventType} near ${location}`,
          source: "ACLED",
          provider: "ACLED",
          category: "REGIONAL_SECURITY_CONTEXT",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          observedAt: stringValue(event.event_date),
          confidence: 0.56,
          reliability: 0.58,
          summary: `ACLED-shaped event context: ${eventType}${
            country ? ` in ${country}` : ""
          } near ${location}.`,
          geometry: pointGeometry(numberFromString(event.longitude), numberFromString(event.latitude)),
          entities: [sanitizeText(stringValue(event.actor1), 100)].filter(Boolean),
          attributes: compactRecord({
            event_id: stringValue(event.event_id_cnty),
            country,
            admin1: sanitizeText(stringValue(event.admin1), 80),
            sub_event_type: sanitizeText(stringValue(event.sub_event_type), 120),
            fatalities: numberFromString(event.fatalities),
            fixture_mode: Boolean(doc.file.json?.fixture_mode)
          })
        })
      );
    }
  }

  function processWarningPage(source, provider, htmlFile, metadataFile) {
    const htmlDoc = addSourceDocument(htmlFile, {
      source,
      provider,
      title: `${provider} warning page snapshot`,
      categories: ["REGIONAL_SECURITY_CONTEXT"]
    });
    const metadataDoc = addSourceDocument(metadataFile, {
      source,
      provider,
      title: `${provider} warning page metadata`,
      categories: ["REGIONAL_SECURITY_CONTEXT"]
    });
    const status =
      htmlDoc.status === "available" && metadataDoc.status === "available"
        ? "available"
        : "unavailable";
    const text = sanitizeText(htmlToText(htmlDoc.file.text), 280);
    evidenceItems.push(
      buildEvidence({
        seed: ["warning-page", source, htmlFile],
        title: `${provider} regional warning context`,
        source,
        provider,
        category: "REGIONAL_SECURITY_CONTEXT",
        drawerGroup: "Maritime Warnings",
        sourceDocuments: [htmlDoc, metadataDoc],
        observedAt: metadataDoc.captured_at,
        status,
        confidence: status === "available" ? 0.6 : 0,
        reliability: status === "available" ? 0.7 : 0,
        summary:
          status === "available"
            ? `${provider} public warning content is cached for regional maritime security context.`
            : `${provider} warning content is unavailable in the live cache.`,
        detail: text,
        url: metadataDoc.url
      })
    );
  }

  function processAisstream() {
    const doc = addSourceDocument("aisstream-hormuz-sample.json", {
      source: "AISSTREAM",
      provider: "AISstream",
      title: "AISstream WebSocket sample",
      categories: ["VESSEL_IDENTITY_CORROBORATION"]
    });
    const collectionMode = stringValue(doc.file.json?.collection_mode);
    const aoiName = stringValue(doc.file.json?.aoi?.name);
    const collectionReason = stringValue(doc.file.json?.collection_reason);
    const isGlobalFallback =
      collectionMode === "global_live" ||
      Boolean(aoiName && /global/i.test(aoiName)) ||
      Boolean(collectionReason && /free-tier coverage of the Persian Gulf is currently empty/i.test(collectionReason));
    const messages = asArray(doc.file.json?.messages).slice(0, 6);
    if (doc.status !== "available" || messages.length === 0) {
      evidenceItems.push(
        buildEvidence({
          seed: ["aisstream-unavailable"],
          title: "AISstream sample unavailable",
          source: "AISSTREAM",
          provider: "AISstream",
          category: "VESSEL_IDENTITY_CORROBORATION",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          status: "unavailable",
          confidence: 0,
          reliability: 0,
          summary: "AISstream did not produce a cached sample; no live AIS corroboration is added."
        })
      );
      return;
    }
    if (isGlobalFallback) {
      evidenceItems.push(
        buildEvidence({
          seed: ["aisstream-global-fallback", collectionMode ?? aoiName ?? "global"],
          title: "AISstream Hormuz feed gap",
          source: "AISSTREAM",
          provider: "AISstream",
          category: "VESSEL_IDENTITY_CORROBORATION",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          observedAt: doc.captured_at,
          status: "unavailable",
          confidence: 0,
          reliability: 0.64,
          summary:
            "AISstream returned no Hormuz-area messages during bounded collection; a global live sample is cached only to prove connector reachability and must not be used as Hormuz vessel behavior evidence.",
          attributes: compactRecord({
            collection_mode: collectionMode,
            aoi_name: aoiName,
            message_count: numberValue(doc.file.json?.message_count),
            raw_message_count: numberValue(doc.file.json?.raw_message_count),
            unique_mmsis: numberValue(doc.file.json?.unique_mmsis),
            collection_reason: sanitizeText(collectionReason, 280),
            fixture_mode: Boolean(doc.file.json?.fixture_mode)
          })
        })
      );
      return;
    }

    for (const [index, message] of messages.entries()) {
      const metadata = record(message.MetaData);
      const report = record(message.Message?.PositionReport);
      const mmsi = stringValue(metadata.MMSI_String) ?? String(numberValue(metadata.MMSI) ?? "");
      const shipName = sanitizeText(stringValue(metadata.ShipName), 80) ?? `AIS ${mmsi || index + 1}`;
      const lat = numberValue(metadata.latitude) ?? numberValue(report.Latitude);
      const lon = numberValue(metadata.longitude) ?? numberValue(report.Longitude);
      evidenceItems.push(
        buildEvidence({
          seed: ["aisstream", mmsi || index, stringValue(metadata.time_utc) ?? index],
          title: `${shipName} AIS position sample`,
          source: "AISSTREAM",
          provider: "AISstream",
          category: "VESSEL_IDENTITY_CORROBORATION",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          observedAt: stringValue(metadata.time_utc),
          confidence: 0.62,
          reliability: 0.64,
          summary: `AISstream sample places ${shipName}${mmsi ? ` (${mmsi})` : ""} inside the Hormuz regional feed.`,
          geometry: pointGeometry(lon, lat),
          entities: [shipName],
          attributes: compactRecord({
            mmsi,
            speed_over_ground: numberValue(report.Sog),
            course_over_ground: numberValue(report.Cog),
            heading: numberValue(report.TrueHeading),
            fixture_mode: Boolean(doc.file.json?.fixture_mode)
          })
        })
      );
    }
  }

  function processGfwVesselSearch() {
    const doc = addSourceDocument("gfw-vessel-search-irisl.json", {
      source: "GLOBAL_FISHING_WATCH",
      provider: "Global Fishing Watch",
      title: "GFW vessel identity search for IRISL-like candidates",
      categories: ["VESSEL_IDENTITY_CORROBORATION"]
    });
    const entries = asArray(doc.file.json?.body?.entries).slice(0, 5);
    if (doc.status !== "available" || entries.length === 0) {
      evidenceItems.push(
        buildEvidence({
          seed: ["gfw-vessel-search-unavailable"],
          title: "GFW vessel identity search unavailable",
          source: "GLOBAL_FISHING_WATCH",
          provider: "Global Fishing Watch",
          category: "VESSEL_IDENTITY_CORROBORATION",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          status: "unavailable",
          confidence: 0,
          reliability: 0,
          summary: "GFW vessel identity search is unavailable; no identity corroboration is added."
        })
      );
      return;
    }

    for (const [index, entry] of entries.entries()) {
      const registry = asArray(entry.registryInfo)[0] ?? {};
      const selfReported = asArray(entry.selfReportedInfo)[0] ?? {};
      const identity = { ...record(selfReported), ...record(registry) };
      const name =
        sanitizeText(stringValue(identity.shipname) ?? stringValue(identity.nShipname), 80) ??
        `GFW candidate ${index + 1}`;
      const ssvid = stringValue(identity.ssvid);
      const imo = stringValue(identity.imo);
      const flag = stringValue(identity.flag);
      evidenceItems.push(
        buildEvidence({
          seed: ["gfw-vessel-search", ssvid ?? name, imo ?? index],
          title: `${name} identity candidate`,
          source: "GLOBAL_FISHING_WATCH",
          provider: "Global Fishing Watch",
          category: "VESSEL_IDENTITY_CORROBORATION",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          observedAt:
            stringValue(identity.transmissionDateTo) ??
            stringValue(identity.transmissionDateFrom),
          confidence: 0.64,
          reliability: 0.66,
          summary: `GFW vessel search returned ${name}${
            ssvid ? ` with MMSI ${ssvid}` : ""
          }${imo ? ` and IMO ${imo}` : ""}; identity corroboration only.`,
          entities: [name],
          attributes: compactRecord({
            query: stringValue(doc.file.json?.body?.metadata?.query),
            ssvid,
            imo,
            flag,
            callsign: stringValue(identity.callsign),
            registry_records: numberValue(entry.registryInfoTotalRecords),
            match_fields: stringValue(identity.matchFields)
          })
        })
      );
    }
  }

  function processGfwUnavailableEventFeeds() {
    const feeds = [
      ["gfw-hormuz-gaps.json", "GFW AIS gap event feed"],
      ["gfw-hormuz-loitering.json", "GFW loitering event feed"],
      ["gfw-hormuz-port-visits.json", "GFW port-visit event feed"]
    ];
    for (const [fileName, title] of feeds) {
      const doc = addSourceDocument(fileName, {
        source: "GLOBAL_FISHING_WATCH",
        provider: "Global Fishing Watch",
        title,
        categories: ["VESSEL_IDENTITY_CORROBORATION"]
      });
      const entries = asArray(doc.file.json?.body?.entries).slice(0, 4);
      if (doc.status === "available" && entries.length > 0) {
        for (const [index, entry] of entries.entries()) {
          const eventType = stringValue(entry.type) ?? title;
          const vessel = record(entry.vessel);
          const position = record(entry.position);
          const port = record(entry.port);
          const vesselName =
            sanitizeText(stringValue(vessel.name), 80) ??
            stringValue(vessel.ssvid) ??
            `GFW event ${index + 1}`;
          const portName = sanitizeText(stringValue(port.name), 80);
          evidenceItems.push(
            buildEvidence({
              seed: ["gfw-event", fileName, stringValue(entry.id) ?? index],
              title: `${eventType} for ${vesselName}`,
              source: "GLOBAL_FISHING_WATCH",
              provider: "Global Fishing Watch",
              category: "VESSEL_IDENTITY_CORROBORATION",
              drawerGroup: "OSINT",
              sourceDocuments: [doc],
              observedAt: stringValue(entry.start),
              confidence: 0.58,
              reliability: 0.6,
              summary: `GFW ${eventType} event context for ${vesselName}${
                portName ? ` near ${portName}` : ""
              }; identity/source corroboration only.`,
              geometry: pointGeometry(numberValue(position.lon), numberValue(position.lat)),
              entities: [vesselName],
              attributes: compactRecord({
                event_id: stringValue(entry.id),
                event_type: eventType,
                ssvid: stringValue(vessel.ssvid),
                flag: stringValue(vessel.flag),
                port: portName,
                duration_hours: numberValue(entry.durationHours),
                fixture_mode: Boolean(doc.file.json?.fixture_mode)
              })
            })
          );
        }
        continue;
      }
      evidenceItems.push(
        buildEvidence({
          seed: ["gfw-feed-unavailable", fileName],
          title: `${title} unavailable`,
          source: "GLOBAL_FISHING_WATCH",
          provider: "Global Fishing Watch",
          category: "VESSEL_IDENTITY_CORROBORATION",
          drawerGroup: "OSINT",
          sourceDocuments: [doc],
          status: "unavailable",
          confidence: 0,
          reliability: 0,
          summary: `${title} did not produce a cached event set; it is not used as vessel behavior evidence.`
        })
      );
    }
  }

  function processOverpass() {
    const doc = addSourceDocument("overpass-hormuz-maritime.json", {
      source: "OVERPASS",
      provider: "Overpass",
      title: "Overpass Hormuz maritime infrastructure extract",
      categories: ["MARITIME_INFRASTRUCTURE_CONTEXT"]
    });
    const attemptsDoc = addSourceDocument("overpass-hormuz-maritime.attempts.json", {
      source: "OVERPASS",
      provider: "Overpass",
      title: "Overpass endpoint attempt summary",
      categories: ["MARITIME_INFRASTRUCTURE_CONTEXT"]
    });
    const elements = asArray(doc.file.json?.body?.elements);
    const status = doc.status === "available" && elements.length > 0 ? "available" : "unavailable";
    const counts = countOverpassElements(elements);
    evidenceItems.push(
      buildEvidence({
        seed: ["overpass", "maritime-infrastructure"],
        title: "Hormuz maritime infrastructure context",
        source: "OVERPASS",
        provider: "Overpass",
        category: "MARITIME_INFRASTRUCTURE_CONTEXT",
        drawerGroup: "Infrastructure Context",
        sourceDocuments: [doc, attemptsDoc],
        observedAt: stringValue(doc.file.json?.body?.osm3s?.timestamp_osm_base),
        status,
        confidence: status === "available" ? 0.5 : 0,
        reliability: status === "available" ? 0.62 : 0,
        summary:
          status === "available"
            ? `Overpass cached ${elements.length} maritime infrastructure elements in the Hormuz area.`
            : "Overpass maritime infrastructure context is unavailable.",
        bbox: bboxValue(doc.file.json?.request?.metadata?.bbox),
        attributes: compactRecord({
          element_count: elements.length,
          counts,
          sample_names: sampleOverpassNames(elements)
        })
      })
    );
  }

  function processShodan() {
    const doc = addSourceDocument("shodan-maritime-ais.json", {
      source: "SHODAN",
      provider: "Shodan",
      title: "Shodan AIS infrastructure search",
      categories: ["INFRASTRUCTURE_CONTEXT_ONLY"]
    });
    const status = doc.status;
    evidenceItems.push(
      buildEvidence({
        seed: ["shodan", "maritime-ais"],
        title: "AIS-related infrastructure context",
        source: "SHODAN",
        provider: "Shodan",
        category: "INFRASTRUCTURE_CONTEXT_ONLY",
        drawerGroup: "Infrastructure Context",
        sourceDocuments: [doc],
        status,
        confidence: status === "available" ? 0.35 : 0,
        reliability: status === "available" ? 0.45 : 0,
        summary:
          "Infrastructure-only; not vessel behavior evidence. Shodan data is restricted to exposed-service context.",
        detail: doc.status_detail,
        attributes: compactRecord({
          response_status: doc.response_status
        })
      })
    );
  }


  function addSourceDocument(fileName, config) {
    if (docsByFile.has(fileName)) return docsByFile.get(fileName);
    const file = loadFile(fileName);
    const response = deriveResponse(file, config.responseOverride);
    const doc = {
      id: sourceDocumentId(fileName),
      type: "sourceDocument",
      title: config.title,
      source: config.source,
      provider: config.provider,
      source_file: relLiveFile(fileName),
      sha256: file.sha256,
      captured_at: response.generatedAt,
      retrieved_at: response.generatedAt,
      url: response.url,
      status: response.ok ? "available" : "unavailable",
      status_detail: response.detail,
      response_status: response.status,
      content_type: response.contentType,
      bytes: response.bytes ?? file.bytes,
      classification: HORMUZ_CLASSIFICATION,
      categories: config.categories,
      summary: response.ok
        ? `${config.provider} cache artifact normalized for offline Hormuz analysis.`
        : `${config.provider} cache artifact unavailable: ${response.detail}`,
      file
    };
    const publicDoc = omit(doc, ["file"]);
    sourceDocuments.push(publicDoc);
    docsByFile.set(fileName, { ...publicDoc, file });
    return docsByFile.get(fileName);
  }

  function loadFile(fileName) {
    if (loaded.has(fileName)) return loaded.get(fileName);
    const absolutePath = join(liveCacheDir, fileName);
    if (!existsSync(absolutePath)) {
      const missing = {
        fileName,
        exists: false,
        bytes: null,
        sha256: null,
        json: null,
        text: null
      };
      loaded.set(fileName, missing);
      return missing;
    }

    const raw = readFileSync(absolutePath);
    const ext = extname(fileName).toLowerCase();
    let json = null;
    let text = null;
    if (ext === ".json") {
      text = raw.toString("utf8");
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    } else if (ext === ".html" || ext === ".txt" || ext === ".log") {
      text = raw.toString("utf8");
    }

    const loadedFile = {
      fileName,
      exists: true,
      bytes: raw.byteLength,
      sha256: sha256(raw),
      json,
      text
    };
    loaded.set(fileName, loadedFile);
    return loadedFile;
  }
}

function buildEvidence(input) {
  const primaryDoc = input.sourceDocuments[0];
  const sourceFile = input.sourceFile ?? primaryDoc.source_file;
  const sourceSha256 =
    input.sourceSha256 !== undefined ? input.sourceSha256 : primaryDoc.sha256;
  const category = input.category;
  const bucket = CATEGORY_BUCKET[category];
  const excluded = excludedClaimClasses(category);
  return compactRecord({
    id: stableEvidenceId(input.seed),
    type: "evidence",
    title: input.title,
    source: input.source,
    provider: input.provider,
    category,
    drawer_group: input.drawerGroup,
    source_document_id: primaryDoc.id,
    source_document_ids: input.sourceDocuments.map((doc) => doc.id),
    source_file: sourceFile,
    source_sha256: sourceSha256,
    created_at: primaryDoc.captured_at ?? "1970-01-01T00:00:00.000Z",
    observed_at: input.observedAt ?? null,
    status: input.status ?? primaryDoc.status,
    classification: HORMUZ_CLASSIFICATION,
    confidence: clamp01(input.confidence),
    reliability: clamp01(input.reliability),
    summary: sanitizeText(input.summary, 520),
    detail: sanitizeText(input.detail, 520),
    url: sanitizeUrl(input.url),
    bbox: input.bbox,
    geometry: input.geometry,
    image_asset: input.imageAsset,
    browser_asset_path: input.browserAssetPath,
    entities: input.entities,
    attributes: sanitizeValue(input.attributes),
    policy: {
      allowed_score_buckets: [bucket],
      excluded_claim_classes: excluded,
      note: policyNote(category)
    }
  });
}

function buildIntelSummary(sourceDocuments, evidenceItems) {
  const generatedAt =
    latestTimestamp([
      ...sourceDocuments.map((doc) => doc.captured_at),
      ...evidenceItems.map((item) => item.created_at)
    ]) ?? "1970-01-01T00:00:00.000Z";
  const drawerGroups = Object.fromEntries(DRAWER_GROUPS.map((group) => [group, 0]));
  const categories = Object.fromEntries(
    Object.keys(CATEGORY_BUCKET).map((category) => [category, 0])
  );

  for (const item of evidenceItems) {
    drawerGroups[item.drawer_group] = (drawerGroups[item.drawer_group] ?? 0) + 1;
    categories[item.category] = (categories[item.category] ?? 0) + 1;
  }

  return {
    generated_at: generatedAt,
    normalizer_version: NORMALIZER_VERSION,
    classification: HORMUZ_CLASSIFICATION,
    source_document_count: sourceDocuments.length,
    evidence_item_count: evidenceItems.length,
    available_evidence_count: evidenceItems.filter((item) => item.status === "available").length,
    unavailable_evidence_count: evidenceItems.filter((item) => item.status === "unavailable").length,
    drawer_groups: drawerGroups,
    categories,
    scoring: buildScoringSummary(evidenceItems)
  };
}

function buildScoringSummary(evidenceItems) {
  const contributions = evidenceItems.map((item) => {
    const bucket = CATEGORY_BUCKET[item.category];
    const available = item.status === "available";
    return {
      evidence_id: item.id,
      title: item.title,
      source: item.source,
      category: item.category,
      bucket,
      delta: available ? AVAILABLE_DELTAS[item.category] : 0,
      available,
      allowed_claim_classes: [bucket],
      excluded_claim_classes: excludedClaimClasses(item.category),
      rationale: CATEGORY_RATIONALE[item.category]
    };
  });
  const totals = Object.fromEntries(SCORE_BUCKETS.map((bucket) => [bucket, 0]));
  for (const contribution of contributions) {
    totals[contribution.bucket] += contribution.delta;
  }
  return { contributions, totals };
}

function deriveResponse(file, override) {
  if (!file.exists) {
    return {
      ok: false,
      status: null,
      contentType: null,
      bytes: null,
      generatedAt: null,
      url: null,
      detail: "source file missing"
    };
  }
  const json = record(file.json);
  const response = record(json.response);
  const okValue =
    typeof override?.ok === "boolean"
      ? override.ok
      : typeof response.ok === "boolean"
      ? response.ok
      : typeof json.ok === "boolean"
      ? json.ok
      : true;
  const status =
    numberValue(override?.status) ?? numberValue(response.status) ?? numberValue(json.status);
  const contentType =
    stringValue(override?.contentType) ??
    stringValue(response.contentType) ??
    contentTypeForFile(file.fileName);
  const bytes = numberValue(response.bytes) ?? numberValue(json.bytes) ?? file.bytes;
  const generatedAt = stringValue(json.generated_at) ?? latestTimestamp([stringValue(json.updated_at)]);
  const url = sanitizeUrl(stringValue(json.request?.url) ?? stringValue(json.url));
  const error = sanitizeText(
    stringValue(json.error) ?? stringValue(json.body?.error) ?? stringValue(response.statusText),
    220
  );
  const detail = okValue
    ? status
      ? `${status} ${stringValue(response.statusText) ?? "OK"}`
      : "cached"
    : error ?? "provider blocked or unavailable";
  return {
    ok: okValue,
    status: status ?? null,
    contentType,
    bytes,
    generatedAt: generatedAt ?? null,
    url,
    detail
  };
}

function excludedClaimClasses(category) {
  if (
    category === "INFRASTRUCTURE_CONTEXT_ONLY" ||
    category === "MARITIME_INFRASTRUCTURE_CONTEXT" ||
    category === "ENTITY_RISK_ENRICHMENT" ||
    category === "REGIONAL_SECURITY_CONTEXT" ||
    category === "VESSEL_IDENTITY_CORROBORATION"
  ) {
    return BEHAVIOR_EXCLUSIONS;
  }
  if (
    category === "GEO_SPATIOTEMPORAL_CORROBORATION" ||
    category === "CROSS_MODAL_CONTEXT"
  ) {
    return ["intent"];
  }
  return [];
}

function policyNote(category) {
  if (category === "INFRASTRUCTURE_CONTEXT_ONLY") {
    return "Infrastructure-only; not vessel behavior evidence.";
  }
  return CATEGORY_RATIONALE[category];
}

function sourceDocumentId(fileName) {
  return `src:hormuz:${slugify(fileName.replace(/\.[^.]+$/, ""))}`;
}

function stableEvidenceId(parts) {
  const seed = parts.map((part) => String(part ?? "")).join("|");
  const stem = slugify(parts.slice(0, 2).join("-")).slice(0, 52) || "item";
  return `ev:hormuz:${stem}:${sha256(seed).slice(0, 10)}`;
}

function relLiveFile(fileName) {
  return `${LIVE_CACHE_PREFIX}/${fileName}`;
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue).filter((item) => item !== undefined);
  }
  if (value && typeof value === "object") {
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      if (secretishKey(key)) continue;
      const sanitized = sanitizeValue(child);
      if (sanitized !== undefined) output[key] = sanitized;
    }
    return output;
  }
  if (typeof value === "string") return sanitizeText(value, 520);
  return value;
}

function sanitizeText(value, maxLength = 320) {
  if (typeof value !== "string") return null;
  const redacted = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\[email&#160;protected\]/gi, "[redacted-email]")
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [redacted]")
    .replace(/\b(access_token|refresh_token|api_key|password|username)\b\s*[:=]\s*[^,\s;]+/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .trim();
  if (redacted.length <= maxLength) return redacted || null;
  return `${redacted.slice(0, maxLength - 1).trim()}…`;
}

function sanitizeUrl(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const parsed = new URL(value);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return secretishString(value) ? null : sanitizeText(value, 240);
  }
}

function secretishKey(key) {
  return /(^|[_-])(api[-_]?key|access[-_]?token|refresh[-_]?token|password|username|secret|authorization|credential|auth)([_-]|$)/i.test(
    key
  );
}

function secretishString(value) {
  return /\b(access_token|refresh_token|api_key|password|username|client_secret)\b/i.test(value);
}

function htmlToText(value) {
  if (typeof value !== "string") return null;
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;/g, "-")
    .replace(/&#038;/g, "&");
}

function stripSummaryPrefix(value) {
  return value.replace(/^Summary:\s*/i, "").trim();
}

function countOverpassElements(elements) {
  const counts = {
    total: elements.length,
    ferry_terminal: 0,
    seamark: 0,
    light: 0,
    anchorage: 0,
    pier: 0
  };
  for (const element of elements) {
    const tags = record(element.tags);
    if (tags.amenity === "ferry_terminal") counts.ferry_terminal += 1;
    if (Object.keys(tags).some((key) => key.startsWith("seamark:"))) counts.seamark += 1;
    if (String(tags["seamark:type"] ?? "").includes("light")) counts.light += 1;
    if (tags["seamark:type"] === "anchorage") counts.anchorage += 1;
    if (tags.man_made === "pier") counts.pier += 1;
  }
  return counts;
}

function sampleOverpassNames(elements) {
  const names = [];
  for (const element of elements) {
    const tags = record(element.tags);
    const name = sanitizeText(
      stringValue(tags["name:en"]) ?? stringValue(tags.name) ?? stringValue(tags["seamark:name"]),
      80
    );
    if (name && !names.includes(name)) names.push(name);
    if (names.length >= 5) break;
  }
  return names;
}

function bboxValue(value) {
  if (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  ) {
    return value;
  }
  return undefined;
}

function geometryValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const geometry = record(value);
  const type = stringValue(geometry.type);
  if (!type) return undefined;
  return sanitizeValue(geometry);
}

function compactRecord(input) {
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
      continue;
    }
    output[key] = value;
  }
  return output;
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stringValue(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function averageCurrent(samples) {
  const vectors = asArray(samples)
    .map((sample) => record(sample))
    .map((sample) => ({
      uo: numberValue(sample.uo_mps),
      vo: numberValue(sample.vo_mps)
    }))
    .filter((sample) => sample.uo !== null && sample.vo !== null);

  if (vectors.length === 0) {
    return { uo: 0, vo: 0, speed: 0 };
  }

  const uo = vectors.reduce((sum, sample) => sum + sample.uo, 0) / vectors.length;
  const vo = vectors.reduce((sum, sample) => sum + sample.vo, 0) / vectors.length;
  return {
    uo,
    vo,
    speed: Math.sqrt(uo * uo + vo * vo)
  };
}

function dantiCategory(sourceCategory) {
  const value = String(sourceCategory ?? "").toUpperCase();
  if (value === "IMAGE") return "CROSS_MODAL_CONTEXT";
  if (value === "SHIP") return "VESSEL_IDENTITY_CORROBORATION";
  return "REGIONAL_SECURITY_CONTEXT";
}

function pointGeometry(lon, lat) {
  if (typeof lon !== "number" || !Number.isFinite(lon)) return undefined;
  if (typeof lat !== "number" || !Number.isFinite(lat)) return undefined;
  return {
    type: "Point",
    coordinates: [lon, lat]
  };
}

function numberFromString(value) {
  const numeric = numberValue(value);
  if (numeric !== null) return numeric;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").map((item) => sanitizeText(item, 120))
    : [];
}

function firstString(value) {
  return stringArray(value)[0] ?? null;
}

function gdeltSeenDate(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return sanitizeText(value, 40);
  const padded = digits.slice(0, 14).padEnd(14, "0");
  const year = padded.slice(0, 4);
  const month = padded.slice(4, 6);
  const day = padded.slice(6, 8);
  const hour = padded.slice(8, 10);
  const minute = padded.slice(10, 12);
  const second = padded.slice(12, 14);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

function portWatchDate(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 10_000_000_000) {
      return new Date(numeric).toISOString();
    }
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return null;
}

function portWatchGeometry(value, attrs = {}) {
  const attributeLon =
    numberFromString(attrs.lon) ??
    numberFromString(attrs.long) ??
    numberFromString(attrs.longitude);
  const attributeLat =
    numberFromString(attrs.lat) ??
    numberFromString(attrs.latitude);
  if (attributeLon !== null && attributeLat !== null) {
    return pointGeometry(attributeLon, attributeLat);
  }

  const geometry = record(value);
  const x = numberValue(geometry.x);
  const y = numberValue(geometry.y);
  if (x !== null && y !== null) return pointGeometry(x, y);
  return geometryValue(value);
}

function objectKeys(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value)
    : [];
}

function latestTimestamp(values) {
  let latest = null;
  for (const value of values) {
    if (typeof value !== "string") continue;
    const time = Date.parse(value);
    if (!Number.isFinite(time)) continue;
    if (!latest || time > latest.time) latest = { value, time };
  }
  return latest?.value ?? null;
}

function contentTypeForFile(fileName) {
  const ext = extname(fileName).toLowerCase();
  if (ext === ".json") return "application/json";
  if (ext === ".html") return "text/html";
  if (ext === ".png") return "image/png";
  return "application/octet-stream";
}

function clamp01(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function omit(value, keys) {
  const output = { ...value };
  for (const key of keys) delete output[key];
  return output;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolvePath(value, fallback) {
  if (!value) return fallback;
  if (value instanceof URL) return fileURLToPath(value);
  return resolve(String(value));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

if (import.meta.url === new URL(process.argv[1], "file://").href) {
  const result = normalizeHormuzIntel({ write: true });
  console.log(
    `Wrote ${result.sourceDocuments.length} source documents and ${result.evidenceItems.length} evidence items.`
  );
}
