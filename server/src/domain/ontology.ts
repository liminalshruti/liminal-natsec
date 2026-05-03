export type ObjectType = string;
export type LinkType = string;
export type Cursor = string | undefined;

export type SourceName =
  | "MARINECADASTRE"
  | "AISHUB"
  | "BARENTSWATCH"
  | "DANTI"
  | "EXA"
  | "SHODAN"
  | "EDGE_FIXTURE";

export type RecordType =
  | "AIS_POSITION"
  | "AIS_STATIC"
  | "OSINT_DOCUMENT"
  | "GEOINT_RESULT"
  | "EDGE_OBSERVATION"
  | "INFRASTRUCTURE_CONTEXT";

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface IngestScope {
  aoiId?: string;
  bbox?: [number, number, number, number];
  mmsi?: string[];
  imo?: string[];
  since?: string;
  until?: string;
  replayScenarioId?: string;
}

export interface SourceRecord<Raw> {
  source: SourceName;
  sourceRecordId: string;
  observedAt?: string;
  retrievedAt: string;
  raw: Raw;
}

export interface NormalizedEnvelope<T> {
  envelopeId: string;
  source: SourceName;
  sourceRecordId: string;
  sourceObservedAt?: string;
  ingestedAt: string;
  recordType: RecordType;
  schemaVersion: "seaforge.normalized.v1";
  aoiIds: string[];
  geo?: GeoPoint | Record<string, unknown>;
  normalized: T;
  quality: {
    sourceConfidence: number;
    qualityFlags: string[];
    positionValid?: boolean;
    identityValid?: boolean;
  };
  provenance: {
    rawPayloadSha256: string;
    adapterVersion: string;
    sourceUrlOrDataset?: string;
    licenseOrTerms?: string;
  };
  raw: unknown;
}

export interface SourceAdapter<Raw, Norm> {
  source: SourceName;
  capabilities: { poll: boolean; stream: boolean; replay: boolean };
  mode: "live" | "fixture";
  pull(scope: IngestScope, cursor?: Cursor): AsyncIterable<SourceRecord<Raw>>;
  normalize(record: SourceRecord<Raw>): NormalizedEnvelope<Norm>;
}

export interface ObjectRef {
  objectType: ObjectType;
  objectId: string;
}

export interface LinkWrite {
  linkType: LinkType;
  from: ObjectRef;
  to: ObjectRef;
  properties?: Record<string, unknown>;
}

export interface ActionEnvelope {
  actionApiName:
    | "saveOperatorDecision"
    | "saveReviewRule"
    | "requestCollection"
    | "updateClaimStatus"
    | "mergeVesselIdentity";
  params: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: string;
}

export interface OntologyObject {
  objectType: ObjectType;
  objectId: string;
  properties: Record<string, unknown>;
  updatedAt: string;
  sourceHash?: string;
}

export interface OntologyLink {
  linkType: LinkType;
  from: ObjectRef;
  to: ObjectRef;
  properties?: Record<string, unknown>;
  updatedAt: string;
}

export interface QueuedAction {
  actionId: string;
  actionType: ActionEnvelope["actionApiName"];
  payload: ActionEnvelope;
  status: "PENDING" | "APPLIED" | "FAILED";
  createdAt: string;
  replayedAt?: string;
  error?: string;
}

export interface QuerySpec {
  objectType?: ObjectType;
  ids?: string[];
  where?: Record<string, unknown>;
  limit?: number;
}

export interface StoreStatus {
  status: "ok" | "NOT_CONFIGURED" | "error";
  detail?: string;
  code?: string;
}

export interface OperationalStore {
  upsertObject(type: ObjectType, id: string, props: Record<string, unknown>): Promise<void>;
  upsertObjects(type: ObjectType, objects: Array<Record<string, unknown>>): Promise<void>;
  link(write: LinkWrite): Promise<void>;
  upsertLinks(links: LinkWrite[]): Promise<void>;
  getObject<T = OntologyObject>(ref: ObjectRef): Promise<T | null>;
  linked(id: string, linkType: LinkType, direction?: "in" | "out" | "both"): Promise<OntologyObject[]>;
  applyAction(action: ActionEnvelope): Promise<{ id: string; status: "APPLIED" | "QUEUED" | "FAILED"; error?: string }>;
  query(spec: QuerySpec): Promise<OntologyObject[]>;
  writeRawEnvelope(envelope: NormalizedEnvelope<unknown>): Promise<void>;
  writeCuratedRows(datasetApiName: string, rows: unknown[]): Promise<void>;
}

export interface StoreDiagnostics {
  objects: number;
  links: number;
  queuedActions: number;
  rawEnvelopes: number;
  curatedDatasets: number;
}

export interface LocalOperationalStore extends OperationalStore {
  clear(): Promise<void>;
  diagnostics(): StoreDiagnostics;
  getActionQueue(): QueuedAction[];
  getLinks(): OntologyLink[];
  getObjects(): OntologyObject[];
}

export interface ApiErrorBody {
  error: string;
  code: string;
  hint?: string;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly hint?: string;

  constructor(status: number, code: string, error: string, hint?: string) {
    super(error);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.hint = hint;
  }

  toBody(): ApiErrorBody {
    return {
      error: this.message,
      code: this.code,
      ...(this.hint ? { hint: this.hint } : {})
    };
  }
}
