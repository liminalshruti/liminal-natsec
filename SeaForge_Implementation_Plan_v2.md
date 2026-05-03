# SeaForge - Implementation Plan & Sequencing v2

This plan updates the earlier implementation plan after the May 1 whiteboard transcript. The core change: SeaForge is implemented as **one persistent shell with six workflow states**, not separate screens.

---

## 1. Build Thesis

Build a SeaForge workflow inside the future Liminal / Watchstander shell.

```text
Substrate / Signal Sources
-> Stage Viewport
-> Working Panel
-> Command Line Affordance
```

The demo proves one complete Evidence Custody Loop:

```text
raw observation
-> anomaly
-> custody hypothesis
-> contested claim
-> commander action option
-> review memory
-> next case changed
```

---

## 2. Updated File Structure

```text
seaforge/
+-- graph-spine/
|   +-- schema.ts                  # domain-neutral node/edge types
|   +-- graph.ts                   # nanoKG engine
|   +-- provenance.ts              # traceBack traversal
|   +-- review-memory.ts           # applyReviewRules traversal
|   `-- archetypes.ts              # dormant archetype metadata
+-- fixtures/
|   `-- maritime/
|       +-- tracks.geojson         # tracks + monitored zone polygon
|       +-- observations.json      # raw AIS/synthetic observations
|       +-- anomalies.json         # detected anomalies / signal log
|       +-- hypotheses.json        # custody hypotheses
|       +-- claims.json            # contested claims with evidence refs
|       +-- evidence.json          # evidence artifacts
|       +-- specialist-reads.json  # 4 specialist reads, 1 refusal
|       +-- actions.json           # 3 action options with triggers
|       `-- review-rules.json      # empty seed; runtime uses localStorage
+-- app/
|   +-- src/
|   |   +-- components/
|   |   |   +-- AppShell.tsx
|   |   |   +-- SubstratePanel.tsx
|   |   |   +-- StageViewport.tsx
|   |   |   +-- WorkingPanel.tsx
|   |   |   +-- CommandLine.tsx
|   |   |   +-- MapWatchfloor.tsx
|   |   |   +-- CustodyQueue.tsx
|   |   |   +-- CustodyCasePanel.tsx
|   |   |   +-- HypothesisBoard.tsx
|   |   |   +-- EvidenceChain.tsx
|   |   |   +-- SpecialistReads.tsx
|   |   |   +-- ActionOptions.tsx
|   |   |   `-- ReviewMemory.tsx
|   |   +-- App.tsx
|   |   `-- main.tsx
|   +-- index.html
|   +-- package.json
|   `-- vite.config.ts
+-- LIMINAL_EXTRACTION_PLAN.md
`-- README.md
```

---

## 3. Component Model

### Shell Components

| Component | Purpose |
|---|---|
| `AppShell.tsx` | Persistent Liminal/Watchstander shell |
| `SubstratePanel.tsx` | Signal sources, alert log, selected substrate items |
| `StageViewport.tsx` | Primary activity viewport; renders map for hack |
| `WorkingPanel.tsx` | Contextual case inspection and actions |
| `CommandLine.tsx` | Global command affordance; can be static/disabled MVP |

### Workflow Components

| Component | Purpose |
|---|---|
| `MapWatchfloor.tsx` | MapLibre replay, dark gap, second identity, zone polygon |
| `CustodyQueue.tsx` | Alert/custody queue from anomalies |
| `CustodyCasePanel.tsx` | Container for selected case detail |
| `HypothesisBoard.tsx` | Three custody hypotheses |
| `EvidenceChain.tsx` | Evidence drawer and provenance trace |
| `SpecialistReads.tsx` | Bounded reads and refusal moment |
| `ActionOptions.tsx` | Monitor / Request Collection / Escalate options |
| `ReviewMemory.tsx` | Watchfloor Rules and prior-rule-applied beat |

---

## 4. Data Map

| Component | Data Source |
|---|---|
| `MapWatchfloor` | `fixtures/maritime/tracks.geojson` |
| `SubstratePanel` / `CustodyQueue` | `anomalies.json`, source metadata |
| `HypothesisBoard` | `hypotheses.json` |
| `EvidenceChain` | `graph-spine`, `observations.json`, `claims.json`, `evidence.json` |
| `SpecialistReads` | `specialist-reads.json` |
| `ActionOptions` | `actions.json`, review-rule state |
| `ReviewMemory` | localStorage + review rule object |
| `CommandLine` | static MVP; future graph/agent query surface |

---

## 5. Graph Spine Requirements

### Domain-neutral only

No maritime concepts in `graph-spine/`. No `vessel`, `AIS`, `MMSI`, `AOI`, `port`, or `harbor` in the spine. These live only in `fixtures/maritime/`.

### Node Types

```ts
type NodeType =
  | 'observation'
  | 'entity'
  | 'track'
  | 'anomaly'
  | 'hypothesis'
  | 'claim'
  | 'evidence'
  | 'actionOption'
  | 'reviewRule'
  | 'case';
```

### Edge Types

```ts
type EdgeType =
  | 'OBSERVED_AS'
  | 'DERIVED_FROM'
  | 'SUPPORTS'
  | 'WEAKENS'
  | 'CONTRADICTS'
  | 'TRIGGERS'
  | 'RECOMMENDS'
  | 'REVIEWED_BY'
  | 'APPLIES_TO';
```

### Mandatory Edge Metadata

Every edge includes provenance metadata.

```ts
interface EdgeProvenance {
  created_at: string;
  created_by: 'system' | 'operator' | 'fixture' | string;
  source_node_ids: string[];
  confidence?: number;
  rationale?: string;
}
```

### Traversals

```ts
traceBack(nodeId): Node[]
// Action -> Claim -> Hypothesis -> Anomaly -> Observation

findContradictions(claimId): Node[]
// Claim -> CONTRADICTS -> Evidence / Claim

applyReviewRules(caseId): ReviewRuleApplication | null
// New Recommendation -> ReviewRule -> Prior Case -> Human Correction
```

### Archetype Metadata

Supported but invisible in the SeaForge UI.

```ts
interface ArchetypeMetadata {
  archetype_primary?: string;
  archetype_secondary?: string[];
  archetype_role?: 'perception' | 'persistence' | 'epistemic' | 'decision' | 'review_memory';
}
```

Apply to: `anomaly`, `claim`, `actionOption`, `reviewRule`.

---

## 6. Owner Lanes

### Shayaun owns

- `fixtures/maritime/tracks.geojson`
- data generation script / real-source fixture process
- MapLibre replay
- timeline scrubber
- dark gap visual
- two-MMSI visual
- zone polygon
- map fly-to
- background tracks
- screen recording fallback
- optional real-data adapter if effortless and non-blocking

### Shruti owns

- fixtures except `tracks.geojson`
- `graph-spine/` schema, graph, provenance, review-memory traversal
- app shell UX structure
- case panel
- hypothesis board
- evidence chain
- specialist refusal
- action options
- review memory
- language/story polish
- reset handler
- SpeedRun proof clip structure

### Shared / overlap

- contract layer between data and UI
- graph node/edge schema
- fixture-to-graph loading
- final pitch/demo flow
- cut decisions when scope breaks

---

## 7. One Shell, Six States

| State | Build outcome | Primary components |
|---|---|---|
| 1. Normal traffic | baseline map + signal sources | `AppShell`, `SubstratePanel`, `MapWatchfloor` |
| 2. Dark gap | alert appears; track breaks | `MapWatchfloor`, `CustodyQueue` |
| 3. Second identity | MMSI-222 appears; possible continuity visual | `MapWatchfloor`, `StageViewport` |
| 4. Custody case | hypotheses/evidence open | `WorkingPanel`, `CustodyCasePanel`, `HypothesisBoard`, `EvidenceChain` |
| 5. Refusal + action | intent refuses; collection action appears | `SpecialistReads`, `ActionOptions` |
| 6. Review memory | rule saves; second case changes | `ReviewMemory`, `CustodyQueue`, `ActionOptions` |

---

## 8. Hour-by-Hour Sequencing

### Phase 0 - Shell, fixtures, graph spine (Hours 0-3)

| Hour | Shayaun | Shruti | Milestone |
|---|---|---|---|
| 0-1 | Generate `tracks.geojson`: NORMAL, GHOST/MMSI-111 -> MMSI-222, AMBIGUOUS, zone polygon, background tracks. | Create Vite React TS app in `app/`; scaffold `AppShell`, `SubstratePanel`, `StageViewport`, `WorkingPanel`, `CommandLine`. | Repo shape exists. Shell loads. |
| 1-2 | Validate track coordinates and event timing. | Write maritime fixtures except tracks: observations, anomalies, hypotheses, claims, evidence, specialist reads, actions. | Fixture pack complete. |
| 2-3 | Wire MapLibre to static tracks. | Build `graph-spine/schema.ts`, `graph.ts`, `provenance.ts`, `review-memory.ts`; load fixtures into graph. | Map renders static tracks; graph initializes. |

**Checkpoint H3:** shell loads, map shows tracks, graph traversal returns a chain.

---

### Phase 1 - Stage + alert flow (Hours 3-8)

| Hour | Shayaun | Shruti | Milestone |
|---|---|---|---|
| 3-5 | Map replay, timeline scrubber, track tails. | `SubstratePanel` + `CustodyQueue` from anomalies; case selection state. | Replay and alert log work. |
| 5-7 | Dark gap rendering; Track B appears; dashed/ghost connector. | `CustodyCasePanel` shell opens in `WorkingPanel`; basic custody info. | Click alert opens case. |
| 7-8 | Zone overlay, hero vessel styling, map fly-to. | Wire selected case to graph node lookup. | Full Stage -> Working Panel handoff works. |

**Checkpoint H8:** judge can watch vessel go dark, see alert, click into case.

---

### Phase 2 - Evidence custody layer (Hours 8-13)

| Hour | Shayaun | Shruti | Milestone |
|---|---|---|---|
| 8-10 | Map interaction polish, smooth fly-to, track highlighting. | `HypothesisBoard` with three cards and badges. | Hypotheses visible. |
| 10-12 | Background tracks and map style pass. | `EvidenceChain`; `traceBack(action_id)` renders 5-line chain; evidence drawer. | Provenance visible. |
| 12-13 | Integration polish in shell. | Wire hypotheses/evidence into `CustodyCasePanel`. | Product stops being a map demo. |

**Checkpoint H13:** hypotheses, evidence, and provenance render from graph.

---

### Phase 3 - Refusal + Review Memory (Hours 13-20)

| Hour | Shayaun | Shruti | Milestone |
|---|---|---|---|
| 13-15 | Empty states and edge cases for non-hero tracks. | `SpecialistReads`; refusal line as hero visual. | Refusal moment works. |
| 15-17 | Make dark gap / Track B reappearance visually dramatic. | `ActionOptions`; review-rule state blocks/downgrades escalation. | Actions respond to rule state. |
| 17-19 | Test demo stability; begin fallback recording setup. | `ReviewMemory`; save rule to localStorage; Watchfloor Rules panel. | Rule saves. |
| 19-20 | Full flow integration. | Prior-rule-applied card appears for VESSEL-AMBIGUOUS. | Full Evidence Custody Loop works. |

**Checkpoint H20:** replay -> anomaly -> hypotheses -> evidence -> refusal -> action -> review rule -> second case changed.

---

### Phase 4 - Polish + SpeedRun capture (Hours 20-25)

| Hour | Shayaun | Shruti | Milestone |
|---|---|---|---|
| 20-22 | Map visual polish: dark, layered, Liminal-compatible. | UI polish: typography, cards, badges, language audit. | Serious, coherent interface. |
| 22-24 | Optional ghost/predicted path overlay. | Confidence visuals, Review Memory styling, reset handler. | Reset works. |
| 24-25 | Record hackathon fallback screen capture. | Record SpeedRun proof clip structure / talking sequence. | Fallback and SpeedRun artifacts exist. |

**Checkpoint H25:** demo runs clean, fallback exists, SpeedRun clip outline or capture exists.

---

### Phase 5 - Rehearsal + cut enforcement (Hours 25-31)

| Hour | Both |
|---|---|
| 25-27 | Practice full demo 5+ times; cut to 55 seconds; practice portability, DARPA lineage, and false-association answers. |
| 27-29 | Fix or cut fragile pieces. If broken at hour 27, cut it. |
| 29-31 | Final rehearsal; verify screen recording; verify reset; run demo cleanly 3 times. |

---

## 9. Cut List

### Never cut

- Dark gap + two-MMSI identity churn.
- Hypothesis board.
- Evidence chain / provenance trace.
- Specialist refusal.
- Review rule saved.
- Prior rule applied / second case changed.

### Cut first

- Live LLM calls.
- Commander Brief export.
- Loitering / impossible jump.
- Danti / Shodan / ADS-B.
- Backend.
- Cloud deploy.
- Extra animation polish.
- Tray.
- Full knowledge graph visualization.
- Neo4j / Kumu / semantic ontology tooling.
- Live command-line intelligence.

---

## 10. Design Direction

SeaForge should not look like a generic AIS tracker. It should look like a Liminal-grade signal interface:

- dark/minimal map,
- layered radar/topographic inspiration,
- ghost tracks,
- dashed custody paths,
- evidence chips,
- split hypotheses,
- contested badges,
- refusal states,
- rule overlays,
- command line that blends into the shell.

The interface should feel like it is **holding unresolved state**, not resolving it prematurely.

---

## 11. Make-or-Break Moment

The most important moment is not the map.

It is:

```text
A second event card shows a changed recommendation because of a human review rule.
```

If this works, SeaForge has something no other AIS/map team will have.

If scope breaks, cut around this moment. Do not cut this moment.

