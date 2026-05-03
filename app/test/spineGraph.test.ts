import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  actionsForCase,
  caseIdFromAlertId,
  contradictionsForClaim,
  getMaritimeGraph,
  hypothesesForCase,
  reviewApplicationForCase,
  topActionForClaim,
  traceForAction
} from "../src/lib/spineGraph.ts";
import { specialistReadsForCase } from "../src/lib/specialistReads.ts";

describe("app spineGraph integration", () => {
  it("loads the maritime fixture pack into a graph-spine Graph", () => {
    const graph = getMaritimeGraph();
    assert.ok(graph.getNode("case:alara-01:event-1"));
    assert.ok(graph.getNode("case:alara-01:event-2"));
    assert.ok(graph.getNode("rr:watchfloor:dark-gap-sar-first:v1"));
    assert.ok(graph.getEdges().length > 0);
  });

  it("traces an action back to its observation through the spine", () => {
    const claimId = "claim:alara-01:event-1:custody:h1";
    const top = topActionForClaim(claimId);
    assert.ok(top, "claim should expose at least one TRIGGERS edge to an action");
    const trace = traceForAction(top.id);
    assert.ok(trace, "action should produce a non-null trace");
    const types = trace!.nodes.map((node) => node.type);
    assert.ok(types[0] === "actionOption");
    assert.ok(types.includes("observation"), `trace should reach observation; got ${types.join(",")}`);
  });

  it("findContradictions returns the metadata-conflict evidence node", () => {
    const contradictions = contradictionsForClaim("claim:alara-01:event-1:custody:h1");
    assert.deepEqual(
      contradictions.map((node) => node.id),
      ["ev:alara-01:event-1:metadata-conflict"]
    );
  });

  it("review rule R-001 changes the recommendation on event 2", () => {
    const application = reviewApplicationForCase("case:alara-01:event-2");
    assert.ok(application);
    assert.equal(application!.ruleId, "rr:watchfloor:dark-gap-sar-first:v1");
    assert.equal(application!.changed, true);
    assert.equal(application!.priorTopActionId, "act:alara-01:event-2:monitor");
    assert.equal(application!.recommendedActionId, "act:alara-01:event-2:request-sar-rf");
  });

  it("hypothesesForCase returns the three event-1 hypotheses", () => {
    const hypotheses = hypothesesForCase("case:alara-01:event-1");
    assert.equal(hypotheses.length, 3);
    assert.deepEqual(
      hypotheses.map((node) => node.id).sort(),
      [
        "hyp:alara-01:event-1:h1",
        "hyp:alara-01:event-1:h2",
        "hyp:alara-01:event-1:h3"
      ]
    );
  });

  it("actionsForCase returns the event-2 action options", () => {
    const actions = actionsForCase("case:alara-01:event-2");
    const ids = actions.map((node) => node.id).sort();
    assert.deepEqual(ids, [
      "act:alara-01:event-2:escalate",
      "act:alara-01:event-2:monitor",
      "act:alara-01:event-2:request-sar-rf"
    ]);
  });

  it("caseIdFromAlertId resolves anomaly nodes to their case", () => {
    const caseId = caseIdFromAlertId(
      "anom:identity-churn:trk-caldera:20260418T1015:1f44"
    );
    // The anomaly node carries case_id = case:alara-01:event-1 in the fixture.
    assert.equal(caseId, "case:alara-01:event-1");
  });

  it("specialist reads include the Intent refusal for event 1", () => {
    const reads = specialistReadsForCase("case:alara-01:event-1");
    const intent = reads.find((read) => read.specialist === "Intent");
    assert.ok(intent, "Intent read should exist on event 1");
    assert.equal(intent!.status, "REFUSED");
  });
});
