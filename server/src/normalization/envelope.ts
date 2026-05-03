import { sha256Json, stableId } from "../domain/ids.ts";
import type {
  NormalizedEnvelope,
  RecordType,
  SourceName,
  SourceRecord
} from "../domain/ontology.ts";

export interface EnvelopeInput<T> {
  source: SourceName;
  sourceRecordId: string;
  sourceObservedAt?: string;
  ingestedAt: string;
  recordType: RecordType;
  aoiIds: string[];
  geo?: NormalizedEnvelope<T>["geo"];
  normalized: T;
  raw: unknown;
  adapterVersion: string;
  sourceConfidence: number;
  qualityFlags?: string[];
  positionValid?: boolean;
  identityValid?: boolean;
  sourceUrlOrDataset?: string;
  licenseOrTerms?: string;
}

export function buildNormalizedEnvelope<T>(input: EnvelopeInput<T>): NormalizedEnvelope<T> {
  return {
    envelopeId: stableId(
      "env",
      input.source,
      input.sourceRecordId,
      input.sourceObservedAt ?? input.ingestedAt
    ),
    source: input.source,
    sourceRecordId: input.sourceRecordId,
    sourceObservedAt: input.sourceObservedAt,
    ingestedAt: input.ingestedAt,
    recordType: input.recordType,
    schemaVersion: "seaforge.normalized.v1",
    aoiIds: [...input.aoiIds],
    ...(input.geo ? { geo: input.geo } : {}),
    normalized: input.normalized,
    quality: {
      sourceConfidence: input.sourceConfidence,
      qualityFlags: input.qualityFlags ?? [],
      ...(typeof input.positionValid === "boolean" ? { positionValid: input.positionValid } : {}),
      ...(typeof input.identityValid === "boolean" ? { identityValid: input.identityValid } : {})
    },
    provenance: {
      rawPayloadSha256: sha256Json(input.raw),
      adapterVersion: input.adapterVersion,
      ...(input.sourceUrlOrDataset ? { sourceUrlOrDataset: input.sourceUrlOrDataset } : {}),
      ...(input.licenseOrTerms ? { licenseOrTerms: input.licenseOrTerms } : {})
    },
    raw: input.raw
  };
}

export function sourceRecord<Raw>(
  source: SourceName,
  sourceRecordId: string,
  retrievedAt: string,
  raw: Raw,
  observedAt?: string
): SourceRecord<Raw> {
  return {
    source,
    sourceRecordId,
    retrievedAt,
    raw,
    ...(observedAt ? { observedAt } : {})
  };
}
