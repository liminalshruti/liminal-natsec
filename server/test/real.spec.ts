import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createApp } from "../src/index.ts";
import { createLocalStore } from "../src/stores/local.ts";

describe("real scenario routes", () => {
  it("serves strict real mode by default without demo alert fallback", async () => {
    const app = createApp(createLocalStore());
    const response = await app.request("/scenario/state");
    const body = await response.json() as Record<string, unknown>;

    assert.equal(response.status, 200);
    assert.equal(body.mode, "real");
    assert.equal(body.strictReal, true);
    assert.equal(body.caseGenerationStatus, "NO_REAL_CASE");
    assert.deepEqual(body.anomalies, []);
    assert.match(
      String(body.emptyReason),
      /Fixture-mode provider fallbacks were excluded|no dark gap exceeded the configured threshold/
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
