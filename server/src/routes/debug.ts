import { existsSync, readdirSync } from "node:fs";

import type { LocalOperationalStore, OperationalStore } from "../domain/ontology.ts";
import { validateCacheFile, type CacheValidationReport } from "../specialists/cache.ts";
import { piAiStatus } from "../specialists/pi-ai.ts";
import { aipStatus, foundryStatus, palantirConfigFromEnv } from "../stores/palantir.ts";
import type { RouteApp } from "./common.ts";
import { routeError } from "./common.ts";

export interface HealthSnapshot {
  status: "ok" | "degraded";
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
  specialistCache: CacheValidationReport;
  foundry: ReturnType<typeof foundryStatus>;
  aip: ReturnType<typeof aipStatus>;
  aiFallback: ReturnType<typeof piAiStatus>;
}

export async function buildHealthSnapshot(store: OperationalStore): Promise<HealthSnapshot> {
  const fixtureDir = new URL("../../../fixtures/maritime/", import.meta.url);
  const diagnostics =
    typeof (store as LocalOperationalStore).diagnostics === "function"
      ? (store as LocalOperationalStore).diagnostics()
      : undefined;

  const specialistCache = validateCacheFile();

  return {
    status: specialistCache.status === "ok" ? "ok" : "degraded",
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
    specialistCache,
    foundry: foundryStatus(),
    aip: aipStatus(),
    aiFallback: piAiStatus()
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
      const foundry = foundryStatus(config);
      const local = store as Partial<LocalOperationalStore>;
      const queueDepth =
        typeof local.getActionQueue === "function" ? local.getActionQueue().length : null;
      const queuedActions =
        typeof local.getActionQueue === "function"
          ? local.getActionQueue().slice(0, 3).map((entry) => ({
              actionId: entry.actionId,
              actionType: entry.actionType,
              status: entry.status,
              createdAt: entry.createdAt
            }))
          : null;

      // Per TECHNICAL_PLAN §17, when Foundry is unreachable the same
      // OperationalStore interface runs against the local mirror and Action
      // envelopes queue for replay. Surface that posture explicitly so
      // /debug/palantir-smoke is demo-safe rather than alarming.
      return context.json({
        mode: foundry.status === "ok" ? "foundry-live" : "local-mirror",
        narrative:
          foundry.status === "ok"
            ? "Foundry credentials present; Ontology writes will route via OSDK."
            : "Local mirror behind the same OperationalStore interface. Action envelopes queued; replay on Foundry reach.",
        foundry,
        aip: aipStatus(config),
        checks: {
          token: Boolean(config.foundryToken),
          baseUrl: Boolean(config.foundryBaseUrl),
          ontologyRid: Boolean(config.ontologyRid),
          aipLogicBaseUrl: Boolean(config.aipLogicBaseUrl ?? config.foundryBaseUrl),
          aipLogicToken: Boolean(config.aipLogicToken ?? config.foundryToken),
          aipLogicFunctionRid: Boolean(config.aipLogicFunctionRid)
        },
        aiFallback: piAiStatus(),
        actionEnvelopes: {
          queueDepth,
          sample: queuedActions
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
