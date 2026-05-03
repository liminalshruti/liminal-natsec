# MapWatchfloor — integration note for the app-shell agent

Coordination doc for the SeaForge map/replay/timeline lane. Read before wiring `MapWatchfloor` into `StageViewport.tsx`.

## Mount

```tsx
import MapWatchfloor, { type ScenarioState } from "./MapWatchfloor";

// In StageViewport.tsx (app-shell agent owns this file — map agent does not edit it):
const hasScenarioState = scenarioState !== undefined;

return (
  <div className="stage-viewport">
    <MapWatchfloor
      key={hasScenarioState ? "controlled" : "uncontrolled"}  // forces clean remount on mode change
      scenarioState={scenarioState}                            // optional; see below
      onScenarioStateChange={setScenarioState}                  // wired only in controlled mode
      selectedAlertId={selectedAlertId}
      selectedCaseId={selectedCaseId}
      resetSignal={resetCounter}                                // bump to force teardown for Ctrl+Shift+R
      rasterTilesUrl={import.meta.env.VITE_MAP_TILES_URL}       // optional; absent → pure GeoJSON look
    />
  </div>
);
```

## Modes

- **Controlled** — pass `scenarioState`. The shell drives the clock + phase. The scrubber inside the map emits `onScenarioStateChange` on user scrub; the shell decides what to do with it.
- **Uncontrolled** — omit `scenarioState`. The map runs its own demo clock (~20s real time per full scenario) and emits state via `onScenarioStateChange` so the shell can mirror if desired. Useful while the shell is being built.

**Mode is locked at first render** of each instance. Switching modes mid-life would race the rAF clock against prop arrival; use `key=` (above) to remount on mode flip.

## Fixture serving (Vite config — must be agreed before freeze)

The map fetches `/fixtures/maritime/tracks.geojson`. Vite serves `public/` at `/`, but the fixture lives at `<repo-root>/fixtures/maritime/tracks.geojson`. Pick one:

1. **Recommended** — add a `predev`/`prebuild` script in `app/package.json` that copies `../fixtures/` → `public/fixtures/`:
   ```json
   {
     "scripts": {
       "predev":   "node -e \"require('fs').cpSync('../fixtures','public/fixtures',{recursive:true})\"",
       "prebuild": "node -e \"require('fs').cpSync('../fixtures','public/fixtures',{recursive:true})\""
     }
   }
   ```
2. Set `publicDir: '../fixtures'` in `vite.config.ts` and override `MapWatchfloor`'s `fixtureUrl` prop to `/maritime/tracks.geojson`.
3. Symlink `public/fixtures` → `../../fixtures` (works locally, fragile in CI).

## Required deps in `app/package.json`

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "maplibre-gl": "^4"
  },
  "devDependencies": {
    "@types/geojson": "^7946",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "vite": "^5",
    "@vitejs/plugin-react": "^4"
  }
}
```

## Reset

`Ctrl+Shift+R` should:
1. clear scenario state in your global store
2. bump the `resetSignal` integer passed to `MapWatchfloor`

The map then fully tears down (rAF handles, MapLibre listeners) and reloads the fixture from scratch. No leaked state across runs.

## Rebuilding the fixture

Run from repo root:

```
node --experimental-strip-types scripts/build-tracks-geojson.mjs
```

The script imports `shared/scoring/kalman.ts` to compute the predicted 95% ellipse so Track B's first ping is mathematically inside it (Mahalanobis ≈ 0.83, matching `TECHNICAL_PLAN.md` §14.4). The fixture-load invariant in `app/src/map/fixtureLoader.ts` enforces this at runtime.

## What the map does NOT consume

- The graph-spine. Map renders pure geometry from `tracks.geojson` only.
- Backend scenario state. If you wire the WebSocket later, translate it into the `scenarioState` prop shape; the map stays unaware of transport.
- Substrate / custody / hypothesis state. Other lanes own those panels.

## What it does emit

- `onScenarioStateChange(state)` — only useful in uncontrolled mode (or as a passthrough echo in controlled mode).
- `onMapReady(map)` — escape hatch for debugging; don't rely on this for normal wiring.
