import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HORMUZ_DRAWER_GROUPS } from "../../shared/hormuz/types.ts";
import {
  buildHormuzIntelDrawerModel,
  DEFAULT_HORMUZ_REQUIRED_SOURCES,
  hormuzEvidenceItems,
  hormuzSourceDocuments
} from "../src/lib/hormuzIntel.ts";

describe("Hormuz intel drawer model", () => {
  it("groups records into the five required drawer sections", () => {
    const model = buildHormuzIntelDrawerModel();

    assert.deepEqual(
      model.groups.map((group) => group.label),
      [...HORMUZ_DRAWER_GROUPS]
    );
    assert.ok(model.groups.every((group) => group.rows.length > 0));
    assert.equal(
      model.groups.reduce((total, group) => total + group.rows.length, 0),
      model.totalRows
    );
  });

  it("keeps blocked providers and feed gaps explicit in drawer rows", () => {
    const model = buildHormuzIntelDrawerModel();
    const rows = model.groups.flatMap((group) => group.rows);

    assert.equal(model.unavailableRows, 3);
    assert.ok(
      rows.some(
        (row) =>
          row.source === "OPENSANCTIONS" &&
          row.status === "unavailable" &&
          row.summary.includes("OpenSanctions entity-risk search results are unavailable.")
      )
    );
    assert.ok(
      rows.some(
        (row) =>
          row.source === "SHODAN" &&
          row.status === "available" &&
          row.summary.includes("Infrastructure-only; not vessel behavior evidence.")
      )
    );
    assert.ok(
      rows.some(
        (row) =>
          row.source === "GLOBAL_FISHING_WATCH" &&
          row.status === "available" &&
          row.summary.includes("identity/source corroboration only")
      )
    );
    assert.ok(
      rows.some(
        (row) =>
          row.source === "AISSTREAM" &&
          row.status === "unavailable" &&
          /must not be used as Hormuz vessel behavior evidence|excluded from real vessel behavior evidence/.test(row.summary)
      )
    );
    assert.ok(
      rows.some(
        (row) =>
          row.source === "GDELT" &&
          row.status === "unavailable" &&
          row.summary.includes("fixture fallback articles are excluded from real OSINT signals")
      )
    );
  });

  it("produces concise unavailable states for missing providers", () => {
    const requiredSources = DEFAULT_HORMUZ_REQUIRED_SOURCES.filter(
      (source) => source.source === "UKMTO"
    );
    const model = buildHormuzIntelDrawerModel([], [], { requiredSources });
    const rows = model.groups.flatMap((group) => group.rows);

    assert.equal(rows.length, 1);
    assert.equal(rows[0].source, "UKMTO");
    assert.equal(rows[0].status, "unavailable");
    assert.match(rows[0].summary, /source document missing/);
  });

  it("shows Sentinel Hub chip assets when present", () => {
    const model = buildHormuzIntelDrawerModel(hormuzEvidenceItems, hormuzSourceDocuments);
    const chipRows = model.groups
      .flatMap((group) => group.rows)
      .filter((row) => row.source === "SENTINEL_HUB_PROCESS");

    assert.ok(chipRows.length > 0);
    assert.ok(chipRows.every((row) => row.imageSrc?.endsWith(".png")));
  });
});
