# SeaForge — v3 Sequencing Plan

**Status:** v3 patch on top of `docs/v2/SeaForge_Sequencing_Plan_v2.md`. v2 phase gates are unchanged. v3 inserts Signal Integrity tasks and adds judge-calibration windows at the front and back.

---

## Locked demo spine (v3)

1. Vessel goes dark.
2. Second identity appears.
3. System preserves hypotheses, not conclusions.
4. **Signal Integrity flags source chain as CONTESTED.** *(v3)*
5. Intent layer refuses to overclaim — visibly *because of* Signal Integrity. *(v3 reframe)*
6. Human review rule changes the next recommendation.

---

## Phase gates (unchanged from v2, with v3 additions noted)

| Gate | Time | Must be true |
|---|---:|---|
| Gate 0 | Hour 0:30 | **Track decision locked. Maven posture locked. Stack pinned. v3 schema delta committed.** *(v3 addition)* |
| Gate 1 | Hour 3 | Shell loads, map shows tracks, graph initializes (with `sourceIntegrityCheck` type registered). |
| Gate 2 | Hour 8 | Vessel goes dark, second identity appears, alert opens case. |
| Gate 3 | Hour 13 | Hypotheses, evidence drawer, provenance trace render from graph. |
| Gate 4 | Hour 20 | Full loop works: review rule saves and changes second case. **Signal Integrity row renders. Intent refusal causally linked.** *(v3 addition)* |
| Gate 5 | Hour 25 | UI polished, reset works, fallback recording exists. |
| Gate 6 | Hour 31 | Demo rehearsed, **Round 1 + Round 2 scripts memorized**, SpeedRun clip captured, reset verified. *(v3 addition)* |

---

## Phase 0 — Calibration + setup (Hours 0 – 0:45)

**v3 addition.** Before any build.

Both:

- Read `docs/v3-positioning-patch.md`.
- Read `docs/v4-judge-calibrated-demo.md`.
- Lock track: PS1 primary. (10-min budget for a Category 5 mentor ask if one is nearby; otherwise skip.)
- Lock Maven posture: invisible Round 1, augmenting Round 2.
- Confirm stack: Vite + React + TypeScript + MapLibre. No Neo4j, no Palantir AIP runtime, no live LLM.
- Quick-check partner provisioning windows: if Palantir AIP / Codex / Danti are offered in the first 30 minutes and integration is < 30 min, take them. Otherwise drop.

**Exit:** both committed to track, Maven posture, stack, schema delta.

---

## Phase 0.5 — Shell + fixtures + graph spine (Hours 0:45 – 3)

(v2 Phase 0, slightly compressed by the calibration window.)

Shayaun:

- Generate `fixtures/maritime/tracks.geojson` (NORMAL, GHOST, AMBIGUOUS, monitored zone, background).
- Wire MapLibre to render static tracks.
- **v3:** start drafting `fixtures/maritime/source-integrity-checks.json` indicators that match the demo scenario.

Shruti:

- Create Vite React TS app.
- Scaffold `AppShell`, `SubstratePanel`, `StageViewport`, `WorkingPanel`, `CommandLine`.
- Build `graph-spine/schema.ts` **including `sourceIntegrityCheck` node type**, `graph.ts`, `provenance.ts`, `review-memory.ts`.
- Create maritime fixtures except `tracks.geojson` and `source-integrity-checks.json`.

**Exit:** App loads → map shows tracks → graph traceBack returns chain → `sourceIntegrityCheck` type accepted by graph load.

---

## Phase 1 — Stage + alert flow (Hours 3 – 8)

(v2 Phase 1, unchanged.)

Shayaun:

- Map replay, scrubber, dark gap visual, Track B appearance, zone polygon, fly-to.

Shruti:

- Substrate panel + custody queue + selected case state + basic case panel.

**Exit:** Judge sees dark gap → second identity → alert card → click opens case.

---

## Phase 2 — Evidence custody layer (Hours 8 – 13)

(v2 Phase 2, unchanged.)

Shayaun:

- Polish map, highlight selected tracks, tune dark-gap connector visual.

Shruti:

- Hypothesis board, evidence drawer, provenance trace via graph traversal, wire into case panel.

**Exit:** Case panel shows 3 hypotheses + raw evidence + provenance.

---

## Phase 3 — Refusal + Review Memory + Signal Integrity (Hours 13 – 20)

(v2 Phase 3 + v3 Signal Integrity work.)

Shayaun:

- Stabilize map and edge cases.
- **v3:** finalize `source-integrity-checks.json` — fixture must read realistically to a defense judge. Indicators should reference real AIS spoofing patterns documented in Hormuz / Bab al-Mandab incidents. Prepare to defend the indicators in technical Q&A.
- Prepare fallback recording setup.

Shruti:

- Build `SpecialistReads.tsx` with **5 rows** (Kinematics / Identity / **Signal Integrity** / Intent / Collection).
- Make Intent REFUSED the hero UI moment.
- **v3:** wire the causal line — *"Intent refused because Signal Integrity is contested"* — using the `triggers_refusal_for` field.
- Build action options.
- Build Watchfloor Rules / Review Memory.
- Save review rule to localStorage.
- Trigger second case changed by prior rule.

**Exit:** Full flow works: anomaly → evidence → **Signal Integrity CONTESTED** → Intent REFUSED (visibly caused) → action → review rule → next case changed.

---

## Phase 4 — Polish + capture (Hours 20 – 25)

(v2 Phase 4, with v3 visual polish on Signal Integrity.)

Shayaun:

- Map style polish, Liminal-grade signal/radar feel.
- Fallback recording.

Shruti:

- UI polish, language audit.
- **v3:** amber CONTESTED visual treatment on Signal Integrity row; expandable indicator list.
- Confidence / rule visuals.
- Reset handler (clears Signal Integrity state too).
- SpeedRun proof clip structure.

**Exit:** Demo runs clean, reset works, fallback recording exists.

---

## Phase 5 — Rehearsal + cut enforcement (Hours 25 – 31)

(v2 Phase 5, expanded for two-round structure.)

Both:

- **v3:** rehearse Round 1 script (3 min, Maven-invisible) — 5+ runs.
- **v3:** rehearse Round 2 script (5 min, Maven-augmenting) — 3+ runs.
- Practice the Q&A doc answers (`docs/q-and-a.md`).
- Practice the portability beat.
- Cut fragile features at hour 27.
- Verify 3 consecutive clean Round 1 runs.

**Exit:** Round 1 demo ready, Round 2 demo ready, fallback ready, SpeedRun artifact ready.

---

## Never cut (v3)

- Dark gap + two-MMSI identity churn.
- Hypothesis board.
- Evidence chain / provenance trace.
- **Signal Integrity row.** *(v3)*
- Specialist refusal (Intent REFUSED).
- **Causal line: Intent refused because Signal Integrity contested.** *(v3)*
- Review rule saved.
- Prior rule applied / second case changed.

## Cut first

- Live LLM calls.
- Live AIS feed.
- Palantir AIP runtime integration.
- Commander Brief export.
- Loitering / impossible jump filler anomalies.
- Danti / Shodan / ADS-B live integrations.
- Backend.
- Cloud deploy.
- Tray.
- Full graph visualization.
- Neo4j / Kumu / ontology tooling.
- Live command-line intelligence.

---

## One thing to protect

The v3 make-or-break moment:

> **A second event card shows a changed recommendation because of a human review rule —
> and the system visibly shows that Intent refused because Signal Integrity was contested.**

If both land, SeaForge has two differentiators no other team will have:
- Review Memory (the moat).
- Restraint-as-security-feature (the PS4 differentiator made causal).

If only one lands, ship that one and pitch around it. Do not cut these moments.
