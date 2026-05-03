import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode
} from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./MapWatchfloor.css";

import { buildMapStyle, INITIAL_VIEW } from "../map/style.ts";
import { buildLayers, SOURCES } from "../map/layers.ts";
import { loadTracks, type TracksFixture } from "../map/fixtureLoader.ts";
import {
  inferPhase,
  selectVisibleHeroPings,
  timelineBounds,
  type Phase
} from "../map/replay.ts";
import {
  executeCamera,
  flyForAlertOptions,
  flyForCaseBoundsOptions,
  flyForPhaseOptions
} from "../map/flyTo.ts";
import { attachTileFailureRecovery } from "../map/fallback.ts";
import { tryLiveKalmanEllipse } from "../map/kalmanAdapter.ts";
import { TimelineScrubber } from "../map/TimelineScrubber.tsx";
import { MapLabels } from "../map/MapLabels.tsx";
import { loadShipIcons } from "../map/shipIcons.ts";
import { PHASE_LABELS } from "../map/tokens.ts";

export interface ScenarioState {
  phase: Phase;
  clockIso: string;
  isPlaying: boolean;
}

export interface MapWatchfloorProps {
  // Controlled mode: parent owns scenario state. If undefined at first render,
  // the component locks into uncontrolled mode and runs its own clock — keeps
  // the map demoable while the app shell is still being built. Use a `key`
  // prop that flips when the parent first has scenario state to force a
  // clean remount instead of a live mode swap.
  scenarioState?: ScenarioState;
  onScenarioStateChange?: (state: ScenarioState) => void;

  // Selection-driven camera + emphasis. Either id may be null/undefined.
  selectedAlertId?: string | null;
  selectedCaseId?: string | null;

  // Bump this number to fully tear down + remount (Ctrl+Shift+R demo invariant).
  resetSignal?: number;

  // Optional escape hatch — get the raw maplibregl.Map for debugging.
  onMapReady?: (map: maplibregl.Map) => void;

  // Optional override for the fixture URL — useful in tests.
  fixtureUrl?: string;

  // Optional raster basemap URL. If absent, the dark-navy paint stands alone.
  // Suggested: import.meta.env.VITE_MAP_TILES_URL.
  rasterTilesUrl?: string;

  className?: string;
  style?: CSSProperties;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; fixture: TracksFixture }
  | { kind: "error"; error: Error };

export function MapWatchfloor(props: MapWatchfloorProps) {
  // Mode lock — captured at first render and never re-evaluated.
  const isControlledRef = useRef<boolean>(props.scenarioState !== undefined);
  const isControlled = isControlledRef.current;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const detachFallbackRef = useRef<(() => void) | null>(null);
  const lastFlownAlertIdRef = useRef<string | null | undefined>(undefined);
  const lastFlownCaseIdRef = useRef<string | null | undefined>(undefined);
  const lastFlownPhaseRef = useRef<Phase | null>(null);
  const lastVisiblePingSigRef = useRef<string>("");
  const lastEmittedStateSigRef = useRef<string>("");
  const latestControlledStateRef = useRef<ScenarioState | undefined>(props.scenarioState);
  const onScenarioStateChangeRef = useRef<MapWatchfloorProps["onScenarioStateChange"]>(
    props.onScenarioStateChange
  );

  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [mapReady, setMapReady] = useState(false);
  const [internalState, setInternalState] = useState<ScenarioState | null>(null);

  useEffect(() => {
    latestControlledStateRef.current = props.scenarioState;
  }, [props.scenarioState]);

  useEffect(() => {
    onScenarioStateChangeRef.current = props.onScenarioStateChange;
  }, [props.onScenarioStateChange]);

  // --- Load fixture (once per resetSignal) --------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoad({ kind: "loading" });
    loadTracks(props.fixtureUrl)
      .then(async (fixture) => {
        if (cancelled) return;
        await tryLiveKalmanEllipse(fixture);
        setLoad({ kind: "ready", fixture });

        if (!isControlled) {
          const bounds = timelineBounds(fixture);
          setInternalState({
            phase: 1,
            clockIso: new Date(bounds.startMs).toISOString(),
            isPlaying: false
          });
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setLoad({ kind: "error", error: err });
      });
    return () => {
      cancelled = true;
    };
  }, [props.fixtureUrl, props.resetSignal, isControlled]);

  // --- Resolve effective scenario state -----------------------------------
  const effectiveState: ScenarioState | null = isControlled
    ? props.scenarioState ?? null
    : internalState;

  const effectivePhase: Phase | null = useMemo(() => {
    if (!effectiveState) return null;
    if (load.kind !== "ready") return effectiveState.phase;
    if (isControlled) return effectiveState.phase;
    return inferPhase(load.fixture, Date.parse(effectiveState.clockIso));
  }, [effectiveState, load, isControlled]);

  useEffect(() => {
    if (isControlled) return;
    if (!effectiveState) return;
    if (effectivePhase === null) return;
    if (effectivePhase === effectiveState.phase) return;
    setInternalState({ ...effectiveState, phase: effectivePhase });
  }, [effectivePhase, effectiveState, isControlled]);

  useEffect(() => {
    if (isControlled) return;
    if (!internalState) return;
    const sig = scenarioStateSig(internalState);
    if (sig === lastEmittedStateSigRef.current) return;
    lastEmittedStateSigRef.current = sig;
    props.onScenarioStateChange?.(internalState);
  }, [internalState, isControlled, props.onScenarioStateChange]);

  useEffect(() => {
    if (isControlled) return;
    if (!props.scenarioState) return;
    if (!internalState) return;
    const incomingSig = scenarioStateSig(props.scenarioState);
    if (incomingSig === lastEmittedStateSigRef.current) return;
    if (incomingSig === scenarioStateSig(internalState)) return;
    setInternalState(props.scenarioState);
  }, [internalState, isControlled, props.scenarioState]);

  // --- Playback rAF (uncontrolled mode only) ------------------------------
  // Advances `internalState.clockIso` so the map and the scrubber both move
  // forward. The scrubber is now purely controlled — it never owns a clock.
  // Speed multiplier compresses the ~3.5-hour scenario span into ~20 s of
  // wall-clock time so the demo finishes inside a judging window.
  useEffect(() => {
    if (isControlled) return;
    if (load.kind !== "ready") return;
    if (!internalState) return;
    if (!internalState.isPlaying) return;

    const bounds = timelineBounds(load.fixture);
    const speedMultiplier = 600;
    let raf = 0;
    let prevTs = performance.now();

    const tick = (ts: number) => {
      const dt = ts - prevTs;
      prevTs = ts;
      setInternalState((prev) => {
        if (!prev) return prev;
        const nextMs = Math.min(
          bounds.endMs,
          Date.parse(prev.clockIso) + dt * speedMultiplier
        );
        if (nextMs <= Date.parse(prev.clockIso)) return prev;
        return { ...prev, clockIso: new Date(nextMs).toISOString() };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isControlled, load, internalState?.isPlaying]);

  useEffect(() => {
    if (!isControlled) return;
    if (load.kind !== "ready") return;
    if (!props.scenarioState?.isPlaying) return;

    const bounds = timelineBounds(load.fixture);
    const speedMultiplier = 600;
    let raf = 0;
    let prevTs = performance.now();

    const tick = (ts: number) => {
      const current = latestControlledStateRef.current;
      const notify = onScenarioStateChangeRef.current;
      if (!current?.isPlaying || !notify) return;

      const dt = ts - prevTs;
      prevTs = ts;
      const currentMs = Date.parse(current.clockIso);
      const nextMs = Math.min(bounds.endMs, currentMs + dt * speedMultiplier);
      if (Number.isFinite(nextMs) && nextMs > currentMs) {
        const nextClockIso = new Date(nextMs).toISOString();
        notify({
          ...current,
          clockIso: nextClockIso,
          phase: inferPhase(load.fixture, nextMs)
        });
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isControlled, load, props.scenarioState?.isPlaying]);

  // --- Construct the MapLibre instance ------------------------------------
  // React 18 StrictMode in dev runs effects twice (mount → cleanup → mount).
  // For imperative APIs like MapLibre that touch a single DOM container, the
  // double-mount can leave the second instance in a half-initialised state
  // — observable here as `transform.zoom = NaN`, broken `project()`, and
  // missing layer renders. Defer construction past the cleanup with rAF so
  // only the surviving second mount actually constructs a map.
  useEffect(() => {
    if (load.kind !== "ready") return;
    if (!containerRef.current) return;

    let cancelled = false;
    let createdMap: maplibregl.Map | null = null;

    const rafId = requestAnimationFrame(() => {
      if (cancelled || !containerRef.current) return;

      let map: maplibregl.Map;
      try {
        map = new maplibregl.Map({
          container: containerRef.current,
          style: buildMapStyle({ rasterTilesUrl: props.rasterTilesUrl }),
          center: INITIAL_VIEW.center,
          zoom: INITIAL_VIEW.zoom,
          bearing: INITIAL_VIEW.bearing,
          pitch: INITIAL_VIEW.pitch
        });
      } catch (err) {
        setLoad({ kind: "error", error: err as Error });
        return;
      }

      createdMap = map;
      mapRef.current = map;
      detachFallbackRef.current = attachTileFailureRecovery(map);

      // Belt-and-braces against MapLibre v5's occasional NaN transform on
      // first construction.
      try { map.jumpTo({ center: INITIAL_VIEW.center, zoom: INITIAL_VIEW.zoom }); } catch {}

      map.on("load", () => {
        if (cancelled) return;
        map.addSource(SOURCES.staticGeoJson, {
          type: "geojson",
          data: load.fixture
        });
        map.addSource(SOURCES.heroPingsVisible, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });
        // Load ship-icon sprites before adding symbol layers that reference
        // them. Failures are non-fatal — the underlying circle layer still
        // renders the vessel position; we just lose the ship-shaped overlay.
        loadShipIcons()
          .then((icons) => {
            if (cancelled || map.isMoving() === false) {
              for (const { id, img } of icons) {
                if (!map.hasImage(id)) {
                  map.addImage(id, img);
                }
              }
            }
          })
          .catch(() => {
            /* silent — ship sprites are an enhancement, not a requirement */
          });
        const initialPhase = effectiveState?.phase ?? 1;
        const initialLayers = buildLayers({
          phase: initialPhase,
          selectedCaseId: props.selectedCaseId ?? null
        });
        for (const layer of initialLayers) {
          map.addLayer(layer);
        }
        setMapReady(true);
        props.onMapReady?.(map);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      detachFallbackRef.current?.();
      detachFallbackRef.current = null;
      if (createdMap) {
        try { createdMap.remove(); } catch {}
      }
      if (mapRef.current === createdMap) {
        mapRef.current = null;
        setMapReady(false);
      }
      lastFlownAlertIdRef.current = undefined;
      lastFlownCaseIdRef.current = undefined;
      lastFlownPhaseRef.current = null;
      lastEmittedStateSigRef.current = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load.kind === "ready", props.resetSignal, props.rasterTilesUrl]);

  // --- Apply phase + selection to layers (filter + paint) -----------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || effectivePhase == null) return;

    const layers = buildLayers({
      phase: effectivePhase,
      selectedCaseId: props.selectedCaseId ?? null
    });
    for (const layer of layers) {
      if (!map.getLayer(layer.id)) continue;

      const filter = (layer as { filter?: unknown }).filter;
      if (filter !== undefined) {
        map.setFilter(layer.id, filter as maplibregl.FilterSpecification);
      }
      const paint = (layer as { paint?: Record<string, unknown> }).paint;
      if (paint) {
        for (const [prop, value] of Object.entries(paint)) {
          try {
            map.setPaintProperty(layer.id, prop, value as unknown as never);
          } catch {
            // Some paint props can't be set after add (rare for our layers);
            // skip silently rather than crash the demo.
          }
        }
      }
    }
  }, [effectivePhase, props.selectedCaseId, mapReady]);

  // --- Push time-sliced hero pings into the live source -------------------
  // The rAF playback ticks at 60 Hz but hero pings are at 3-minute demo
  // intervals (≈0.3 s wall at 600× speed). Calling setData on every render
  // saturates MapLibre's render loop with "Attempting to run(), but is
  // already running" errors. Compute a cheap signature of the visible set
  // and skip the setData when it hasn't changed.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || load.kind !== "ready" || !effectiveState || effectivePhase == null) return;
    const source = map.getSource(SOURCES.heroPingsVisible) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source) return;
    const visible = selectVisibleHeroPings(load.fixture, {
      phase: effectivePhase,
      clockMs: Date.parse(effectiveState.clockIso)
    });
    const sig =
      `${effectivePhase}|` +
      visible.features
        .map((f) => `${f.id}:${f.properties?.is_latest ? 1 : 0}`)
        .join(",");
    if (sig === lastVisiblePingSigRef.current) return;
    lastVisiblePingSigRef.current = sig;
    source.setData(visible);
  }, [effectiveState, effectivePhase, load, mapReady]);

  // --- Phase-driven camera ------------------------------------------------
  useEffect(() => {
    if (!mapReady || load.kind !== "ready" || effectivePhase == null) return;
    if (lastFlownPhaseRef.current === effectivePhase) return;
    lastFlownPhaseRef.current = effectivePhase;
    executeCamera(mapRef.current, flyForPhaseOptions(load.fixture, effectivePhase));
  }, [effectivePhase, load, mapReady]);

  // --- Selection-driven camera --------------------------------------------
  useEffect(() => {
    if (!mapReady || load.kind !== "ready") return;
    const id = props.selectedAlertId;
    if (id === lastFlownAlertIdRef.current) return;
    lastFlownAlertIdRef.current = id;
    executeCamera(mapRef.current, flyForAlertOptions(load.fixture, id));
  }, [props.selectedAlertId, load, mapReady]);

  useEffect(() => {
    if (!mapReady || load.kind !== "ready") return;
    const id = props.selectedCaseId;
    if (id === lastFlownCaseIdRef.current) return;
    lastFlownCaseIdRef.current = id;
    executeCamera(mapRef.current, flyForCaseBoundsOptions(load.fixture, id ?? ""));
  }, [props.selectedCaseId, load, mapReady]);

  // --- Scrubber clock changes back into uncontrolled state ---------------
  const handleScrubberChange = useCallback(
    (clockIso: string) => {
      if (isControlled) {
        const clockTime = Date.parse(clockIso);
        props.onScenarioStateChange?.({
          ...(props.scenarioState ?? { phase: 1, clockIso, isPlaying: true }),
          clockIso,
          phase:
            load.kind === "ready" && Number.isFinite(clockTime)
              ? inferPhase(load.fixture, clockTime)
              : props.scenarioState?.phase ?? 1
        });
        return;
      }
      setInternalState((prev) =>
        prev ? { ...prev, clockIso } : { phase: 1, clockIso, isPlaying: true }
      );
    },
    [isControlled, load, props]
  );

  const handlePlayPause = useCallback(
    (next: boolean) => {
      if (isControlled) {
        props.onScenarioStateChange?.({
          ...(props.scenarioState ?? {
            phase: 1,
            clockIso: new Date().toISOString(),
            isPlaying: next
          }),
          isPlaying: next
        });
        return;
      }
      setInternalState((prev) => (prev ? { ...prev, isPlaying: next } : prev));
    },
    [isControlled, props]
  );

  return (
    <div
      className={`map-watchfloor ${props.className ?? ""}`}
      style={props.style}
      data-phase={effectivePhase ?? "loading"}
      data-mode={isControlled ? "controlled" : "uncontrolled"}
      data-selected={props.selectedCaseId ? "case" : undefined}
    >
      {load.kind === "error" ? (
        <FallbackOverlay error={load.error} />
      ) : (
        <>
          <div ref={containerRef} className="map-watchfloor-canvas" />
          {mapReady && load.kind === "ready" && (
            <MapLabels
              map={mapRef.current}
              fixture={load.fixture}
              phase={effectivePhase}
            />
          )}
          <PhaseBadge phase={effectivePhase} />
          {load.kind === "ready" && effectiveState && (
            <TimelineScrubber
              fixture={load.fixture}
              clockIso={effectiveState.clockIso}
              isPlaying={effectiveState.isPlaying}
              onScrub={handleScrubberChange}
              onPlayPause={handlePlayPause}
            />
          )}
        </>
      )}
    </div>
  );
}

export default MapWatchfloor;

function scenarioStateSig(state: ScenarioState): string {
  return `${state.phase}|${state.clockIso}|${state.isPlaying ? 1 : 0}`;
}

// --- Sub-overlays ---------------------------------------------------------

function PhaseBadge({ phase }: { phase: Phase | null }): ReactNode {
  if (phase == null) return null;
  return (
    <div className="map-phase-badge">
      <span className="map-phase-num">PHASE {phase}</span>
      <span className="map-phase-name">{PHASE_LABELS[phase]}</span>
    </div>
  );
}

function FallbackOverlay({ error }: { error: Error }): ReactNode {
  return (
    <div className="map-fallback" role="img" aria-label="Map unavailable — showing static demo geometry">
      <object
        type="image/svg+xml"
        data="/app/src/map/fallback.svg"
        aria-hidden="true"
        className="map-fallback-svg"
      >
        <div className="map-fallback-text">
          Liminal Custody · Watchfloor (offline geometry)
        </div>
      </object>
      <div className="map-fallback-caption">map renderer offline · {truncateError(error.message)}</div>
    </div>
  );
}

function truncateError(msg: string): string {
  return msg.length <= 80 ? msg : `${msg.slice(0, 77)}…`;
}
