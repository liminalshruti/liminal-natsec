# Shayaun handoff — Liminal Custody v3

**Phone-readable. Self-contained. Read this once, ping back with disagreements.**

---

## Why this framing is yours, not stretched

PS4 + Signal Integrity isn't a strategic stretch — it's your domain. OSCP / OSCE / OSEP-class certs, Hack The Box top 100. The booth-find reformulation makes the *demo surface* match where your credibility already is. The Signal Integrity indicators, the spoofing-envelope language, the "what does a degraded source chain actually look like" judgment — drive those, don't just defend them.

We will name your creds explicitly in Round 1 and Round 2. Bio fact, one sentence. That's how Shield / IQT / DCVC weight a defense-tech founding team.

---

## What changed since the v2 plan

I read the Maven Smart System / CJADC2 booth one-pager today. The reformulation is in `docs/v3-positioning-patch.md`. The short version:

- **Track:** PS1 (Sensor Analysis) primary, PS3 (C2) narrative, **PS4 (Digital Defense) is your differentiator layer.**
- **Pitch:** "Command systems start too late. Liminal Custody protects the evidence before it becomes command."
- **Maven:** invisible in Round 1, augmenting in Round 2 if we make finals. Never attack.
- **Demo spine:** v2's 6 beats, with **Signal Integrity: CONTESTED** inserted between hypothesis board and Intent refusal — making the refusal *causally legible* instead of arbitrary.

**Stack pinned:** Vite + React + TypeScript + MapLibre + local graph + localStorage. No backend, no Neo4j, no live LLM, no Palantir AIP runtime. Use AI tools to *write code faster*; don't put live AI in the runtime.

---

## Your lane (v3 additions to v2)

Everything from v2 holds. Plus:

```
+ fixtures/maritime/source-integrity-checks.json
+ Signal Integrity demo narrative (you defend in Q&A)
+ AIS spoofing / dark-gap technical Q&A
+ Real Strait of Hormuz data sourcing (only if non-blocking)
+ Digital Defense / PS4 framing in pitch Q&A
```

The Signal Integrity *component* is rendered by my `SpecialistReads.tsx`. The *fixture data* and *technical defense in Q&A* are yours.

---

## The Signal Integrity fixture (write this in your first 90 minutes)

Path: `fixtures/maritime/source-integrity-checks.json`

Seed with one record matching the demo scenario:

```json
[
  {
    "id": "sic-001",
    "type": "sourceIntegrityCheck",
    "created_at": "2026-05-02T14:38:00Z",
    "properties": {
      "source_id": "ais-feed-01",
      "status": "contested",
      "indicators": [
        "38-minute transmission gap on MMSI-111",
        "Reappearance under MMSI-222 with metadata mismatch",
        "Single-source confirmation only (no second feed)",
        "Course continuity within plausible spoofing envelope"
      ],
      "confidence": 0.68,
      "rationale": "Signal chain insufficient for escalation without second-source confirmation.",
      "linked_evidence_ids": ["ev-047", "ev-048", "ev-052"],
      "detected_at": "2026-05-02T14:38:00Z"
    }
  }
]
```

The four indicators must read realistically to a defense judge. Reference real AIS spoofing patterns from documented Hormuz / Bab al-Mandab incidents (Iran's been doing this since ~2019). You'll defend these indicators in technical Q&A — make them ones you can speak to without notes.

**Drive these, don't review mine.** This is your domain. The stronger the indicators read to someone who's worked in offensive security, the stronger the demo lands. If you see better indicators based on real spoofing TTPs, swap them in.

---

## Demo causal wiring (we co-own this)

The visible UI moment:

```
Kinematics        OK         Track continuity likely preserved
Identity          OK         Metadata conflict: MMSI-111 → MMSI-222
Signal Integrity  CONTESTED  Source chain degraded; single-source confirmation only
Intent            REFUSED    Insufficient evidence to infer hostile intent
Collection        OK         Recommend EO/SAR imagery + second-source confirmation
```

Below the table, one line: **"Intent refused because Signal Integrity is contested."**

Your Signal Integrity row is what makes the Intent refusal causally legible. Without your row, the refusal is just a UX choice. With your row, restraint becomes a security feature.

---

## Open contract questions (resolve before parallel build)

I'm flagging four. Pick a default or counter:

1. **Naming.** Internal node type is `sourceIntegrityCheck`. UI label is "Signal Integrity". OK to keep the split? *Default: yes — split is fine.*
2. **Causal animation.** Signal Integrity renders ~400ms before Intent REFUSED, with a visible connector line. *Default: yes.*
3. **Real AIS.** If you have a fast Hormuz adapter, do we hot-swap the fixture for a snapshot taken ≤4 hours before pitch? *Default: yes if working by H8; otherwise stay deterministic.*
4. **Reset.** Ctrl+Shift+R clears Signal Integrity state too. *Default: yes.*

If you disagree with any default, ping me before H1.

---

## Phase gates (unchanged from v2)

| Gate | Time | Must be true |
|---|---:|---|
| Gate 0 | H0:45 | Track + Maven posture + stack locked. Schema delta committed. |
| Gate 1 | H3 | Shell loads, map shows tracks, graph initialized. |
| Gate 2 | H8 | Dark gap, second identity, alert opens case. |
| Gate 3 | H13 | Hypotheses + evidence + provenance render from graph. |
| Gate 4 | H20 | Full loop. **Signal Integrity row + causal refusal both render.** |
| Gate 5 | H25 | UI polished, reset works, fallback recording exists. |
| Gate 6 | H31 | Round 1 + Round 2 scripts rehearsed. SpeedRun clip captured. |

---

## Cut order (unchanged from v2; v3 protects Signal Integrity row)

**Never cut:** dark gap, second identity, hypothesis board, **Signal Integrity row**, Intent refusal, **causal line**, evidence chain, review rule saved, second case changed.

**Cut first:** live LLM, live AIS, Palantir AIP runtime, Neo4j, force graph, tray, backend, full command-line intelligence, real-time anything fragile.

---

## Round 1 vs Round 2 (your job for Q&A; my job for the deck)

Round 1 (groups, 3 min, ~6–8 teams seeing same judges back-to-back):
- **Maven-invisible.** Don't name Maven, Palantir, or CJADC2.
- Open with: *"Current command-and-control systems start too late."*

Round 2 (top 6, on stage, 5–6 min, panel + harder Q&A):
- **Maven-augmenting.** *"Maven Smart System and CJADC2 help commanders act on a shared operational picture. Liminal Custody augments that stack one layer earlier."*
- Never frame Maven as flawed. The frame is *layer-before*, not *layer-better*.

---

## Predictable Q&A you'll likely catch

I have full answers in `docs/q-and-a.md`. Quick takes:

- **"How is this different from Maven?"** "We don't replace Maven. Maven helps command teams act on a shared picture. Liminal Custody sits one layer earlier — protects the evidence chain before something becomes commandable truth."
- **"Why not JPDA / MHT?"** "This isn't a production tracker. It's an evidence-custody workflow. A production version would integrate JPDA/MHT underneath."
- **"What's your false-positive rate?"** "We're not optimizing a black-box threshold. We make uncertainty inspectable — every recommendation shows support, weakening evidence, and the rule that changed it."
- **"Why should the Army care?"** "Bad evidence chains create bad command decisions. In contested environments, the cost is acting too confidently on spoofed or incomplete signals."
- **"Why your team?"** "I'm OffSec-certified — OSCP/OSCE-class, top 100 on Hack The Box. My day job is spoofing, intrusion, and signal-chain compromise. Shruti brings the evidence-custody architecture from Liminal. The substrate is what makes it portable beyond maritime."

---

## What I need from you in the first 90 minutes

1. ACK this doc.
2. Counter the contract defaults (or accept them).
3. Start `tracks.geojson` per v2.
4. Start `source-integrity-checks.json` per the schema above.
5. Confirm: do you have a fast path to real Hormuz AIS data, or are we going synthetic-styled-as-real?

After that, v2 hour-by-hour holds. We sync at each phase gate. Any blocker, ping me before pushing changes that affect the contract layer.

---

## TL;DR

- v2 build plan stands. v3 adds **one node type, one fixture, one UI row, one causal line, two demo scripts**.
- Track: PS1 primary.
- Pitch: pre-command evidence integrity.
- Your differentiator: Signal Integrity row + Digital Defense Q&A.
- Never cut: dark gap, second identity, hypothesis board, Signal Integrity, Intent refusal, causal line, evidence chain, review rule, second case changed.
- Big swing is the *category reframe*, not a fragile runtime.
