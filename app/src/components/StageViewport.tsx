import type { AlertView } from "../lib/types.ts";
import type { LoadedScenario } from "../lib/fixtures.ts";
import { DataSourcesChips } from "./DataSourcesChips.tsx";
import { DemoPrompt } from "./DemoPrompt.tsx";
import { MapWatchfloor, type ScenarioState } from "./MapWatchfloor.tsx";

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
            <MapWatchfloor
              scenarioState={scenarioState}
              onScenarioStateChange={onScenarioStateChange}
              selectedAlertId={selectedAlert?.id ?? null}
              selectedCaseId={selectedCaseId}
              resetSignal={resetSignal}
              fixtureUrl={scenario?.state.mode === "real" ? scenario.state.tracksUrl : undefined}
              style={{ position: "absolute", inset: 0 }}
            />
            <DataSourcesChips />
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
