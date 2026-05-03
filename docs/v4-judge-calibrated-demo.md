# Liminal Custody — v4 Judge-Calibrated Demo Layer

**Status:** v4 patch on top of v3. Adds named operator persona, procurement path, "what we don't do" slide, and judge-by-judge framing. **Does not change build sequencing.** This is mostly Shruti's lane (deck + narrative).

---

## 1. Named operator persona

Use this in the first sentence of every pitch — Round 1 and Round 2.

> **A maritime watch officer at U.S. 5th Fleet, 0200 local, monitoring AIS disruptions near a strategic chokepoint in the Strait of Hormuz, deciding whether a dark-gap reappearance deserves immediate escalation or second-source collection.**

Why this persona:
- 5th Fleet AOR includes Hormuz / Bab al-Mandab — both have documented AIS spoofing across multiple state and non-state actors (2019+).
- 0200 makes the cognitive-load problem visceral.
- "Escalate vs second-source collection" is the *exact* decision Liminal Custody surfaces.
- Naming a unit (not "operators in general") signals operator literacy to Shield / IQT / DCVC judges.

**Compressed for the hook:**

> "It's 2 AM at the 5th Fleet watchfloor. A vessel in the Strait of Hormuz goes dark."

---

## 2. Procurement path slide

A defense pitch without a procurement ask is a TED talk. The slide:

### How Liminal Custody enters DoD procurement

```
Liminal Custody sits between AIS / OSINT / sensor feeds and existing C2 stacks.
It does not replace Maven or CJADC2. It hardens the evidence chain
before signals become commandable.

Three pilot paths:

1. Maritime watchfloor pilot
   90-day replay-data pilot with 5th Fleet J2 / Naval Postgraduate School
   contested-environments group, on Hormuz / Bab al-Mandab AIS replays.

2. xTech sponsor track
   Submit through xTech (this hackathon's host program) for a follow-on
   pilot under the Sensor Analysis or Digital Defense problem statement.

3. Palantir AIP / Foundry module
   Custody-case module on AIP, integrated with existing operational
   pictures rather than parallel to them.
```

**The ask, verbatim:**

> "We want a 90-day pilot with a maritime watchfloor or an xTech-aligned sponsor on contested AIS replay data."

---

## 3. "What we do not do" slide

This is unusual at hackathons. It scores high with this panel because it shows policy literacy and procurement maturity.

### What Liminal Custody does not do

```
We do not infer hostile intent.
   Intent inference without legal-grade evidence creates escalation risk.

We do not attribute.
   Attribution requires authority and access we do not have or claim.

We do not auto-escalate.
   Escalation is a human decision; the system surfaces options and
   their triggers.

We do not replace command authority.
   Refusal is a recommendation, not a block. Commanders override;
   overrides become durable rules.

AI cannot overclaim.
   Every specialist output passes through a server-side structural
   guard. Citation minimums, indicator-evidence requirements, and
   confidence floors enforce refusal. AI accelerates; the guard
   ensures it cannot overclaim.
```

This converts restraint from a UX feature into a *policy posture*. Aligned with DoD's responsible-AI direction (2023+) and Pentagon human-in-the-loop requirements.

---

## 4. Judge-by-judge framing

The named judges in the room and what they're listening for. **One sentence in the pitch should land for each.** Don't try to mention everyone — design the pitch so each one finds *their* sentence.

### US Army (xTech program, prize sponsor)

- Listening for: pilot path, narrow scope, integratability with existing programs.
- Their sentence: *"We want a 90-day pilot with a maritime watchfloor or an xTech-aligned sponsor."*

### Shield Capital

- Listening for: dual-use credibility, founder pattern-match (ex-operator or close), technical depth.
- Their sentence: *"Shayaun is an OffSec-certified offensive-security professional, top 100 on Hack The Box. Signal-chain integrity is his domain."*

### IQT (In-Q-Tel)

- Listening for: tech 18 months ahead of where the IC currently buys, novel substrate.
- Their sentence: *"The unsolved layer between substrate and command is where Liminal Custody operates."*

### DCVC

- Listening for: deep-tech moat, government go-to-market clarity, IP defensibility.
- Their sentence: *"The moat is the substrate — evidence custody under ambiguity, not the maritime instantiation."*

### Palantir

- Listening for: complementarity, not competition; AIP-friendliness; understanding of CJADC2.
- Their sentence: *"Liminal Custody augments Maven one layer earlier — it could ship as an AIP module."*

### Stanford Gordian Knot

- Listening for: ethics, policy posture, responsible AI.
- Their sentence: *"Restraint is a security feature. We don't infer hostile intent."*

### L3Harris

- Listening for: integrability with existing comms / sensor infrastructure.
- Their sentence: *"Liminal Custody sits between feeds and C2 — it ingests AIS, OSINT, and sensor inputs without prescribing the source."*

### Berkeley Defense Tech Society

- Listening for: operator-network credibility, Bay Area founder bona fides.
- Their sentence: implicit — Shruti's Liminal positioning + Shayaun's HTB ranking.

---

## 5. Architecture walkthrough (Round 2) — verbal, not a slide

The hackathon explicitly forbids presentations during judging. The architecture *concept* still does work in Round 2 — but it's a **verbal beat with gestures at the running app**, not a slide.

### What you say

(For Round 2, ~30 seconds, between the Review Memory beat and the team close. Stay on the running app.)

> *(gesture at the substrate panel, left)*
> "Substrate. Raw, contested, possibly compromised — AIS, OSINT, RF, intelligence reports."
>
> *(gesture at the working panel, right — currently showing the custody case)*
> "The layer between substrate and command — that's us. Custody hypotheses preserved, structural guard enforced, review memory durable."
>
> *(gesture at the action options + the just-saved review rule)*
> "Command — Maven, CJADC2, the existing stack. They start *after* our layer."

### Three labels that matter (anchor in the verbal)

- **Substrate / X** — what exists before signals are commandable.
- **Evidence Custody Loop** — where Liminal Custody operates. Liminal's primitive.
- **Command / Control** — explicitly named to anchor against Maven / CJADC2.

### Public-repo equivalent

The same architecture diagram exists *as a static graphic in the README* (judges who clone the repo can see it). It does not appear in the live demo. This is the difference between a *referenced* artifact and a *presented* one — and respects the hack rule.

---

## 6. Round 2 closing line

For the final sentence on stage:

> "Maven helps commanders act on a shared picture. Liminal Custody makes sure that picture is worth acting on. We're building the substrate the next decade of mission systems will run on top of."

If running long, cut the second sentence. The first lands on its own.

---

## 7. 60-second demo video — judge-calibrated structure

The hackathon requires a 1-min demo video. Build it as if a Shield/IQT principal will watch it on 2x speed in their inbox.

| Time | Beat | Visual |
|---|---|---|
| 0:00 – 0:05 | "5th Fleet watchfloor. Vessel goes dark." | Map + dark gap |
| 0:05 – 0:15 | "Second identity appears. System opens custody case with three preserved hypotheses." | Map + working panel |
| 0:15 – 0:30 | "**Signal Integrity contested. Intent refused.**" | Specialist reads panel, hero treatment |
| 0:30 – 0:40 | "Operator writes a rule." | Rule input + save |
| 0:40 – 0:50 | "Next case: recommendation has changed." | Second case card |
| 0:50 – 1:00 | "Pre-command evidence integrity. Restraint as a security feature." + Liminal logo | App fade to Liminal Custody wordmark over the running shell (no separate architecture slide — stay in-app) |

Voice-over should match Round 1 narration for consistency — judges may watch the video *and* see Round 1.

---

## 8. The single sentence to drill

If everything else falls apart, this is the sentence both Shruti and Shayaun should be able to say without thinking:

> **"Command systems start too late. Liminal Custody protects the evidence before it becomes command."**

That's the pitch. Everything else is supporting evidence.
