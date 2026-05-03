import { stableId } from "../domain/ids.ts";
import type {
  ActionEnvelope,
  LinkWrite,
  LocalOperationalStore,
  NormalizedEnvelope,
  ObjectRef,
  ObjectType,
  OntologyLink,
  OntologyObject,
  QueuedAction,
  QuerySpec
} from "../domain/ontology.ts";

interface LocalStoreOptions {
  now?: () => string;
}

export function createLocalStore(options: LocalStoreOptions = {}): LocalOperationalStore {
  return new MemoryOperationalStore(options);
}

class MemoryOperationalStore implements LocalOperationalStore {
  private readonly now: () => string;
  private readonly objects = new Map<string, OntologyObject>();
  private readonly links = new Map<string, OntologyLink>();
  private readonly actionQueue = new Map<string, QueuedAction>();
  private readonly rawEnvelopes = new Map<string, NormalizedEnvelope<unknown>>();
  private readonly curatedRows = new Map<string, unknown[]>();

  constructor(options: LocalStoreOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async upsertObject(
    type: ObjectType,
    id: string,
    props: Record<string, unknown>
  ): Promise<void> {
    const key = objectKey(type, id);
    const previous = this.objects.get(key);
    const updatedAt = timestampFrom(props) ?? previous?.updatedAt ?? this.now();
    const sourceHash = stringValue(props.source_hash) ?? stringValue(props.sourceHash) ?? previous?.sourceHash;

    this.objects.set(key, {
      objectType: type,
      objectId: id,
      properties: {
        ...(previous?.properties ?? {}),
        ...clone(props)
      },
      updatedAt,
      ...(sourceHash ? { sourceHash } : {})
    });
  }

  async upsertObjects(type: ObjectType, objects: Array<Record<string, unknown>>): Promise<void> {
    for (const object of objects) {
      const id = objectIdFrom(object);
      await this.upsertObject(type, id, object);
    }
  }

  async link(write: LinkWrite): Promise<void> {
    const key = linkKey(write);
    const previous = this.links.get(key);
    const updatedAt = timestampFrom(write.properties ?? {}) ?? previous?.updatedAt ?? this.now();

    this.links.set(key, {
      linkType: write.linkType,
      from: clone(write.from),
      to: clone(write.to),
      properties: {
        ...(previous?.properties ?? {}),
        ...(write.properties ? clone(write.properties) : {})
      },
      updatedAt
    });
  }

  async upsertLinks(links: LinkWrite[]): Promise<void> {
    for (const link of links) {
      await this.link(link);
    }
  }

  async getObject<T = OntologyObject>(ref: ObjectRef): Promise<T | null> {
    const object = this.objects.get(objectKey(ref.objectType, ref.objectId));
    return object ? (clone(object) as T) : null;
  }

  async linked(
    id: string,
    linkType: string,
    direction: "in" | "out" | "both" = "both"
  ): Promise<OntologyObject[]> {
    const refs: ObjectRef[] = [];

    for (const link of this.links.values()) {
      if (link.linkType !== linkType) continue;
      if ((direction === "out" || direction === "both") && link.from.objectId === id) {
        refs.push(link.to);
      }
      if ((direction === "in" || direction === "both") && link.to.objectId === id) {
        refs.push(link.from);
      }
    }

    const objects = await Promise.all(refs.map((ref) => this.getObject(ref)));
    return objects.filter((object): object is OntologyObject => object !== null);
  }

  async applyAction(action: ActionEnvelope): Promise<{
    id: string;
    status: "APPLIED" | "QUEUED" | "FAILED";
    error?: string;
  }> {
    const id = stableId("actq", action.idempotencyKey);
    const existing = this.actionQueue.get(id);

    if (!existing) {
      this.actionQueue.set(id, {
        actionId: id,
        actionType: action.actionApiName,
        payload: clone(action),
        status: "PENDING",
        createdAt: action.createdAt
      });
    }

    return { id, status: "QUEUED" };
  }

  async query(spec: QuerySpec): Promise<OntologyObject[]> {
    let objects = Array.from(this.objects.values());

    if (spec.objectType) {
      objects = objects.filter((object) => object.objectType === spec.objectType);
    }

    if (spec.ids) {
      const ids = new Set(spec.ids);
      objects = objects.filter((object) => ids.has(object.objectId));
    }

    if (spec.where) {
      objects = objects.filter((object) =>
        Object.entries(spec.where ?? {}).every(
          ([key, expected]) => object.properties[key] === expected
        )
      );
    }

    objects.sort((left, right) => left.objectId.localeCompare(right.objectId));
    const limited = typeof spec.limit === "number" ? objects.slice(0, spec.limit) : objects;
    return clone(limited);
  }

  async writeRawEnvelope(envelope: NormalizedEnvelope<unknown>): Promise<void> {
    this.rawEnvelopes.set(envelope.envelopeId, clone(envelope));
  }

  async writeCuratedRows(datasetApiName: string, rows: unknown[]): Promise<void> {
    const current = this.curatedRows.get(datasetApiName) ?? [];
    this.curatedRows.set(datasetApiName, [...current, ...clone(rows)]);
  }

  async clear(): Promise<void> {
    this.objects.clear();
    this.links.clear();
    this.actionQueue.clear();
    this.rawEnvelopes.clear();
    this.curatedRows.clear();
  }

  diagnostics() {
    return {
      objects: this.objects.size,
      links: this.links.size,
      queuedActions: Array.from(this.actionQueue.values()).filter(
        (action) => action.status === "PENDING"
      ).length,
      rawEnvelopes: this.rawEnvelopes.size,
      curatedDatasets: this.curatedRows.size
    };
  }

  getActionQueue(): QueuedAction[] {
    return clone(Array.from(this.actionQueue.values()));
  }

  getLinks(): OntologyLink[] {
    return clone(Array.from(this.links.values()));
  }

  getObjects(): OntologyObject[] {
    return clone(Array.from(this.objects.values()));
  }
}

function objectKey(type: ObjectType, id: string): string {
  return `${type}\u0000${id}`;
}

function linkKey(write: LinkWrite): string {
  return [
    write.linkType,
    write.from.objectType,
    write.from.objectId,
    write.to.objectType,
    write.to.objectId
  ].join("\u0000");
}

function objectIdFrom(object: Record<string, unknown>): string {
  const id = object.objectId ?? object.object_id ?? object.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Object writes must include objectId, object_id, or id");
  }
  return id;
}

function timestampFrom(props: Record<string, unknown>): string | undefined {
  return stringValue(props.updated_at) ?? stringValue(props.updatedAt);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
