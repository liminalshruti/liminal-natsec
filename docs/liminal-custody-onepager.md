# Liminal Custody

**The pre-command evidence layer for contested operational signals.**

Hackathon submission — 3rd Annual NatSec Hackathon (Cerebral Valley × Army xTech), May 2–3 2026. Primary track: Sensor Analysis & Integration (PS1). Differentiator: Digital Defense (PS4). Architecture language: Mission C2 (PS3).

---

## The one sentence

> **Maven is the foundation. We are the substrate.**
>
> Liminal Custody protects the evidence chain before it becomes commandable. Every recommendation traces back to evidence; every refusal is structurally enforced; every operator correction becomes durable doctrine.

---

## The four-layer framework

| **SUBSTRATE** | **CUSTODY** | **REFUSAL** | **REVIEW MEMORY** |
|---|---|---|---|
| The X — raw multi-domain observations: AIS, OSINT, RF, radar, intelligence reports. Messy, partial, contradictory, possibly compromised. | The in-between — preserved hypotheses, traceable evidence chains, source-integrity checks, contested claims. The state Maven assumes is already resolved. | The structural invariant — every AI specialist output passes through a 7-layer server-side guard. Citation minimums, evidence-type requirements, and posterior thresholds enforce refusal. AI cannot overclaim. | The Y — operator corrections become durable rules. The next case is changed by the last decision. Human judgment compounds. |

This framework is *not* features × categories. It is **operator decision × evidence layer**. One generation ahead of how defense primes pitch.

---

## The named operator

> A maritime watch officer at U.S. 5th Fleet, 0200 local, monitoring AIS disruptions near a strategic chokepoint in the Strait of Hormuz, deciding whether a dark-gap reappearance under a new identity deserves immediate escalation or second-source collection.

The 5th Fleet AOR includes Hormuz and Bab al-Mandab — both have *documented* AIS spoofing incidents (Iran-attributed, since ~2019). Naming the unit, the time of day, and the specific decision is the integrity test of a defense pitch. Maven's one-pager doesn't name a single operator. Ours leads with one.

---

## The demo

A vessel in the Strait of Hormuz goes dark for 38 minutes. A second identity appears 4.2 nautical miles away with different name, flag, and destination — but kinematically consistent heading. The system does **not** call it the same vessel. It does **not** call it different vessels. It opens a custody case.

| Beat | What happens | Layer |
|---|---|---|
| 1 | Vessel goes dark | Substrate (AIS feed gap detected by Kalman dark-gap predictor, M1) |
| 2 | Second identity appears | Substrate (replay engine surfaces MMSI-222) |
| 3 | Three custody hypotheses preserved | Custody (Bayesian fusion of identity features, M2) |
| 4 | **Signal Integrity: CONTESTED** | Custody (source-integrity check fires; single-source confirmation only) |
| 5 | **Intent: REFUSED — structurally enforced** | Refusal (guard.ts Layer 1: <2 cited observations + Layer 2: no INTENT_INDICATOR evidence) |
| 6 | Collection action recommended | Custody → Refusal → Action (request second-source EO/SAR imagery) |
| 7 | Operator writes a review rule | Review Memory (DSL parsed, persisted, indexed) |
| 8 | Next case recommendation changes | Review Memory (rule applied to VESSEL-AMBIGUOUS class; Escalate → Request Collection) |

The make-or-break moment: **the second case is changed by the prior rule, AND the system shows that Intent refused because the structural guard fired on Layer 2.** This is what no other team in the room will have.

---

## The procurement integration map

```
                     EXISTING DOD STACK
                    ↓                ↓
     [ AIS / OSINT / RF / radar / intelligence feeds ]
                          ↓
                ┌─────────────────────┐
                │  LIMINAL CUSTODY    │  ← we slot here
                │  (pre-command       │
                │   evidence layer)   │
                └─────────────────────┘
                          ↓
                [ commandable signals only ]
                          ↓
              [ Maven Smart System / CJADC2 ]
                          ↓
                  [ command action ]
```

We do not replace Maven. Maven is the foundational platform for CJADC2 and the Pentagon's program of record. We protect the layer beneath it — the layer where signals are still contested, where evidence is still incomplete, where AI outputs still need to be governed before they're committed to the operational picture.

**Pilot path:** 90-day pilot with 5th Fleet J2 / Naval Postgraduate School contested-environments group, on Hormuz / Bab al-Mandab AIS replay data. Or: AIP module integration into existing Foundry deployments.

---

## What we do not do

```
We do not infer hostile intent.
We do not attribute.
We do not auto-escalate.
We do not replace command authority.
We do not require unguarded LLMs in the runtime.
```

Refusal is not a brake. It is a server-side invariant that compounds with every operator correction. The Pentagon's policy mandate is "appropriate levels of human judgment." Our system enforces that mandate as code, not as policy.

---

## Why us

**Shruti Rajagopal** — Founder, Liminal. Pre-decisional infrastructure for unresolved context. Seven years PM at Asana, Cloudflare, Robinhood, Ancestry. UC Berkeley Cognitive Science & CS.

**Shayaun (Sean) Nejad** — Co-founder, engineering. **OffSec-certified, top 100 globally on Hack The Box.** Signal-chain compromise, intrusion, and offensive security is his domain. The structural guard is his architecture.

This is the team that can claim *"we treat the evidence chain like an attack surface, because we know what it looks like to attack one."*

---

## The architectural posture

**Three-tier runtime, all on the critical path.**

| Tier | What | Why |
|---|---|---|
| A — Desktop shell | Electron-wrapped Vite + React + MapLibre | Persistent operator surface; substrate / stage / working panel / command line. Real desktop application. |
| B — Engineered runtime | Bun + Hono server hosting M1–M7 modules | Kalman dark-gap predictor, Bayesian fusion, **structural guard**, rule DSL parser, CLIP cross-modal correlation, perturbation injection, provenance with confidence flow. |
| C — Authoritative store | Palantir Foundry Ontology + AIP Logic | Operational graph; AIP runs specialists in production, fixtures replay them through the same guard in demo. Developer access confirmed. |

**Schema is domain-neutral.** `graph-spine/` carries `observation`, `entity`, `evidence`, `sourceIntegrityCheck`, `anomaly`, `hypothesis`, `claim`, `track`, `actionOption`, `reviewRule`, `case`. Maritime concepts live only in `fixtures/maritime/`. The same spine projects to a different domain (founder ops, intelligence, supply chain) without re-architecting.

---

## Strategic spine — OGSM, embedded

This is the back-of-room reading of the same artifact above.

### Objective

Build Liminal Custody as a working NatSec Hackathon demo that proves *evidence custody before command* through a maritime contested-identity scenario, while creating reusable Liminal substrate (graph spine, provenance trace, structural guard, review memory).

### Goals

```
G1  Ship working technical demo before noon Sunday May 3.
G2  Place top-5 in judging to take cash + DoD/Palantir follow-on.
G3  Create credible artifact for Shield / IQT / DCVC follow-on conversations.
G4  Preserve reusable Liminal architecture (domain-neutral graph spine).
G5  Produce 1-min demo video + Round 1 + Round 2 pitch packages.
```

### Strategies

```
S1  Work backward from Round 2 stage performance.
S2  Build one persistent desktop shell with six workflow states, not separate screens.
S3  Submit under PS1; borrow PS3 (C2) language; differentiate on PS4 (Digital Defense).
S4  Position one layer earlier than Maven; never as competitor, always as augmenter.
S5  Keep graph-spine domain-neutral; maritime lives only in fixtures.
S6  Make refusal and review memory the structural differentiators.
S7  Use real Hormuz AIS data only if it can become deterministic fixtures fast.
S8  AIP Logic = Q&A hot fallback; fixtures + structural guard = critical path.
```

### Measures

```
M1   Demo runs end-to-end three times consecutively without breakage.
M2   Vessel dark gap + second identity are visually clear at projector resolution.
M3   Three-card hypothesis board renders.
M4   Evidence chain traces action back to raw observations in one click.
M5   Intent specialist refuses, with the firing guard layer visibly named.
M6   Review rule saves to localStorage and is inspectable.
M7   Second case recommendation changes from Escalate to Request Collection.
M8   Architecture (substrate / custody / refusal / review memory) is verbalizable in 15 seconds.
M9   1-minute demo video exists, uploaded, linked in submission.
M10  Round 2 pitch closes with named pilot ask + 90-day timeframe.
```

---

## The single sentence to drill

> **Command systems start too late. Liminal Custody protects the evidence before it becomes command — and refusal is structurally enforced, not requested.**

---

## What this artifact is, and is not

This one-pager **is** the OGSM. It **is** the pitch substrate. It **is** the artifact a Shield / IQT / DCVC principal asks for after the demo (*"send me your one-pager"*).

It **is not** a slide. The hackathon explicitly forbids presentations during judging. This document exists for the public repo, the follow-on conversations, and the artifact that outlives Sunday at 4pm. The demo is the demo; this is the strategic spine that lets the demo be read correctly.

---

## Provenance

- **Maven teardown rationale:** `docs/maven-teardown.md`
- **Engineering canon:** `docs/TECHNICAL_PLAN.md` (Shayaun's 1441-line spec)
- **Build sequencing:** `docs/v3-implementation-plan.md`, `docs/v3-sequencing-plan.md`
- **Pitch scripts:** `docs/round1-round2-script.md`
- **Q&A prep:** `docs/q-and-a.md`
- **Integration state:** `docs/integration-state.md`
