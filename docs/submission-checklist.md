# Submission Checklist — NatSec Hackathon, Sunday 2026-05-03

Hard deadline: **1200 PT, Sunday 2026-05-03** (`details.md` §8). Submission form
captures: track (PS1 primary), team, public repo URL, **1-minute demo video URL**,
short description.

This file is the day-of execution doc. Everything below is ordered the way
Sunday actually runs.

---

## 1. Pre-submission gates (do before noon)

- [ ] **GitHub repo flipped public.** `details.md` §9 requires public repo at submission.
      Visit `Settings → Danger Zone → Change visibility → Public`.
- [ ] **`LICENSE` present at repo root.** (Already in tree; verify.)
- [ ] **No `Co-Authored-By: Claude` / Anthropic / AI attribution in any commit message.**
      `git log --grep -i 'claude\|anthropic\|co-authored.*ai'` must return empty
      (CLAUDE.md hard rule).
- [ ] **No secrets committed.** `git log -p | grep -iE 'api[_-]?key|secret|token|password'`
      against the full history. `.env`, `~/.codex/auth.json`, `~/.pi/agent/auth.json`
      must be gitignored.
- [ ] **README at `main`** references the demo video URL (badge near the top) and
      the `bun run dev:desktop` quickstart.
- [ ] **`docs/liminal-custody-onepager.md` reachable** from README ("Judge or
      investor reading this for the first time?" link works).
- [ ] **`bun install && bun run test` passes on a clean clone** in a separate worktree
      (judge re-runs are allowed at any time during top-6 prep).

---

## 2. One-minute demo video (PS1 submission requirement)

`details.md` §13 mandates a one-minute video uploaded with submission. This is
the artifact judges click first. Script: `docs/demo-video-script.md` — VO is
verbatim-aligned with the Round 1 narration in `docs/round1-round2-script.md`.

- [ ] **Pre-roll setup** complete per `docs/demo-video-script.md` §"Pre-roll setup".
- [ ] **Record at 1× speed** with QuickTime (Mac, Cmd-Shift-5) or OBS.
- [ ] **Verify the concrete-language audit** in `docs/demo-video-script.md` — every
      required token (`5th Fleet`, `0200`, `Hormuz`, `dark gap` / `38 minutes of
      silence`, `second-source`, `Signal Integrity`, `structurally`, `evidence
      chain`) is audible at least once.
- [ ] **Verify the make-or-break beats land:** beat 5 (Signal Integrity contested),
      beat 6 (Intent refused — structurally), beat 8 (second case changed).
- [ ] **Trim to ≤ 60 seconds.** Confirm a 2× pass still reads as coherent — judges
      may watch on accelerated playback.
- [ ] **Save mp4 in repo** at `docs/liminal-custody-demo-60s.mp4` (offline
      fallback if the venue wifi or YouTube is degraded).
- [ ] **Upload to YouTube (Unlisted)** — *not* Public, *not* Private. Loom is the
      backup destination.
- [ ] **Paste video URL into**:
  - the submission form `Demo Video URL` field
  - the README badge area at `main`
  - `#submissions` Discord channel if requested
- [ ] **Watch the uploaded video on a clean browser** (incognito, signed out) —
      verify it plays without sign-in, captions are off, thumbnail is the
      CaseHandoffBanner moment.

---

## 3. Submission form fields (memorize before opening the form)

| Field | Value |
|---|---|
| Project name | **Liminal Custody** |
| Problem statement | **Problem Statement 1 — Sensor Analysis & Integration** (primary). PS3 / PS4 are narrative-only; do not check additional boxes if the form is single-select. |
| Team members | Shruti Rajagopal, Shayaun (Sean) Nejad |
| Repo URL | (public GitHub URL) |
| Demo video URL | (YouTube unlisted URL from §2) |
| One-line description | *"Pre-command evidence integrity for contested target custody — refusal is structurally enforced, not requested."* |
| Hackathon track | NatSec Hackathon (Cerebral Valley × Army xTech) |

**The single sentence to drill** (per `docs/v4-judge-calibrated-demo.md` §8):

> "Command systems start too late. Liminal Custody protects the evidence before it becomes command."

---

## 4. Demo-day commands (run from `liminal-natsec/` root)

Sequence on the demo machine before each judging slot:

```sh
# Once, in the morning
bun install

# Server (Tier B — guard.ts + M1–M7)
bun run dev:server     # serves on :8787

# Desktop app (Electron-wrapped Vite)
bun run dev:desktop    # Shruti's hard requirement — not a browser tab
```

Sanity checks:

```sh
# Health endpoint reachable + AI fallback flag visible
curl -s http://localhost:8787/health | jq .aiFallback

# Smoke tests pass
bun run test
```

In-app reset between judging slots:

- `Ctrl+Shift+R` — clears `seaforge:review-rules:v1` localStorage; re-arms the
  rule-saved → second-case-changed beat.
- Confirm replay paused at Phase 1 (background traffic only) before judges
  approach.

If a judge asks to see live AIP during Q&A only:

```sh
# Toggle on Shayaun's machine, not the demo machine
export AIP_LOGIC_LIVE=true
# (Implementation detail: see server/src/specialists/registry.ts)
```

Then run the next specialist call live; the structural guard wraps the output.
**Demo critical path stays on fixtures; AIP is Q&A-only.**

---

## 5. Fallback ladder (in order — escalate only when the prior step fails)

1. **Live desktop app.** Default. `bun run dev:desktop`, fixture replay, full
   Round 1 spine.
2. **Recorded 60-second demo video.** If the app fails mid-pitch, Shayaun says
   *"let me cut to the recorded run"* and plays
   `docs/liminal-custody-demo-60s.mp4` from QuickTime. Shruti narrates
   *as if* the recorded clip is live.
3. **Phone with the YouTube URL queued.** If the laptop is dead, Shayaun's phone
   plays the unlisted YouTube video to the judges. Shruti narrates from memory.
4. **Verbal walk-through.** If everything fails: *"We have the full demo
   recorded — happy to send the link."* Pivot the remaining time to Q&A. The
   Q&A handoff matrix in `docs/round1-round2-script.md` becomes the
   differentiator.

This ladder mirrors the Round 1 in-pitch fallback in
`docs/round1-round2-script.md` §"Fallback ladder (during pitch)". Don't
invent new escalation logic on the day.

---

## 6. Day-of timeline (Sunday 2026-05-03)

Anchored to `details.md` §8.

| Time | Action |
|---|---|
| 0900 | Doors open. Demo machine on, server + desktop app booted, smoke tests pass, video uploaded. |
| 0900 – 1130 | **Three full Round 1 rehearsals**, one with the demo intentionally broken, one with hostile Q&A from `docs/q-and-a.md`. Per `CLAUDE.md` §"Operating cadence": three consecutive clean rehearsals required before noon. |
| 1130 – 1200 | Final pre-submission gate sweep (§1) + submission form filled and submitted. **Do not submit before the video is uploaded and verified.** |
| 1200 | Hacking stops. Submissions closed. |
| 1215 – 1400 | Round 1 judging — group format, 3-min pitch + 1–2 min Q&A. Reset (`Ctrl+Shift+R`) between every slot. |
| 1410 | Finalists announced. If top 6: switch to Round 2 script. |
| 1410 – 1445 | Round 2 — stage, panel, 3-min pitch + 2–3 min Q&A. Maven-augmenting frame. Architecture beat is *verbal, gesture at the running app's panes* — no slide. |
| 1515 | Winners announced. |

Per-slot pre-flight (10 sec, do every time judges approach):

- [ ] App fullscreen, dark UI, wordmark visible in topbar
- [ ] Map paused at Phase 1, no alert selected
- [ ] `Ctrl+Shift+R` pressed, rule list empty
- [ ] Server still up (`/health` returns 200)
- [ ] Water bottle off the table

---

## 7. Hard "do not" list

- **No slides.** `details.md` §13 explicitly: *"Please do not show us a presentation."*
- **No "Co-Authored-By: Claude" / Anthropic / AI attribution in commits.** CLAUDE.md hard rule.
- **No naming Maven, Palantir, or CJADC2 in Round 1.** Round 1 is Maven-invisible.
- **No live LLM claim in the critical-path narration.** AIP Logic is build-path + Q&A fallback only.
- **No live AIS feed claim.** Demo runs on `fixtures/maritime/` deterministic data.
- **No apologizing for cut features.** Cuts were strategic; if asked, frame as
  *"we cut [X] because [reason]"* per `docs/q-and-a.md` §"Rules of engagement".
- **No "we'll figure that out post-pilot" answers.** If unknown, say *"I want
  to learn that from the pilot."*

---

## 8. Submission complete — final sanity check

After hitting submit:

- [ ] Form confirmation email received
- [ ] Repo URL clickable from a fresh browser session (incognito, signed out)
- [ ] Video URL clickable from a fresh browser session (incognito, signed out)
- [ ] README at `main` shows the video link
- [ ] `docs/liminal-custody-demo-60s.mp4` is committed (offline fallback)
- [ ] Round 1 hook memorized to muscle-memory:

      > "0200 at the U.S. 5th Fleet watchfloor. A vessel in the Strait of
      > Hormuz goes dark. 38 minutes later, a different identity appears
      > 4 nautical miles away. The watch officer has 30 seconds to decide:
      > escalate, monitor, or request second-source collection. Most
      > command-and-control systems start *after* this moment. **Liminal
      > Custody protects the evidence chain before it becomes command.**"

- [ ] 90-day pilot ask memorized to muscle-memory:

      > "We want a 90-day pilot with a maritime watchfloor or an xTech-aligned
      > sponsor on contested AIS replay data."
