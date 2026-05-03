# Demo Readiness Report

Date: 2026-05-03

Overall status: CONDITIONAL PASS / DEMO-RISKY

The technical core is working: tests pass, build passes, the watchfloor loads, and the critical proof beats are visible. The live demo is not yet judge-safe because the expected localhost app URL can resolve to the wrong app, the server/app startup path has port conflicts, and the browser console repeatedly reports a React update-depth warning from `MapWatchfloor`.

## Pass / Fail

| Area | Status | Notes |
|---|---:|---|
| Unit and smoke tests | PASS | `npm test` completed with 155 tests, 155 pass, 0 fail. |
| Production build | PASS | `npm run build` completed. Vite emitted a large chunk warning for the app JS bundle. |
| Server startup command | FAIL TO START NEW PROCESS | `bun run dev:server` failed because port `8787` was already in use. Existing server health was reachable and returned `status: ok`. |
| App startup command | PASS WITH SANDBOX ESCALATION | Sandbox bind failed on `0.0.0.0:5173`; escalated `bun run dev:app` started Vite successfully. |
| Browser demo path | CONDITIONAL PASS | The NatSec watchfloor loaded on the Vite network URLs, but `http://127.0.0.1:5173/` showed an unrelated Liminal catalog. |
| Critical demo beats | PASS WITH RISKS | Signal Integrity, Intent refusal, R-001 save, and Event 2 recommendation change are present. Reset and console stability need fixes. |

## Exact Commands Run

Primary rehearsal commands:

```sh
npm test
npm run build
bun run dev:server
bun run dev:app
```

Supporting verification commands:

```sh
curl -sS http://localhost:8787/health
curl -sS -m 2 http://127.0.0.1:8787/health
curl -I -sS -m 2 http://127.0.0.1:5173/
lsof -nP -iTCP:8787 -sTCP:LISTEN
lsof -nP -iTCP:5173 -sTCP:LISTEN
curl -sS -m 2 http://127.0.0.1:5173/
curl -sS -m 2 http://0.0.0.0:5173/
curl -sS -m 2 http://192.168.86.245:5173/
curl -sS -m 2 http://172.29.195.179:5173/
```

Browser walkthrough:

```text
Opened http://127.0.0.1:5173/
Opened http://192.168.86.245:5173/
Clicked reset
Entered /save-rule
Clicked Event 2
Pressed Control+Shift+R
```

Cleanup:

```sh
kill 83945
git status --short
```

## Command Results

- `npm test`: PASS. Final summary: `tests 155`, `pass 155`, `fail 0`.
- `npm run build`: PASS. Server build script was absent and skipped by contract; app build completed with `119 modules transformed`.
- Build warning: Vite reported `dist/assets/index-D0dD4wKw.js` at `2,134.07 kB`, above the default 500 kB chunk warning.
- `bun run dev:server`: FAIL for new process. Error: `Failed to start server. Is port 8787 in use?` / `EADDRINUSE`.
- Existing server health: PASS. `http://127.0.0.1:8787/health` returned `status: ok`, `capabilities.replay: true`, fixture files present, local store ok.
- Health caveat: Foundry and AIP returned `NOT_CONFIGURED`. That is acceptable for fixture-mode demo, but do not claim live Foundry/AIP during the timed pitch unless configured and rechecked.
- `bun run dev:app`: FAIL in sandbox with `listen EPERM: operation not permitted 0.0.0.0:5173`; PASS when run with approval outside the sandbox.
- App URL caveat: `http://127.0.0.1:5173/` served an unrelated `Liminal · Catalog`; the NatSec watchfloor served from the network URLs printed by Vite.

## Demo Beat Risks

- The demo does not reliably start from the obvious local URL. A judge/operator following a mental `localhost:5173` path may see the wrong product.
- `MapWatchfloor` repeatedly logs `Warning: Maximum update depth exceeded`. The UI remained visible, but this is a live stability risk and slows automation.
- The replay advances quickly. By the time the browser loaded, the app was already at P2/P3 or P6, not the demo-video pre-roll P1 state.
- `Next beat` became disabled at P6; clicking it timed out in browser automation. Operators need to use reset/previous/pause deliberately.
- `Ctrl+Shift+R` reset the phase to P2, but Event 2 could remain visually active while breadcrumb and working panel showed Event 1. `PRIOR RULE APPLIED` was also still visible on Event 1, which is confusing.
- The first case already showed `RECOMMEND collection` and `PRIOR RULE APPLIED` during parts of the walkthrough, which blurs the intended "save rule, then second case changed" story.
- Console has favicon 404s. Minor, but avoid having devtools visible during judging.

## Verified Critical Beats

- Watchfloor shell loads with `Liminal Custody · Watchfloor`.
- Named operator persona is visible: 5th Fleet watch officer, 0200 local, Strait of Hormuz.
- Event queue shows Event 1 and Event 2.
- Stage map and replay controls render.
- Specialist strip includes `Signal Integrity` with source-chain compromise language.
- Intent row shows `REFUSED` and the causal line: `Intent refused because Signal Integrity is contested`.
- `/save-rule` produces status text: `R-001 saved to review memory`.
- Event 2 shows `Prior review rule changed this recommendation` and `RECOMMEND collection`.
- `Control+Shift+R` triggers a reset, but the resulting UI state is inconsistent enough to fix before judging.

## Top 5 Fixes Needed Before Submission

1. Make the NatSec watchfloor reachable at one predictable demo URL, preferably `http://localhost:5173/`, and stop or move the unrelated catalog server before rehearsal.
2. Fix the `MapWatchfloor` maximum-update-depth loop before recording or judging.
3. Fix full reset consistency so `Ctrl+Shift+R` clears saved rule state, selects Event 1, returns to the intended pre-roll/early phase, and does not show `PRIOR RULE APPLIED` on Event 1.
4. Add a short operator runbook line: if `bun run dev:server` reports `8787` in use, verify `http://127.0.0.1:8787/health` before killing anything.
5. Rehearse and record the 60-second clip from the exact URL that will be used live, with the map paused/reset before beat 1.

## Submission Readiness Notes

- The live demo should stay in-app. Do not use a slide deck.
- The one-minute video is required by the hackathon submission rules and should show the same vocabulary as the Round 1 narration.
- The high-value 35 percent technical demo path is: dark gap, second identity, three hypotheses, Signal Integrity contested, Intent refused because Signal Integrity contested, rule saved, Event 2 recommendation changed.
- Keep the fixture path as the timed-demo default. Treat live AIP/Foundry as Q&A-only unless reconfigured and smoke-checked.
