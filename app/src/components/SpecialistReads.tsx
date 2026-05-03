import type { SpecialistReadRecord } from "../lib/specialistReads.ts";

interface SpecialistReadsProps {
  reads: SpecialistReadRecord[];
}

export function SpecialistReads({ reads }: SpecialistReadsProps) {
  if (reads.length === 0) {
    return (
      <>
        <div className="subhead">Specialist Reads</div>
        <div className="empty">no specialist reads for this case</div>
      </>
    );
  }
  // Surface refusals first — they're the epistemic guardrail moment.
  const refusals = reads.filter((read) => read.status === "REFUSED");
  const others = reads.filter((read) => read.status !== "REFUSED");
  return (
    <>
      <div className="subhead">Specialist Reads</div>
      {refusals.map((read) => (
        <RefusalCard key={read.id} read={read} />
      ))}
      {others.map((read) => (
        <ReadCard key={read.id} read={read} />
      ))}
    </>
  );
}

function RefusalCard({ read }: { read: SpecialistReadRecord }) {
  const rationale = read.refusalReason ?? read.summary ?? "Specialist refused to claim.";
  return (
    <div className="refusal-card" role="region" aria-label={`${read.specialist} refusal`}>
      <div className="refusal-card__header">
        <span className="refusal-card__icon" aria-hidden>
          ⊘
        </span>
        <div>
          <div className="refusal-card__specialist">{read.specialist}</div>
          <div className="refusal-card__status">REFUSED</div>
        </div>
        <span className="tag tag--warn refusal-card__tag">EPISTEMIC GUARD</span>
      </div>
      <div className="refusal-card__body">
        <div className="refusal-card__label">Why refused</div>
        <div className="refusal-card__text">{rationale}</div>
        {read.citations && read.citations.length > 0 && (
          <>
            <div className="refusal-card__label" style={{ marginTop: 8 }}>
              Bounded reads
            </div>
            <ul className="refusal-card__cites">
              {read.citations.slice(0, 4).map((cite) => (
                <li key={cite}>{cite}</li>
              ))}
            </ul>
          </>
        )}
        <div className="refusal-card__footnote">
          The system would not produce a hostile-intent claim from this evidence
          set. Honest refusal is preserved in the case record.
        </div>
      </div>
    </div>
  );
}

function ReadCard({ read }: { read: SpecialistReadRecord }) {
  return (
    <div className="action-row">
      <div className="action-row__title">
        <span>{read.specialist}</span>
        <span className="tag tag--ok">{read.status}</span>
      </div>
      {read.summary && <div className="action-row__sub">{read.summary}</div>}
      {read.citations && read.citations.length > 0 && (
        <div
          className="action-row__sub"
          style={{ fontSize: 10, marginTop: 4, color: "var(--fg-2)" }}
        >
          cites: {read.citations.slice(0, 2).join(", ")}
          {read.citations.length > 2 ? "…" : ""}
        </div>
      )}
    </div>
  );
}
