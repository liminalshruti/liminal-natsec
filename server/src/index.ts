import { Hono } from "hono";

import { registerActionRoutes } from "./routes/actions.ts";
import { registerAnomalyRoutes } from "./routes/anomalies.ts";
import { registerAskRoutes } from "./routes/ask.ts";
import { registerDebugRoutes } from "./routes/debug.ts";
import { registerIngestRoutes } from "./routes/ingest.ts";
import { registerProvenanceRoutes } from "./routes/provenance.ts";
import { registerRealRoutes } from "./routes/real.ts";
import { registerReplayRoutes } from "./routes/replay.ts";
import { registerScenarioRoutes } from "./routes/scenario.ts";
import { registerSpecialistRoutes } from "./routes/specialists.ts";
import { createLocalStore } from "./stores/local.ts";
import type { OperationalStore } from "./domain/ontology.ts";

export function createApp(store: OperationalStore = createLocalStore()) {
  const app = new Hono();

  registerDebugRoutes(app, store);
  registerRealRoutes(app);
  registerScenarioRoutes(app, store);
  registerReplayRoutes(app, store);
  registerIngestRoutes(app, store);
  registerAnomalyRoutes(app, store);
  registerProvenanceRoutes(app, store);
  registerActionRoutes(app, store);
  registerSpecialistRoutes(app, store);
  registerAskRoutes(app);

  return app;
}

export const app = createApp();

const maybeBun = (globalThis as { Bun?: { serve(options: { port: number; fetch: typeof app.fetch }): void } }).Bun;

if (maybeBun && process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  const port = Number(process.env.PORT ?? 8787);
  maybeBun.serve({
    port,
    fetch: app.fetch
  });
  console.log(`SeaForge Tier B server listening on http://localhost:${port}`);
}
