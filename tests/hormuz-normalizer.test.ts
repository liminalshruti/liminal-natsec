import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { repoUrl } from "./helpers/optional.ts";

const normalizer = await import("../scripts/normalize-hormuz-intel.mjs");

describe("Hormuz live-cache normalizer", () => {
  it("loads required live-cache fixture files", () => {
    const result = normalizer.normalizeHormuzIntel();
    for (const fileName of normalizer.REQUIRED_LIVE_CACHE_FILES) {
      assert.ok(result.loadedFiles.includes(fileName), fileName);
    }
  });

  it("emits source documents and evidence items", () => {
    const result = normalizer.normalizeHormuzIntel();

    assert.ok(result.sourceDocuments.length > 0);
    assert.ok(result.evidenceItems.length > 0);
    assert.ok(
      result.sourceDocuments.every(
        (doc: Record<string, unknown>) =>
          typeof doc.sha256 === "string" || doc.status === "unavailable"
      )
    );
    assert.ok(
      result.evidenceItems.every(
        (item: Record<string, unknown>) =>
          item.classification === "UNCLASSIFIED//OSINT_FIXTURE" &&
          typeof item.source_document_id === "string"
      )
    );
  });

  it("keeps ids stable across runs", () => {
    const first = normalizer.normalizeHormuzIntel();
    const second = normalizer.normalizeHormuzIntel();

    assert.deepEqual(
      first.sourceDocuments.map((doc: Record<string, unknown>) => doc.id),
      second.sourceDocuments.map((doc: Record<string, unknown>) => doc.id)
    );
    assert.deepEqual(
      first.evidenceItems.map((item: Record<string, unknown>) => item.id),
      second.evidenceItems.map((item: Record<string, unknown>) => item.id)
    );
  });

  it("writes curated fixture files", () => {
    const sourceDocs = JSON.parse(
      readFileSync(repoUrl("fixtures/maritime/hormuz-source-documents.json"), "utf8")
    );
    const evidence = JSON.parse(
      readFileSync(repoUrl("fixtures/maritime/hormuz-evidence-items.json"), "utf8")
    );
    const summary = JSON.parse(
      readFileSync(repoUrl("fixtures/maritime/hormuz-intel-summary.json"), "utf8")
    );

    assert.ok(Array.isArray(sourceDocs));
    assert.ok(Array.isArray(evidence));
    assert.equal(summary.source_document_count, sourceDocs.length);
    assert.equal(summary.evidence_item_count, evidence.length);
  });

  it("curated records contain no secret-like fields or values", () => {
    const result = normalizer.normalizeHormuzIntel();
    const payload = JSON.stringify({
      sourceDocuments: result.sourceDocuments,
      evidenceItems: result.evidenceItems,
      summary: result.summary
    });

    const forbidden = [
      /access[_-]?token/i,
      /refresh[_-]?token/i,
      /api[_-]?key/i,
      /client[_-]?secret/i,
      /authorization/i,
      /password/i,
      /username/i,
      /\bBearer\s+[A-Za-z0-9._~+/=-]+/i
    ];

    for (const pattern of forbidden) {
      assert.doesNotMatch(payload, pattern);
    }
  });

  it("labels internet-exposure sources as infrastructure-only evidence", () => {
    const result = normalizer.normalizeHormuzIntel();
    const infrastructureRows = result.evidenceItems.filter(
      (item: Record<string, unknown>) => item.source === "SHODAN"
    );

    assert.ok(infrastructureRows.length > 0);
    assert.ok(
      infrastructureRows.every(
        (item: Record<string, unknown>) =>
          item.category === "INFRASTRUCTURE_CONTEXT_ONLY" &&
          String(item.summary).includes(
            "Infrastructure-only; not vessel behavior evidence."
          )
      )
    );
  });

  it("does not treat AISstream global fallback samples as Hormuz vessel evidence", () => {
    const result = normalizer.normalizeHormuzIntel();
    const aisRows = result.evidenceItems.filter(
      (item: Record<string, unknown>) => item.source === "AISSTREAM"
    );

    assert.equal(aisRows.length, 1);
    assert.equal(aisRows[0].title, "AISstream Hormuz feed gap");
    assert.equal(aisRows[0].status, "unavailable");
    assert.match(
      String(aisRows[0].summary),
      /must not be used as Hormuz vessel behavior evidence/
    );
    assert.doesNotMatch(JSON.stringify(aisRows), /inside the Hormuz regional feed/i);
  });
});
