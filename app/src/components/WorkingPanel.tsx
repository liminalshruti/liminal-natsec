import type { AlertView, ScenarioStateView } from "../lib/types.ts";
import type { UiMode } from "../lib/uiModeStore.ts";
import { CustodyCasePanel } from "./CustodyCasePanel.tsx";

interface WorkingPanelProps {
  selectedAlert: AlertView | null;
  scenarioState?: ScenarioStateView | null;
  loading: boolean;
  uiMode?: UiMode;
}

// v3.2 IA — Working Panel splits into two regions vertically:
//   .working__operative  — Zone 1 (verb + posture + hero banner) and
//                          Zone 2 (hypothesis × specialist interleave). Pinned.
//   .working__forensic   — Zone 3 (case file as dragon-fold). Scroll region.
//
// Operative state is now; forensic state is history. The interaction matches
// the reader: P1 reads operative in 5s without scrolling; P2 reads forensic
// at length, with scrolling. See docs/TECHNICAL_PLAN.md §0.2.
export function WorkingPanel({ selectedAlert, loading, uiMode = "demo" }: WorkingPanelProps) {
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
      {!loading && !selectedAlert && <EmptyStencil uiMode={uiMode} />}
      {!loading && selectedAlert && <CustodyCasePanel selectedAlert={selectedAlert} />}
    </section>
  );
}

/**
 * Empty-state stencil. In demo mode this is a teaching surface — the four-
 * layer framework rendered as inert structural copy where the case-detail
 * content will appear. Workshop principle: every UI surface should feel like
 * it's holding something, not resolving it.
 *
 * In live mode the stencil collapses to a single-line affordance — the
 * operator already knows the architecture; the panel just needs to read as
 * "no case selected" without lecturing.
 */
function EmptyStencil({ uiMode }: { uiMode: UiMode }) {
  if (uiMode === "live") {
    return (
      <div
        className="empty-stencil empty-stencil--live"
        role="region"
        aria-label="No case selected"
      >
        <div className="empty-stencil__live-lead">No case selected</div>
        <div className="empty-stencil__live-hint">
          Select an alert in the substrate panel to open a custody case.
        </div>
      </div>
    );
  }
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
