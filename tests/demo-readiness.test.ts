import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { repoUrl, skipIfMissing } from "./helpers/optional.ts";

describe("root tooling contracts", () => {
  it("exposes the required Bun-facing scripts", () => {
    const manifest = JSON.parse(readFileSync(repoUrl("package.json"), "utf8"));

    for (const script of [
      "install",
      "test",
      "dev:server",
      "dev:app",
      "dev",
      "build"
    ]) {
      assert.equal(
        typeof manifest.scripts?.[script],
        "string",
        `package.json is missing scripts.${script}`
      );
    }
  });

  it("declares TypeScript aliases for all integration lanes", () => {
    const config = JSON.parse(readFileSync(repoUrl("tsconfig.json"), "utf8"));
    const paths = config.compilerOptions?.paths ?? {};

    assert.deepEqual(paths["@app/*"], ["app/src/*"]);
    assert.deepEqual(paths["@server/*"], ["server/src/*"]);
    assert.deepEqual(paths["@shared/*"], ["shared/*"]);
    assert.deepEqual(paths["@graph-spine/*"], ["graph-spine/*"]);
    assert.deepEqual(paths["@fixtures/*"], ["fixtures/*"]);
  });

  it("documents the demo checklist and never-cut invariants", () => {
    const readme = readFileSync(repoUrl("README.md"), "utf8");

    for (const phrase of [
      "Start the server",
      "Start the app",
      "Run the replay",
      "Trigger the dark gap",
      "Open the custody case",
      "Show the specialist refusal",
      "Save the review rule",
      "Show the second case changed",
      "Ctrl+Shift+R",
      "Persistent shell",
      "Dark gap + two-MMSI identity churn",
      "Hypothesis board",
      "Evidence/provenance trace",
      "Prior rule applied / second case changed"
    ]) {
      assert.match(readme, new RegExp(escapeRegExp(phrase)));
    }
  });
});

describe("fixture and replay smoke contracts", () => {
  it("fixture pack has the minimum custody-loop files when present", (t) => {
    const required = [
      "fixtures/maritime/observations.json",
      "fixtures/maritime/anomalies.json",
      "fixtures/maritime/hypotheses.json",
      "fixtures/maritime/claims.json",
      "fixtures/maritime/evidence.json",
      "fixtures/maritime/actions.json",
      "fixtures/maritime/review-rules.json",
      "fixtures/maritime/scenario-alara-01.jsonl"
    ];

    if (skipIfMissing(t, required, "maritime fixture pack")) {
      return;
    }

    for (const file of required) {
      assert.ok(readFileSync(repoUrl(file), "utf8").trim().length > 0, file);
    }
  });

  it("server replay produces anomalies, claims, and actions when present", async (t) => {
    if (
      skipIfMissing(
        t,
        ["server/src/stores/local.ts", "server/src/replay/scenario.ts"],
        "server replay"
      )
    ) {
      return;
    }

    const { createLocalStore } = await import("../server/src/stores/local.ts");
    const { runFixtureReplay } = await import("../server/src/replay/scenario.ts");
    const store = createLocalStore();
    const replay = await runFixtureReplay(store, {
      scenarioRunId: "smoke:demo-readiness"
    });
    const claims = await store.query({ objectType: "Claim" });
    const actions = await store.query({ objectType: "CollectionAction" });

    assert.ok(replay.state.anomalies.length > 0);
    assert.ok(claims.length > 0);
    assert.ok(actions.length > 0);
  });

  it("server health returns ok when health route exists", async (t) => {
    if (
      skipIfMissing(
        t,
        ["server/src/routes/debug.ts", "server/src/stores/local.ts"],
        "server health"
      )
    ) {
      return;
    }

    const { buildHealthSnapshot } = await import("../server/src/routes/debug.ts");
    const { createLocalStore } = await import("../server/src/stores/local.ts");
    const health = await buildHealthSnapshot(createLocalStore());

    assert.equal(health.status, "ok");
  });
});

describe("app shell smoke contract", () => {
  it("app shell has a fixture fallback or fetch path when present", (t) => {
    if (
      skipIfMissing(
        t,
        ["app/src/App.tsx", "app/src/components/AppShell.tsx"],
        "app shell"
      )
    ) {
      return;
    }

    const sources = [
      readFileSync(repoUrl("app/src/App.tsx"), "utf8"),
      readFileSync(repoUrl("app/src/components/AppShell.tsx"), "utf8"),
      existsSync(repoUrl("app/src/lib/fixtures.ts"))
        ? readFileSync(repoUrl("app/src/lib/fixtures.ts"), "utf8")
        : ""
    ].join("\n");

    assert.match(sources, /fetch|fixtures|fallback/i);
  });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
