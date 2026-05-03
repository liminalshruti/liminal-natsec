import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { repoUrl, skipIfMissing } from "./helpers/optional.ts";

const fixtureDir = new URL("../fixtures/maritime/", import.meta.url);

function readJson<T>(fileName: string): T {
  return JSON.parse(readFileSync(new URL(fileName, fixtureDir), "utf8")) as T;
}

function readJsonl<T>(fileName: string): T[] {
  return readFileSync(new URL(fileName, fixtureDir), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function fixtureGraph(Graph: { fromFixture: (fixtures: unknown[]) => unknown }): unknown {
  return Graph.fromFixture([
    readJson("observations.json"),
    readJson("anomalies.json"),
    readJson("hypotheses.json"),
    readJson("claims.json"),
    readJson("evidence.json"),
    readJson("actions.json"),
    readJson("review-rules.json")
  ]);
}

describe("graph-spine schema contracts", () => {
  it("validates node and edge types", async (t) => {
    if (skipIfMissing(t, ["graph-spine/schema.ts"], "graph-spine schema")) {
      return;
    }

    const {
      EDGE_TYPES,
      NODE_TYPES,
      validateNode
    } = await import("../graph-spine/schema.ts");
    const node = validateNode({
      id: "node:valid",
      type: "claim",
      title: "A contested assertion",
      data: { status: "contested" }
    });

    assert.equal(node.type, "claim");
    assert.ok(NODE_TYPES.includes("actionOption"));
    assert.ok(EDGE_TYPES.includes("CONTRADICTS"));

    assert.throws(
      () => validateNode({ id: "node:invalid", type: "boat", title: "Bad type" }),
      /Unsupported node type/
    );
  });

  it("requires provenance metadata on every edge", async (t) => {
    if (skipIfMissing(t, ["graph-spine/schema.ts"], "graph-spine schema")) {
      return;
    }

    const { validateEdge } = await import("../graph-spine/schema.ts");
    const edge = validateEdge({
      id: "edge:valid",
      type: "SUPPORTS",
      from: "node:source",
      to: "node:target",
      provenance: {
        created_at: "2026-05-02T00:00:00Z",
        created_by: "fixture",
        source_node_ids: ["node:source"],
        confidence: 0.7,
        rationale: "Fixture assertion."
      }
    });

    assert.equal(edge.provenance.created_by, "fixture");
    assert.deepEqual(edge.provenance.source_node_ids, ["node:source"]);
    assert.equal(edge.provenance.confidence, 0.7);
    assert.equal(edge.provenance.rationale, "Fixture assertion.");

    assert.throws(
      () =>
        validateEdge({
          id: "edge:invalid",
          type: "SUPPORTS",
          from: "node:source",
          to: "node:target"
        }),
      /Edge provenance is required/
    );
  });
});

describe("fixture-backed graph behavior", () => {
  it("loads the maritime fixture pack into a valid graph", async (t) => {
    if (
      skipIfMissing(
        t,
        [
          "graph-spine/graph.ts",
          "fixtures/maritime/observations.json",
          "fixtures/maritime/anomalies.json",
          "fixtures/maritime/hypotheses.json",
          "fixtures/maritime/claims.json",
          "fixtures/maritime/evidence.json",
          "fixtures/maritime/actions.json",
          "fixtures/maritime/review-rules.json",
          "fixtures/maritime/scenario-alara-01.jsonl"
        ],
        "fixture-backed graph"
      )
    ) {
      return;
    }

    const { Graph } = await import("../graph-spine/graph.ts");
    const graph = fixtureGraph(Graph) as {
      getNode: (id: string) => unknown;
      getEdges: () => unknown[];
    };

    assert.ok(graph.getNode("case:alara-01:event-1"));
    assert.ok(graph.getNode("case:alara-01:event-2"));
    assert.ok(graph.getNode("rr:watchfloor:dark-gap-sar-first:v1"));
    assert.ok(graph.getEdges().length > 0);

    const events = readJsonl<{ event: string }>("scenario-alara-01.jsonl");
    assert.deepEqual(
      events.map((event) => event.event),
      [
        "observation",
        "anomaly",
        "hypothesis",
        "claim",
        "action_option",
        "review_rule",
        "second_case_changed"
      ]
    );
  });

  it("traceBack(actionId) returns Action -> Claim -> Hypothesis -> Anomaly -> Observation", async (t) => {
    if (
      skipIfMissing(
        t,
        [
          "graph-spine/graph.ts",
          "graph-spine/provenance.ts",
          "fixtures/maritime/observations.json",
          "fixtures/maritime/anomalies.json",
          "fixtures/maritime/hypotheses.json",
          "fixtures/maritime/claims.json",
          "fixtures/maritime/evidence.json",
          "fixtures/maritime/actions.json",
          "fixtures/maritime/review-rules.json"
        ],
        "graph trace smoke"
      )
    ) {
      return;
    }

    const { Graph } = await import("../graph-spine/graph.ts");
    const { traceBack } = await import("../graph-spine/provenance.ts");
    const trace = traceBack(
      fixtureGraph(Graph),
      "act:alara-01:event-1:request-sar-rf"
    ) as { nodes: Array<{ id: string; type: string }> };

    assert.deepEqual(
      trace.nodes.map((node) => node.type),
      ["actionOption", "claim", "hypothesis", "anomaly", "observation"]
    );
    assert.deepEqual(
      trace.nodes.map((node) => node.id),
      [
        "act:alara-01:event-1:request-sar-rf",
        "claim:alara-01:event-1:custody:h1",
        "hyp:alara-01:event-1:h1",
        "anom:identity-churn:trk-caldera:20260418T1015:1f44",
        "obs:aishub:366700111:20260418T101504Z"
      ]
    );
  });

  it("first case has support plus weakening or contradiction evidence", async (t) => {
    if (
      skipIfMissing(
        t,
        [
          "graph-spine/graph.ts",
          "fixtures/maritime/observations.json",
          "fixtures/maritime/anomalies.json",
          "fixtures/maritime/hypotheses.json",
          "fixtures/maritime/claims.json",
          "fixtures/maritime/evidence.json",
          "fixtures/maritime/actions.json",
          "fixtures/maritime/review-rules.json"
        ],
        "fixture-backed graph"
      )
    ) {
      return;
    }

    const { Graph } = await import("../graph-spine/graph.ts");
    const graph = fixtureGraph(Graph) as {
      edgesForNode: (id: string) => Array<{ from: string; to: string; type: string }>;
    };
    const claimId = "claim:alara-01:event-1:custody:h1";
    const linkedEdges = graph
      .edgesForNode(claimId)
      .filter((edge) => edge.from === claimId || edge.to === claimId);

    assert.ok(linkedEdges.some((edge) => edge.type === "SUPPORTS"));
    assert.ok(
      linkedEdges.some(
        (edge) => edge.type === "WEAKENS" || edge.type === "CONTRADICTS"
      )
    );
  });

  it("findContradictions() returns contradiction nodes for a contested claim", async (t) => {
    if (
      skipIfMissing(
        t,
        [
          "graph-spine/graph.ts",
          "graph-spine/provenance.ts",
          "fixtures/maritime/observations.json",
          "fixtures/maritime/anomalies.json",
          "fixtures/maritime/hypotheses.json",
          "fixtures/maritime/claims.json",
          "fixtures/maritime/evidence.json",
          "fixtures/maritime/actions.json",
          "fixtures/maritime/review-rules.json"
        ],
        "graph contradiction smoke"
      )
    ) {
      return;
    }

    const { Graph } = await import("../graph-spine/graph.ts");
    const { findContradictions } = await import("../graph-spine/provenance.ts");
    const contradictions = findContradictions(
      fixtureGraph(Graph),
      "claim:alara-01:event-1:custody:h1"
    ) as Array<{ id: string }>;

    assert.deepEqual(
      contradictions.map((node) => node.id),
      ["ev:alara-01:event-1:metadata-conflict"]
    );
  });

  it("applying R-001 changes the second case recommendation", async (t) => {
    if (
      skipIfMissing(
        t,
        [
          "graph-spine/graph.ts",
          "graph-spine/review-memory.ts",
          "fixtures/maritime/observations.json",
          "fixtures/maritime/anomalies.json",
          "fixtures/maritime/hypotheses.json",
          "fixtures/maritime/claims.json",
          "fixtures/maritime/evidence.json",
          "fixtures/maritime/actions.json",
          "fixtures/maritime/review-rules.json"
        ],
        "review-memory graph smoke"
      )
    ) {
      return;
    }

    const { Graph } = await import("../graph-spine/graph.ts");
    const { applyReviewRules } = await import("../graph-spine/review-memory.ts");
    const application = applyReviewRules(
      fixtureGraph(Graph),
      "case:alara-01:event-2"
    ) as {
      ruleId: string;
      changed: boolean;
      priorTopActionId: string;
      recommendedActionId: string;
    } | null;

    assert.ok(application);
    assert.equal(application.ruleId, "rr:watchfloor:dark-gap-sar-first:v1");
    assert.equal(application.changed, true);
    assert.equal(application.priorTopActionId, "act:alara-01:event-2:monitor");
    assert.equal(
      application.recommendedActionId,
      "act:alara-01:event-2:request-sar-rf"
    );
  });
});

describe("graph-spine source boundaries", () => {
  it("keeps domain-specific terms out of executable graph-spine code", (t) => {
    if (skipIfMissing(t, ["graph-spine"], "graph-spine source")) {
      return;
    }

    const sourceDir = repoUrl("graph-spine/");
    const forbidden = /\b(vessel|ais|mmsi|aoi|port|harbor)\b/i;

    for (const fileName of readdirSync(sourceDir)) {
      if (!fileName.endsWith(".ts")) continue;
      const source = readFileSync(join(sourceDir.pathname, fileName), "utf8");
      const codeLines = source
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("//"));

      assert.equal(
        codeLines.some((line) => forbidden.test(line)),
        false,
        `${fileName} contains a forbidden domain term in executable code`
      );
    }
  });
});
