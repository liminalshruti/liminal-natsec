# Maven Smart System — analysis and complementary positioning

**Status:** input artifact for `liminal-custody-onepager.md`. Captures how we read Palantir's Maven Smart System and where Liminal Custody sits as a complementary layer beneath it.

Maven is a category-defining product and the Pentagon's program of record for CJADC2. This document is not a critique of Maven — it is a structural analysis of where Maven assumes upstream conditions are met, and where Liminal Custody operates to ensure those conditions actually are. Our positioning is *complement, not compete.*

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

Maven Smart System fuses disparate military systems and intelligence sources into a single visualization tool, and reduces sensor-to-decision timelines from hours to minutes (Pentagon framing, per `defensescoop.com`). The headline value is decision compression at scale.

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

## 3. Where Liminal Custody complements Maven's architecture

Maven's value claim is integration speed and decision compression *after* signals reach command. That value is real and well-defended. The questions Maven's architecture intentionally does not address are the questions our architecture is designed for. The five sections below name those open layers — these are not Maven's failures; they are the surface area for a complementary product.

### Layer 1 — Decision compression assumes signals are commandable

Maven's headline value is sensor-to-decision compression. That is a downstream metric — it depends on upstream signal trustworthiness.

> CENTCOM: "AI systems help speed up processes that used to take days and hours down sometimes to as little as seconds."

Field reporting documents that early sensor-fusion deployments faced reliability gaps under environmental conditions (frame-by-frame flicker on legacy algorithms; environmental interference on maritime tracking). *The data plane is contested before decision compression begins.*

**Our position:** we operate one layer earlier. We are the layer that decides whether a signal is *commandable enough* for downstream systems like Maven to compress against.

### Layer 2 — Structural enforcement of restraint

DoD policy mandates "appropriate levels of human judgment" in AI-assisted decision systems. In practice, "human in the loop" can mean a supervisory role over machine-mediated decisions across multiple steps of a workflow. As decision compression accelerates, the surface area for AI to overclaim grows.

**Our position:** we make refusal a *server-side invariant*, not a human-judgment check. The structural guard (`server/src/specialists/guard.ts`) refuses to persist AI outputs that fail citation, evidence-type, or confidence checks. Restraint is enforced in code, not relied on as policy. This complements Maven's decision-support layer with a verifiable upstream constraint.

### Layer 3 — Evidence custody as a first-class state

Palantir's ontology-based data modeling and AIP agents are well-built. The ontology naturally models the world *after* signals are committed to operational state. The complementary surface — *contested* state, *competing hypotheses*, *signals not yet ready to enter the operational picture* — is not the focus of a command-layer product.

**Our position:** the domain-neutral `graph-spine/` adds first-class `hypothesis`, `claim`, `evidence`, `sourceIntegrityCheck`, and `reviewRule` node types. Custody hypotheses live in the graph as preserved ambiguity. When custody resolves, the resolved state can flow into a downstream Maven/Foundry ontology cleanly. We model the layer before commitment; Maven models the layer after.

### Layer 4 — Policy posture aligned with tightening AI procurement

Defense AI procurement is moving toward more explicit boundaries on autonomy and inference. Public discussion across model providers, defense primes, and the DoD has surfaced the difficulty of articulating where AI assistance should stop short of autonomous action.

**Our position:** "we do not infer hostile intent / we do not attribute / we do not auto-escalate" turns restraint into a *policy posture*, named on the product surface. This is procurement-aligned with the direction defense AI guidance is heading.

### Layer 5 — Cross-vendor integrity validation

Maven integrates multiple model providers (Safran.AI, Quantum Systems, Hadean) and a centralized model hub. As multi-vendor model integration grows, the surface area for inconsistent outputs across providers grows with it.

**Our position:** the structural guard validates *every* specialist output identically — whether the source is AIP Logic, Anthropic, OpenAI, or a future provider. The guard is a complementary integrity layer for any multi-vendor architecture, including Maven's.

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

Each one is a structural complement to Maven's value claim, *and* a structural answer to one of the five complementary layers above.

### Insight 1 — Decision compression is downstream of evidence integrity

Maven's value claim is sensor-to-decision compression. The value of compression depends on the integrity of the upstream signal. A fast decision on a spoofed track is operationally worse than a slow decision on a clean one. Our pitch leads with the *upstream* problem: what evidence is *cleared* to enter a downstream decision system?

### Insight 2 — Refusal is a procurement asset, not an ethical hedge

Defense AI guidance is moving toward more explicit boundaries on autonomy. Teams that articulate restraint as a designed output, with structural enforcement in code, are positioned for the next contract envelope as DoD policy tightens around autonomy. Refusal is not a brake. It is a feature DoD increasingly wants on the procurement surface.

### Insight 3 — Evidence custody is a governable category, not a UX choice

Maven treats data fusion as the value. **Data fusion is a transformation; evidence custody is a state.** The state of "this signal is contested, this hypothesis is preserved, this claim is unsupported" is *governable* — it can be audited, marked, and policed. Treating evidence custody as a first-class governable category (vs. a UX flourish on top of fused data) is the structural move.

### Insight 4 — Operator persona is the integrity test of a defense pitch

If a pitch can't name the operator, the unit, the time of day, and the specific decision, it's a platform pitch — not a product pitch. **Maven's one-pager doesn't name a single operator.** Ours opens with: *"A maritime watch officer at U.S. 5th Fleet, 0200 local, monitoring AIS disruptions near a strategic chokepoint in the Strait of Hormuz."* Specificity is the integrity test.

### Insight 5 — Procurement integration map is what separates a startup from a vendor

Maven *is* the platform — its one-pager doesn't show where it slots in because it claims the slot. **Most startups try to copy this posture and fail**, because they don't have the platform credibility. The structural move for a startup is the opposite: show the integration map. *"We slot between AIS / OSINT / sensor feeds and existing C2 stacks. We do not replace Maven. We protect the evidence chain before it becomes commandable."* This is procurement-mature language.

---

## 6. Lines that land

Pulled from the Maven analysis, sharpened for our pitch:

| Maven's value claim | Liminal Custody's complementary claim |
|---|---|
| "Compress sensor-to-decision timelines." | "Compression depends on signal integrity upstream." |
| "Foundational platform for CJADC2." | "Maven is the foundation. We are the substrate beneath it." |
| Detection at scale. | Custody before commitment. |
| Speed of integration is the value. | Integrity of the input is the precondition. |
| Human-in-the-loop oversight. | Server-side structural enforcement of refusal. |
| Ontology-based data modeling. | Domain-neutral evidence custody, projected to ontology when resolved. |
| Course-of-action proposals. | Bounded action options, traceable to underlying evidence. |

These lines are seeded into `docs/round1-round2-script.md` and `docs/q-and-a.md`.

---

## 7. The insight that sits underneath everything

**Maven and Liminal Custody serve different layers of the same system.**

Maven's procurement is locked and its product surface is the command layer. Our procurement is open and our product surface is the layer beneath it: pre-command evidence custody. Both layers are necessary; neither is the same as the other.

The structural answer to "why isn't this just more Maven?" is that Maven assumes the upstream layer is resolved, and the upstream layer is contested. Naming that layer, building it, and operating it is the company.
