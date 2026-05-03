#!/usr/bin/env node
// Backfills a minimal schema on the SeaForge datasets that exist in Compass but
// have no transaction yet (Foundry's Ontology Manager refuses to bind a backing
// datasource without one).
//
// Strategy: open a transaction → upload a one-column CSV (primary-key) →
// commit. Foundry infers a STRING schema with column "primary-key", which
// matches what generate-seaforge-ontology-import.mjs maps as the object type's
// primary key.
//
// Run:
//   PALANTIR_TOKEN=... node scripts/foundry-bootstrap-empty-datasets.mjs

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = "https://liminal.usw-18.palantirfoundry.com";
const TOKEN = process.env.PALANTIR_TOKEN;
if (!TOKEN) {
  console.error("Missing PALANTIR_TOKEN env var.");
  process.exit(1);
}

const manifest = JSON.parse(
  readFileSync(resolve("foundry/generated/seaforge-datasets.json"), "utf8"),
);

const CSV_BODY = "primary-key\nbootstrap\n";

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});

async function main() {
  const targets = await findDatasetsNeedingSchema();
  if (targets.length === 0) {
    console.log("No datasets need bootstrapping. All schemas present.");
    return;
  }
  console.log(`Bootstrapping ${targets.length} dataset(s):`);
  for (const t of targets) console.log(`  - ${t.apiName}  ${t.rid}`);
  console.log("");

  for (const t of targets) {
    console.log(`[${t.apiName}] starting`);
    try {
      const existingTxnRid = await latestCommittedTransaction(t.rid);
      if (!existingTxnRid) {
        const txnRid = await openTransaction(t.rid);
        console.log(`  opened txn ${txnRid}`);
        await uploadCsv(t.rid, txnRid);
        console.log(`  uploaded primary-key.csv`);
        await commitTransaction(t.rid, txnRid);
        console.log(`  committed`);
      } else {
        console.log(`  reusing existing committed txn ${existingTxnRid}`);
      }
      const result = await putSchema(t.rid);
      console.log(`  put schema → versionId=${result.versionId}`);
      const schemaOk = await verifySchema(t.rid);
      console.log(`  schema verify: ${schemaOk ? "ok" : "still missing"}`);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }
  console.log("\nDone. Re-run the ontology import in Foundry — the datasource bind should now succeed.");
}

async function findDatasetsNeedingSchema() {
  const want = [
    "Vessel", "Track", "Observation", "AisMessage", "Case", "Anomaly",
    "Hypothesis", "Claim", "EvidenceItem", "SourceIntegrityCheck",
    "AreaOfInterest", "CollectionAction", "ReviewRule", "OperatorDecision",
    "SourceDocument",
  ];
  const out = [];
  for (const apiName of want) {
    const ds = manifest.resources.objectTypeDatasets[apiName];
    if (!ds) continue;
    const status = await schemaStatus(ds.rid);
    if (status !== 200) out.push({ apiName, rid: ds.rid, schemaStatus: status });
  }
  return out;
}

async function schemaStatus(rid) {
  const res = await fetch(
    `${BASE}/foundry-metadata/api/schemas/datasets/${encodeURIComponent(rid)}/branches/master`,
    { headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" } },
  );
  return res.status;
}

async function openTransaction(rid) {
  const res = await fetch(
    `${BASE}/api/v2/datasets/${encodeURIComponent(rid)}/transactions?preview=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ transactionType: "SNAPSHOT" }),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`openTransaction ${res.status}: ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  if (!data.rid) throw new Error(`openTransaction returned no rid: ${text.slice(0, 200)}`);
  return data.rid;
}

async function uploadCsv(datasetRid, txnRid) {
  const url =
    `${BASE}/api/v2/datasets/${encodeURIComponent(datasetRid)}/files/primary-key.csv/upload` +
    `?transactionRid=${encodeURIComponent(txnRid)}&preview=true`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/octet-stream",
    },
    body: CSV_BODY,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`uploadCsv ${res.status}: ${text.slice(0, 300)}`);
  }
}

async function commitTransaction(datasetRid, txnRid) {
  const res = await fetch(
    `${BASE}/api/v2/datasets/${encodeURIComponent(datasetRid)}/transactions/${encodeURIComponent(txnRid)}/commit?preview=true`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`commitTransaction ${res.status}: ${text.slice(0, 300)}`);
  }
}

async function latestCommittedTransaction(rid) {
  const res = await fetch(
    `${BASE}/api/v2/datasets/${encodeURIComponent(rid)}/transactions?preview=true`,
    { headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" } },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const committed = (data.data || []).find((t) => t.status === "COMMITTED");
  return committed?.rid ?? null;
}

async function putSchema(rid) {
  const body = {
    fieldSchemaList: [
      {
        type: "STRING",
        name: "primary-key",
        nullable: null,
        userDefinedTypeClass: null,
        customMetadata: {},
        arraySubtype: null,
        precision: null,
        scale: null,
        mapKeyType: null,
        mapValueType: null,
        subSchemas: null,
      },
    ],
    primaryKey: null,
    dataFrameReaderClass: "com.palantir.foundry.spark.input.ParquetDataFrameReader",
    customMetadata: { format: "parquet", options: {} },
  };
  const res = await fetch(
    `${BASE}/foundry-metadata/api/schemas/datasets/${encodeURIComponent(rid)}/branches/master`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`putSchema ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function verifySchema(rid) {
  await new Promise((r) => setTimeout(r, 500));
  return (await schemaStatus(rid)) === 200;
}
