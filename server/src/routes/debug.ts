import { existsSync, readdirSync } from "node:fs";

import type { LocalOperationalStore, OperationalStore } from "../domain/ontology.ts";
import { aipStatus, foundryStatus, palantirConfigFromEnv } from "../stores/palantir.ts";
import type { RouteApp } from "./common.ts";
import { routeError } from "./common.ts";

export interface HealthSnapshot {
  status: "ok";
  checkedAt: string;
  capabilities: { poll: boolean; stream: boolean; replay: boolean };
  fixtureAvailability: {
    embedded: boolean;
    filesPresent: boolean;
    fixtureDir: string;
  };
  localStore: {
    status: "ok";
    diagnostics?: ReturnType<LocalOperationalStore["diagnostics"]>;
  };
  foundry: ReturnType<typeof foundryStatus>;
  aip: ReturnType<typeof aipStatus>;
}

export async function buildHealthSnapshot(store: OperationalStore): Promise<HealthSnapshot> {
  const fixtureDir = new URL("../../../fixtures/maritime/", import.meta.url);
  const diagnostics =
    typeof (store as LocalOperationalStore).diagnostics === "function"
      ? (store as LocalOperationalStore).diagnostics()
      : undefined;

  return {
    status: "ok",
    checkedAt: new Date().toISOString(),
    capabilities: { poll: true, stream: false, replay: true },
    fixtureAvailability: {
      embedded: true,
      filesPresent: directoryHasFiles(fixtureDir),
      fixtureDir: fixtureDir.pathname
    },
    localStore: {
      status: "ok",
      ...(diagnostics ? { diagnostics } : {})
    },
    foundry: foundryStatus(),
    aip: aipStatus()
  };
}

export function registerDebugRoutes(app: RouteApp, store: OperationalStore): void {
  app.get("/health", async (context) => {
    try {
      return context.json(await buildHealthSnapshot(store));
    } catch (error) {
      return routeError(context, error);
    }
  });

  app.get("/debug/palantir-smoke", (context) => {
    try {
      const config = palantirConfigFromEnv();
      return context.json({
        status: foundryStatus(config).status === "ok" ? "ready" : "NOT_CONFIGURED",
        foundry: foundryStatus(config),
        aip: aipStatus(config),
        checks: {
          token: Boolean(config.foundryToken),
          baseUrl: Boolean(config.foundryBaseUrl),
          ontologyRid: Boolean(config.ontologyRid),
          aipLogicBaseUrl: Boolean(config.aipLogicBaseUrl ?? config.foundryBaseUrl),
          aipLogicToken: Boolean(config.aipLogicToken ?? config.foundryToken),
          aipLogicFunctionRid: Boolean(config.aipLogicFunctionRid)
        }
      });
    } catch (error) {
      return routeError(context, error);
    }
  });
}

function directoryHasFiles(url: URL): boolean {
  return existsSync(url) && readdirSync(url).some((name) => !name.startsWith("."));
}
