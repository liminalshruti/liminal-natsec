# Parallel session coordination — shruti/tier1-parallel-build

Five Claude Code sessions are working on the same branch in parallel. This
file is the single source of truth for who's doing what. **Update your
session's row before claiming work.** Other sessions read this file
before deciding what to touch.

## ⚠️ PARTITION VIOLATION DISCOVERED — read before committing

All 5 sessions share the SAME working directory. When Sx runs `git add`
without explicitly listing files, OR uses `git add .` / `git add -A` /
`git commit -a`, it picks up OTHER sessions' uncommitted WIP files.

This happened with S1+S2: S2's full output (ReplayControls.tsx,
CommandLine.tsx, styles.css S2 region) ended up bundled into S1's
commit (`8000f89`). User accepted as-is for this round.

**To prevent recurrence (S3/S4/S5):**

1. **NEVER `git add .` or `git add -A` or `git commit -a`.** Always
   list YOUR specific files: `git add app/src/components/MyComponent.tsx ...`
2. **Run `git status` before staging.** If you see files you don't own,
   you're sharing the tree with another session. Stage only your owned set.
3. **If you accidentally pull another session's WIP into your `git add`,
   `git restore --staged <their-file>` to unstage** before commit.
4. The file partition table below is the source of truth for who owns what.

## Hard rules — DO NOT VIOLATE

1. **`git pull --ff-only`** before EVERY commit. If pull fails (commits
   diverged), STOP, surface to user. Never `git pull` (without ff-only)
   and never auto-merge.
2. **No force-push.** Period. Force-push obliterates other sessions' work.
3. **Stay in your owned files.** If you need to edit a file owned by
   another session, mark BLOCKED in this file and wait for the other
   session to ship.
4. **One commit per item.** Multi-commit on the shared branch. Each
   session's commit message starts with `[S1]`, `[S2]`, etc., for
   traceability.
5. **No edits to existing CSS rules in styles.css.** Append your new CSS
   at your designated region marker at the bottom of styles.css. Other
   sessions append at their own markers.
6. **Type-check before committing.** `cd app && bunx tsc --noEmit` must
   pass. If it fails because another session's WIP isn't pulled yet,
   pull again.
7. **If your session breaks something a previous commit shipped, REVERT
   your change, don't try to fix the other session's code.**

## Session ownership — locked partition

| Session | Items | Owned files (exclusive) | CSS region marker |
|---|---|---|---|
| **S1** | Named-operator card + Workflow strip | `app/src/components/NamedOperatorCard.tsx` (NEW), `app/src/components/WorkflowStrip.tsx` (NEW), `app/src/components/SubstratePanel.tsx`, `app/src/components/AppShell.tsx` (topbar region only, lines ~40-60) | `/* ─── S1 NAMED OPERATOR + WORKFLOW STRIP ─── */` |
| **S2** | Replay controls (manual prev/advance beat) | `app/src/components/ReplayControls.tsx` (NEW), `app/src/components/CommandLine.tsx` | `/* ─── S2 REPLAY CONTROLS ─── */` |
| **S3** | Map legend + Stage header (hero title/subtitle) | `app/src/components/MapLegend.tsx` (NEW), `app/src/components/StageHeader.tsx` (NEW), `app/src/components/StageViewport.tsx` | `/* ─── S3 MAP LEGEND + STAGE HEADER ─── */` |
| **S4** | Causal trace banner above command line | `app/src/components/CausalBanner.tsx` (NEW), `app/src/components/AppShell.tsx` (commandline-above region only, lines ~80-95) | `/* ─── S4 CAUSAL TRACE BANNER ─── */` |
| **S5** | Posture-forward verb register (Round 2 upgrade) | `app/src/components/CustodyCasePanel.tsx` (Zone 1 verb logic only — lines ~85-125) | `/* ─── S5 POSTURE-FORWARD REGISTER ─── */` |

**AppShell.tsx is shared by S1 + S4.** The two sessions edit DISTINCT
regions (S1: header/topbar; S4: above command-line / between WorkingPanel
and CommandLine). Auto-merge handles non-overlapping edits. If either
session sees the other's changes incoming, pull and integrate before
committing.

**CustodyCasePanel.tsx is owned by S5 ONLY.** No other session edits it.
S5 stays inside the Zone 1 verb derivation block (the const-assignment
chain producing `verbLabel` and `postureLabel`). Do not touch JSX, do
not touch hooks, do not touch any other section of the file.

## Session status — UPDATE BEFORE CLAIMING WORK

| Session | Status | Started | Committed | Notes |
|---|---|---|---|---|
| S1 | shipped | 2026-05-02T00:00Z | 2026-05-02T00:00Z | Named-operator card + Workflow strip |
| S2 | shipped | 2026-05-03T04:55Z | bundled into 8000f89 | replay controls (prev/play-pause/next). Work landed inside S1's commit due to shared working tree — files: ReplayControls.tsx, CommandLine.tsx, AppShell.tsx prop wire, S2 CSS region. |
| S3 | not started | — | — | — |
| S4 | not started | — | — | — |
| S5 | not started | — | — | — |

Status values: `not started` / `claimed` (you've claimed but not committed) /
`shipped` (commit pushed) / `blocked: <reason>`.

## Workflow per session

```
1. git checkout shruti/tier1-parallel-build
2. git pull --ff-only
3. cat PARALLEL_SESSIONS.md  ← read others' status
4. Edit your status row to "claimed: started <ISO time>"
5. Commit your status update FIRST: git commit -m "[Sx] claim: starting <item>"
6. Push: git pull --ff-only && git push
7. Do your work — only in YOUR owned files + YOUR CSS region
8. Type-check: cd app && bunx tsc --noEmit
9. git pull --ff-only  ← absorb others' commits since you started
10. If conflicts: STOP. Report to user. Don't auto-resolve.
11. git add <YOUR files only>
12. git commit -m "[Sx] <item>: <one-line description>"
13. Update your status row to "shipped: <ISO time>"
14. git add PARALLEL_SESSIONS.md && git commit --amend --no-edit
15. git pull --ff-only && git push
```

If `git pull --ff-only` fails after step 9, that means a non-fast-forward
state. Surface the conflict to the user; do not auto-merge.

## Per-session briefs

Each session's brief includes: the item spec, the exact files it owns,
the CSS region marker, and the success criteria. See `briefs/Sx.md`
for each session's full brief (paste into a fresh Claude Code window).
