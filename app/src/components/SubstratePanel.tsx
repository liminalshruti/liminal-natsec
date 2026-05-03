import type { AlertView, ScenarioStateView } from "../lib/types.ts";
import { CustodyQueue } from "./CustodyQueue.tsx";
import { HormuzIntelDrawer } from "./HormuzIntelDrawer.tsx";

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
        <span>Substrate</span>
        <span className="tag">{alerts.length} signals</span>
      </div>
      <div className="panel__body">
        <CustodyQueue
          alerts={alerts}
          scenarioState={scenarioState}
          selectedAlertId={selectedAlertId}
          onSelectAlert={onSelectAlert}
          loading={loading}
        />
        <HormuzIntelDrawer />
      </div>
    </aside>
  );
}
