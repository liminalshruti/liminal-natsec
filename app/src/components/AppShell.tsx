import type { AlertView } from "../lib/types.ts";
import type { LoadedScenario } from "../lib/fixtures.ts";
import { eventIdFromCaseId } from "../lib/spineGraph.ts";
import { PHASE_LABELS } from "../map/tokens.ts";
import { CommandLine } from "./CommandLine.tsx";
import type { ScenarioState as MapScenarioState } from "./MapWatchfloor.tsx";
import { StageViewport } from "./StageViewport.tsx";
import { SubstratePanel } from "./SubstratePanel.tsx";
import { WorkingPanel } from "./WorkingPanel.tsx";

interface AppShellProps {
  scenario: LoadedScenario | null;
  selectedAlertId: string | null;
  selectedAlert: AlertView | null;
  selectedCaseId: string | null;
  onSelectAlert: (id: string) => void;
  mapScenarioState: MapScenarioState | undefined;
  onMapScenarioChange: (next: MapScenarioState) => void;
  resetSignal: number;
  onReset: (mode?: "soft" | "full") => void;
  resetToast: string | null;
}

export function AppShell({
  scenario,
  selectedAlertId,
  selectedAlert,
  selectedCaseId,
  onSelectAlert,
  mapScenarioState,
  onMapScenarioChange,
  resetSignal,
  onReset,
  resetToast
}: AppShellProps) {
  const eventId = eventIdFromCaseId(selectedCaseId);
  const modeLabel = scenario?.state.mode === "real" ? "real cache" : "demo fixture";
  const timestamp = scenario?.state.lastRefreshAt ?? scenario?.state.seededAt;
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <span className="app-topbar__brand">Liminal Custody · Watchfloor</span>
        <span style={{ color: "var(--color-ink-tertiary)", fontSize: 12 }}>
          {scenario ? scenario.state.scenarioRunId : "loading scenario..."}
        </span>
        <PhaseBadge state={mapScenarioState} />
        {eventId && (
          <span
            className={`tag ${eventId === "event-2" ? "tag--ok" : "tag--accent"}`}
            title="Selected case event"
          >
            {eventId === "event-1" ? "EVENT 1" : "EVENT 2"}
          </span>
        )}
        <div className="app-topbar__status">
          <SourceIndicator scenario={scenario} />
          <span>{modeLabel}</span>
          {timestamp && <span title={timestamp}>{formatShortTime(timestamp)}</span>}
        </div>
      </header>
      <SubstratePanel
        alerts={scenario?.state.alerts ?? []}
        scenarioState={scenario?.state ?? null}
        selectedAlertId={selectedAlertId}
        onSelectAlert={onSelectAlert}
        loading={!scenario}
      />
      <StageViewport
        selectedAlert={selectedAlert}
        selectedCaseId={selectedCaseId}
        loading={!scenario}
        scenario={scenario}
        scenarioState={mapScenarioState}
        onScenarioStateChange={onMapScenarioChange}
        resetSignal={resetSignal}
      />
      <WorkingPanel
        selectedAlert={selectedAlert}
        scenarioState={scenario?.state ?? null}
        loading={!scenario}
      />
      <CommandLine
        scenario={scenario}
        mapScenarioState={mapScenarioState}
        onReset={onReset}
        onSelectAlert={onSelectAlert}
        alerts={scenario?.state.alerts ?? []}
      />
      {resetToast && (
        <div className="reset-toast" role="status" aria-live="polite">
          {resetToast}
        </div>
      )}
    </div>
  );
}

function PhaseBadge({ state }: { state: MapScenarioState | undefined }) {
  if (!state) return null;
  const label = PHASE_LABELS[state.phase] ?? "—";
  return (
    <span
      className="tag tag--accent"
      title={`Phase ${state.phase} · ${label}`}
      style={{ marginLeft: 4 }}
    >
      P{state.phase} · {label}
    </span>
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
        <span className="app-topbar__dot app-topbar__dot--ok" />{" "}
        {scenario.state.mode === "real" ? "server real" : "live server"}
      </span>
    );
  }
  if (scenario.state.mode === "real") {
    return (
      <span title={scenario.warning ?? "static real cache"}>
        <span className="app-topbar__dot app-topbar__dot--fallback" /> static real cache
      </span>
    );
  }
  return (
    <span title={scenario.warning ?? "fixture fallback"}>
      <span className="app-topbar__dot app-topbar__dot--fallback" /> fixture fallback
    </span>
  );
}

function formatShortTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().slice(0, 16).replace("T", " ") + "Z";
}
