import type { AlertView } from "../lib/types.ts";
import type { LoadedScenario } from "../lib/fixtures.ts";
import { DataSourcesChips } from "./DataSourcesChips.tsx";
// DemoPrompt removed pending annotation-system rework. The phase-triggered
// handwritten stage overlay was the existing in-app annotation system. User
// feedback: annotations should sit next-to specific UI elements (not block),
// extend beyond the stage to other panels, and survive a no-narration video.
// The current overlay did none of those — ripped pending redesign.
import { MapInstrumentBezels } from "./MapInstrumentBezels.tsx";
import { MapLayers } from "./MapLayers.tsx";
import { MapOverlays } from "./MapOverlays.tsx";
import { MapTelemetryHud } from "./MapTelemetryHud.tsx";
import { MapWatchfloor, type ScenarioState } from "./MapWatchfloor.tsx";
import { RealShipsOverlay } from "./RealShipsOverlay.tsx";
import { SignalDropZone } from "./SignalDropZone.tsx";
import { SignalGhostShips } from "./SignalGhostShips.tsx";
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
            {/* RealShipsOverlay: M-4. Top-50 real MarineTraffic vessels
                from Shayaun's Danti corpus, rendered as directional flow
                arrows whose orientation = AIS course and length = speed.
                Anchored ships (speed=0) render as small circles. Flag-of-
                convenience vessels get an outer ring in contested-amber.
                Hover any ship → vessel-card popover with full property KV.
                Visibility tied to the AIS chip in MapLayers via the same
                window event MapOverlays uses. The "why don't we have this
                in real life yet" moment of the demo. */}
            <RealShipsOverlay />
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
            {/* DemoPrompt deliberately removed — the phase-triggered handwritten
                overlay was the only in-app annotation surface. User feedback:
                annotations should be tied to specific UI elements (next-to,
                not blocking), extend across panels (not just stage), and
                survive a no-narration recording. Pending full annotation
                system redesign — see docs/annotation-rework-brief.md. */}
            {/* SignalDropZone: B-1 fast-follow. Invisible-by-default
                overlay that lights up when a Liminal signal is being
                dragged from the DraftCaseDetail signal list. On drop,
                fires toggleAttach + emits SIGNAL_ATTACHED_EVENT for
                B-2's ghost-ship renderer to pick up. */}
            <SignalDropZone />
            {/* SignalGhostShips: B-2 fast-follow. Renders a ghost-ship
                marker at the drop coordinates for each attached signal.
                Listens to SIGNAL_ATTACHED_EVENT (fired by SignalDropZone).
                Two phases per ghost: materializing (halo expands, ship
                fades in over 600ms), then settled (low-opacity hold with
                subtle pulse). Detaches via toggleAttach OR case promotion
                fade out over 360ms. */}
            <SignalGhostShips />
          </>
        )}
      </div>
    </main>
  );
}
