# Demo Arc v2 — Liminal Custody

**Status:** Canonical demo narrative as of 2026-05-03 17:54Z (post-PR-#54).
**Authority:** This doc supersedes the demo flow described in earlier `round1-round2-script.md` and `demo-video-script.md` versions. Those scripts are now the speaking-text overlay on top of this arc; if they conflict, this doc wins on what the system *does*, those win on what the operator *says*.

**What changed since the morning of 2026-05-03:** the demo arc grew from 6 beats to **9 beats** as 25 PRs landed. New: AI-proposed third case at cold-open · drag-and-drop signal attach as the only operator-driven beat · server-stamped guard verdict in archival paper register · phase-keyed focus management · rule-compounding edges visualization at make-or-break-2 · substrate-state chyron at bottom narrating system state in plain English.

---

## The arc, in one sentence

> *"The system noticed something ambient before the operator selected anything. The watch officer holds custody, refuses to overclaim, writes a rule, and the rule reaches back into prior cases the operator never knew about."*

---

## Three-act structure · 3 minutes

### Act 1 · *The system has already noticed* (~30s)

#### Beat 0 — Cold open · operator persona (5s)

App opens with persistent broadcast chyron (PR #39 SHIP-5):
`LIMINAL · CUSTODY · CASE alara_01_ · 5TH FLEET · STRAIT OF HORMUZ · 0200 LOCAL · WATCH OFFICER · D. ARI`

Substrate-state chyron at bottom (PR #43 STRETCH-1) reads:
`substrate :: settling · 0 nodes wet · 0 specialists drying · watchfloor at rest`

Map shows baseline AIS traffic in the Strait of Hormuz AOI · Hormuz Watch Box 01 outlined.

#### Beat 1 — AI-proposed third case (8s) ⟵ NEW

Before the operator selects anything, an AI-proposed case has already surfaced (PR #29). A discovery toast in the working pane reads:

> **LIMINAL AGENTS · DISCOVERY · 72% CONFIDENCE**
> Hormuz Watch Box dark-vessel proposal
> 11 vessels · Hormuz Watch Box 01 · real source window · `VIEW DRAFT →`

This is the new opening beat. **The system noticed something ambient. It hasn't claimed anything; it's offering a frame.** Real Danti pipeline outputs feed this surface (PRs #32, #33) — actual AIS observations from the cached pipeline, not fixture decoration.

#### Beat 2 — Operator agency · drag-and-drop signal attach (8s) ⟵ NEW

Watch officer drags a high-signal OSINT signal from the AI-proposed draft into the StageViewport (PR #30 B-1). The signal materializes as a ghost ship on the map (PR #31 B-2) with a celebration animation in the working panel (PR #34 B-3). 

This is the demo's **only operator-driven interactive moment**. Everything else is replay-driven; this single drag-and-drop says *"the operator is the principal, not the system."*

#### Beat 3 — Open EV1 (or EV2 if R-001 saved) (5s)

Operator clicks **EV1** in the substrate pane.

If a review rule has already been saved from a prior session, the app auto-selects **EV2** instead (PR #49 A3) — the rule-applied case becomes the default landing beat. This is the first surfacing of "review memory as a moat" *before the demo even runs*.

**Substrate three-register separation** (PR #51 B4) is now visible: WATCHFLOOR (open cases) · AI · PROPOSED · 1 · OSINT SIGNALS · 308. Three epistemic registers, three visual tiers, distinct backgrounds.

### Act 2 · *Custody before conclusion* (~90s · the Maven-invisible beats)

#### Beat 4 — Map dominance · phase advances (15s)

Per PR #53 B2, at 1440×900 the stage panel is **624px wide** (was 544px) — the geographic surface wins. MapTelemetryHud anchors bottom-right with proper `--color-glass` background (PR #50 B5):

```
PHA · BEAT · P2
MMSI · CHURN · 0
DARK · GAP · 38m
SIG · INT · WATCHING
GUARD · LAYER 2 · ARMED
```

Phase-keyed focus management (PR #46 STRETCH-2) means the eye lands on the map through the geographic beats; substrate + working dim to ~30% opacity.

Replay engine advances on a clock:
- P1 cold open → P2 dark gap detected
- Substrate-state chyron updates: `substrate :: holding · 8 nodes wet · 6 specialists drying · track A dark-gap detected · 38m`

#### Beat 5 — Track B reappears (10s)

Phase advances to P3. Second identity (MMSI-222 / MV CALDERA) appears on map inside the Kalman-predicted ellipse, 4.2 nm from MMSI-111's last known position.

Substrate chyron: `substrate :: holding · 7 nodes wet · 5 specialists drying · kalman fit predicted · track B reappeared`

#### Beat 6 — Specialist convergence (15s)

Phase advances to P4. **Specialist Reads** (PR #41 SHIP-2) populate in the working pane — six rows in mnemonic gutters: `KIN`, `IDV`, `SIG · INT`, `INT`, `COL`, `VIS`.

Signal integrity row self-narrates the convergence beat (PR #27): identity correlation flags MMSI mismatch, visual flags AIS-class mismatch (CLIP says tanker, AIS declares cargo), kinematics flags continuity inside a known spoofing envelope. **Three independent specialists converge on source-chain compromise.**

Substrate chyron: `substrate :: holding · 6 nodes wet · 3 specialists drying · signal integrity contested · 3 specialists converged`

Wet/drying/dry typography (PR #42 SHIP-3) makes each evidence row's epistemic state legible at a glance.

#### Beat 7 — *Make-or-break-1* · Intent refused, server-stamped (15s)

Phase advances to P5. **The italic causal callout** fires:

> *"Intent refused — because Signal Integrity is contested."*

Below it, in archival paper register inside the working pane, the **server-stamped guard verdict** appears (PR #44 STRETCH-3):

```
━━━ STRUCTURAL GUARD :: VERDICT ━━━
GUARD · LAYER-2     ::  NO INTENT INDICATOR
UPSTREAM_REFUSAL    ::  SIGNAL INTEGRITY
—— stamped by guard.ts · structurally enforced ——
```

The page reads as if the server typed it directly, not as if the UI announced it. **HARD CONSTRAINT (per integration-state §6):** the stamp text is parsed entirely from the `refusalReason` payload, never from a UI string literal. Same shape in fixture-mode and AIP-mode. Judge cannot distinguish the two.

Substrate chyron: `substrate :: holding · 4 nodes wet · 0 specialists drying · intent refused · structural guard fired`

ExecSummary section in working pane renders with serif typography (PR #54) — Fraunces with `ss01 + kern + onum` OpenType features, opsz 16, SOFT 50, 13.5px / 1.62 line-height. Reads as a case-file at 30ft projector distance, not as a UI label. EvidenceDrawer cards lift to glassmorphism with `backdrop-filter` + depth shadows + hover translateY (also PR #54).

**Action options recommended** but not chosen automatically:
- → Request second-source EO/SAR collection (PRIMARY, sage-decision)
- → Hold custody case open · re-evaluate at next AIS frame (secondary)
- ~~→ Escalate to commander · auto-flag hostile~~ (struck-through coral)

### Act 3 · *Doctrine compounds* (~60s · the Maven-augmenting close)

#### Beat 8 — Operator writes review rule (12s)

Operator types into ReviewMemory:

> *"Identity churn alone is insufficient without second-source confirmation."*

Hits save. Rule persists to localStorage as `R-001 · ACTIVE`. Review-rules DSL parser (M4, `shared/rules/dsl.ts`) parses and indexes.

#### Beat 9 — *Make-or-break-2* · second case re-ranked, doctrine compounds (15s)

Phase advances to P6. Operator opens (or app auto-presents per A3) the **second case** — `case_alara_01_event_2_`.

The **PRIOR REVIEW RULE CHANGED THIS RECOMMENDATION** banner fires at the top of the working pane. Verb chip reads `RECOMMEND COLLECTION · PRIOR RULE APPLIED`. Bounded actions reorder:

| Action | New posture | Was |
|---|---|---|
| Task SAR/RF over Qeshm and Bandar Abbas | **RECOMMENDED** | (lower priority) |
| Monitor Hormuz traffic cluster | `PRIOR TOP` | RECOMMENDED |
| Escalate on confirmed behavior | (third) | (third) |

Below renders the **rule-compounding edges visualization** (PR #45 STRETCH-6): SVG arc-edges fan from the rule chip to **4 prior cases** the rule retroactively applies to:

| Prior case | Verdict | Edge |
|---|---|---|
| `case_alara_01_event_2_` | **RE-RANKED** | sage-green, animated draw |
| `case_marad_2026_004_cluster_` | **RE-RANKED** | sage-green, animated draw |
| `case_huge_imo9357183_` | UNCHANGED | dashed grey |
| `case_qeshm_anchorage_` | UNCHANGED | dashed grey |

Footer in serif italic: *"the rule fires on cases this case never knew about · doctrine compounds."*

Substrate chyron updates to its closing line: `substrate :: REVIEWING · 4 nodes wet · 0 specialists drying · rule R-001 applied · second case re-ranked`

**Doctrine compounds. Review memory IS the moat.**

---

## The narrative compression

If a non-technical judge reads only the **bottom substrate-state chyron** through all three acts, the system tells its own story in six lines of plain English:

```
substrate :: settling     · 0 nodes wet  · watchfloor at rest
substrate :: holding      · 8 nodes wet  · track A dark-gap detected · 38m
substrate :: holding      · 7 nodes wet  · kalman fit · track B reappeared
substrate :: holding      · 6 nodes wet  · signal integrity contested
substrate :: holding      · 4 nodes wet  · intent refused · structural guard fired
substrate :: REVIEWING    · 4 nodes wet  · rule R-001 applied · second case re-ranked
```

Six lines. The whole demo. Plain English. **Source-agnostic** — renders identically in fixture-mode and AIP-fallback mode (per `integration-state.md` §6 hard constraint).

---

## Per-judge sentence map (cued by which beat)

| Judge | Sentence | Beat |
|---|---|---|
| Army · xTech | *"90-day pilot with maritime watchfloor"* | Beat 0 cold open · named operator card visible |
| Shield Capital | *"Shayaun is OffSec / top 100 HTB · the structural guard is his architecture"* | Beat 7 server-stamp verdict moment |
| IQT | *"the unsolved layer between substrate and command"* | Beats 4–6 transition · stage → working focus shift (STRETCH-2) |
| DCVC | *"the moat is the substrate"* | Beat 9 rule-compounding edges visualization |
| Palantir | *"augments Maven one layer earlier · could ship as an AIP module"* | Q&A · Shayaun flips env flag, Danti pipeline lights up |
| Stanford Gordian | *"restraint is a security feature"* | Beat 7 italic causal callout |
| L3Harris | *"sits between feeds and C2"* | Beat 1 substrate pane · OSINT signals + AI-proposed draft + Danti pipeline |
| Berkeley DTS | implicit · founder + Shayaun bona fides | Beat 0 broadcast chyron + named operator persona |

---

## What's wired to read off `guard.ts` payload (source-agnostic)

These surfaces render from data, not hardcoded copy. Same shape, fixture vs AIP:

- Substrate-state chyron stance + handoff (STRETCH-1)
- Wet/drying/dry typography state (SHIP-3)
- Server-stamped guard verdict layers (STRETCH-3)
- Causal callout connector (causal pair from earlier ships)
- ConfidenceBar roughness (SHIP-2 + AUDIT B5 polish)
- Specialist-row REFUSED / CONTESTED / HONORED state
- presentationText helper (`app/src/lib/presentationText.ts`) routes raw data through display-copy contract

These are the surfaces a judge cannot distinguish demo-mode from Q&A-mode on. The structural guard is the invariant; the chrome reads off the invariant.

---

## Q&A defense surfaces (cross-reference `q-and-a.md`)

The demo-arc moments where Q&A defense is strongest:

| Question | Beat to point at | Anchor |
|---|---|---|
| *"How does the guard prevent prompt injection?"* | Beat 7 server-stamp | "Server-side after AIP output. Same guard wraps fixture and AIP. Fixtures already passed it at cache time." |
| *"Are these real ships?"* | Beat 1 AI-proposed third case | "Real Danti pipeline AIS outputs (PRs #32, #33). Demo critical path is fixtures for deterministic timing; Shayaun can flip env flag and Danti pipeline goes live — chrome doesn't change because it reads off `presentationText` helper." |
| *"Can a judge tell demo mode from live mode?"* | Beat 7 stamp + Beat 9 rule-compounding | "No. By design. Same guard, same UI, same `refusalReason` payload shape." |
| *"What's not real?"* | (no specific beat) | Per `public-repo-notes.md`: live AIS feed during the timed pitch, live LLM on critical path, hostile-intent inference (refused by guard), automated escalation, command-action authority, attribution. |

---

## Demo machine reboot checklist

If the demo machine reboots mid-day, restoration steps:

1. `bun run dev` — server :8787 + vite :5173 up
2. App auto-loads
3. If localStorage rules saved → EV2 selected by default (PR #49 A3); else EV1
4. AI-proposed draft case toast surfaces in working-pane header (Beat 1)
5. Map renders Strait of Hormuz baseline AIS + Danti vessel overlays (Beats 0, 4)
6. Replay scrubber sits at P1, paused; play button bottom-right
7. Cmd+1/2/3/4 hotkeys focus substrate/stage/working/command (PR #52 D2)
8. `Ctrl+Shift+R` resets · clears localStorage rules · re-arms make-or-break-2

---

## Never-cut invariants (from CLAUDE.md, verified post-PR-#54)

| Invariant | Status |
|---|---|
| Persistent shell (desktop) | ✅ |
| Dark gap + two-MMSI identity churn | ✅ Beat 4 + Beat 5 |
| Hypothesis board | ✅ Beat 4 (3 cards · primary 0.48, alts 0.31 / 0.21) |
| Signal Integrity row | ✅ Beat 6 |
| Specialist refusal (structurally enforced) | ✅ Beat 7 |
| Causal line: *"Intent refused because Signal Integrity contested"* | ✅ Beat 7 |
| Evidence/provenance trace | ✅ working pane forensic surface |
| Review rule saved | ✅ Beat 8 |
| Prior rule applied / second case changed | ✅ Beat 9 |

All 9 invariants render correctly in the live app at `74da0bf`-then-forward.

---

## Provenance

- **Authoritative position:** `docs/liminal-custody-onepager.md`
- **What's real / fixture / not claimed:** `docs/public-repo-notes.md`
- **Module → beat → pitch language:** `docs/integration-state.md`
- **Round 1 / Round 2 verbal scripts:** `docs/round1-round2-script.md`
- **60-second video shooting script:** `docs/demo-video-script.md`
- **Q&A drills:** `docs/q-and-a.md`
- **Judge-by-judge calibration:** `docs/v4-judge-calibrated-demo.md`
- **Inspo synthesis (the 14-source ship spec):** `docs/design/INSPO_TO_SURFACE_MAP.md`
- **Audit doc (live defect ledger):** `docs/design/AUDIT_AND_REFINEMENT.md`
