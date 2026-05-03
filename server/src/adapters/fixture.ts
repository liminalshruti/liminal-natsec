import type {
  IngestScope,
  NormalizedEnvelope,
  SourceAdapter,
  SourceRecord
} from "../domain/ontology.ts";
import { buildNormalizedEnvelope, sourceRecord } from "../normalization/envelope.ts";
import { FIXTURE_INGESTED_AT, fixtureRecords, type FixtureSourceRaw } from "../replay/fixtures.ts";

export type FixtureNormalized = {
  sourceRecordId: string;
  observedAt: string;
  aoiIds: string[];
  lat?: number;
  lon?: number;
  mmsi?: string;
  name?: string;
  sog?: number;
  cog?: number;
  summary?: string;
};

export interface FixtureAdapter extends SourceAdapter<FixtureSourceRaw, FixtureNormalized> {
  collectEnvelopes(scope: IngestScope): Promise<Array<NormalizedEnvelope<FixtureNormalized>>>;
}

export function createFixtureAdapter(records = fixtureRecords): FixtureAdapter {
  return new EmbeddedFixtureAdapter(records);
}

class EmbeddedFixtureAdapter implements FixtureAdapter {
  readonly source = "EDGE_FIXTURE" as const;
  readonly capabilities = { poll: true, stream: false, replay: true };
  readonly mode = "fixture" as const;
  private readonly records: FixtureSourceRaw[];

  constructor(records: FixtureSourceRaw[]) {
    this.records = [...records].sort((left, right) =>
      `${left.observedAt}:${left.id}`.localeCompare(`${right.observedAt}:${right.id}`)
    );
  }

  async *pull(scope: IngestScope): AsyncIterable<SourceRecord<FixtureSourceRaw>> {
    for (const record of this.records) {
      if (scope.aoiId && !record.aoiIds.includes(scope.aoiId)) continue;
      yield sourceRecord(record.source, record.id, FIXTURE_INGESTED_AT, record, record.observedAt);
    }
  }

  normalize(record: SourceRecord<FixtureSourceRaw>): NormalizedEnvelope<FixtureNormalized> {
    const raw = record.raw;
    const geo =
      typeof raw.lon === "number" && typeof raw.lat === "number"
        ? ({ type: "Point", coordinates: [raw.lon, raw.lat] as [number, number] } as const)
        : undefined;

    return buildNormalizedEnvelope({
      source: record.source,
      sourceRecordId: record.sourceRecordId,
      sourceObservedAt: record.observedAt,
      ingestedAt: record.retrievedAt,
      recordType: raw.recordType,
      aoiIds: raw.aoiIds,
      geo,
      normalized: {
        sourceRecordId: raw.id,
        observedAt: raw.observedAt,
        aoiIds: raw.aoiIds,
        ...(typeof raw.lat === "number" ? { lat: raw.lat } : {}),
        ...(typeof raw.lon === "number" ? { lon: raw.lon } : {}),
        ...(raw.mmsi ? { mmsi: raw.mmsi } : {}),
        ...(raw.name ? { name: raw.name } : {}),
        ...(typeof raw.sog === "number" ? { sog: raw.sog } : {}),
        ...(typeof raw.cog === "number" ? { cog: raw.cog } : {}),
        ...(raw.summary ? { summary: raw.summary } : {})
      },
      raw,
      adapterVersion: "fixture-maritime@0.1.0",
      sourceConfidence: raw.source === "DANTI" ? 0.62 : 0.85,
      qualityFlags: [],
      positionValid: typeof raw.lat === "number" && typeof raw.lon === "number",
      identityValid: raw.recordType !== "AIS_POSITION" || Boolean(raw.mmsi)
    });
  }

  async collectEnvelopes(scope: IngestScope): Promise<Array<NormalizedEnvelope<FixtureNormalized>>> {
    const envelopes: Array<NormalizedEnvelope<FixtureNormalized>> = [];
    for await (const record of this.pull(scope)) {
      envelopes.push(this.normalize(record));
    }
    return envelopes;
  }
}
