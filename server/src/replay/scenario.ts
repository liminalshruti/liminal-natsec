import { stableId } from "../domain/ids.ts";
import { ApiError, type LocalOperationalStore, type OntologyObject, type OperationalStore } from "../domain/ontology.ts";
import { createFixtureAdapter } from "../adapters/fixture.ts";
import { reloadCacheFile } from "../specialists/cache.ts";
import {
  DEFAULT_SCENARIO_RUN_ID,
  FIXTURE_INGESTED_AT,
  fixtureLinks,
  fixtureObjects,
  fixtureProvenance
} from "./fixtures.ts";

export interface ReplayOptions {
  scenarioRunId?: string;
  reset?: boolean;
}

export interface PerturbationInput {
  scenarioRunId?: string;
  source?: string;
  observedAt: string;
  lat: number;
  lon: number;
  label?: string;
}

export interface ScenarioState {
  scenarioRunId: string;
  seededAt: string;
  capabilities: { poll: boolean; stream: boolean; replay: boolean };
  tracks: Array<Record<string, unknown>>;
  anomalies: Array<Record<string, unknown>>;
  claims: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  ranking: Array<Record<string, unknown>>;
  perturbations: Array<Record<string, unknown>>;
}

export interface ReplayResult {
  scenarioRunId: string;
  state: ScenarioState;
  provenance: typeof fixtureProvenance;
}

export async function runFixtureReplay(
  store: OperationalStore,
  options: ReplayOptions = {}
): Promise<ReplayResult> {
  const scenarioRunId = options.scenarioRunId ?? DEFAULT_SCENARIO_RUN_ID;

  if (options.reset !== false) {
    await resetReplay(store);
  }

  await store.upsertObject("ScenarioRun", scenarioRunId, {
    object_id: scenarioRunId,
    scenario_id: "alara-01",
    scenario_run_id: scenarioRunId,
    seeded_at: FIXTURE_INGESTED_AT,
    updated_at: FIXTURE_INGESTED_AT
  });

  const adapter = createFixtureAdapter();
  const envelopes = await adapter.collectEnvelopes({ replayScenarioId: "alara-01" });
  for (const envelope of envelopes) {
    await store.writeRawEnvelope(envelope);
  }
  await store.writeCuratedRows(
    "curated_observation",
    envelopes.map((envelope) => envelope.normalized)
  );

  for (const object of fixtureObjects) {
    await store.upsertObject(object.type, object.id, {
      ...object.props,
      scenario_run_id: scenarioRunId
    });
  }
  await store.upsertLinks(fixtureLinks);

  return {
    scenarioRunId,
    state: await getScenarioState(store, scenarioRunId),
    provenance: fixtureProvenance
  };
}

export async function resetReplay(store: OperationalStore): Promise<void> {
  const local = asLocalStore(store);
  if (!local) {
    throw new ApiError(
      501,
      "RESET_REQUIRES_LOCAL_STORE",
      "Replay reset is only implemented for the local mirror.",
      "Use the local OperationalStore during offline fixture replay."
    );
  }
  await local.clear();
  // Drop the in-memory specialist-reads cache so any AIP-warmed entries from a
  // prior run are re-read from disk on the next /specialist/:name call.
  // Without this, post-reset specialist queries would return stale Q&A entries.
  try {
    reloadCacheFile();
  } catch {
    // Cache reload is best-effort; a corrupt cache file should not fail reset.
  }
}

export async function getScenarioState(
  store: OperationalStore,
  scenarioRunId = DEFAULT_SCENARIO_RUN_ID
): Promise<ScenarioState> {
  const tracks = await sortedProps(store, "Track", "object_id");
  const anomalies = await sortedProps(store, "Anomaly", "rank");
  const claims = await sortedProps(store, "Claim", "object_id");
  const actions = await sortedProps(store, "CollectionAction", "rank");
  const ranking = actions.map((action) => ({
    action_id: action.object_id,
    action_type: action.action_type,
    anomaly_id: action.anomaly_id,
    rank: action.rank,
    ranking_score: action.ranking_score,
    status: action.status
  }));

  return {
    scenarioRunId,
    seededAt: FIXTURE_INGESTED_AT,
    capabilities: { poll: true, stream: false, replay: true },
    tracks,
    anomalies,
    claims,
    actions,
    ranking,
    perturbations: (await listPerturbations(store)).map((object) => object.properties)
  };
}

export async function injectPerturbation(
  store: OperationalStore,
  input: PerturbationInput
): Promise<ScenarioState> {
  const scenarioRunId = input.scenarioRunId ?? DEFAULT_SCENARIO_RUN_ID;
  const perturbationId = stableId(
    "perturb",
    scenarioRunId,
    input.observedAt,
    input.lat.toString(),
    input.lon.toString(),
    input.label ?? ""
  );
  const observationId = `obs:${perturbationId}`;
  const anomalyId = `anom:${perturbationId}`;
  const actionId = `ca:${perturbationId}:inspect`;

  await store.upsertObject("Observation", observationId, {
    object_id: observationId,
    scenario_run_id: scenarioRunId,
    source: input.source ?? "EDGE_FIXTURE",
    observed_at: input.observedAt,
    geojson: { type: "Point", coordinates: [input.lon, input.lat] },
    label: input.label ?? "injected contact",
    injected: true,
    updated_at: input.observedAt
  });
  await store.upsertObject("Anomaly", anomalyId, {
    object_id: anomalyId,
    anomaly_type: "INJECTED_PERTURBATION",
    scenario_run_id: scenarioRunId,
    status: "OPEN",
    score: 0.52,
    rank: 0,
    injected: true,
    updated_at: input.observedAt
  });
  await store.upsertObject("CollectionAction", actionId, {
    object_id: actionId,
    anomaly_id: anomalyId,
    action_type: "INVESTIGATE_INJECTED_CONTACT",
    ranking_score: 0.52,
    rank: 0,
    status: "PERTURBATION_RECOMMENDED",
    injected: true,
    updated_at: input.observedAt
  });
  await store.link({
    linkType: "DERIVED_FROM",
    from: { objectType: "Anomaly", objectId: anomalyId },
    to: { objectType: "Observation", objectId: observationId },
    properties: { injected: true, updated_at: input.observedAt }
  });
  await store.link({
    linkType: "ACTION_FOR_ANOMALY",
    from: { objectType: "CollectionAction", objectId: actionId },
    to: { objectType: "Anomaly", objectId: anomalyId },
    properties: { injected: true, updated_at: input.observedAt }
  });

  return getScenarioState(store, scenarioRunId);
}

export async function listPerturbations(store: OperationalStore): Promise<OntologyObject[]> {
  return store.query({ objectType: "Observation", where: { injected: true } });
}

export async function provenanceForAction(
  actionId: string,
  store?: OperationalStore
): Promise<unknown | null> {
  const fixtureTrace = fixtureProvenance[actionId as keyof typeof fixtureProvenance];
  if (fixtureTrace) return fixtureTrace;

  // Perturbation actions are injected at runtime and won't appear in
  // fixtureProvenance; synthesize a structured trace from the live store so the
  // UI can still render evidence chain for off-script contacts.
  if (actionId.startsWith("ca:perturb:") && store) {
    return synthesizePerturbationProvenance(store, actionId);
  }
  return null;
}

export async function provenanceForAnomaly(
  store: OperationalStore,
  anomalyId: string
): Promise<unknown | null> {
  const actions = await store.query({
    objectType: "CollectionAction",
    where: { anomaly_id: anomalyId }
  });
  const ranked = actions.sort((left, right) => numericRank(left) - numericRank(right));
  const topActionId = ranked[0]?.objectId;
  if (topActionId) {
    const trace = await provenanceForAction(topActionId, store);
    if (trace) return trace;
  }

  // Fallback: walk Anomaly → Observation directly so the second-event provenance
  // panel renders even when no scripted action trace exists.
  return synthesizeAnomalyProvenance(store, anomalyId);
}

async function synthesizeAnomalyProvenance(
  store: OperationalStore,
  anomalyId: string
): Promise<unknown | null> {
  const anomaly = await store.getObject({ objectType: "Anomaly", objectId: anomalyId });
  if (!anomaly) return null;

  const observations = await store.linked(anomalyId, "DERIVED_FROM", "out");
  const claims = await store.linked(anomalyId, "EXPLAINS", "in");

  const trace: Array<Record<string, unknown>> = [
    { step: 1, object: anomalyId, role: "anomaly under review" }
  ];
  let step = 2;
  for (const claim of claims.slice(0, 2)) {
    trace.push({ step: step++, object: claim.objectId, role: "claim derived from anomaly" });
  }
  for (const observation of observations.slice(0, 4)) {
    trace.push({
      step: step++,
      object: observation.objectId,
      role: "observation grounding the anomaly"
    });
  }

  return {
    anomaly_id: anomalyId,
    trace,
    ai_outputs: [
      {
        model_or_logic_version: "live-store:anomaly-trace@v1",
        note: "Synthesized from current OperationalStore state."
      }
    ]
  };
}

async function synthesizePerturbationProvenance(
  store: OperationalStore,
  actionId: string
): Promise<unknown> {
  const action = await store.getObject({ objectType: "CollectionAction", objectId: actionId });
  const anomalyId = (action?.properties.anomaly_id as string | undefined) ?? null;
  const observations = anomalyId
    ? await store.linked(anomalyId, "DERIVED_FROM", "out")
    : [];

  const trace: Array<Record<string, unknown>> = [
    { step: 1, object: actionId, role: "selected action (injected)" }
  ];
  if (anomalyId) {
    trace.push({ step: 2, object: anomalyId, role: "perturbation anomaly" });
  }
  observations.slice(0, 3).forEach((observation, idx) => {
    trace.push({
      step: trace.length + 1,
      object: observation.objectId,
      role: idx === 0 ? "primary injected observation" : "linked observation"
    });
  });

  return {
    collection_action: actionId,
    trace,
    ai_outputs: [
      {
        model_or_logic_version: "live-store:perturbation-trace@v1",
        note: "Provenance synthesized for an injected contact (off-script)."
      }
    ]
  };
}

function asLocalStore(store: OperationalStore): LocalOperationalStore | null {
  return typeof (store as LocalOperationalStore).clear === "function"
    ? (store as LocalOperationalStore)
    : null;
}

async function sortedProps(
  store: OperationalStore,
  objectType: string,
  sortKey: string
): Promise<Array<Record<string, unknown>>> {
  const objects = await store.query({ objectType });
  return objects
    .sort((left, right) => {
      if (sortKey === "rank") return numericRank(left) - numericRank(right);
      return String(left.properties[sortKey] ?? left.objectId).localeCompare(
        String(right.properties[sortKey] ?? right.objectId)
      );
    })
    .map((object) => ({
      objectId: object.objectId,
      object_id: object.objectId,
      ...object.properties
    }));
}

function numericRank(object: OntologyObject): number {
  const rank = object.properties.rank;
  return typeof rank === "number" ? rank : Number.MAX_SAFE_INTEGER;
}
