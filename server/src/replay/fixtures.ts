import type { LinkWrite, ObjectType, SourceName } from "../domain/ontology.ts";

export const FIXTURE_INGESTED_AT = "2026-05-02T00:00:00Z";
export const DEFAULT_SCENARIO_RUN_ID = "scenario:alara-01";

export interface FixtureSourceRaw {
  id: string;
  source: SourceName;
  observedAt: string;
  recordType: "AIS_POSITION" | "GEOINT_RESULT" | "EDGE_OBSERVATION";
  aoiIds: string[];
  lat?: number;
  lon?: number;
  mmsi?: string;
  name?: string;
  sog?: number;
  cog?: number;
  summary?: string;
}

export interface FixtureObjectWrite {
  type: ObjectType;
  id: string;
  props: Record<string, unknown>;
}

export const fixtureRecords: FixtureSourceRaw[] = [
  {
    id: "aishub:366700111:20260418T101204Z",
    source: "AISHUB",
    observedAt: "2026-04-18T10:12:04Z",
    recordType: "AIS_POSITION",
    aoiIds: ["aoi:alara-eez-box-01"],
    lat: 34.8792,
    lon: 31.3718,
    mmsi: "366700111",
    name: "MV CALDERA",
    sog: 12.2,
    cog: 83.9
  },
  {
    id: "aishub:366700111:20260418T101504Z",
    source: "AISHUB",
    observedAt: "2026-04-18T10:15:04Z",
    recordType: "AIS_POSITION",
    aoiIds: ["aoi:alara-eez-box-01"],
    lat: 34.88112,
    lon: 31.42018,
    mmsi: "366700111",
    name: "MV CALDERA",
    sog: 12.4,
    cog: 84.2
  },
  {
    id: "barentswatch:538009771:20260418T110422Z",
    source: "BARENTSWATCH",
    observedAt: "2026-04-18T11:04:22Z",
    recordType: "AIS_POSITION",
    aoiIds: ["aoi:alara-eez-box-01"],
    lat: 34.8891,
    lon: 31.91844,
    mmsi: "538009771",
    name: "CALDERA M",
    sog: 12,
    cog: 86.1
  },
  {
    id: "danti:search-20260502-001:r03",
    source: "DANTI",
    observedAt: "2026-04-18T10:47:00Z",
    recordType: "GEOINT_RESULT",
    aoiIds: ["aoi:alara-eez-box-01"],
    lat: 34.8847,
    lon: 31.6904,
    summary: "Fixture: vessel-sized detection near predicted corridor during AIS gap."
  },
  {
    id: "aishub:271990222:20260418T122000Z",
    source: "AISHUB",
    observedAt: "2026-04-18T12:20:00Z",
    recordType: "AIS_POSITION",
    aoiIds: ["aoi:alara-eez-box-01"],
    lat: 34.901,
    lon: 31.482,
    mmsi: "271990222",
    name: "MV HARBOR KITE",
    sog: 10.1,
    cog: 81.2
  },
  {
    id: "danti:search-20260502-002:r01",
    source: "DANTI",
    observedAt: "2026-04-18T12:52:00Z",
    recordType: "GEOINT_RESULT",
    aoiIds: ["aoi:alara-eez-box-01"],
    lat: 34.908,
    lon: 31.739,
    summary: "Fixture: second vessel-sized detection inside predicted corridor."
  },
  {
    id: "aishub:271990222:20260418T130500Z",
    source: "AISHUB",
    observedAt: "2026-04-18T13:05:00Z",
    recordType: "AIS_POSITION",
    aoiIds: ["aoi:alara-eez-box-01"],
    lat: 34.912,
    lon: 31.851,
    mmsi: "271990222",
    name: "MV HARBOR KITE",
    sog: 10.4,
    cog: 82
  }
];

export const fixtureObjects: FixtureObjectWrite[] = [
  {
    type: "AOI",
    id: "aoi:alara-eez-box-01",
    props: {
      object_id: "aoi:alara-eez-box-01",
      name: "Alara EEZ Box 01",
      dark_gap_threshold_min: 20,
      polygon: "POLYGON((31.10 34.70, 32.20 34.70, 32.20 35.20, 31.10 35.20, 31.10 34.70))",
      updated_at: FIXTURE_INGESTED_AT
    }
  },
  {
    type: "Vessel",
    id: "vsl:cluster:caldera-01",
    props: {
      object_id: "vsl:cluster:caldera-01",
      canonical_name: "MV CALDERA",
      mmsi_set: ["366700111", "538009771"],
      imo: "IMO9388800",
      length_m: 183,
      width_m: 28,
      vessel_type: 70,
      updated_at: FIXTURE_INGESTED_AT
    }
  },
  {
    type: "Vessel",
    id: "vsl:cluster:harbor-kite-01",
    props: {
      object_id: "vsl:cluster:harbor-kite-01",
      canonical_name: "MV HARBOR KITE",
      mmsi_set: ["271990222"],
      vessel_type: 70,
      updated_at: FIXTURE_INGESTED_AT
    }
  },
  {
    type: "Track",
    id: "trk:366700111:20260418T0950:20260418T1015:aa01",
    props: {
      object_id: "trk:366700111:20260418T0950:20260418T1015:aa01",
      mmsi: "366700111",
      start_at: "2026-04-18T09:50:00Z",
      end_at: "2026-04-18T10:15:04Z",
      status: "DARK_GAP_CANDIDATE",
      updated_at: FIXTURE_INGESTED_AT
    }
  },
  {
    type: "Track",
    id: "trk:538009771:20260418T1104:20260418T1110:bb02",
    props: {
      object_id: "trk:538009771:20260418T1104:20260418T1110:bb02",
      mmsi: "538009771",
      start_at: "2026-04-18T11:04:22Z",
      end_at: "2026-04-18T11:10:00Z",
      status: "IDENTITY_CHURN_CANDIDATE",
      predicted_ellipse: "POLYGON((31.55 34.78,31.98 34.78,31.98 35.02,31.55 35.02,31.55 34.78))",
      updated_at: FIXTURE_INGESTED_AT
    }
  },
  {
    type: "Track",
    id: "trk:271990222:20260418T1220:20260418T1305:cc90",
    props: {
      object_id: "trk:271990222:20260418T1220:20260418T1305:cc90",
      mmsi: "271990222",
      start_at: "2026-04-18T12:20:00Z",
      end_at: "2026-04-18T13:05:00Z",
      status: "DARK_GAP_REVIEW_RULE_MATCH",
      updated_at: FIXTURE_INGESTED_AT
    }
  },
  ...fixtureRecords.map((record) => ({
    type: record.recordType === "GEOINT_RESULT" ? "EvidenceItem" : "Observation",
    id:
      record.source === "DANTI"
        ? `ev:${record.id.replace(":", ":alara-01:")}`
        : `obs:${record.id}`,
    props: {
      object_id:
        record.source === "DANTI"
          ? `ev:${record.id.replace(":", ":alara-01:")}`
          : `obs:${record.id}`,
      source: record.source,
      source_record_id: record.id,
      observed_at: record.observedAt,
      aoi_ids: record.aoiIds,
      geojson:
        typeof record.lon === "number" && typeof record.lat === "number"
          ? { type: "Point", coordinates: [record.lon, record.lat] }
          : undefined,
      mmsi: record.mmsi,
      name: record.name,
      summary: record.summary,
      evidence_type: record.source === "DANTI" ? "SAR_IMAGERY_SUMMARY" : undefined,
      source_confidence: record.source === "DANTI" ? 0.62 : 0.85,
      updated_at: FIXTURE_INGESTED_AT
    }
  })),
  {
    type: "Anomaly",
    id: "anom:identity_churn:trk-caldera:20260418T1015:1f44",
    props: {
      object_id: "anom:identity_churn:trk-caldera:20260418T1015:1f44",
      anomaly_type: "IDENTITY_CHURN_PLUS_DARK_GAP",
      window_start: "2026-04-18T10:15:04Z",
      window_end: "2026-04-18T11:04:22Z",
      gap_minutes: 49.3,
      candidate_old_track_id: "trk:366700111:20260418T0950:20260418T1015:aa01",
      candidate_new_track_id: "trk:538009771:20260418T1104:20260418T1110:bb02",
      score: 0.78,
      status: "OPEN",
      rank: 1,
      updated_at: FIXTURE_INGESTED_AT
    }
  },
  {
    type: "Anomaly",
    id: "anom:dark_gap:trk-271990222:20260418T1220:cc90",
    props: {
      object_id: "anom:dark_gap:trk-271990222:20260418T1220:cc90",
      anomaly_type: "DARK_GAP_REVIEW_RULE_MATCH",
      window_start: "2026-04-18T12:20:00Z",
      window_end: "2026-04-18T13:05:00Z",
      gap_minutes: 45,
      score: 0.66,
      status: "OPEN",
      rank: 2,
      updated_at: FIXTURE_INGESTED_AT
    }
  },
  {
    type: "Claim",
    id: "claim:anom-identity-churn-1:custody_hypothesis:h1",
    props: {
      object_id: "claim:anom-identity-churn-1:custody_hypothesis:h1",
      hypothesis: "SAME_PHYSICAL_VESSEL_CONTINUITY",
      posterior: 0.7,
      llr_total: 1.86,
      status: "CONTESTED",
      updated_at: FIXTURE_INGESTED_AT
    }
  },
  {
    type: "Claim",
    id: "claim:anom-darkgap-2:custody_hypothesis:h1",
    props: {
      object_id: "claim:anom-darkgap-2:custody_hypothesis:h1",
      hypothesis: "SAME_PHYSICAL_VESSEL_CONTINUITY",
      posterior: 0.64,
      llr_total: 1.24,
      status: "REVIEW_RULE_APPLIED",
      updated_at: FIXTURE_INGESTED_AT
    }
  },
  {
    type: "ReviewRule",
    id: "rr:watchfloor:dark-gap-sar-first:v1",
    props: {
      object_id: "rr:watchfloor:dark-gap-sar-first:v1",
      rule_text:
        'WHEN gap_minutes >= 20 AND candidate_continuity_score >= 0.65 AND danti_geo_time_corroboration == true AND aoi_id == "aoi:alara-eez-box-01" THEN boost("REQUEST_SAR_OR_RF_CORROBORATION", +1)',
      active: true,
      updated_at: FIXTURE_INGESTED_AT
    }
  },
  {
    type: "CollectionAction",
    id: "ca:anom-identity-churn-1:sar-rf-sweep:20260502T1407Z",
    props: {
      object_id: "ca:anom-identity-churn-1:sar-rf-sweep:20260502T1407Z",
      anomaly_id: "anom:identity_churn:trk-caldera:20260418T1015:1f44",
      action_type: "REQUEST_SAR_OR_RF_CORROBORATION",
      priority: "MEDIUM",
      ranking_score: 0.78,
      rank: 1,
      status: "RECOMMENDED_REQUIRES_OPERATOR",
      rationale:
        "Would discriminate same-physical-vessel continuity from receiver outage or different-vessel crossing.",
      updated_at: FIXTURE_INGESTED_AT
    }
  },
  {
    type: "CollectionAction",
    id: "ca:anom-darkgap-2:sar-rf-sweep:20260502T1425Z",
    props: {
      object_id: "ca:anom-darkgap-2:sar-rf-sweep:20260502T1425Z",
      anomaly_id: "anom:dark_gap:trk-271990222:20260418T1220:cc90",
      action_type: "REQUEST_SAR_OR_RF_CORROBORATION",
      priority: "MEDIUM",
      ranking_score: 1.66,
      rank: 2,
      status: "BOOSTED_BY_REVIEW_RULE",
      updated_at: FIXTURE_INGESTED_AT
    }
  },
  {
    type: "CollectionAction",
    id: "ca:anom-darkgap-2:monitor:20260502T1425Z",
    props: {
      object_id: "ca:anom-darkgap-2:monitor:20260502T1425Z",
      anomaly_id: "anom:dark_gap:trk-271990222:20260418T1220:cc90",
      action_type: "MONITOR_ONLY",
      priority: "LOW",
      ranking_score: 0.72,
      rank: 3,
      status: "DOWNRANKED_AFTER_REVIEW_RULE",
      updated_at: FIXTURE_INGESTED_AT
    }
  }
];

export const fixtureLinks: LinkWrite[] = [
  link("VESSEL_HAS_TRACK", "Vessel", "vsl:cluster:caldera-01", "Track", "trk:366700111:20260418T0950:20260418T1015:aa01"),
  link("VESSEL_HAS_TRACK", "Vessel", "vsl:cluster:caldera-01", "Track", "trk:538009771:20260418T1104:20260418T1110:bb02"),
  link("VESSEL_HAS_TRACK", "Vessel", "vsl:cluster:harbor-kite-01", "Track", "trk:271990222:20260418T1220:20260418T1305:cc90"),
  link("ANOMALY_INVOLVES_TRACK", "Anomaly", "anom:identity_churn:trk-caldera:20260418T1015:1f44", "Track", "trk:366700111:20260418T0950:20260418T1015:aa01"),
  link("ANOMALY_INVOLVES_TRACK", "Anomaly", "anom:identity_churn:trk-caldera:20260418T1015:1f44", "Track", "trk:538009771:20260418T1104:20260418T1110:bb02"),
  link("ANOMALY_INVOLVES_TRACK", "Anomaly", "anom:dark_gap:trk-271990222:20260418T1220:cc90", "Track", "trk:271990222:20260418T1220:20260418T1305:cc90"),
  link("CLAIM_ABOUT_ANOMALY", "Claim", "claim:anom-identity-churn-1:custody_hypothesis:h1", "Anomaly", "anom:identity_churn:trk-caldera:20260418T1015:1f44"),
  link("CLAIM_ABOUT_ANOMALY", "Claim", "claim:anom-darkgap-2:custody_hypothesis:h1", "Anomaly", "anom:dark_gap:trk-271990222:20260418T1220:cc90"),
  link("SUPPORTS", "EvidenceItem", "ev:danti:alara-01:search-20260502-001:r03", "Claim", "claim:anom-identity-churn-1:custody_hypothesis:h1", { delta: 0.55 }),
  link("WEAKENS", "Observation", "obs:barentswatch:538009771:20260418T110422Z", "Claim", "claim:anom-identity-churn-1:custody_hypothesis:h1", { delta: -0.62 }),
  link("SUPPORTS", "EvidenceItem", "ev:danti:alara-01:search-20260502-002:r01", "Claim", "claim:anom-darkgap-2:custody_hypothesis:h1", { delta: 0.47 }),
  link("ACTION_FOR_CLAIM", "CollectionAction", "ca:anom-identity-churn-1:sar-rf-sweep:20260502T1407Z", "Claim", "claim:anom-identity-churn-1:custody_hypothesis:h1"),
  link("ACTION_FOR_CLAIM", "CollectionAction", "ca:anom-darkgap-2:sar-rf-sweep:20260502T1425Z", "Claim", "claim:anom-darkgap-2:custody_hypothesis:h1"),
  link("ACTION_FOR_CLAIM", "CollectionAction", "ca:anom-darkgap-2:monitor:20260502T1425Z", "Claim", "claim:anom-darkgap-2:custody_hypothesis:h1"),
  link("APPLIES_TO", "ReviewRule", "rr:watchfloor:dark-gap-sar-first:v1", "Claim", "claim:anom-darkgap-2:custody_hypothesis:h1"),
  link("REVIEWED_BY", "Claim", "claim:anom-darkgap-2:custody_hypothesis:h1", "ReviewRule", "rr:watchfloor:dark-gap-sar-first:v1")
];

export const fixtureProvenance = {
  "ca:anom-identity-churn-1:sar-rf-sweep:20260502T1407Z": {
    collection_action: "ca:anom-identity-churn-1:sar-rf-sweep:20260502T1407Z",
    trace: [
      { step: 1, object: "ca:anom-identity-churn-1:sar-rf-sweep:20260502T1407Z", role: "selected action" },
      {
        step: 2,
        object: "claim:anom-identity-churn-1:custody_hypothesis:h1",
        role: "triggered by contested claim",
        prior: 0.5,
        delta: 1.86,
        posterior: 0.7
      },
      {
        step: 3,
        object: "ev:danti:alara-01:search-20260502-001:r03",
        role: "evidence (SUPPORTS)",
        delta: 0.55
      },
      {
        step: 4,
        object: "obs:barentswatch:538009771:20260418T110422Z",
        role: "evidence (WEAKENS)",
        delta: -0.62
      }
    ],
    ai_outputs: [
      {
        model_or_logic_version: "aip-logic:hypothesis-summarizer@0.1.0",
        refusal: "Insufficient evidence to assert intent."
      }
    ]
  },
  "ca:anom-darkgap-2:sar-rf-sweep:20260502T1425Z": {
    collection_action: "ca:anom-darkgap-2:sar-rf-sweep:20260502T1425Z",
    trace: [
      { step: 1, object: "ca:anom-darkgap-2:sar-rf-sweep:20260502T1425Z", role: "selected action" },
      {
        step: 2,
        object: "claim:anom-darkgap-2:custody_hypothesis:h1",
        role: "triggered by claim",
        prior: 0.5,
        delta: 1.24,
        posterior: 0.64
      },
      {
        step: 3,
        object: "ev:danti:alara-01:search-20260502-002:r01",
        role: "evidence (SUPPORTS)",
        delta: 0.47
      },
      {
        step: 4,
        object: "rr:watchfloor:dark-gap-sar-first:v1",
        role: "reviewed by prior rule"
      },
      {
        step: 5,
        object: "claim:anom-darkgap-2:custody_hypothesis:h1",
        role: "rule applied to claim"
      }
    ],
    ai_outputs: [
      {
        model_or_logic_version: "aip-logic:hypothesis-summarizer@0.1.0",
        refusal: "Insufficient evidence to assert intent."
      }
    ]
  }
} as const;

function link(
  linkType: string,
  fromType: ObjectType,
  fromId: string,
  toType: ObjectType,
  toId: string,
  properties: Record<string, unknown> = {}
): LinkWrite {
  return {
    linkType,
    from: { objectType: fromType, objectId: fromId },
    to: { objectType: toType, objectId: toId },
    properties: { ...properties, updated_at: FIXTURE_INGESTED_AT }
  };
}
