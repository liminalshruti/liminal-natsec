import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createApp } from "../src/index.ts";
import { createLocalStore } from "../src/stores/local.ts";

describe("real scenario routes", () => {
  it("serves cached strict-real OSINT cases by default without demo fallback", async () => {
    const app = createApp(createLocalStore());
    const response = await app.request("/scenario/state");
    const body = await response.json() as Record<string, unknown>;

    assert.equal(response.status, 200);
    assert.equal(body.mode, "real");
    assert.equal(body.strictReal, true);
    assert.equal(body.caseGenerationStatus, "READY");
    assert.equal(body.emptyReason, null);
    assert.ok(Array.isArray(body.anomalies));
    assert.equal((body.anomalies as unknown[]).length, 5);
    assert.ok(
      (body.anomalies as Array<Record<string, unknown>>).some(
        (row) => row.object_id === "case:real:hormuz:roshak-signal-integrity"
      )
    );
  });

  it("exposes a refresh endpoint for offline regeneration from cached files", async () => {
    const app = createApp(createLocalStore());
    const response = await app.request("/real/status");
    const body = await response.json() as Record<string, unknown>;

    assert.equal(response.status, 200);
    assert.equal(body.mode, "real");
    assert.equal(body.tracksUrl, "/fixtures/maritime/real/tracks.geojson");
    assert.ok(Array.isArray(body.sourceStatuses));
  });
});
