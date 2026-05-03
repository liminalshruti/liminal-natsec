# Liminal Custody SpeedRun Cut · 60 seconds

A beat-by-beat shooting script for the proof clip judges watch in their inbox
on 2× speed. Mirrors the locked spine in `docs/v3-sequencing-plan.md` and the
judge-calibrated structure in `docs/v4-judge-calibrated-demo.md` §7. Voice-over
must match Round 1 narration so judges who watch the video *and* see Round 1
hear the same vocabulary. Practice 5+ times before recording; the make-or-break
beat is the second-case recommendation change, and the load-bearing
differentiator is *Intent refused **because** Signal Integrity contested*.

## Pre-roll setup (run once, off camera)
- `bun run dev:desktop` is up · server on :8787 · app on :5173.
- localStorage `seaforge:review-rules:v1` cleared (or hit `Ctrl+Shift+R`).
- Window 100 %, full screen, dark UI mode.
- Selected alert: leave the first event-1 anomaly highlighted.
- Map paused at Phase 1 (background traffic only).

## Beats

| t | duration | beat | spoken cue | what the screen shows |
|---:|---:|---|---|---|
| 0:00 | 5 s | 1. 5th Fleet watchfloor at 0200 | "It's 2 AM at the 5th Fleet watchfloor. A vessel in the Strait of Hormuz is about to go dark." | App shell, map showing background traffic in the Hormuz AOI, no alert selected. |
| 0:05 | 5 s | 2. Vessel goes dark | "38 minutes of silence inside the corridor." | Phase advances · `P2 · Dark gap alert` badge in topbar · zone pulse on map · alert appears in Substrate. |
| 0:10 | 5 s | 3. Second identity emerges | "A different MMSI appears where Kalman expected." | `P3 · Second identity` · Track B pings inside the predicted ellipse on the map. |
| 0:15 | 5 s | 4. Open the case | "Three custody hypotheses preserved — the system doesn't pick one." | Operator clicks alert · Working Panel renders HypothesisBoard with PRIMARY 70 %, ALTERNATIVE 19 %, ALTERNATIVE 11 % · evidence counts visible. |
| 0:20 | 8 s | 5. **Signal Integrity contested** *(hero)* | "Identity flags MMSI mismatch. Visual flags AIS-class mismatch. Kinematics flags continuity inside a known spoofing envelope. **Three independent specialists converge on source-chain compromise.**" | Specialist Reads strip — `signal_integrity` row in CONTESTED treatment, expanded summary visible, dashed connector down to `intent`. |
| 0:28 | 7 s | 6. **Intent refused — structurally** | "Because Signal Integrity is contested, **Intent refuses to overclaim** — and refusal is enforced server-side, not requested. AI can't talk its way past it." | `intent` row REFUSED · "STRUCTURAL GUARD" tag · redirect arrow to `collection`. |
| 0:35 | 5 s | 7. Save the rule | "The watch officer writes a rule: identity churn alone is insufficient without second-source confirmation." | ReviewMemory · `+ save R-001 to memory` clicked · green toast · Saved Rules list shows R-001 ACTIVE. |
| 0:40 | 10 s | 8. Second case changed *(make-or-break)* | "Two hours later, a similar case. The prior rule has changed the recommendation — `monitor` is now PRIOR TOP, `request-sar-rf` is RECOMMENDED. The system learned from a human's correction." | Click event-2 alert · staged crossfade in Zone 1: posture line → verb line → `[R-001]` chip · CaseHandoffBanner fires · ActionOptions reorders. |
| 0:50 | 8 s | 9. Pre-command evidence integrity | "Pre-command evidence integrity. Restraint as a security feature. Liminal Custody protects the evidence before it becomes command." | App holds on the running shell — Liminal Custody wordmark in topbar visible (no separate slide; v4 §7 explicitly: stay in-app). |
| 0:58 | 2 s | 10. Brand close | *(silent)* | Wordmark + "LIMINAL CUSTODY · WATCHFLOOR" topbar held on screen until fade. |

Total: 60 s.

## Fallback recording
- Record the same beat sequence at 1× speed using QuickTime / OBS · save as
  `docs/liminal-custody-speedrun-60s.mp4`.
- A still frame of the CaseHandoffBanner moment (beat 8) is the hero image.
- Keep the recording in the repo so the demo survives a wifi/server outage.

## Things to never cut
Per `docs/v3-sequencing-plan.md` §"Never cut (v3)" and `docs/v4-judge-calibrated-demo.md` §7:
- Beat 5 (Signal Integrity contested) and beat 6 (Intent refused) must read as a *causal pair*,
  not two independent rows. The line *"Intent refused **because** Signal Integrity contested"*
  is the v3 differentiator and the load-bearing PS4 beat — it carries both the convergence
  story and the structural-guard invariant. If the connector or the narration fails to land,
  no other beat compensates.
- Beat 8 (second-case changed by review rule) is non-negotiable. This is the make-or-break
  moment per v3-sequencing-plan §"One thing to protect" — the proof that human correction
  becomes durable doctrine.
- Beat 9's closing line *"Pre-command evidence integrity. Restraint as a security feature."*
  is the v4 §7 close. Do not paraphrase.
- The phase badge in the topbar must visibly advance through P1 → P3 → P5 during beats 1–6.

## Things safe to cut on time pressure
- Beat 4 (hypothesis posteriors narration) can compress to 3s if total runs long.
- Beat 7 (rule save) narration can shorten — the green toast does the work.
- Slash-command flourish (`/event 2`) can be replaced with a click.

## Q&A drills (post-demo)
- *"How do you avoid false-association?"* — JPDA on the kinematic specialist
  + Identity specialist's metadata conflict + the contested status on the
  custody claim. The system explicitly preserves the alternative hypotheses.
- *"What runs locally vs. server-side?"* — Tier B server is Hono on Bun;
  graph-spine is portable; the maritime adapter is the only domain layer.
- *"Where does this generalize?"* — `graph-spine/` has zero maritime terms.
  Switch the fixture pack and the same Evidence Custody Loop applies to any
  contested-artifact domain (Liminal personal-knowledge, Watchstander, etc.).
