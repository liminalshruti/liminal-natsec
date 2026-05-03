import type { AlertView } from "../lib/types.ts";
import { CustodyCasePanel } from "./CustodyCasePanel.tsx";

interface WorkingPanelProps {
  selectedAlert: AlertView | null;
  loading: boolean;
}

// v3.2 IA — Working Panel splits into two regions vertically:
//   .working__operative  — Zone 1 (verb + posture + hero banner) and
//                          Zone 2 (hypothesis × specialist interleave). Pinned.
//   .working__forensic   — Zone 3 (case file as dragon-fold). Scroll region.
//
// Operative state is now; forensic state is history. The interaction matches
// the reader: P1 reads operative in 5s without scrolling; P2 reads forensic
// at length, with scrolling. See docs/TECHNICAL_PLAN.md §0.2.
export function WorkingPanel({ selectedAlert, loading }: WorkingPanelProps) {
  return (
    <section
      className="panel panel--working"
      aria-label="Working panel"
      style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <div className="panel__header">
        <span>Working Panel</span>
        <span className="tag">case</span>
      </div>
      {loading && <div className="empty" style={{ padding: 12 }}>loading case...</div>}
      {!loading && !selectedAlert && (
        <div className="empty" style={{ padding: 12 }}>select an alert to inspect</div>
      )}
      {!loading && selectedAlert && <CustodyCasePanel selectedAlert={selectedAlert} />}
    </section>
  );
}
