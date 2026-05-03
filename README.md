# SeaForge / liminal-natsec

SeaForge is the demo artifact for evidence-backed maritime custody under contested signals. The build is organized around one persistent shell:

```text
Substrate / Signal Sources -> Stage Viewport -> Working Panel -> Command Line
```

The integration lane keeps the repo runnable while app, server, graph-spine, and fixture lanes land in parallel.

## Local Commands

Use Bun for the demo path:

```sh
bun install
bun run test
bun run dev:server
bun run dev:app
bun run dev
bun run build
```

Node is available as the fallback test runner when Bun is not installed in a shell:

```sh
npm test
```

The root scripts are contract-aware. App/server dev commands start the lane-owned entrypoints once they exist and fail with a clear message while those entrypoints are still absent.

## Demo Checklist

1. Start the server with `bun run dev:server`.
2. Start the app with `bun run dev:app`.
3. Run the replay.
4. Trigger the dark gap.
5. Open the custody case.
6. Show the specialist refusal.
7. Save the review rule.
8. Show the second case changed by the prior rule.
9. Press `Ctrl+Shift+R` and verify reset.

## Never-Cut Invariants

- Persistent shell.
- Dark gap + two-MMSI identity churn.
- Hypothesis board.
- Evidence/provenance trace.
- Specialist refusal.
- Review rule saved.
- Prior rule applied / second case changed.

## Smoke Coverage

`bun run test` or `npm test` runs all available smoke tests. Tests for app/server/graph-spine contracts skip while another lane has not landed the relevant files, then become real assertions automatically once those files are present.

Core smoke checks:

- Graph trace: action -> claim -> hypothesis -> anomaly -> observation.
- Server replay: fixture replay produces anomaly, claims, and actions.
- App shell load: app shell exposes a fetch or fixture fallback path.
