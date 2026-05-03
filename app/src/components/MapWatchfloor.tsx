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

  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [mapReady, setMapReady] = useState(false);
  const [internalState, setInternalState] = useState<ScenarioState | null>(null);

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
            isPlaying: true
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
    props.onScenarioStateChange?.(internalState);
  }, [internalState, isControlled, props]);

  // --- Construct the MapLibre instance ------------------------------------
  useEffect(() => {
    if (load.kind !== "ready") return;
    if (!containerRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: buildMapStyle({ rasterTilesUrl: props.rasterTilesUrl }),
        center: INITIAL_VIEW.center,
        zoom: INITIAL_VIEW.zoom,
        bearing: INITIAL_VIEW.bearing,
        pitch: INITIAL_VIEW.pitch,
        attributionControl: { compact: true }
      });
    } catch (err) {
      setLoad({ kind: "error", error: err as Error });
      return;
    }

    mapRef.current = map;
    detachFallbackRef.current = attachTileFailureRecovery(map);
    setMapReady(false);

    map.on("load", () => {
      map.addSource(SOURCES.staticGeoJson, {
        type: "geojson",
        data: load.fixture
      });
      map.addSource(SOURCES.heroPingsVisible, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
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

    return () => {
      detachFallbackRef.current?.();
      detachFallbackRef.current = null;
      try {
        map.remove();
      } catch {
        // ignore — already torn down
      }
      mapRef.current = null;
      setMapReady(false);
      lastFlownAlertIdRef.current = undefined;
      lastFlownCaseIdRef.current = undefined;
      lastFlownPhaseRef.current = null;
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
    source.setData(visible);
  }, [effectiveState, effectivePhase, load, mapReady]);

  // --- Phase-driven camera ------------------------------------------------
  useEffect(() => {
    if (load.kind !== "ready" || effectivePhase == null) return;
    if (lastFlownPhaseRef.current === effectivePhase) return;
    lastFlownPhaseRef.current = effectivePhase;
    executeCamera(mapRef.current, flyForPhaseOptions(load.fixture, effectivePhase));
  }, [effectivePhase, load]);

  // --- Selection-driven camera --------------------------------------------
  useEffect(() => {
    if (load.kind !== "ready") return;
    const id = props.selectedAlertId;
    if (id === lastFlownAlertIdRef.current) return;
    lastFlownAlertIdRef.current = id;
    executeCamera(mapRef.current, flyForAlertOptions(load.fixture, id));
  }, [props.selectedAlertId, load]);

  useEffect(() => {
    if (load.kind !== "ready") return;
    const id = props.selectedCaseId;
    if (id === lastFlownCaseIdRef.current) return;
    lastFlownCaseIdRef.current = id;
    executeCamera(mapRef.current, flyForCaseBoundsOptions(load.fixture, id ?? ""));
  }, [props.selectedCaseId, load]);

  // --- Scrubber clock changes back into uncontrolled state ---------------
  const handleScrubberChange = useCallback(
    (clockIso: string) => {
      if (isControlled) {
        props.onScenarioStateChange?.({
          ...(props.scenarioState ?? { phase: 1, clockIso, isPlaying: true }),
          clockIso
        });
        return;
      }
      setInternalState((prev) =>
        prev ? { ...prev, clockIso } : { phase: 1, clockIso, isPlaying: true }
      );
    },
    [isControlled, props]
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
              clockIso={isControlled ? effectiveState.clockIso : undefined}
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
          SeaForge · Watchfloor (offline geometry)
        </div>
      </object>
      <div className="map-fallback-caption">map renderer offline · {truncateError(error.message)}</div>
    </div>
  );
}

function truncateError(msg: string): string {
  return msg.length <= 80 ? msg : `${msg.slice(0, 77)}…`;
}
