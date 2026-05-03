import type { AlertView } from "../lib/types.ts";
import { CustodyCasePanel } from "./CustodyCasePanel.tsx";

interface WorkingPanelProps {
  selectedAlert: AlertView | null;
  loading: boolean;
}

export function WorkingPanel({ selectedAlert, loading }: WorkingPanelProps) {
  return (
    <section className="panel panel--working" aria-label="Working panel">
      <div className="panel__header">
        <span>Working Panel</span>
        <span className="tag">case</span>
      </div>
      <div className="panel__body">
        {loading && <div className="empty">loading case...</div>}
        {!loading && !selectedAlert && (
          <div className="empty">select an alert to inspect</div>
        )}
        {!loading && selectedAlert && <CustodyCasePanel selectedAlert={selectedAlert} />}
      </div>
    </section>
  );
}
