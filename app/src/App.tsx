import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "./components/AppShell.tsx";
import type { ScenarioState as MapScenarioState } from "./components/MapWatchfloor.tsx";
import { caseIdFromAlertId } from "./lib/spineGraph.ts";
import { loadScenario, type LoadedScenario } from "./lib/fixtures.ts";

export function App() {
  const [scenario, setScenario] = useState<LoadedScenario | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [mapScenarioState, setMapScenarioState] = useState<MapScenarioState | undefined>(
    undefined
  );
  const [resetSignal, setResetSignal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadScenario()
      .then((result) => {
        if (cancelled) return;
        setScenario(result);
        setSelectedAlertId(result.state.alerts[0]?.id ?? null);
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && (event.key === "r" || event.key === "R")) {
        event.preventDefault();
        setResetSignal((value) => value + 1);
        setMapScenarioState(undefined);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const selectedAlert = useMemo(() => {
    if (!scenario || !selectedAlertId) return null;
    return scenario.state.alerts.find((alert) => alert.id === selectedAlertId) ?? null;
  }, [scenario, selectedAlertId]);

  const selectedCaseId = useMemo(() => {
    if (!selectedAlertId) return null;
    return caseIdFromAlertId(selectedAlertId);
  }, [selectedAlertId]);

  const handleScenarioChange = useCallback((next: MapScenarioState) => {
    setMapScenarioState(next);
  }, []);

  const handleReset = useCallback(() => {
    setResetSignal((value) => value + 1);
    setMapScenarioState(undefined);
  }, []);

  if (error) {
    return (
      <div className="app-shell" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ color: "var(--danger)" }}>Failed to initialize watchfloor: {error}</div>
      </div>
    );
  }

  return (
    <AppShell
      scenario={scenario}
      selectedAlertId={selectedAlertId}
      selectedAlert={selectedAlert}
      selectedCaseId={selectedCaseId}
      onSelectAlert={setSelectedAlertId}
      mapScenarioState={mapScenarioState}
      onMapScenarioChange={handleScenarioChange}
      resetSignal={resetSignal}
      onReset={handleReset}
    />
  );
}
