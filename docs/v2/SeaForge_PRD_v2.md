# SeaForge - PRD v2

**Evidence-backed maritime custody for contested signals**  
*A SeaForge workflow inside the future Watchstander / SeaSAGE shell*

---

## 1. What Changed in v2

The May 1 whiteboard session sharpened the build shape:

- SeaForge is no longer treated as a sequence of separate screens. It is one persistent app shell with changing workflow states.
- The core interface pattern is: **Substrate / Signal Sources -> Stage Viewport -> Working Panel -> Command Line**.
- The tray remains a Liminal primitive and future/shared component, but it is **not MVP** for the hack.
- The knowledge graph is required as the underlying substrate and provenance engine, but a full visual graph explorer is **bonus**, not MVP.
- The map must feel like it belongs inside Liminal: minimal, layered, signal/radar/topographic, not an off-the-shelf AIS dashboard.
- The build now explicitly tests the future Liminal desktop shell pattern through a maritime workflow.

---

## 2. Product Definition

SeaForge is a human-in-the-loop maritime watchfloor that preserves competing custody hypotheses when identity is contested. It does not detect threats. It does not infer hostile intent. It turns dark gaps and identity churn into evidence-backed custody hypotheses, bounded specialist reads, commander action options, and human review rules that improve the next case.

**Canonical one-liner:**

> SeaForge turns dark gaps and identity churn into evidence-backed custody hypotheses, bounded specialist reads, and human review rules that improve the next case.

**Central demo claim:**

> We preserve competing custody hypotheses when identity is contested.

Not:

- We maintain custody in contested environments.
- We detect hostile vessels.
- We infer intent.
- We built a full command platform.

---

## 3. Product Hierarchy

| Level | Canonical Name | Role |
|---|---|---|
| Demo / artifact | SeaForge | What judges see and use |
| Technical frame | SeaSAGE | SeaGhost + SAGE + Provenance + COA-lite |
| Larger architecture | Watchstander | Full sensor-to-decision system vision |
| Reusable primitive | Evidence Custody Loop | Liminal substrate |
| Layer 5 | Review Memory | Human correction changes future recommendations |
| UI label for Layer 5 | Watchfloor Rules | Operational wording |

**Executive build principle:**

> Build SeaForge. Architect SeaSAGE. Pitch Watchstander. Preserve Evidence Custody Loop for Liminal.

---

## 4. Application Shell

SeaForge should be implemented as one persistent app shell, not separate screens.

```text
+-------------------------------------------------------------+
| Left: Substrate / Signal Sources | Center: Stage Viewport   |
|                                  |                          |
| Incoming observations, alert log,| Maritime map, current    |
| signal source status, cases      | case, selected activity   |
|                                  |                          |
|----------------------------------+--------------------------|
| Bottom: Command Line / Ask the Graph                        |
|-------------------------------------------------------------|
| Right: Working Panel                                        |
| Case inspection, hypotheses, evidence, actions, rules       |
+-------------------------------------------------------------+
```

### Shell Regions

**Substrate / Signal Sources**

The soup of incoming raw material. For SeaForge: AIS, OSINT, synthetic sensor observations, source status, alert log. In Liminal later: notes, transcripts, drafts, calendar, reflections, Git diffs, chats.

**Stage Viewport**

The current activity and primary visual surface. For SeaForge: maritime map with dark gap, second identity, monitored zone, and track replay.

**Working Panel**

The active workflow area attached to the selected stage object. For SeaForge: custody case, hypotheses, evidence chain, specialist refusal, action options, review memory.

**Command Line**

Global interaction surface for asking the graph / agents / system what is happening. MVP can be a visual/static affordance or disabled input. Full command intelligence is not required for the hack.

---

## 5. Core Concept Model

The whiteboard clarified the reusable model:

```text
Substrate = raw incoming soup
Signal = extracted/promoted meaningful item
Stage = current activity/context
Working Panel = where unresolved artifacts are inspected and manipulated
Graph = relationship structure underneath
Rule = human-authored correction that changes downstream behavior
```

### SeaForge Instantiation

| Abstract Primitive | SeaForge Example |
|---|---|
| Substrate | AIS, OSINT, synthetic sensor observations |
| Signal | dark gap, identity churn, contradiction |
| Stage | maritime map case |
| Working Panel | custody/evidence/action/review workflow |
| Graph | observations -> hypotheses -> claims -> actions -> review rules |
| Rule | identity churn alone insufficient without second-source confirmation |

### Liminal Instantiation

| Abstract Primitive | Liminal Example |
|---|---|
| Substrate | notes, transcripts, chats, drafts, calendar, reflections |
| Signal | coherence drift, recurring motif, contradiction, unresolved decision |
| Stage | current founder activity |
| Working Panel | agent deliberation / evidence / recommendation |
| Graph | artifacts -> claims -> patterns -> actions -> corrections |
| Rule | founder-authored operating doctrine |

---

## 6. Five Layers, One Vertical Slice

```text
Layer 5: REVIEW MEMORY          Watchfloor Rules
         Human correction -> saved rule -> applied to next case

Layer 4: ACTION                 Next Collection Actions
         Monitor / Request imagery / Escalate, with trigger conditions

Layer 3: EPISTEMIC              Evidence + Disagreement
         Claims, contradictions, evidence, stale/fresh, specialist reads

Layer 2: PERSISTENCE            Custody Confidence
         SAGE-style continuity hypothesis across identity discontinuity

Layer 1: PERCEPTION             Watchfloor Map
         SeaGhost anomaly detection: dark gaps, identity churn, proximity
```

COA Forge does not appear as a named layer in the UI. It is represented as **Next Collection Actions**.

---

## 7. One Shell, Six States

The product is one shell moving through six demo states:

| State | Judge sees | Shell behavior |
|---|---|---|
| 1. Normal Traffic | Map with normal vessel movement | Stage viewport shows baseline maritime traffic |
| 2. Dark Gap Alert | MMSI-111 disappears near monitored asset | Alert appears in substrate / signal log; map shows break |
| 3. Second Identity | MMSI-222 appears nearby | Map connects Track A and Track B as possible continuity |
| 4. Custody Case | Hypotheses, evidence, confidence | Working panel opens custody case |
| 5. Refusal + Action | Intent refuses; collection action appears | Working panel shows refusal and next collection options |
| 6. Review Memory | Rule saved; second case changed | Watchfloor Rule applies to VESSEL-AMBIGUOUS |

---

## 8. Scenario - Single Polished Story

**Setting:** coastal approach to a strategic harbor/cable zone. Cached deterministic replay.

| Beat | What happens | What the judge sees |
|---|---|---|
| 1 | Three vessels transit normally near a monitored zone. Track A (MMSI-111) approaches. | Map with vessel tracks, monitored zone polygon, timeline scrubber. |
| 2 | Track A goes dark for 38 minutes. | Track break visible on map. Alert appears in signal log / custody queue. |
| 3 | Track B (MMSI-222) appears 4.2 nm away with different name, flag, and destination, but kinematically consistent heading. | Second track appears. System links them as a hypothesis group. |
| 4 | System generates three hypotheses. | Hypothesis board: likely same vessel, different vessel, insufficient data. |
| 5 | Evidence drawer shows raw pings, gap duration, identity mismatch, and distance from zone. | Evidence panel with source tags and mini-timeline. |
| 6 | Specialist reads panel. Intent specialist refuses to infer motive. | `Intent: REFUSED - insufficient evidence -> Collection Planner`. |
| 7 | Next Collection Actions appear. | Monitor, Request EO/SAR imagery, Escalate only if second-source confirms. |
| 8 | Operator writes a review rule. | Rule saves to Watchfloor Rules. |
| 9 | Similar second case appears. | Prior rule applied; recommendation changes from Escalate to Request Collection. |
| 10 | Operator opens provenance trace. | Action traces back to claim, hypothesis, anomaly, and raw observations. |

---

## 9. Visual and Interaction Requirements

### 9.1 Watchfloor Map

- MapLibre GL JS with dark/minimal basemap.
- Visual style should feel Liminal: signal/radar/topographic, layered, precise, not generic AIS dashboard.
- 8-12 faint background tracks, one hero vessel pair.
- Monitored zone polygon with subtle highlight.
- Timeline scrubber labeled `72-hour review window`, but demo jumps to event in seconds.
- Track break rendered as visible gap.
- Track B appears as distinct identity with a dashed/ghost connector to Track A's predicted path.
- Hero vessel color shifts when anomaly fires.

### 9.2 Substrate / Signal Log

- Left-side or integrated panel showing incoming signal sources and flagged items.
- MVP can show a simple alert log / custody queue.
- Signals start as substrate; selected alerts graduate into the working panel.
- Full tray behavior is bonus only.

### 9.3 Custody Case Panel

Shows:

```text
Status: Contested Custody
Custody Confidence: 0.72
Claim: possible same physical vessel after identity change
Support: course continuity, speed envelope, reappearance corridor
Weakening: different MMSI, metadata mismatch, no second-source confirmation
```

### 9.4 Hypothesis Board

Three precomputed JSON cards. No live LLM.

```text
H1: Likely same vessel, identity churn - 0.72 - Supported
H2: Different vessel, coincidental proximity - 0.19 - Contested
H3: Insufficient data, second-source required - null - Unresolved
```

### 9.5 Evidence Chain / Provenance Trace

Expandable 5-line trace:

```text
Request EO/SAR imagery over Box B
  <- Triggered by: Contested Custody Claim C-014
    <- Supported by: Hypothesis H-001, confidence 0.72
      <- Derived from: Anomaly A-7, 38-min AIS dark gap
        <- Raw observations: O-047, O-048, O-052
```

### 9.6 Specialist Reads / Refusal Moment

```text
Kinematics      OK       Track continuity likely preserved
Identity        OK       Metadata conflict: MMSI-111 -> MMSI-222
Intent          REFUSED  insufficient evidence to infer hostile intent
Collection      OK       Recommend EO/SAR imagery over Box B
```

The refusal line is a hero interaction, not small text.

Canonical visual idea:

- close the intent lane,
- show `REFUSED`,
- state the reason,
- redirect to Collection Planner.

### 9.7 Next Collection Actions

```text
A: Monitor only
   Trigger: no second-source confirmation; vessel exits area

B: Request EO/SAR imagery
   Trigger: identity churn + proximity to protected asset

C: Escalate to watch officer
   Trigger: second-source confirms continuity or second anomaly appears
   State after Rule R-001: blocked / greyed out
```

### 9.8 Watchfloor Rules / Review Memory

- Human action buttons: Confirm / Dismiss / Defer / Request Collection.
- Free-text rule input.
- Rule saves to localStorage as append-only event.
- Panel shows rule history.
- After save, a second event appears with `Prior review rule applied`.
- Recommendation changes: `Escalate -> Request Collection`.

---

## 10. Shared Artifact Contract

The Evidence Drawer and the future Liminal Tray share a primitive:

```text
unresolved artifacts enter a persistent workspace
-> system cross-references them
-> structure emerges
```

Define this in the graph spine now:

```ts
type ArtifactKind =
  | 'observation'
  | 'document'
  | 'report'
  | 'track'
  | 'claim'
  | 'hypothesis'
  | 'action'
  | 'reviewRule';

interface GraphArtifact {
  id: string;
  kind: ArtifactKind;
  title: string;
  source: string;
  timestamp?: string;
  status?: 'fresh' | 'stale' | 'contested' | 'supported' | 'unresolved';
  content: string;
  metadata?: Record<string, unknown>;
  evidenceIds?: string[];
}
```

SeaForge's evidence drawer is the DoD rendering of the same primitive that becomes Liminal's tray.

---

## 11. Graph Spine

### Domain-Neutral Node Types

```text
Observation
Entity
Track / ContinuityObject
Anomaly
Hypothesis
Claim
Evidence
ActionOption
ReviewRule
Case
```

### Edge Types

```text
OBSERVED_AS
DERIVED_FROM
SUPPORTS
WEAKENS
CONTRADICTS
TRIGGERS
RECOMMENDS
REVIEWED_BY
APPLIES_TO
```

### Constraints

- No maritime concepts in `graph-spine/`.
- Maritime concepts belong in `fixtures/maritime/`.
- Every edge carries provenance metadata.
- Archetype metadata is dormant but supported on Anomaly, Claim, ActionOption, and ReviewRule.

### Archetype Metadata

```ts
interface ArchetypeMetadata {
  archetype_primary?: 'Sage' | 'Magician' | 'Judge' | 'Sovereign' | 'Trickster' | string;
  archetype_secondary?: string[];
  archetype_role?: 'perception' | 'persistence' | 'epistemic' | 'decision' | 'review_memory';
}
```

Layer mapping:

| Layer | Primary Archetype | Role |
|---|---|---|
| Perception | Sage | pattern recognition, anomaly surfacing |
| Persistence | Magician | identity continuity across transformation |
| Epistemic | Judge | contested claims and evidence weighing |
| Contradiction | Trickster | preserves contradiction and prevents premature closure |
| Decision | Sovereign | next-move recommendation |
| Review Memory | Judge / Sovereign bridge | correction preserved as discernment and applied as future rule |

---

## 12. Tech Stack

```text
Vite + React + TypeScript
MapLibre GL JS
graph-spine/ tiny local knowledge graph
Local JSON fixtures
localStorage for Review Memory
No backend on critical path
No SQLite on critical path
No FastAPI on critical path
No cloud deploy on critical path
```

Optional seam:

```text
Existing daemon or real data pipeline can write observations into the same GraphArtifact schema.
Not required for demo.
Not on critical path.
```

---

## 13. Build Boundary

### Must Build

- Persistent app shell: substrate/signal log, stage viewport, working panel, command line affordance.
- Map replay with dark gap + identity churn using two MMSIs.
- Custody queue / alert log.
- Custody confidence score with visible supporting and weakening factors.
- Hypothesis board with three cards.
- Evidence drawer / provenance trace.
- Specialist refusal line.
- Next Collection Actions.
- Watchfloor Rules panel.
- Prior rule applied beat.
- `graph-spine/` traversal engine.
- `Ctrl+Shift+R` reset.

### Nice Bonus

- Tray interaction.
- Full graph visualization.
- Command-line intelligence.
- Commander Brief export.
- Loitering / impossible jump filler anomalies.
- Background vessel animation polish.
- Demo video proof clip polish.

### Do Not Build

- Full live ingestion.
- Full JPDA/MHT tracker.
- Full Provenance COP platform.
- Full COA Forge planner.
- Neo4j / Kumu / semantic ontology tooling as critical path.
- Backend/database/cloud deploy as critical path.
- Chatbot.
- Autonomous threat attribution.
- Hostile intent inference.

---

## 14. Demo Video Capture Requirement

SeaForge must produce both:

1. Live hackathon demo.
2. 60-second demo video.

The demo video must include:

- contested custody / hypothesis board,
- intent specialist refusal,
- human review rule saved,
- later case changed by Review Memory,
- portability reveal.

Portability reveal:

> The primitive is not maritime. It is evidence custody under ambiguity.

---

## 15. Success Criteria

| Criterion | Done means |
|---|---|
| Shell exists | Substrate/stage/working panel/command affordance are visible |
| Map replays | Vessel goes dark, Track B appears |
| Queue works | Custody card appears; click opens case |
| Hypotheses visible | Three cards with badges |
| Evidence inspectable | Raw pings and identity fields visible |
| Provenance works | Action traces back to raw observations |
| Refusal fires | Intent shows REFUSED as designed moment |
| Actions available | Three options with triggers |
| Review rule saves | Rule persists in Watchfloor Rules |
| Prior rule applies | Second event changes recommendation |
| Reset works | Ctrl+Shift+R clears state |
| Fallback exists | Screen recording saved |
| Demo video exists | Portability beat captured |

