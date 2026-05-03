# Pattern Port · liminal-prototype → liminal-natsec

**Date:** 2026-05-03
**Source:** `~/liminal/liminal-prototype/cuts/01-slate-tray-speedrun.html` (Maya Chen Speedrun cut), `~/liminal/liminal-prototype/cuts/08-liminal-custody.html` (existing custody cut), `~/liminal/liminal-prototype/index.html` (catalog), `~/liminal/liminal-prototype/design-system/tokens/design-tokens.css`
**Target:** `liminal-natsec/app/src/`
**Lane:** brand + experience refinement. NOT bug-fixes, NOT scope-creep, NOT new components from scratch.

---

## What's already there (don't rebuild)

The Liminal design system is canonical. `design-system/tokens/design-tokens.css` is the single source of truth for color · type · spacing · motion. The natsec app **forked** it instead of consuming it — this doc names what to port back, not what to rewrite.

### The brand register, in 3 sentences

> Warm-but-confident dark · Geist + Newsreader + Caveat · classification tokens · audit ribbon · marginalia.
> Orbital plates with hue-tinted accents (DILIGENCE purple · OUTREACH orange · SYNTHESIS yellow · JUDGMENT green).
> The system speaks in editorial-density: full sentences in italic, marginalia in handwriting, technical readouts in mono caps.

### What `cuts/08-liminal-custody.html` already proves

The full custody application has been prototyped at brand fidelity. Specifically:
- A four-pane shell (named operator + signal sources + case queue + replay beats — left rail) (stage viewport — center) (working panel — right rail) (command line + replay + causal trace — bottom)
- A **GUARD STATE callout** with explicit prose copy: *"The structural guard is standing by. No intent claim has been generated because evidence-type minimums are not yet met."*
- A **REPLAY BEATS** strip (01–05) with one-line summaries — operator/judge sees the demo's narrative arc as they watch
- Specialist Reads as 5 named rows (Track continuity / Identity correlation / Signal integrity / Intent / Action options) with explicit *prose* sentences, not just verdict chips
- Hypothesis cards (H1/H2/H3) with prose explanation + posterior chip
- Audit chain ribbon at bottom — receipts mode, always visible
- Replay-beats strip with named beats (01 GAP DETECTED, 02 NEW IDENTITY NEARBY, 03 GUARD FIRES, 04 SAVE OPERATOR DOCTRINE, 05 PRIOR RULE APPLIED) — readable demo roadmap

**The natsec live app at `:5173` covers most of this functionally but not the brand register.** This doc names which patterns to port and to which natsec surface.

---

## Six high-leverage ports, ranked

### Port 1 · Consume `design-tokens.css` instead of forking it

**Where in prototype:** `design-system/tokens/design-tokens.css` — 970-line single source of truth, 12-wheel hue system, 18-step type scale, intent-named motion durations.

**Where in natsec:** `app/src/styles.css:21–106` — the `:root` block currently defines its own `--color-decision/contested/refused/resolved/substrate/frame/elevated/edge` tokens. These names roughly *map* to prototype hues but the values diverge.

**Port move:**
- Copy `design-tokens.css` into `app/src/design-tokens.css` (or symlink if both repos on the same machine).
- Replace `app/src/styles.css:68–82` with imports + `--color-decision: var(--judgment-strong)` style aliases — keep the natsec semantic names, point them at the canonical 12-wheel values. Existing call sites unaffected.
- Adopt the prototype type scale (`--text-1` through `--text-18`) and spacing scale (`--space-1` through `--space-10`) as the canonical scales.

**Why this first:** every other port is half-quality without it. Once tokens converge, the speedrun cut's warmth + the custody cut's gravity become reachable from the natsec app for free.

**Risk:** zero — token aliases preserve every existing class. The visible change is: warmer black, more confident accents, type scale alignment.

---

### Port 2 · The orbital register-plate vocabulary on Specialist Reads

**Where in prototype:** `cuts/01-slate-tray-speedrun.html:67–120` (orbital rail), and `cuts/08-liminal-custody.html` SpecialistReads section.

**What it is:** The 12 agents are grouped into 4 register-plates (DILIGENCE / OUTREACH / SYNTHESIS / JUDGMENT), each plate hue-tinted, each agent inside its plate with a status glyph (◯ reading · ◉ engaged · ● refused · ⊘ withheld).

**Where in natsec:** `app/src/components/SpecialistReads.tsx` (currently 6 rows of equal weight, no register grouping). The current `.specialist-row__family-pip--guard` class hints at this grouping but the visual is flat.

**Port move:** group the 6 specialist rows visually under 2–3 register plates:
- **DILIGENCE** (Track continuity, Signal integrity) — hue: judgment-tint or diligence-tint per token canon
- **JUDGMENT** (Intent, Identity correlation) — hue: contested when contested, refused when refused
- **SYNTHESIS** (Action options, Visual / cross-modal) — hue: synthesis-tint

Keep the existing row text. Add a thin label + plate edge above each group. Apply hue-tinted left-border to each plate in `--{register}-edge` tokens.

**Why this matters:** the *register-grouping is itself an architectural claim*. "Diligence vs Judgment" tells a judge that the system distinguishes types of work the agents do — Liminal IP-language, not generic ML-pipeline language.

**Risk:** low — additive treatment, doesn't restructure DOM.

---

### Port 3 · GUARD STATE callout with explicit prose

**Where in prototype:** `cuts/08-liminal-custody.html` right-rail, mid-height. A red-tinted callout block:
> **GUARD STATE** **ARMED**
> *The structural guard is standing by. No intent claim has been generated because evidence-type minimums are not yet met.*

**Where in natsec:** Currently the structural guard is signaled only via row treatments (`.specialist-row__family-pip--guard`, `.specialist-row__status--guard`). There's no permanent stateful surface that tells a judge "the guard is active right now, here's why."

**Port move:** Add a `<GuardStateCallout>` component to the working pane, sitting between the SpecialistReads strip and the ReviewMemory section. Renders:
- Title strip: `GUARD STATE` · current state chip (ARMED / FIRING / SUPPRESSED) in `--color-refused` when firing, `--color-resolved` when armed-and-clean
- One-sentence body in italic Newsreader, explaining the current state in plain English
- Body text reads from `guard.ts` response payload — when no specialist has fired refusal yet: *"Standing by. No intent claim generated — citation minimum not met."* When refused: *"Layer 2 fired — INTENT_INDICATOR missing on hostile claim."* When suppressed: *"Refusal suppressed — operator override R-001 active."*

**Why this matters:** the structural guard is the **single most important technical differentiator** per `integration-state.md:74`. Currently it's only visible when something fails. Make it visible always — that's how you sell *"refusal is structurally enforced"* to a Shield/IQT principal who doesn't see a failure beat in the timed pitch.

**Risk:** low — single new component, reads from existing guard payload, no behavior change.

---

### Port 4 · REPLAY BEATS strip · the operator's roadmap

**Where in prototype:** `cuts/08-liminal-custody.html` left rail, below "CASE QUEUE":
> **REPLAY BEATS** STEP 1 OF 5
> 01 · Dark gap · *AIS custody begins before any command action.*
> 02 · Identity churn · *A second MMSI emerges inside kinematic continuity.*
> 03 · Structural refusal · *Signal integrity is contested. Intent cannot pass.*
> 04 · Review memory · *Operator correction becomes durable policy.*
> 05 · Second case changed · *The next ambiguous case inherits the prior rule.*

**Where in natsec:** WorkflowStrip currently shows 4 numbered panes (`01 SUBSTRATE / 02 STAGE / 03 WORKING / 04 COMMAND`) — that's spatial navigation, not narrative beats. Phase pill in topbar shows current phase but not the arc.

**Port move:** Add a `<ReplayBeats>` component to the substrate-pane bottom (below the OSINT Signals feed) OR as the bottom band of the stage viewport (above the timeline). 5 beats with one-line italic copy each, current beat highlighted, beats not-yet-fired dim. Beats key off `mapScenarioState.phase`.

**Why this matters:** the make-or-break demo lasts 3 minutes. A judge who misses one beat has no roadmap to recover. The replay-beats strip is the **demo's table-of-contents, always visible**. Also: the beat copy itself is *Liminal-voice italic prose* — that's where the brand lives in this surface.

**Risk:** low — pure reading surface; no interaction model change.

---

### Port 5 · Audit chain ribbon at the bottom

**Where in prototype:** `cuts/01-slate-tray-speedrun.html` bottom, `cuts/08-liminal-custody.html` bottom. A persistent thin band:
> AUDIT CHAIN · 09:50:00 drop · values doc jan → slate · 09:51:00 ...

**Where in natsec:** Currently the bottom band is the CommandLine (`> /ask <question>, /help, /reset, ...` + timestamp + `seeded` token). Functional but doesn't express *audit-trail* — and audit-trail is the Liminal-IP move.

**Port move:** Either (a) split CommandLine into two stacked rows — input on top, audit ribbon below; (b) compose the audit ribbon ABOVE CommandLine as a 20px-tall persistent strip showing the last 3 audit events (`drop`, `link`, `decide`, `rule_applied`, `refusal_fired`).

**Why this matters:** Liminal's positioning is *"every recommendation traces back to evidence."* The audit ribbon is that claim made visible at all times. It's also a beat-driven typography surface — events appear in real time as the replay advances, giving the demo a continuous chyron of "the system is keeping score."

**Risk:** medium — needs a small audit-event store (already exists conceptually in `provenance.ts`); the visible component is straightforward.

---

### Port 6 · Marginalia in the named-operator card

**Where in prototype:** Speedrun cut left rail · "ACTIVE READS" with case row + tile counts + relative time, and the case detail with marginalia in italics + handwritten Caveat annotations on the right margin (e.g., "*the pattern is selecting for people who agree with you*" highlighted in red).

**Where in natsec:** NamedOperatorCard exists (`app/src/components/NamedOperatorCard.tsx`) but renders only as a static italic paragraph at top of substrate pane.

**Port move:** Augment NamedOperatorCard with two beats:
1. The current static italic prose stays at the top (canonical persona).
2. **One Caveat-handwritten margin note that updates per phase** — small, off to the right, in `--color-contested` or `--color-refused`. Examples:
   - P1 (cold open): *"second source first."*
   - P3 (signal integrity contested): *"the chain isn't holding."*
   - P5 (refusal): *"don't escalate yet."*
   - P6 (rule applied): *"R-001 carries forward."*

**Why this matters:** marginalia is the most-Liminal move in the inspo set + the speedrun cut. It's also the cheapest way to encode *operator interiority* — a judge sees the system surfacing not just data but *the watch officer's judgment, in their own voice*.

**Risk:** low — phase-keyed string lookup, single component.

---

## Anti-ports (look at these, don't copy them)

These are present in the prototype but should NOT port to natsec:

- **The 12-agent orbital diagram** — built for Maya Chen's founder-OS vault context. The natsec specialist set is fundamentally smaller (5–6) and the metaphor is wrong (custody is hierarchical and military, not 4-register editorial).
- **The personal/team/business tabs** — speedrun-cut-specific, founder-OS register. Wrong sub-domain.
- **The "tray" right rail** with drop-window-here affordance — that's vault-of-windows, not custody-record. Different IP.
- **Newsreader for body copy at large sizes** — beautiful in editorial register, less readable for dense operator-grade lists. Keep mono primary; lift to Newsreader only for hero verbs and italic prose pull-quotes.
- **The `<dialog>`-style modals** — none observed in the natsec spec; demo runs without modal interruption per never-cut invariants.

---

## Order of operations

| Window | Port | Touches |
|---|---|---|
| 1 | Port 1 · token consumption | `app/src/design-tokens.css` (new), `app/src/styles.css:21–106` |
| 2 | Port 6 · marginalia | `NamedOperatorCard.tsx` |
| 3 | Port 4 · ReplayBeats strip | new `ReplayBeats.tsx` + `SubstratePanel.tsx` integration |
| 4 | Port 3 · GuardStateCallout | new `GuardStateCallout.tsx` + `WorkingPanel.tsx` integration |
| 5 | Port 2 · register-plates | `SpecialistReads.tsx` group treatment + new CSS |
| 6 | Port 5 · audit ribbon | `CommandLine.tsx` augmentation |

Each port is independently shippable. Each one Liminal-ifies a specific natsec surface without touching guard logic, fixture format, or the structural-refusal beat.

---

## Anchor screenshots saved alongside this doc

- `proto-01-speedrun-1440.png` — speedrun cut at 1440 viewport
- `proto-02-custody-1440.png` — existing Liminal Custody cut at 1440
- `proto-03-index-catalog-1440.png` — prototype catalog UI
- `audit-01..05` — natsec live-app audit screenshots for comparison

---

## Provenance

- `cuts/08-liminal-custody.html` proves the full Liminal Custody experience as a Liminal-branded artifact already exists at high fidelity.
- `design-system/tokens/design-tokens.css` is the canonical token contract.
- `cuts/01-slate-tray-speedrun.html` shows the editorial-density brand register at full force.
- `INSPO_TO_SURFACE_MAP.md` (companion) has 14 inspo sources whose moves now land downstream of these ports.
- `AUDIT_AND_REFINEMENT.md` (companion) has 18 defects in the natsec live app that these ports either resolve or don't touch.
