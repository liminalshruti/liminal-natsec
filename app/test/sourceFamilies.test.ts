import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FAMILY_ORDER,
  FAMILY_PHASE_MIN,
  countsForPhase,
  familyForSource,
  familyForSourceFile,
  groupBySource
} from "../src/lib/sourceFamilies.ts";

describe("sourceFamilies", () => {
  it("maps known sources to families", () => {
    assert.equal(familyForSource("COPERNICUS_CDSE_STAC"), "satellite");
    assert.equal(familyForSource("AISSTREAM"), "ais");
    assert.equal(familyForSource("GLOBAL_FISHING_WATCH"), "ais");
    assert.equal(familyForSource("OPENSANCTIONS"), "sanctions");
    assert.equal(familyForSource("NAVAREA_IX"), "warnings");
    assert.equal(familyForSource("UKMTO"), "warnings");
    assert.equal(familyForSource("EXA"), "osint");
    assert.equal(familyForSource("ACLED"), "osint");
    assert.equal(familyForSource("SHODAN"), "infra");
    assert.equal(familyForSource("OVERPASS"), "infra");
  });

  it("returns null for unknown sources", () => {
    assert.equal(familyForSource("WHATEVER"), null);
    assert.equal(familyForSource(undefined), null);
    assert.equal(familyForSource(null), null);
  });

  it("recovers family from a citation source_file path", () => {
    assert.equal(
      familyForSourceFile("fixtures/maritime/live-cache/aisstream-hormuz-sample.json"),
      "ais"
    );
    assert.equal(
      familyForSourceFile("fixtures/maritime/live-cache/gfw-hormuz-gaps.json"),
      "ais"
    );
    assert.equal(
      familyForSourceFile(
        "fixtures/maritime/live-cache/opensanctions-hormuz-maritime-entities.json"
      ),
      "sanctions"
    );
    assert.equal(
      familyForSourceFile(
        "fixtures/maritime/live-cache/sentinelhub-hormuz-sentinel1-vv.metadata.json"
      ),
      "satellite"
    );
    assert.equal(
      familyForSourceFile(
        "fixtures/maritime/live-cache/navarea-ix-warnings.metadata.json"
      ),
      "warnings"
    );
    assert.equal(
      familyForSourceFile("fixtures/maritime/live-cache/exa-hormuz-osint.json"),
      "osint"
    );
    assert.equal(
      familyForSourceFile("fixtures/maritime/live-cache/overpass-hormuz-maritime.json"),
      "infra"
    );
  });

  it("groups items by family and drops unmapped sources", () => {
    const items = [
      { id: "1", source: "AISSTREAM" },
      { id: "2", source: "COPERNICUS_CDSE_STAC" },
      { id: "3", source: "EXA" },
      { id: "4", source: "EXA" },
      { id: "5", source: "WHATEVER" }
    ];
    const groups = groupBySource(items);
    assert.equal(groups.ais.length, 1);
    assert.equal(groups.satellite.length, 1);
    assert.equal(groups.osint.length, 2);
    assert.equal(groups.sanctions.length, 0);
  });

  it("phase-keyed counts honor FAMILY_PHASE_MIN", () => {
    const items = [
      { id: "s1", source: "COPERNICUS_CDSE_STAC" },
      { id: "a1", source: "AISSTREAM" },
      { id: "san1", source: "OPENSANCTIONS" },
      { id: "o1", source: "EXA" },
      { id: "w1", source: "NAVAREA_IX" },
      { id: "i1", source: "OVERPASS" }
    ];
    const p1 = countsForPhase(items, 1);
    // P1 reveals satellite + warnings + infra
    assert.equal(p1.satellite, 1);
    assert.equal(p1.warnings, 1);
    assert.equal(p1.infra, 1);
    // AIS / sanctions / osint are still 0 at P1
    assert.equal(p1.ais, 0);
    assert.equal(p1.sanctions, 0);
    assert.equal(p1.osint, 0);

    // P2 adds AIS
    const p2 = countsForPhase(items, 2);
    assert.equal(p2.ais, 1);
    assert.equal(p2.sanctions, 0);
    assert.equal(p2.osint, 0);

    // P3+ has everything
    const p3 = countsForPhase(items, 3);
    assert.equal(p3.sanctions, 1);
    assert.equal(p3.osint, 1);
  });

  it("FAMILY_ORDER is canonical and stable", () => {
    assert.deepEqual(
      [...FAMILY_ORDER],
      ["satellite", "ais", "sanctions", "warnings", "osint", "infra"]
    );
  });

  it("every family has a phase_min", () => {
    for (const fam of FAMILY_ORDER) {
      assert.ok(typeof FAMILY_PHASE_MIN[fam] === "number");
      assert.ok(FAMILY_PHASE_MIN[fam] >= 1 && FAMILY_PHASE_MIN[fam] <= 6);
    }
  });
});
