import { ApiError } from "../domain/ontology.ts";
import type {
  ActionEnvelope,
  LinkWrite,
  NormalizedEnvelope,
  ObjectRef,
  ObjectType,
  OntologyObject,
  OperationalStore,
  QuerySpec,
  StoreStatus
} from "../domain/ontology.ts";

export interface PalantirConfig {
  foundryBaseUrl?: string;
  foundryToken?: string;
  ontologyRid?: string;
  aipLogicBaseUrl?: string;
  aipLogicToken?: string;
  aipLogicFunctionRid?: string;
}

export function palantirConfigFromEnv(env: Record<string, string | undefined> = process.env): PalantirConfig {
  return {
    foundryBaseUrl: env.FOUNDRY_BASE_URL,
    foundryToken: env.FOUNDRY_TOKEN,
    ontologyRid: env.FOUNDRY_ONTOLOGY_RID,
    aipLogicBaseUrl: env.AIP_LOGIC_BASE_URL,
    aipLogicToken: env.AIP_LOGIC_TOKEN,
    aipLogicFunctionRid: env.AIP_LOGIC_FUNCTION_RID
  };
}

export function foundryStatus(config: PalantirConfig = palantirConfigFromEnv()): StoreStatus {
  if (config.foundryBaseUrl && config.foundryToken && config.ontologyRid) {
    return { status: "ok", detail: "Foundry credentials are present." };
  }

  return {
    status: "NOT_CONFIGURED",
    code: "NOT_CONFIGURED",
    detail: "Set FOUNDRY_BASE_URL, FOUNDRY_TOKEN, and FOUNDRY_ONTOLOGY_RID to enable Foundry writes."
  };
}

export function aipStatus(config: PalantirConfig = palantirConfigFromEnv()): StoreStatus {
  const baseUrl = config.aipLogicBaseUrl ?? config.foundryBaseUrl;
  const token = config.aipLogicToken ?? config.foundryToken;

  if (baseUrl && token) {
    return { status: "ok", detail: "AIP Logic configuration is present." };
  }

  return {
    status: "NOT_CONFIGURED",
    code: "NOT_CONFIGURED",
    detail: "Set AIP_LOGIC_BASE_URL and AIP_LOGIC_TOKEN, or reuse FOUNDRY_BASE_URL and FOUNDRY_TOKEN, to enable AIP Logic calls."
  };
}

export function createPalantirStore(config: PalantirConfig = palantirConfigFromEnv()): OperationalStore {
  return new PalantirOperationalStore(config);
}

export class PalantirNotConfiguredError extends ApiError {
  constructor(operation: string) {
    super(
      503,
      "NOT_CONFIGURED",
      `Palantir store is not configured for ${operation}.`,
      "Set FOUNDRY_BASE_URL, FOUNDRY_TOKEN, and FOUNDRY_ONTOLOGY_RID before using the primary store."
    );
    this.name = "PalantirNotConfiguredError";
  }
}

class PalantirOperationalStore implements OperationalStore {
  private readonly config: PalantirConfig;

  constructor(config: PalantirConfig) {
    this.config = config;
  }

  async upsertObject(type: ObjectType, id: string, props: Record<string, unknown>): Promise<void> {
    void type;
    void id;
    void props;
    this.notConfigured("upsertObject");
  }

  async upsertObjects(type: ObjectType, objects: Array<Record<string, unknown>>): Promise<void> {
    void type;
    void objects;
    this.notConfigured("upsertObjects");
  }

  async link(write: LinkWrite): Promise<void> {
    void write;
    this.notConfigured("link");
  }

  async upsertLinks(links: LinkWrite[]): Promise<void> {
    void links;
    this.notConfigured("upsertLinks");
  }

  async getObject<T = OntologyObject>(ref: ObjectRef): Promise<T | null> {
    void ref;
    this.notConfigured("getObject");
  }

  async linked(
    id: string,
    linkType: string,
    direction: "in" | "out" | "both" = "both"
  ): Promise<OntologyObject[]> {
    void id;
    void linkType;
    void direction;
    this.notConfigured("linked");
  }

  async applyAction(action: ActionEnvelope): Promise<{
    id: string;
    status: "APPLIED" | "QUEUED" | "FAILED";
    error?: string;
  }> {
    void action;
    this.notConfigured("applyAction");
  }

  async query(spec: QuerySpec): Promise<OntologyObject[]> {
    void spec;
    this.notConfigured("query");
  }

  async writeRawEnvelope(envelope: NormalizedEnvelope<unknown>): Promise<void> {
    void envelope;
    this.notConfigured("writeRawEnvelope");
  }

  async writeCuratedRows(datasetApiName: string, rows: unknown[]): Promise<void> {
    void datasetApiName;
    void rows;
    this.notConfigured("writeCuratedRows");
  }

  private notConfigured(operation: string): never {
    const status = foundryStatus(this.config);
    if (status.status !== "ok") {
      throw new PalantirNotConfiguredError(operation);
    }

    throw new ApiError(
      501,
      "PALANTIR_STUB",
      `Palantir operation ${operation} is not implemented in the local runtime stub.`,
      "Wire OSDK calls here once Foundry object, link, dataset, and Action API names are finalized."
    );
  }
}
