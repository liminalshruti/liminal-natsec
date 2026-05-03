import { useEffect, useState } from "react";

import type { AlertView } from "../lib/types.ts";
import { MapWatchfloor, type ScenarioState } from "./MapWatchfloor.tsx";

interface StageViewportProps {
  selectedAlert: AlertView | null;
  loading: boolean;
}

export function StageViewport({ selectedAlert, loading }: StageViewportProps) {
  const [scenarioState, setScenarioState] = useState<ScenarioState | undefined>(undefined);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && (event.key === "r" || event.key === "R")) {
        event.preventDefault();
        setResetSignal((value) => value + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
            onScenarioStateChange={setScenarioState}
            selectedAlertId={selectedAlert?.id ?? null}
            resetSignal={resetSignal}
            style={{ position: "absolute", inset: 0 }}
          />
        )}
      </div>
    </main>
  );
}
