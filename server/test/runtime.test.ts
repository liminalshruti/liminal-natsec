import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { importIfPresent, skipIfMissing } from "../../tests/helpers/optional.ts";

describe("OperationalStore local mirror", () => {
  it("local_store_upserts_objects_and_links", async (t) => {
    const local = await importIfPresent<typeof import("../src/stores/local.ts")>(
      t,
      "server/src/stores/local.ts",
      "OperationalStore local mirror"
    );
    if (!local) return;

    const { createLocalStore } = local;
    const store = createLocalStore();

    await store.upsertObject("Vessel", "vsl:test-1", {
      canonical_name: "MV TEST",
      mmsi_set: ["366700111"]
    });
    await store.upsertObjects("Track", [
      { objectId: "trk:test-1", mmsi: "366700111" }
    ]);
    await store.link({
      linkType: "VESSEL_HAS_TRACK",
      from: { objectType: "Vessel", objectId: "vsl:test-1" },
      to: { objectType: "Track", objectId: "trk:test-1" },
      properties: { confidence: 0.91 }
    });

    const vessel = await store.getObject({
      objectType: "Vessel",
      objectId: "vsl:test-1"
    });
    const linkedTracks = await store.linked(
      "vsl:test-1",
      "VESSEL_HAS_TRACK",
      "out"
    );

    assert.equal(vessel?.properties.canonical_name, "MV TEST");
    assert.equal(linkedTracks.length, 1);
    assert.equal(linkedTracks[0]?.objectId, "trk:test-1");
    assert.equal(linkedTracks[0]?.properties.mmsi, "366700111");
  });

  it("local_store_queues_action_envelopes", async (t) => {
    const local = await importIfPresent<typeof import("../src/stores/local.ts")>(
      t,
      "server/src/stores/local.ts",
      "OperationalStore local mirror"
    );
    if (!local) return;

    const { createLocalStore } = local;
    const store = createLocalStore();

    const result = await store.applyAction({
      actionApiName: "saveOperatorDecision",
      params: { anomaly_id: "anom:test", decision: "ACKNOWLEDGED" },
      idempotencyKey: "decision:test:1",
      createdAt: "2026-05-02T12:00:00Z"
    });

    assert.equal(result.status, "QUEUED");
    assert.equal(result.id, "actq:31f2cda34e88");
    assert.deepEqual(
      store.getActionQueue().map((action) => action.status),
      ["PENDING"]
    );
  });
});

describe("fixture adapter and replay", () => {
  it("adapter_fixture_mode_round_trips", async (t) => {
    const fixture = await importIfPresent<typeof import("../src/adapters/fixture.ts")>(
      t,
      "server/src/adapters/fixture.ts",
      "fixture adapter"
    );
    if (!fixture) return;

    const { createFixtureAdapter } = fixture;
    const adapter = createFixtureAdapter();

    const first = await adapter.collectEnvelopes({
      replayScenarioId: "alara-01"
    });
    const second = await adapter.collectEnvelopes({
      replayScenarioId: "alara-01"
    });

    assert.deepEqual(first, second);
    assert.equal(first[0]?.schemaVersion, "seaforge.normalized.v1");
  });

  it("track_ids_are_stable_across_replay", async (t) => {
    if (
      skipIfMissing(
        t,
        ["server/src/stores/local.ts", "server/src/replay/scenario.ts"],
        "fixture replay"
      )
    ) {
      return;
    }

    const { createLocalStore } = await import("../src/stores/local.ts");
    const { runFixtureReplay } = await import("../src/replay/scenario.ts");
    const first = createLocalStore();
    const second = createLocalStore();

    const firstRun = await runFixtureReplay(first, {
      scenarioRunId: "run:stable"
    });
    const secondRun = await runFixtureReplay(second, {
      scenarioRunId: "run:stable"
    });

    assert.deepEqual(
      firstRun.state.tracks.map((track) => track.objectId),
      secondRun.state.tracks.map((track) => track.objectId)
    );
  });

  it("demo_determinism", async (t) => {
    if (
      skipIfMissing(
        t,
        ["server/src/stores/local.ts", "server/src/replay/scenario.ts"],
        "fixture replay"
      )
    ) {
      return;
    }

    const { createLocalStore } = await import("../src/stores/local.ts");
    const { runFixtureReplay } = await import("../src/replay/scenario.ts");
    const first = createLocalStore();
    const second = createLocalStore();

    const firstRun = await runFixtureReplay(first, {
      scenarioRunId: "run:deterministic"
    });
    const secondRun = await runFixtureReplay(second, {
      scenarioRunId: "run:deterministic"
    });

    assert.deepEqual(firstRun.state.anomalies, secondRun.state.anomalies);
    assert.deepEqual(firstRun.state.ranking, secondRun.state.ranking);
    assert.deepEqual(firstRun.provenance, secondRun.provenance);
  });

  it("replay reset clears injected perturbations", async (t) => {
    if (
      skipIfMissing(
        t,
        ["server/src/stores/local.ts", "server/src/replay/scenario.ts"],
        "fixture replay"
      )
    ) {
      return;
    }

    const { createLocalStore } = await import("../src/stores/local.ts");
    const {
      injectPerturbation,
      listPerturbations,
      resetReplay,
      runFixtureReplay
    } = await import("../src/replay/scenario.ts");
    const store = createLocalStore();
    await runFixtureReplay(store, { scenarioRunId: "run:perturb" });

    await injectPerturbation(store, {
      scenarioRunId: "run:perturb",
      source: "EDGE_FIXTURE",
      observedAt: "2026-04-18T13:15:00Z",
      lat: 34.91,
      lon: 31.88,
      label: "judge-injected contact"
    });

    assert.equal((await listPerturbations(store)).length, 1);

    await resetReplay(store);

    assert.equal((await listPerturbations(store)).length, 0);
  });
});

describe("health contract", () => {
  it("health reports fixture availability, local store, Foundry config status, AIP config status", async (t) => {
    if (
      skipIfMissing(
        t,
        ["server/src/routes/debug.ts", "server/src/stores/local.ts"],
        "server health contract"
      )
    ) {
      return;
    }

    const { buildHealthSnapshot } = await import("../src/routes/debug.ts");
    const { createLocalStore } = await import("../src/stores/local.ts");
    const health = await buildHealthSnapshot(createLocalStore());

    assert.equal(health.status, "ok");
    assert.equal(health.capabilities.poll, true);
    assert.equal(health.fixtureAvailability.embedded, true);
    assert.equal(health.localStore.status, "ok");
    assert.equal(health.foundry.status, "NOT_CONFIGURED");
    assert.equal(health.aip.status, "NOT_CONFIGURED");
  });
});
