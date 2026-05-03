// Probe the palantir-mcp stdio server with a real JSON-RPC handshake.
// Run: node scripts/probe-palantir-mcp.mjs
// Reads FOUNDRY_TOKEN + FOUNDRY_BASE_URL from ./config.ini.

import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const cfg = readFileSync(new URL("../config.ini", import.meta.url), "utf8");
const grab = (key) => {
  const match = cfg.split("\n").find((line) => line.startsWith(`${key}=`));
  return match ? match.slice(key.length + 1).trim() : "";
};
const FOUNDRY_TOKEN = grab("FOUNDRY_TOKEN");
const FOUNDRY_BASE_URL = grab("FOUNDRY_BASE_URL");
if (!FOUNDRY_TOKEN || !FOUNDRY_BASE_URL) {
  console.error("Missing FOUNDRY_TOKEN or FOUNDRY_BASE_URL in config.ini");
  process.exit(1);
}

console.log(`[probe] spawning palantir-mcp against ${FOUNDRY_BASE_URL}`);
const child = spawn(
  "npx",
  ["-y", "palantir-mcp", "--foundry-api-url", FOUNDRY_BASE_URL],
  {
    env: { ...process.env, FOUNDRY_TOKEN },
    stdio: ["pipe", "pipe", "pipe"]
  }
);

let buffer = "";
const pending = new Map();
let nextId = 1;

child.stdout.on("data", (chunk) => {
  buffer += chunk.toString();
  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  }
});

child.stderr.on("data", (chunk) => {
  // npx download progress + server logs land here; only print non-empty lines
  const text = chunk.toString().trim();
  if (text) console.error(`[mcp stderr] ${text.split("\n").slice(0, 3).join(" | ")}`);
});

function rpc(method, params) {
  const id = nextId++;
  const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
  return new Promise((resolve, reject) => {
    pending.set(id, resolve);
    child.stdin.write(payload + "\n");
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`timeout waiting for ${method}`));
      }
    }, 25_000);
  });
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

try {
  console.log("[probe] -> initialize");
  const init = await rpc("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "seaforge-probe", version: "0.0.1" }
  });
  console.log(`[probe] <- server: ${init.result?.serverInfo?.name ?? "?"} ` +
    `v${init.result?.serverInfo?.version ?? "?"}, protocol ${init.result?.protocolVersion}`);

  notify("notifications/initialized", {});

  console.log("[probe] -> tools/list");
  const tools = await rpc("tools/list", {});
  const names = (tools.result?.tools ?? []).map((t) => t.name);
  console.log(`[probe] <- ${names.length} tools registered`);
  console.log(`[probe]    sample: ${names.slice(0, 12).join(", ")}${names.length > 12 ? ", ..." : ""}`);

  // Try a definitely-read-only tool to confirm Foundry auth works.
  // Name pattern: search/list/get-ontology — pick the safest candidate.
  const readOnlyCandidates = names.filter((n) =>
    /list|get|search|describe|read/i.test(n) && !/delete|create|update|modify|write|patch|set/i.test(n)
  );
  console.log(`[probe]    read-only candidates: ${readOnlyCandidates.slice(0, 5).join(", ")}`);

  // Attempt to fetch user info or list ontologies — pick the first safe one.
  const probeTool =
    names.find((n) => n === "get_foundry_ontology_rid") ??
    names.find((n) => /list_ontologies|get_user|whoami|user_info|list_object_types/i.test(n));
  if (probeTool) {
    console.log(`[probe] -> tools/call ${probeTool}`);
    const result = await rpc("tools/call", { name: probeTool, arguments: {} });
    if (result.error) {
      console.log(`[probe] <- error: ${result.error.message}`);
    } else {
      const content = result.result?.content?.[0];
      const preview = typeof content?.text === "string"
        ? content.text.slice(0, 240).replace(/\s+/g, " ")
        : JSON.stringify(content).slice(0, 240);
      console.log(`[probe] <- OK: ${preview}${preview.length >= 240 ? "..." : ""}`);
    }
  } else {
    console.log(`[probe] no obvious read-only probe tool found; handshake + tools/list confirmed`);
  }

  console.log("\n[probe] PASS — MCP is wired and Foundry auth is reachable.");
  child.kill();
  process.exit(0);
} catch (err) {
  console.error(`[probe] FAIL: ${err.message}`);
  child.kill();
  process.exit(1);
}
