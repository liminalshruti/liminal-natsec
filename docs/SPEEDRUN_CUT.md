# Liminal Custody SpeedRun Cut · 55 seconds

A beat-by-beat shooting script for the live demo and the fallback recording.
Mirrors the locked spine in `docs/v2/SeaForge_Sequencing_Plan_v2.md` ("vessel
goes dark → second identity → preserve hypotheses → refuse → review rule
changes the next case"). Practice 5+ times before stage; the make-or-break
beat is the second-case recommendation change.

## Pre-roll setup (run once, off camera)
- `bun run dev` is up · server on :8787 · app on :5173.
- localStorage `seaforge:review-rules:v1` cleared (or hit `Ctrl+Shift+R`).
- Browser zoom 100 %, full screen, dark UI mode.
- Selected alert: leave the first event-1 anomaly highlighted.
- Map paused at Phase 1 (background traffic only).

## Beats

| t | duration | beat | spoken cue | what the screen shows |
|---:|---:|---|---|---|
| 0:00 | 4 s | 1. Watchfloor at rest | "We're inside a watchfloor monitoring an EEZ box." | App shell, map showing background traffic, no alert selected. |
| 0:04 | 6 s | 2. Vessel goes dark | "Track A goes silent for 38 minutes inside the corridor." | Phase advances · `P2 · Dark gap alert` badge in topbar · zone pulse on map · alert appears in Substrate. |
| 0:10 | 6 s | 3. Second identity emerges | "A different MMSI appears where Kalman expected — one minute later." | `P3 · Second identity` · Track B pings inside the predicted ellipse on the map. |
| 0:16 | 7 s | 4. Open the case | "Click the alert. Three custody hypotheses, not one answer." | Operator clicks alert · Working Panel shows HypothesisBoard with PRIMARY 70 %, ALTERNATIVE 19 %, ALTERNATIVE 11 % · evidence counts visible. |
| 0:23 | 6 s | 5. Provenance + evidence | "Action → claim → hypothesis → anomaly → observation. Every step traceable." | ProvenanceTrace strip · EvidenceDrawer expands one SUPPORTS and the CONTRADICTS metadata-conflict card. |
| 0:29 | 6 s | 6. The Intent refusal | "The Intent specialist refuses. The system will not infer hostile intent from this evidence." | RefusalCard prominent · "STRUCTURAL GUARD" tag · bounded-reads list. |
| 0:35 | 6 s | 7. Save the rule | "Operator saves a review rule: 'on dark-gap identity churn, request SAR/RF first.'" | ReviewMemory · `+ save R-001 to memory` clicked · green toast · Saved Rules list shows R-001 ACTIVE. |
| 0:41 | 8 s | 8. Second case changed | "Event 2 fires. Same trigger conditions. The prior rule has changed the recommendation." | Operator types `/event 2` (or clicks the second alert) · CaseHandoffBanner fires · ActionOptions: `request-sar-rf` becomes RECOMMENDED, `monitor` is PRIOR TOP. |
| 0:49 | 4 s | 9. Reset and close | "One keystroke restores a clean run." | `Ctrl+Shift+R` · reset toast · saved rules cleared · alert returns to event-1. |
| 0:53 | 2 s | 10. Tagline | "Liminal Custody: contested artifacts, honest refusals, prior rules that travel." | Brand bar in topbar held on screen. |

Total: 55 s.

## Fallback recording
- Record the same beat sequence at 1× speed using QuickTime / OBS · save as
  `docs/liminal-custody-speedrun-55s.mp4`.
- A still frame of the CaseHandoffBanner moment (beat 8) is the hero image.
- Keep the recording in the repo so the demo survives a wifi/server outage.

## Things to never cut
- Beat 6 (Intent refusal) and beat 8 (second-case changed) are non-negotiable.
  Per `docs/v2/SeaForge_Sequencing_Plan_v2.md`: "A second event card shows a
  changed recommendation because of a human review rule" — that is the one
  thing to protect.
- The phase badge in the topbar must visibly advance through P1 → P3 → P5
  during beats 1–6.

## Things safe to cut on time pressure
- Beat 5 (provenance trace) can compress if 0:23 runs long.
- Beat 9 (reset) can be skipped if recording — leave it for live demos.
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
