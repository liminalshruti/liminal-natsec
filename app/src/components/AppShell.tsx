import type { AlertView } from "../lib/types.ts";
import type { LoadedScenario } from "../lib/fixtures.ts";
import { CommandLine } from "./CommandLine.tsx";
import { StageViewport } from "./StageViewport.tsx";
import { SubstratePanel } from "./SubstratePanel.tsx";
import { WorkingPanel } from "./WorkingPanel.tsx";

interface AppShellProps {
  scenario: LoadedScenario | null;
  selectedAlertId: string | null;
  selectedAlert: AlertView | null;
  onSelectAlert: (id: string) => void;
}

export function AppShell({
  scenario,
  selectedAlertId,
  selectedAlert,
  onSelectAlert
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <span className="app-topbar__brand">SeaForge / Watchfloor</span>
        <span style={{ color: "var(--fg-2)", fontSize: 12 }}>
          {scenario ? scenario.state.scenarioRunId : "loading scenario..."}
        </span>
        <div className="app-topbar__status">
          <SourceIndicator scenario={scenario} />
          <span>fixtures: maritime/alara-01</span>
        </div>
      </header>
      <SubstratePanel
        alerts={scenario?.state.alerts ?? []}
        selectedAlertId={selectedAlertId}
        onSelectAlert={onSelectAlert}
        loading={!scenario}
      />
      <StageViewport selectedAlert={selectedAlert} loading={!scenario} />
      <WorkingPanel selectedAlert={selectedAlert} loading={!scenario} />
      <CommandLine scenario={scenario} />
    </div>
  );
}

function SourceIndicator({ scenario }: { scenario: LoadedScenario | null }) {
  if (!scenario) {
    return (
      <span>
        <span className="app-topbar__dot" /> connecting
      </span>
    );
  }
  if (scenario.source === "server") {
    return (
      <span>
        <span className="app-topbar__dot app-topbar__dot--ok" /> live server
      </span>
    );
  }
  return (
    <span title={scenario.warning ?? "fixture fallback"}>
      <span className="app-topbar__dot app-topbar__dot--fallback" /> fixture fallback
    </span>
  );
}
