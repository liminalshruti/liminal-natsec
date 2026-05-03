# Round 1 + Round 2 — pitch scripts

**Two demos. Same product. Different framings.** Rehearse separately.

---

## Round 1 — Maven-invisible, 3 minutes total

**Format:** judging group, ~6–8 teams back-to-back, 3-minute pitch + 1–2 min Q&A
(`details.md` §13). Goal: make top 6 to advance to the stage round.

**Optimization:** legibility under time pressure against a published rubric —
**35 % Technical Demo / 30 % Military Impact / 25 % Solution Creativity / 10 %
Pitch**. Memorable in the first 30 seconds. Fully understood by minute 1.
Every beat lives in the **running desktop app** — `details.md` §13 explicitly
forbids presenting slides during judging.

### Time map

| Time | Beat | Scoring weight served | Speaker |
|---|---|---|---|
| 0:00 – 0:30 | **30-sec cold-open hook** + named persona *(in-app: map idle)* | Pitch (10) + Military Impact (30) | Shruti |
| 0:30 – 1:30 | Live demo: dark gap → second identity → hypothesis board → Signal Integrity → Intent REFUSED → Collection *(in-app, driven on-screen)* | Technical Demo (35) + Creativity (25) | Shayaun drives, Shruti narrates |
| 1:30 – 2:00 | Review Memory beat: rule saved → next case changed *(in-app, second event)* | Creativity (25) + Technical Demo (35) | Shruti |
| 2:00 – 2:30 | **Military-impact beat** — pre-command evidence integrity; PS1 anchor sentence | Military Impact (30) | Shruti |
| 2:30 – 2:50 | Team credibility (one sentence each) + 90-day pilot ask | Pitch (10) + Military Impact (30) | Shruti opens, Shayaun closes |
| 2:50 – 3:00 | Q&A bridge + buffer | — | Shayaun |

### Word-for-word — Round 1

**Hook (0:00 – 0:30) — Shruti** *(canonical 30-second cold-open; identical to the demo-video VO in `docs/demo-video-script.md`):*

> "0200 at the U.S. 5th Fleet watchfloor. A vessel in the Strait of Hormuz goes dark. 38 minutes later, a different identity appears 4 nautical miles away. The watch officer has 30 seconds to decide: escalate, monitor, or request second-source collection.
>
> Most command-and-control systems start *after* this moment. **Liminal Custody protects the evidence chain before it becomes command.**"

**Demo (0:30 – 1:30) — Shayaun drives the app, Shruti narrates:**

> *(in-app: map shows normal traffic, replay advances, dark gap fires)*
> "Vessel goes dark."
> *(in-app: second identity pings inside the predicted ellipse)*
> "A second identity appears nearby. The system doesn't declare them the same — or different. It opens a custody case with three preserved hypotheses."
> *(in-app: operator clicks the alert, Working Panel renders)*
> "Here's what makes this different. Look at the specialist reads."
> *(in-app: SpecialistReads strip renders; Signal Integrity row goes CONTESTED)*
> "Kinematics says continuity is plausible. Identity flags a metadata mismatch. **Signal Integrity says the source chain is contested — single feed, 38-minute gap, MMSI discontinuity inside a known spoofing envelope.** Intent doesn't refuse because we *told* it to. The system runs a structural guard server-side — citation minimum, indicator requirement, confidence floor — and *enforces* refusal when the chain isn't strong enough. **AI can't talk its way past it.** The system recommends second-source collection."

**Review Memory (1:30 – 2:00) — Shruti:**

> *(in-app: operator types a review rule into ReviewMemory, hits save, green toast)*
> "The watch officer writes a review rule: 'Identity churn alone is insufficient without second-source collection.' The rule saves to the watchfloor.
> *(in-app: click the second event alert, CaseHandoffBanner fires, ActionOptions reorders)*
> Two hours later, a similar case appears. The system applies the prior rule. The recommendation has changed: it no longer offers Escalate as an option. It offers Request Collection.
>
> The system learned. Not from training data — from a human's correction."

**Military-impact beat (2:00 – 2:30) — Shruti:**

> "**This is Problem Statement 1: maintaining custody of contested targets across modalities — AIS, visual, kinematic, RF — and consolidating those detections into a single iteratively refined event.** The 5th Fleet AOR has documented AIS spoofing across multiple state and non-state actors since 2019. At 0200, the cost of over-trusting one coherent-looking signal is a watch officer escalating something that should have been held. Liminal Custody turns contested observations into traceable custody, refuses unsupported inference server-side, and turns human correction into durable operating memory. Restraint becomes a security feature."

**Team + ask (2:30 – 2:50) — Shruti opens, Shayaun closes:**

> Shruti: "I'm building Liminal — infrastructure for the pre-decisional state."
> Shayaun: "I'm an OffSec-certified offensive-security professional — top 100 on Hack The Box. Signal-chain integrity is my domain. **We want a 90-day pilot with a maritime watchfloor or an xTech-aligned sponsor on contested AIS replay data.**"

**Q&A bridge (2:50 – 3:00) — Shayaun:**

> "Happy to take questions — and we can flip the live AIP path during Q&A if useful."

### Round 1 — what NOT to say

- Don't name Maven, Palantir, CJADC2, or JADC2.
- Don't say "we built a maritime tracker."
- Don't say "it's also useful for healthcare / finance / personal productivity."
- Don't apologize for what isn't built.
- Don't claim live LLM, live AIS, or anything that wasn't deterministic in the demo.

---

## Round 2 — Maven-augmenting, ~5 minutes

**Format:** stage, panel, top 6 only. ~3-min pitch + 2–3 min Q&A. Goal: win.

**Optimization:** depth under scrutiny. Develop the thesis. Name the elephant. Take harder Q&A.

### Time map (3 minutes)

| Time | Beat | Speaker |
|---|---|---|
| 0:00 – 0:30 | Hook + named persona + Maven-explicit frame | Shruti |
| 0:30 – 1:45 | Live demo (slightly slower, more emphasis on causal refusal) | Shayaun drives, Shruti narrates |
| 1:45 – 2:15 | Review Memory + portability beat | Shruti |
| 2:15 – 2:45 | Architecture walkthrough — verbal, gesture at running app's panes (no slide; hack rules forbid presentations) | Shruti |
| 2:45 – 3:00 | Team credibility + 90-day pilot ask | Shayaun closes |

### Word-for-word — Round 2

**Hook (0:00 – 0:30) — Shruti:**

> "0200 at the U.S. 5th Fleet watchfloor. A vessel in the Strait of Hormuz goes dark. A second identity appears 4 nautical miles away.
>
> Maven Smart System and CJADC2 help commanders act on a shared operational picture. They are excellent at that. But they assume something has already happened — that the signals reaching command have already been deemed commandable.
>
> Liminal Custody handles that earlier layer. We protect the evidence chain *before* something becomes command."

**Demo (0:30 – 1:45) — Shayaun drives, Shruti narrates:**

(Same flow as Round 1, slightly slower. Add this emphasis on the causal beat:)

> "Watch this carefully. Identity flags a metadata mismatch. Visual flags an AIS-class mismatch — CLIP says tanker, AIS declares cargo. Kinematics flags continuity inside a known spoofing envelope. **Signal Integrity says contested — three independent specialists converge on source-chain compromise.** That's defense in depth. An attacker has to spoof three independent reads, not one. And because Signal Integrity is contested, **Intent refuses** — but not because we told it to. We run a structural guard server-side. Seven layered checks: citation count, indicator evidence, posterior threshold, source restrictions. The guard catches AIP outputs that don't pass and *forces* refusal before they ever persist. **Restraint isn't a feature. It's an invariant.**"

**Review Memory + portability (1:45 – 2:15) — Shruti:**

(Same Review Memory beat as Round 1, then add:)

> "The primitive isn't maritime. It's evidence custody under ambiguity. Replace the maritime substrate with intelligence reports, sensor fusion, supply-chain telemetry — the loop is the same. Custody, refusal, review, durable correction."

**Architecture walkthrough (2:15 – 2:45) — Shruti:**

(No slide. Stay on the running app. Gesture at the panes as you say each layer.)

> *(point at substrate panel, left)*
> "Substrate — raw, contested, possibly compromised."
> *(point at working panel, right)*
> "The layer between substrate and command — that's us. Custody hypotheses, structural guard, review memory."
> *(point at action options + the just-saved review rule)*
> "Command — Maven, CJADC2, the existing stack. We make sure commanders aren't acting on overclaimed or spoofed signals, and so their corrections survive into the next decision."

**Team + ask (2:45 – 3:00) — Shayaun closes:**

> "I'm an OffSec-certified offensive-security professional — top 100 on Hack The Box. Signal-chain integrity is my domain. Shruti is building Liminal, infrastructure for pre-decisional state. We want a 90-day pilot with a maritime watchfloor or an xTech sponsor on contested AIS replay data — and we want to talk to anyone here who's working on the layer below CJADC2."

### Round 2 — what to do differently

- **Name Maven once, by name, in the hook.** The recognition-shock is the point.
- **Frame as augmenting, never replacing.** "Maven is excellent at command. We handle the layer before."
- **No slide — gesture at the running app's panes during the architecture beat.** Hack rules explicitly forbid presentations. Stay on the demo.
- **Closer is Shayaun's credentials + the explicit ask.** This signals the team can sell, not just demo.
- **Be ready for hostile Q&A.** See `docs/q-and-a.md`.

---

## Q&A handoff matrix (1–2 min Round 1, 2–3 min Round 2)

The 1–2 minute Q&A window is short. Pre-assign each predictable question to a
speaker and a section in `docs/q-and-a.md` so we don't both lunge at the same
question or both stay silent. **Whoever answers, finishes — no overlap.**
Shruti fields product / positioning; Shayaun fields engineering / security.

| # | Predictable question | Owner | Source section in `q-and-a.md` |
|---|---|---|---|
| 1 | "Why does this fit Problem Statement 1?" | Shruti | Quick answers §1 |
| 2 | "Why does this matter militarily?" | Shruti | Quick answers §2 |
| 3 | "Why is this not just another map dashboard?" | Shruti | Quick answers §3 |
| 4 | "How is refusal *technically* enforced?" / prompt-injection | Shayaun | Quick answers §4 + AI / model risk |
| 5 | "How does Palantir AIP / Foundry fit?" | Shayaun (AIP fallback live-flip if asked) | Quick answers §5 + Maven / Palantir / CJADC2 |
| 6 | "What's the 90-day pilot ask / customer in 12 months?" | Shayaun | Quick answers §6 + Customer / procurement |
| 7 | "Why your team?" | Shayaun (offsec) → Shruti (Liminal) | Team |
| 8 | "What's the moat?" / "Why won't Palantir build this?" | Shruti | Hostile / curveball |
| 9 | "Worst-case failure mode?" | Shruti | Hostile / curveball |
| 10 | "Could this be used against US assets?" | Shruti | Hostile / curveball |

**If a question doesn't land in this matrix:** the speaker who's already mid-thought
takes it; the other speaker can add one sentence at the end, no more.

**Hot fallback to live AIP (Q&A only):** if a judge asks "are you actually using
the LLM right now?" — Shayaun flips the env flag, runs the next specialist call
through AIP Logic, lets the structural guard wrap the output, and shows the same
refusal rendering. The judge cannot visually distinguish demo mode from live
mode. This is the *only* moment AIP is on the critical path.

---

## Demo timing — both rounds

The live demo segment is ~75 seconds in Round 1, ~75 seconds in Round 2. Same beats, slightly different narration pace. Critical: **the operator who clicks must be the one who narrates**, or the timing breaks. Default is Shayaun drives the map / replay; Shruti drives the working panel and review memory. Practice the handoff.

### Beat budget (live demo, both rounds)

| Beat | Seconds | Cue |
|---|---:|---|
| Map + normal traffic | 5 | "Watchfloor view." |
| Vessel goes dark | 8 | "Vessel goes dark." |
| Second identity appears | 8 | "Second identity appears." |
| Custody case opens | 5 | "System opens a custody case." |
| Hypothesis board | 8 | "Three preserved hypotheses." |
| Specialist reads panel | 12 | "Kinematics OK. Identity flagged. **Signal Integrity contested.**" |
| Intent REFUSED beat | 10 | "Because Signal Integrity is contested, Intent refuses to overclaim." |
| Action options | 5 | "System recommends second-source collection." |
| Review rule typed | 8 | "Operator writes a rule." |
| Second case appears | 8 | "Similar case, two hours later — recommendation has changed." |
| **Total** | **~77** | |

If running long, cut: hypothesis board narration (drop to 5s). If running short, extend: review rule narration ("see how the system traces this back…").

---

## Fallback ladder (during pitch)

If the live demo breaks during pitch:

1. **First 10 seconds of breakage:** keep talking, click around, see if it self-recovers.
2. **By 20 seconds:** Shayaun says "let me cut to the recorded run" and switches to the 60-second demo video. Shruti continues narrating *as if* the recorded clip is live.
3. **If neither works:** describe the demo verbally. End with "we have the full demo recorded — happy to send the link." The Q&A becomes the differentiator.

This is why a clean fallback recording exists.

---

## Rehearsal protocol (Phase 5)

- 5+ full Round 1 runs.
- 3+ full Round 2 runs.
- 1+ rehearsal *with the live demo intentionally broken*, to practice the fallback.
- 1+ rehearsal *with hostile Q&A* — Shruti reads from `q-and-a.md`, Shayaun answers, then swap.

If any beat doesn't land in 3 consecutive rehearsals, cut it.
