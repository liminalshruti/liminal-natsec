# Liminal Custody — 60-Second Demo Video Script (v3 · post-dry-run · cognitive-pipeline framing)

The 1-minute submission video required by `details.md` §13. The video is what a
judge clicks first — uploaded as a YouTube unlisted / Loom link in the submission
form, mirrored offline at `docs/liminal-custody-demo-60s.mp4`, and watched on 2×
speed in an inbox.

**v3 changes (replacement-with-absorption):**

The dry-run reframed the demo from a 9-beat temporal phase progression
(cold-open → dark-gap → … → second-case-changed) to a **left-to-right cognitive
pipeline** that the viewer reads spatially in one glance. The four shipped
real-world findings from the Danti pipeline become the substantive payload.

**The new mental model · LEFT TO RIGHT:**

```
INGEST    →    RELATE    →    HYPOTHESIZE    →    REVIEW-WITH-REASONING
(OSINT)        (graph)        (agent proposes)     (analyst clicks · aha)
```

Every product decision maps back to this sequence. The operator stays in the
**judgment seat**, not the correlation seat — agents handle the pre-rationalized
correlation work; the operator reviews the reasoning chain.

**The new "aha" beat is the reasoning-chain reveal** — the analyst clicks into a
hypothesis and sees the full chain of logic that connects the markers. **Not**
the structural-refusal stamp (that's now a Q&A defense surface, not a pitch
surface). **Not** the second-case-rule-applied banner (that's a future-state
mention, demonstrated only if the 60s allows).

**What survives from v2:** named operator (5th Fleet · 0200 · Strait of Hormuz),
substrate → custody → command architecture, structural guard as Q&A backbone,
all 56 PRs of shipped UI register.

**What evolves:** demo arc, make-or-break beat, closing claim, visual emphasis.

**What recedes (still wired, but no longer load-bearing in the 60s):**
wet/drying/dry typography, server-stamped guard verdict, rule-compounding edges,
substrate-state chyron narrative.

**Voice-over rule:** **two-voice 60/40 split** — Shruti owns ~36s (60%) on the
narrative spine and the operator/positioning frame; Shayaun owns ~24s (40%) on
the technical beats — the reasoning chain reveal and the agent-rationalization
mechanic. Hand-off cues are explicit in the table below. **Authoritative arc
reference:** `docs/demo-arc-v3-cognitive-pipeline.md`.

---

## Pre-roll setup (run once, off camera) — VERIFY EACH STEP

1. **Server up.** `bun run dev:desktop` running. `curl -s http://localhost:8787/health` returns 200.
2. **State reset.** Hit **`Ctrl+Shift+R`** in the desktop app. Clears localStorage rules, resets replay to P1.
3. **Verify the bottom chyron reads:** `substrate :: settling · 0 nodes wet · 0 specialists drying · watchfloor at rest`. If anything else, repeat step 2.
4. **Window 100% zoom, full screen**, dark UI mode, **desktop Electron app** (not browser).
5. **Default selection:** EV1 (OFAC-listed HUGE) selected. AI-discovery toast `LIMINAL AGENTS · DISCOVERY · 72%` visible.
6. **Map state:** paused at P1, scrubber-left, Hormuz Watch Box 01 outlined.
7. **Recording app primed** (QuickTime / OBS / ScreenStudio, 1× capture).
8. **Mute notifications** (`do not disturb`).

**If any step fails, do not start recording — fix and retry.**

---

## The 60-second script · 5 beats · two-voice 60/40 (Shruti 36s · Shayaun 24s)

**Voice-share by beat:**

| Beat | Speaker | Seconds | Why |
|---|---|---|---|
| 1 · Cold open · OSINT ingestion | Shruti | 8s | Sets the operator + positioning frame |
| 2 · Knowledge graph + hypothesis | Shruti | 10s | Names the system's read; carries the marquee finding |
| 3 · "Aha" · reasoning chain reveal | **Shayaun** | 14s | Technical mechanic — agent rationalization, chain semantics, marker enumeration |
| 4 · Real-world findings · chain-of-behaviors | **Shayaun** | 10s of 18 visual; Shruti picks up at 0:42 with 8s | Shayaun lists the four findings (technical), Shruti closes with the cognitive-load claim (positioning) |
| 5 · Close · judgment seat | Shruti | 10s | Brand close — operator-principal claim |

**Totals:** Shruti = 8 + 10 + 8 + 10 = **36s (60%)** · Shayaun = 14 + 10 = **24s (40%)**

| t | duration | beat | speaker | spoken cue (VO) | what the screen shows · LEFT TO RIGHT |
|---:|---:|---|---|---|---|
| 0:00 | 8 s | **1. Cold open + the left side: OSINT ingestion** | **Shruti** | *"It's 0200 at the U.S. 5th Fleet watchfloor. Open-source intelligence is streaming in — sanctions lists, fishing-watch records, Sentinel imagery, archived AIS — all on the left."* | Cold app shell. **Substrate pane on the left**: `WATCHFLOOR · 7 OPEN`, `AI · PROPOSED · 6`, `OSINT SIGNALS · 308`. Three-register stratification. Broadcast chyron at top: `LIMINAL · CUSTODY · 5TH FLEET · 0200Z`. |
| 0:08 | 10 s | **2. Aggregation: knowledge graph + hypothesis generation** | **Shruti** | *"Our system aggregates that intelligence into a knowledge graph and proposes hypotheses. The agent has already noticed: an Iranian crude tanker in the Strait of Hormuz is spoofing its MMSI."* | **Stage center**: map shows Hormuz Watch Box 01, MMSI-111 / MV CALDERA on track. AI-discovery toast in working pane: `LIMINAL AGENTS · DISCOVERY · 72% · Hormuz Watch Box dark-vessel proposal · 11 vessels`. |
| 0:18 | 14 s | **3. The "aha": click into the hypothesis · reasoning chain on the right** | **Shayaun** *(handoff cue: Shruti finishes "spoofing its MMSI" → cuts to Shayaun)* | *"When the analyst clicks into it, the full reasoning chain populates on the right — seven broadcast identities since 2012, OFAC sanctions, Global Fishing Watch identity history. Each marker, alone, is normal. Chained together, the agent rationalizes a pattern of suspicious intent."* | Operator clicks EV1. **Working pane on the right** populates with the reasoning chain: `RECOMMEND COLLECTION · SUPPORTED 92%`. Real OSINT Case body: OFAC SDN, GFW, OpenSanctions citations. Bullet list visible: 7 broadcast identities, current GFW identity, OFAC-listed MMSI 212256000 trail. |
| 0:32 | 10 s | **4a. Real-world findings · the chain across cases** | **Shayaun** | *"This isn't theoretical. The same pipeline surfaces gray-market sanctions evasion, loitering clusters, and ships changing identity over time. Each behavior, in isolation, falls under the radar."* | Map continues to render the full Hormuz watch box with multiple vessel pins. Substrate pane shows the spread of cases (`Sanctioned-fleet…`, `Hormuz sanction…`, `Qeshm and Bandar…`, `Foreign-flag Iran…`, `Grey-market and …`, `ROSHAK signal-in…`). |
| 0:42 | 8 s | **4b. The cognitive-load claim** | **Shruti** *(handoff cue: Shayaun finishes "falls under the radar" → Shruti picks up)* | *"Chained, the system surfaces the pattern. The analyst doesn't construct it manually — they review the reasoning."* | The AI-PROPOSED · 6 register glows briefly to show additional agent-surfaced drafts; substrate-state chyron at bottom updates: `substrate :: holding · 8 nodes wet · 6 specialists drying · agents pre-rationalize`. |
| 0:50 | 10 s | **5. Close · operator stays principal · custody before command** | **Shruti** | *"Liminal Custody: ingest, relate, hypothesize, review with reasoning. The operator stays in the judgment seat — not the correlation seat. Pre-command evidence integrity. Restraint as a security feature."* | App holds full-shell. Substrate-state chyron at bottom: `substrate :: holding · 8 nodes wet · 6 specialists drying · operator decides`. Liminal Custody wordmark visible in broadcast chyron. |
| 1:00 | — | end | — | *(silent fade if editing)* | — |

**Total: 60 s · 5 beats · two-voice 60/40.**

**Hand-off cues (rehearse these once before recording):**

- **Shruti → Shayaun at 0:18** · Shruti's closing word is *"MMSI."* · Shayaun begins on *"When the analyst clicks…"* · the EV1 click happens on Shayaun's first syllable.
- **Shayaun → Shruti at 0:42** · Shayaun's closing phrase is *"falls under the radar."* · Shruti picks up on *"Chained, the system surfaces…"* · no click; the chyron-update is the visual transition.

These two hand-offs are the only timing-critical moments. Practice them once.

---

## Operator action checklist (for the screen-recorder driver)

The action sequence is intentionally simpler than v2 — only **one click** during
the recording, at 0:18 (open EV1 to reveal the reasoning chain).

| Action | When | How |
|---|---|---|
| Hit `Ctrl+Shift+R` | Pre-roll | Resets state |
| Verify substrate chyron reads `settling · watchfloor at rest` | Pre-roll | If not, repeat reset |
| Begin recording · stay on cold open | 0:00 | Don't click anything · let the substrate stratification + AI-discovery toast establish |
| Click EV1 (`OFAC-listed HUGE…` row) | 0:18 (start of beat 3) | This is the "aha" click · the reasoning chain populates the right rail |
| Hold on the working-pane reasoning chain | 0:18–0:50 | No further clicks · let VO walk through the four real-world findings while the screen shows the populated case |
| Hold final frame | 0:50–1:00 | Wordmark + chyron close · no clicks |

**Single-click recording.** This is the safest possible take: no replay engine
to misfire, no rule-save to validate, no second-case to navigate to. The agent
has already done the work; the operator's only action is **clicking into the
hypothesis to read the reasoning**. That click *is* the demo's argument.

---

## Concrete-language audit · operator literacy

These tokens must appear at least once in the 60s VO:

| Token | Beat | Why it matters |
|---|---|---|
| `5th Fleet` / `0200` / `Strait of Hormuz` | 1 | Operator-literate cold open |
| `open-source intelligence` / `OSINT` | 1 | Names the input layer |
| `knowledge graph` | 2 | Names the relate layer |
| `Iranian crude tanker` / `spoofing` / `MMSI` | 2 | The marquee real-world finding |
| `chain of behaviors` / `chained together` | 3 | The cognitive-pipeline structural claim |
| `pattern of suspicious intent` | 3 | Names what the chain becomes |
| `OFAC` / `Global Fishing Watch` / `seven broadcast identities` | 3 | Real-data provenance · system-credibility tokens |
| `gray-market` / `loitering clusters` / `ships changing identity` | 4 | The four real-world findings |
| `judgment seat, not the correlation seat` | 5 | The product principle |
| `pre-command evidence integrity` / `restraint as a security feature` | 5 | The closing positioning claim |

**If any token disappears in a re-record, restore it before publishing.**

---

## What we are NOT doing in this take

These are part of the product but **not** part of this 60s narrative. If asked
in Q&A, point to them:

| What | Where it lives in the product | Mention only if asked |
|---|---|---|
| Server-stamped guard refusal verdict | Working pane · structural-guard surfaces fire on phase advance | Q&A: *"How is refusal enforced?"* |
| Wet/drying/dry typography state | Evidence chain rows | Q&A: *"What does that color-shift mean?"* |
| Substrate-state chyron handoff text | Bottom of shell, all phases | Q&A: *"What's that bottom strip?"* |
| Rule-compounding edges visualization | EV2 rule-applied beat | Q&A: *"What happens when the analyst writes a rule?"* |
| Phase-keyed focus management | Cmd+1/2/3/4 + dimming | Q&A: *"How is the operator workflow structured?"* |
| Drag-and-drop signal attach | AI-PROPOSED draft → stage | Q&A: *"How does the operator interact with the agent?"* |

**These are V2 demo features that are still wired and demonstrable. They support
the v3 cognitive-pipeline narrative — they're the technical proof underneath the
left-to-right reading. Use them as Q&A surfaces, not as 60s primary visuals.**

---

## Failure modes — what to do when the take goes wrong

| Failure | Fix |
|---|---|
| Bottom chyron says "reviewing" on cold open | Replay state lingered. `Ctrl+Shift+R` and restart take. |
| AI-discovery toast not visible | localStorage may have dismissed it. Reset: `Ctrl+Shift+R`. |
| Working pane is empty after EV1 click | Click didn't register. Re-click on the row body, not on a chip. |
| Real-OSINT case body doesn't show citations | Danti pipeline cache may have rotated. Verify `fixtures/maritime/live-cache/` contains recent files. |
| Window not full-screen / wordmark wraps | Bring desktop Electron app to focus, full-screen, 100% zoom. |
| Some other case is selected (not EV1 OFAC HUGE) | Manual click on EV1 to ensure default. |

---

## Two voices, single voices, 11Labs

- **Single-voice (Shruti) — recommended.** The dry run read in this voice and the cognitive-pipeline framing carries through one narrator more naturally. Less production overhead.
- **Two-voice (Shruti + Shayaun) — preserved for Round 1/2 stage pitches.** See `round1-round2-script.md` for the two-voice version.
- **11Labs:** **not recommended for the submission video.** The substantive claim is *"trust earned by restraint"* and *"the operator stays in the judgment seat"*; AI-cloned VO undermines those meta-messages. Use only if a clean live take is impossible by deadline.

---

## Fallback recording

- Record at 1× speed using QuickTime / OBS / ScreenStudio · save as `docs/liminal-custody-demo-60s.mp4`.
- Hero image candidate: still frame at **0:18–0:32** during beat 3 — the reasoning chain populated on the right rail with substrate stratification visible on the left. That single frame summarizes the cognitive-pipeline read.
- Keep the recording in the repo so the demo survives a wifi / server outage and so judges who can't replay live still see the make-or-break beat.

---

## Cross-references

- **Demo arc canonical (cognitive-pipeline framing):** `docs/demo-arc-v3-cognitive-pipeline.md` (next doc to write)
- **Demo arc v2 (preserved-but-superseded · 9-beat temporal):** `docs/demo-arc-v2.md`
- **Round 1 / Round 2 stage narration:** `docs/round1-round2-script.md` (uses two-voice + temporal-phase framing — appropriate for stage)
- **Q&A drills:** `docs/q-and-a.md`
- **Module → beat → pitch language:** `docs/integration-state.md` §3
- **Real / fixture / not claimed:** `docs/public-repo-notes.md`
- **Judge-by-judge calibration:** `docs/v4-judge-calibrated-demo.md`
