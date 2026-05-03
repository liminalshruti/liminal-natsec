import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "./components/AppShell.tsx";
import type { ScenarioState as MapScenarioState } from "./components/MapWatchfloor.tsx";
import { caseIdFromAlertId } from "./lib/spineGraph.ts";
import { loadScenario, refreshRealScenario, type LoadedScenario } from "./lib/fixtures.ts";
import { clearSavedRules } from "./lib/reviewRulesStore.ts";

export function App() {
  const [scenario, setScenario] = useState<LoadedScenario | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [mapScenarioState, setMapScenarioState] = useState<MapScenarioState | undefined>(
    undefined
  );
  const [resetSignal, setResetSignal] = useState(0);
  const [resetToast, setResetToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchScenario = useCallback(() => {
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
    return fetchScenario();
  }, [fetchScenario]);

  const handleReset = useCallback(
    (mode: "soft" | "full" = "full") => {
      setResetSignal((value) => value + 1);
      setMapScenarioState(undefined);
      if (mode === "full") {
        clearSavedRules();
        setResetToast("Refreshing real cache · saved rules cleared");
        refreshRealScenario()
          .catch(() => undefined)
          .finally(fetchScenario);
      } else {
        setResetToast("Map replay reset");
      }
    },
    [fetchScenario]
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && (event.key === "r" || event.key === "R")) {
        event.preventDefault();
        handleReset("full");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleReset]);

  useEffect(() => {
    if (!resetToast) return;
    const handle = window.setTimeout(() => setResetToast(null), 3500);
    return () => window.clearTimeout(handle);
  }, [resetToast]);

  const selectedAlert = useMemo(() => {
    if (!scenario || !selectedAlertId) return null;
    return scenario.state.alerts.find((alert) => alert.id === selectedAlertId) ?? null;
  }, [scenario, selectedAlertId]);

  const selectedCaseId = useMemo(() => {
    if (!selectedAlertId) return null;
    return selectedAlert?.caseId ?? caseIdFromAlertId(selectedAlertId);
  }, [selectedAlert, selectedAlertId]);

  const handleScenarioChange = useCallback((next: MapScenarioState) => {
    setMapScenarioState(next);
  }, []);

  if (error) {
    return (
      <div className="app-shell" style={{ display: "grid", placeItems: "center" }}>
        <div style={{ color: "var(--color-refused)" }}>Failed to initialize watchfloor: {error}</div>
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
      resetToast={resetToast}
    />
  );
}
