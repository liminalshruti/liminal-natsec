import type { AlertView } from "../lib/types.ts";
import { CustodyQueue } from "./CustodyQueue.tsx";

interface SubstratePanelProps {
  alerts: AlertView[];
  selectedAlertId: string | null;
  onSelectAlert: (id: string) => void;
  loading: boolean;
}

export function SubstratePanel({
  alerts,
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
          selectedAlertId={selectedAlertId}
          onSelectAlert={onSelectAlert}
          loading={loading}
        />
      </div>
    </aside>
  );
}
