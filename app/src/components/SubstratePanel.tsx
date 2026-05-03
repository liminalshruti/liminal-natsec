import type { AlertView, ScenarioStateView } from "../lib/types.ts";
import { CustodyQueue } from "./CustodyQueue.tsx";
import { DraftCaseCard } from "./DraftCaseCard.tsx";
import { NamedOperatorCard } from "./NamedOperatorCard.tsx";
import { WatchfloorOsintFeed } from "./WatchfloorOsintFeed.tsx";

interface SubstratePanelProps {
  alerts: AlertView[];
  scenarioState: ScenarioStateView | null;
  selectedAlertId: string | null;
  onSelectAlert: (id: string) => void;
  loading: boolean;
}

export function SubstratePanel({
  alerts,
  scenarioState,
  selectedAlertId,
  onSelectAlert,
  loading
}: SubstratePanelProps) {
  return (
    <aside className="panel panel--substrate" aria-label="Substrate">
      <div className="panel__header">
        {/* Watch-floor framing: workshop principle — substrate is the
            operator's posture, not a list of signals. The header reads as
            an operator-grade label ("on the floor / watching"), not as an
            inventory chip. The count below clarifies what's currently being
            watched. */}
        <span>On the watchfloor</span>
        <span className="tag">
          {alerts.length === 0
            ? "watching"
            : alerts.length === 1
            ? "1 case open"
            : `${alerts.length} cases open`}
        </span>
      </div>
      <div className="panel__body">
        <NamedOperatorCard />
        <CustodyQueue
          alerts={alerts}
          scenarioState={scenarioState}
          selectedAlertId={selectedAlertId}
          onSelectAlert={onSelectAlert}
          loading={loading}
        />
        {/* DraftCaseCard — AI-proposed third case below the regular custody
            queue. Visually distinct (dashed border + AI-PROPOSED badge)
            until promoted. Click → working panel renders DraftCaseDetail.
            Lives below the queue so it doesn't compete with the load-
            bearing Caldera narrative beats. */}
        <DraftCaseCard
          selectedAlertId={selectedAlertId}
          onSelect={onSelectAlert}
        />
        <WatchfloorOsintFeed />
      </div>
    </aside>
  );
}
