import { useEffect, useMemo, useState } from "react";

import { AppShell } from "./components/AppShell.tsx";
import { loadScenario, type LoadedScenario } from "./lib/fixtures.ts";

export function App() {
  const [scenario, setScenario] = useState<LoadedScenario | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
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

  const selectedAlert = useMemo(() => {
    if (!scenario || !selectedAlertId) return null;
    return scenario.state.alerts.find((alert) => alert.id === selectedAlertId) ?? null;
  }, [scenario, selectedAlertId]);

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
      onSelectAlert={setSelectedAlertId}
    />
  );
}
