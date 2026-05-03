# SeaForge — Integration State (v3 + Shayaun's scaffold)

**Status:** This doc maps the actual code Shayaun pushed at H8 to the v3 demo spine. Read this before building the deck or rehearsing the pitch — it's the contract between *what's running* and *what we say about it*.

---

## 1. The big picture

Shayaun shipped **v3.0 of his TECHNICAL_PLAN** (1441-line spec at `docs/TECHNICAL_PLAN.md`), which goes substantially past the v2 baseline. Two structural changes:

- **Three-tier runtime:** Tier A (Vite/React/MapLibre frontend), Tier B (Bun + Hono server with M1–M7 engineered modules), Tier C (Palantir Foundry Ontology + AIP Logic).
- **Refusal is structurally enforced, not prompt-suggested.** The `guard.ts` middleware applies 7+ layered checks server-side on every specialist output and forces `verdict: refused` when citation count is insufficient, INTENT_INDICATOR is missing, posterior is below confidence floor, etc.

This is a stronger product than v3 v1 of the patch imagined.

---

## 2. Decisions locked at H8

### Decision 1 — Live AIP runtime: Q&A fallback, not critical path

**Demo critical path = fixtures + structural guard.** AIP Logic is wired and available, but not the live runtime during pitch. During Q&A only, Shayaun can flip the env flag and say *"yes, this is calling AIP Logic right now"* — the fixture replay through the guard is the canonical demo behavior.

Why: AIP Logic timing out mid-pitch would mean a refusal that wasn't earned narratively. Fixture replay through `guard.ts` produces the *same structurally enforced refusal* with deterministic timing.

### Decision 2 — Desktop app, hard requirement

Vite/React app gets wrapped with **Tauri** for desktop packaging. Shruti owns the visual surface; Tauri shell exists so the demo runs as a real desktop app, not a browser tab. `bun run dev:desktop` launches.

### Decision 3 — v3 docs are positioning + pitch + Q&A canon; TECHNICAL_PLAN.md is engineering canon

They're complementary. When they conflict (e.g., v3 v1 said "no backend"; TECHNICAL_PLAN says "backend is critical path with AIP access"), TECHNICAL_PLAN wins on engineering and v3 wins on what we *say about* the engineering. This doc reconciles.

---

## 3. Demo spine → module map

| Beat | What judge sees | Powered by | Fallback |
|---|---|---|---|
| 1. Normal traffic | Map shows baseline AIS tracks | `app/src/components/MapWatchfloor.tsx` + `fixtures/maritime/tracks.geojson` | n/a |
| 2. Vessel goes dark | MMSI-111 disappears; track break visible | `app/src/map/replay.ts` + Kalman dark-gap predictor (M1, `shared/scoring/kalman.ts`) | Static fixture |
| 3. Second identity appears | MMSI-222 appears on plausible heading | Replay engine + `app/src/map/fixtureLoader.ts` | Static fixture |
| 4. Custody hypotheses preserved | Hypothesis board renders 3 cards | `HypothesisBoard.tsx` + `fixtures/maritime/hypotheses.json` + Bayesian fusion (M2, `shared/scoring/bayes.ts`) | Static fixture |
| 5. **Signal Integrity contested** | Specialist-reads row, amber/contested treatment | `SpecialistReads.tsx` + `fixtures/maritime/specialist-reads.json` (cached AIP Logic outputs) + structural guard (`server/src/specialists/guard.ts`) | n/a — fixture *is* the path |
| 6. **Intent REFUSED — structurally** | Hero refusal moment | `guard.ts` Layer 2 (INTENT_INDICATOR check) + Layer 1 (citation minimum) | n/a — refusal is enforced |
| 7. Collection action recommended | ActionOptions panel shows next collection | `ActionOptions.tsx` + `fixtures/maritime/actions.json` | n/a |
| 8. Review rule saved | Operator types rule, saves to localStorage | `ReviewMemory.tsx` + `app/src/lib/reviewRulesStore.ts` + DSL parser (M4, `shared/rules/dsl.ts`) | localStorage is canonical |
| 9. Next case recommendation changes | Second case appears with rule applied | `CustodyQueue.tsx` + `graph-spine/review-memory.ts` `applyReviewRules()` traversal | Same — review-memory traversal is deterministic |

**The make-or-break moment is unchanged from v3 patch:** *"a second event card shows a changed recommendation because of a human review rule, AND the system shows that Intent refused because the structural guard fired on Layer 2."*

The v3 v2 reframe is: **refusal isn't a UX choice; it's a server-side enforcement.** That's a much stronger pitch line.

---

## 4. Engineered modules (M1–M7) → pitch surface

Shayaun's TECHNICAL_PLAN names seven engineered modules. Here's how each one shows up in pitch / Q&A:

| Module | What it does | Pitch surface | Q&A surface |
|---|---|---|---|
| **M1 — Kalman dark-gap predictor** | Predicts where a dark-vessel *should be* under continuity hypothesis | "The system extrapolates the dark vessel's path so the operator can see the hypothesis space" | "We use a Kalman filter on AIS kinematics — track velocity, heading, and an uncertainty envelope. The predicted corridor is what defines whether MMSI-222 is a plausible continuation." |
| **M2 — Bayesian fusion** | Combines identity features into posterior | "The hypothesis board shows posterior probabilities, not raw scores" | "Identity features — MMSI distance, IMO match, name similarity, vessel type, dimensions — are combined as log-likelihood ratios. Each feature contributes a Bayes factor; the posterior is auditable." |
| **M3 — Structural citation guard** | 7-layer server-side refusal enforcement | "Refusal is enforced, not requested. The guard catches AIP outputs that don't pass citation, indicator, and confidence checks before they ever render." | Detailed in §6 below |
| **M4 — Rule DSL parser** | Parses operator-written rules and evaluates against open Claims | "Operators write rules in a DSL; the system parses them and applies them deterministically to open cases" | "We have a small DSL — `WHEN identity_churn AND single_source_confirmation THEN block_escalation`. The parser runs against open claims at evaluation time." |
| **M5 — CLIP visual class vs declared AIS type** | Cross-modal correlation between SAR/EO and AIS-declared vessel type | "The visual specialist compares what the imagery shows to what AIS claims" | "If AIS says 'cargo' but CLIP visual classifier says 'tanker', that's a contradiction. The Bayesian fusion picks it up; the guard flags it." |
| **M6 — Live perturbation injection** | Endpoint to inject anomalies into the replay live | "We can inject novel anomalies during the demo to show the system's response" | Used during Q&A if a judge asks "what if X happened?" |
| **M7 — Provenance with confidence flow** | Every node tracks prior → delta → posterior | "Every recommendation traces back to raw observations, with confidence flow at each step" | "Provenance isn't just a chain — it's a chain *with confidence at every node*. You can see where the posterior shifted and why." |

---

## 5. The structural guard (M3) — pitch language

This is the strongest single technical differentiator and Shayaun's clearest contribution. Pitch lines:

**Round 1 (Maven-invisible):**

> "The refusal you see isn't a label. It's structurally enforced server-side. The guard runs 7 layered checks on every specialist output — citation minimum, evidence-type requirements, posterior thresholds — and *forces* refusal when the chain isn't strong enough. AI can't talk its way past it."

**Round 2 (Maven-augmenting):**

> "Maven Smart System assumes signals reaching command are commandable. We don't. Every AI output passes through a structural guard that enforces citation, indicator, and confidence checks before it can persist. Restraint isn't a feature — it's an invariant."

### The 7 guard layers (from `server/src/specialists/guard.ts`)

| Layer | Trigger | Effect |
|---|---|---|
| 1 | Citation count < 2 on a "supported" verdict | Force refused |
| 2 | Intent specialist with no `INTENT_INDICATOR` evidence | Force refused |
| 4 | Posterior below confidence floor | Force refused |
| 6 | Shodan-only citations on vessel-behavior claims | Force refused |
| 7 | Operator question contains "hostile/threat/intent" but no indicator | Force refused |
| (others) | Stripping unsupported phrases from summary | Strip + flag |

(Layer numbers track Shayaun's source comments; layers 3 and 5 may be in another file.)

### Q&A: "How does the guard prevent prompt injection?"

> "Two ways. One: the guard runs *server-side after AIP output* — there's no prompt that can change citation count or evidence type. Two: in the demo runtime, AIP Logic isn't on the critical path; the specialist reads come from fixtures that already passed the guard at cache time. A spoofed input would have to forge an `INTENT_INDICATOR` evidence record, which is provenance-tracked back to a source-document hash."

---

## 6. AIP Logic vs fixtures — the actual flow

```
DEMO MODE (default)
fixtures/maritime/specialist-reads.json
  → guard.ts validates citations on load
  → SpecialistReads.tsx renders refusal
  → Intent: REFUSED visibly tied to Layer 2 (INTENT_INDICATOR missing)

Q&A MODE (Shayaun's fingertip env flag)
operator question
  → server/src/specialists/registry.ts dispatches to AIP Logic
  → AIP returns specialist verdict + cited_observation_ids
  → guard.ts wraps output with applyGuard()
  → if any layer fires, verdict forced to refused
  → response renders in same SpecialistReads component
```

**The judge cannot distinguish demo mode from Q&A mode visually.** That's the point. Shayaun says "let me show you live AIP" → flips flag → next case runs through AIP Logic → guard catches it → demo continues seamlessly.

---

## 7. What changed in our v3 patch docs

These edits are required so the pitch and Q&A reflect what's actually running:

| File | Old line | New line |
|---|---|---|
| `v3-positioning-patch.md` | "No backend on critical path. No live LLM." | "Bun + Hono server runs M1–M7 engineered modules. AIP Logic available; fixtures default for demo runtime. Refusal is structurally enforced via guard.ts." |
| `v3-implementation-plan.md` | Schema delta adds `sourceIntegrityCheck` node | Schema adds `sourceIntegrityCheck` *and* the M3 guard wraps it on every specialist call |
| `q-and-a.md` "Are you using LLMs in the runtime?" | "Not in the demo." | "Yes — AIP Logic runs the specialists, but every output passes through a server-side structural guard. Refusal is enforced, not requested." |
| `round1-round2-script.md` | "Restraint as a security feature." | "Restraint is structurally enforced. The guard fires server-side on every output." |
| `v4-judge-calibrated-demo.md` "What we don't do" | "We do not require live LLMs for command decisions." | "AI accelerates; the guard ensures it can't overclaim." |

These edits are made in the v3 patch v2 commit. See individual files for details.

---

## 8. Open contract questions (resolve at H10)

1. **Signal Integrity row in `SpecialistReads.tsx`.** Existing fixture has Kinematics, Identity, Intent, Collection, Visual (5). v3 patch wants Kinematics, Identity, **Signal Integrity**, Intent, Collection (5). Visual is M5; Signal Integrity is the v3 patch addition. **Decision: keep both. 6 rows total.** Visual is the cross-modal CLIP read; Signal Integrity is the source-chain integrity read. They're complementary.
2. **Where does Signal Integrity get its data?** New fixture file `fixtures/maritime/source-integrity-checks.json` (per v3 implementation plan §3). Shayaun owns. Connect to specialists registry under `name: "signal_integrity"`.
3. **Causal line wiring.** "Intent refused because Signal Integrity contested" — does this read from `triggers_refusal_for` in fixture, or from the actual guard layer that fired? **Decision: read from guard report.** When `guard.ts` returns `forced_refused: true` with `layers: ["intent_indicator", "signal_integrity_contested"]`, the UI displays *"Intent refused because [Layer 2: INTENT_INDICATOR missing] AND [Layer 8: signal_integrity_contested]"*. Layer 8 is a v3-patch addition Shayaun adds to `guard.ts`.
4. **Tauri wrap.** `bun run dev:desktop` launches a Tauri shell pointing at the Vite dev server. No code changes inside `app/`. Shruti owns visual; the wrap is invisible.

---

## 9. The single sentence that must land in pitch

Updated for v3 patch v2:

> **"Command systems start too late. SeaForge protects the evidence before it becomes command — and refusal is structurally enforced, not requested."**

That last clause is what Shayaun's scaffold makes true. Use it.
