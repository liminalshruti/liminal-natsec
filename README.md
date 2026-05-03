# Liminal Custody

**Evidence integrity before command.** A desktop application for contested target custody.

Liminal Custody maintains custody of contested targets by protecting the evidence chain before it becomes command action. Built for the 3rd Annual NatSec Hackathon (Cerebral Valley × Army xTech, May 2–3 2026).

> Command systems start too late. Liminal Custody protects the evidence before it becomes command — and refusal is structurally enforced, not requested.

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
2. Start the desktop app: `bun run dev:desktop`
3. Run the replay
4. Trigger the dark gap
5. Open the custody case
6. Show the structurally enforced specialist refusal
7. Save the review rule
8. Show the second case changed by the prior rule
9. Press `Ctrl+Shift+R` and verify reset

## Authoritative docs

**Start here if you're a judge or a follow-on conversation:**
- `docs/liminal-custody-onepager.md` — the one-pager. OGSM-embedded. Read this first.
- `docs/maven-teardown.md` — Maven Smart System reverse-engineering + framework upgrade rationale
- `docs/reference/maven-onepager-annotated.pdf` — annotated Palantir/Maven booth one-pager (the artifact this product structurally answers)

**If you're contributing to the build:**
- `docs/integration-state.md` — engineered modules → demo beats → pitch language
- `docs/v2/` — locked build baseline (PRD, implementation plan, sequencing plan)
- `docs/TECHNICAL_PLAN.md` — engineering canon
- `docs/v3-positioning-patch.md` — track decision, Maven posture, schema delta
- `docs/v4-judge-calibrated-demo.md` — operator persona, procurement path, judge-by-judge
- `docs/round1-round2-script.md` — branched pitch scripts (Maven-invisible Round 1, Maven-augmenting Round 2)
- `docs/q-and-a.md` — 30-second answers to predictable judge questions
- `docs/shayaun-handoff.md` — co-founder handoff brief

## Team

**Shruti Rajagopal** — Founder, Liminal. Pre-decisional infrastructure for unresolved context.
**Shayaun (Sean) Nejad** — Co-founder, engineering. OffSec-certified, top 100 globally on Hack The Box. Signal-chain compromise and offensive security.

## Never-cut invariants

- Persistent desktop shell
- Dark gap + two-MMSI identity churn
- Hypothesis board
- Signal Integrity row
- Specialist refusal (structurally enforced)
- Causal line: "Intent refused because the guard fired"
- Evidence / provenance trace
- Review rule saved
- Prior rule applied / second case changed

## License

See `LICENSE`.
