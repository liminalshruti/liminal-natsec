import type { AlertView, ScenarioStateView } from "../lib/types.ts";
import { CustodyCasePanel } from "./CustodyCasePanel.tsx";

interface WorkingPanelProps {
  selectedAlert: AlertView | null;
  scenarioState?: ScenarioStateView | null;
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
      {!loading && !selectedAlert && <EmptyStencil />}
      {!loading && selectedAlert && <CustodyCasePanel selectedAlert={selectedAlert} />}
    </section>
  );
}

/**
 * Empty-state stencil — the highest-leverage teaching moment in the entire
 * interface. When no case is selected, the working panel renders the four-
 * layer framework as inert structural copy positioned where the case-detail
 * content will appear.
 *
 * Workshop principle: every UI surface should feel like it's holding
 * something, not resolving it. The stencil holds the framework — substrate
 * to custody to refusal to review-memory — until an actual case fills it.
 *
 * Reads as: "this panel will hold a custody artifact organized in these
 * four layers." Operator at cold start learns the architecture. Operator
 * mid-shift sees it as a familiar empty stencil. Procurement reader on a
 * screenshot sees the IP without needing the demo to play.
 */
function EmptyStencil() {
  return (
    <div className="empty-stencil" role="region" aria-label="Custody artifact stencil">
      <div className="empty-stencil__lead">CUSTODY ARTIFACT — pending selection</div>
      <p className="empty-stencil__prompt">
        Select an alert in the substrate panel to open a custody case. The
        artifact will populate the four layers:
      </p>
      <ol className="empty-stencil__layers">
        <li className="empty-stencil__layer">
          <span className="empty-stencil__layer-num">I</span>
          <div>
            <div className="empty-stencil__layer-name">SUBSTRATE</div>
            <div className="empty-stencil__layer-desc">
              Raw multi-domain observations. Messy, partial, contradictory.
            </div>
          </div>
        </li>
        <li className="empty-stencil__layer">
          <span className="empty-stencil__layer-num">II</span>
          <div>
            <div className="empty-stencil__layer-name">CUSTODY</div>
            <div className="empty-stencil__layer-desc">
              Preserved hypotheses, evidence chains, source-integrity checks.
            </div>
          </div>
        </li>
        <li className="empty-stencil__layer">
          <span className="empty-stencil__layer-num">III</span>
          <div>
            <div className="empty-stencil__layer-name">REFUSAL</div>
            <div className="empty-stencil__layer-desc">
              Structural invariant. AI cannot overclaim — guard enforces it.
            </div>
          </div>
        </li>
        <li className="empty-stencil__layer">
          <span className="empty-stencil__layer-num">IV</span>
          <div>
            <div className="empty-stencil__layer-name">REVIEW MEMORY</div>
            <div className="empty-stencil__layer-desc">
              Operator corrections become durable rules. Doctrine compounds.
            </div>
          </div>
        </li>
      </ol>
      <div className="empty-stencil__footnote">
        Maven is the foundation. We are the substrate.
      </div>
    </div>
  );
}
