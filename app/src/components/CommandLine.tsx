import type { LoadedScenario } from "../lib/fixtures.ts";
import type { ScenarioState } from "./MapWatchfloor.tsx";

interface CommandLineProps {
  scenario: LoadedScenario | null;
  mapScenarioState: ScenarioState | undefined;
  onReset: () => void;
}

export function CommandLine({ scenario, mapScenarioState, onReset }: CommandLineProps) {
  const sourceStatus = scenario
    ? scenario.source === "server"
      ? `seeded ${scenario.state.seededAt}`
      : `fallback ${scenario.warning ?? "offline"}`
    : "connecting...";

  return (
    <footer className="command-line" role="contentinfo">
      <span className="command-line__prompt">&gt;</span>
      <span>command line affordance reserved (Phase 4)</span>
      <span className="command-line__hint" style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
        {mapScenarioState && (
          <>
            <span title="Map replay clock">
              clock {formatClock(mapScenarioState.clockIso)}
            </span>
            <span title="Replay state">
              {mapScenarioState.isPlaying ? "▶ playing" : "⏸ paused"}
            </span>
          </>
        )}
        <span style={{ color: "var(--fg-2)" }}>{sourceStatus}</span>
        <button
          type="button"
          onClick={onReset}
          title="Reset replay (Ctrl+Shift+R)"
          style={{ fontSize: 11 }}
        >
          reset
        </button>
      </span>
    </footer>
  );
}

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().replace("T", " ").slice(0, 19) + "Z";
}
