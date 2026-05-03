// DraftCaseDetail — working-panel view shown when the AI-proposed draft
// case is selected. Shows:
//   - Header: "DRAFT · AI-proposed · drag or click signals to attach"
//   - Rationale: why the AI thought this was a case
//   - Candidate signal list: each row is BOTH click-to-attach AND
//     draggable to the stage drop zone (B-1 fast-follow wave)
//   - Promote-to-case CTA: activates at PROMOTE_THRESHOLD attached signals
//
// After promotion, the surface flips to a "promoted" state showing the
// attached signals as the case's evidence chain.
//
// B-1 drag-and-drop: each signal carries `application/liminal-signal` +
// the signal id in dataTransfer. Stage panel listens via the SignalDropZone
// overlay component (StageViewport) and fires toggleAttach on drop. Click
// stays as the keyboard-accessible primary interaction.

import { useDraftCase } from "../lib/useDraftCase.ts";
import { PROMOTE_THRESHOLD } from "../lib/draftCase.ts";
import { LIMINAL_SIGNAL_DRAG_TYPE } from "../lib/signalDragTypes.ts";

const SIGNAL_KIND_LABELS: Record<string, { label: string; tone: string }> = {
  "ais-gap": { label: "AIS · GAP", tone: "contested" },
  sanctions: { label: "OFAC · SANCTIONS", tone: "refused" },
  advisory: { label: "MARAD · ADVISORY", tone: "decision" },
  imagery: { label: "SAR · IMAGERY", tone: "decision" },
  osint: { label: "OSINT", tone: "ink-tertiary" },
  "ship-vessel": { label: "AIS · MARINETRAFFIC", tone: "decision" }
};

export function DraftCaseDetail() {
  const { draft, attachedCount, canPromote, isRecentlyAttached, toggleAttach, promote } = useDraftCase();

  const isPromoted = draft.status === "promoted";

  return (
    <section
      className="draft-case-detail"
      data-status={draft.status}
      aria-label="Draft case detail"
    >
      <header className="draft-case-detail__header">
        <div className="draft-case-detail__eyebrow">
          {isPromoted
            ? "PROMOTED · OPERATOR-CONFIRMED"
            : "DRAFT · AI-PROPOSED · CLICK SIGNALS TO ATTACH"}
        </div>
        <h2 className="draft-case-detail__title">{draft.title}</h2>
        <p className="draft-case-detail__rationale">{draft.rationale}</p>
        <div className="draft-case-detail__meta">
          <span className="draft-case-detail__meta-item">
            confidence · {(draft.confidence * 100).toFixed(0)}%
          </span>
          <span className="draft-case-detail__meta-item">
            {attachedCount} of {draft.candidateSignals.length} signals attached
          </span>
        </div>
        <div className="draft-case-detail__context" aria-label="Draft case context">
          <span>{draft.context.watchBoxName}</span>
          <span>{draft.context.primaryRealSignal}</span>
          <span>{draft.context.reviewWindowLabel}</span>
        </div>
        <p className="draft-case-detail__scope-note">{draft.context.scopeNote}</p>
      </header>

      <div className="draft-case-detail__signals">
        <div className="draft-case-detail__signals-head">
          <span className="draft-case-detail__signals-label">
            Candidate signals
          </span>
          {!isPromoted && (
            <span className="draft-case-detail__signals-hint">
              drag to stage or tap · {PROMOTE_THRESHOLD}+ to promote
            </span>
          )}
        </div>

        <ul className="draft-case-detail__signal-list" role="list">
          {draft.candidateSignals.map((signal) => {
            const kindMeta = SIGNAL_KIND_LABELS[signal.kind] ?? {
              label: signal.kind.toUpperCase(),
              tone: "ink-tertiary"
            };
            return (
              <li
                key={signal.id}
                className={[
                  "draft-case-signal",
                  signal.attached ? "draft-case-signal--attached" : "",
                  isRecentlyAttached(signal.id) ? "draft-case-signal--just-attached" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-tone={kindMeta.tone}
                draggable={!isPromoted && !signal.attached}
                onDragStart={(e) => {
                  // B-1: drag the signal toward the stage. The stage's
                  // SignalDropZone overlay listens for this MIME type and
                  // calls toggleAttach on drop. Click-to-attach stays as
                  // the keyboard-accessible primary interaction.
                  e.dataTransfer.setData(LIMINAL_SIGNAL_DRAG_TYPE, signal.id);
                  e.dataTransfer.effectAllowed = "link";
                  // Mark the body so CSS can dim the source while it's
                  // being dragged — gives operator feedback that the
                  // signal is in flight.
                  document.body.classList.add("liminal-dragging-signal");
                }}
                onDragEnd={() => {
                  document.body.classList.remove("liminal-dragging-signal");
                }}
              >
                <button
                  type="button"
                  className="draft-case-signal__toggle"
                  onClick={() => !isPromoted && toggleAttach(signal.id)}
                  disabled={isPromoted}
                  aria-pressed={signal.attached}
                  aria-label={
                    signal.attached
                      ? `Detach ${signal.label}`
                      : `Attach ${signal.label}`
                  }
                >
                  <span
                    className="draft-case-signal__check"
                    aria-hidden="true"
                  >
                    {signal.attached ? "✓" : "+"}
                  </span>
                </button>
                <div className="draft-case-signal__body">
                  <div className="draft-case-signal__head">
                    <span
                      className="draft-case-signal__kind"
                      data-tone={kindMeta.tone}
                    >
                      {kindMeta.label}
                    </span>
                    <span className="draft-case-signal__label">
                      {signal.label}
                    </span>
                  </div>
                  <div className="draft-case-signal__summary">
                    {signal.summary}
                  </div>
                  {/* M-1: vessel card — when the signal carries real
                      MarineTraffic vessel telemetry, render a tabular
                      KV strip with port-of-origin, destination, ETA,
                      length, and current course/speed. Anchors the
                      AI's claim with judge-verifiable real data. */}
                  {signal.vessel && (
                    <dl className="draft-case-signal__vessel">
                      {signal.vessel.imo && (
                        <div className="draft-case-signal__vessel-kv">
                          <dt>IMO</dt><dd>{signal.vessel.imo}</dd>
                        </div>
                      )}
                      {signal.vessel.length_m != null && (
                        <div className="draft-case-signal__vessel-kv">
                          <dt>length</dt><dd>{signal.vessel.length_m.toFixed(0)}m</dd>
                        </div>
                      )}
                      {signal.vessel.last_port && (
                        <div className="draft-case-signal__vessel-kv">
                          <dt>last port</dt><dd>{signal.vessel.last_port}</dd>
                        </div>
                      )}
                      {signal.vessel.current_port && (
                        <div className="draft-case-signal__vessel-kv">
                          <dt>current port</dt><dd>{signal.vessel.current_port}</dd>
                        </div>
                      )}
                      {signal.vessel.destination && (
                        <div className="draft-case-signal__vessel-kv">
                          <dt>destination</dt>
                          <dd className="draft-case-signal__vessel-dest">
                            {signal.vessel.destination}
                          </dd>
                        </div>
                      )}
                      {signal.vessel.speed_kn != null && (
                        <div className="draft-case-signal__vessel-kv">
                          <dt>speed</dt><dd>{signal.vessel.speed_kn.toFixed(1)} kn</dd>
                        </div>
                      )}
                      {signal.vessel.course_deg != null && (
                        <div className="draft-case-signal__vessel-kv">
                          <dt>course</dt><dd>{signal.vessel.course_deg.toFixed(0)}°</dd>
                        </div>
                      )}
                      {signal.vessel.lat != null && signal.vessel.lon != null && (
                        <div className="draft-case-signal__vessel-kv">
                          <dt>position</dt>
                          <dd>
                            {signal.vessel.lat.toFixed(3)}°N · {signal.vessel.lon.toFixed(3)}°E
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                  <div className="draft-case-signal__source">
                    📎 {signal.source_provider} ·{" "}
                    <code>{signal.source_pointer}</code>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {!isPromoted && (
        <footer className="draft-case-detail__cta-row">
          <button
            type="button"
            className="draft-case-detail__promote"
            onClick={promote}
            disabled={!canPromote}
            aria-disabled={!canPromote}
          >
            {canPromote
              ? `Promote to case · ${attachedCount} signals attached`
              : `Attach ${PROMOTE_THRESHOLD - attachedCount} more to promote`}
          </button>
        </footer>
      )}

      {isPromoted && (
        <footer className="draft-case-detail__promoted-confirmation" role="status">
          <span aria-hidden="true">✓</span>
          <span>
            Case promoted · {attachedCount} signals attached as evidence ·
            durable in custody chain
          </span>
        </footer>
      )}

      {isPromoted && (
        <section className="draft-case-detail__next-steps" aria-label="Next steps">
          <div className="draft-case-detail__next-eyebrow">NEXT STEPS</div>
          <p className="draft-case-detail__next-lead">
            The custody case is now in the operator queue. The structural
            guard runs the same six-specialist review on these signals as it
            does on the Caldera case. Three operator paths from here:
          </p>
          <ol className="draft-case-detail__next-list">
            <li className="draft-case-detail__next-step">
              <span className="draft-case-detail__next-num">01</span>
              <div>
                <div className="draft-case-detail__next-name">Open custody review</div>
                <div className="draft-case-detail__next-desc">
                  Review specialist reads + the system's posture verb. The
                  structural guard runs the same six-specialist review here
                  as on Caldera; expect contested signal_integrity given
                  how many of these vessels are FOC-flagged.
                </div>
              </div>
            </li>
            <li className="draft-case-detail__next-step">
              <span className="draft-case-detail__next-num">02</span>
              <div>
                <div className="draft-case-detail__next-name">Request collection (default action)</div>
                <div className="draft-case-detail__next-desc">
                  Sentinel-1 SAR re-tasking on each attached vessel's last
                  AIS position; OFAC SDN deep-check on the IMO numbers.
                  Refusal-as-redirect: Intent gets gated until collection
                  returns.
                </div>
              </div>
            </li>
            <li className="draft-case-detail__next-step">
              <span className="draft-case-detail__next-num">03</span>
              <div>
                <div className="draft-case-detail__next-name">Save as durable rule</div>
                <div className="draft-case-detail__next-desc">
                  This pattern (FOC-flag + Iran-corridor + intentional-
                  disabling) becomes a Review Memory rule. Future similar
                  clusters auto-promote without operator review.
                </div>
              </div>
            </li>
          </ol>
          <div className="draft-case-detail__next-affordance">
            <span aria-hidden="true">↳</span>
            Use the command line below ·{" "}
            <code>/event 1</code> to switch to Caldera ·{" "}
            <code>/help</code> for navigation
          </div>
        </section>
      )}
    </section>
  );
}
