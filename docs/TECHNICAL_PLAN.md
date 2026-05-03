# Liminal Custody — Technical Plan

Engineering design for **Liminal Custody** (renamed from SeaForge at H8). Companion to:

- `docs/v2/SeaForge_PRD_v2.md` (product, locked baseline — original SeaForge naming preserved as historical canon)
- `docs/v2/SeaForge_Implementation_Plan_v2.md` (build sequencing)
- `docs/v2/SeaForge_Sequencing_Plan_v2.md` (phase gates)
- `docs/v3-positioning-patch.md` (track + Maven posture + schema delta)
- `docs/v3-implementation-plan.md` (what changes vs v2 in code terms)
- `docs/v3-sequencing-plan.md` (phase gates with Signal Integrity inserted)
- `docs/v4-judge-calibrated-demo.md` (named persona, procurement path, judge-by-judge)
- `docs/integration-state.md` (M1–M7 → demo-spine → pitch-language map)
- `docs/liminal-custody-onepager.md` (front-of-room + OGSM)
- `docs/maven-analysis.md` (complementary positioning rationale)

This document is the **engineering** layer — the algorithmic modules that make claims defensible, the data plane that backs them, the Ontology that exposes them, and the AI/human/deterministic split that keeps the system bounded. §1–14 below are unchanged from v3.0 and remain canonical for engineering. The v3.1 patch (§0.1) captures what shipped between H8 and H22 without rewriting the engineering core.

| Field | Value |
|---|---|
| Version | 3.1 — H8 build state reconciled into demo-runnable form |
| Status | Build running, verified on stage equivalent (localhost:5173 + :8787) |
| Last updated | 2026-05-03 (H22) |
| Primary problem statement | PS1 — Sensor Analysis & Integration |
| Secondary | PS3 — Mission Command & Control (architecture narrative) |
| Differentiator | PS4 — Digital Defense (Shayaun's structural guard + Signal Integrity layer) |
| Authoritative store | Palantir Foundry Ontology (developer AIP access confirmed) |
| Engineered runtime | Bun + Hono server hosting M1–M7 (live on :8787) |
| Frontend | Electron-wrapped Vite + React + MapLibre desktop application (v3.1 — Electron wrap added) |
| Demo runtime | **Fixtures + structural guard.** AIP Logic = Q&A hot fallback only (env-flag swap) |
| Schema portability | Domain-neutral `graph-spine/` schema projected 1:1 into Foundry Ontology |
| Make-or-break beat | Save R-001 → second-case recommendation changes + Intent refused with structural guard layer named |

---

## 0.1 What changed in v3.1 (post-H8 reconciliation)

v3.0 was build-ready at H8 (May 2 ~6pm). v3.1 captures what shipped between H8 and H22 — the production-runnable state, the rename, the demo-criticality calibration, and the operating norms locked tonight. **No engineering substance changes from v3.0.** v3.1 is a metadata + workflow patch.

### Naming reconciliation

The product is renamed from **SeaForge** to **Liminal Custody** across every public surface (README, one-pager, Q&A, demo scripts, app topbar, browser/Electron window title, fallback captions). Internal identifiers preserved: `seaforge:review-rules:v1` localStorage key, `seaforge-watchfloor` map style internal id. The v2 baseline files retain `SeaForge_*_v2.md` filenames as historical canon.

### Demo runtime decision (hardened)

v3.0 said *"Backend on critical path. AIP Logic is the canonical specialist runtime."* v3.1 hardens the demo-time runtime:

```
Demo critical path = fixtures + structural guard (server/src/specialists/guard.ts)
AIP Logic         = Q&A hot fallback only, env-flag swap during Q&A
```

The structural guard's 7+ layered server-side checks (citation minimum, INTENT_INDICATOR requirement, posterior threshold, Shodan-only restriction, intent-question phrasing) run identically on cached fixture outputs and live AIP outputs. The judge cannot distinguish demo mode from Q&A mode visually. This means a network failure mid-pitch leaves the refusal moment intact — the structural-guard invariant is the demo's most important architectural claim and it must not be flaky.

The Foundry/AIP NOT_CONFIGURED state at startup is intentional. Setting `FOUNDRY_BASE_URL` + `FOUNDRY_TOKEN` + `AIP_LOGIC_BASE_URL` + `AIP_LOGIC_TOKEN` enables the live AIP path for Q&A only.

### Frontend wrap (Electron)

v3.0 frontend was Vite + React + MapLibre (browser dev only). v3.1 adds the Electron wrap (`electron/main.cjs`, `electron/preload.cjs`, `electron/start-desktop.mjs`). `bun run dev:desktop` boots Vite + Electron together. Demo runs as a real desktop application, matching the hard requirement that this is positioned as a desktop product, not a web app. Browser path (`bun run dev:app` → http://localhost:5173) preserved for development.

### Schema delta — `sourceIntegrityCheck` node + `caseIdFromAlertId` resolution

The v3 positioning patch added `sourceIntegrityCheck` as an 11th node type for the Signal Integrity specialist read. v3.1 confirms it landed in `graph-spine/schema.ts`. Specialist Reads UI grew to 6 rows (Kinematics, Identity, **Signal Integrity**, Intent, Collection, Visual) — Signal Integrity sits between Identity and Intent and is causally linked to Intent's refusal via the connector pattern in the strip. v3.2 §0.2 documents the full IA and the B-now / C-roadmap evolution path for Signal Integrity.

**Bug fix shipped (PR #6):** `caseIdFromAlertId(alertId)` was returning `null` for server-emitted anomaly ids because of an `_` vs `-` drift between server format (`anom:identity_churn:trk-caldera:...`) and fixture spine format (`anom:identity-churn:trk-caldera:...`). Three-pass resolution now: exact match → normalized (`_`→`-`) match → regex fallback on `event-1`/`event-2`. Without this fix, the entire H8 gate was empty: hypothesis board, evidence drawer, provenance trace, action options, specialist reads, and review memory all defaulted to empty when an alert was selected. With the fix, the make-or-break beat path (beats 4–8 of the SpeedRun) renders end-to-end.

### Doc surface split (PR #3)

Public-facing surface (`docs/*.md` excluding `docs/internal/`) is calibrated for cold readers — analytical and complementary, not adversarial. Internal-coordination context (Iran-attribution, Shayaun handoff coordination, full v3 patches with internal-strategy framing) lives in `docs/internal/*-INTERNAL.md` and is gitignored. Same insights, different framing — see `docs/maven-analysis.md` for the public version of what was originally a teardown.

### Operating norms locked tonight

Two rules govern the next ~14 hours:

1. **H25 freeze rule for demo-critical files.** After H25 (May 3 ~6am), no commits touch:
   - `server/src/specialists/guard.ts` (the structural guard — refusal invariant)
   - `app/src/components/HypothesisBoard.tsx` (hypothesis preservation)
   - `app/src/components/RefusalCard.tsx` (Intent: REFUSED hero moment)
   - `app/src/components/ReviewMemory.tsx` (review-rule save + apply)
   - `app/src/components/CaseHandoffBanner.tsx` (second-case-changed beat)
   - `app/src/components/MapWatchfloor.tsx` (dark-gap visual + Track B emergence)

   Polish on non-demo-critical components (typography, spacing, copy) remains allowed post-H25. The failure mode this prevents is *"found a real bug at H22 and now I'm shipping a 3am fix into the demo path"* — late-night surgery on make-or-break beats is the actual risk, not polish creep.

2. **Transition rehearsal rule.** Rehearse transitions, not the script. Beat 6→7 (refusal → save rule) and Beat 7→8 (rule saved → second-case-changed) are the only beats where a 200ms UI lag breaks the pitch. 10 reps each on those two transitions; the other 8 beats can stutter.

### Engineering status verified at H22

| Component | State |
|---|---|
| Topbar reads "LIMINAL CUSTODY · WATCHFLOOR" | ✅ verified |
| Substrate panel populated, alerts selectable | ✅ verified |
| Working panel populates on alert click (H8 gate) | ✅ verified — PR #6 |
| Hypothesis Board: PRIMARY 70% / ALT 18% / ALT 9% | ✅ verified |
| Provenance Trace: action → claim → hypothesis → anomaly → observation | ✅ verified |
| Evidence Drawer: SUPPORTS row visible | ✅ verified |
| Map: predicted ellipse, hero track with directional ping | ✅ verified |
| Phase pill: P6 · REVIEW MEMORY with EVENT 1 indicator | ✅ verified |
| Scrubber: phase markers across timeline | ✅ verified |
| Command line: slash-commands listed | ✅ verified |
| Specialist Reads: Intent REFUSED + STRUCTURAL GUARD tag | 🟡 RefusalCard polished (PR pending merge); full visual verification pending |
| Action Options: ranked recommendation visible | 🟡 walkthrough verification pending |
| Review Memory: save R-001 → event-2 recommendation changes | 🟡 walkthrough verification pending |
| Reset (Ctrl+Shift+R) | 🟡 walkthrough verification pending |
| Tagline / brand bar | 🟡 walkthrough verification pending |

---

## 0.2 Information Architecture — Working Panel zones (v3.2)

The Working Panel is not a dashboard, not an inspector, not a form. It is a **custody artifact under live evaluation**. Custody artifact = the evidence chain for one contested target, with epistemic state (claim, posterior, hypotheses, evidence) and procedural state (action, refusal, applied rule). Live evaluation = the operator is reading it under time pressure to make a recommendation, while the underlying state is still moving.

The closest design precedents are operator surfaces (court case file, medical chart for a coding patient, reactor panel during a transient, ATC strip) — not SaaS surfaces. The grammar of those surfaces is *pinned-decision-with-scrolling-history*, not *equal-weight-grid*.

### Three personas, three reading orders

| Persona | Job | Reading order | Time budget |
|---|---|---|---|
| **P1 — Watch officer (named ICP)** | Decide escalate / monitor / request collection | Verb → posture → receipt-on-disagreement | ~30s normal, ~2 min in argument mode |
| **P2 — Procurement reader (buyer)** | Evaluate as governance artifact: refusable, auditable, defensible | Refusal → enforcement mechanism → audit trail → operator correction | Long-form, ~1hr per screenshot |
| **P3 — Hackathon judge** | Decide if defense-grade vs demo-grade | Operator literacy in 5s → make-or-break beat in 75s → differentiator | 5s first impression, 75s for the beat |

### Lexicon (canonical for Liminal Custody and downstream Liminal products)

- **Operative receipt** — Zone 1 + Zone 2 of the working panel. Decision-time density. Pinned. Reader: P1, P3.
- **Forensic receipt** — Zone 3 (case file). Document-density. Scrolls with dragon-fold sticky section headers. Reader: P2, P1-in-argument-mode, P3-in-Q&A.
- **Verb-with-posture** — Zone 1's two-line dual-state pattern. Verb first ("RECOMMEND monitor"), posture second ("WHILE custody contested"). Constraint annotation register, not hedging register.
- **Specialist-reads-as-strip** — Zone 2's right column: 6 specialist reads in canonical order, glanceable, with a causal connector from `signal_integrity` (when refused) to `intent`. CSS-only subordination at v3.2; v3.3 promotes to schema-level.
- **Dragon-fold** — Zone 3's case file pattern. Five section headers (Exec Summary / Provenance / Evidence / Action Options / Review Memory) are sticky; bodies render below their headers and scroll. The forensic surface advertises its own architecture without forcing readers to discover it.
- **Operative state is now; forensic state is history.** The interaction matches the reader.

### Layout invariants

```
.app-shell — three columns
  substrate (320px)  |  stage (1fr)  |  working (540px)

.panel--working — two regions vertically
  .working__operative  — flex: 0 0 auto; pinned; ~360-420px height
    .zone1            — verb + posture + (optional) hero banner
    .kv               — case + claim + posterior key-values
    .zone2            — two-column grid: hypotheses | specialist reads
  .working__forensic   — flex: 1 1 auto; overflow-y: auto; scroll region
    .case-file
      .case-file__section × 5  — sticky headers, scrolling bodies
```

**Minimum viewport:** 800px height. Below this, `.working__forensic` collapses to a one-line affordance and the operative surface takes the full panel. Demo machine target: 900px+.

**Scroll position state:** resets to top of forensic region when the selected case changes (case 2 is a different document than case 1).

### The Round 1 / 2 / 3 IA forks (resolved)

| Fork | Resolution | Rationale |
|---|---|---|
| R1 — Zone 1 line 1 | (iii) Verb + posture stack | Operator C2 grammar; verb-first instinct preserved, hedging visible as a register-shift |
| R1 — Surface navigation | Both keystroke + visible link | Honor different reading orders |
| R1 — Case file spatial | Below working panel split | Forensic surface anchored to operative, never disconnected |
| R1 — Zone 2 grid | Two-column interleaved | Causal flow visible (specialist reads contribute → hypothesis posteriors) |
| R2 — Panel width | 380px → 540px | Stage absorbs the 160px difference; map recenters on hero track |
| R2 — Case file default | Open by default during demo | Judges see whole architecture at once |
| R2 — Rule-fire moment | Full-width hero banner above Zone 1 | Visible to back-of-room judges |
| R2 — Case file vocabulary | Hybrid: same chrome, document layout | Brand-cohesive, document-shaped |
| R3 — Vertical-budget conflict | Pinned operative + scrolling forensic | Operator-grade C2 pattern; operative-state is *now*, forensic-state is *history* |
| R3 — Empty state | (iii) Default-load case 1 | First frame matters more than production purity |
| R3 — Rule-fire timing | (ii) Staged crossfade | 100ms hold → posture 200ms → verb 200ms (offset 100ms) → R-001 chip 200ms (offset 100ms) ≈ 500ms total |
| R3 — Case file scroll affordance | (iii) Dragon-fold sticky headers | Forensic surface advertises its own architecture |
| R3 — Signal Integrity | (ii) Subordinated to Intent | Causal connector visible in strip; schema-level subordination is v3.3 |

### Signal Integrity — B-now, C-roadmap

The v3.0 schema canon shipped with five specialists (`kinematics, identity, intent, collection, visual`). The v3 positioning patch named six (adding `signal_integrity`). At v3.2, we resolved the divergence by **shipping B**: `signal_integrity` is added to the `SpecialistName` enum as a sixth specialist, with a stub specialist that emits a deterministic CONTESTED verdict for the dark-gap + identity-churn case.

The stub's `summary` field is **authored as the C-narrative** so the row carries both densities at once:

> *"Source chain contested. Identity flags MMSI metadata mismatch. Visual flags AIS-class mismatch. Kinematic continuity within plausible spoofing envelope. Three independent specialists converge on source-chain compromise."*

A judge reading the row in 5 seconds sees the B claim ("Signal Integrity: REFUSED"). A judge expanding the row to read its summary sees the C narrative (multi-specialist convergence). The artifact carries both — operative-density on the surface, procurement-density in the field.

**v3.3 evolution to C:** the Signal Integrity row becomes a *convergence aggregator* over Identity-discontinuity + Visual-class-mismatch + Kinematic-spoofing-envelope. The row stays the same in the UI (legibility primitive); the architecture below it becomes "three independent specialists, structurally validated, converging on a source-chain verdict." Defense in depth — an attacker must spoof three independent reads, not one.

The B→C path is documented here so future-Shayaun and future-Shruti know the row is a *deliberate sequencing*, not an architectural accident. The technical plan is the receipt.

### v3.3 deferred items (not blocking demo)

- **Forensic case file as formatted intelligence product** — render the case file with the structure of a watchfloor brief (header / exec summary / hypotheses with confidence levels / evidence inventory / refusals with structural justification / review-rule history). Currently scaffolded with placeholders; v3.3 promotes to full document layout.
- **Signal Integrity convergence aggregator** — schema-level subordination of Identity + Visual + Kinematics under signal_integrity. CSS-only at v3.2.
- **Operative surface as graph** — current rendering is document-grade. The product is structurally a graph (hypotheses with weighted contributions from refusable specialist reads). v3.3 may explore graph-rendering for the operative surface as an alternative density.
- **Round 2 verb-posture register** — current treatment is (iii-a) constraint-annotation register. v3.3 promotes to (iii-b) posture-forward register for stage demos with longer dwell time.

---

### PR landing log (May 2 → May 3)

| PR | Subject | Merged |
|---|---|---|
| #1 | Rename SeaForge → Liminal Custody; add one-pager + Maven analysis | ✅ |
| #2 | README surgical edits (Maven contrast, architecture diagram, judge entry point) | ✅ |
| #3 | Public/internal split + frame calibration | ✅ |
| #4 | SPEEDRUN_CUT.md surgical rename pass | ✅ |
| #5 | Topbar/title brand: SeaForge → Liminal Custody | ✅ |
| #6 | Fix caseIdFromAlertId underscore→hyphen drift (H8 gate) | ✅ |

Open at H22: `shruti/visual-polish-specialist-reads` (RefusalCard polish, local commit `60f5bee` not yet pushed).

---

## 0. What changed in v3

v3 reconciles the May 1 whiteboard pivot (captured in `SeaForge_PRD_v2`, `SeaForge_Implementation_Plan_v2`, `SeaForge_Sequencing_Plan_v2`) with the engineered modules in v2.0 of this document. Net result: every M1–M7 module survives, Palantir + AIP move to first-class, and the v2 PRD's persistent-shell + domain-neutral spine product surface becomes canonical.

| Concern | v2.0 of this doc | v3.0 (this doc) |
|---|---|---|
| Product shape | Implicit screens | v2 PRD persistent shell — Substrate / Stage Viewport / Working Panel / Command Line, six states |
| Authoritative store | Foundry Ontology | **Foundry Ontology (unchanged, reinforced — AIP developer access confirmed)** |
| Backend on critical path | Yes (Bun + Hono) | **Yes** — overrides v2 PRD §12 "No backend on critical path." That line assumed no AIP access; we have it |
| Specialists | Anthropic/Codex via shared interface | **AIP Logic functions** are the canonical specialist runtime; Anthropic/Codex are fallbacks behind the same `Specialist` interface. M3 structural guard wraps both |
| Graph model | Maritime nouns hard-coded into Ontology | Two-layer: **domain-neutral spine schema** in `graph-spine/` (portability) → **maritime Ontology projection** in Foundry (authoritative) |
| M1–M7 modules | All present | **All present, unchanged in substance.** Tier tags added so it's clear what runs where |
| Fixtures | "Stub" / "fallback" tone | First-class for offline rehearsal and judging-network-failure; never authoritative |
| File layout | `server/` + `web/` + `foundry/` | `app/` (v2 shell) + `server/` (Tier B) + `graph-spine/` (schema) + `fixtures/maritime/` + `foundry/` + `shared/` |
| Owner lanes | Implicit | Per Impl Plan v2 §6 — Shayaun: map/tracks/replay/fallback recording; Shruti: spine + cases + fixtures + AIP wiring |

The portability beat from v2 PRD ("the primitive is not maritime — it is evidence custody under ambiguity") is preserved by the domain-neutral spine. The Ontology in Foundry is one *projection* of that spine, the only authoritative one for this build.

---

## 1. How to read this document

Three sibling docs describe the product:

- **`SeaForge_PRD_v2 (1).md`** — product surface, shell regions, six states, scenario beats, success criteria. Canonical for what the judge sees.
- **`SeaForge_Implementation_Plan_v2.md`** — file structure, component model, owner lanes, hour-by-hour gates.
- **`SeaForge_Sequencing_Plan_v2.md`** — phase gates and the "one thing to protect" make-or-break moment.

This document is the engineering layer beneath them. Where the v2 PRD says *"no backend on critical path"* (§12), v3 overrides that line because the team has developer AIP access — the engineered tier and Palantir AIP are on the critical path. Everywhere else, the v2 PRD is canonical for product shape and this document is canonical for what's running underneath.

The PRD/TDD's original technical core is thin: a hand-tuned weighted-sum custody score, IF-THEN anomaly thresholds, a hardcoded `Intent: REFUSED` label, and "static JSON swap on save" for the rule-applied beat. A probing judge surfaces this in one question. This plan replaces those scripted internals with engineered ones, leaving the product story intact.

| Scripted in original PRD/TDD | Engineered here |
|---|---|
| `0.30·kinematics + 0.20·heading + …` weighted sum | Kalman dark-gap predictor + Bayesian fusion of identity features (M1, M2) |
| Hardcoded `Intent: REFUSED` label | AIP Logic specialist + M3 structural citation guard (server-side enforcement, runs on AIP output and on fixture cards alike) |
| "Static JSON swap" for rule-applied beat | Parsed rule DSL evaluated at runtime against open Claims (M4) |
| Two-MMSI scripted scenario only | Live perturbation injection endpoint (M6) |
| Single-modality AIS + Danti stub | One real cross-modal correlation: CLIP visual class vs declared AIS type (M5) |
| Generic "trace back" | Provenance with confidence flow — prior → delta → posterior at every node (M7) |

---

## 2. Architectural thesis

SeaForge is a **Palantir-native custody graph over versioned evidence, rendered through a persistent Liminal-grade shell**. Foundry datasets and streams own raw and curated data because they give schema, versioning, lineage, permissioning, and low-latency ingestion that judges can inspect rather than trust. The Ontology is the operational graph — `Vessel`, `Track`, `Observation`, `Anomaly`, `Claim`, `EvidenceItem`, `CollectionAction`, `OperatorDecision`, `ReviewRule` — not because Palantir is a constraint, but because Object/link types give a judge-visible operational model and Actions/Functions give governed writeback for human decisions and rule memory.

The schema underneath the Ontology is intentionally **domain-neutral**: nodes are `observation`, `entity`, `track`, `anomaly`, `hypothesis`, `claim`, `evidence`, `actionOption`, `reviewRule`, `case`. A maritime adapter projects them into the maritime Ontology object types. This preserves the v2 PRD portability beat — the same spine could project into a different domain (cybersecurity, founder ops, etc.) without re-architecting.

The technical differentiator is not "AI detects bad ships." It is that **every AI statement is tied to raw AIS rows, Danti/OSINT evidence, deterministic scoring, linked Ontology objects, model metadata, and an operator decision trail**. AIP Logic summarizes, compares hypotheses, explains provenance, and recommends collection options — but every AIP output passes through M3's structural citation guard before persistence. Deterministic code (Bun + Hono, Tier B) handles AIS parsing, Kalman prediction, Bayesian fusion, identity-churn detection, replay, rule application, and provenance traversal. AIP refusals are structurally enforced (citation count + evidence-type checks), not prompt-suggested.

The system is defensible because it preserves ambiguity: it emits competing custody hypotheses, refuses unsupported claims, records why an operator accepted/rejected/modified a recommendation, and lets a probing judge dictate a new rule on stage. The persistent shell keeps the operator's working state — substrate, stage, case, command line — visible at all times.

---

## 3. Researched facts vs assumptions

**Facts (Palantir docs):** Foundry datasets are the landing/transformation primitive with permissions, schema management, version control, and updates over time. Foundry streams combine a streaming dataset for cold storage with a hot buffer for low-latency workflows. The Ontology maps datasets into object types, properties, links, actions, and functions. Actions are controlled writeback definitions. Functions can read/traverse Ontology objects and edit through Actions. AIP Logic and AIP Chatbots can use Ontology context, functions, tools, and Actions.

**Confirmed for this build:** Developer AIP access. AIP Logic functions can be authored and called from external clients. Treat this as load-bearing.

**Assumptions to validate with Palantir mentors on Day 1:** that hackathon enrollment allows creating datasets, streaming datasets, Ontology object/link/action types, Functions, and AIP Logic/Chatbot workflows; that Danti access exposes either an API, export, or copyable result format; that any "CASK / hardware / edge" feed can emit JSON, CSV, MQTT, HTTP, or another bridgeable event stream. The CASK portion is modeled as a generic Palantir edge/sensor integration — public CASK schema docs are not available.

---

## 4. Stack decision

**Frontend (Tier A):** TypeScript on Vite + React + MapLibre GL JS. Persistent app shell per v2 PRD §4. Reads Ontology via OSDK; localStorage for ephemeral UI state only. Never authoritative.

**Engineered runtime (Tier B):** TypeScript on Bun + Hono. Hosts M1–M7 modules in pure-TS so the same code can run server-side or (for M1, M2, M4, M7) inside a browser worker if Tier B is unreachable.

**Authoritative store (Tier C):** Palantir Foundry Ontology, accessed via OSDK. AIP Logic functions are the specialist runtime. AIP Chatbot Studio is the optional operator Q&A surface. Foundry datasets/streams own raw + curated truth. Local SQLite mirror behind an `OperationalStore` interface exists only as a network-failure fallback.

**LLM:** AIP Logic primary; Anthropic SDK and OpenAI Codex behind the same `Specialist` interface as fallback runtimes. M3 structural guard wraps all three identically.

**Math runtime:** server-side (Tier B) for canonical scoring. Browser-safe versions of M1, M2, M4, M7 are bundled in `shared/` so the frontend can re-derive for "expand math" tooltips without an HTTP round-trip when latency matters.

### 4.1 Why not Python / Go / Rust

| Option | Verdict | Reason |
|---|---|---|
| **Bun + Hono (TS)** | Chosen | Shared ontology types end-to-end with the frontend; Palantir OSDK is TS-first; AIP Logic + Anthropic/OpenAI SDKs first-class in TS; native WebSocket; native test runner; one process, one language. |
| Python + FastAPI | Rejected | Type drift between pydantic and TS at integration time. SciPy/numpy advantage is real but one-shot; doesn't outweigh the seam. |
| Go | Rejected | Palantir OSDK and LLM SDKs are weaker; no shared types with frontend; gonum is far behind numpy/scipy/ml-matrix; `if err != nil` tax during fast iteration. |
| Rust | Rejected | The complexity gap is algorithmic, not language-level. Borrow-checker tax outweighs gains. Mention "kernel is portable to Rust/WASM for edge" verbally for the post-hack story. |

### 4.2 Where the math runs

**Backend (Tier B) is canonical.** Three reasons:

1. Auditability matches the "evidence custody" product story — scoring must be governed and inspectable.
2. Maps cleanly to Palantir Functions — Object pages can explain themselves in Q&A.
3. Provenance trace (M7) becomes natural: each scoring step writes a typed object, not a console log.

The frontend renders. It never re-derives canonical state. Every `Claim` and `CollectionAction` ships its own explanation payload (LLR contributions, citations, applied rules) so tooltips render from precomputed data without round-trips. For interactive what-if, debounced WebSocket round-trip is <50ms — imperceptible — and it's the *server's* answer, which is what auditability requires. Browser-safe copies of M1/M2/M4/M7 in `shared/` exist only for offline fallback; they are not the canonical evaluator.

### 4.3 Tiered runtime

The same product surface is supported by three tiers, all live in this build:

| Tier | What it is | Critical path? |
|---|---|---|
| **A — Shell** | Vite/React/MapLibre persistent shell (Substrate / Stage / Working Panel / Command Line); v2 PRD §4 component model | Yes |
| **B — Engineered runtime** | Bun + Hono server; hosts M1–M7; orchestrates AIP calls; wraps M3 structural guard around every specialist call; writes through OperationalStore | Yes |
| **C — Palantir** | Foundry datasets/streams (raw + curated), Ontology (operational graph), Actions (governed writeback), AIP Logic (specialists), AIP Chatbot Studio (Q&A), Data Lineage (provenance backstop) | Yes |

**Fallback ladder** (used only when something breaks during demo):

1. AIP rate-limited or down → cached AIP output replayed from `fixtures/maritime/specialist-reads.json`; M3 guard still validates citations on load.
2. Tier B unreachable → frontend imports browser-safe M1/M2/M4/M7 from `shared/`; renders precomputed cards.
3. OSDK unreachable → local SQLite mirror behind same `OperationalStore` interface; queued Action envelopes replay into Foundry post-demo.
4. Network gone entirely → screen recording fallback (Shayaun owns).

---

## 5. Architecture layers

| Layer | Owns | Does not own | Spine type | Palantir primitive | Why judges should care |
|---|---|---|---|---|---|
| **Raw truth** | Source payloads, immutable file/stream records, source timestamps, raw hashes | Operational status, final identity, AI claims | n/a (pre-spine) | Foundry datasets and streaming datasets | Raw rows visible behind every claim |
| **Curated truth** | Normalized AIS, observations, tracklets, anomaly candidates, deterministic features, evidence rows | Human decisions, mission execution | `observation`, `track`, `anomaly`, `evidence` | Pipeline Builder / Code Repository transforms | Technical substance lives here, not in UI |
| **Operational objects** | Vessel, Track, Observation, Anomaly, Claim, EvidenceItem, CollectionAction, ReviewRule | Raw source storage | `entity`, `track`, `observation`, `anomaly`, `hypothesis`, `claim`, `evidence`, `actionOption`, `reviewRule`, `case` | Ontology object/link types | The Palantir-native graph; same shape as the domain-neutral spine |
| **User decisions** | Operator accept/reject, rule saves, collection request state, audit trail | Source facts | metadata on `reviewRule` | Ontology Actions, function-backed Actions | Human review memory becomes data |
| **AI outputs** | Summaries, hypothesis prose, refusals, collection rationale | Deterministic parsing/scoring; final authority | metadata on `claim`, `actionOption` | AIP Logic, AIP Chatbot Studio, Functions as tools | AI is inspectable and bounded |
| **Security/provenance** | Markings, lineage, object/property policies, auditability | Business logic | edge `provenance` | Foundry Markings, Data Lineage, object/property security | National-security judges will ask this |

The **spine type** column shows the domain-neutral abstraction. Maritime nouns live only in the Ontology projection and in `fixtures/maritime/`. Anyone porting SeaForge to a non-maritime vertical replaces the maritime adapter and leaves spine + scoring + AIP wiring intact.

---

## 6. Data ingest

### 6.1 Common normalization envelope

Every adapter emits the same envelope before Foundry write. The point is to make multi-source fusion testable. Adapters run in `live` or `fixture` mode behind the same interface — `live` pulls real APIs, `fixture` replays canned JSON. Demo defaults to `fixture` for AIS+Danti+Edge so the network failure mode never breaks the scenario; live mode flips on with an env flag for off-script Q&A.

```json
{
  "envelope_id": "env:aishub:sha256:9d2f...",
  "source": "AISHUB",
  "source_record_id": "aishub:366700111:2026-04-18T10:15:04Z",
  "source_observed_at": "2026-04-18T10:15:04Z",
  "ingested_at": "2026-05-02T14:03:22Z",
  "record_type": "AIS_POSITION",
  "schema_version": "seaforge.normalized.v1",
  "aoi_ids": ["aoi:alara-eez-box-01"],
  "geo": { "type": "Point", "coordinates": [31.42018, 34.88112] },
  "normalized": {
    "mmsi": "366700111",
    "imo": "IMO9388800",
    "vessel_name": "MV CALDERA",
    "call_sign": "WDC9412",
    "lat": 34.88112,
    "lon": 31.42018,
    "sog_knots": 12.4,
    "cog_deg": 84.2,
    "heading_deg": 86,
    "nav_status": 0,
    "vessel_type": 70,
    "length_m": 183,
    "width_m": 28,
    "draft_m": 7.1
  },
  "quality": {
    "position_valid": true,
    "identity_valid": true,
    "quality_flags": ["LIVE_API", "WGS84_ASSUMED"],
    "source_confidence": 0.8
  },
  "provenance": {
    "raw_payload_sha256": "9d2f...",
    "adapter_version": "aishub-adapter@0.2.0",
    "source_url_or_dataset": "AISHub API / fixture",
    "license_or_terms": "source-specific"
  },
  "raw": { "MMSI": 366700111, "TIME": "2026-04-18 10:15:04 GMT", "LONGITUDE": 31.42018, "LATITUDE": 34.88112, "COG": 84.2, "SOG": 12.4 }
}
```

### 6.2 Source-by-source ingest plan

Every adapter ships in both `live` and `fixture` modes; demo defaults are noted in the rightmost column.

| Source | Expected shape | Transport / cadence | Normalization needs | Foundry landing | Demo default |
|---|---|---|---|---|---|
| **MarineCadastre AIS** | Daily compressed CSV. Fields: `MMSI`, `BaseDateTime`, `LAT`, `LON`, `SOG`, `COG`, `Heading`, `VesselName`, `IMO`, `CallSign`, `VesselType`, `Status`, dimensions, draft, cargo, transceiver class. Snake_case from 2025 onward. | Batch file load. One daily file or subset. | Handle uppercase vs snake_case; parse UTC; normalize MMSI as string; validate WGS84; remove impossible SOG/COG/heading; split dynamic vs static; hash raw row. | `raw_ais_marinecadastre_daily` → `curated_ais_message` → `curated_observation` | fixture (500–5,000 row JSONL subset) |
| **AISHub AIS** | XML/JSON/CSV. Fields: `MMSI`, `TIME`, `LONGITUDE`, `LATITUDE`, `COG`, `SOG`, `HEADING`, `ROT`, `NAVSTAT`, `IMO`, `NAME`, `CALLSIGN`, `TYPE`, dimensions `A/B/C/D`, `DRAUGHT`, `DEST`, `ETA`. | HTTP polling by bbox/MMSI/IMO/age. Once per minute max. | Convert AIS-encoded coords when `format=0`; treat sentinel values as null (heading `511`, COG `360`, SOG `1023`); compute length/width from `A+B`, `C+D`; parse GMT timestamp. | `stream_ais_aishub_live` or `raw_ais_aishub_poll_batches` | fixture; live flag for off-script Q&A |
| **BarentsWatch AIS** | JSON over HTTPS. Fields: `courseOverGround`, `latitude`, `longitude`, `name`, `rateOfTurn`, `shipType`, `speedOverGround`, `trueHeading`, `mmsi`, `msgtime`. | Streaming + latest/track endpoints. OAuth client credentials. | Same AIS normalization. Coverage: Norwegian EEZ only; excludes fishing <15m and leisure <45m; no data older than 14 days. | `stream_ais_barentswatch_live` | fixture (BarentsWatch-shaped JSON for Track B) |
| **Danti** | Search/context results over geospatial intelligence sources. Result objects: query, sources, footprints, times, snippets, confidence, URLs. Public schema not stable. | API or export. **Assumption** — verify on Day 1. | Convert footprints to GeoJSON; normalize time windows; distinguish source claims from analyst/AI summary; never let Danti text become raw truth without `EvidenceItem`. | `raw_danti_results` → `curated_source_document` → `curated_evidence_item` | fixture (3 mocked results, clearly labeled) |
| **Exa / OSINT** | Search + Contents endpoints. Fields: `url`, `title`, `published_date`, `author/source`, `highlights`, `summary`, extracted entities, query. | HTTP on anomaly creation or operator request. | Store web result separately from evidence; deduplicate by canonical URL + content hash; extract MMSI/IMO/vessel name only as weak evidence. | `raw_exa_search_results` → `curated_source_document` → `curated_evidence_item` | fixture (hand-curated public docs) |
| **Shodan** | Passive infrastructure intelligence. REST API + Streaming API. Fields: `ip`, `port`, `org`, `hostnames`, `location`, `timestamp`, `transport`, `product`, `banner`, `vulns`. | Optional HTTP lookup. **Never run scans in demo.** | Use only for infrastructure context (AIS receiver, port camera, maritime data endpoint health). Do not infer vessel intent. | `raw_shodan_results` | omitted; stretch only |
| **CASK / edge sensor** | RF / radar / camera / acoustic / AIS-receiver-health. Fields: `sensor_id`, `sensor_type`, `observed_at`, `lat`, `lon`, `bearing`, `range_m`, `classification`, `confidence`, `media_ref`, `edge_model_version`, `network_status`. **Assumption.** | MQTT / HTTP / WebSocket / file drop / Foundry stream. | Convert to generic `Observation`; separate detection confidence from custody confidence; attach media or sensor provenance. | `stream_edge_observation` | fixture (2 RF bearing detections + 1 receiver-health event) |

### 6.3 Core normalized tables

#### `curated_ais_message`

| Column | Type | Notes |
|---|---|---|
| `ais_message_id` | string | `source:mmsi:timestamp:lat:lon:hash8` |
| `source` | string | `MARINECADASTRE` / `AISHUB` / `BARENTSWATCH` |
| `source_record_id` | string nullable | Original key |
| `mmsi` | string | Always string |
| `imo` | string nullable | Preserve `IMO` prefix; numeric key separate |
| `vessel_name` | string nullable | Trimmed, uppercase comparable copy |
| `call_sign` | string nullable | Trimmed, uppercase |
| `base_time_utc` | timestamp | Source observation time |
| `received_at_utc` | timestamp | Ingest time |
| `lat` / `lon` | double | WGS84 |
| `sog_knots` | double nullable | Null on sentinel |
| `cog_deg` | double nullable | Null on sentinel |
| `heading_deg` | int nullable | Null if `511` |
| `rot` | double nullable | If exposed |
| `nav_status` | int nullable | AIS nav status |
| `vessel_type` | int nullable | AIS vessel/cargo type |
| `length_m` / `width_m` | double nullable | Direct or derived |
| `draft_m` | double nullable | Direct or derived |
| `destination` | string nullable | Voyage field |
| `eta_utc_or_raw` | string nullable | Keep raw if incomplete |
| `transceiver_class` | string nullable | `A` / `B` |
| `raw_payload_sha256` | string | Provenance |
| `quality_flags` | array<string> | `BAD_HEADING`, `MISSING_STATIC`, `ARCHIVE_ONE_MINUTE_SAMPLE`, etc. |

USCG NAVCEN: Class A position reports include MMSI, nav status, SOG, longitude, latitude, COG, true heading, timestamp. Class A units broadcast every 2–10s underway, every 3 min at anchor; static/voyage data every 6 min. Sentinel handling is required for valid downstream math.

#### `curated_source_document`

```json
{
  "source_document_id": "doc:danti:search-20260502-001:r03",
  "source": "DANTI",
  "source_type": "SAR_IMAGERY_SUMMARY",
  "title": "Possible vessel-sized detection inside AOI-ALARA-01",
  "url": null,
  "retrieved_at": "2026-05-02T14:06:00Z",
  "published_or_observed_at": "2026-04-18T10:47:00Z",
  "geojson": { "type": "Point", "coordinates": [31.6904, 34.8847] },
  "summary": "Fixture: non-AIS vessel-sized detection near predicted corridor.",
  "raw_payload_sha256": "cc51...",
  "access_marking": "UNCLASSIFIED//OSINT_FIXTURE"
}
```

#### `curated_evidence_item`

```json
{
  "evidence_item_id": "ev:danti:cc51:0001",
  "source_document_id": "doc:danti:search-20260502-001:r03",
  "evidence_type": "GEO_SPATIOTEMPORAL_CORROBORATION",
  "observed_at_start": "2026-04-18T10:46:30Z",
  "observed_at_end": "2026-04-18T10:48:10Z",
  "geojson": { "type": "Point", "coordinates": [31.6904, 34.8847] },
  "claim_text": "A vessel-sized detection was observed near the predicted dead-reckoning corridor.",
  "supports_hypothesis_types": ["SAME_PHYSICAL_VESSEL_CONTINUITY"],
  "contradicts_hypothesis_types": ["PURE_RECEIVER_OUTAGE"],
  "source_confidence": 0.62,
  "extraction_method": "DANTI_EXPORT_OR_FIXTURE",
  "human_review_status": "UNREVIEWED"
}
```

---

## 7. Foundry data plane

### 7.1 Datasets and streams

| Dataset / stream | Type | Input | Output role |
|---|---|---|---|
| `raw_ais_marinecadastre_daily` | Batch dataset | Daily AIS CSV/ZIP subset | Raw historical AIS |
| `raw_ais_aishub_poll_batches` | Batch dataset | AISHub polling | Fallback if no streaming |
| `stream_ais_live` | Foundry stream | AISHub / BarentsWatch / replay | Live AIS observations |
| `raw_danti_results` | Batch dataset | Danti export/API/fixture | Raw GEOINT context |
| `raw_exa_results` | Batch dataset | Exa search/content results | Raw OSINT |
| `stream_edge_observation` | Foundry stream | Optional CASK/edge events | Live non-AIS detections |
| `curated_ais_message` | Curated dataset | Raw AIS sources | Normalized AIS |
| `curated_observation` | Curated dataset | AIS + Danti + edge | Generic observation |
| `curated_vessel_identity` | Curated dataset | AIS static + operator merges | Vessel objects |
| `curated_tracklet` | Curated dataset | Observations | Track objects |
| `curated_track_association_candidate` | Curated dataset | Tracklets | Custody continuities |
| `curated_anomaly` | Curated dataset | Tracklets + rules + Kalman | Anomaly objects |
| `curated_hypothesis_feature` | Curated dataset | Anomaly + evidence + Kalman + Bayes | Per-feature LLR contributions |
| `curated_evidence_item` | Curated dataset | Danti/Exa/Shodan/edge | Evidence objects |
| `action_operator_decision_edits` | Action-backed | Operator Actions | Decisions |
| `action_review_rule_edits` | Action-backed | Operator Actions (DSL parsed) | Human review memory |
| `aip_specialist_outputs` | Dataset / Ontology edit target | AIP Logic output (post-M3 guard) | Draft hypotheses + explanations + refusals |

External ingest goes through Data Connection (batch or streaming sync). Streaming syncs ingest into Foundry streams; batch syncs create datasets and run manually or on schedule.

### 7.2 Geospatial modeling

Use **point objects** for observations and **line/polygon objects** for tracks and AOIs. Foundry Map supports `geopoint` and `geoshape` properties; tracks can be configured through latitude/longitude time series or geotemporal series outputs.

Minimum:
- `Observation.geo_point` — `geopoint`
- `Vessel.last_position` — `geopoint`
- `Track.track_line` — `geoshape` (GeoJSON LineString)
- `AreaOfInterest.aoi_polygon` — `geoshape` (Polygon)
- `Track.predicted_ellipse` — `geoshape` (Polygon, M1 output)

Stretch: geotemporal series sync for live track animation.

### 7.3 Governance and provenance

Three mechanisms simultaneously:

| Mechanism | Implementation |
|---|---|
| **Dataset lineage** | Every transform output connected to raw datasets so Data Lineage shows how normalized AIS, anomalies, and hypotheses were produced. |
| **Object-level provenance** | Every `Observation`, `AISMessage`, `EvidenceItem`, `Claim`, `CollectionAction` stores `source_dataset_rid`, `source_record_id`, `raw_payload_sha256`, `adapter_version`, `created_by_process`, plus `feature_contributions` (M2) when applicable. |
| **Access control** | Markings + object/property policies. Foundry Markings restrict resource visibility/actions to users satisfying those markings; object/property security supports row/column/cell-level controls. |

---

## 8. Domain-neutral spine + Ontology projection

### 8.0 Spine schema (domain-neutral)

`graph-spine/schema.ts` exports the abstract types. No maritime nouns appear here. This is the portability surface from v2 PRD §11.

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

interface EdgeProvenance {
  created_at: string;
  created_by: 'system' | 'operator' | 'fixture' | string;
  source_node_ids: string[];
  confidence?: number;
  rationale?: string;
}

interface ArchetypeMetadata {
  archetype_primary?: 'Sage' | 'Magician' | 'Judge' | 'Sovereign' | 'Trickster' | string;
  archetype_secondary?: string[];
  archetype_role?: 'perception' | 'persistence' | 'epistemic' | 'decision' | 'review_memory';
}
```

Archetype metadata is dormant but supported on `anomaly`, `claim`, `actionOption`, `reviewRule`. Layer mapping per v2 PRD §11.

### 8.1 Maritime Ontology projection (authoritative)

The maritime adapter projects spine nodes into Foundry Ontology object types. This is the authoritative graph for the demo.

| Object type | Spine node | Purpose | Key properties | Primary ID |
|---|---|---|---|---|
| **Vessel** | `entity` (+ maritime metadata) | Real-world or suspected vessel identity cluster | `vessel_id`, `canonical_name`, `imo`, `mmsi_set`, `call_sign_set`, `flag`, `vessel_type`, `length_m`, `width_m`, `identity_state`, `last_seen_at`, `last_position`, `identity_confidence` | `vsl:imo:<imo>` / `vsl:mmsi:<mmsi>` / `vsl:cluster:<hash>` |
| **Track** | `track` | Spatiotemporal custody segment | `track_id`, `track_state`, `vessel_id`, `start_time`, `end_time`, `track_line`, `observation_count`, `gap_count`, `continuity_score`, `predicted_ellipse`, `kalman_state`, `source_mix` | `trk:<vessel_or_unknown>:<start>:<end>:<hash8>` |
| **Observation** | `observation` | Generic observation from any source | `observation_id`, `observation_type`, `observed_at`, `geo_point`, `lat`, `lon`, `source`, `source_confidence`, `target_signature`, `quality_flags` | `obs:<source>:<source_record_id_or_hash>` |
| **AISMessage** | `observation` (subtype) | Normalized AIS message as source-specific evidence | `ais_message_id`, `mmsi`, `imo`, `base_time_utc`, `lat`, `lon`, `sog_knots`, `cog_deg`, `heading_deg`, `nav_status`, `raw_payload_sha256` | `ais:<source>:<mmsi>:<timestamp>:<latlon_hash>` |
| **Anomaly** | `anomaly` | Detected ambiguous behavior | `anomaly_id`, `anomaly_type`, `severity`, `status`, `detected_at`, `window_start`, `window_end`, `score`, `aoi_id`, `summary`, `detector_version` | `anom:<type>:<track_id>:<window_start>:<hash8>` |
| **Claim** (= Hypothesis) | `hypothesis` / `claim` | Competing explanation, not final fact | `claim_id`, `claim_kind`, `claim_text`, `score`, `confidence_band`, `status`, `feature_contributions` (LLR per feature, nats), `unsupported_assertions`, `refusal_reason`, `model_or_rule_version`, `created_by` | `claim:<anomaly_id>:<kind>:<version>` |
| **EvidenceItem** | `evidence` | Atomic evidence supporting/contradicting a Claim | `evidence_item_id`, `evidence_type`, `source`, `source_document_id`, `observed_time_range`, `geojson`, `claim_text`, `supports_types`, `contradicts_types`, `source_confidence`, `review_status` | `ev:<source>:<raw_hash>:<ordinal>` |
| **AreaOfInterest** | `case` (scope) | Named polygon + operational context | `aoi_id`, `name`, `aoi_polygon`, `risk_profile`, `dark_gap_threshold_min`, `collection_constraints`, `owner_team` | `aoi:<slug>` |
| **CollectionAction** | `actionOption` | Recommended/requested non-kinetic step | `collection_action_id`, `action_type`, `priority`, `status`, `target_geojson`, `time_window_start`, `time_window_end`, `rationale`, `required_approval`, `applied_rule_id`, `created_by` | `ca:<anomaly_id>:<action_type>:<timestamp>` |
| **ReviewRule** | `reviewRule` | Human review memory: parsed DSL rule | `review_rule_id`, `scope_aoi_id`, `dsl_text`, `condition_ast` (parsed), `effect_ast` (parsed), `priority`, `enabled`, `created_by`, `created_at`, `last_applied_at` | `rr:<team_or_user>:<slug>:v<version>` |
| **OperatorDecision** | edge `REVIEWED_BY` metadata | Human decision record | `operator_decision_id`, `decision_type`, `object_ref`, `selected_option`, `rationale`, `created_by`, `created_at`, `supersedes_decision_id` | `dec:<user>:<timestamp>:<hash8>` |
| **SourceDocument** | provenance on `evidence` | Document/result that produced evidence | `source_document_id`, `source`, `source_type`, `title`, `url`, `retrieved_at`, `published_or_observed_at`, `summary`, `geojson`, `raw_payload_sha256`, `access_marking` | `doc:<source>:<url_or_provider_id_hash>` |

### 8.2 Link types (Ontology) ↔ Edge types (spine)

| Ontology link type | Spine edge type | From | To | Meaning |
|---|---|---|---|---|
| `VESSEL_HAS_TRACK` | `OBSERVED_AS` | Vessel | Track | Identity associated with track segments (1→many) |
| `TRACK_HAS_OBSERVATION` | `DERIVED_FROM` | Track | Observation | Track composed of ordered observations (1→many) |
| `OBSERVATION_DERIVED_FROM_AIS` | `DERIVED_FROM` | Observation | AISMessage | AIS-backed observation (many→1) |
| `OBSERVATION_DERIVED_FROM_EVIDENCE` | `DERIVED_FROM` | Observation | EvidenceItem | Non-AIS-backed observation (many→1) |
| `ANOMALY_INVOLVES_TRACK` | `DERIVED_FROM` | Anomaly | Track | Anomaly on a track or candidate stitch (many→many) |
| `ANOMALY_INVOLVES_VESSEL` | `DERIVED_FROM` | Anomaly | Vessel | Anomaly concerns a vessel (many→many) |
| `ANOMALY_IN_AOI` | `DERIVED_FROM` | Anomaly | AreaOfInterest | Geospatial scoping (many→1) |
| `CLAIM_EXPLAINS_ANOMALY` | `DERIVED_FROM` | Claim | Anomaly | Claim is an explanation (many→1) |
| `SUPPORTS` | `SUPPORTS` | Observation/EvidenceItem | Claim | Evidence increases posterior |
| `WEAKENS` | `WEAKENS` | Observation/EvidenceItem | Claim | Evidence decreases without contradicting |
| `CONTRADICTS` | `CONTRADICTS` | Observation/EvidenceItem | Claim | Evidence conflicts |
| `SOURCE_DOCUMENT_CONTAINS_EVIDENCE` | `DERIVED_FROM` | SourceDocument | EvidenceItem | Document yielded evidence (1→many) |
| `COLLECTION_ACTION_ADDRESSES_ANOMALY` | `TRIGGERS` | CollectionAction | Anomaly | Action targets anomaly (many→1) |
| `COLLECTION_ACTION_TESTS_CLAIM` | `RECOMMENDS` | CollectionAction | Claim | Action discriminates between claims (many→many) |
| `DECISION_ON_CLAIM` | `REVIEWED_BY` | OperatorDecision | Claim | Operator accepted/rejected/modified claim (many→1) |
| `DECISION_ON_COLLECTION_ACTION` | `REVIEWED_BY` | OperatorDecision | CollectionAction | Operator acted on recommendation (many→1) |
| `REVIEW_RULE_SCOPED_TO_AOI` | `APPLIES_TO` | ReviewRule | AreaOfInterest | Rule scope (many→many) |
| `REVIEW_RULE_APPLIED_TO_ANOMALY` | `APPLIES_TO` | ReviewRule | Anomaly | Rule fired (many→many) |
| `APPLIES_TO` | `APPLIES_TO` | ReviewRule | Claim or Track | Rule matched the case |
| `REVIEWED_BY` | `REVIEWED_BY` | CollectionAction | ReviewRule | Recommendation modified by prior rule |
| `DERIVED_FROM` | `DERIVED_FROM` | Derived object | Source object | Generic provenance edge |

Foundry link types support 1→1, 1→many, and many→many; many-to-many links use join tables mapping primary keys, and cardinality metadata tells applications how to interpret each side.

### 8.3 Hypothesis as Claim object

The hypothesis board is implemented as three `Claim` objects with `claim_kind = "custody_hypothesis"`. H1 has `score = 0.72`, `status = "supported"`; H2 has `score = 0.19`, `status = "contested"`; H3 has `score = null`, `status = "unresolved"`. All three share the same `SUPPORTS`/`WEAKENS`/`CONTRADICTS`/`DERIVED_FROM` link vocabulary so the evidence drawer logic is uniform.

### 8.4 Deterministic IDs

```ts
function stable_id(prefix: string, ...parts: string[]): string {
  const raw = [prefix, ...parts.map(p => p.trim().toLowerCase()).filter(Boolean)].join("|");
  return `${prefix}:${sha1(raw).slice(0, 12)}`;
}

const claim_h1_id = stable_id("claim", "custody_hypothesis", "event_001", "h1");
const obs_id = stable_id("obs", "ais", mmsi, timestamp, lat.toString(), lon.toString());
```

---

## 9. Foundry vs Neo4j

**Decision:** Foundry Ontology is the authoritative graph. Period. Developer AIP access is confirmed; Palantir is on the critical path.

The system's graph is not just nodes and relationships. It is operational: objects, links, actions, security, lineage, human review, and AI workflows. That is what Foundry Ontology is for. Palantir docs describe the Ontology as the system for integrating data, logic, action, and security into a unified representation of operational decision-making.

Neo4j is a strong property graph DB with first-class graph algorithms. We do not run it in this build. The local SQLite mirror in `server/src/stores/local.ts` exists only for network-failure fallback.

### 9.1 Local mirror (fallback only)

Used only when OSDK is unreachable mid-demo. Same `OperationalStore` interface; queued Action envelopes replay into Foundry post-demo.

```text
Authoritative path (default):
  Source adapters → Foundry datasets/streams → Foundry transforms → Ontology → Actions/AIP

Fallback path (network failure only):
  Source adapters → local SQLite object/link tables → local API/UI
                 → queued ActionEnvelope[]
                 → replay into Foundry when access returns
```

Local mirror schema:

```sql
CREATE TABLE objects (
  object_type     TEXT NOT NULL,
  object_id       TEXT NOT NULL,
  properties_json TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  source_hash     TEXT,
  PRIMARY KEY (object_type, object_id)
);

CREATE TABLE links (
  link_type       TEXT NOT NULL,
  from_type       TEXT NOT NULL,
  from_id         TEXT NOT NULL,
  to_type         TEXT NOT NULL,
  to_id           TEXT NOT NULL,
  properties_json TEXT,
  updated_at      TEXT NOT NULL,
  PRIMARY KEY (link_type, from_type, from_id, to_type, to_id)
);

CREATE TABLE action_queue (
  action_id    TEXT PRIMARY KEY,
  action_type  TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status       TEXT NOT NULL,  -- PENDING / APPLIED / FAILED
  created_at   TEXT NOT NULL,
  replayed_at  TEXT
);

CREATE INDEX idx_links_from ON links(from_type, from_id);
CREATE INDEX idx_links_to   ON links(to_type, to_id);
```

**Rule:** local mirror can demonstrate but cannot become authority. When Palantir access works (which it does — we have AIP), all writes go through Ontology Actions or Foundry datasets.

---

## 10. Engineering modules

The algorithmic substance. Each module is independently buildable, has dependencies, an acceptance criterion, and earns a specific judging beat. Tier tag indicates where it runs.

| Module | Tier | Notes |
|---|---|---|
| M1 Kalman dark-gap predictor | B (server-canonical, browser-safe copy in `shared/`) | Pure TS, runs server-side; browser copy for offline rendering |
| M2 Bayesian fusion / LLR | B (server-canonical, browser-safe copy in `shared/`) | Same — confidence math runs in Tier B, mirror in `shared/` for offline tooltips |
| M3 LLM specialist + structural citation guard | B (guard) wraps C (AIP Logic) | AIP Logic is the canonical specialist runtime; M3 guard runs in Tier B, validates AIP output before persistence; same guard validates fixture cards on load |
| M4 Runtime rule DSL | B (server-canonical, browser-safe copy in `shared/`) | chevrotain parser shared between Tier B evaluator and Tier A rule editor |
| M5 Cross-modal (CLIP) | B | Synthetic EO chips or Sentinel-2 free tile; CLIP class match emits `SUPPORTS`/`CONTRADICTS` link |
| M6 Live perturbation | B | `POST /perturb` ingests through same pipeline as scripted observations |
| M7 Provenance with confidence flow | B (server-canonical, browser-safe copy in `shared/`) | `traceBack` extended with per-step LLR deltas |

**Promise:** Every M-module has a fixture-mode equivalent so the demo never depends on a flaky network. AIP outputs are cached to `fixtures/maritime/specialist-reads.json` after the first successful run; M3 guard validates the cached cards on load identically to live AIP output. Tier B is what makes off-script Q&A robust (judge dictates a new rule → M4 parses live; judge injects a vessel → M6 ingests live).

### M1 — Kalman dark-gap predictor

**Goal:** Replace heuristic kinematic feasibility with a probabilistic prediction over where a vanished track should reappear.

- 4D state `[lat, lon, ẋ, ẏ]` (convert to local ENU plane for stability).
- Constant-velocity transition with process noise `Q` tuned to typical AIS jitter.
- Ingest Track A's pre-gap pings, fit. Propagate forward through the dark gap; covariance grows.
- When Track B's first ping arrives, compute Mahalanobis distance from B's position to the predicted distribution; convert to likelihood `L(B continues A)`.
- **Visual win:** render the predicted 95% confidence ellipse on the map. Track B emerges *inside* it.
- **Acceptance:** `predict(track_a_pings, gap_duration_s, b_first_ping)` returns `{likelihood, mahalanobis, ellipse_polygon}`. Likelihood reproducible across runs.
- **Stack:** `ml-matrix` for linear algebra in TS. Hand-rolled 4×4 EKF.
- **Depends on:** AIS adapter, `Track` object type.

### M2 — Bayesian fusion of identity features

**Goal:** Replace the weighted-sum custody score with a posterior derived from independent feature likelihoods. Confidence becomes explainable.

- Features (conditionally independent given hypothesis): kinematic likelihood from M1, MMSI distance, name match, callsign match, flag continuity, vessel-type continuity, declared destination consistency, dimension similarity, source health.
- Each feature has a calibrated likelihood ratio (start hand-set; if time, fit on Kaggle AIS dataset).
- Posterior `P(H_i | features) ∝ Π LR_i · P(H_i)` for each of `H1` (same vessel), `H2` (different vessel), `H3` (insufficient data — assigned when total evidence weight is below threshold).
- Output payload includes per-feature LLR contributions in nats.
- **Visible win:** click `0.72` → tooltip shows stacked horizontal bar of LLR contributions: `kinematic +1.21`, `MMSI mismatch −0.62`, `flag mismatch −0.31`, …
- **Acceptance:** `fuse(features) → {posterior_h1, posterior_h2, posterior_h3, contributions[]}`. Posteriors sum to 1 ± 1e-6.
- **Depends on:** M1.

### M3 — Grounded specialists (AIP Logic + structural guard)

**Goal:** Replace hardcoded `REFUSED` labels with structurally enforced bounded reads. Refusal must be *earned*, not declared.

- **Runtime:** AIP Logic functions are canonical. Each specialist is an AIP Logic function that reads Ontology context and emits a structured output. Anthropic SDK and OpenAI Codex implementations live behind the same `Specialist` interface as fallbacks if AIP is rate-limited.
- Four specialists, one shared interface: `kinematics`, `identity`, `intent`, `collection`. Plus visual (M5).
- Each call uses structured outputs with required schema:
  ```ts
  {
    verdict: "supported" | "weakened" | "contradicted" | "refused",
    summary: string,
    cited_observation_ids: string[],   // min_items: 2 for non-refused
    confidence: number,
    unsupported_assertions: string[]   // intent / ownership / legality / sanctions
  }
  ```
- **Server-side structural enforcement (M3 guard, layered, runs in Tier B regardless of whether output came from AIP, Anthropic, Codex, or fixture cache):**
  1. If `verdict !== "refused"` and `cited_observation_ids.length < 2` → force `verdict = "refused"`.
  2. If specialist is `intent` and any `EvidenceItem` of type `INTENT_INDICATOR` is absent → force `verdict = "refused"`.
  3. If hypothesis score below `confidence_floor` → force `verdict = "refused"` regardless of model output.
  4. Strip `unsupported_assertions` from `summary` before persistence.
- **Demo proof:** feed a fabricated "hostile chatter" observation; intent specialist flips from `refused` to a cited verdict because constraint #2 is satisfied. Remove it; verdict reverts. Provable on stage.
- **Acceptance:** unit tests inject observation sets with 0/1/2/3 supporting items and INTENT_INDICATOR present/absent; verdict transitions match each layer. Same tests pass against AIP output and fixture cards.
- **Depends on:** M2 (for confidence floor), Ontology object types, AIP Logic developer access.

### M4 — Runtime rule DSL

**Goal:** Replace static JSON swap with a parsable rule grammar evaluated at runtime against open Claims. Operators (and judges) can dictate new rules on stage.

- Grammar:
  ```
  rule       := "WHEN" condition ("AND" condition)* "THEN" effect ("," effect)*
  condition  := field comparator value
  field      := "claim_kind" | "trigger" | "corroboration" | "confidence"
              | "anomaly_severity" | "gap_minutes" | "danti_geo_time_corroboration"
              | "candidate_continuity_score" | "aoi_id"
  comparator := "==" | "!=" | "<" | ">" | "<=" | ">="
  value      := STRING | NUMBER | BOOL
  effect     := "block" "(" action_id ")"
              | "prefer" "(" action_id ")"
              | "downgrade" "(" action_id ")"
              | "boost" "(" action_id "," priority_delta ")"
  ```
- Parser: `chevrotain` (fast, good error messages). Single TS module in `shared/`.
- The same parser is imported by the frontend rule editor (autocomplete + live preview) and the backend evaluator (action ranking).
- Parser emits AST persisted as `condition_ast` + `effect_ast` JSON on `ReviewRule` objects (the storage shape from §13.5).
- Evaluator runs over the active rule set every time a Claim is updated; writes `APPLIES_TO` and `REVIEWED_BY` links.
- **Visible win:** rule editor in UI with syntax check + "test against current case" preview. In Q&A, judge dictates a rule; system applies it live.
- **Acceptance:** parser round-trips R-001 rule text; evaluator changes action ranking on the second event without code changes.
- **Depends on:** Ontology, action ranker.

### M5 — Cross-modal evidence

**Goal:** One genuinely fused signal across modalities — PS1's literal ask.

- Synthetic EO chip per Observation (procedurally generated, or Sentinel-2 free tile for the AOI).
- "Visual" specialist: cheap CLIP embedding similarity vs class prototypes (`cargo`, `tanker`, `fishing`, `naval`).
- If declared AIS class disagrees with visual class above threshold, emit `CONTRADICTS` link with weighted contribution to M2.
- **Acceptance:** demo case shows at least one cross-modal `CONTRADICTS` or `SUPPORTS` link in the evidence drawer.
- **Depends on:** Observation ingest, M2.

### M6 — Live perturbation endpoint

**Goal:** Demo survives off-script probing.

- `POST /perturb` accepts arbitrary `{mmsi, lat, lon, t, vessel_type?, name?}`.
- Goes through the same ingest → perception → custody pipeline as scripted observations.
- Frontend hidden hotkey (`Ctrl+Shift+I`) injects a vessel at the cursor location.
- **Acceptance:** injecting a third vessel during demo causes ranking re-order without breaking the scenario. Reset clears injected state via `scenario_run_id`.
- **Depends on:** ingest pipeline.

### M7 — Provenance with confidence flow

**Goal:** Trace is not just edges — each node carries `prior → update → posterior` so the math is inspectable.

- `trace_provenance(actionId)` returns ordered steps; each step includes the LLR contribution it added or removed.
- Frontend renders as the 5-line PRD trace by default; "expand math" toggle reveals the per-step deltas.
- **Acceptance:** trace for the demo Collection Action sums to the displayed posterior within 1e-6.
- **Depends on:** M2, Ontology link traversal.

---

## 11. Backend architecture (Tier B) and project layout

### 11.1 Project layout

The layout merges the v2 Implementation Plan structure (`app/`, `graph-spine/`, `fixtures/maritime/`) with the Tier B server and the Foundry-side artifacts.

```
liminal-natsec/
  app/                                  # Tier A — Vite + React shell (v2 PRD)
    src/
      components/
        AppShell.tsx
        SubstratePanel.tsx              # signal sources, alert log, custody queue
        StageViewport.tsx               # MapWatchfloor mounts here
        WorkingPanel.tsx                # case panel, hypotheses, evidence, actions, rules
        CommandLine.tsx                 # AIP Chatbot Studio bridge (or static MVP)
        MapWatchfloor.tsx               # MapLibre, predicted ellipse layer
        CustodyQueue.tsx
        CustodyCasePanel.tsx
        HypothesisBoard.tsx             # H1/H2/H3 with LLR tooltip
        EvidenceChain.tsx               # 5-line + expandable math
        SpecialistReads.tsx             # refusal as hero
        ActionOptions.tsx
        ReviewMemory.tsx                # Watchfloor Rules panel
        RuleEditor.tsx                  # uses shared dsl.ts parser
      api.ts                            # typed OSDK + Tier B client
      ws.ts                             # WebSocket subscription
      App.tsx
      main.tsx
    index.html
    package.json
    vite.config.ts

  graph-spine/                          # domain-neutral schema (portability)
    schema.ts                           # NodeType, EdgeType, EdgeProvenance, ArchetypeMetadata
    graph.ts                            # in-memory traversal helpers (used by tests + offline mode)
    provenance.ts                       # traceBack
    review-memory.ts                    # applyReviewRules
    archetypes.ts                       # dormant archetype metadata

  fixtures/
    maritime/
      tracks.geojson                    # NORMAL + GHOST (MMSI-111 → MMSI-222) + AMBIGUOUS + zone polygon + background
      observations.json
      anomalies.json
      hypotheses.json                   # 3 cards, validated by M3 guard on load
      claims.json
      evidence.json
      specialist-reads.json             # cached AIP output, validated by M3 guard
      actions.json
      review-rules.json                 # empty seed; runtime uses Foundry + localStorage
      eo_chips/                         # synthetic or Sentinel-2 tiles for M5
      scenario-alara-01.jsonl

  server/                               # Tier B — Bun + Hono
    src/
      index.ts                          # Hono app boot
      routes/
        scenario.ts                     # /scenario/control, /scenario/state, WS /stream
        ingest.ts                       # /ingest/:source/pull, /perturb (M6)
        replay.ts                       # /replay/run, /replay/reset
        specialists.ts                  # /specialist/{kinematics,identity,intent,collection,visual}
        actions.ts                      # /actions/review-rule, /actions/decide, /actions/request-collection
        anomalies.ts                    # /anomalies, /anomalies/:id, /anomalies/:id/hypotheses/generate
        provenance.ts                   # /provenance/:actionId, /anomalies/:id/provenance
        debug.ts                        # /debug/palantir-smoke, /health
      domain/
        ontology.ts                     # OperationalStore interface
        ids.ts                          # stable_id() helpers
      adapters/
        marinecadastre.ts               # live + fixture mode
        aishub.ts                       # live + fixture mode
        barentswatch.ts                 # live + fixture mode
        danti.ts                        # live + fixture mode
        exa.ts                          # live + fixture mode
        shodan.ts                       # stretch only
        edgeFixture.ts                  # CASK simulator
      normalization/
        envelope.ts                     # NormalizedEnvelope<T> builder
        ais.ts                          # sentinel handling, dimension derivation
        geo.ts                          # WGS84 validation, ENU conversion
        evidence.ts                     # SourceDocument → EvidenceItem
      scoring/
        perception.ts                   # anomaly rules: dark_gap, identity_churn, speed_drop, loiter
        ranker.ts                       # CollectionAction ranking + rule application
        review_rules.ts                 # rule application engine
      specialists/
        aip.ts                          # AIP Logic function calls (canonical)
        anthropic.ts                    # Anthropic fallback
        codex.ts                        # OpenAI Codex fallback
        visual.ts                       # CLIP class match (M5)
        guard.ts                        # M3 layered structural enforcement
        cache.ts                        # writes successful AIP output to fixtures/maritime/specialist-reads.json
      stores/
        palantir.ts                     # OSDK adapter, primary
        local.ts                        # SQLite fallback mirror
      replay/
        clock.ts                        # AIS replay scheduler, WS fanout
        scenario.ts                     # deterministic scenario runner
      lib/
        sha.ts
    test/
      adapter.spec.ts
      kalman.spec.ts                    # imports shared/scoring/kalman.ts
      bayes.spec.ts                     # imports shared/scoring/bayes.ts
      dsl.spec.ts                       # imports shared/rules/dsl.ts
      specialists.spec.ts               # M3 guard against AIP + Anthropic + Codex + fixture
      provenance.spec.ts                # imports shared/scoring/provenance.ts
      replay.spec.ts
    package.json
    tsconfig.json

  shared/                               # browser-safe + server-shared TS
    domain/
      types.ts                          # SHARED with frontend — single source of truth
    scoring/
      kalman.ts                         # M1 — runs in Tier B and browser
      bayes.ts                          # M2 — runs in Tier B and browser
      provenance.ts                     # M7 — runs in Tier B and browser
    rules/
      dsl.ts                            # M4 parser + evaluator
      builtin.ts                        # R-001 seed rule
    lib/
      matrix.ts                         # ml-matrix re-exports
    scenario/
      event_1.json
      event_2.json

  foundry/                              # Tier C — artifacts authored in Palantir
    datasets.md                         # raw + curated dataset definitions
    ontology.md                         # object types, link types, geospatial properties
    actions.md                          # saveOperatorDecision, saveReviewRule, requestCollection, etc.
    functions.md                        # function-backed Actions, AIP Logic functions
    aip-chatbot.md                      # Chatbot Studio config (optional Q&A surface)

  details.md                            # hackathon brief (Army xTech, NatSec Hackathon 2026)
  CLAUDE.md
  TECHNICAL_PLAN.md                     # this document
  README.md
```

### 11.2 Type contracts

```ts
export type SourceName =
  | "MARINECADASTRE"
  | "AISHUB"
  | "BARENTSWATCH"
  | "DANTI"
  | "EXA"
  | "SHODAN"
  | "EDGE_FIXTURE";

export type RecordType =
  | "AIS_POSITION"
  | "AIS_STATIC"
  | "OSINT_DOCUMENT"
  | "GEOINT_RESULT"
  | "EDGE_OBSERVATION"
  | "INFRASTRUCTURE_CONTEXT";

export interface IngestScope {
  aoiId?: string;
  bbox?: [number, number, number, number];
  mmsi?: string[];
  imo?: string[];
  since?: string;
  until?: string;
  replayScenarioId?: string;
}

export interface SourceRecord<Raw> {
  source: SourceName;
  sourceRecordId: string;
  observedAt?: string;
  retrievedAt: string;
  raw: Raw;
}

export interface NormalizedEnvelope<T> {
  envelopeId: string;
  source: SourceName;
  sourceRecordId: string;
  sourceObservedAt?: string;
  ingestedAt: string;
  recordType: RecordType;
  schemaVersion: "seaforge.normalized.v1";
  aoiIds: string[];
  geo?: GeoJSON.Point | GeoJSON.Geometry;
  normalized: T;
  quality: {
    sourceConfidence: number;
    qualityFlags: string[];
    positionValid?: boolean;
    identityValid?: boolean;
  };
  provenance: {
    rawPayloadSha256: string;
    adapterVersion: string;
    sourceUrlOrDataset?: string;
    licenseOrTerms?: string;
  };
  raw: unknown;
}

export interface SourceAdapter<Raw, Norm> {
  source: SourceName;
  capabilities: { poll: boolean; stream: boolean; replay: boolean };
  mode: 'live' | 'fixture';
  pull(scope: IngestScope, cursor?: Cursor): AsyncIterable<SourceRecord<Raw>>;
  normalize(record: SourceRecord<Raw>): NormalizedEnvelope<Norm>;
}
```

### 11.3 OperationalStore interface

The swap point. `palantir.ts` (OSDK) is primary; `local.ts` (SQLite) is the network-failure fallback. Nothing else in the codebase knows which is active.

```ts
export interface ObjectRef {
  objectType: ObjectType;
  objectId: string;
}

export interface LinkWrite {
  linkType: LinkType;
  from: ObjectRef;
  to: ObjectRef;
  properties?: Record<string, unknown>;
}

export interface ActionEnvelope {
  actionApiName:
    | "saveOperatorDecision"
    | "saveReviewRule"
    | "requestCollection"
    | "updateClaimStatus"
    | "mergeVesselIdentity";
  params: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: string;
}

export interface OperationalStore {
  upsertObject(type: ObjectType, id: string, props: Record<string, unknown>): Promise<void>;
  upsertObjects(type: ObjectType, objects: Array<Record<string, unknown>>): Promise<void>;
  link(write: LinkWrite): Promise<void>;
  upsertLinks(links: LinkWrite[]): Promise<void>;
  getObject<T = unknown>(ref: ObjectRef): Promise<T | null>;
  linked(id: string, linkType: LinkType, direction?: "in" | "out" | "both"): Promise<OntologyObject[]>;
  applyAction(action: ActionEnvelope): Promise<{ id: string; status: "APPLIED" | "QUEUED" | "FAILED"; error?: string }>;
  query(spec: QuerySpec): Promise<OntologyObject[]>;
  writeRawEnvelope(envelope: NormalizedEnvelope<unknown>): Promise<void>;
  writeCuratedRows(datasetApiName: string, rows: unknown[]): Promise<void>;
}
```

### 11.4 Sink and local mirror

Foundry streaming writes prefer official stream APIs (`publishRecord` validates against stream schema, rejects invalid records). For Ontology app development, OSDK is preferred — TypeScript-first, matches the rest of the stack.

When Palantir access is unavailable mid-demo, the same `OperationalStore` shape is implemented over the SQLite tables in §9.1. Action writes are queued in `action_queue`; replay into Foundry happens via `/foundry/action-queue/replay` when access returns.

---

## 12. API surface

Tier B endpoints. The frontend uses identical TypeScript types whether calling Tier B over HTTP or invoking the in-process spine for offline rendering.

| Method | Path | Purpose | Module |
|---|---|---|---|
| GET | `/health` | Demo readiness: local DB, Foundry token, AIP availability, Danti/Exa keys, fixture availability | infra |
| POST | `/scenario/control` | play / pause / reset / inject_event_2 | replay |
| GET | `/scenario/state` | Snapshot of current view model | replay |
| WS | `/stream` | Live state diffs to frontend | replay |
| POST | `/replay/run` | Deterministic scenario replay to local or Foundry sink | replay |
| POST | `/replay/reset` | Reset local mirror and scenario clock | replay |
| POST | `/ingest/:source/pull` | Pull a source into raw sink | ingest |
| POST | `/ingest/ais` | Direct AIS row injection (normalize + write) | ingest |
| POST | `/ingest/danti` | Direct Danti result injection | ingest |
| POST | `/perturb` | Inject arbitrary observation (M6) | ingest |
| GET | `/vessels/:vesselId/custody` | Vessel + tracks + observations + anomalies + claims | query |
| GET | `/anomalies` | List by AOI/status/severity | query |
| GET | `/anomalies/:id` | Full anomaly object | query |
| POST | `/anomalies/:id/hypotheses/generate` | Run M1+M2 + AIP draft (post-M3 guard) | scoring |
| GET | `/anomalies/:id/provenance` | Raw rows, linked objects, evidence, rules, decisions | provenance |
| GET | `/provenance/:actionId` | Confidence-flow trace (M7) | provenance |
| POST | `/specialist/:name` | Call AIP Logic specialist (kinematics / identity / intent / collection / visual), guard with M3 | specialists |
| POST | `/collection-actions` | Create or stage a collection recommendation | actions |
| POST | `/operator-decisions` | Save human decision through Action or queue | actions |
| POST | `/review-rules` | Parse DSL + persist rule (M4) | actions |
| POST | `/foundry/action-queue/replay` | Replay queued local Actions into Foundry | actions |
| GET | `/debug/palantir-smoke` | Verify token, dataset, object, action, link, function, AIP Logic call | debug |

All routes return typed responses. Errors use `{ error, code, hint }`.

---

## 13. AI workflow (specialists + AIP)

### 13.0 Default vs live path

Both paths produce the same Ontology writes. M3 guard runs on both.

| Path | When | What happens |
|---|---|---|
| **Live AIP** | Default during judging | Tier B calls AIP Logic function; structured output passes through M3 guard; persists to `aip_specialist_outputs` dataset and updates Ontology. Output is also cached to `fixtures/maritime/specialist-reads.json` |
| **Cached fixture** | AIP rate-limited or offline | Tier B reads `fixtures/maritime/specialist-reads.json`; M3 guard validates citations identically to live AIP output; persists to Ontology if reachable, else queues |
| **Anthropic / Codex** | Stretch / Q&A novelty | Same `Specialist` interface; same M3 guard wraps output; can run as a side-by-side comparison if a judge asks "what would a different model say?" |

### 13.1 Deterministic / AIP / Human split

| Task | Deterministic code | AIP / LLM | Human-in-loop |
|---|---|---|---|
| Parse AIS | Yes | No | No |
| Normalize source schemas | Yes | No | No |
| Kalman prediction (M1) | Yes | No | Tune `Q` only |
| Bayesian fusion (M2) | Yes | No | Tune likelihood ratios |
| Tracklet construction | Yes | No | Accept/split/merge |
| Dark-gap detection | Yes | No | Tune AOI thresholds |
| Identity-churn detection | Yes | No | Adjudicate |
| Evidence extraction from structured Danti/Exa | Mostly | Summarize text → structured evidence | Review weak evidence |
| Hypothesis generation | Generate candidate templates + posteriors | Phrase claims, caveats, missing evidence | Accept/reject/edit |
| Refusal language | Structural enforcement (M3 layered guard) | Draft explanation | Final responsibility |
| Collection recommendation | Allowed action menu + rank/rule logic | Explain why action discriminates claims | Approve/request/defer |
| Operator review memory | Rule engine (M4 evaluator) | Convert operator note → proposed DSL text | Save/edit/disable |

### 13.2 Specialist reads

AIP Logic functions are the canonical implementation. AIP Logic is no-code LLM-powered functions over the Ontology; Chatbots can use object queries, functions, and Actions as tools. AIP Chatbot Studio is wired to the Command Line region of the v2 shell (optional MVP — can ship as static affordance per v2 PRD §4).

| Specialist | Reads | Writes |
|---|---|---|
| **Kinematics** | `Anomaly`, linked `Track`, `Observation`, `AISMessage`, AOI thresholds, M1 likelihood | Draft custody summary |
| **Identity** | Vessel static fields, MMSI/IMO/callsign/name history, dimensions, candidate tracks | Draft identity claims |
| **Intent** | Hypothesis evidence + INTENT_INDICATOR observations only | Either `refused` or cited motive |
| **Evidence** | `EvidenceItem`, `SourceDocument`, Danti/Exa snippets | Evidence summary; flags unsupported claims |
| **Collection** | Claims, AOI constraints, available collection menu | Draft `CollectionAction` |
| **Visual (M5)** | EO chip embedding, declared AIS class | Class-match SUPPORTS/CONTRADICTS link |
| **Provenance** | All linked raw hashes, datasets, rules, decisions | Natural-language trace explanation |
| **Review Memory** | Prior `ReviewRule`, `OperatorDecision` | Proposed DSL text; saved only by Action |

### 13.3 Structural enforcement (M3 layered guard)

Refusal is not a prompt rule. It is a server-side guard layered on top of every specialist call — AIP Logic, Anthropic, Codex, or fixture cache. Same guard, same outcomes.

| Layer | Condition | Forced verdict |
|---|---|---|
| 1 | `cited_observation_ids.length < 2` | `refused` |
| 2 | Specialist is `intent` and no `EvidenceItem` of type `INTENT_INDICATOR` linked to the Claim | `refused` |
| 3 | Specialist is `identity` and `dimensions_similarity_score` is null and no flag/IMO match | downgrade to `weakened` |
| 4 | Hypothesis posterior below `confidence_floor` (default 0.55) | `refused` |
| 5 | Evidence is purely textual without time + geometry | downgrade to `weakened` |
| 6 | Source = `SHODAN` for vessel-behavior question | `refused` |
| 7 | Operator question contains "hostile", "threat", "intent" without M3 layer 2 satisfied | `refused` |

Layers 1–4 are critical-path; 5–7 layer on top. `unsupported_assertions` is stripped from the persisted `summary` regardless of verdict.

### 13.4 AIP output contract

Force structured output. Schema validated server-side; failures force `refused`.

```json
{
  "anomaly_id": "anom:identity_churn:trk-caldera:20260418T1015:1f44",
  "summary": "AIS went silent for 49 minutes and a similar candidate appeared under a different MMSI near the predicted corridor.",
  "claims": [
    {
      "claim_kind": "SAME_PHYSICAL_VESSEL_CONTINUITY",
      "claim_text": "The two tracklets may represent the same physical vessel.",
      "score": 0.70,
      "confidence_band": "MODERATE",
      "feature_contributions": [
        {"feature": "kalman_likelihood",       "llr_nats": 1.21},
        {"feature": "name_similarity",         "llr_nats": 0.34},
        {"feature": "dimensions_similarity",   "llr_nats": 0.41},
        {"feature": "mmsi_change",             "llr_nats": -0.62},
        {"feature": "flag_continuity",         "llr_nats": -0.31}
      ],
      "supporting_evidence_ids": ["ev:ais:gap:0001", "ev:danti:cc51:0001"],
      "contradicting_evidence_ids": ["ev:aoi:receiver-health:0002"],
      "unsupported_assertions": ["intent", "ownership", "sanctions"],
      "refusal_reason": null
    },
    {
      "claim_kind": "RECEIVER_OR_COVERAGE_GAP",
      "claim_text": "The gap may be caused by source coverage limitations.",
      "score": 0.38,
      "confidence_band": "LOW_TO_MODERATE",
      "feature_contributions": [...],
      "supporting_evidence_ids": ["ev:aoi:receiver-health:0002"],
      "contradicting_evidence_ids": ["ev:danti:cc51:0001"],
      "unsupported_assertions": [],
      "refusal_reason": null
    }
  ],
  "refusal": {
    "should_refuse_overclaim": true,
    "text": "Insufficient evidence to assert intent, ownership, sanctions relevance, or hostile behavior."
  },
  "recommended_collection": [
    {
      "action_type": "REQUEST_SAR_OR_RF_CORROBORATION",
      "priority": "MEDIUM",
      "rationale": "Would discriminate same-physical-vessel continuity from receiver outage."
    }
  ]
}
```

### 13.5 Review memory: DSL text → parsed JSON

`SaveReviewRule` does not store a vague note. It stores both the operator's DSL text and the parsed AST.

Operator types into rule editor:
```
WHEN claim_kind == "custody_hypothesis"
 AND trigger == "identity_churn"
 AND corroboration == false
THEN block("escalate_watch_officer"), prefer("request_eo_sar_collection")
```

Persisted on `ReviewRule` object:
```json
{
  "review_rule_id": "rr:watchfloor:dark-gap-sar-first:v1",
  "scope_aoi_id": "aoi:alara-eez-box-01",
  "dsl_text": "WHEN claim_kind == \"custody_hypothesis\" AND trigger == \"identity_churn\" AND corroboration == false THEN block(\"escalate_watch_officer\"), prefer(\"request_eo_sar_collection\")",
  "condition_ast": {
    "all": [
      { "field": "claim_kind", "op": "==", "value": "custody_hypothesis" },
      { "field": "trigger", "op": "==", "value": "identity_churn" },
      { "field": "corroboration", "op": "==", "value": false }
    ]
  },
  "effect_ast": [
    { "kind": "block", "action_id": "escalate_watch_officer" },
    { "kind": "prefer", "action_id": "request_eo_sar_collection" }
  ],
  "priority": 1,
  "enabled": true,
  "created_by": "op-alvarez",
  "created_at": "2026-05-02T14:10:00Z"
}
```

AIP can draft DSL text from an operator note, but only the `saveReviewRule` Action persists. Function-backed Actions handle the parse + AST validation server-side.

---

## 14. Demo scenario

Scenario script and beat-by-beat is canonical in `SeaForge_PRD_v2 (1).md` §8 (Single Polished Story). This section covers the engineering substrate for those beats — fixture IDs, anomaly objects, scoring outputs, R-001 rule text, and the provenance trace that a probing judge will click through. Six-state mapping per v2 PRD §7.

Fictional AOI and vessels. Do not demo against real sensitive vessels.

### 14.1 Setup

```json
{
  "aoi": {
    "aoi_id": "aoi:alara-eez-box-01",
    "name": "Alara EEZ Box 01",
    "dark_gap_threshold_min": 20,
    "polygon": "POLYGON((31.10 34.70, 32.20 34.70, 32.20 35.20, 31.10 35.20, 31.10 34.70))"
  },
  "vessel_seed": {
    "vessel_id": "vsl:cluster:caldera-01",
    "canonical_name": "MV CALDERA",
    "mmsi_set": ["366700111"],
    "imo": "IMO9388800",
    "length_m": 183,
    "width_m": 28,
    "vessel_type": 70
  }
}
```

### 14.2 Six states ↔ engineering substrate

| State (v2 PRD §7) | Tier A components | Tier B activity | Tier C writes |
|---|---|---|---|
| 1. Normal Traffic | `AppShell`, `SubstratePanel`, `MapWatchfloor` | Replay clock advances; AIS adapter emits envelopes | `curated_observation` rows append |
| 2. Dark Gap Alert | `MapWatchfloor`, `CustodyQueue` | Perception detects dark_gap; Anomaly object created | `Anomaly` object + `ANOMALY_INVOLVES_TRACK` link |
| 3. Second Identity | `MapWatchfloor`, `StageViewport` | M1 Kalman predicts ellipse; Track B first ping computes Mahalanobis | `Track` object for Track B + predicted_ellipse property |
| 4. Custody Case | `WorkingPanel`, `CustodyCasePanel`, `HypothesisBoard`, `EvidenceChain` | M2 fusion produces 3 Claims; AIP Logic specialists draft summaries; M3 guard validates | 3 `Claim` objects + `SUPPORTS`/`WEAKENS`/`CONTRADICTS` links + `EvidenceItem` rows |
| 5. Refusal + Action | `SpecialistReads`, `ActionOptions` | Intent specialist forced to `refused` by M3 layer 2; Collection specialist drafts options | `CollectionAction` objects + `aip_specialist_outputs` row with refusal text |
| 6. Review Memory | `ReviewMemory`, `CustodyQueue`, `ActionOptions` | Operator submits DSL text → M4 parses → ReviewRule persisted via Action; second event re-ranks | `ReviewRule` object + `APPLIES_TO`/`REVIEWED_BY` links on Claim 2 |

### 14.3 Event 1: dark gap + identity churn

| Time UTC | Source | MMSI | Name | Lat | Lon | SOG | COG | Notes |
|---|---|---|---|---|---|---|---|---|
| 2026-04-18 10:12:04 | AISHub fixture | 366700111 | MV CALDERA | 34.87920 | 31.37180 | 12.2 | 83.9 | Normal |
| 2026-04-18 10:15:04 | AISHub fixture | 366700111 | MV CALDERA | 34.88112 | 31.42018 | 12.4 | 84.2 | Last seen |
| 2026-04-18 11:04:22 | BarentsWatch-like fixture | 538009771 | CALDERA M | 34.88910 | 31.91844 | 12.0 | 86.1 | New MMSI |

Anomaly created:

```json
{
  "anomaly_id": "anom:identity_churn:trk-caldera:20260418T1015:1f44",
  "anomaly_type": "IDENTITY_CHURN_PLUS_DARK_GAP",
  "window_start": "2026-04-18T10:15:04Z",
  "window_end": "2026-04-18T11:04:22Z",
  "gap_minutes": 49.3,
  "candidate_old_track_id": "trk:366700111:20260418T0950:20260418T1015:aa01",
  "candidate_new_track_id": "trk:538009771:20260418T1104:20260418T1110:bb02",
  "score": 0.78,
  "status": "OPEN"
}
```

### 14.4 Scoring (M1 + M2, not weighted sum)

**M1 output:**
```json
{
  "track_id": "trk:366700111:20260418T0950:20260418T1015:aa01",
  "gap_seconds": 2958,
  "predicted_state": { "lat": 34.88912, "lon": 31.91801, "v_lat": 0.000018, "v_lon": 0.000142 },
  "predicted_covariance_95_ellipse": "POLYGON((...))",
  "track_b_first_ping": { "lat": 34.88910, "lon": 31.91844 },
  "mahalanobis_distance": 0.83,
  "kalman_likelihood": 0.91
}
```

**M2 fusion:**

| Feature | Value | LLR (nats) |
|---|---|---|
| `kalman_likelihood` | 0.91 | +1.21 |
| `name_similarity` (`MV CALDERA` vs `CALDERA M`) | 0.62 | +0.34 |
| `dimensions_similarity` | 0.83 | +0.41 |
| `mmsi_change` | true | −0.62 |
| `flag_continuity` | false | −0.31 |
| `vessel_type_continuity` | true | +0.18 |
| `gap_corridor_evidence` (Danti) | 0.62 | +0.55 |
| `source_health_score` | 0.35 | +0.10 |
| **Total LLR** |  | **+1.86** |
| **Posterior P(H1)** |  | **0.86 → normalized 0.70 across H1/H2/H3** |

The 0.70 click expands to the LLR table. Hovering each row shows the underlying observations and citations.

### 14.5 Hypotheses

| Hypothesis | Posterior | Supporting | Contradicting | Specialist (post-M3) |
|---|---|---|---|---|
| `SAME_PHYSICAL_VESSEL_CONTINUITY` | 0.70 | Kalman fit, similar name/dimensions, Danti detection | MMSI changed, no visual ID | "Moderate candidate; do not assert identity as fact." |
| `AIS_RECEIVER_OR_COVERAGE_GAP` | 0.18 | Receiver-health partial outage | Danti detection in predicted corridor | "Plausible but not best supported." |
| `DIFFERENT_VESSEL_CROSSING` | 0.09 | MMSI differs | Kalman + dimension fit | "Must remain open." |
| `AIS_SPOOF_OR_BAD_DATA` | 0.03 | Identity churn pattern | No independent spoof evidence | "Insufficient evidence." |

Intent specialist returns `refused` because no `EvidenceItem` of type `INTENT_INDICATOR` is linked to any claim (M3 layer 2). This holds whether the specialist call hit AIP Logic or the cached fixture.

### 14.6 Evidence

```json
{
  "source_document_id": "doc:danti:search-20260502-001:r03",
  "source_type": "SAR_IMAGERY_SUMMARY",
  "observed_at": "2026-04-18T10:47:00Z",
  "geojson": { "type": "Point", "coordinates": [31.6904, 34.8847] },
  "summary": "Fixture: vessel-sized detection near predicted corridor during AIS gap.",
  "source_confidence": 0.62
}
```

Cross-modal (M5): synthetic EO chip at `[31.6904, 34.8847]` → CLIP class match `cargo` (declared AIS type 70 = cargo) → `SUPPORTS` link weighted +0.27 nats.

### 14.7 Collection recommendation

```json
{
  "collection_action_id": "ca:anom-identity-churn-1:sar-rf-sweep:20260502T1407Z",
  "action_type": "REQUEST_SAR_OR_RF_CORROBORATION",
  "priority": "MEDIUM",
  "target_geojson": {
    "type": "Polygon",
    "coordinates": [[[31.55,34.78],[31.98,34.78],[31.98,35.02],[31.55,35.02],[31.55,34.78]]]
  },
  "time_window_start": "2026-04-18T10:15:04Z",
  "time_window_end": "2026-04-18T11:04:22Z",
  "rationale": "Would discriminate same-physical-vessel continuity from receiver outage or different-vessel crossing.",
  "status": "RECOMMENDED_REQUIRES_OPERATOR"
}
```

### 14.8 Operator rule (M4 DSL)

Operator types into `RuleEditor` (Tier A); chevrotain parses live in the browser; `saveReviewRule` Action persists to Foundry:

```
WHEN gap_minutes >= 20
 AND candidate_continuity_score >= 0.65
 AND danti_geo_time_corroboration == true
 AND aoi_id == "aoi:alara-eez-box-01"
THEN boost("REQUEST_SAR_OR_RF_CORROBORATION", +1)
```

Parsed and persisted as `ReviewRule rr:watchfloor:dark-gap-sar-first:v1` per §13.5.

### 14.9 Event 2 with rule applied

| Time UTC | Source | MMSI | Vessel | Event |
|---|---|---|---|---|
| 2026-04-18 12:20:00 | AISHub fixture | 271990222 | MV HARBOR KITE | Last AIS point |
| 2026-04-18 12:52:00 | Danti fixture | unknown | vessel-sized detection | Detection in predicted corridor |
| 2026-04-18 13:05:00 | AIS fixture | 271990222 | MV HARBOR KITE | Reappears |

Without rule: ranking = `monitor_only > request_eo_sar > escalate_watch_officer`, top action `monitor_only`.
With rule applied (DSL evaluator matches conditions): `request_eo_sar` boosted +1, becomes top action. Both `APPLIES_TO` and `REVIEWED_BY` links written.

This is the make-or-break moment from `SeaForge_Sequencing_Plan_v2.md` ("a second event card shows a changed recommendation because of a human review rule"). Everything else in the demo supports this.

### 14.10 Provenance trace

```json
{
  "collection_action": "ca:anom-darkgap-2:sar-rf-sweep:20260502T1425Z",
  "trace": [
    { "step": 1, "object": "ca:anom-darkgap-2:sar-rf-sweep:20260502T1425Z", "role": "selected action", "prior": null, "delta": null, "posterior": null },
    { "step": 2, "object": "claim:anom-darkgap-2:custody_hypothesis:h1", "role": "triggered by claim", "prior": 0.50, "delta": +1.86, "posterior": 0.70 },
    { "step": 3, "object": "ev:danti:9912:0001", "role": "evidence (SUPPORTS)", "prior": null, "delta": +0.55, "posterior": null },
    { "step": 4, "object": "anom:dark_gap:trk-271990222:20260418T1220:cc90", "role": "evidence (DERIVED_FROM)", "prior": null, "delta": null, "posterior": null },
    { "step": 5, "object": "ais:aishub:271990222:20260418T122000Z:3ac1", "role": "raw observation", "prior": null, "delta": null, "posterior": null },
    { "step": 6, "object": "rr:watchfloor:dark-gap-sar-first:v1", "role": "reviewed by prior rule", "prior": null, "delta": null, "posterior": null },
    { "step": 7, "object": "claim:anom-darkgap-2:custody_hypothesis:h1", "role": "rule applied to claim", "prior": null, "delta": null, "posterior": null }
  ],
  "ai_outputs": [
    { "model_or_logic_version": "aip-logic:hypothesis-summarizer@0.1.0", "refusal": "Insufficient evidence to assert intent." }
  ]
}
```

The 5-line collapsed view is the default; "expand math" reveals the full table with deltas.

---

## 15. Demo invariants

These cannot fail. Every test, rehearsal, and integration step exists to protect them.

1. **Persistent shell** — judge never sees a page navigation; substrate / stage / working panel / command line always visible (v2 PRD §4).
2. **First event must show contested evidence** — at least one `WEAKENS` or `CONTRADICTS` link visible in the provenance trace.
3. **Second event must visibly differ from the first** — `ReviewRule R-001` applied via `APPLIES_TO` and `REVIEWED_BY` links, action ranking changed. This is the make-or-break moment per `SeaForge_Sequencing_Plan_v2.md`.
4. **The `0.70` is derivable** — clicking it reveals LLR contributions whose sum reproduces the displayed posterior within 1e-6.
5. **Refusal is earned** — adding a fabricated INTENT_INDICATOR observation flips the intent verdict from `refused` to a cited verdict; removing it reverts. M3 guard fires identically against AIP Logic output, fixture cache, and fallback model output.
6. **Off-script perturbation works** — a third vessel injected during demo updates ranking without exception.
7. **Live rule dictation works** — a judge-dictated DSL rule parses, evaluates, and changes ranking without code changes.
8. **`Ctrl+Shift+R` reset** — clears scenario state and re-seeds from fixtures.

---

## 16. Test plan

| Test | Module | Definition of done |
|---|---|---|
| `adapter_normalizes_aishub_human_json` | adapters | Real source schema handled. |
| `adapter_fixture_mode_round_trips` | adapters | Fixture mode produces identical envelopes across runs. |
| `marinecadastre_uppercase_and_2025_snakecase_both_parse` | adapters | Schema drift handled. |
| `bad_heading_511_becomes_null_quality_flag` | adapters | AIS sentinel logic. |
| `track_ids_are_stable_across_replay` | replay | Deterministic replay. |
| `kalman_likelihood_decreases_with_distance` | M1 | Mahalanobis scales correctly; reproducible. |
| `kalman_predicts_event1_track_b_inside_ellipse` | M1 | Track B emerges within 95% ellipse. |
| `kalman_browser_safe_matches_server` | M1 | `shared/scoring/kalman.ts` produces same output as server import. |
| `bayes_posteriors_sum_to_one` | M2 | Sum = 1 ± 1e-6 across H1/H2/H3. |
| `bayes_contributions_match_posterior` | M2 | Sum of LLR equals log posterior odds. |
| `m3_guard_refuses_below_citation_threshold` | M3 | < 2 citations → forced refused. Tested against AIP, Anthropic, Codex, fixture cache. |
| `m3_guard_intent_refuses_without_indicator` | M3 | No INTENT_INDICATOR linked → forced refused. |
| `m3_guard_supports_above_citation_threshold` | M3 | ≥ 2 valid citations + supporting prompt → can support. |
| `aip_logic_smoke` | infra | Tier B can call an AIP Logic function and receive structured output. |
| `dsl_parses_r001` | M4 | R-001 DSL text parses. |
| `dsl_evaluator_blocks_action` | M4 | Active R-001 + matching claim → escalate removed from ranking. |
| `dsl_rejects_invalid_grammar` | M4 | Returns structured error with line/col. |
| `dsl_browser_and_server_agree` | M4 | Frontend rule editor and server evaluator parse to identical AST. |
| `cross_modal_class_match_emits_link` | M5 | CLIP disagrees with declared AIS class → CONTRADICTS link. |
| `perturbation_reorders_ranking` | M6 | Injected vessel changes top action without exception. |
| `provenance_trace_includes_weakens_or_contradicts` | M7 | First-event trace has at least one such link. |
| `provenance_trace_includes_reviewed_by_on_event_2` | M7 | Second-event trace has REVIEWED_BY + APPLIES_TO. |
| `provenance_math_reproduces_posterior` | M7 | Sum of deltas matches displayed posterior within 1e-6. |
| `spine_traceback_returns_chain` | spine | `graph-spine/provenance.ts` traceBack returns ordered chain on fixture pack. |
| `spine_apply_review_rules_changes_recommendation` | spine | `graph-spine/review-memory.ts` produces second-case rule application. |
| `spine_to_ontology_round_trip` | spine + Ontology | Every spine node type round-trips through maritime adapter to Ontology object type. |
| `palantir_smoke` | infra | Read object, write action, create link, call function, call AIP Logic function. |
| `demo_determinism` | infra | Same scenario_run_id + fixtures → same IDs and ranking. |
| `local_mirror_action_queue_replays` | infra | Queued Actions replay successfully into Foundry when access returns. |

---

## 17. Failure modes and fallbacks

| Failure | Fallback |
|---|---|
| **AIP rate-limited or down** | Cached AIP output replayed from `fixtures/maritime/specialist-reads.json`; M3 guard validates citations on load identically to live output. |
| **No Danti access** | `raw_danti_results_fixture` clearly labeled fixture; supplement with Exa or static OSINT. Danti adapter interface ready. |
| **No Ontology write permission** | Foundry datasets for raw/curated truth; local mirror for objects/links/actions; show "Ontology-ready schema" + queued Action envelopes. |
| **No AIP custom workflow permission** | Anthropic/Codex behind same `Specialist` interface; M3 guard wraps them identically. |
| **Palantir platform slow** | Local replay + UI; batch outputs to Foundry only at milestones; avoid live dependency during judging. |
| **AIS API unavailable** | MarineCadastre archive subset + AISHub/BarentsWatch-shaped fixture. Adapter contract makes source replaceable. |
| **Network failure during judging** | Offline local mirror + fixture replay + precomputed provenance JSON. No external API live calls. |
| **Tier B unreachable** | Frontend imports browser-safe M1/M2/M4/M7 from `shared/`; renders fixture cards directly. |
| **Frontend behind schedule** | Foundry Object Explorer/Map/Workshop if available; otherwise Swagger/Postman + JSON provenance + minimal map. |
| **Streaming dataset unavailable** | Land live/poll data as append-only batch datasets. Streams nice, not required. |
| **Actions cannot be configured** | Store `OperatorDecision`, `ReviewRule`, `CollectionAction` as curated/edit datasets; show Action API payload shape. |
| **Mentors cannot approve external API secrets** | Manual upload/export fixtures. Do not burn time on secrets. |
| **AIP output inconsistent** | Freeze deterministic scores; AIP only provides wording. Cache AIP draft by anomaly ID. |
| **Codex/Anthropic rate-limited** | Pre-cache specialist responses for the demo scenario; live calls only for perturbation. |
| **Danti/OSINT result weak** | Refusal becomes a feature: "insufficient evidence; recommend collection." |
| **Frontend itself broken** | Screen recording fallback (Shayaun owns per Impl Plan v2 §6). |

The two things that cannot fail:
1. The first event must show contested evidence — at least one `WEAKENS` or `CONTRADICTS` link in the provenance trace.
2. The second event must visibly differ from the first because `ReviewRule R-001` applied through `APPLIES_TO` and `REVIEWED_BY`. This is the v2 sequencing plan's "one thing to protect."

---

## 18. Mentor questions for Day 1

Validate Palantir assumptions before building. AIP developer access is confirmed; the rest still needs validation.

1. Which enrollment/project should I use, and do I have permission to create datasets, streaming datasets, Ontology object types, link types, and Actions?
2. AIP custom workflow access is confirmed at developer level — any quotas or rate limits on AIP Logic calls during the hackathon weekend?
3. Can I publish TypeScript v2 Functions and wire them to function-backed Actions, or only simple Action rules?
4. Fastest supported path for external code to write into Foundry: dataset upload, stream `publishRecord`, OSDK, Action API, or manual upload?
5. Service token / OAuth client for backend? What scopes for datasets, streams, Ontology reads, AIP Logic calls, and Actions?
6. Are streaming datasets available with JSON/struct schema for AIS events?
7. Can I create geospatial properties (`geopoint`, `geoshape`) and use Map/Workshop to display Ontology objects?
8. Object-backed vs dataset-backed links? For many-to-many, do I generate join tables manually?
9. Where should action-backed edits land? Preferred pattern for `OperatorDecision`, `ReviewRule`, `CollectionAction`?
10. Can AIP Chatbot tools execute Actions with user confirmation? Wiring this to the Command Line region of the v2 shell.
11. Can AIP Logic produce Ontology edits, or must edits stage through Actions only?
12. Restrictions on Exa, Shodan, Danti, public AIS APIs from event network or Foundry environment?
13. Will Danti provide an API key, export format, or just UI access? What result fields can I count on?
14. Is Palantir CASK / edge hardware available? What output format: file, HTTP, MQTT, Foundry stream?
15. Recommended way to demonstrate Data Lineage for a small pipeline?
16. Can I apply markings or object/property security policies for demo data?
17. Build quotas, transform runtime limits, stream rate limits?
18. Can mentors pre-create an Ontology skeleton if my permissions lag?
19. Fastest "Palantir-native proof" judges will recognize: Object view, Workshop app, Map layer, Action audit, AIP Logic function, Data Lineage graph?
20. If permissions fail, will judges accept a local mirror plus Foundry-ready schemas and queued Action envelopes as a fallback demonstration?

---

## 19. Technical differentiators

What a probing judge actually verifies.

| Differentiator | What to show | Backed by |
|---|---|---|
| **Real probabilistic custody** | Click 0.70 → LLR contribution table; predicted ellipse on map; Track B inside ellipse | M1, M2 |
| **Earned refusal, not labeled** | Toggle INTENT_INDICATOR observation; intent specialist flips `refused ↔ supported`; same guard fires against AIP Logic, fixture cache, and fallback models | M3 |
| **Live rule dictation** | Judge dictates DSL rule; system parses + applies + re-ranks live | M4 |
| **Real cross-modal fusion** | EO chip class disagrees with declared AIS type → CONTRADICTS link with weight | M5 |
| **Off-script resilience** | Inject third vessel mid-demo; ranking re-orders without break | M6 |
| **Math-flow provenance** | Trace expansion shows prior → delta → posterior at every node | M7 |
| **Ontology-backed provenance** | Click Anomaly → Claim → EvidenceItem → AISMessage → raw hash | Ontology |
| **AIP Logic specialist + structural guard** | AIP draft is governed by M3 guard before persistence; show audit row in `aip_specialist_outputs` | AIP + M3 |
| **Multi-source normalization** | Same Observation contract from MarineCadastre, AISHub, BarentsWatch, Danti, edge | Adapter layer |
| **Competing hypotheses** | Three Claims with support and contradiction, never collapsed to one | Ontology + M2 |
| **Deterministic replay** | Reset and replay live; same IDs and ranking every time | replay/clock |
| **Human review memory** | Operator rule from Event 1 changes Event 2 recommendation | M4 + ReviewRule |
| **Domain-neutral spine** | `graph-spine/` has zero maritime nouns; same shape projects into other verticals | Spine schema |
| **Edge/fallback strategy** | Same adapter/sink contract writes to Foundry or local mirror | OperationalStore |
| **Palantir-native object/action proof** | Actions create `OperatorDecision`, `ReviewRule`, `CollectionAction`; AIP Logic functions visible in Foundry | Ontology Actions + AIP |
| **Persistent shell** | No page navigations during demo; substrate / stage / working panel always visible | v2 PRD §4 |
| **Testable data contracts** | Adapters and scoring tests pass without UI | Test plan |
| **AI bounded by evidence** | Specialist verdict transitions match each layer of M3 guard | M3 |
| **Security posture** | Markings + lineage + property security designed even on unclassified demo data | Foundry security |

---

## 20. Out of scope

- Live multi-hypothesis tracker (JPDA / MHT).
- Autonomous threat attribution or intent inference. Explicitly refused — this is the IP beat.
- Cloud deploy. Local dev server only.
- Full Danti / Shodan / ADS-B integrations as live default. Adapters exist in fixture mode; live mode only as off-script Q&A demonstration.
- Production-grade auth, rate limiting, SSO. Demo posture.
- Real-time satellite tasking. Recommendations only.
- Full visual graph explorer (v2 PRD calls this bonus, not MVP).
- Tray interaction (v2 PRD calls this bonus).
- Full command-line intelligence (v2 PRD allows static affordance for MVP; AIP Chatbot Studio bridge is stretch).
- SeaForge_TDD_neo4j_original (archived; pre-Foundry pivot).

---

## 21. References

Primary (canonical for product shape):
- `SeaForge_PRD_v2 (1).md` — product surface, shell, six states, scenario beats, success criteria
- `SeaForge_Implementation_Plan_v2.md` — file structure, component model, owner lanes, hour-by-hour gates
- `SeaForge_Sequencing_Plan_v2.md` — phase gates, make-or-break moment

Engineering substrate:
- This document (`TECHNICAL_PLAN.md` v3.0)
- `details.md` — hackathon brief (3rd Annual National Security Hackathon, Army xTech, Shack15 SF, May 2–3 2026)

Legacy / superseded:
- `SeaForge_PRD.pdf` — pre-v2 product doc; v2 PRD supersedes for product shape, this doc supersedes for engineering
- `SeaForge_TDD.docx` — Palantir-native architecture doc; consistent with v3 §7–§9
- `SeaForge_TDD_neo4j_original.docx` — archived, pre-Foundry pivot

Platform docs:
- Palantir Foundry: datasets, streams, Pipeline Builder, Ontology, Actions, Functions, AIP Logic, AIP Chatbot Studio, Data Lineage, Markings, OSDK
- Palantir Edge AI / connected-edge positioning (CASK)
- Anthropic SDK: tool use + structured outputs (fallback specialist runtime)
- OpenAI Codex: structured outputs (fallback specialist runtime)

Pitch lineage talking points (per Impl Plan v2 §8 Phase 5 rehearsal): portability beat, **DARPA lineage** for the evidence-custody primitive, false-association / JPDA answer.
