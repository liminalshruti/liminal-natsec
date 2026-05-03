import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hasRepoFile } from "../../tests/helpers/optional.ts";

const guardFiles = ["server/src/specialists/guard.ts", "server/src/specialists/types.ts"];
const aipFiles = [...guardFiles, "server/src/specialists/aip.ts"];
const cacheFiles = [...guardFiles, "server/src/specialists/cache.ts"];
const visualFiles = [...guardFiles, "server/src/specialists/visual.ts"];
const routeFiles = [...cacheFiles, "server/src/routes/specialists.ts"];
const registryFiles = [...cacheFiles, "server/src/specialists/registry.ts"];

const guardModule = filesReady(guardFiles)
  ? await import("../src/specialists/guard.ts")
  : null;
const aipModule = filesReady(aipFiles)
  ? await import("../src/specialists/aip.ts")
  : null;
const cacheModule = filesReady(cacheFiles)
  ? await import("../src/specialists/cache.ts")
  : null;
const visualModule = filesReady(visualFiles)
  ? await import("../src/specialists/visual.ts")
  : null;
const routeModule = filesReady(routeFiles)
  ? await import("../src/routes/specialists.ts")
  : null;
const registryModule = filesReady(registryFiles)
  ? await import("../src/specialists/registry.ts")
  : null;

const intentIndicator = {
  id: "ev:intent-indicator:0001",
  type: "INTENT_INDICATOR",
  modality: "text",
  observed_at: "2026-04-18T10:15:00Z",
  source: "EXA"
};

const aisGap = {
  id: "obs:ais-gap:0001",
  type: "AIS_POSITION",
  modality: "kinematic",
  observed_at: "2026-04-18T10:15:04Z",
  geometry: { type: "Point", coordinates: [-122.4, 37.7] },
  source: "AISHUB"
};

const dantiOsint = {
  id: "obs:danti-osint:0001",
  type: "OSINT_DOCUMENT",
  modality: "geo",
  observed_at: "2026-04-18T10:20:00Z",
  geometry: { type: "Point", coordinates: [-122.41, 37.72] },
  source: "DANTI"
};

const textOnlyDoc = {
  id: "obs:exa-text:0001",
  type: "OSINT_DOCUMENT",
  modality: "text",
  source: "EXA"
};

const shodanRecord = {
  id: "obs:shodan:0001",
  type: "INFRASTRUCTURE_CONTEXT",
  modality: "text",
  source: "SHODAN"
};

const baseSupportedRaw = {
  verdict: "supported",
  summary: "Two AIS observations corroborate the predicted corridor.",
  cited_observation_ids: [aisGap.id, dantiOsint.id],
  confidence: 0.71,
  unsupported_assertions: []
};

function inputFor(
  name: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    name,
    anomaly_id: "anom:test:0001",
    evidence: [aisGap, dantiOsint, intentIndicator],
    claim: { id: "claim:test:0001", posterior: 0.7 },
    ...overrides
  };
}

describeWhen("M3 guard layers", guardFiles, () => {
  const { applyGuard } = guardModule!;

  it("m3_guard_refuses_below_citation_threshold", () => {
    for (const cited of [[], [aisGap.id]]) {
      const guarded = applyGuard(
        inputFor("kinematics"),
        { ...baseSupportedRaw, cited_observation_ids: cited }
      );
      assert.equal(guarded.verdict, "refused");
      assert.ok(guarded.guard.applied_layers.includes("citation_min"));
      assert.equal(guarded.guard.forced_refused, true);
    }
  });

  it("m3_guard_intent_refuses_without_indicator", () => {
    const guarded = applyGuard(
      inputFor("intent", { evidence: [aisGap, dantiOsint] }),
      baseSupportedRaw
    );
    assert.equal(guarded.verdict, "refused");
    assert.ok(guarded.guard.applied_layers.includes("intent_indicator"));
  });

  it("m3_guard_supports_above_citation_threshold", () => {
    const guarded = applyGuard(
      inputFor("intent", {
        evidence: [aisGap, dantiOsint, intentIndicator]
      }),
      { ...baseSupportedRaw, cited_observation_ids: [aisGap.id, dantiOsint.id] }
    );
    assert.equal(guarded.verdict, "supported");
    assert.equal(guarded.guard.forced_refused, false);
    assert.equal(guarded.guard.downgraded, false);
  });

  it("posterior below confidence_floor forces refused", () => {
    const guarded = applyGuard(
      inputFor("kinematics", {
        claim: { id: "claim:low", posterior: 0.4 },
        confidence_floor: 0.55
      }),
      baseSupportedRaw
    );
    assert.equal(guarded.verdict, "refused");
    assert.ok(guarded.guard.applied_layers.includes("posterior_floor"));
  });

  it("identity weakens when no dimensions, flag, or imo match", () => {
    const guarded = applyGuard(
      inputFor("identity", {
        identity_features: {
          dimensions_similarity_score: null,
          flag_match: false,
          imo_match: false
        }
      }),
      baseSupportedRaw
    );
    assert.equal(guarded.verdict, "weakened");
    assert.equal(guarded.guard.downgraded, true);
    assert.ok(guarded.guard.applied_layers.includes("identity_weak"));
  });

  it("textual-only evidence downgrades supported to weakened", () => {
    const guarded = applyGuard(
      inputFor("intent", {
        evidence: [textOnlyDoc, { ...textOnlyDoc, id: "obs:exa-text:0002" }, intentIndicator]
      }),
      {
        ...baseSupportedRaw,
        cited_observation_ids: ["obs:exa-text:0001", "obs:exa-text:0002"]
      }
    );
    assert.equal(guarded.verdict, "weakened");
    assert.ok(guarded.guard.applied_layers.includes("textual_only"));
  });

  it("shodan cannot support vessel-behavior claims (kinematics)", () => {
    const guarded = applyGuard(
      inputFor("kinematics", {
        evidence: [shodanRecord, { ...shodanRecord, id: "obs:shodan:0002" }]
      }),
      {
        ...baseSupportedRaw,
        cited_observation_ids: ["obs:shodan:0001", "obs:shodan:0002"]
      }
    );
    assert.equal(guarded.verdict, "refused");
    assert.ok(guarded.guard.applied_layers.includes("shodan_vessel_behavior"));
  });

  it("hostile question without INTENT_INDICATOR refuses", () => {
    const guarded = applyGuard(
      inputFor("kinematics", {
        question: "Is this vessel exhibiting hostile behavior?",
        evidence: [aisGap, dantiOsint]
      }),
      baseSupportedRaw
    );
    assert.equal(guarded.verdict, "refused");
    assert.ok(
      guarded.guard.applied_layers.includes("question_intent_phrasing_no_indicator")
    );
  });

  it("strips unsupported_assertions from persisted summary", () => {
    const summary =
      "Vessel exhibits hostile intent and operates under sanctions; AIS gap matches predicted corridor.";
    const guarded = applyGuard(
      inputFor("intent", { evidence: [aisGap, dantiOsint, intentIndicator] }),
      {
        ...baseSupportedRaw,
        summary,
        cited_observation_ids: [aisGap.id, dantiOsint.id],
        unsupported_assertions: ["hostile intent", "sanctions"]
      }
    );
    assert.equal(guarded.summary.includes("hostile intent"), false);
    assert.equal(guarded.summary.includes("sanctions"), false);
    assert.deepEqual(
      guarded.guard.stripped_assertions.sort(),
      ["hostile intent", "sanctions"].sort()
    );
  });

  it("layer 1 does not refuse contradicted single-citation outputs (M5 path)", () => {
    const guarded = applyGuard(
      inputFor("visual", { evidence: [aisGap] }),
      {
        verdict: "contradicted",
        summary: "Visual class disagrees with declared AIS class.",
        cited_observation_ids: [aisGap.id],
        confidence: 0.78,
        unsupported_assertions: []
      }
    );
    assert.equal(guarded.verdict, "contradicted");
    assert.equal(guarded.guard.forced_refused, false);
  });
});

describeWhen("guard parity (AIP vs cache)", aipFiles, () => {
  const { applyGuard } = guardModule!;
  const { callAip } = aipModule!;

  it("guard_parity_aip_vs_cache produces deep-equal outputs modulo source", async () => {
    const input = inputFor("intent", {
      anomaly_id: "anom:parity:0001",
      evidence: [aisGap, dantiOsint, intentIndicator]
    });

    const raw = {
      verdict: "supported",
      summary: "Two corroborating observations and an INTENT_INDICATOR.",
      cited_observation_ids: [aisGap.id, dantiOsint.id],
      confidence: 0.69,
      unsupported_assertions: []
    };

    const fakeFetch = async () =>
      new Response(JSON.stringify({ output: raw }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    const aipRaw = await callAip("intent", input, {
      baseUrl: "https://aip.test",
      token: "test-token",
      fetchImpl: fakeFetch
    });

    const aipGuarded = applyGuard(input, aipRaw);
    aipGuarded.source = "aip";

    const cacheGuarded = applyGuard(input, raw);
    cacheGuarded.source = "cache";

    const aipNoSource = { ...aipGuarded, source: undefined };
    const cacheNoSource = { ...cacheGuarded, source: undefined };
    assert.deepEqual(aipNoSource, cacheNoSource);
  });
});

describeWhen("cache layer", cacheFiles, () => {
  const { applyGuard } = guardModule!;
  const { findCached, loadCacheFile } = cacheModule!;

  it("loads seed specialist-reads.json without throwing", () => {
    const cache = loadCacheFile();
    assert.equal(cache.schemaVersion, "seaforge.specialist-reads.v1");
    assert.ok(Array.isArray(cache.entries));
    assert.ok(cache.entries.length > 0);
  });

  it("seed entries pass M3 guard for declared inputs", () => {
    const cache = loadCacheFile();
    for (const entry of cache.entries) {
      const guarded = applyGuard(
        {
          name: entry.name,
          anomaly_id: entry.anomaly_id,
          evidence: entry.test_input.evidence,
          claim: entry.test_input.claim,
          identity_features: entry.test_input.identity_features,
          visual: entry.test_input.visual,
          question: entry.test_input.question
        },
        entry.output
      );
      assert.equal(guarded.verdict, entry.expected_verdict, `entry ${entry.key}`);
    }
  });

  it("findCached returns null on miss and the entry on hit", () => {
    const hit = findCached("intent", "anom:cache-seed:supported");
    assert.ok(hit);
    assert.equal(hit?.verdict, "supported");

    const miss = findCached("intent", "anom:does-not-exist");
    assert.equal(miss, null);
  });
});

describeWhen("visual specialist (M5)", visualFiles, () => {
  const { visualSpecialist } = visualModule!;

  it("emits CONTRADICTS when visual top class disagrees with declared AIS class", async () => {
    const result = await visualSpecialist.call({
      name: "visual",
      anomaly_id: "anom:visual:0001",
      evidence: [aisGap],
      visual: {
        observation_id: aisGap.id,
        declared_ais_class: "cargo",
        visual_class_scores: { cargo: 0.05, tanker: 0.05, fishing: 0.05, naval: 0.85 }
      }
    });
    assert.equal(result.raw.verdict, "contradicted");
    assert.deepEqual(result.raw.cited_observation_ids, [aisGap.id]);
  });

  it("emits SUPPORTS when visual top class agrees with declared AIS class", async () => {
    const result = await visualSpecialist.call({
      name: "visual",
      anomaly_id: "anom:visual:0002",
      evidence: [aisGap],
      visual: {
        observation_id: aisGap.id,
        declared_ais_class: "cargo",
        visual_class_scores: { cargo: 0.85, tanker: 0.05, fishing: 0.05, naval: 0.05 }
      }
    });
    assert.equal(result.raw.verdict, "supported");
  });
});

describeWhen("/specialist/:name route", routeFiles, () => {
  const { handleSpecialistRoute } = routeModule!;

  it("route_returns_typed_guarded_output for intent with INTENT_INDICATOR", async () => {
    const res = await handleSpecialistRoute({
      name: "intent",
      body: inputFor("intent", {
        anomaly_id: "anom:cache-seed:supported",
        evidence: [aisGap, dantiOsint, intentIndicator]
      })
    });
    assert.equal(res.status, 200);
    const body = res.body;
    assert.ok(["supported", "weakened", "contradicted", "refused"].includes(body.verdict));
    assert.ok(["aip", "cache", "fixture", "anthropic", "codex"].includes(body.source));
    assert.ok(Array.isArray(body.guard.applied_layers));
    assert.equal(typeof body.guard.forced_refused, "boolean");
  });

  it("route refuses intent when INTENT_INDICATOR is absent", async () => {
    const res = await handleSpecialistRoute({
      name: "intent",
      body: inputFor("intent", {
        anomaly_id: "anom:cache-seed:no-indicator",
        evidence: [aisGap, dantiOsint]
      })
    });
    assert.equal(res.status, 200);
    const body = res.body;
    assert.equal(body.verdict, "refused");
    assert.ok(body.guard.applied_layers.includes("intent_indicator"));
  });

  it("route_rejects_unknown_specialist_name", async () => {
    const res = await handleSpecialistRoute({
      name: "telemetry",
      body: inputFor("kinematics")
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "UNKNOWN_SPECIALIST");
  });

  it("route validates required input shape", async () => {
    const res = await handleSpecialistRoute({
      name: "intent",
      body: { anomaly_id: "missing-evidence" }
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, "INVALID_INPUT");
  });
});

describeWhen("runSpecialist end-to-end (cache fallback path)", registryFiles, () => {
  const { runSpecialist } = registryModule!;

  it("runs intent via cache when AIP is unconfigured and applies guard", async () => {
    const guarded = await runSpecialist(
      "intent",
      inputFor("intent", {
        anomaly_id: "anom:cache-seed:supported",
        evidence: [aisGap, dantiOsint, intentIndicator]
      })
    );
    assert.ok(["supported", "weakened"].includes(guarded.verdict));
    assert.ok(["cache", "fixture"].includes(guarded.source));
  });
});

describeWhen("registerSpecialistRoutes Hono wiring", routeFiles, () => {
  const { registerSpecialistRoutes } = routeModule!;

  it("registers POST /specialist/:name on a RouteApp and returns guarded output", async () => {
    type Handler = (context: unknown) => Promise<Response> | Response;
    const handlers: Record<string, Record<string, Handler>> = { post: {}, get: {} };

    const fakeApp = {
      get(path: string, handler: Handler) {
        handlers.get[path] = handler;
      },
      post(path: string, handler: Handler) {
        handlers.post[path] = handler;
      }
    };

    registerSpecialistRoutes(fakeApp, { /* store stub; unused by this route */ } as unknown as never);
    const handler = handlers.post["/specialist/:name"];
    assert.ok(handler, "expected POST /specialist/:name handler to be registered");

    const requestBody = inputFor("intent", {
      anomaly_id: "anom:cache-seed:supported",
      evidence: [aisGap, dantiOsint, intentIndicator]
    });

    const fakeContext = {
      req: {
        json: async () => requestBody,
        param: (n: string) => (n === "name" ? "intent" : "")
      },
      json: (body: unknown, status?: number) =>
        new Response(JSON.stringify(body), {
          status: status ?? 200,
          headers: { "Content-Type": "application/json" }
        })
    };

    const res = await handler(fakeContext);
    assert.equal(res.status, 200);
    const parsed = (await res.json()) as { verdict: string; source: string; guard: { applied_layers: string[] } };
    assert.ok(["supported", "weakened", "contradicted", "refused"].includes(parsed.verdict));
    assert.ok(["aip", "cache", "fixture", "anthropic", "codex"].includes(parsed.source));
    assert.ok(Array.isArray(parsed.guard.applied_layers));
  });

  it("registered route returns 400 with UNKNOWN_SPECIALIST for an unknown name", async () => {
    type Handler = (context: unknown) => Promise<Response> | Response;
    const handlers: Record<string, Handler> = {};
    const fakeApp = {
      get() {},
      post(path: string, handler: Handler) {
        handlers[path] = handler;
      }
    };
    registerSpecialistRoutes(fakeApp, {} as never);

    const fakeContext = {
      req: {
        json: async () => inputFor("kinematics"),
        param: () => "telemetry"
      },
      json: (body: unknown, status?: number) =>
        new Response(JSON.stringify(body), {
          status: status ?? 200,
          headers: { "Content-Type": "application/json" }
        })
    };

    const res = await handlers["/specialist/:name"](fakeContext);
    assert.equal(res.status, 400);
    const parsed = (await res.json()) as { code: string };
    assert.equal(parsed.code, "UNKNOWN_SPECIALIST");
  });
});

describeWhen("cache auto-write round-trip", cacheFiles, () => {
  const { writeCache, reloadCacheFile, findCached, deleteCacheEntry } = cacheModule!;

  it("writeCache + reloadCacheFile makes a new entry findable; deleteCacheEntry restores prior state", () => {
    const testAnomalyId = "anom:auto-write-test:0001";
    const testKey = `intent::${testAnomalyId}`;

    try {
      writeCache({
        name: "intent",
        anomaly_id: testAnomalyId,
        key: testKey,
        cached_at: "2026-05-02T17:30:00Z",
        test_input: { evidence: [aisGap, dantiOsint, intentIndicator] },
        output: {
          verdict: "supported",
          summary: "Auto-write round-trip probe.",
          cited_observation_ids: [aisGap.id, dantiOsint.id],
          confidence: 0.7,
          unsupported_assertions: []
        }
      });

      reloadCacheFile();
      const hit = findCached("intent", testAnomalyId);
      assert.ok(hit);
      assert.equal(hit?.summary, "Auto-write round-trip probe.");
    } finally {
      deleteCacheEntry(testKey);
      reloadCacheFile();
      assert.equal(findCached("intent", testAnomalyId), null);
    }
  });
});

describeWhen("M3 stage proof: INTENT_INDICATOR toggle (demo punchline)", guardFiles, () => {
  const { applyGuard } = guardModule!;

  // TECHNICAL_PLAN.md M3 (line 570):
  //   "feed a fabricated 'hostile chatter' observation; intent specialist flips
  //    from refused to a cited verdict because constraint #2 is satisfied.
  //    Remove it; verdict reverts. Provable on stage."
  //
  // This test exercises the same toggle in one flow so a probing judge's
  // sequence is durably encoded: the model output stays "supported" throughout,
  // but the *guard* flips the persisted verdict because evidence membership
  // changes. The verdict is earned, not labeled.
  it("flips refused → supported → refused as the INTENT_INDICATOR is added then removed", () => {
    const aipSupported: SpecialistRawOutput = {
      verdict: "supported",
      summary: "Intent corroborated by chatter and corridor positioning.",
      cited_observation_ids: [aisGap.id, dantiOsint.id],
      confidence: 0.7,
      unsupported_assertions: []
    };

    const baseInput = inputFor("intent", {
      anomaly_id: "anom:stage-proof:0001"
    });

    // Beat 1 — no INTENT_INDICATOR: even though AIP returned "supported",
    // the guard refuses (layer 2).
    const beat1 = applyGuard(
      { ...baseInput, evidence: [aisGap, dantiOsint] },
      aipSupported
    );
    assert.equal(beat1.verdict, "refused");
    assert.ok(beat1.guard.applied_layers.includes("intent_indicator"));
    assert.equal(beat1.guard.forced_refused, true);

    // Beat 2 — judge/operator drops a "hostile chatter" INTENT_INDICATOR onto
    // the case. Same AIP output, same guard, but now layer 2 is satisfied.
    const beat2 = applyGuard(
      { ...baseInput, evidence: [aisGap, dantiOsint, intentIndicator] },
      aipSupported
    );
    assert.equal(beat2.verdict, "supported");
    assert.equal(
      beat2.guard.applied_layers.includes("intent_indicator"),
      false
    );
    assert.equal(beat2.guard.forced_refused, false);

    // Beat 3 — judge revokes the INTENT_INDICATOR. Verdict reverts. The
    // guard is what made the difference; the AIP output never changed.
    const beat3 = applyGuard(
      { ...baseInput, evidence: [aisGap, dantiOsint] },
      aipSupported
    );
    assert.equal(beat3.verdict, "refused");
    assert.ok(beat3.guard.applied_layers.includes("intent_indicator"));
    assert.equal(beat3.guard.forced_refused, true);

    // The AIP output's own claim never changes: refusal is structural.
    assert.equal(aipSupported.verdict, "supported");
  });
});

function filesReady(files: string[]): boolean {
  return files.every((file) => hasRepoFile(file));
}

function describeWhen(name: string, files: string[], callback: () => void): void {
  if (filesReady(files)) {
    describe(name, callback);
    return;
  }

  describe(name, () => {
    it("waits for specialist lane files", (t) => {
      const missing = files.filter((file) => !hasRepoFile(file));
      t.skip(`specialist lane files not present yet: ${missing.join(", ")}`);
    });
  });
}
