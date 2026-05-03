// Specialist contracts live in shared/domain/types.ts so the frontend can consume
// the same shapes without crossing the server boundary. This module re-exports
// them under their existing import path to keep all server-side imports stable.

export {
  DEFAULT_CONFIDENCE_FLOOR,
  DEFAULT_VISUAL_THRESHOLD,
  SPECIALIST_NAMES
} from "../../../shared/domain/types.ts";

export type {
  ClaimRef,
  EvidenceItemRef,
  EvidenceModality,
  EvidenceSource,
  GuardReport,
  GuardedSpecialistOutput,
  IdentityFeatures,
  Specialist,
  SpecialistCallResult,
  SpecialistInput,
  SpecialistName,
  SpecialistRawOutput,
  SpecialistSource,
  Verdict,
  VisualClass,
  VisualInput
} from "../../../shared/domain/types.ts";
