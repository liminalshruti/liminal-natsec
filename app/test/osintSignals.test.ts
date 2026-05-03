import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  categoryCounts,
  loadOsintSignals,
  OSINT_CATEGORY_ORDER
} from "../src/lib/osintSignals.ts";

describe("osintSignals loader", () => {
  it("flattens live-cache fixtures into a non-empty newest-first feed", () => {
    const signals = loadOsintSignals();
    assert.ok(signals.length > 0, "expected at least one signal from live-cache fixtures");

    for (const s of signals) {
      assert.ok(s.id, `missing id on ${s.source}`);
      assert.ok(s.source, "missing source");
      assert.ok(s.sourceLabel, `missing sourceLabel on ${s.source}`);
      assert.ok(s.title, `missing title on ${s.source}`);
      assert.ok(
        OSINT_CATEGORY_ORDER.includes(s.category),
        `unknown category ${s.category} on ${s.source}`
      );
    }
  });

  it("memoizes the result so module-level state stays stable", () => {
    const a = loadOsintSignals();
    const b = loadOsintSignals();
    assert.strictEqual(a, b, "expected loadOsintSignals to return the cached array");
  });

  it("sorts by timestamp descending; rows without timestamps fall to the bottom", () => {
    const signals = loadOsintSignals();
    let lastTs: number | null = null;
    let seenUntimestamped = false;
    for (const s of signals) {
      const t = s.timestamp ? Date.parse(s.timestamp) : NaN;
      if (Number.isFinite(t)) {
        if (seenUntimestamped) {
          assert.fail(`timestamped row ${s.id} appeared after an untimestamped row`);
        }
        if (lastTs !== null && t > lastTs) {
          assert.fail(
            `out-of-order timestamp on ${s.source}:${s.id} (${s.timestamp} > ${new Date(lastTs).toISOString()})`
          );
        }
        lastTs = t;
      } else {
        seenUntimestamped = true;
      }
    }
  });

  it("includes signals from every adapter that has fixture data", () => {
    const signals = loadOsintSignals();
    const sources = new Set(signals.map((s) => s.source));
    // These sources have non-empty fixtures right now; if a fixture refresh
    // empties one out, the failure here is a useful early warning.
    const expected = [
      "EXA",
      "GDELT",
      "MARAD",
      "NAVAREA_IX",
      "OFAC",
      "GFW_GAPS",
      "GFW_LOITERING",
      "GFW_PORT_VISITS",
      "PORTWATCH",
      "AISSTREAM",
      "SENTINEL_1",
      "SENTINEL_2",
      "SHODAN"
    ];
    for (const src of expected) {
      assert.ok(sources.has(src), `expected at least one signal from ${src}`);
    }
  });

  it("category counts add up to the total signal count", () => {
    const signals = loadOsintSignals();
    const counts = categoryCounts(signals);
    const totalByCategory =
      counts.news +
      counts.warnings +
      counts.sanctions +
      counts["vessel-events"] +
      counts.imagery +
      counts.infra;
    assert.equal(totalByCategory, signals.length);
    assert.equal(counts.all, signals.length);
  });

  it("de-duplicates by id", () => {
    const signals = loadOsintSignals();
    const ids = new Set(signals.map((s) => s.id));
    assert.equal(ids.size, signals.length, "duplicate ids in feed output");
  });
});
