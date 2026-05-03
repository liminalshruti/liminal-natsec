# Liminal Custody

**Evidence integrity before command.** A desktop application for contested target custody.

> **Maven is the foundation. We are the substrate.**
>
> Liminal Custody maintains custody of contested targets by protecting the evidence chain before it becomes command action. Every recommendation traces back to evidence; every refusal is structurally enforced; every operator correction becomes durable doctrine.

Built for the 3rd Annual NatSec Hackathon (Cerebral Valley × Army xTech, Shack15 SF, May 2–3 2026).

> Command systems start too late. Liminal Custody protects the evidence before it becomes command — and refusal is structurally enforced, not requested.

---

**Reading this for the first time?** Pick the door:

- **Judge / mentor** — [`docs/liminal-custody-onepager.md`](docs/liminal-custody-onepager.md) (the one-pager, OGSM-embedded). Then jump to [Demo checklist](#demo-checklist) below.
- **Investor / principal** — [`docs/maven-analysis.md`](docs/maven-analysis.md) (Maven Smart System analysis and complementary positioning) and [`docs/v4-judge-calibrated-demo.md`](docs/v4-judge-calibrated-demo.md) (procurement path).
- **Reviewing the repo for safety / submission readiness** — [`docs/public-repo-notes.md`](docs/public-repo-notes.md) (real vs fixture vs not claimed) and [`docs/submission-checklist.md`](docs/submission-checklist.md) (pre-submission gate).
- **Building on it** — [`docs/integration-state.md`](docs/integration-state.md) (engineered modules → demo beats → pitch language).

---

## Submission

| | |
|---|---|
| **Primary track** | **Problem Statement 1 — Sensor Analysis & Integration.** Custody of a contested target across multiple AIS / OSINT / RF / EO sources, with the structural guard fusing modalities and refusing when the evidence chain is incomplete. |
| **Architecture narrative** | **Problem Statement 3 — Mission Command & Control.** We protect the layer *before* command — substrate / custody / refusal / review memory → commandable signals → existing C2 stack. |
| **Differentiator** | **Problem Statement 4 — Digital Defense.** The structural guard treats the evidence chain as a defensible attack surface. Refusal is server-side, not prompt-suggested. |

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
- **Refusal as an invariant.** Every AI specialist output passes through a server-side structural guard at [`server/src/specialists/guard.ts`](server/src/specialists/guard.ts). Citation minimums, evidence-type requirements, and posterior thresholds enforce refusal. AI cannot overclaim.
- **Review memory as a moat.** When an operator writes a correction, it becomes a durable rule that changes the next case. Human judgment compounds.

---

## Demo checklist

Run these in order. The make-or-break beat is **step 8** (second case changed by prior rule). The hero refusal beat is **steps 6–7** read as a causal pair: *"Intent refused **because** Signal Integrity is contested."*

1. **Start the server:** `bun run dev:server` — server up on `:8787`. `curl -s http://localhost:8787/health | jq` returns 200.
2. **Start the app:** `bun run dev:app` (browser dev) or `bun run dev:desktop` (Electron-wrapped desktop). Map shows baseline AIS tracks in the Strait of Hormuz AOI.
3. **Run the replay** — phase badge advances through baseline traffic.
4. **Trigger the dark gap** — phase badge `P2 · Dark gap alert` fires. Vessel MMSI-111 disappears; the track break is visible on the map. The second identity (MMSI-222) appears inside the Kalman-predicted ellipse.
5. **Open the custody case** — Working Panel renders the HypothesisBoard with three cards (PRIMARY / ALTERNATIVE / ALTERNATIVE) and posterior probabilities, not raw scores. `signal_integrity` row reads CONTESTED.
6. **Show the specialist refusal** as structurally enforced — `intent` row REFUSED with the **"STRUCTURAL GUARD"** tag; the dashed connector to `signal_integrity` makes the causal pair visible.
7. Open ActionOptions — recommended next step is `request second-source EO/SAR collection`, not escalation.
8. **Save the review rule:** ReviewMemory accepts the DSL — *"identity churn alone is insufficient without second-source confirmation."* Saved Rules list shows R-001 ACTIVE.
9. **Show the second case changed** by the prior rule — `[R-001]` chip appears in Zone 1; the recommendation reorders so `monitor` becomes PRIOR TOP and `request-sar-rf` is RECOMMENDED. The system learned from a human's correction.
10. Press **`Ctrl+Shift+R`** and verify reset — localStorage clears and the rule-saved → second-case beat re-arms.

The full beat-by-beat shooting script (with timing) lives at [`docs/demo-video-script.md`](docs/demo-video-script.md). The pre-submission gate lives at [`docs/submission-checklist.md`](docs/submission-checklist.md).

---

## How to run

Bun ≥ 1.1 is required for `dev:*`; tests and build run on Node ≥ 22.6.

```sh
bun install
bun run dev:server      # start the Tier B server
bun run dev:app         # OR: start the Vite app in a browser
bun run dev:desktop     # OR: start the Electron desktop app
bun run dev             # server + app together
bun run test            # full suite (tests/, server/test/, app/test/)
bun run build           # tsconfig alias contract + workspace builds
```

Node-only fallback for tests (no Bun required): `npm test` and `npm run build`.

Local configuration goes in `config.ini` (gitignored). Copy `config.example.ini` to `config.ini` and fill in real values locally. Every credential field is empty in the template; the demo runs without any of them.

---

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

---

## Foundry / AIP status

AIP Logic developer access is provisioned, and the specialist routes ([`server/src/specialists/aip.ts`](server/src/specialists/aip.ts), [`server/src/specialists/registry.ts`](server/src/specialists/registry.ts)) are wired.

**AIP is the Q&A fallback path, not the demo critical path.** The demo runs from deterministic fixtures ([`fixtures/maritime/specialist-reads.json`](fixtures/maritime/specialist-reads.json)) through the same server-side structural guard ([`server/src/specialists/guard.ts`](server/src/specialists/guard.ts)) that wraps live AIP output. A judge cannot visually distinguish demo mode from Q&A mode — the guard is the invariant. See [`docs/integration-state.md`](docs/integration-state.md) §6 for the flow.

Foundry ontology creation spec: [`foundry/seaforge-ontology-spec.md`](foundry/seaforge-ontology-spec.md). Identifier checklist: [`foundry/identifiers.md`](foundry/identifiers.md). Live RIDs and tokens are configured via the gitignored `config.ini`.

---

## Data: what's real, what's fixture

- **AIS replay tracks** ([`fixtures/maritime/tracks.geojson`](fixtures/maritime/tracks.geojson)) ship as deterministic fixtures. Live AIS feed during the timed pitch was a strategic cut.
- **Strait of Hormuz live-source intel cache** ([`fixtures/maritime/live-cache/`](fixtures/maritime/live-cache/)) was generated by [`scripts/cache-hormuz-sources.mjs`](scripts/cache-hormuz-sources.mjs) from public APIs (ACLED, GDELT, PortWatch, GFW, Exa, Sentinel Hub, Copernicus, NAVAREA, UKMTO, OpenSanctions). Cache provenance is in each file's `generated_at` field; the inventory lives at [`fixtures/maritime/live-cache/README.md`](fixtures/maritime/live-cache/README.md).
- **No live-source API keys are required to run the demo.** Auth/credential cache files (`*-auth*.json`, `*-credential*.json`, `*-api-info.json`) are gitignored and have never been tracked. Cache hygiene is enforced by [`tests/hormuz-cache-secrets.test.ts`](tests/hormuz-cache-secrets.test.ts).
- See [`docs/public-repo-notes.md`](docs/public-repo-notes.md) for the full real-vs-fixture-vs-not-claimed contract.

### AI / specialist call fallback chain

Specialist calls try live providers only before the deterministic cache/fixture path:

```text
AIP Logic → @mariozechner/pi-ai → cache → fixture
```

Enable Pi-AI locally with `PI_AI_FALLBACK_ENABLED=true`. The server uses the `openai-codex` provider by default, reads Pi auth from `~/.pi/agent/auth.json`, and can use `~/.codex/auth.json` only when `CODEX_AUTH_FALLBACK_ENABLED=true`. Live model output is still parsed into the specialist JSON contract and passed through the structural guard before the app sees it.

Smoke check after enabling the fallback:

```sh
bun run dev:server
curl -s http://localhost:8787/health | jq .aiFallback
```

---

## Stack

- **Desktop:** Electron-wrapped Vite + React + TypeScript + MapLibre GL JS
- **Server:** Bun + Hono, hosting M1–M7 engineered modules (Kalman dark-gap predictor, Bayesian fusion, structural guard, rule DSL parser, CLIP cross-modal correlation, perturbation injection, provenance with confidence flow)
- **Authoritative store:** Palantir Foundry Ontology + AIP Logic (developer access)
- **Schema:** domain-neutral [`graph-spine/`](graph-spine/) (portability) projected to maritime Ontology (authoritative)

---

## Authoritative docs

**Front of room — for judges, mentors, and follow-on conversations:**
- [`docs/liminal-custody-onepager.md`](docs/liminal-custody-onepager.md) — the one-pager. OGSM-embedded.
- [`docs/public-repo-notes.md`](docs/public-repo-notes.md) — real vs fixture vs intentionally not claimed.
- [`docs/submission-checklist.md`](docs/submission-checklist.md) — pre-submission gate (run Sunday morning).
- [`docs/maven-analysis.md`](docs/maven-analysis.md) — Maven Smart System analysis and complementary positioning.
- [`docs/reference/maven-onepager-annotated.pdf`](docs/reference/maven-onepager-annotated.pdf) — annotated Palantir/Maven booth one-pager.

**Build canon — for contributors and engineering follow-on:**
- [`docs/integration-state.md`](docs/integration-state.md) — engineered modules → demo beats → pitch language
- [`docs/TECHNICAL_PLAN.md`](docs/TECHNICAL_PLAN.md) — Shayaun's 1441-line engineering spec
- [`docs/v3-positioning-patch.md`](docs/v3-positioning-patch.md) · [`docs/v3-implementation-plan.md`](docs/v3-implementation-plan.md) · [`docs/v3-sequencing-plan.md`](docs/v3-sequencing-plan.md)
- [`docs/v4-judge-calibrated-demo.md`](docs/v4-judge-calibrated-demo.md) — operator persona, procurement path, judge-by-judge framing
- [`docs/round1-round2-script.md`](docs/round1-round2-script.md) — Maven-invisible Round 1, Maven-augmenting Round 2
- [`docs/q-and-a.md`](docs/q-and-a.md) — 30-second answers to predictable judge questions
- [`docs/demo-video-script.md`](docs/demo-video-script.md) — 60-second demo video shooting script
- [`docs/real-data-contingency.md`](docs/real-data-contingency.md) — what to do when live providers return empty
- [`docs/v2/`](docs/v2/) — locked v2 build baseline (PRD, implementation plan, sequencing plan)

---

## Team

**Shruti Rajagopal** — Founder, Liminal. Pre-decisional infrastructure for unresolved context.
**Shayaun (Sean) Nejad** — Co-founder, engineering. OffSec-certified offensive-security professional, top 100 globally on Hack The Box.

For collaboration, pilot inquiries, or follow-on conversations, see [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Never-cut invariants

These are product canon. The demo holds them as load-bearing:

- Persistent shell (desktop)
- Dark gap + two-MMSI identity churn
- Hypothesis board
- Signal Integrity row
- Specialist refusal (structurally enforced)
- Causal line: *"Intent refused because Signal Integrity contested"*
- Evidence/provenance trace
- Review rule saved
- Prior rule applied / second case changed

---

## License

See [`LICENSE`](LICENSE).
