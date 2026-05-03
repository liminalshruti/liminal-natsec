# Maven Smart System — teardown + framework upgrade

**Status:** input artifact for `liminal-custody-onepager.md`. Read this to understand *why* our one-pager is structured the way it is.

Sources read May 2 2026:
- `defensescoop.com/2026/04/15` — Pentagon program transition under Feinberg
- `blog.palantir.com` — Palantir's own framing for the Alliance
- `techpolicy.press` — critical perspective citing Manson book
- `docs/reference/maven-onepager-annotated.pdf` — Shruti's annotated photograph of the booth one-pager

---

## 1. What Maven says about itself

### Tagline

> **"The Foundational AI-Enabled Software Platform for CJADC2."**

(From the booth one-pager, also echoed in Palantir blog as "AI-powered data integration and decision support system.")

### Core claim

Maven Smart System fuses disparate military systems and intelligence sources into a single visualization tool, and **compresses the military's processes for finding and striking targets**. It reduces sensor-to-shooter timelines from hours to minutes or less.

### Operator language (Pentagon CDAO, Cameron Stanley)

> "Left click, right click, left click. Magically, it becomes a detection."
>
> "From identifying the target to coming up with a course of action to actioning that target — all from one system."

### Capabilities claimed

1. Real-time intelligence fusion from satellite imagery and drone feeds.
2. Automated detection and analysis at scale ("surface key detections from a pool of thousands").
3. Theater-to-tactical command integration for drone tasking.
4. AI-assisted course-of-action generation and simulation.
5. Ontology-based data modeling.
6. AIP Agents performing natural language queries.
7. Multi-vendor integration (Safran.AI, Quantum Systems, Hadean).
8. Centralized model hub hosting multiple specialized LLMs.

### Scale / procurement

- $480M five-year IDIQ (May 2024) → $1.3B ceiling through 2029 (May 2025).
- Initially 5 combatant commands → "the entire department."
- Transitioning to formal program of record by FY-end (Feinberg memo, March 9 2026).
- Administration moves from NGA → CDAO MSS Program Office by Sept 30.

---

## 2. Maven's framework, named

The booth one-pager is structured as **four feature panels** under category headers:

```
JOINT  |  ALL DOMAIN  |  COMMAND  |  CONTROL
[ feature panel ]  [ feature panel ]  [ feature panel ]  [ feature panel ]
```

This is a **1990s enterprise-software design pattern**: features-under-categories, screenshots-as-evidence, scale-claims-as-credibility. It pitches the *platform* and assumes the operator problem is solved.

The shape says: *"we integrate things that should be integrated, and we accelerate things that should be accelerated."*

What's missing structurally:

- **No named operator.** No persona, no scenario, no specific decision moment.
- **No restraint.** No language about when the system *should not* act, refuse, or hold.
- **No procurement integration map.** Maven implies it *is* the platform — there's no "where this slots in" diagram because Maven claims the slot.
- **No framework for evidence quality.** Speed-to-action is the value claim; signal integrity is not addressed.
- **No "what we don't do."** Every capability is listed; no boundary is drawn.

---

## 3. Where Maven is structurally weak — and how we exploit it

These are not weaknesses of *Maven the product*. They are weaknesses of *Maven the one-pager as a procurement-pitch artifact*. They are exactly what our one-pager structurally answers.

### Weakness 1 — Speed framing assumes signals are commandable

Maven's headline value is sensor-to-shooter compression. **That's a downstream metric.** It's only meaningful if the upstream signal is trustworthy.

> CENTCOM: "AI systems help speed up processes that used to take days and hours down sometimes to as little as seconds."
>
> Manson: this acceleration creates "friction removal" — decisions happen faster than human deliberation typically allows.

The reliability gap: **early Maven deployments showed target-ID failures.** Initial Somalia algorithms had "flickering detection" frame-by-frame. Ocean spray broke ship-tracking algorithms. *The data plane is contested before the kill chain compresses.*

**Our move:** position one layer earlier. We're the layer that decides whether the signal is *commandable enough* for Maven to compress.

### Weakness 2 — "Human in the loop" ≠ "appropriate human judgment"

Pentagon officials publicly say "human in the loop." DoD policy actually mandates only "appropriate levels of human judgment" — a meaningful distinction Manson surfaces.

Manson documents that in Maven's decision-making cycle, "computers are replacing humans at three of those places where a human is involved and a human is becoming supervisory in one." Three of four decision points are now machine-mediated.

**Our move:** make refusal a *server-side invariant*, not a human-judgment check. The structural guard (`server/src/specialists/guard.ts`) refuses before AI output can persist. Restraint is enforced, not requested.

### Weakness 3 — Ontology depth without evidence custody

Palantir emphasizes ontology-based data modeling and AIP agents. Both are real strengths. But **the ontology models the world after signals are committed to it** — there's no surface for *contested* state, *competing hypotheses*, or *signals that should not yet enter the operational picture*.

**Our move:** the domain-neutral `graph-spine/` adds first-class `hypothesis`, `claim`, `evidence`, `sourceIntegrityCheck`, and `reviewRule` node types. Custody hypotheses live in the graph as preserved ambiguity, not flattened to a single ontological commitment.

### Weakness 4 — Anthropic dispute reveals an open contract on autonomy

The Anthropic vs. administration dispute (2025–2026) was about whether Anthropic models would support "fully autonomous weapon systems" and "domestic mass surveillance." Anthropic refused. **The fact that this dispute exists at all means the Maven contract envelope around autonomy is not yet settled.**

**Our move:** "we do not infer hostile intent / we do not attribute / we do not auto-escalate" turns refusal into a *policy posture* that aligns with where defense AI procurement is tightening, not loosening.

### Weakness 5 — Multi-vendor integration without integrity governance

Maven integrates Safran.AI, Quantum Systems, Hadean — multiple model providers, multiple specialized LLMs in a centralized hub. **No public framing of how cross-vendor model outputs are validated against each other.**

**Our move:** the structural guard validates *every* specialist output identically — whether it's AIP Logic, Anthropic, OpenAI, or a future vendor. The guard is the integrity layer Maven's multi-vendor architecture implicitly needs.

---

## 4. Framework upgrade — from feature-panels to operator-decision

Maven's framework is **categories × features**. Ours is **operator decision × evidence layer**.

### Maven's frame

```
JOINT          ALL DOMAIN          COMMAND          CONTROL
features...    features...         features...      features...
```

Reads as: *here are the things we do.*

### Our frame

```
SUBSTRATE       CUSTODY              REFUSAL              REVIEW MEMORY
the X           the in-between       the structural       the Y
                (preserved           invariant            (durable
                 hypotheses)         (server-side guard)   correction)

→ named operator → specific decision → procurement integration map →
→ what we do not do → architectural posture →
```

Reads as: *here is the operator decision we are responsible for, and here is the layered architecture that makes that decision safe.*

This is one generation ahead of features-under-categories. It's how a 2026-grade defense product pitches: substrate → loop → action → memory, with a named persona and a named decision at the center.

---

## 5. Insight ladder — five rigor moves to uplevel the pitch

Each one is a structural improvement over Maven, *and* a structural answer to one of Maven's 5 weaknesses above.

### Insight 1 — Speed is downstream of integrity

Maven sells sensor-to-shooter compression. **The value of compression collapses to zero if the signal entering the chain is wrong.** A 30-second decision on a spoofed track is worse than a 30-minute decision on a clean one. Our pitch leads with the *upstream* problem: what is *allowed* to enter the kill chain in the first place?

### Insight 2 — Refusal is a procurement asset, not an ethical hedge

Most defense pitches treat AI safety / responsible AI as a compliance checkbox. **The Anthropic dispute proves it's a procurement asset.** The teams that articulate restraint as a designed output, with structural enforcement, are the ones positioned for the next contract envelope as DoD policy tightens around autonomy. Refusal is not a brake. It is a feature DoD wants and most vendors can't offer.

### Insight 3 — Evidence custody is a governable category, not a UX choice

Maven treats data fusion as the value. **Data fusion is a transformation; evidence custody is a state.** The state of "this signal is contested, this hypothesis is preserved, this claim is unsupported" is *governable* — it can be audited, marked, and policed. Treating evidence custody as a first-class governable category (vs. a UX flourish on top of fused data) is the structural move.

### Insight 4 — Operator persona is the integrity test of a defense pitch

If a pitch can't name the operator, the unit, the time of day, and the specific decision, it's a platform pitch — not a product pitch. **Maven's one-pager doesn't name a single operator.** Ours opens with: *"A maritime watch officer at U.S. 5th Fleet, 0200 local, monitoring AIS disruptions near a strategic chokepoint in the Strait of Hormuz."* Specificity is the integrity test.

### Insight 5 — Procurement integration map is what separates a startup from a vendor

Maven *is* the platform — its one-pager doesn't show where it slots in because it claims the slot. **Most startups try to copy this posture and fail**, because they don't have the platform credibility. The structural move for a startup is the opposite: show the integration map. *"We slot between AIS / OSINT / sensor feeds and existing C2 stacks. We do not replace Maven. We protect the evidence chain before it becomes commandable."* This is procurement-mature language.

---

## 6. Lines that land

Pulled from the Maven analysis, sharpened for our pitch:

| Maven says | We say |
|---|---|
| "Compress sensor-to-shooter timelines." | "Compression assumes a signal worth compressing." |
| "Foundational platform for CJADC2." | "Maven is the foundation. We are the substrate." |
| "Magically, it becomes a detection." | "Detection without custody is a confidence trick." |
| "Speed is the value." | "Speed is downstream of integrity." |
| "Human in the loop." | "Refusal is a server-side invariant." |
| "Ontology-based data modeling." | "Domain-neutral evidence custody, projected to ontology." |
| "Course-of-action proposals." | "Bounded action options, traceable to evidence." |

These lines are seeded into `docs/round1-round2-script.md` and `docs/q-and-a.md`.

---

## 7. The insight that sits underneath everything

**Maven's one-pager is the artifact of a vendor that already won the slot.**

When you've already won, your one-pager can afford to be a feature list — the procurement is locked, you're not selling, you're announcing. Maven Smart System's one-pager is a victory lap.

**A startup pitching against Maven cannot afford a feature list.** A startup has to show the layer they're claiming, the operator they're serving, the decision they're protecting, and the place they slot in. Every one of those is a structural answer to "why don't we just buy more Maven?"

That answer — *"because Maven assumes the layer below it works, and the layer below it is contested"* — is the company.
