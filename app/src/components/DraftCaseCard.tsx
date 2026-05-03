// DraftCaseCard — visually distinct AI-proposed case row in the substrate
// panel. Lives below the normal CustodyQueue. Reads from useDraftCase so
// it stays in sync with the working-panel detail surface.
//
// Visual register: dashed border (the "still being formed" treatment),
// AI-PROPOSED badge in the corner, lower opacity until hovered. After
// promotion, the dashed/AI treatment falls away — the card becomes a
// regular queue chip.
//
// The "before space" register from the May-1 transcript: the draft case
// is HOLDING a pattern, not RESOLVING it. Visual treatment makes that
// posture legible.

import { useDraftCase } from "../lib/useDraftCase.ts";

export function DraftCaseCard({
  draftCaseId,
  selectedAlertId,
  onSelect
}: {
  draftCaseId: string;
  selectedAlertId: string | null;
  onSelect: (caseId: string) => void;
}) {
  const { draft, attachedCount } = useDraftCase(draftCaseId);

  const isSelected = selectedAlertId === draft.id;
  const isPromoted = draft.status === "promoted";

  return (
    <div
      className={[
        "draft-case-card",
        isPromoted ? "draft-case-card--promoted" : "draft-case-card--draft",
        isSelected ? "draft-case-card--selected" : ""
      ]
        .filter(Boolean)
        .join(" ")}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(draft.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(draft.id);
        }
      }}
    >
      <div className="draft-case-card__head">
        <span className="draft-case-card__badge">
          {isPromoted ? "PROMOTED" : "AI-PROPOSED"}
        </span>
        {!isPromoted && (
          <span className="draft-case-card__confidence">
            {(draft.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>
      <div className="draft-case-card__title">{draft.title}</div>
      <div className="draft-case-card__tagline">{draft.tagline}</div>
      {!isPromoted && (
        <div className="draft-case-card__progress">
          <span>
            {attachedCount} / {draft.candidateSignals.length} signals attached
          </span>
          <span aria-hidden="true">›</span>
        </div>
      )}
    </div>
  );
}
