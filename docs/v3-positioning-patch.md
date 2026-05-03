# SeaForge — v3 Positioning Patch

**Status:** active patch on top of `docs/v2/`. The v2 PRD, Implementation Plan, and Sequencing Plan remain canonical for *build sequencing*. v3 changes the *positioning, track, and one schema delta* without changing owner lanes or phase gates.

---

## 1. The reframe

The Maven Smart System / CJADC2 booth one-pager (NatSec Hackathon, Palantir partner table, May 2 2026) revealed a missing layer in their framing. Their value chain is:

```
data → command + control → operational outcome
```

The whiteboard annotation reformulated it as:

```
X / substrate
→ liminal in-between (signal becomes claim/action)
→ command / control decision
→ Y / changed downstream operating state
```

The unsolved layer is what's *between* substrate and command — the place where contested signals either become commandable or get held in custody. That layer is SeaForge.

**Canonical line (locked):**

> **SeaForge maintains custody of contested targets by protecting the evidence chain before it becomes command action.**

Compressed:

> **Command systems start too late. SeaForge protects the evidence before it becomes command.**

---

## 2. Track posture

| Posture | Track | Use |
|---|---|---|
| Primary submission | **Problem Statement 1 — Sensor Analysis & Integration** | Literal demo fit: *"maintain custody of targets in contested environments."* |
| Secondary narrative | **Problem Statement 3 — Mission Command & Control** | Architecture frame: command-facing knowledge graph, action options. |
| Differentiator layer | **Problem Statement 4 — Digital Defense & Cybersecurity** | Shayaun's lane: signal integrity, spoofing, degraded evidence chains. |
| Mentor escalation | **Problem Statement 5 — General NatSec** | Only if a mentor strongly agrees this is cross-cutting. **10-minute budget.** |

**Decision rule:** Submit under PS1 unless a mentor offers a *strong, unprompted yes* on Category 5. Do not debate this for more than 10 minutes. Ambiguity is more expensive than alignment.

### Why PS1 over PS4

- PS1 gives the demo a literal anchor: *"a target goes dark; a second identity appears; we maintain contested custody."*
- PS4 is the *credibility layer* (Shayaun) but a poor literal anchor — the visible demo is custody, not cyber.
- The cross-cutting argument lives *inside the PS1 pitch* via Slide 2, not in the track choice itself.

### Why not PS3 as primary

- C2 is a crowded room. Many teams will pitch dashboards. SeaForge differentiates *one layer earlier*.
- Submitting as PS1 + framing as "pre-command" lets the C2 language do narrative work without forcing direct comparison to dashboard projects.

---

## 3. Maven posture (Round 1 vs Round 2)

The Maven Smart System / CJADC2 reference is leverage. How aggressively to deploy it depends on which round.

### Round 1 — Maven-invisible

Do **not** name Maven, Palantir, or CJADC2. Use this language:

> "Current command-and-control systems start too late. They assume the signal is already coherent enough to act on. SeaForge starts one layer earlier."

Rationale: Round 1 judging groups are unknown. Some may include Palantir engineers. Naming the elephant unnecessarily costs a Palantir judge's score for no upside in a 3-minute window.

### Round 2 — Maven-explicit, augmenting

If finals are reached, name it carefully and frame as augmenting:

> "Maven Smart System and CJADC2 help commanders act on a shared operational picture. SeaForge augments that stack one layer earlier: it protects the evidence chain before something becomes commandable."

Rationale: Stage context, longer Q&A. Recognition-shock of naming Maven is high-EV with Shield/IQT/DCVC judges who reward landscape literacy. Palantir judges are already on the panel — defuse with "augment, not replace."

**Hard rule:** Never frame Maven as flawed, slow, or wrong. The frame is *layer-before*, not *layer-better*.

---

## 4. Schema delta

The v2 graph spine (`graph-spine/schema.ts`) is correct. v3 adds **one** node type and **one** specialist read.

### New node type: `sourceIntegrityCheck`

```ts
type NodeType =
  | 'observation'
  | 'entity'
  | 'evidence'
  | 'sourceIntegrityCheck'   // ← v3 addition
  | 'anomaly'
  | 'hypothesis'
  | 'claim'
  | 'track'
  | 'actionOption'
  | 'reviewRule'
  | 'case';

interface SourceIntegrityCheck extends BaseNode {
  type: 'sourceIntegrityCheck';
  properties: {
    source_id: string;
    status: 'clean' | 'degraded' | 'contested' | 'unknown';
    indicators: string[];          // e.g., "38-min transmission gap", "MMSI discontinuity"
    confidence?: number;
    rationale: string;
    linked_evidence_ids: string[];
  };
}
```

### Edge additions

The existing v2 edge types are sufficient. `sourceIntegrityCheck` connects via:
- `DERIVED_FROM` → `evidence`, `observation`
- `WEAKENS` / `SUPPORTS` → `claim`, `hypothesis`
- `TRIGGERS` → `actionOption`

### Specialist reads update

v2 had four reads (Kinematics, Identity, Intent, Collection). v3 inserts **Signal Integrity** between Identity and Intent:

```
Kinematics        OK       Track continuity likely preserved
Identity          OK       Metadata conflict: MMSI-111 → MMSI-222
Signal Integrity  CONTESTED   Source chain degraded; single-source confirmation only
Intent            REFUSED  Insufficient evidence to infer hostile intent
Collection        OK       Recommend EO/SAR imagery + second-source confirmation
```

**The Signal Integrity row is Shayaun's surface in the demo.** It is the visible PS4 contribution without pivoting into a generic cyber product.

---

## 5. Demo spine (unchanged from v2, with one beat reframed)

| Beat | What the judge sees | v3 reframe |
|---|---|---|
| 1 | Normal vessel traffic | unchanged |
| 2 | Vessel goes dark | unchanged |
| 3 | Second identity appears | unchanged |
| 4 | Custody hypotheses preserved | unchanged |
| 5 | **Signal Integrity: CONTESTED** | **NEW — Shayaun's beat, between hypothesis and refusal** |
| 6 | Intent: REFUSED | unchanged — but now visibly *triggered by* Signal Integrity status |
| 7 | Collection action recommended | unchanged |
| 8 | Review rule saved | unchanged |
| 9 | Next case recommendation changes | unchanged |

The reframe: *Signal Integrity contested → Intent refuses → Collection redirects.* This makes the refusal *causally legible*, not just a UX choice. Restraint becomes a security feature.

---

## 6. Win-state ladder (graceful fallback)

The big swing is **the category-level reframe**, not a fragile runtime. Build for these win states in order:

**A — Full swing:**
Map replay + evidence graph + Signal Integrity + refusal + Review Memory + second case changed + polished pitch with Maven-augmenting frame in Round 2.

**B — Strong demo:**
Map replay + custody hypotheses + evidence chain + refusal + review rule. Graph traversal partially hardcoded.

**C — Shippable, still memorable:**
One shell with staged states, deterministic data, visible evidence chain, visible refusal, visible second-case change.

**Floor:**
Clickable staged demo with deterministic state transitions and a recorded walkthrough. No live APIs, no live AI, no graph viz.

### Never cut

- dark gap
- second identity
- hypothesis board
- **Signal Integrity row** *(v3 addition)*
- Intent refusal row
- evidence chain
- review rule saved
- next case changed

### Cut before the above

- live LLM
- live AIS
- Palantir runtime integration
- Neo4j
- force-directed graph viz
- tray
- backend
- full command-line intelligence

---

## 7. What v3 does *not* change

- v2 owner lanes (Shayaun = map/replay; Shruti = graph/case/review-memory). Signal Integrity sits inside Shruti's specialist-reads component but the *fixture data* and *technical Q&A* belong to Shayaun.
- v2 phase gates (H3 / H8 / H13 / H20 / H25 / H31).

## 7a. What v3 v2 changes (post-Shayaun-scaffold reconciliation)

At H8 Shayaun pushed a more ambitious scaffold than v3 v1 imagined. The reconciled state:

- **Stack is now three-tier:** Tier A (Vite + React + MapLibre), Tier B (Bun + Hono server with M1–M7 engineered modules), Tier C (Palantir Foundry Ontology + AIP Logic, developer access confirmed).
- **Backend is on the critical path** — overrides the v2 PRD §12 "no backend" line, because AIP access is real.
- **AIP Logic runs the specialists in production**; fixtures replay AIP outputs in demo mode through the same `guard.ts` middleware. Demo critical path = fixtures + structural guard. Live AIP = Q&A fallback only.
- **Refusal is structurally enforced**, not prompt-suggested. `server/src/specialists/guard.ts` runs 7+ layered server-side checks (citation minimum, INTENT_INDICATOR requirement, posterior threshold, source-restriction, question-phrasing-without-evidence). Outputs that fail any layer are forced to `verdict: refused`. This is a stronger pitch beat than v3 v1 imagined.
- **Desktop app via Tauri wrap.** Vite dev server runs inside a Tauri shell. `bun run dev:desktop` launches. Shruti owns visual; Shayaun owns map/replay.
- **Specialist reads grow to 6 rows.** Existing fixture has Kinematics / Identity / Intent / Collection / Visual; v3 adds **Signal Integrity** between Identity and Intent. Visual (M5) and Signal Integrity (v3 patch) are complementary.
- **The Maven contrast pitch is unchanged** — Round 1 invisible, Round 2 explicit-augmenting.
- **The make-or-break beat is upgraded.** v3 v1: *"second case changed by review rule + Signal Integrity contested"*. v3 v2: *"…and refusal is enforced server-side by the guard, not requested."*

See `docs/integration-state.md` for the module → demo-spine → pitch-language map.

---

## 8. Repo file map (v3)

```
liminal-natsec/
├── CLAUDE.md                          # repo-local agent instructions
├── README.md                          # public-facing positioning
├── docs/
│   ├── v2/                            # locked build baseline
│   │   ├── SeaForge_PRD_v2.md
│   │   ├── SeaForge_Implementation_Plan_v2.md
│   │   └── SeaForge_Sequencing_Plan_v2.md
│   ├── v3-positioning-patch.md        # this file
│   ├── v4-judge-calibrated-demo.md    # named persona, procurement path, what-we-don't-do
│   ├── q-and-a.md                     # 30-second answers to predictable judge questions
│   └── round1-round2-script.md        # branched pitch scripts
└── app/                               # to be scaffolded per v2 implementation plan
    └── ...
```
