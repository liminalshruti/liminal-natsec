# Liminal Custody

**Evidence integrity before command.** A desktop application for contested target custody.

> **Maven is the foundation. We are the substrate.**
>
> Liminal Custody maintains custody of contested targets by protecting the evidence chain before it becomes command action. Every recommendation traces back to evidence; every refusal is structurally enforced; every operator correction becomes durable doctrine.

Built for the 3rd Annual NatSec Hackathon (Cerebral Valley × Army xTech, May 2–3 2026).

> Command systems start too late. Liminal Custody protects the evidence before it becomes command — and refusal is structurally enforced, not requested.

---

**Judge or investor reading this for the first time?** → [`docs/liminal-custody-onepager.md`](docs/liminal-custody-onepager.md) — the one-pager. OGSM-embedded.

**Looking at the analytical foundation?** → [`docs/maven-analysis.md`](docs/maven-analysis.md) — Maven Smart System analysis and complementary positioning.

---

## What this is

A persistent desktop application with one workflow:

```
Substrate / Signal Sources → Stage Viewport → Working Panel → Command Line
```

The demo: a maritime watch officer at U.S. 5th Fleet, 0200 local, monitoring AIS disruptions near a strategic chokepoint in the Strait of Hormuz. A vessel goes dark. A different identity appears nearby. Liminal Custody preserves competing custody hypotheses, enforces refusal when the evidence chain is contested, and lets a human review rule change the next recommendation.

## How it's different

Most command-and-control systems start *after* signals reach command. They assume the signal is already coherent enough to act on. Liminal Custody starts one layer earlier.

- **Custody before conclusion.** The system preserves competing hypotheses instead of declaring intent.
- **Refusal as an invariant.** Every AI specialist output passes through a server-side structural guard. Citation minimums, evidence-type requirements, and posterior thresholds enforce refusal. AI cannot overclaim.
- **Review memory as a moat.** When an operator writes a correction, it becomes a durable rule that changes the next case. Human judgment compounds.

## Architecture

```
                        SUBSTRATE / X
              raw multi-domain observations
              messy, partial, contradictory

                              ↓

                   EVIDENCE CUSTODY LOOP   ← Liminal Custody
                       custody hypotheses
                       source integrity check
                       structural refusal (server-side guard)
                       provenance trace
                       review memory

                              ↓

                       COMMAND / CONTROL   ← Maven, CJADC2, existing stack
                       human chooses next action

                              ↓

                       REVIEW MEMORY / Y
                       rule saved, future case changed,
                       durable operating doctrine
```

We slot between substrate and command. We do not replace Maven. We protect the layer beneath it.

## Submission

- **Primary track:** Problem Statement 1 — Sensor Analysis & Integration
- **Architecture narrative:** Problem Statement 3 — Mission Command & Control
- **Digital defense layer:** Problem Statement 4 — Signal-chain integrity

## Stack

- **Desktop:** Electron-wrapped Vite + React + TypeScript + MapLibre GL JS
- **Server:** Bun + Hono, hosting M1–M7 engineered modules (Kalman dark-gap predictor, Bayesian fusion, structural guard, rule DSL parser, CLIP cross-modal correlation, perturbation injection, provenance with confidence flow)
- **Authoritative store:** Palantir Foundry Ontology + AIP Logic (developer access)
- **Schema:** domain-neutral `graph-spine/` (portability) projected to maritime Ontology (authoritative)

## Local commands

```sh
bun install
bun run test
bun run dev:server      # start the server
bun run dev:app         # start the Vite app (browser dev)
bun run dev:desktop     # start the Electron desktop app
bun run dev             # server + app together
bun run build
```

Node fallback for tests: `npm test`.

## Demo checklist

1. Start the server: `bun run dev:server`
2. Start the app: `bun run dev:app` or start the desktop app: `bun run dev:desktop`
3. Run the replay
4. Trigger the dark gap
5. Open the custody case
6. Show the specialist refusal as structurally enforced
7. Save the review rule
8. Show the second case changed by the prior rule
9. Press `Ctrl+Shift+R` and verify reset

## Authoritative docs

**Start here if you're a judge or a follow-on conversation:**
- `docs/liminal-custody-onepager.md` — the one-pager. OGSM-embedded. Read this first.
- `docs/maven-analysis.md` — Maven Smart System analysis and complementary positioning
- `docs/reference/maven-onepager-annotated.pdf` — annotated Palantir/Maven booth one-pager (the artifact this product structurally answers)

**If you're contributing to the build:**
- `docs/integration-state.md` — engineered modules → demo beats → pitch language
- `foundry/seaforge-ontology-spec.md` — Palantir Foundry ontology creation spec
- `docs/v2/` — locked build baseline (PRD, implementation plan, sequencing plan)
- `docs/TECHNICAL_PLAN.md` — engineering canon
- `docs/v3-positioning-patch.md` — track decision, Maven posture, schema delta
- `docs/v4-judge-calibrated-demo.md` — operator persona, procurement path, judge-by-judge
- `docs/round1-round2-script.md` — branched pitch scripts (Maven-invisible Round 1, Maven-augmenting Round 2)
- `docs/q-and-a.md` — 30-second answers to predictable judge questions

## Team

**Shruti Rajagopal** — Founder, Liminal. Pre-decisional infrastructure for unresolved context.
**Shayaun (Sean) Nejad** — Co-founder, engineering. OffSec-certified offensive-security professional, top 100 globally on Hack The Box.

## Never-cut invariants

- Persistent shell (desktop)
- Dark gap + two-MMSI identity churn
- Hypothesis board
- Signal Integrity row
- Specialist refusal (structurally enforced)
- Causal line: "Intent refused because the guard fired"
- Evidence/provenance trace
- Review rule saved
- Prior rule applied / second case changed

## License

See `LICENSE`.
