#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const DEFAULT_INPUT = "ontology.json";
const DEFAULT_MANIFEST = "foundry/generated/seaforge-datasets.json";
const DEFAULT_OUTPUT = "foundry/generated/ontology.import.generated.json";
const DEFAULT_PROJECT_FOLDER_RID =
  "ri.compass.main.folder.f63190c8-0791-4717-97bd-129c19b8f657";

const SHARED = [
  p("id", "STRING", true),
  p("title", "STRING", true),
  p("createdAt", "TIMESTAMP", true),
  p("updatedAt", "TIMESTAMP"),
  p("caseId", "STRING"),
  p("status", "STRING"),
  p("summary", "STRING"),
  p("sourceHash", "STRING"),
  p("rawJson", "STRING"),
];

const OBJECTS = [
  o("Vessel", "Vessel", "Vessels", [
    p("mmsi", "STRING"),
    p("imo", "STRING"),
    p("name", "STRING"),
    p("flag", "STRING"),
    p("callSign", "STRING"),
    p("vesselType", "STRING"),
    p("lengthM", "DOUBLE"),
    p("beamM", "DOUBLE"),
    p("currentTrackId", "STRING"),
    p("identityConfidence", "DOUBLE"),
  ]),
  o("Track", "Track", "Tracks", [
    p("trackId", "STRING", true),
    p("vesselId", "STRING"),
    p("mmsi", "STRING"),
    p("startTime", "TIMESTAMP"),
    p("endTime", "TIMESTAMP"),
    p("startLat", "DOUBLE"),
    p("startLon", "DOUBLE"),
    p("endLat", "DOUBLE"),
    p("endLon", "DOUBLE"),
    p("avgSogKnots", "DOUBLE"),
    p("avgCogDeg", "DOUBLE"),
    p("geojson", "STRING"),
  ]),
  o("Observation", "Observation", "Observations", [
    p("source", "STRING", true),
    p("sourceRecordId", "STRING", true),
    p("observedAt", "TIMESTAMP"),
    p("recordType", "STRING"),
    p("modality", "STRING"),
    p("lat", "DOUBLE"),
    p("lon", "DOUBLE"),
    p("mmsi", "STRING"),
    p("imo", "STRING"),
    p("name", "STRING"),
    p("sogKnots", "DOUBLE"),
    p("cogDeg", "DOUBLE"),
    p("qualityFlagsJson", "STRING"),
  ]),
  o("AisMessage", "AIS Message", "AIS Messages", [
    p("source", "STRING", true),
    p("sourceRecordId", "STRING", true),
    p("observedAt", "TIMESTAMP"),
    p("messageType", "STRING"),
    p("mmsi", "STRING", true),
    p("imo", "STRING"),
    p("name", "STRING"),
    p("lat", "DOUBLE"),
    p("lon", "DOUBLE"),
    p("sogKnots", "DOUBLE"),
    p("cogDeg", "DOUBLE"),
    p("navStatus", "STRING"),
    p("rawPayloadSha256", "STRING"),
  ]),
  o("Case", "Case", "Cases", [
    p("scenarioId", "STRING"),
    p("stage", "STRING"),
    p("priority", "STRING"),
    p("openedAt", "TIMESTAMP"),
    p("closedAt", "TIMESTAMP"),
    p("featuresJson", "STRING"),
  ]),
  o("Anomaly", "Anomaly", "Anomalies", [
    p("anomalyType", "STRING", true),
    p("windowStart", "TIMESTAMP"),
    p("windowEnd", "TIMESTAMP"),
    p("gapMinutes", "DOUBLE"),
    p("score", "DOUBLE"),
    p("candidateOldTrackId", "STRING"),
    p("candidateNewTrackId", "STRING"),
    p("candidateTrackId", "STRING"),
    p("aoiId", "STRING"),
    p("featuresJson", "STRING"),
  ]),
  o("Hypothesis", "Hypothesis", "Hypotheses", [
    p("hypothesisKind", "STRING", true),
    p("posterior", "DOUBLE"),
    p("confidence", "DOUBLE"),
    p("rationale", "STRING"),
  ]),
  o("Claim", "Claim", "Claims", [
    p("claimKind", "STRING", true),
    p("prior", "DOUBLE"),
    p("delta", "DOUBLE"),
    p("posterior", "DOUBLE"),
    p("confidence", "DOUBLE"),
    p("verdict", "STRING"),
  ]),
  o("EvidenceItem", "Evidence Item", "Evidence Items", [
    p("evidenceType", "STRING", true),
    p("llrNats", "DOUBLE"),
    p("modality", "STRING"),
    p("observedAt", "TIMESTAMP"),
    p("source", "STRING"),
    p("citationText", "STRING"),
    p("linkedObservationIdsJson", "STRING"),
  ]),
  o("SourceIntegrityCheck", "Signal Integrity", "Signal Integrity Checks", [
    p("sourceId", "STRING", true),
    p("integrityStatus", "STRING", true),
    p("indicatorsJson", "STRING", true),
    p("confidence", "DOUBLE"),
    p("rationale", "STRING", true),
    p("linkedEvidenceIdsJson", "STRING"),
    p("detectedAt", "TIMESTAMP"),
  ]),
  o("AreaOfInterest", "Area of Interest", "Areas of Interest", [
    p("aoiId", "STRING", true),
    p("name", "STRING", true),
    p("aoiType", "STRING"),
    p("geometryGeoJson", "STRING", true),
  ]),
  o("CollectionAction", "Collection Action", "Collection Actions", [
    p("actionType", "STRING", true),
    p("baseScore", "DOUBLE"),
    p("rank", "INTEGER"),
    p("trigger", "STRING"),
    p("requiresOperator", "BOOLEAN"),
  ]),
  o("ReviewRule", "Review Rule", "Review Rules", [
    p("displayId", "STRING", true),
    p("active", "BOOLEAN", true),
    p("sourceCaseId", "STRING"),
    p("ruleText", "STRING", true),
    p("conditionsJson", "STRING"),
    p("effectsJson", "STRING"),
  ]),
  o("OperatorDecision", "Operator Decision", "Operator Decisions", [
    p("decisionType", "STRING", true),
    p("operatorId", "STRING"),
    p("reason", "STRING"),
    p("idempotencyKey", "STRING", true),
  ]),
  o("SourceDocument", "Source Document", "Source Documents", [
    p("source", "STRING", true),
    p("url", "STRING"),
    p("retrievedAt", "TIMESTAMP"),
    p("publishedAt", "TIMESTAMP"),
    p("licenseOrTerms", "STRING"),
    p("contentSha256", "STRING"),
    p("documentText", "STRING"),
  ]),
];

const LINKS = [
  l("vesselHasTrack", "Vessel", "Track"),
  l("trackHasObservation", "Track", "Observation"),
  l("observationDerivedFromAis", "Observation", "AisMessage"),
  l("observationDerivedFromEvidence", "Observation", "EvidenceItem"),
  l("anomalyInvolvesTrack", "Anomaly", "Track"),
  l("anomalyInvolvesVessel", "Anomaly", "Vessel"),
  l("anomalyInAoi", "Anomaly", "AreaOfInterest"),
  l("claimExplainsAnomaly", "Claim", "Anomaly"),
  l("supports", "EvidenceItem", "Claim"),
  l("weakens", "EvidenceItem", "Claim"),
  l("contradicts", "EvidenceItem", "Claim"),
  l("sourceDocumentContainsEvidence", "SourceDocument", "EvidenceItem"),
  l("collectionActionAddressesAnomaly", "CollectionAction", "Anomaly"),
  l("collectionActionTestsClaim", "CollectionAction", "Claim"),
  l("decisionOnClaim", "OperatorDecision", "Claim"),
  l("decisionOnCollectionAction", "OperatorDecision", "CollectionAction"),
  l("reviewRuleScopedToAoi", "ReviewRule", "AreaOfInterest"),
  l("reviewRuleAppliedToAnomaly", "ReviewRule", "Anomaly"),
  l("appliesTo", "ReviewRule", "Case"),
  l("reviewedBy", "Case", "ReviewRule"),
  l("anomalyDerivedFromObservation", "Anomaly", "Observation"),
  l("hypothesisDerivedFromAnomaly", "Hypothesis", "Anomaly"),
  l("claimDerivedFromHypothesis", "Claim", "Hypothesis"),
  l("sourceIntegrityCheckDerivedFromEvidence", "SourceIntegrityCheck", "EvidenceItem"),
  l("collectionActionDerivedFromClaim", "CollectionAction", "Claim"),
];

const ACTIONS = [
  a("save-operator-decision", "OperatorDecision", [
    p("id", "STRING", true),
    p("decisionType", "STRING", true),
    p("operatorId", "STRING"),
    p("reason", "STRING"),
    p("targetClaimId", "STRING"),
    p("targetCollectionActionId", "STRING"),
    p("idempotencyKey", "STRING", true),
    p("createdAt", "TIMESTAMP", true),
  ]),
  a("save-review-rule", "ReviewRule", [
    p("id", "STRING", true),
    p("displayId", "STRING", true),
    p("sourceCaseId", "STRING", true),
    p("ruleText", "STRING", true),
    p("conditionsJson", "STRING"),
    p("effectsJson", "STRING"),
    p("active", "BOOLEAN", true),
    p("createdAt", "TIMESTAMP", true),
  ]),
  a("request-collection", "CollectionAction", [
    p("id", "STRING", true),
    p("caseId", "STRING", true),
    p("anomalyId", "STRING"),
    p("claimId", "STRING"),
    p("actionType", "STRING", true),
    p("trigger", "STRING"),
    p("operatorId", "STRING"),
    p("requestedAt", "TIMESTAMP", true),
  ]),
  a("update-claim-status", "Claim", [
    p("status", "STRING", true),
    p("verdict", "STRING"),
    p("updatedAt", "TIMESTAMP", true),
  ], "modify"),
  a("merge-vessel-identity", "Vessel", [
    p("survivorVesselId", "STRING", true),
    p("mergedVesselId", "STRING", true),
    p("operatorId", "STRING"),
    p("reason", "STRING"),
    p("idempotencyKey", "STRING", true),
    p("createdAt", "TIMESTAMP", true),
  ], "placeholder"),
];

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  help();
  process.exit(0);
}

const ontology = readJson(resolve(args.input));
if (args.validate) {
  const report = validate(ontology);
  printValidation(report);
  process.exit(report.errors.length ? 1 : 0);
}

const manifestPath = resolve(args.manifest);
const manifest = existsSync(manifestPath) ? readJson(manifestPath) : blankManifest();
const config = loadConfig(args.config);
const ctx = context(ontology, manifest);
recordExistingDatasetRids(ctx);

if (args.live) await createMissingDatasets(ctx, config);

const result = generate(ctx, {
  skipLinks: args.skipLinks,
  skipActions: args.skipActions,
  skipObjects: args.skipObjects,
});
checkForDuplicateApiNames(result.ontology, result.warnings, result.errors);
const canWrite = !args.planOnly && result.errors.length === 0;
printPlan(ctx, result, canWrite);

if (canWrite) {
  writeJson(manifestPath, ctx.manifest);
  writeJson(resolve(args.output), result.ontology);
  console.log(`\nWrote ${args.manifest}`);
  console.log(`Wrote ${args.output}`);
} else if (!args.planOnly) {
  console.log("\nNo files written. Run with --live or provide missing RIDs in the manifest.");
}

function p(apiName, baseType, required = false) {
  return { apiName, baseType, required };
}

function o(apiName, displayName, pluralDisplayName, ownProps) {
  return {
    apiName,
    displayName,
    pluralDisplayName,
    datasetName: `seaforge_${snake(apiName)}`,
    properties: merge(SHARED, ownProps),
  };
}

function l(apiName, from, to) {
  return { apiName, from, to, datasetName: `seaforge_link_${snake(apiName)}` };
}

function a(apiName, objectTypeApiName, inputs, mode = "add") {
  return { apiName, objectTypeApiName, inputs, mode };
}

function parseArgs(argv) {
  const out = {
    config: "config.ini",
    help: false,
    input: DEFAULT_INPUT,
    live: false,
    manifest: DEFAULT_MANIFEST,
    output: DEFAULT_OUTPUT,
    planOnly: false,
    validate: false,
    objectsOnly: false,
    linksOnly: false,
    skipLinks: false,
    skipActions: false,
    skipObjects: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") out.help = true;
    else if (arg === "--live") out.live = true;
    else if (arg === "--plan-only") out.planOnly = true;
    else if (arg === "--validate") out.validate = true;
    else if (arg === "--objects-only") out.objectsOnly = true;
    else if (arg === "--links-only") out.linksOnly = true;
    else if (arg === "--skip-links") out.skipLinks = true;
    else if (arg === "--skip-actions") out.skipActions = true;
    else if (arg === "--skip-objects") out.skipObjects = true;
    else if (arg === "--config") out.config = must(argv[++i], arg);
    else if (arg === "--input") out.input = must(argv[++i], arg);
    else if (arg === "--manifest") out.manifest = must(argv[++i], arg);
    else if (arg === "--output") out.output = must(argv[++i], arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (out.objectsOnly) {
    out.skipLinks = true;
    out.skipActions = true;
  }
  if (out.linksOnly) {
    out.skipObjects = true;
    out.skipActions = true;
  }
  return out;
}

function must(value, flag) {
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function help() {
  console.log(`Usage: node scripts/generate-seaforge-ontology-import.mjs [options]

Options:
  --live             Create missing Foundry datasets, then emit import JSON.
  --plan-only        Print the plan without writing local files.
  --validate         Validate an ontology export/import JSON and exit.
  --objects-only     Emit object types only; skip links and actions (phased import).
  --skip-links       Skip generating link types in output.
  --skip-actions     Skip generating action types in output.
  --input <path>     Source Ontology Manager export. Default: ${DEFAULT_INPUT}
  --manifest <path>  Dataset RID manifest. Default: ${DEFAULT_MANIFEST}
  --output <path>    Generated import JSON. Default: ${DEFAULT_OUTPUT}
  --config <path>    Config INI. Default: config.ini

Phased import workflow (avoids "API Name is not unique" duplicate errors):
  1. Re-export ontology.json from Foundry to capture current state.
  2. node scripts/generate-seaforge-ontology-import.mjs --objects-only \\
       --output foundry/generated/ontology.objects.json
  3. Import that JSON in Foundry; set save locations on the new objects;
     save the ontology.
  4. Re-export ontology.json again.
  5. node scripts/generate-seaforge-ontology-import.mjs   # full output
  6. Import; set save locations on links + actions; save.`);
}

function context(ontology, manifest) {
  return {
    ontology,
    manifest,
    ns: inferNamespace(ontology),
    objects: new Map((ontology.objectTypes ?? []).map((entry) => [entry.apiName, entry])),
    links: new Set(
      (ontology.relations ?? []).flatMap((relation) => {
        const many = relation.definition?.manyToMany;
        const one = relation.definition?.oneToMany;
        return [
          many?.objectTypeAToBLinkMetadata?.apiName,
          many?.objectTypeBToALinkMetadata?.apiName,
          one?.oneToManyLinkMetadata?.apiName,
          one?.manyToOneLinkMetadata?.apiName,
        ].filter(Boolean);
      }),
    ),
    actions: new Set((ontology.actionTypes ?? []).map((entry) => entry.metadata?.apiName)),
  };
}

function blankManifest() {
  return {
    version: 1,
    generatedBy: "scripts/generate-seaforge-ontology-import.mjs",
    generatedAt: null,
    projectFolderRid: DEFAULT_PROJECT_FOLDER_RID,
    resources: { objectTypeDatasets: {}, linkDatasets: {} },
  };
}

function recordExistingDatasetRids(ctx) {
  for (const spec of OBJECTS) {
    const rid = ctx.objects.get(spec.apiName)?.datasources?.[0]?.backingResourceRid;
    if (!rid) continue;
    ctx.manifest.resources.objectTypeDatasets[spec.apiName] = {
      name: spec.datasetName,
      rid,
      source: "ontology-export",
    };
  }
}

async function createMissingDatasets(ctx, config) {
  if (!config.baseUrl || !config.token) {
    throw new Error("FOUNDRY_BASE_URL and FOUNDRY_TOKEN are required for --live");
  }
  if (!config.projectFolderRidExplicit) {
    const inferredFolderRid = await inferDatasetParentFolderRid(ctx, config);
    if (inferredFolderRid) {
      config.projectFolderRid = inferredFolderRid;
      console.log(`Using existing SeaForge dataset parent folder: ${inferredFolderRid}`);
    }
  }
  ctx.manifest.generatedAt = new Date().toISOString();
  ctx.manifest.projectFolderRid = config.projectFolderRid;
  await resolveExistingDatasetsByPath(ctx, config);
  for (const spec of missingObjectDatasets(ctx)) {
    await createAndRecord(ctx, config, "objectTypeDatasets", spec.apiName, spec.datasetName);
  }
  for (const spec of missingLinkDatasets(ctx)) {
    await createAndRecord(ctx, config, "linkDatasets", spec.apiName, spec.datasetName);
  }
}

async function inferDatasetParentFolderRid(ctx, config) {
  const existing = Object.values(ctx.manifest.resources.objectTypeDatasets).find((entry) => entry?.rid);
  if (!existing?.rid) return null;
  const url = new URL(`/api/v2/datasets/${encodeURIComponent(existing.rid)}`, baseUrl(config.baseUrl));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!response.ok) return null;
  const body = await readResponse(response);
  if (body.path) config.datasetParentPath = body.path.split("/").slice(0, -1).join("/") || "/";
  return body.parentFolderRid ?? null;
}

async function resolveExistingDatasetsByPath(ctx, config) {
  const wanted = [
    ...missingObjectDatasets(ctx).map((spec) => ({
      bucket: "objectTypeDatasets",
      apiName: spec.apiName,
      name: spec.datasetName,
    })),
    ...missingLinkDatasets(ctx).map((spec) => ({
      bucket: "linkDatasets",
      apiName: spec.apiName,
      name: spec.datasetName,
    })),
  ];
  if (!wanted.length) return;

  const byName = new Map(wanted.map((entry) => [entry.name, entry]));
  const url = new URL(
    `/api/v2/filesystem/folders/${encodeURIComponent(config.projectFolderRid)}/children`,
    baseUrl(config.baseUrl),
  );
  url.searchParams.set("preview", "true");
  url.searchParams.set("pageSize", "2000");
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
    },
  });
  if (!response.ok) return;
  const body = await readResponse(response);
  let reused = 0;
  for (const resource of body.data ?? []) {
    const match = byName.get(resource.displayName);
    if (!match || !resource.rid) continue;
    ctx.manifest.resources[match.bucket][match.apiName] = {
      name: match.name,
      rid: resource.rid,
      parentFolderRid: resource.parentFolderRid ?? config.projectFolderRid,
      source: "filesystem-existing",
      path: resource.path,
    };
    reused += 1;
    console.log(`Reused existing dataset ${match.name}: ${resource.rid}`);
  }
  if (reused) writeJson(resolve(args.manifest), ctx.manifest);
}

async function createAndRecord(ctx, config, bucket, apiName, name) {
  const url = new URL("/api/v2/datasets", baseUrl(config.baseUrl));
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ parentFolderRid: config.projectFolderRid, name }),
  });
  const body = await readResponse(response);
  if (!response.ok) {
    throw new Error(
      `Failed to create dataset ${name}: ${body.errorCode ?? response.status} ${body.message ?? ""}`.trim(),
    );
  }
  ctx.manifest.resources[bucket][apiName] = {
    name,
    rid: body.rid,
    parentFolderRid: body.parentFolderRid ?? config.projectFolderRid,
    source: "created",
    createdAt: new Date().toISOString(),
  };
  writeJson(resolve(args.manifest), ctx.manifest);
  console.log(`Created ${name}: ${body.rid}`);
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function generate(ctx, options = {}) {
  const ontology = clone(ctx.ontology);
  const warnings = [];
  const errors = [];
  ontology.objectTypes = reconcileObjects(ctx, errors, warnings);
  if (options.skipLinks) {
    ontology.relations = clone(ctx.ontology.relations ?? []);
    warnings.push("Skipping new link type generation; existing relations passed through unchanged.");
  } else {
    ontology.relations = reconcileLinks(ctx, ontology.objectTypes, errors, warnings);
  }
  if (options.skipActions) {
    ontology.actionTypes = (clone(ctx.ontology.actionTypes ?? [])).map((actionType) =>
      sanitizeExistingActionType(actionType, warnings),
    );
    warnings.push("Skipping new action type generation; existing actions passed through unchanged.");
  } else {
    ontology.actionTypes = reconcileActions(ctx, ontology.objectTypes, errors, warnings);
  }
  if (options.skipObjects) {
    const seaforgeNew = new Set(
      OBJECTS.filter((spec) => !ctx.objects.has(spec.apiName)).map((spec) => spec.apiName),
    );
    ontology.objectTypes = (ontology.objectTypes ?? []).filter(
      (entry) => !seaforgeNew.has(entry.apiName),
    );
    warnings.push("Skipping new object generation (--skip-objects / --links-only); existing objects passed through unchanged for link references.");
  }
  if (/FOUNDRY_TOKEN|Bearer\s+[A-Za-z0-9._-]{20,}/.test(JSON.stringify(ontology))) {
    errors.push("Generated ontology JSON appears to contain a token.");
  }
  return { ontology, warnings, errors };
}

function reconcileObjects(ctx, errors, warnings) {
  const all = clone(ctx.ontology.objectTypes ?? []);
  for (const spec of OBJECTS) {
    const rid = ctx.manifest.resources.objectTypeDatasets[spec.apiName]?.rid;
    if (!rid) {
      errors.push(`Missing backing dataset RID for object type ${spec.apiName}`);
      continue;
    }
    const index = all.findIndex((entry) => entry.apiName === spec.apiName);
    if (index >= 0) all[index] = patchObject(all[index], spec, rid, warnings);
    else all.push(newObject(ctx, spec, rid));
  }
  return sortApi(all);
}

function patchObject(entry, spec, datasetRid, warnings) {
  const out = clone(entry);
  out.primaryKeys = ["id"];
  out.titlePropertyId = "id";
  out.displayMetadata = {
    ...out.displayMetadata,
    description: out.displayMetadata?.description ?? "",
    displayName: spec.displayName,
    pluralDisplayName: spec.pluralDisplayName,
    visibility: out.displayMetadata?.visibility ?? "NORMAL",
  };
  const props = (out.properties ?? [])
    .filter((property) => property.apiName !== "newProperty6")
    .map((property) => retargetProperty(property, datasetRid));
  if ((out.properties ?? []).some((property) => property.apiName === "newProperty6")) {
    warnings.push("Removed accidental Claim.newProperty6 from generated import.");
  }
  const seen = new Set(props.map((property) => property.apiName));
  for (const prop of spec.properties) {
    if (!seen.has(prop.apiName)) props.push(newProperty(prop, datasetRid));
  }
  out.properties = sortApi(props);
  out.trackEditHistory = true;
  out.storeAllPreviousProperties = true;
  return out;
}

function newObject(ctx, spec, datasetRid) {
  return {
    id: `${ctx.ns}.seaforge-${kebab(spec.apiName)}`,
    apiName: spec.apiName,
    status: { type: "experimental", experimental: {} },
    redacted: null,
    primaryKeys: ["id"],
    properties: sortApi(spec.properties.map((prop) => newProperty(prop, datasetRid))),
    datasources: [
      { version: "v2", backingResourceRid: datasetRid, redacted: false, canViewBackingResource: true, type: "dataset" },
    ],
    propertyValuePointerDatasources: { timeSeriesConfig: {} },
    onlyAllowPrivilegedEdits: false,
    titlePropertyId: "id",
    displayMetadata: {
      description: "",
      displayName: spec.displayName,
      groupDisplayName: null,
      icon: { type: "blueprint", blueprint: { color: "#4C90F0", locator: "cube" } },
      pluralDisplayName: spec.pluralDisplayName,
      visibility: "NORMAL",
    },
    traits: { actionLogMetadata: null, sensorTrait: null, workflowObjectTypeTraits: {} },
    entityConfig: highbury(),
    arePatchesEnabled: true,
    targetStorageBackend: objectStorageV2(),
    actionLogsRequired: false,
    editsResolutionStrategies: {},
    aliases: [],
    stagedSchemaMigrations: { migrations: {} },
    migrationStatus: migrationNotAttempted(),
    copyEditsWhenIndexingOnBranch: true,
    interfaces: [],
    typeGroups: [],
    trackEditHistory: true,
    storeAllPreviousProperties: true,
    isHighScaleIndexingEnabled: false,
    streamingProfileConfig: "DEFAULT",
    enableInterfaceActions: false,
  };
}

function retargetProperty(property, datasetRid) {
  const out = clone(property);
  if (out.source?.datasourceBackingResourceRid) out.source.datasourceBackingResourceRid = datasetRid;
  if (out.apiName === "id") out.primaryKeyMapping = { [datasetRid]: { columnName: "primary-key" } };
  return out;
}

function newProperty(spec, datasetRid) {
  const primary = spec.apiName === "id";
  return {
    id: snake(spec.apiName),
    apiName: spec.apiName,
    sharedPropertyTypeApiName: null,
    displayMetadata: { description: null, displayName: spec.apiName, visibility: "NORMAL" },
    indexedForSearch: true,
    ruleSetBinding: null,
    baseFormatter: null,
    type: "singular",
    typeClasses: [],
    status: { type: "experimental", experimental: {} },
    inlineAction: null,
    sharedPropertyTypeRid: null,
    source: primary
      ? { columnName: "primary-key", datasourceBackingResourceRid: datasetRid, type: "datasourceColumn" }
      : { datasourceBackingResourceRid: datasetRid, type: "editOnly" },
    baseType: baseType(spec.baseType),
    primaryKeyMapping: primary ? { [datasetRid]: { columnName: "primary-key" } } : {},
    searchCapabilities: { wildcardOptimized: false, regexIndexed: false },
    renderHints: spec.baseType === "STRING" ? ["SELECTABLE", "SORTABLE"] : spec.baseType === "BOOLEAN" ? ["LOW_CARDINALITY", "SELECTABLE"] : [],
  };
}

function reconcileLinks(ctx, objectTypes, errors, warnings) {
  const all = clone(ctx.ontology.relations ?? []);
  const objects = new Map(objectTypes.map((entry) => [entry.apiName, entry]));
  for (const spec of LINKS) {
    if (ctx.links.has(spec.apiName)) continue;
    const rid = ctx.manifest.resources.linkDatasets[spec.apiName]?.rid;
    if (!rid) {
      errors.push(`Missing backing dataset RID for link type ${spec.apiName}`);
      continue;
    }
    const from = objects.get(spec.from);
    const to = objects.get(spec.to);
    if (!from || !to) {
      errors.push(`Cannot create link ${spec.apiName}: missing ${spec.from} or ${spec.to}`);
      continue;
    }
    all.push(newManyToMany(ctx, spec, from, to, rid));
  }
  warnings.push("Generated many-to-many links use the exported JSON shape. Review link mappings in Ontology Manager before saving.");
  return all;
}

function newManyToMany(ctx, spec, from, to, datasetRid) {
  return {
    id: `${ctx.ns}.seaforge-link-${kebab(spec.apiName)}`,
    description: null,
    status: { type: "experimental", experimental: {} },
    redacted: null,
    definition: {
      type: "manyToMany",
      manyToMany: {
        objectTypeAToBLinkMetadata: linkMetadata(spec.apiName, spec.to),
        objectTypeBToALinkMetadata: linkMetadata(`reverse${pascal(spec.apiName)}`, spec.from),
        ...(from.rid ? { objectTypeRidA: from.rid } : {}),
        ...(to.rid ? { objectTypeRidB: to.rid } : {}),
        objectTypeAPrimaryKeyPropertyMapping: {},
        objectTypeBPrimaryKeyPropertyMapping: {},
        peeringMetadata: null,
        joinTableDatasource: [
          { version: "v1", backingResourceRid: datasetRid, redacted: false, canViewBackingResource: true, type: "dataset" },
        ],
        objectTypeAPrimaryKey: "id",
        objectTypeBPrimaryKey: "id",
        onlyAllowPrivilegedEdits: false,
        objectTypeIdA: from.id,
        objectTypeIdB: to.id,
      },
    },
    entityConfig: highbury(),
    arePatchesEnabled: false,
    targetStorageBackend: objectStorageV2(),
    migrationStatus: migrationNotAttempted(),
  };
}

function linkMetadata(apiName, targetApiName) {
  const target = OBJECTS.find((spec) => spec.apiName === targetApiName);
  return {
    displayMetadata: {
      displayName: words(apiName),
      groupDisplayName: null,
      pluralDisplayName: target?.pluralDisplayName ?? words(targetApiName),
      visibility: "NORMAL",
    },
    typeClasses: [],
    apiName,
  };
}

function reconcileActions(ctx, objectTypes, errors, warnings) {
  const all = (clone(ctx.ontology.actionTypes ?? [])).map((actionType) =>
    sanitizeExistingActionType(actionType, warnings),
  );
  const objects = new Map(objectTypes.map((entry) => [entry.apiName, entry]));
  const validation = clone(all.find((entry) => entry.actionTypeLogic?.validation)?.actionTypeLogic.validation) ?? {
    actionTypeLevelValidationV2: { rules: {}, ordering: [] },
  };
  for (const spec of ACTIONS) {
    if (ctx.actions.has(spec.apiName)) continue;
    const objectType = objects.get(spec.objectTypeApiName);
    if (!objectType) {
      errors.push(`Cannot create action ${spec.apiName}: missing object type ${spec.objectTypeApiName}`);
      continue;
    }
    all.push(newAction(spec, objectType, validation));
    if (spec.mode === "placeholder") {
      warnings.push(`${spec.apiName} is emitted as a parameter/action placeholder; merge logic needs manual review.`);
    }
  }
  warnings.push("Generated spec actions are schema placeholders. Review action logic in Ontology Manager before using them from the app.");
  return all;
}

function sanitizeExistingActionType(actionType, warnings) {
  const out = clone(actionType);
  if (out.metadata?.apiName === "create-claim") {
    stripActionParameter(out, "newProperty6", "new_property_6");
    warnings.push("Removed create-claim references to Claim.newProperty6.");
  }
  return out;
}

function stripActionParameter(actionType, parameterId, propertyId) {
  if (Array.isArray(actionType.metadata?.parameterOrdering)) {
    actionType.metadata.parameterOrdering = actionType.metadata.parameterOrdering.filter(
      (entry) => entry !== parameterId,
    );
  }
  if (Array.isArray(actionType.metadata?.formContentInOrder)) {
    actionType.metadata.formContentInOrder = actionType.metadata.formContentInOrder.filter(
      (entry) => entry?.parameter?.id !== parameterId,
    );
  }
  const tableConfig =
    actionType.metadata?.displayMetadata?.configuration?.displayAndFormat?.table
      ?.columnWidthByParameterRid;
  if (tableConfig && typeof tableConfig === "object") {
    delete tableConfig[parameterId];
  }

  for (const rule of actionType.actionTypeLogic?.logic?.rules ?? []) {
    for (const key of ["addObjectRule", "modifyObjectRule"]) {
      const propertyValues = rule[key]?.propertyValues;
      if (!propertyValues || typeof propertyValues !== "object") continue;
      delete propertyValues[propertyId];
      for (const [propertyKey, value] of Object.entries(propertyValues)) {
        if (value?.parameterId === parameterId) delete propertyValues[propertyKey];
      }
    }
  }
}

function newAction(spec, objectType, validation) {
  return {
    actionTypeLogic: {
      logic: { rules: [actionRule(spec, objectType)] },
      validation,
      revert: null,
      webhooks: null,
      notifications: [],
      effects: null,
    },
    metadata: {
      apiName: spec.apiName,
      version: "1.0",
      displayMetadata: {
        displayName: words(spec.apiName),
        description: "",
        toolDescription: null,
        icon: { type: "blueprint", blueprint: { color: "#4C90F0", locator: spec.mode === "modify" ? "edit" : "cube-add" } },
        typeClasses: [],
        successMessage: [],
        successMessageEnabled: true,
        applyingMessage: [],
        applyingMessageEnabled: true,
        submitButtonDisplayMetadata: null,
        undoButtonConfiguration: null,
        configuration: {
          defaultLayout: "FORM",
          displayAndFormat: { table: { columnWidthByParameterRid: {}, enableFileImport: true, fitHorizontally: false, frozenColumnCount: 0, rowHeightInLines: 1 } },
          enableLayoutUserSwitch: false,
        },
      },
      parameterOrdering: spec.inputs.map((input) => input.apiName),
      actionLogConfiguration: null,
      status: { type: "experimental", experimental: {} },
      entities: { affectedObjectTypes: [objectType.id], affectedLinkTypes: [], affectedInterfaceTypes: [], typeGroups: [] },
      actionApplyClientSettings: null,
      notificationSettings: { renderingSettings: { type: "allNotificationRenderingMustSucceed", allNotificationRenderingMustSucceed: {} }, redactionOverride: null },
      provenance: null,
      submissionConfiguration: null,
      stagingMediaSetRid: null,
      branchSettings: {
        webhooksMode: { type: "disableWebhooksOnBranches", disableWebhooksOnBranches: {} },
        notificationsMode: { type: "disableNotificationsOnBranches", disableNotificationsOnBranches: {} },
        functionsWithExternalCallsMode: { type: "disableFunctionsWithExternalCallsOnBranches", disableFunctionsWithExternalCallsOnBranches: {} },
      },
      scenarioSettings: { scenarioExecutionOnlyMode: { type: "noExecutionRestriction", noExecutionRestriction: {} } },
      formContentInOrder: spec.inputs.map((input) => ({ parameter: parameter(input), type: "parameter" })),
    },
  };
}

function actionRule(spec, objectType) {
  if (spec.mode === "modify") {
    return {
      type: "modifyObjectRule",
      modifyObjectRule: {
        logicRuleRid: syntheticRid(spec.apiName),
        objectToModify: objectType.apiName,
        propertyValues: Object.fromEntries(
          spec.inputs
            .filter((input) => !input.apiName.endsWith("Id") && input.apiName !== "operatorId")
            .map((input) => [snake(input.apiName), { type: "parameterId", parameterId: input.apiName }]),
        ),
        structFieldValues: {},
      },
    };
  }
  return {
    type: "addObjectRule",
    addObjectRule: {
      logicRuleRid: syntheticRid(spec.apiName),
      objectTypeId: objectType.id,
      propertyValues: Object.fromEntries(spec.inputs.map((input) => [snake(input.apiName), { type: "parameterId", parameterId: input.apiName }])),
      structFieldValues: {},
    },
  };
}

function parameter(input) {
  return {
    id: input.apiName,
    type: parameterType(input.baseType),
    displayMetadata: { displayName: input.apiName, typeClasses: [], description: "", structFields: {}, structFieldsV2: [] },
    validation: {
      conditionalOverrides: [],
      defaultValidation: {
        display: { visibility: { type: "editable", editable: {} }, renderHint: parameterHint(input.baseType), prefill: null },
        validation: {
          required: input.required ? { type: "required", required: {} } : { type: "notRequired", notRequired: {} },
          allowedValues: allowedValues(input.baseType),
        },
      },
      structFieldValidations: {},
    },
  };
}

function checkForDuplicateApiNames(ontology, warnings, errors) {
  const seaforgeObjects = new Set(OBJECTS.map((spec) => spec.apiName));
  const seaforgeLinks = new Set(LINKS.map((spec) => spec.apiName));
  const seaforgeActions = new Set(ACTIONS.map((spec) => spec.apiName));

  const objectCounts = new Map();
  for (const entry of ontology.objectTypes ?? []) {
    if (!entry.apiName || !seaforgeObjects.has(entry.apiName)) continue;
    objectCounts.set(entry.apiName, (objectCounts.get(entry.apiName) ?? 0) + 1);
  }
  for (const [apiName, count] of objectCounts) {
    if (count > 1) {
      errors.push(
        `Duplicate SeaForge object type apiName "${apiName}" appears ${count}× in output. Your ontology.json input is stale — re-export it from Foundry so existing entities are matched and patched instead of recreated.`,
      );
    }
  }

  const linkCounts = new Map();
  for (const relation of ontology.relations ?? []) {
    const many = relation.definition?.manyToMany;
    const one = relation.definition?.oneToMany;
    const names = [
      many?.objectTypeAToBLinkMetadata?.apiName,
      many?.objectTypeBToALinkMetadata?.apiName,
      one?.oneToManyLinkMetadata?.apiName,
      one?.manyToOneLinkMetadata?.apiName,
    ].filter(Boolean);
    for (const apiName of names) {
      if (!seaforgeLinks.has(apiName)) continue;
      linkCounts.set(apiName, (linkCounts.get(apiName) ?? 0) + 1);
    }
  }
  for (const [apiName, count] of linkCounts) {
    if (count > 1) {
      errors.push(
        `Duplicate SeaForge link type apiName "${apiName}" appears ${count}× in output. Re-export ontology.json before regenerating.`,
      );
    }
  }

  const actionCounts = new Map();
  for (const entry of ontology.actionTypes ?? []) {
    const apiName = entry.metadata?.apiName;
    if (!apiName || !seaforgeActions.has(apiName)) continue;
    actionCounts.set(apiName, (actionCounts.get(apiName) ?? 0) + 1);
  }
  for (const [apiName, count] of actionCounts) {
    if (count > 1) {
      errors.push(
        `Duplicate SeaForge action type apiName "${apiName}" appears ${count}× in output. Re-export ontology.json before regenerating.`,
      );
    }
  }
}

function validate(ontology) {
  const errors = [];
  const warnings = [];
  const objects = new Set((ontology.objectTypes ?? []).map((entry) => entry.apiName));
  const actions = new Set((ontology.actionTypes ?? []).map((entry) => entry.metadata?.apiName));
  const links = new Set(
    (ontology.relations ?? []).flatMap((relation) => {
      const many = relation.definition?.manyToMany;
      const one = relation.definition?.oneToMany;
      return [
        many?.objectTypeAToBLinkMetadata?.apiName,
        many?.objectTypeBToALinkMetadata?.apiName,
        one?.oneToManyLinkMetadata?.apiName,
        one?.manyToOneLinkMetadata?.apiName,
      ].filter(Boolean);
    }),
  );
  for (const spec of OBJECTS) {
    const objectType = (ontology.objectTypes ?? []).find((entry) => entry.apiName === spec.apiName);
    if (!objectType) {
      errors.push(`Missing object type ${spec.apiName}`);
      continue;
    }
    if (!objectType.primaryKeys?.includes("id")) errors.push(`${spec.apiName} does not use id as primary key`);
    if (objectType.titlePropertyId !== "id") warnings.push(`${spec.apiName} title property is not id`);
    const props = new Set((objectType.properties ?? []).map((entry) => entry.apiName));
    for (const property of spec.properties) {
      if (!props.has(property.apiName)) errors.push(`${spec.apiName} missing property ${property.apiName}`);
    }
  }
  for (const spec of LINKS) if (!links.has(spec.apiName)) errors.push(`Missing link type ${spec.apiName}`);
  for (const spec of ACTIONS) if (!actions.has(spec.apiName)) errors.push(`Missing action type ${spec.apiName}`);
  if (!objects.has("SourceIntegrityCheck")) warnings.push("Signal Integrity object is absent.");
  if (/FOUNDRY_TOKEN|Bearer\s+[A-Za-z0-9._-]{20,}/.test(JSON.stringify(ontology))) errors.push("Ontology JSON appears to contain a token.");
  return { errors, warnings };
}

function printPlan(ctx, result, canWrite) {
  const missingObjects = OBJECTS.filter((spec) => !ctx.objects.has(spec.apiName));
  const missingLinks = LINKS.filter((spec) => !ctx.links.has(spec.apiName));
  const missingActions = ACTIONS.filter((spec) => !ctx.actions.has(spec.apiName));
  const objectDatasets = missingObjectDatasets(ctx);
  const linkDatasets = missingLinkDatasets(ctx);
  console.log("SeaForge ontology import generation");
  console.log(`- Input object types: ${ctx.ontology.objectTypes?.length ?? 0}`);
  console.log(`- Missing SeaForge object types in input: ${missingObjects.length}`);
  console.log(`- Missing SeaForge link types in input: ${missingLinks.length}`);
  console.log(`- Missing spec action types in input: ${missingActions.length}`);
  console.log(`- Object backing datasets still needed: ${objectDatasets.length}`);
  console.log(`- Link backing datasets still needed: ${linkDatasets.length}`);
  console.log(`- Output status: ${canWrite ? "ready to write" : "blocked"}`);
  if (missingObjects.length) console.log(`\nMissing objects: ${missingObjects.map((entry) => entry.apiName).join(", ")}`);
  if (objectDatasets.length) console.log(`Missing object datasets: ${objectDatasets.map((entry) => entry.datasetName).join(", ")}`);
  if (linkDatasets.length) console.log(`Missing link datasets: ${linkDatasets.map((entry) => entry.datasetName).join(", ")}`);
  if (result.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of result.warnings) console.log(`- ${warning}`);
  }
  if (result.errors.length) {
    console.log("\nErrors:");
    for (const error of result.errors) console.log(`- ${error}`);
  }
}

function printValidation(report) {
  console.log("SeaForge ontology validation");
  if (report.warnings.length) {
    console.log("\nWarnings:");
    for (const warning of report.warnings) console.log(`- ${warning}`);
  }
  if (report.errors.length) {
    console.log("\nErrors:");
    for (const error of report.errors) console.log(`- ${error}`);
  } else {
    console.log("- All required SeaForge object, link, and action API names are present.");
  }
}

function missingObjectDatasets(ctx) {
  return OBJECTS.filter((spec) => !ctx.manifest.resources.objectTypeDatasets[spec.apiName]?.rid);
}

function missingLinkDatasets(ctx) {
  return LINKS.filter((spec) => !ctx.links.has(spec.apiName) && !ctx.manifest.resources.linkDatasets[spec.apiName]?.rid);
}

function loadConfig(path) {
  const envProjectFolderRid =
    process.env.FOUNDRY_DATASET_PARENT_FOLDER_RID ||
    process.env.FOUNDRY_PROJECT_RID ||
    process.env.FOUNDRY_PROJECT_FOLDER_RID;
  const config = {
    baseUrl: process.env.FOUNDRY_BASE_URL,
    token: process.env.FOUNDRY_TOKEN,
    projectFolderRid: envProjectFolderRid || DEFAULT_PROJECT_FOLDER_RID,
    projectFolderRidExplicit: Boolean(envProjectFolderRid),
  };
  if (!existsSync(path)) return config;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith(";") || line.startsWith("[")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = unquote(stripComment(line.slice(eq + 1).trim()));
    if (!value) continue;
    if (key === "FOUNDRY_BASE_URL" && !config.baseUrl) config.baseUrl = value;
    if (key === "FOUNDRY_TOKEN" && !config.token) config.token = value;
    if (
      [
        "FOUNDRY_DATASET_PARENT_FOLDER_RID",
        "FOUNDRY_PROJECT_RID",
        "FOUNDRY_PROJECT_FOLDER_RID",
        "FOUNDRY_FOLDER_RID",
      ].includes(key)
    ) {
      config.projectFolderRid = value;
      config.projectFolderRidExplicit = true;
    }
  }
  return config;
}

function stripComment(value) {
  let quote = "";
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if ((char === "\"" || char === "'") && value[i - 1] !== "\\") quote = quote === char ? "" : char;
    if (!quote && (char === "#" || char === ";")) return value.slice(0, i).trim();
  }
  return value;
}

function unquote(value) {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  return value;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function baseUrl(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

function baseType(type) {
  return type === "STRING" ? { type: "STRING", supportsExactMatching: true } : { type };
}

function parameterType(type) {
  if (type === "TIMESTAMP") return { type: "timestamp", timestamp: { configuration: null } };
  if (type === "DOUBLE") return { type: "double", double: {} };
  if (type === "INTEGER") return { type: "integer", integer: {} };
  if (type === "BOOLEAN") return { type: "boolean", boolean: {} };
  return { type: "string", string: {} };
}

function parameterHint(type) {
  if (type === "TIMESTAMP") return { type: "dateTimePicker", dateTimePicker: {} };
  if (type === "DOUBLE" || type === "INTEGER") return { type: "numericInput", numericInput: {} };
  if (type === "BOOLEAN") return { type: "toggle", toggle: {} };
  return { type: "textInput", textInput: {} };
}

function allowedValues(type) {
  if (type === "TIMESTAMP") return { type: "datetime", datetime: { type: "datetime", datetime: { minimum: null, maximum: null } } };
  if (type === "DOUBLE" || type === "INTEGER") return { type: "range", range: { type: "range", range: { minimum: null, maximum: null } } };
  if (type === "BOOLEAN") return { type: "boolean", boolean: {} };
  return { type: "text", text: { type: "text", text: { minLength: null, maxLength: null, regex: null } } };
}

function highbury() {
  return { objectDbTypeConfigs: { highbury: { objectDbConfigs: { "ri.highbury.main.cluster.1": { configValue: "{}" } } } } };
}

function objectStorageV2() {
  return { type: "objectStorageV2", objectStorageV2: { migrationConfiguration: null, editsHistoryImportConfiguration: null, archiveState: null } };
}

function migrationNotAttempted() {
  return { type: "migrationNotAttempted", migrationNotAttempted: {} };
}

function inferNamespace(ontology) {
  return ontology.objectTypes?.find((entry) => entry.id)?.id?.split(".")[0] ?? "seaforge";
}

function syntheticRid(seed) {
  return `ri.actions.main.logic-rule.${uuid(seed)}`;
}

function uuid(seed) {
  const hash = createHash("sha256").update(seed).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hash.slice(18, 20)}-${hash.slice(20, 32)}`;
}

function merge(...groups) {
  const seen = new Set();
  const out = [];
  for (const group of groups) {
    for (const item of group) {
      if (seen.has(item.apiName)) continue;
      seen.add(item.apiName);
      out.push(item);
    }
  }
  return out;
}

function sortApi(items) {
  return [...items].sort((left, right) => (left.apiName ?? left.metadata?.apiName ?? "").localeCompare(right.apiName ?? right.metadata?.apiName ?? ""));
}

function snake(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function kebab(value) {
  return snake(value).replace(/_/g, "-");
}

function pascal(value) {
  return value.replace(/(^|[^A-Za-z0-9])([A-Za-z0-9])/g, (_, __, char) => char.toUpperCase()).replace(/[^A-Za-z0-9]/g, "");
}

function lowerFirst(value) {
  return `${value.slice(0, 1).toLowerCase()}${value.slice(1)}`;
}

function words(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}
