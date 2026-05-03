import type { AlertView } from "../lib/types.ts";
import { MapWatchfloor, type ScenarioState } from "./MapWatchfloor.tsx";

interface StageViewportProps {
  selectedAlert: AlertView | null;
  selectedCaseId: string | null;
  loading: boolean;
  scenarioState: ScenarioState | undefined;
  onScenarioStateChange: (next: ScenarioState) => void;
  resetSignal: number;
}

export function StageViewport({
  selectedAlert,
  selectedCaseId,
  loading,
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
              <div className="stage-placeholder__case">preparing watchfloor...</div>
            </div>
          </div>
        ) : (
          <MapWatchfloor
            scenarioState={scenarioState}
            onScenarioStateChange={onScenarioStateChange}
            selectedAlertId={selectedAlert?.id ?? null}
            selectedCaseId={selectedCaseId}
            resetSignal={resetSignal}
            style={{ position: "absolute", inset: 0 }}
          />
        )}
      </div>
    </main>
  );
}
