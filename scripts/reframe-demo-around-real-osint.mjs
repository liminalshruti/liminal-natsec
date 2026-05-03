import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function writeJson(path, value) {
  writeFileSync(join(root, path), `${JSON.stringify(value, null, 2)}\n`);
}

function nodeById(file, id) {
  const node = file.nodes.find((entry) => entry.id === id);
  if (!node) throw new Error(`missing node ${id}`);
  return node;
}

function edgeById(file, id) {
  const edge = file.edges.find((entry) => entry.id === id);
  if (!edge) throw new Error(`missing edge ${id}`);
  return edge;
}

function mergeData(node, data) {
  node.data = { ...(node.data ?? {}), ...data };
}

const anomalies = readJson("fixtures/maritime/anomalies.json");
const claims = readJson("fixtures/maritime/claims.json");
const hypotheses = readJson("fixtures/maritime/hypotheses.json");
const evidence = readJson("fixtures/maritime/evidence.json");
const actions = readJson("fixtures/maritime/actions.json");
const reads = readJson("fixtures/maritime/specialist-reads.json");
const hormuzEvidence = readJson("fixtures/maritime/hormuz-evidence-items.json");
const scenarioJsonl = [
  {
    event: "observation",
    id: "ev:hormuz:gfw-identity-history-huge:0c3fa53dc5",
    case_id: "case:alara-01:event-1",
    at: "2026-05-03T14:40:05Z",
    summary: "GFW resolves HUGE IMO 9357183 to current MMSI 422206900 / IRN after 7 broadcast identities."
  },
  {
    event: "anomaly",
    id: "anom:identity-churn:trk-caldera:20260418T1015:1f44",
    case_id: "case:alara-01:event-1",
    at: "2026-05-03T14:41:35Z",
    summary: "OFAC-listed Iranian crude tanker HUGE is broadcasting under a different MMSI than the SDN row."
  },
  {
    event: "hypothesis",
    id: "hyp:alara-01:event-1:h1",
    case_id: "case:alara-01:event-1",
    at: "2026-05-03T14:42:00Z",
    summary: "Same IMO, changed broadcast identity; identity risk is supported but intent is not inferred."
  },
  {
    event: "claim",
    id: "claim:alara-01:event-1:custody:h1",
    case_id: "case:alara-01:event-1",
    at: "2026-05-03T14:43:00Z",
    summary: "Identity custody is supported by OFAC + GFW, with MMSI mismatch preserved as the key contested fact."
  },
  {
    event: "action_option",
    id: "act:alara-01:event-1:request-sar-rf",
    case_id: "case:alara-01:event-1",
    at: "2026-05-03T14:44:00Z",
    summary: "Recommend collection/provenance retention, not intent assertion."
  },
  {
    event: "review_rule",
    id: "rr:watchfloor:dark-gap-sar-first:v1",
    case_id: "case:alara-01:event-1",
    at: "2026-05-03T14:45:00Z",
    summary: "Operator doctrine: when identity is real but behavior is underdetermined, collect before intent."
  },
  {
    event: "second_case_changed",
    id: "case:alara-01:event-2",
    case_id: "case:alara-01:event-2",
    at: "2026-05-03T14:46:00Z",
    summary: "Same doctrine now governs the wider Hormuz traffic/advisory synthesis.",
    refs: ["act:alara-01:event-2:monitor", "act:alara-01:event-2:request-sar-rf"]
  }
];

const case1 = nodeById(anomalies, "case:alara-01:event-1");
case1.title = "OFAC-listed HUGE identity churn";
case1.status = "OPEN";
mergeData(case1, {
  scenario_id: "scenario:hormuz-real-osint",
  stage: "ofac_gfw_identity_case",
  lead_summary:
    "OFAC lists Iranian crude tanker HUGE (IMO 9357183) under MMSI 212256000, while GFW shows the same IMO currently broadcasting as MMSI 422206900 / IRN after seven AIS identity tuples.",
  key_findings: [
    "7 broadcast identities since 2012: SVS GILBERT -> HATEF -> GLORY -> HUGE -> unnamed -> HUGE/PAN -> HUGE/IRN.",
    "Current GFW identity: MMSI 422206900, IRN flag, callsign EPJE5, last received 2026-03-20.",
    "OFAC-listed MMSI 212256000 corresponds to the 2012 Cyprus/HATEF broadcast, not the current AIS identity.",
    "The system supports identity-risk enrichment but refuses to infer hostile intent without behavior corroboration."
  ],
  source_mix: ["OFAC SDN", "Global Fishing Watch vessel identity", "OpenSanctions"],
  features: {
    ...(case1.data?.features ?? {}),
    gap_minutes: 49.3,
    candidate_continuity_score: 0.92,
    danti_geo_time_corroboration: true,
    aoi_id: "aoi:alara-eez-box-01",
    imo_match: true,
    mmsi_match: false,
    ofac_program: "IRAN",
    gfw_identity_count: 7
  }
});

const case2 = nodeById(anomalies, "case:alara-01:event-2");
case2.title = "Hormuz vessel-density risk synthesis";
case2.status = "OPEN";
mergeData(case2, {
  scenario_id: "scenario:hormuz-real-osint",
  stage: "hormuz_synthesis_case",
  lead_summary:
    "DANTI/MarineTraffic, OFAC, GFW, MARAD, and NAVAREA-IX converge on a Hormuz operating picture: sanctioned Iranian-linked vessels, grey-market destinations, loitering clusters, identity churn, and active maritime warnings.",
  key_findings: [
    "21 known IRISL/NITC/OFAC SDN vessels have live DANTI coordinates, including ADRIAN DARYA, HAMOUNA, AZARGOUN, KASHAN, SHAYAN 1, AMIR ABBAS, MATIN, and KAMINEH.",
    "Loitering clusters appear at Qeshm and Bandar Abbas anchorage; 7 NITC-linked tankers are stationary near Qeshm and 14+ vessels cluster near Bandar Abbas.",
    "Foreign-flagged tankers with Iranian last_port include YEKTA II, ELPIS, KOTOKU MARU NO.10, and CAPILANO in the cache; TINA II and MARIVEX are tracked as watchlist gaps if not in the visible DANTI slice.",
    "65 vessels advertise TO ORDER / FOR ORDER / CHINA OWNER&CREW destinations, consistent with grey-market Iran-to-China oil-flow indicators.",
    "ROSHAK reports 31 kt, physically implausible for the vessel class, so the map treats it as a spoofing/data-quality signal.",
    "MARAD MSCI 2026-004 and NAVAREA-IX warnings provide regional risk context, including SAFEEN PRESTIGE reported sunk and a Yemen tanker hijacking warning."
  ],
  source_mix: ["DANTI/MarineTraffic", "OFAC", "GFW", "MARAD MSCI", "NAVAREA IX"],
  features: {
    ...(case2.data?.features ?? {}),
    gap_minutes: 45,
    candidate_continuity_score: 0.84,
    danti_geo_time_corroboration: true,
    aoi_id: "aoi:alara-eez-box-01",
    sanctioned_live_vessels: 21,
    ofac_iran_program_vessels: 50,
    grey_market_destination_vessels: 65,
    marad_2026_004_overlap_gaps: 4
  }
});

const anom1 = nodeById(anomalies, "anom:identity-churn:trk-caldera:20260418T1015:1f44");
anom1.title = "OFAC-listed HUGE broadcasting under unlisted MMSI";
mergeData(anom1, {
  anomaly_type: "OFAC_GFW_IDENTITY_CHURN",
  window_start: "2012-01-01T00:00:00Z",
  window_end: "2026-03-20T02:09:30Z",
  imo: "9357183",
  vessel_name: "HUGE",
  ofac_listed_mmsi: "212256000",
  current_gfw_mmsi: "422206900",
  current_flag: "IRN",
  identity_count: 7,
  score: 0.92
});

const anom2 = nodeById(anomalies, "anom:dark-gap:trk-271990222:20260418T1220:cc90");
anom2.title = "Hormuz sanctioned, grey-market, and advisory convergence";
mergeData(anom2, {
  anomaly_type: "HORMUZ_OSINT_CONVERGENCE",
  window_start: "2026-04-02T14:36:59Z",
  window_end: "2026-05-03T14:46:00Z",
  score: 0.84,
  sanctioned_live_vessels: 21,
  grey_market_destination_vessels: 65,
  loiter_clusters: ["Qeshm", "Bandar Abbas Anchorage"],
  warning_context: ["MARAD MSCI 2026-004", "MARAD MSCI 2026-006", "NAVAREA IX 113/26", "NAVAREA IX 146/26"]
});

const claim1 = nodeById(claims, "claim:alara-01:event-1:custody:h1");
claim1.title = "HUGE identity-risk enrichment is supported";
claim1.status = "SUPPORTED";
mergeData(claim1, {
  claim_kind: "VESSEL_IDENTITY_RISK",
  prior: 0.5,
  delta: 2.44,
  posterior: 0.92,
  confidence: 0.92,
  summary:
    "OFAC and GFW agree on IMO 9357183 while disagreeing on the active MMSI: the same tanker has churned through seven broadcast identities."
});

const claim2 = nodeById(claims, "claim:alara-01:event-2:custody:h1");
claim2.title = "Hormuz synthesis requires collection-first posture";
claim2.status = "CONTESTED";
mergeData(claim2, {
  claim_kind: "COLLECTION_FIRST_AFTER_REVIEW",
  prior: 0.5,
  delta: 1.77,
  posterior: 0.76,
  confidence: 0.76,
  summary:
    "The OSINT substrate shows real risk indicators but not enough to infer intent; prior review memory changes the recommendation toward collection."
});

const hypUpdates = {
  "hyp:alara-01:event-1:h1": {
    title: "Same IMO, current MMSI differs from OFAC row",
    posterior: 0.92,
    summary: "OFAC and GFW preserve custody on IMO 9357183 while exposing the MMSI mismatch."
  },
  "hyp:alara-01:event-1:h2": {
    title: "Registry staleness without active evasion",
    posterior: 0.05,
    summary: "The OFAC row may simply be stale, but the seven-identity GFW history makes this a weaker explanation."
  },
  "hyp:alara-01:event-1:h3": {
    title: "False match or distinct hull",
    posterior: 0.03,
    summary: "A distinct-vessel explanation remains preserved but is weak because the IMO matches."
  },
  "hyp:alara-01:event-2:h1": {
    title: "Collection-first posture for Hormuz OSINT convergence",
    posterior: 0.76,
    summary: "Sanctions, traffic-density, warning, and identity signals converge on a collection tasking need, not an intent claim."
  }
};
for (const [id, update] of Object.entries(hypUpdates)) {
  const node = nodeById(hypotheses, id);
  node.title = update.title;
  mergeData(node, {
    posterior: update.posterior,
    summary: update.summary
  });
}

const ev1 = nodeById(evidence, "ev:alara-01:event-1:kinematic-fit");
ev1.title = "GFW identity history preserves custody on IMO 9357183";
mergeData(ev1, {
  evidence_type: "VESSEL_IDENTITY_HISTORY",
  llr_nats: 1.9,
  summary:
    "GFW shows HUGE current AIS identity as MMSI 422206900 / IRN while preserving IMO 9357183 across the identity chain.",
  citation: {
    label: "GFW · HUGE identity history",
    source_file: "fixtures/maritime/live-cache/gfw-huge-imo9357183-identity-history.json",
    source_sha256: "cached-live-api",
    source_pointer: "$.results[*].selfReportedInfo[*]",
    source_status: "real",
    source_provider: "Global Fishing Watch",
    rationale:
      "The full identity history resolves the current broadcast identity and the historical HATEF/OFAC-listed MMSI under the same IMO."
  }
});

const ev2 = nodeById(evidence, "ev:alara-01:event-1:metadata-conflict");
ev2.title = "OFAC row lists prior MMSI for the same tanker";
mergeData(ev2, {
  evidence_type: "SANCTIONS_IDENTITY_MISMATCH",
  llr_nats: -0.22,
  summary:
    "OFAC SDN row 15054 lists HUGE/IMO 9357183 at MMSI 212256000, while GFW's current identity is MMSI 422206900 / IRN.",
  citation: {
    label: "OFAC · Iran-program maritime sanctions",
    source_file: "fixtures/maritime/live-cache/ofac-maritime-sanctions-matches.json",
    source_sha256: "cached-live-api",
    source_pointer: "$.matches[?(@.imo=='9357183')]",
    source_status: "real",
    source_provider: "U.S. Treasury OFAC",
    rationale:
      "This is not a null match: the IMO matches. The contested field is the active MMSI, which is why the case is identity-risk enrichment rather than an intent finding."
  },
  citation_secondary: {
    label: "GFW · current broadcast identity",
    source_file: "fixtures/maritime/live-cache/gfw-huge-imo9357183-identity-history.json",
    source_sha256: "cached-live-api",
    source_pointer: "$.results[*].registryInfo[?(@.ssvid=='422206900')]",
    source_status: "real",
    source_provider: "Global Fishing Watch"
  }
});

const ev3 = nodeById(evidence, "ev:alara-01:event-1:no-visual-id");
ev3.title = "No behavior/intent claim from identity risk alone";
mergeData(ev3, {
  evidence_type: "INTENT_GUARD",
  llr_nats: -0.4,
  summary:
    "The identity chain is strong, but it does not prove hostile intent or current behavior. The guard requires collection/corroboration before any intent assertion.",
  citation: {
    label: "Demo guard · source-family policy",
    source_file: "fixtures/maritime/hormuz-evidence-items.json",
    source_sha256: "local-fixture",
    source_pointer: "$[?(@.id=='ev:hormuz:gfw-identity-history-huge:0c3fa53dc5')]",
    source_status: "real",
    source_provider: "Liminal normalizer"
  }
});

const ev4 = nodeById(evidence, "ev:alara-01:event-2:danti-corroboration");
ev4.title = "DANTI, OFAC, GFW, MARAD, and NAVAREA converge";
mergeData(ev4, {
  evidence_type: "MULTISOURCE_HORMUZ_SYNTHESIS",
  llr_nats: 0.9,
  summary:
    "Cached OSINT ties together 21 sanctioned live-coordinate vessels, 50 OFAC Iran-program vessels, 65 grey-market destination strings, GFW identity churn, MARAD 2026-004/006, and NAVAREA-IX regional warnings.",
  citation: {
    label: "DANTI · MarineTraffic ship-density snapshot",
    source_file: "fixtures/maritime/live-cache/danti-hormuz-ship-all-paginated.json",
    source_sha256: "cached-live-api",
    source_pointer: "$.documents[*]",
    source_status: "real",
    source_provider: "DANTI / MarineTraffic",
    rationale:
      "The ship pull provides the map coordinates for sanctioned vessels, grey-market destination strings, loitering clusters, and ROSHAK's implausible speed signal."
  },
  citation_secondary: {
    label: "NAVAREA IX + MARAD advisory context",
    source_file: "fixtures/maritime/live-cache/navarea-ix-warning-documents.json",
    source_sha256: "cached-live-api",
    source_pointer: "$.warnings[*]",
    source_status: "real",
    source_provider: "NAVAREA IX / MARAD"
  }
});

edgeById(evidence, "edge:ev-kinematic:supports:claim1").provenance.rationale =
  "GFW identity history preserves custody on IMO 9357183 even as the active MMSI changes.";
edgeById(evidence, "edge:ev-metadata:contradicts:claim1").provenance.rationale =
  "The mismatch weakens any claim that the OFAC-listed MMSI is current, but it strengthens the identity-churn finding.";
edgeById(evidence, "edge:ev-no-visual:weakens:claim1").provenance.rationale =
  "Identity risk does not authorize an intent inference without behavior corroboration.";
edgeById(evidence, "edge:ev-danti:supports:claim2").provenance.rationale =
  "Multisource Hormuz context satisfies the review-rule collection posture while keeping intent refused.";

for (const node of actions.nodes) {
  if (node.id === "act:alara-01:event-1:monitor") {
    node.title = "Monitor identity changes";
    mergeData(node, {
      actionType: "MONITOR_IDENTITY_CHAIN",
      kind: "MONITOR_IDENTITY_CHAIN",
      trigger: "OFAC/GFW identity mismatch should remain on watch, but no behavior claim is made."
    });
  }
  if (node.id === "act:alara-01:event-1:request-sar-rf") {
    node.title = "Request collection on current HUGE identity";
    mergeData(node, {
      actionType: "REQUEST_SAR_OR_RF_CORROBORATION",
      kind: "REQUEST_SAR_OR_RF_CORROBORATION",
      trigger: "Current MMSI 422206900 is identity-risk enriched; collect before asserting behavior or intent."
    });
  }
  if (node.id === "act:alara-01:event-1:escalate") {
    node.title = "Escalate only on behavior corroboration";
    mergeData(node, {
      actionType: "ESCALATE_WATCH_OFFICER",
      kind: "ESCALATE_WATCH_OFFICER",
      trigger: "Escalate only if SAR/RF/port-call evidence links the identity risk to current behavior."
    });
  }
  if (node.id === "act:alara-01:event-2:monitor") {
    node.title = "Monitor Hormuz traffic cluster";
    mergeData(node, {
      actionType: "MONITOR_ONLY",
      kind: "MONITOR_ONLY",
      trigger: "Baseline posture before review memory: watch the cluster without tasking new collection."
    });
  }
  if (node.id === "act:alara-01:event-2:request-sar-rf") {
    node.title = "Task SAR/RF over Qeshm and Bandar Abbas clusters";
    mergeData(node, {
      actionType: "REQUEST_SAR_OR_RF_CORROBORATION",
      kind: "REQUEST_SAR_OR_RF_CORROBORATION",
      trigger: "Prior rule applied: real sanctioned density + grey-market routing + warnings require collection-first review."
    });
  }
  if (node.id === "act:alara-01:event-2:escalate") {
    node.title = "Escalate on confirmed behavior only";
    mergeData(node, {
      actionType: "ESCALATE_WATCH_OFFICER",
      kind: "ESCALATE_WATCH_OFFICER",
      trigger: "Escalation remains bounded until collection confirms behavior or imminent threat."
    });
  }
}

const readSummaries = {
  "read:alara-01:event-1:kinematics":
    "No kinematic intent claim. HUGE identity custody is registry-based: IMO continuity across GFW + OFAC, not track geometry.",
  "read:alara-01:event-1:identity":
    "Supported: OFAC lists HUGE/IMO 9357183 under MMSI 212256000; GFW shows current MMSI 422206900 / IRN after seven identity tuples.",
  "read:alara-01:event-1:signal_integrity":
    "Contested but usable: source agreement is strong on IMO, contested on active MMSI. Preserve both facts; do not collapse to a single identity row.",
  "read:alara-01:event-1:intent":
    "Refused: identity churn and sanctions exposure do not prove hostile intent or current behavior.",
  "read:alara-01:event-1:collection":
    "Recommend SAR/RF or port-call corroboration on current MMSI 422206900 before any behavior assertion.",
  "read:alara-01:event-1:visual":
    "No current visual ID for HUGE in the Hormuz cache; visual remains a collection requirement, not supporting evidence.",
  "read:alara-01:event-2:kinematics":
    "DANTI traffic replay shows stationary clusters at Qeshm and Bandar Abbas plus ROSHAK at 31 kt, a spoofing/data-quality signal.",
  "read:alara-01:event-2:identity":
    "Identity substrate includes 21 sanctioned live-coordinate vessels, 50 OFAC Iran-program rows, and GFW churn on HUGE plus dark-vessel candidates.",
  "read:alara-01:event-2:signal_integrity":
    "Null findings are explicit: DANTI's visible Hormuz ship slice does not overlap OFAC's NITC fleet by IMO/MMSI, so public AIS and sanctioned registries diverge.",
  "read:alara-01:event-2:intent":
    "Refused: MARAD/NAVAREA warnings and grey-market indicators establish risk context, not intent.",
  "read:alara-01:event-2:collection":
    "Recommend SAR/RF over Qeshm and Bandar Abbas clusters; rule R-001 changes this from monitor to collection-first.",
  "read:alara-01:event-2:visual":
    "Sentinel chips are context only until a vessel is visually resolved; keep DANTI archive traffic separate from current behavior."
};
for (const read of reads.reads ?? []) {
  if (readSummaries[read.id]) {
    read.summary = readSummaries[read.id];
  }
  if (read.id === "read:alara-01:event-1:identity") {
    read.status = "OK";
    read.citations = [
      "ev:hormuz:gfw-identity-history-huge:0c3fa53dc5",
      "ev:hormuz:ofac-sdn-iran-program-summary:28fdcf64dd"
    ];
  }
  if (read.id === "read:alara-01:event-1:signal_integrity") {
    read.status = "REFUSED";
    read.refusal_reason = "active_mmsi_conflict: same IMO, different OFAC-listed vs current broadcast MMSI";
  }
  if (read.id === "read:alara-01:event-2:signal_integrity") {
    read.status = "OK";
    read.citations = [
      "ev:hormuz:danti-ship-paginated-traffic-snapshot:53ae942bcf",
      "ev:hormuz:ofac-sdn-iran-program-summary:28fdcf64dd",
      "ev:hormuz:gfw-identity-history-huge:0c3fa53dc5"
    ];
  }
}

function upsertEvidenceItem(item) {
  const existingIndex = hormuzEvidence.findIndex((entry) => entry.id === item.id);
  if (existingIndex === -1) {
    hormuzEvidence.push(item);
  } else {
    hormuzEvidence[existingIndex] = { ...hormuzEvidence[existingIndex], ...item };
  }
}

const basePolicy = {
  score_contribution: "context",
  note: "Identity/source context only; not vessel behavior or intent evidence."
};

upsertEvidenceItem({
  id: "ev:hormuz:synthesis:live-sdn-coordinates",
  title: "21 sanctioned IRISL/NITC/OFAC vessels with DANTI coordinates",
  source: "DANTI",
  provider: "DANTI / MarineTraffic + OFAC",
  category: "ENTITY_RISK_ENRICHMENT",
  drawer_group: "Entity Risk",
  status: "available",
  summary:
    "DANTI coordinates identify 21 known IRISL/NITC/OFAC-linked vessels in the Hormuz pull, including ADRIAN DARYA, HAMOUNA, AZARGOUN, KASHAN, SHAYAN 1, AMIR ABBAS, MATIN, and KAMINEH.",
  detail: null,
  observed_at: "2026-04-02T17:15:18Z",
  source_file: "fixtures/maritime/danti-sanctioned-overlay.geojson",
  source_document_id: "src:hormuz:danti-hormuz-ship-paginated",
  source_document_ids: ["src:hormuz:danti-hormuz-ship-paginated", "src:hormuz:ofac-maritime-sanctions-matches"],
  confidence: 0.84,
  reliability: 0.78,
  policy: basePolicy
});

upsertEvidenceItem({
  id: "ev:hormuz:synthesis:grey-market-routing",
  title: "Grey-market routing indicators across the Hormuz ship pull",
  source: "DANTI",
  provider: "DANTI / MarineTraffic",
  category: "VESSEL_IDENTITY_CORROBORATION",
  drawer_group: "OSINT",
  status: "available",
  summary:
    "The ship pull contains 65 TO ORDER / FOR ORDER / CHINA OWNER&CREW destination strings plus China-routing examples HAMOUNA from ZHUHAI and DARYABAR from CJK.",
  detail: null,
  observed_at: "2026-04-02T17:15:18Z",
  source_file: "fixtures/maritime/live-cache/danti-hormuz-ship-all-paginated.json",
  source_document_id: "src:hormuz:danti-hormuz-ship-paginated",
  source_document_ids: ["src:hormuz:danti-hormuz-ship-paginated"],
  confidence: 0.72,
  reliability: 0.68,
  policy: basePolicy
});

upsertEvidenceItem({
  id: "ev:hormuz:synthesis:navarea-marad-warning-stack",
  title: "MARAD and NAVAREA warning stack around Hormuz and Yemen",
  source: "NAVAREA_IX",
  provider: "NAVAREA IX / MARAD MSCI",
  category: "REGIONAL_SECURITY_CONTEXT",
  drawer_group: "Maritime Warnings",
  status: "available",
  summary:
    "MARAD MSCI 2026-004 covers Hormuz/Iran and 2026-006 covers Houthi/Bab el Mandeb risk; NAVAREA IX warning text includes 113/26 SAFEEN PRESTIGE reported sunk and 146/26 Yemen tanker hijacking.",
  detail: null,
  observed_at: "2026-05-03T14:46:00Z",
  source_file: "fixtures/maritime/live-cache/navarea-ix-warning-documents.json",
  source_document_id: "src:hormuz:navarea-ix-warnings",
  source_document_ids: ["src:hormuz:navarea-ix-warnings"],
  confidence: 0.74,
  reliability: 0.72,
  policy: {
    score_contribution: "regional_context",
    note: "Regional warning context; supports collection priority, not vessel intent."
  }
});

upsertEvidenceItem({
  id: "ev:hormuz:synthesis:dark-gap-null-findings",
  title: "Null findings preserve source honesty",
  source: "GLOBAL_FISHING_WATCH",
  provider: "Global Fishing Watch + DANTI + OFAC",
  category: "VESSEL_IDENTITY_CORROBORATION",
  drawer_group: "OSINT",
  status: "available",
  summary:
    "The 5 dark-vessel MMSIs do not match OFAC, and DANTI's visible Hormuz ships have zero IMO/MMSI overlap with the OFAC NITC fleet; public AIS and listed sanctioned identities diverge.",
  detail: null,
  observed_at: "2026-05-03T14:46:00Z",
  source_file: "fixtures/maritime/live-cache/gfw-dark-vessel-identity-histories.json",
  source_document_id: "src:hormuz:gfw-dark-vessel-identity-histories",
  source_document_ids: [
    "src:hormuz:gfw-dark-vessel-identity-histories",
    "src:hormuz:ofac-maritime-sanctions-matches",
    "src:hormuz:danti-hormuz-ship-paginated"
  ],
  confidence: 0.78,
  reliability: 0.8,
  policy: basePolicy
});

upsertEvidenceItem({
  id: "ev:hormuz:synthesis:roshak-spoofing-signal",
  title: "ROSHAK reports physically implausible 31 kt speed",
  source: "DANTI",
  provider: "DANTI / MarineTraffic",
  category: "VESSEL_IDENTITY_CORROBORATION",
  drawer_group: "OSINT",
  status: "available",
  summary:
    "ROSHAK (IR flag, IMO 9405966) appears in the DANTI ship pull at speed=31 kt near Bandar Abbas, a physically implausible signal for the vessel class and a likely spoofing/data-quality indicator.",
  detail: null,
  observed_at: "2026-04-02T16:12:15Z",
  source_file: "fixtures/maritime/live-cache/danti-hormuz-ship-all-paginated.json",
  source_document_id: "src:hormuz:danti-hormuz-ship-paginated",
  source_document_ids: ["src:hormuz:danti-hormuz-ship-paginated"],
  confidence: 0.7,
  reliability: 0.62,
  policy: basePolicy
});

writeJson("fixtures/maritime/anomalies.json", anomalies);
writeJson("fixtures/maritime/claims.json", claims);
writeJson("fixtures/maritime/hypotheses.json", hypotheses);
writeJson("fixtures/maritime/evidence.json", evidence);
writeJson("fixtures/maritime/actions.json", actions);
writeJson("fixtures/maritime/specialist-reads.json", reads);
writeJson("fixtures/maritime/hormuz-evidence-items.json", hormuzEvidence);
writeFileSync(
  join(root, "fixtures/maritime/scenario-alara-01.jsonl"),
  `${scenarioJsonl.map((entry) => JSON.stringify(entry)).join("\n")}\n`
);
