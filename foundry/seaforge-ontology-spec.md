# SeaForge Foundry Ontology Creation Spec

This is the handoff spec for creating the SeaForge / Liminal Custody ontology in
Palantir Foundry. Use it with `config.example.ini` and `foundry/identifiers.md`.
After creation, report the real API names and RIDs back into the RID report
template at the bottom of this file.

## Creation Rules

- Ontology display name: `SeaForge`
- Preferred ontology API name: `seaforge`
- Use the API names in this document exactly when Foundry accepts them.
- If Foundry normalizes or rejects a name, keep the generated API name and record
  it in `foundry/identifiers.md`.
- Use `id` as the primary key for every object type.
- Use `String` for JSON-bearing fields ending in `Json`.
- Use `Timestamp` for fields ending in `At`, `Start`, or `End` when they are
  event times.
- Use `Double` for scores, confidence, lat/lon, speed, course, dimensions, and
  numeric model outputs.
- Use `Boolean` only for true/false workflow flags.
- Make all relationship link types many-to-many for v1 unless Foundry requires a
  tighter cardinality.

## Source Bundle

Give the browser agent these repo files as context:

- `config.example.ini`
- `foundry/identifiers.md`
- `graph-spine/schema.ts`
- `README.md`
- `docs/v3-positioning-patch.md`
- `fixtures/maritime/observations.json`
- `fixtures/maritime/anomalies.json`
- `fixtures/maritime/hypotheses.json`
- `fixtures/maritime/claims.json`
- `fixtures/maritime/evidence.json`
- `fixtures/maritime/actions.json`
- `fixtures/maritime/review-rules.json`
- `fixtures/maritime/specialist-reads.json`

## Shared Object Properties

Add these properties to every object type unless Foundry cloning/templates make a
shared base impractical. Property API names are preferred names.

| API name | Type | Required | Notes |
|---|---:|---:|---|
| `id` | String | yes | Primary key. Use fixture IDs unchanged. |
| `title` | String | yes | Human-readable label. |
| `createdAt` | Timestamp | yes | Source or system creation time. |
| `updatedAt` | Timestamp | no | Last changed time. |
| `caseId` | String | no | SeaForge case ID, e.g. `case:alara-01:event-1`. |
| `status` | String | no | Workflow state such as `OPEN`, `CONTESTED`, `ACTIVE`. |
| `summary` | String | no | Short operator-facing summary. |
| `sourceHash` | String | no | Hash for idempotent ingestion. |
| `rawJson` | String | no | Original fixture/source payload as JSON. |

## Object Types

### `vessel`

Represents a physical or declared maritime entity.

| API name | Type | Required |
|---|---:|---:|
| `mmsi` | String | no |
| `imo` | String | no |
| `name` | String | no |
| `flag` | String | no |
| `callSign` | String | no |
| `vesselType` | String | no |
| `lengthM` | Double | no |
| `beamM` | Double | no |
| `currentTrackId` | String | no |
| `identityConfidence` | Double | no |

### `track`

Represents a movement segment or tracklet.

| API name | Type | Required |
|---|---:|---:|
| `trackId` | String | yes |
| `vesselId` | String | no |
| `mmsi` | String | no |
| `startTime` | Timestamp | no |
| `endTime` | Timestamp | no |
| `startLat` | Double | no |
| `startLon` | Double | no |
| `endLat` | Double | no |
| `endLon` | Double | no |
| `avgSogKnots` | Double | no |
| `avgCogDeg` | Double | no |
| `geojson` | String | no |

### `observation`

Represents a normalized source observation from AIS, Danti, OSINT, or edge
fixtures.

| API name | Type | Required |
|---|---:|---:|
| `source` | String | yes |
| `sourceRecordId` | String | yes |
| `observedAt` | Timestamp | no |
| `recordType` | String | no |
| `modality` | String | no |
| `lat` | Double | no |
| `lon` | Double | no |
| `mmsi` | String | no |
| `imo` | String | no |
| `name` | String | no |
| `sogKnots` | Double | no |
| `cogDeg` | Double | no |
| `qualityFlagsJson` | String | no |

### `aisMessage`

Represents raw or curated AIS position/static records.

| API name | Type | Required |
|---|---:|---:|
| `source` | String | yes |
| `sourceRecordId` | String | yes |
| `observedAt` | Timestamp | no |
| `messageType` | String | no |
| `mmsi` | String | yes |
| `imo` | String | no |
| `name` | String | no |
| `lat` | Double | no |
| `lon` | Double | no |
| `sogKnots` | Double | no |
| `cogDeg` | Double | no |
| `navStatus` | String | no |
| `rawPayloadSha256` | String | no |

### `case`

Represents a contested custody case opened by an anomaly or replay beat.

| API name | Type | Required |
|---|---:|---:|
| `scenarioId` | String | no |
| `stage` | String | no |
| `priority` | String | no |
| `openedAt` | Timestamp | no |
| `closedAt` | Timestamp | no |
| `featuresJson` | String | no |

### `anomaly`

Represents a detected dark gap, identity churn, or corroborated gap.

| API name | Type | Required |
|---|---:|---:|
| `anomalyType` | String | yes |
| `windowStart` | Timestamp | no |
| `windowEnd` | Timestamp | no |
| `gapMinutes` | Double | no |
| `score` | Double | no |
| `candidateOldTrackId` | String | no |
| `candidateNewTrackId` | String | no |
| `candidateTrackId` | String | no |
| `aoiId` | String | no |
| `featuresJson` | String | no |

### `hypothesis`

Represents a competing custody explanation.

| API name | Type | Required |
|---|---:|---:|
| `hypothesisKind` | String | yes |
| `posterior` | Double | no |
| `confidence` | Double | no |
| `rationale` | String | no |

### `claim`

Represents an evidence-backed assertion under review.

| API name | Type | Required |
|---|---:|---:|
| `claimKind` | String | yes |
| `prior` | Double | no |
| `delta` | Double | no |
| `posterior` | Double | no |
| `confidence` | Double | no |
| `verdict` | String | no |

### `evidenceItem`

Represents a cited evidence item used by claims and specialist reads.

| API name | Type | Required |
|---|---:|---:|
| `evidenceType` | String | yes |
| `llrNats` | Double | no |
| `modality` | String | no |
| `observedAt` | Timestamp | no |
| `source` | String | no |
| `citationText` | String | no |
| `linkedObservationIdsJson` | String | no |

### `sourceIntegrityCheck`

Represents the v3 Signal Integrity object. Internal API name stays
`sourceIntegrityCheck`; UI label should be `Signal Integrity`.

| API name | Type | Required |
|---|---:|---:|
| `sourceId` | String | yes |
| `integrityStatus` | String | yes |
| `indicatorsJson` | String | yes |
| `confidence` | Double | no |
| `rationale` | String | yes |
| `linkedEvidenceIdsJson` | String | no |
| `detectedAt` | Timestamp | no |

Allowed `integrityStatus` values: `clean`, `degraded`, `contested`, `unknown`.

### `areaOfInterest`

Represents a monitored zone, corridor, or protected operating area.

| API name | Type | Required |
|---|---:|---:|
| `aoiId` | String | yes |
| `name` | String | yes |
| `aoiType` | String | no |
| `geometryGeoJson` | String | yes |

### `collectionAction`

Represents bounded next actions such as monitoring, requesting SAR/RF, or
escalating after confirmation.

| API name | Type | Required |
|---|---:|---:|
| `actionType` | String | yes |
| `baseScore` | Double | no |
| `rank` | Integer | no |
| `trigger` | String | no |
| `requiresOperator` | Boolean | no |

### `reviewRule`

Represents durable operator review memory.

| API name | Type | Required |
|---|---:|---:|
| `displayId` | String | yes |
| `active` | Boolean | yes |
| `sourceCaseId` | String | no |
| `ruleText` | String | yes |
| `conditionsJson` | String | no |
| `effectsJson` | String | no |

### `operatorDecision`

Represents a human approval, rejection, override, or note.

| API name | Type | Required |
|---|---:|---:|
| `decisionType` | String | yes |
| `operatorId` | String | no |
| `reason` | String | no |
| `idempotencyKey` | String | yes |

### `sourceDocument`

Represents an OSINT/report/source artifact.

| API name | Type | Required |
|---|---:|---:|
| `source` | String | yes |
| `url` | String | no |
| `retrievedAt` | Timestamp | no |
| `publishedAt` | Timestamp | no |
| `licenseOrTerms` | String | no |
| `contentSha256` | String | no |
| `documentText` | String | no |

## Link Types

Add these provenance properties to every link type when Foundry allows link
properties:

| API name | Type | Required |
|---|---:|---:|
| `createdAt` | Timestamp | no |
| `createdBy` | String | no |
| `confidence` | Double | no |
| `rationale` | String | no |
| `sourceNodeIdsJson` | String | no |
| `rawJson` | String | no |

Create these outgoing link types:

| API name | From | To | Purpose |
|---|---|---|---|
| `vesselHasTrack` | `vessel` | `track` | Declared/physical vessel has movement segment. |
| `trackHasObservation` | `track` | `observation` | Track is composed from observations. |
| `observationDerivedFromAis` | `observation` | `aisMessage` | Normalized observation came from AIS. |
| `observationDerivedFromEvidence` | `observation` | `evidenceItem` | Observation derived from non-AIS evidence. |
| `anomalyInvolvesTrack` | `anomaly` | `track` | Anomaly references a candidate track. |
| `anomalyInvolvesVessel` | `anomaly` | `vessel` | Anomaly references a vessel identity. |
| `anomalyInAoi` | `anomaly` | `areaOfInterest` | Anomaly happened in a monitored zone. |
| `claimExplainsAnomaly` | `claim` | `anomaly` | Claim explains or frames an anomaly. |
| `supports` | `evidenceItem` | `claim` | Evidence supports a claim. |
| `weakens` | `evidenceItem` | `claim` | Evidence weakens a claim. |
| `contradicts` | `evidenceItem` | `claim` | Evidence contradicts a claim. |
| `sourceDocumentContainsEvidence` | `sourceDocument` | `evidenceItem` | Document contains extracted evidence. |
| `collectionActionAddressesAnomaly` | `collectionAction` | `anomaly` | Action addresses anomaly uncertainty. |
| `collectionActionTestsClaim` | `collectionAction` | `claim` | Action can confirm or reject a claim. |
| `decisionOnClaim` | `operatorDecision` | `claim` | Human decision targets a claim. |
| `decisionOnCollectionAction` | `operatorDecision` | `collectionAction` | Human decision targets an action. |
| `reviewRuleScopedToAoi` | `reviewRule` | `areaOfInterest` | Rule applies inside a zone. |
| `reviewRuleAppliedToAnomaly` | `reviewRule` | `anomaly` | Rule matched an anomaly. |
| `appliesTo` | `reviewRule` | `case` | Rule applied to a case. |
| `reviewedBy` | `case` | `reviewRule` | Case created or used a rule. |
| `derivedFrom` | see below | see below | Generic graph-spine provenance. |

For `sourceIntegrityCheck` in v1, do not create separate direct
`supports`/`weakens` links from Signal Integrity to claims. Route claim impact
through `evidenceItem` -> `claim` links, and connect `sourceIntegrityCheck` to
that evidence with `derivedFrom`. The `integrityStatus` property carries the
operator-facing contested/degraded state.

Create `derivedFrom` on each source object type if Foundry allows the same
outgoing API name for multiple concrete source/target pairs:

| API name | From | To |
|---|---|---|
| `derivedFrom` | `anomaly` | `observation` |
| `derivedFrom` | `hypothesis` | `anomaly` |
| `derivedFrom` | `claim` | `hypothesis` |
| `derivedFrom` | `sourceIntegrityCheck` | `evidenceItem` |
| `derivedFrom` | `collectionAction` | `claim` |

If Foundry requires ontology-wide unique link API names, create these concrete
fallback names and record them in the RID report:

| Fallback API name | From | To |
|---|---|---|
| `anomalyDerivedFromObservation` | `anomaly` | `observation` |
| `hypothesisDerivedFromAnomaly` | `hypothesis` | `anomaly` |
| `claimDerivedFromHypothesis` | `claim` | `hypothesis` |
| `sourceIntegrityCheckDerivedFromEvidence` | `sourceIntegrityCheck` | `evidenceItem` |
| `collectionActionDerivedFromClaim` | `collectionAction` | `claim` |

## Action Types

Create these action types. The payload names are the public API contract that the
local server will target after Foundry wiring.

### `saveOperatorDecision`

Creates an `operatorDecision` and links it to a claim or collection action.

| Input API name | Type | Required |
|---|---:|---:|
| `id` | String | yes |
| `decisionType` | String | yes |
| `operatorId` | String | no |
| `reason` | String | no |
| `targetClaimId` | String | no |
| `targetCollectionActionId` | String | no |
| `idempotencyKey` | String | yes |
| `createdAt` | Timestamp | yes |

### `saveReviewRule`

Creates or updates a `reviewRule`; links the source case with `reviewedBy`.

| Input API name | Type | Required |
|---|---:|---:|
| `id` | String | yes |
| `displayId` | String | yes |
| `sourceCaseId` | String | yes |
| `ruleText` | String | yes |
| `conditionsJson` | String | no |
| `effectsJson` | String | no |
| `active` | Boolean | yes |
| `createdAt` | Timestamp | yes |

### `requestCollection`

Creates or updates a `collectionAction` request.

| Input API name | Type | Required |
|---|---:|---:|
| `id` | String | yes |
| `caseId` | String | yes |
| `anomalyId` | String | no |
| `claimId` | String | no |
| `actionType` | String | yes |
| `trigger` | String | no |
| `operatorId` | String | no |
| `requestedAt` | Timestamp | yes |

### `updateClaimStatus`

Updates a `claim` after review or action feedback.

| Input API name | Type | Required |
|---|---:|---:|
| `claimId` | String | yes |
| `status` | String | yes |
| `verdict` | String | no |
| `operatorId` | String | no |
| `reason` | String | no |
| `updatedAt` | Timestamp | yes |

### `mergeVesselIdentity`

Records an operator-approved identity merge between two vessel records.

| Input API name | Type | Required |
|---|---:|---:|
| `survivorVesselId` | String | yes |
| `mergedVesselId` | String | yes |
| `operatorId` | String | no |
| `reason` | String | no |
| `idempotencyKey` | String | yes |
| `createdAt` | Timestamp | yes |

## AIP Logic Query Placeholders

Create or record these query/function API names. If AIP Logic is not available
during creation, create placeholder query/function inventory entries and record
that they are not executable yet.

Each specialist query should accept:

| Input API name | Type | Required |
|---|---:|---:|
| `caseId` | String | yes |
| `anomalyId` | String | no |
| `claimId` | String | no |
| `evidenceJson` | String | yes |
| `question` | String | no |

Each specialist query should return JSON-compatible output with:

| Output field | Type |
|---|---:|
| `verdict` | String |
| `summary` | String |
| `citedObservationIdsJson` | String |
| `confidence` | Double |
| `unsupportedAssertionsJson` | String |
| `generatedAt` | Timestamp |

Required query API names:

- `seaforgeKinematicsSpecialist`
- `seaforgeIdentitySpecialist`
- `seaforgeIntentSpecialist`
- `seaforgeCollectionSpecialist`
- `seaforgeVisualSpecialist`
- `seaforgeProvenanceSummary`
- `seaforgeReviewMemoryDraftRule`

## Dataset And Stream Inventory

Create these datasets/streams if the Foundry workspace allows it. Otherwise,
record the existing dataset/stream RID that should be used.

| API/name | Kind | Purpose |
|---|---|---|
| `raw_ais_marinecadastre_daily` | dataset | Raw AIS batch import. |
| `raw_ais_aishub_poll_batches` | dataset | AISHub polling snapshots. |
| `stream_ais_live` | stream | Optional live AIS event stream. |
| `raw_danti_results` | dataset | Danti result payloads. |
| `raw_exa_results` | dataset | Exa OSINT result payloads. |
| `stream_edge_observation` | stream | Edge observation event stream. |
| `curated_ais_message` | dataset | Curated AIS records. |
| `curated_observation` | dataset | Normalized observations. |
| `curated_vessel_identity` | dataset | Vessel identity rows. |
| `curated_tracklet` | dataset | Tracklet rows. |
| `curated_track_association_candidate` | dataset | Track association candidates. |
| `curated_anomaly` | dataset | Anomaly rows. |
| `curated_hypothesis_feature` | dataset | Features used by hypotheses. |
| `curated_evidence_item` | dataset | Evidence rows. |
| `aip_specialist_outputs` | dataset | AIP/specialist outputs after guard checks. |
| `action_operator_decision_edits` | dataset | Operator decision audit log. |
| `action_review_rule_edits` | dataset | Review rule audit log. |

## Smoke Seed

After object/link/action creation, create a minimal smoke chain from fixtures:

1. `observation`: `obs:aishub:366700111:20260418T101504Z`
2. `observation`: `obs:barentswatch:538009771:20260418T110422Z`
3. `case`: `case:alara-01:event-1`
4. `anomaly`: `anom:identity-churn:trk-caldera:20260418T1015:1f44`
5. `hypothesis`: `hyp:alara-01:event-1:h1`
6. `claim`: `claim:alara-01:event-1:custody:h1`
7. `evidenceItem`: `ev:alara-01:event-1:kinematic-fit`
8. `collectionAction`: `act:alara-01:event-1:request-sar-rf`
9. `reviewRule`: `rr:watchfloor:dark-gap-sar-first:v1`

Verify this chain can be traversed:

```text
observation -> anomaly -> hypothesis -> claim -> collectionAction -> reviewRule
```

Expected demo interpretation:

```text
Signal Integrity contested -> Intent refused -> Collection redirects to SAR/RF.
```

## RID Report Template

Paste the real values here after browser creation.

### Ontology

| Field | Value |
|---|---|
| Foundry base URL | |
| Ontology API name | |
| Ontology RID | |
| SDK package RID | |
| SDK version | |

### Object Types

| Preferred API name | Actual API name | RID |
|---|---|---|
| `vessel` | | |
| `track` | | |
| `observation` | | |
| `aisMessage` | | |
| `case` | | |
| `anomaly` | | |
| `hypothesis` | | |
| `claim` | | |
| `evidenceItem` | | |
| `sourceIntegrityCheck` | | |
| `areaOfInterest` | | |
| `collectionAction` | | |
| `reviewRule` | | |
| `operatorDecision` | | |
| `sourceDocument` | | |

### Link Types

| Preferred API name | Actual API name | RID |
|---|---|---|
| `vesselHasTrack` | | |
| `trackHasObservation` | | |
| `observationDerivedFromAis` | | |
| `observationDerivedFromEvidence` | | |
| `anomalyInvolvesTrack` | | |
| `anomalyInvolvesVessel` | | |
| `anomalyInAoi` | | |
| `claimExplainsAnomaly` | | |
| `supports` | | |
| `weakens` | | |
| `contradicts` | | |
| `sourceDocumentContainsEvidence` | | |
| `collectionActionAddressesAnomaly` | | |
| `collectionActionTestsClaim` | | |
| `decisionOnClaim` | | |
| `decisionOnCollectionAction` | | |
| `reviewRuleScopedToAoi` | | |
| `reviewRuleAppliedToAnomaly` | | |
| `appliesTo` | | |
| `reviewedBy` | | |
| `derivedFrom` | | |
| `anomalyDerivedFromObservation` | | |
| `hypothesisDerivedFromAnomaly` | | |
| `claimDerivedFromHypothesis` | | |
| `sourceIntegrityCheckDerivedFromEvidence` | | |
| `collectionActionDerivedFromClaim` | | |

### Actions

| Preferred API name | Actual API name | RID |
|---|---|---|
| `saveOperatorDecision` | | |
| `saveReviewRule` | | |
| `requestCollection` | | |
| `updateClaimStatus` | | |
| `mergeVesselIdentity` | | |

### AIP Queries

| Preferred API name | Actual API name | RID | Version |
|---|---|---|---|
| `seaforgeKinematicsSpecialist` | | | |
| `seaforgeIdentitySpecialist` | | | |
| `seaforgeIntentSpecialist` | | | |
| `seaforgeCollectionSpecialist` | | | |
| `seaforgeVisualSpecialist` | | | |
| `seaforgeProvenanceSummary` | | | |
| `seaforgeReviewMemoryDraftRule` | | | |

### Datasets And Streams

| Name | RID |
|---|---|
| `raw_ais_marinecadastre_daily` | |
| `raw_ais_aishub_poll_batches` | |
| `stream_ais_live` | |
| `raw_danti_results` | |
| `raw_exa_results` | |
| `stream_edge_observation` | |
| `curated_ais_message` | |
| `curated_observation` | |
| `curated_vessel_identity` | |
| `curated_tracklet` | |
| `curated_track_association_candidate` | |
| `curated_anomaly` | |
| `curated_hypothesis_feature` | |
| `curated_evidence_item` | |
| `aip_specialist_outputs` | |
| `action_operator_decision_edits` | |
| `action_review_rule_edits` | |
