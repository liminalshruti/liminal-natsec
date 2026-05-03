import { forwardRef } from "react";
import type { AlertView, ScenarioStateView } from "../lib/types.ts";
import { DRAFT_CASES } from "../lib/draftCase.ts";
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

export const SubstratePanel = forwardRef<HTMLElement, SubstratePanelProps>(
  function SubstratePanel(
    {
      alerts,
      scenarioState,
      selectedAlertId,
      onSelectAlert,
      loading
    }: SubstratePanelProps,
    ref
  ) {
    return (
      <aside ref={ref} className="panel panel--substrate" aria-label="Substrate" tabIndex={-1}>
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
        {/* AI-proposed single-vessel drafts below the regular custody queue.
            Each card is its own case; the shared Hormuz watch-box context
            never becomes an aggregate case claim. */}
        {DRAFT_CASES.map((draft) => (
          <DraftCaseCard
            key={draft.id}
            draftCaseId={draft.id}
            selectedAlertId={selectedAlertId}
            onSelect={onSelectAlert}
          />
        ))}
        <WatchfloorOsintFeed />
      </div>
    </aside>
    );
  }
);
