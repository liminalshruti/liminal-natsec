// DraftCaseDetail — working-panel view shown when the AI-proposed draft
// case is selected. Shows:
//   - Header: "DRAFT · AI-proposed · click signals to attach"
//   - Rationale: why the AI thought this was a case
//   - Candidate signal list: each row is click-to-attach
//   - Promote-to-case CTA: activates at PROMOTE_THRESHOLD attached signals
//
// After promotion, the surface flips to a "promoted" state showing the
// attached signals as the case's evidence chain.
//
// Click-to-attach is the safe substitute for drag-and-drop (descoped per
// transcript). Fast-follow B-1 is the drag-and-drop UX layered on top.
// All state lives in useDraftCase — promotion call mutates that store.

import { useDraftCase } from "../lib/useDraftCase.ts";
import { PROMOTE_THRESHOLD } from "../lib/draftCase.ts";

const SIGNAL_KIND_LABELS: Record<string, { label: string; tone: string }> = {
  "ais-gap": { label: "AIS · GAP", tone: "contested" },
  sanctions: { label: "OFAC · SANCTIONS", tone: "refused" },
  advisory: { label: "MARAD · ADVISORY", tone: "decision" },
  imagery: { label: "SAR · IMAGERY", tone: "decision" },
  osint: { label: "OSINT", tone: "ink-tertiary" }
};

export function DraftCaseDetail() {
  const { draft, attachedCount, canPromote, toggleAttach, promote } = useDraftCase();

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
      </header>

      <div className="draft-case-detail__signals">
        <div className="draft-case-detail__signals-head">
          <span className="draft-case-detail__signals-label">
            Candidate signals
          </span>
          {!isPromoted && (
            <span className="draft-case-detail__signals-hint">
              tap to attach · {PROMOTE_THRESHOLD}+ to promote
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
                className={`draft-case-signal${signal.attached ? " draft-case-signal--attached" : ""}`}
                data-tone={kindMeta.tone}
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
    </section>
  );
}
