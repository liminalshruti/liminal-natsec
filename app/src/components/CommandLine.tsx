import type { LoadedScenario } from "../lib/fixtures.ts";

interface CommandLineProps {
  scenario: LoadedScenario | null;
}

export function CommandLine({ scenario }: CommandLineProps) {
  const status = scenario
    ? scenario.source === "server"
      ? `seeded ${scenario.state.seededAt}`
      : `fallback ${scenario.warning ?? "offline"}`
    : "connecting...";

  return (
    <footer className="command-line" role="contentinfo">
      <span className="command-line__prompt">&gt;</span>
      <span>command line affordance reserved (Phase 4)</span>
      <span className="command-line__hint">{status}</span>
    </footer>
  );
}
