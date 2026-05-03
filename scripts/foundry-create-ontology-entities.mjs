#!/usr/bin/env node
// Discovery + create driver for the SeaForge ontology entities.
//
// Reads PALANTIR_TOKEN from the environment so the secret never lives in source.
// Steps:
//   1. Verify the token by calling /ontology-metadata/api/ontology/ontology/bulkLoadEntities (read).
//   2. Probe sibling endpoints for the create / modify route.
//   3. If a write endpoint responds without an error, attempt one safe creation
//      (a single SourceDocument object type) as a confirmation; if successful,
//      proceed to create the rest.
//
// Run:
//   PALANTIR_TOKEN=... node scripts/foundry-create-ontology-entities.mjs --probe
//   PALANTIR_TOKEN=... node scripts/foundry-create-ontology-entities.mjs --create-objects
//   PALANTIR_TOKEN=... node scripts/foundry-create-ontology-entities.mjs --create-links
//   PALANTIR_TOKEN=... node scripts/foundry-create-ontology-entities.mjs --create-actions

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://liminal.usw-18.palantirfoundry.com";
const PROJECT_FOLDER_RID = "ri.compass.main.folder.568e1127-5b83-41ea-973e-6965a95e6ec5";

const NEW_OBJECTS = [
  "AisMessage",
  "AreaOfInterest",
  "EvidenceItem",
  "OperatorDecision",
  "ReviewRule",
  "SourceDocument",
  "SourceIntegrityCheck",
];

const TOKEN = process.env.PALANTIR_TOKEN;
if (!TOKEN) {
  console.error("Missing PALANTIR_TOKEN env var. Run with: PALANTIR_TOKEN=... node scripts/foundry-create-ontology-entities.mjs <flag>");
  process.exit(1);
}

const argv = process.argv.slice(2);
const mode =
  argv.includes("--create-objects") ? "create-objects"
  : argv.includes("--create-links") ? "create-links"
  : argv.includes("--create-actions") ? "create-actions"
  : "probe";

const importJsonPath = resolve("foundry/generated/ontology.objects.json");
if (!existsSync(importJsonPath)) {
  console.error(`Missing ${importJsonPath}. Run scripts/generate-seaforge-ontology-import.mjs --objects-only first.`);
  process.exit(1);
}
const importJson = JSON.parse(readFileSync(importJsonPath, "utf8"));

main().catch((err) => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});

async function main() {
  console.log(`Mode: ${mode}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  if (mode === "probe") return probe();
  if (mode === "create-objects") return createObjects();
  console.log(`Mode '${mode}' not yet implemented (objects-only path is the priority).`);
}

async function probe() {
  console.log("=== probe: verifying token + discovering endpoints ===\n");

  // Step 1: bulkLoadEntities (read) — confirmed working from your captured request.
  const loadRes = await fetchJson("/ontology-metadata/api/ontology/ontology/bulkLoadEntities", {
    method: "POST",
    body: { datasources: false, objectTypes: { rids: [], apiNames: [], includeAllVisible: true }, linkTypes: { rids: [], apiNames: [], includeAllVisible: false } },
  });
  console.log("bulkLoadEntities:", loadRes.status, loadRes.ok ? `→ ${loadRes.data?.objectTypes?.length ?? 0} object types visible` : loadRes.data);

  // Step 2: probe candidate write endpoints (HEAD/GET first to check existence).
  const candidates = [
    "/ontology-metadata/api/ontology/ontology/modify",
    "/ontology-metadata/api/ontology/ontology/bulkModifyEntities",
    "/ontology-metadata/api/ontology/ontology/objectTypes",
    "/ontology-metadata/api/ontology/ontology/createObjectType",
    "/ontology-metadata/api/ontology/ontology/upsertObjectType",
    "/ontology-metadata/api/object-types",
  ];

  for (const path of candidates) {
    // We send an empty POST and observe the response shape (4xx with structured error
    // generally means the endpoint exists and validated; 404 usually means missing).
    const res = await fetchJson(path, { method: "POST", body: {} });
    console.log(`${path.padEnd(60)} ${res.status} ${res.data?.errorCode ?? res.data?.message?.slice?.(0, 60) ?? ""}`);
  }

  console.log("\n=== probe complete ===");
  console.log("If any endpoint above returned 200 or a structured 4xx (not 404), that's likely the write surface.");
  console.log("Re-run with --create-objects after we've identified the right endpoint.");
}

async function createObjects() {
  console.log("=== create-objects: not yet wired ===");
  console.log("After probe identifies the write endpoint, this function will iterate the 7 missing");
  console.log("object types from foundry/generated/ontology.objects.json and POST each one with");
  console.log(`save location = ${PROJECT_FOLDER_RID}.`);
  console.log("\nThe 7 to create:");
  for (const apiName of NEW_OBJECTS) {
    const ot = (importJson.objectTypes || []).find((o) => o.apiName === apiName);
    if (!ot) {
      console.log(`  ${apiName.padEnd(28)} MISSING from import json`);
      continue;
    }
    console.log(`  ${apiName.padEnd(28)} display="${ot.displayMetadata?.displayName}"  dataset=${ot.datasources?.[0]?.backingResourceRid?.slice(-12)}`);
  }
}

async function fetchJson(path, { method = "GET", body } = {}) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body == null ? undefined : JSON.stringify(body),
    });
    let data = null;
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = { rawBody: text.slice(0, 200) }; }
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    return { status: 0, ok: false, data: { error: err.message } };
  }
}
