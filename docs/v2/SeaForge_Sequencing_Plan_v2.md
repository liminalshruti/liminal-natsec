# SeaForge - Sequencing Plan v2

This sequencing plan translates the updated PRD and implementation plan into the order of execution for the hackathon build.

---

## Build Principle

Build one persistent shell with six states, not separate screens.

```text
Substrate / Signal Sources -> Stage Viewport -> Working Panel -> Command Line Affordance
```

The final demo must prove:

```text
raw observation -> anomaly -> custody hypothesis -> contested claim -> action option -> review memory -> next case changed
```

---

## Locked Demo Spine

1. Vessel goes dark.
2. Second identity appears.
3. System preserves hypotheses, not conclusions.
4. Intent layer refuses to overclaim.
5. Human review rule changes the next recommendation.

---

## Phase Gates

| Gate | Time | Must be true |
|---|---:|---|
| Gate 1 | Hour 3 | Shell loads, map shows tracks, graph initializes. |
| Gate 2 | Hour 8 | Vessel goes dark, second identity appears, alert opens case. |
| Gate 3 | Hour 13 | Hypotheses, evidence drawer, provenance trace render from graph. |
| Gate 4 | Hour 20 | Full loop works: review rule saves and changes second case. |
| Gate 5 | Hour 25 | UI polished, reset works, fallback recording exists. |
| Gate 6 | Hour 31 | Demo rehearsed, demo video captured or outlined, reset verified. |

---

## Phase 0 - Shell, fixtures, graph spine (Hours 0-3)

**Goal:** prove the app shell, fixture pack, and graph spine exist.

Shayaun:

- Generate `fixtures/maritime/tracks.geojson`.
- Include NORMAL, GHOST, AMBIGUOUS, monitored zone, and background tracks.
- Wire MapLibre to render static tracks.

Shruti:

- Create Vite React TS app.
- Scaffold `AppShell`, `SubstratePanel`, `StageViewport`, `WorkingPanel`, `CommandLine`.
- Create maritime fixtures except tracks.
- Build `graph-spine/schema.ts`, `graph.ts`, `provenance.ts`, `review-memory.ts`.

Exit condition:

```text
App loads -> map shows tracks -> graph traceBack() returns a chain.
```

---

## Phase 1 - Stage + alert flow (Hours 3-8)

**Goal:** make the judge-visible map flow work.

Shayaun:

- Map replay.
- Timeline scrubber.
- Dark gap visual.
- Track B / second identity appears.
- Zone polygon and map fly-to.

Shruti:

- Substrate / alert log.
- Custody queue.
- Selected case state.
- Basic case panel in Working Panel.

Exit condition:

```text
Judge sees dark gap -> second identity -> alert card -> click opens case.
```

---

## Phase 2 - Evidence custody layer (Hours 8-13)

**Goal:** make the demo more than a map.

Shayaun:

- Polish map interactions.
- Highlight selected tracks.
- Tune dark gap / connector visual.

Shruti:

- Build hypothesis board.
- Build evidence drawer.
- Build provenance trace using graph traversal.
- Wire into case panel.

Exit condition:

```text
Case panel shows 3 hypotheses, raw evidence, and action-to-observation provenance.
```

---

## Phase 3 - Refusal + Review Memory (Hours 13-20)

**Goal:** complete the Evidence Custody Loop.

Shayaun:

- Stabilize map and edge cases.
- Prepare fallback recording setup.

Shruti:

- Build specialist reads.
- Make Intent REFUSED the hero UI moment.
- Build action options.
- Build Watchfloor Rules / Review Memory.
- Save review rule to localStorage.
- Trigger second case changed by prior rule.

Exit condition:

```text
Full flow works: anomaly -> evidence -> refusal -> action -> review rule -> next case changed.
```

---

## Phase 4 - Polish + capture (Hours 20-25)

**Goal:** make it legible, beautiful, and safe to present.

Shayaun:

- Map style polish.
- Liminal-compatible signal/radar/topographic feel.
- Fallback recording.

Shruti:

- UI polish.
- Language audit.
- Confidence / rule visuals.
- Reset handler.
- Demo video proof clip structure.

Exit condition:

```text
Demo runs clean, reset works, fallback recording exists.
```

---

## Phase 5 - Rehearsal + cut enforcement (Hours 25-31)

**Goal:** protect delivery.

Both:

- Run demo 5+ times.
- Cut pitch to 55 seconds.
- Practice false-association / JPDA answer.
- Practice portability beat.
- Cut fragile features at hour 27.
- Verify 3 consecutive clean runs.

Exit condition:

```text
Live demo ready, fallback ready, demo video artifact ready enough.
```

---

## Never Cut

- Dark gap + two-MMSI identity churn.
- Hypothesis board.
- Evidence chain / provenance trace.
- Specialist refusal.
- Review rule saved.
- Prior rule applied / second case changed.

## Cut First

- Live LLM calls.
- Commander Brief export.
- Loitering / impossible jump.
- Danti / Shodan / ADS-B.
- Backend.
- Cloud deploy.
- Tray.
- Full graph visualization.
- Neo4j / Kumu / ontology tooling.
- Command-line intelligence.

---

## One Thing to Protect

The make-or-break moment:

```text
A second event card shows a changed recommendation because of a human review rule.
```

Everything else supports that.

