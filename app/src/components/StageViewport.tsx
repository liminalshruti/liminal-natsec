import type { AlertView } from "../lib/types.ts";
import type { LoadedScenario } from "../lib/fixtures.ts";
import { DataSourcesChips } from "./DataSourcesChips.tsx";
import { DemoPrompt } from "./DemoPrompt.tsx";
import { MapInstrumentBezels } from "./MapInstrumentBezels.tsx";
import { MapLayers } from "./MapLayers.tsx";
import { MapOverlays } from "./MapOverlays.tsx";
import { MapTelemetryHud } from "./MapTelemetryHud.tsx";
import { MapWatchfloor, type ScenarioState } from "./MapWatchfloor.tsx";
import { StageBackdrop } from "./StageBackdrop.tsx";

interface StageViewportProps {
  selectedAlert: AlertView | null;
  selectedCaseId: string | null;
  loading: boolean;
  scenario: LoadedScenario | null;
  scenarioState: ScenarioState | undefined;
  onScenarioStateChange: (next: ScenarioState) => void;
  resetSignal: number;
}

export function StageViewport({
  selectedAlert,
  selectedCaseId,
  loading,
  scenario,
  scenarioState,
  onScenarioStateChange,
  resetSignal
}: StageViewportProps) {
  return (
    <main className="panel panel--stage" aria-label="Stage">
      <div className="panel__header">
        <span>Stage</span>
        <span className="tag">map · replay</span>
      </div>
      <div className="panel__body" style={{ padding: 0, position: "relative" }}>
        {loading ? (
          <div className="stage-placeholder">
            <div className="stage-placeholder__inner">
              <div className="stage-placeholder__case">loading scenario...</div>
            </div>
          </div>
        ) : scenario?.state.mode === "real" && !selectedAlert ? (
          <div className="stage-placeholder">
            <div className="stage-placeholder__inner">
              <div className="stage-placeholder__case">no real case generated</div>
              <div className="stage-placeholder__note">
                {scenario.state.emptyReason ??
                  "Real cached sources are available, but no custody case met the threshold."}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* StageBackdrop: deep-dark canvas + flowing organic linework +
                stippled constellation, reference: Sequoia AI Ascent stage.
                Sits BEHIND the map at z-index 0; the map composites on top
                via its own opaque tile layer (basemap == operator black).
                On the public-fixture path where the basemap is partially
                transparent, the backdrop bleeds through — that's the
                editorial register the workshop substrate called for. */}
            <StageBackdrop />
            <MapWatchfloor
              scenarioState={scenarioState}
              onScenarioStateChange={onScenarioStateChange}
              selectedAlertId={selectedAlert?.id ?? null}
              selectedCaseId={selectedCaseId}
              resetSignal={resetSignal}
              fixtureUrl={scenario?.state.mode === "real" ? scenario.state.tracksUrl : undefined}
              style={{ position: "absolute", inset: 0 }}
            />
            {/* MapOverlays: cache-driven translucent intel layers (GFW gaps,
                OpenSanctions, NAVAREA, Sentinel SAR). Listens to MapLayers
                via the `liminal:map-layers-changed` window event. Each layer
                projects real cache geometry to the AOI bbox. The overhead-
                projector "stack of transparent sheets" idea, made functional. */}
            <MapOverlays />
            {/* MapInstrumentBezels: ASCII corner brackets + edge tick marks
                + center crosshair + AOI coordinate readouts. Makes the stage
                read as a radar viewport, not a generic map. Per the May-1
                transcript: "ASCII rendered map / radar-style chart... has
                this nostalgic codebreaker thing." */}
            <MapInstrumentBezels />
            <DataSourcesChips />
            {/* MapLayers: layer-toggle control strip — multi-modal overhead-
                projector-transparency idea from the workshop substrate.
                AIS / GFW / Sentinel / OpenSanctions / NAVAREA chips, each
                with status pip + count + summary panel on click. */}
            <MapLayers />
            {/* MapTelemetryHud: top-right observability overlay. Live phase,
                track count, specialist guard status, source freshness. The
                Datadog/Grafana register applied to a defense surface — makes
                the stage read as operational instrument, not abstract viz. */}
            <MapTelemetryHud scenario={scenario} scenarioState={scenarioState} />
            {/* DemoPrompt overlays editorial annotations on each phase change.
                Hand-lettered (Liminal Hand → Caveat fallback). ESC dismisses.
                Auto-fades after 8s so the operator can dwell on the moment
                without prompt residue, but the prompt stays at low opacity for
                glance-recovery. */}
            <DemoPrompt phase={scenarioState?.phase ?? null} />
          </>
        )}
      </div>
    </main>
  );
}
