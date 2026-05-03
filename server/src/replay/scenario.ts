import { stableId } from "../domain/ids.ts";
import { ApiError, type LocalOperationalStore, type OntologyObject, type OperationalStore } from "../domain/ontology.ts";
import { createFixtureAdapter } from "../adapters/fixture.ts";
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

export async function provenanceForAction(actionId: string): Promise<unknown | null> {
  return fixtureProvenance[actionId as keyof typeof fixtureProvenance] ?? null;
}

export async function provenanceForAnomaly(store: OperationalStore, anomalyId: string): Promise<unknown | null> {
  const actions = await store.query({
    objectType: "CollectionAction",
    where: { anomaly_id: anomalyId }
  });
  const ranked = actions.sort((left, right) => numericRank(left) - numericRank(right));
  const topActionId = ranked[0]?.objectId;
  return topActionId ? provenanceForAction(topActionId) : null;
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
