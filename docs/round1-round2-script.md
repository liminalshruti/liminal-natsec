# Round 1 + Round 2 — pitch scripts

**Two demos. Same product. Different framings.** Rehearse separately.

---

## Round 1 — Maven-invisible, 3 minutes total

**Format:** judging group, ~6–8 teams back-to-back, 3-minute pitch + 1–2 min Q&A. Goal: make top 6 to advance to stage.

**Optimization:** legibility under time pressure. Be memorable in the first 30 seconds. Be fully understood by minute 1.

### Time map

| Time | Beat | Speaker |
|---|---|---|
| 0:00 – 0:30 | Hook + named persona | Shruti |
| 0:30 – 1:30 | Live demo: dark gap → second identity → hypothesis board → Signal Integrity → Intent REFUSED → Collection | Shayaun (drives demo), Shruti (narrates) |
| 1:30 – 2:00 | Review Memory beat: rule saved → next case changed | Shruti |
| 2:00 – 2:30 | Why this matters: pre-command evidence integrity, restraint as a security feature | Shruti |
| 2:30 – 2:50 | Team credibility (one sentence each) + procurement ask | Shruti opens, Shayaun closes |
| 2:50 – 3:00 | Buffer | — |

### Word-for-word — Round 1

**Hook (0:00 – 0:30) — Shruti:**

> "It's 2 AM at the 5th Fleet watchfloor. A vessel in the Strait of Hormuz goes dark. 38 minutes later, a different identity appears 4 nautical miles away. The watch officer has 30 seconds to decide: escalate, monitor, or request second-source confirmation.
>
> Most command-and-control systems start *after* this moment — they assume the signal is already coherent enough to act on. We start one layer earlier."

**Demo (0:30 – 1:30) — Shayaun drives, Shruti narrates:**

> *(map shows normal traffic, then dark gap)*
> "Vessel goes dark."
> *(second identity appears)*
> "A second identity appears nearby. The system doesn't declare them the same — or different. It opens a custody case with three preserved hypotheses."
> *(working panel opens)*
> "Here's what makes this different. Look at the specialist reads."
> *(specialist reads panel renders)*
> "Kinematics says continuity is plausible. Identity flags a metadata mismatch. **Signal Integrity says the source chain is contested — single feed, 38-minute gap, MMSI discontinuity inside a known spoofing envelope.** Intent doesn't refuse because we *told* it to. The system runs a structural guard server-side — citation minimum, indicator requirement, confidence floor — and *enforces* refusal when the chain isn't strong enough. **AI can't talk its way past it.** The system recommends second-source collection."

**Review Memory (1:30 – 2:00) — Shruti:**

> *(operator types a review rule)*
> "The watch officer writes a review rule: 'Identity churn alone is insufficient without second-source confirmation.' The rule saves to the watchfloor.
> *(second case appears)*
> Two hours later, a similar case appears. The system applies the prior rule. The recommendation has changed: it no longer offers Escalate as an option. It offers Request Collection.
>
> The system learned. Not from training data — from a human's correction."

**Why it matters (2:00 – 2:30) — Shruti:**

> "Maintaining custody of contested targets is Sensor Analysis. Bounded action workflows are Command and Control. Protecting the evidence chain from spoofed or degraded signals is Digital Defense. We don't think it's any of those individually. We think the unsolved layer is between them.
>
> SeaForge is the pre-command evidence integrity layer. We turn contested observations into traceable custody, refuse unsupported inference, and turn human correction into durable operating memory. Restraint becomes a security feature."

**Team + ask (2:30 – 2:50) — Shruti opens, Shayaun closes:**

> Shruti: "I'm building Liminal — infrastructure for the pre-decisional state."
> Shayaun: "I'm OffSec-certified, top 100 on Hack The Box. Spoofing and signal-chain compromise is what I do. We want a 90-day pilot with a maritime watchfloor or xTech sponsor on contested AIS replay data."

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
| 2:15 – 2:45 | Architecture slide: pre-command → command → review memory | Shruti |
| 2:45 – 3:00 | Team credibility + 90-day pilot ask | Shayaun closes |

### Word-for-word — Round 2

**Hook (0:00 – 0:30) — Shruti:**

> "It's 2 AM at the 5th Fleet watchfloor. A vessel in the Strait of Hormuz goes dark. A second identity appears nearby.
>
> Maven Smart System and CJADC2 help commanders act on a shared operational picture. They are excellent at that. But they assume something has already happened — that the signals reaching command have already been deemed commandable.
>
> SeaForge handles that earlier layer. We protect the evidence chain *before* something becomes commandable truth."

**Demo (0:30 – 1:45) — Shayaun drives, Shruti narrates:**

(Same flow as Round 1, slightly slower. Add this emphasis on the causal beat:)

> "Watch this carefully. Identity is fine. Kinematics is fine. **Signal Integrity is contested.** Intent refuses — but not because we told it to. We run a structural guard server-side. Seven layered checks. Citation count, indicator evidence, posterior threshold, source restrictions. The guard catches AIP outputs that don't pass and *forces* refusal before they ever persist. **Restraint isn't a feature. It's an invariant.**"

**Review Memory + portability (1:45 – 2:15) — Shruti:**

(Same Review Memory beat as Round 1, then add:)

> "The primitive isn't maritime. It's evidence custody under ambiguity. Replace the maritime substrate with intelligence reports, sensor fusion, supply-chain telemetry — the loop is the same. Custody, refusal, review, durable correction."

**Architecture slide (2:15 – 2:45) — Shruti:**

> *(slide showing: substrate → evidence custody loop → command → review memory)*
>
> "Three layers. Substrate — raw, contested, possibly compromised. Command — Maven, CJADC2, the existing stack. The layer between them — that's us. We make it so commanders aren't acting on overclaimed or spoofed signals, and so their corrections survive into the next decision."

**Team + ask (2:45 – 3:00) — Shayaun closes:**

> "I'm OffSec-certified, top 100 on Hack The Box — my domain is spoofing and signal-chain compromise. Shruti is building Liminal, infrastructure for pre-decisional state. We want a 90-day pilot with a maritime watchfloor or an xTech sponsor on contested AIS replay data — and we want to talk to anyone here who's working on the layer below CJADC2."

### Round 2 — what to do differently

- **Name Maven once, by name, in the hook.** The recognition-shock is the point.
- **Frame as augmenting, never replacing.** "Maven is excellent at command. We handle the layer before."
- **Include the architecture slide.** This is the visual that lets the panel see the wedge.
- **Closer is Shayaun's credentials + the explicit ask.** This signals the team can sell, not just demo.
- **Be ready for hostile Q&A.** See `docs/q-and-a.md`.

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
2. **By 20 seconds:** Shayaun says "let me cut to the recorded run" and switches to the SpeedRun proof clip. Shruti continues narrating *as if* the recorded clip is live.
3. **If neither works:** describe the demo verbally. End with "we have the full demo recorded — happy to send the link." The Q&A becomes the differentiator.

This is why a clean fallback recording exists.

---

## Rehearsal protocol (Phase 5)

- 5+ full Round 1 runs.
- 3+ full Round 2 runs.
- 1+ rehearsal *with the live demo intentionally broken*, to practice the fallback.
- 1+ rehearsal *with hostile Q&A* — Shruti reads from `q-and-a.md`, Shayaun answers, then swap.

If any beat doesn't land in 3 consecutive rehearsals, cut it.
