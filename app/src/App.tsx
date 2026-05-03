import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "./components/AppShell.tsx";
import type { ScenarioState as MapScenarioState } from "./components/MapWatchfloor.tsx";
import { caseIdFromAlertId } from "./lib/spineGraph.ts";
import { loadScenario, refreshRealScenario, type LoadedScenario } from "./lib/fixtures.ts";
import { timelineAnchorForCase } from "./map/caseSignalScope.ts";
import { clearSavedRules, loadSavedRules } from "./lib/reviewRulesStore.ts";
import { loadUiMode, onUiModeChanged, saveUiMode, type UiMode } from "./lib/uiModeStore.ts";

const DEMO_START_STATE: MapScenarioState = {
  phase: 1,
  clockIso: "2026-04-18T09:55:00.000Z",
  isPlaying: false
};

export function App() {
  const [scenario, setScenario] = useState<LoadedScenario | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [mapScenarioState, setMapScenarioState] = useState<MapScenarioState>(DEMO_START_STATE);
  const [resetSignal, setResetSignal] = useState(0);
  const [resetToast, setResetToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // uiMode toggles between "demo" (full pitch register — handwritten phase
  // prompts, ink coastline, four-layer empty stencil, named-operator card,
  // stipple backdrop) and "live" (austere operator register that hides the
  // editorial scaffolding). Default "demo" preserves the timed pitch path on
  // first load. The preference survives reload via localStorage and is
  // independent of /reset (uiMode is operator preference, not scenario state).
  const [uiMode, setUiMode] = useState<UiMode>(() => loadUiMode());

  const fetchScenario = useCallback(() => {
    let cancelled = false;
    loadScenario()
      .then((result) => {
        if (cancelled) return;
        setScenario(result);

        // AUDIT A3: If a rule is saved, prefer the alert linked to EV2 (event-2).
        // Otherwise default to the first alert (EV1).
        const savedRules = loadSavedRules();
        const hasRuleSaved = savedRules.length > 0;

        let selectedAlert = result.state.alerts[0] ?? null;
        if (hasRuleSaved) {
          // Find the event-2 alert (contains "event-2" in caseId)
          const ev2Alert = result.state.alerts.find((alert) => {
            const caseId = alert.caseId ?? caseIdFromAlertId(alert.id);
            return caseId?.includes("event-2");
          });
          if (ev2Alert) {
            selectedAlert = ev2Alert;
          }
        }

        setSelectedAlertId(selectedAlert?.id ?? null);
        const anchor = timelineAnchorForCase(
          selectedAlert?.caseId ?? (selectedAlert ? caseIdFromAlertId(selectedAlert.id) : null)
        );
        if (anchor) {
          setMapScenarioState((current) => ({
            ...current,
            clockIso: anchor.clockIso,
            phase: anchor.phase,
            isPlaying: false,
          }));
        }
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
      setMapScenarioState(DEMO_START_STATE);
      if (mode === "full") {
        const firstAlert = scenario?.state.alerts[0] ?? null;
        setSelectedAlertId(firstAlert?.id ?? null);
        const anchor = timelineAnchorForCase(
          firstAlert?.caseId ?? (firstAlert ? caseIdFromAlertId(firstAlert.id) : null)
        );
        if (anchor) {
          setMapScenarioState({
            ...DEMO_START_STATE,
            clockIso: anchor.clockIso,
            phase: anchor.phase,
            isPlaying: false,
          });
        }
        clearSavedRules();
        setResetToast("Refreshing real cache · saved rules cleared");
        refreshRealScenario()
          .catch(() => undefined)
          .finally(fetchScenario);
      } else {
        setResetToast("Map replay reset");
      }
    },
    [fetchScenario, scenario]
  );

  const handleToggleUiMode = useCallback((next?: UiMode) => {
    setUiMode((current) => {
      const target: UiMode = next ?? (current === "demo" ? "live" : "demo");
      saveUiMode(target);
      return target;
    });
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey && event.shiftKey && (event.key === "r" || event.key === "R")) {
        event.preventDefault();
        handleReset("full");
        return;
      }
      if (event.ctrlKey && event.shiftKey && (event.key === "m" || event.key === "M")) {
        event.preventDefault();
        handleToggleUiMode();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleReset, handleToggleUiMode]);

  // Sync state with cross-tab localStorage changes (other tabs / windows).
  useEffect(() => onUiModeChanged(() => setUiMode(loadUiMode())), []);

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

  const handleSelectAlert = useCallback(
    (id: string | null) => {
      setSelectedAlertId(id);
      if (!id) return;
      const alert = scenario?.state.alerts.find((candidate) => candidate.id === id);
      const caseId = alert?.caseId ?? caseIdFromAlertId(id);
      const anchor = timelineAnchorForCase(caseId);
      if (!anchor) return;
      setMapScenarioState((current) => ({
        ...current,
        clockIso: anchor.clockIso,
        phase: anchor.phase,
        isPlaying: false,
      }));
    },
    [scenario]
  );

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
      onSelectAlert={handleSelectAlert}
      mapScenarioState={mapScenarioState}
      onMapScenarioChange={handleScenarioChange}
      resetSignal={resetSignal}
      onReset={handleReset}
      resetToast={resetToast}
      uiMode={uiMode}
      onToggleUiMode={handleToggleUiMode}
    />
  );
}
