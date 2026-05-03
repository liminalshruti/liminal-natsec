# Judge Q&A — 30-second answers

Predictable hostile questions, with rehearsed answers. Goal: every answer is ≤ 30 seconds and ends on a strong word.

The judges in the room are ex-operators (Shield Capital, IQT) and procurement-adjacent VCs (DCVC, Palantir engineers). They will smell handwaving in 5 seconds. The right move is *specificity + restraint* — show you know what you don't know.

The first section below — **Judge-calibrated quick answers** — is the rehearsal-ready bench against the six questions the judging panel is most likely to fire in the 1–2 minute Round 1 window. The categorized sections that follow are the long-form fallback for follow-ups and Round 2 stage Q&A.

---

## Judge-calibrated quick answers

These six are pre-assigned to a speaker via the Q&A handoff matrix in `docs/round1-round2-script.md`. Each answer is ≤ 30 seconds, ends on a strong word, and points to the long-form section for follow-ups.

### 1. "Why does this fit Problem Statement 1 — Sensor Analysis & Integration?"

> "PS1 asks for fusing detections across modalities, optimizing search after a lost target, and maintaining custody in contested environments. We do all three. Identity inspects AIS metadata, Visual is a CLIP cross-modal read on declared vessel type, Kinematics runs a Kalman dark-gap predictor that defines the reacquisition corridor, and Signal Integrity fuses them into a source-chain verdict. The output isn't a single confidence score — it's a custody case with three preserved hypotheses and one explicit refusal. **That's iterative refinement under contest, not a tracker bolted to a map.**"
>
> *(Long form: Technical / scaling — JPDA, scale, classification.)*

### 2. "Why does this matter militarily?"

> "0200 at the U.S. 5th Fleet watchfloor. The Strait of Hormuz and Bab al-Mandab have documented AIS spoofing across multiple state and non-state actors since 2019. A vessel goes dark inside the corridor; a different MMSI appears nearby. The watch officer has 30 seconds and one coherent-looking signal — and the existing stack treats source-chain compromise as someone else's problem until it hits command. We make second-source collection a doctrine the system enforces, not a UI option. **That's the difference between a watch officer escalating something that should have been held — and holding it.**"
>
> *(Long form: Customer / procurement.)*

### 3. "Why is this not just another map dashboard?"

> "The map is the cheapest part. The product is what sits behind it: a graph spine that preserves competing custody hypotheses instead of collapsing them, a server-side guard that turns refusal into a first-class output, and a review-memory primitive where one operator's correction becomes a deterministic rule that changes the next case. Drop the maritime fixture and the same loop runs on intelligence reports or supply-chain telemetry. **Dashboards visualize state. We mutate it.**"
>
> *(Long form: Tell me more / open-ended — under the hood.)*

### 4. "Why are refusal and guardrails *technically* enforced, not prompted?"

> "Because prompted refusal can be argued past, and we needed an invariant. `server/src/specialists/guard.ts` runs seven layered checks server-side on every specialist output: citation count below two on a supported verdict, missing INTENT_INDICATOR on an Intent claim, posterior below the confidence floor, Shodan-only citations on a vessel-behavior claim, hostile-phrasing in a question with no indicator evidence. The checks are code, not text in a system prompt — there's no jailbreak surface. AIP outputs are wrapped, not trusted. **Refusal is enforced; AI accelerates underneath it.**"
>
> *(Long form: AI / model risk — How does the structural guard work, prompt injection, Signal Integrity specialists.)*

### 5. "How does Palantir AIP / Foundry fit?"

> "Two ways. One: AIP Logic runs the specialists in our build path and is the hot fallback during Q&A — flip an env flag and the next specialist call goes through AIP, the guard wraps it, and the same refusal renders. Two: Foundry Ontology is the authoritative store — object types, link types, action types are speced in `foundry/`. The graph spine is domain-neutral so the same product ships as a Foundry / AIP module on top of an existing deployment. We augment Maven one layer earlier; we don't replace it. **We feed Maven, we don't compete with it.**"
>
> *(Long form: Maven / Palantir / CJADC2 — different from Maven, why not just AIP, complementary.)*

### 6. "What's the 90-day pilot ask?"

> "Replay-data pilot with a maritime watchfloor — 5th Fleet J2 or the Naval Postgraduate School contested-environments group — on Hormuz or Bab al-Mandab AIS. Success metric is operator-validated review rules per case, not detection accuracy, because the win condition is durable human judgment, not a black-box score. xTech sponsor track and an AIP / Foundry module are the two expansion lanes. **We want a 90-day pilot with a maritime watchfloor or an xTech-aligned sponsor on contested AIS replay data.**"
>
> *(Long form: Customer / procurement — 12-month customer, why Army not in-house, why not Palantir.)*

---

## Maven / Palantir / CJADC2

### "How is this different from Maven Smart System?"

> "We don't replace Maven. Maven helps command teams act on a shared operational picture — we'd want to integrate, not compete. Liminal Custody sits one layer earlier: it protects the evidence chain before something becomes commandable truth. If a signal in the picture is degraded, spoofed, or single-source, Liminal Custody holds it in custody until the chain strengthens or a human writes a rule."

### "Why isn't this just a feature inside Palantir AIP?"

> "It could be. The primitive — evidence custody under ambiguity — is portable. We'd happily build it as an AIP module. But the wedge is the *behavior*: refusal as a designed output, review memory as durable correction. Most platforms don't expose those as first-class concepts."

### "How is this complementary to Maven, not competing with it?"

> "We operate one layer earlier. The contrast is layer-before, not layer-better. Maven operates *after* signals reach command. We operate *while* they're still contested. When custody resolves in our system, the resolved state can flow into a Maven or Foundry deployment cleanly — we feed Maven, we don't replace it."

---

## Technical / scaling

### "Why not JPDA / MHT / a real tracker?"

> "Because that's not the contribution. JPDA and MHT solve association under track ambiguity — they're production-grade. Liminal Custody solves the layer above: how do you preserve custody hypotheses when the *identity* is contested, not just the kinematic association? A production version would integrate JPDA underneath. We're demoing the workflow, not the tracker."

### "What's your false-positive rate?"

> "We're not optimizing a black-box alert threshold. The architectural choice is to make uncertainty inspectable instead of suppressed. Every recommendation shows the supporting evidence, the weakening evidence, and the rule that changed it. False-positive rate is meaningful when the system claims certainty — we're explicitly avoiding that."

### "How does this scale to thousands of vessels?"

> "The graph spine is local for the demo. At scale, the same schema works on a real graph database — Neo4j, Palantir Foundry, or an AIP module. Custody cases are sparse — most vessels don't generate a contested signal. The cost is in the case-level traversal, not the global state."

### "What about classification — can this run in a SIPR / JWICS environment?"

> "The architecture is air-gap-compatible. No live LLM dependency, no cloud calls in the runtime, deterministic fixtures. The graph spine and review memory are local. A classified deployment swaps the AIS feed for the relevant intelligence source — the workflow doesn't change."

---

## AI / model risk

### "Are you using LLMs in the runtime?"

> "Yes — AIP Logic runs the specialists. But every output passes through a server-side structural guard. The guard runs seven layered checks — citation count, evidence-type requirements like INTENT_INDICATOR, posterior thresholds, source restrictions — and *forces* refusal when the chain isn't strong enough. AI accelerates the read; the guard ensures it can't overclaim. Refusal is enforced, not requested."

### "How does the structural guard work?"

> "Server-side middleware that wraps every specialist output. Layer 1: refuses if a 'supported' verdict has fewer than 2 cited observations. Layer 2: refuses Intent if no INTENT_INDICATOR evidence is present. Layer 4: refuses if posterior is below the confidence floor. Layer 6: refuses kinematic or intent claims that cite only Shodan. Layer 7: refuses when a question contains 'hostile/threat/intent' phrasing but no indicator evidence exists. The guard is deterministic and runs after the LLM call."

### "What does Signal Integrity actually do? Is it just one specialist?"

> "Signal Integrity is the verdict layer; underneath it are three independent specialists looking at three different modalities. Identity inspects AIS metadata for discontinuity. Visual runs a CLIP-based cross-modal check — declared AIS class versus visual classifier output. Kinematics evaluates continuity within plausible spoofing envelopes. When they converge on source-chain compromise, the Signal Integrity row reads CONTESTED. That's defense in depth — an attacker has to spoof three independent reads, not one. The structural guard validates each before any verdict can persist."

### "How do you prevent prompt injection / model spoofing?"

> "Two ways. One: the structural guard runs *server-side after AIP output* — there's no prompt that can change citation count or evidence type. The guard's layered checks are code, not text in a system prompt. Two: every observation has a source-integrity check before it influences a claim. A spoofed input would have to forge an INTENT_INDICATOR evidence record, which is provenance-tracked back to a source-document hash. The Signal Integrity specialist flags the chain before the Intent specialist gets to refuse."

### "Why isn't AI doing more of the work?"

> "Because the win condition isn't 'AI did it' — it's 'a watch officer trusted the recommendation.' Trust comes from inspectable evidence and visible refusal. Every AI judgment is gated by the integrity check, the evidence chain, and the review rule. AI accelerates; humans decide; corrections become durable."

---

## Customer / procurement

### "Who's the customer in 12 months?"

> "Three paths. One: a maritime watchfloor — 5th Fleet J2, Naval Postgraduate School, or a coast guard contested-environments group. Two: an xTech-aligned sponsor running Hormuz / Bab al-Mandab replay scenarios. Three: an AIP / Palantir Foundry deployment as a custody-case module. We want a 90-day pilot in the first path, with the second two as expansion lanes."

### "Why should the Army pay for this instead of building it in-house?"

> "Because the wedge isn't the maritime use case — it's the primitive. Evidence custody under ambiguity is what we've spent two years architecting in Liminal. Internal teams will rebuild it on a project basis. We've already built it as substrate."

### "Why would the Army care about a startup over Palantir?"

> "We don't think it's either-or. Palantir owns the command layer — that's a strong moat. The pre-command layer is where the procurement is unmet. Maritime AIS spoofing is a documented operational problem; the existing stack treats it as someone else's problem until the signal hits command. We make it visible earlier."

---

## Team

### "Why your team?"

> Shayaun: "I'm an OffSec-certified offensive-security professional — top 100 on Hack The Box. Signal-chain integrity is my domain."
> Shruti: "I'm building Liminal — infrastructure for the pre-decisional state. Two years of architecture work on evidence custody is what made Liminal Custody buildable in 24 hours."

### "How did you build this in a weekend?"

> "We didn't start from zero on the thinking — we started from zero on the code, which is the rule. The Liminal evidence-custody primitive existed as architecture before the hackathon. The hackathon work was the maritime instantiation: AIS data, MapLibre rendering, the Signal Integrity surface, the demo wiring."

### "Are you full-time on this?"

> Shruti: "I'm full-time on Liminal. Liminal Custody is the defense instantiation."
> Shayaun: "I'm 0.25 FT as co-founder. Liminal Custody is the wedge that proves the substrate works for high-stakes domains."

---

## Hostile / curveball

### "What's the worst-case failure mode of this system?"

> "A watch officer over-trusts the refusal. They see Intent REFUSED, assume the system has resolved the question, and stop looking. Our mitigation: refusal isn't a dead end — it routes to a Collection Planner with explicit triggers. Restraint is paired with a next-action, not a closed door."

### "Could this be used against US assets?"

> "The substrate could be — anything that improves evidence custody helps any operator. The mitigation is that this is software, not signals. Adversaries have to ingest data; if their data is degraded, our integrity check flags it the same way. The advantage is workflow discipline, not data exclusivity."

### "What if a commander disagrees with the system's refusal?"

> "Good — that's the design. Refusal is a recommendation, not a block. The commander can override, but their override becomes a review rule, which becomes durable judgment. The system gets better at distinguishing when to refuse and when to defer because humans actively correct it. We don't replace command authority. We instrument it."

### "What's the moat?"

> "Three things. One: the review-memory primitive — corrections become durable rules, which compounds with every operator-hour. Two: the architectural choice to make refusal a first-class output — most AI systems can't do that. Three: the team — domain depth in offensive security plus pre-decisional architecture from Liminal. The moat is the substrate, not the maritime demo."

---

## "Tell me more" / open-ended

### "Walk me through what's actually under the hood."

> "Local graph spine — TypeScript, domain-neutral node and edge types. Maritime concepts live in fixtures. The demo runs Vite + React + MapLibre, no backend, no cloud, no live LLM. Review rules persist to localStorage. The architectural choice is that everything in the runtime is auditable — there's no black box. Production swaps fixtures for live ingestion and localStorage for a graph DB. The schema doesn't change."

### "Where does Liminal come in?"

> "Liminal Custody is the defense instantiation of a Liminal primitive — evidence custody under ambiguity. Liminal is building this for individual and organizational decision-making. The hackathon is a credibility test: if the primitive holds up in a high-stakes contested-environments demo, it holds up in the lower-stakes domains where Liminal is the product."

### "What would you build with $1M?"

> "The Signal Integrity engine as a real product — production AIS / RF / SAR ingestion, integrity scoring across multi-modal sources, integrations into Maven and Foundry. We'd hire two more security engineers, run pilots with two watchfloor groups, and ship the AIP module in 6 months."

---

## Rules of engagement

- **Always end on a strong word.** "Substrate." "Custody." "Restraint." Not "...you know" or "...basically."
- **If you don't know, say it.** "Honestly, that's a real question and I don't have a sharp answer. My instinct is X — I'd want to talk to a watch officer before saying more." Judges score this higher than guesses.
- **No live LLM claims.** Even if asked "are you using AI?" — answer is "in the build path yes, in the runtime no."
- **No "we'll figure that out post-pilot" answers.** If you don't know the post-pilot path, say "I want to learn that from the pilot."
- **Don't apologize for what isn't built.** Cut features were strategic choices. Frame as "we cut [X] because [reason]."
