import { forwardRef, useMemo } from "react";

import type { AlertView, ScenarioStateView } from "../lib/types.ts";
import { DRAFT_CASES } from "../lib/draftCase.ts";
import { loadOsintSignals } from "../lib/osintSignals.ts";
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
    // AUDIT B4: compute OSINT signal count for the substrate section header
    const osintSignalCount = useMemo(() => loadOsintSignals().length, []);

    return (
      <aside
        ref={ref}
        className="panel panel--substrate"
        aria-label="Substrate"
        tabIndex={-1}
      >
        <div className="panel__header">
          {/* Watch-floor framing: workshop principle — substrate is the
              operator's posture, not a list of signals. The header reads as
              an operator-grade label ("on the floor / watching"), not as an
              inventory chip. The count below clarifies what's currently being
              watched. */}
          <h2>
            On the watchfloor
          </h2>
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

          {/* AUDIT B4: three epistemic registers separated by hard rules + distinct visual tiers */}
          <div className="substrate-pane__register substrate-pane__register--watchfloor">
            <div className="substrate-pane__section-header">
              WATCHFLOOR · {alerts.length} OPEN
            </div>
            <CustodyQueue
              alerts={alerts}
              scenarioState={scenarioState}
              selectedAlertId={selectedAlertId}
              onSelectAlert={onSelectAlert}
              loading={loading}
            />
          </div>

          {/* AI-proposed single-vessel drafts — dashed-border provisional state,
              color-elevated background, decision-left-bar. */}
          <div className="substrate-pane__register substrate-pane__register--ai-proposed">
            <div className="substrate-pane__section-header">
              AI · PROPOSED · {DRAFT_CASES.length}
            </div>
            {DRAFT_CASES.map((draft) => (
              <DraftCaseCard
                key={draft.id}
                draftCaseId={draft.id}
                selectedAlertId={selectedAlertId}
                onSelect={onSelectAlert}
              />
            ))}
          </div>

          {/* Substrate signals feed — dense lines, color-substrate background */}
          <div className="substrate-pane__register substrate-pane__register--substrate">
            <div className="substrate-pane__section-header">
              SUBSTRATE · {osintSignalCount}
            </div>
            <WatchfloorOsintFeed />
          </div>
        </div>
      </aside>
    );
  }
);
