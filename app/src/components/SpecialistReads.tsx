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
  return (
    <>
      <div className="subhead">Specialist Reads</div>
      {reads.map((read) => {
        const isRefused = read.status === "REFUSED";
        return (
          <div key={read.id} className="action-row">
            <div className="action-row__title">
              <span>{read.specialist}</span>
              <span className={isRefused ? "tag tag--warn" : "tag tag--ok"}>
                {read.status}
              </span>
            </div>
            <div className="action-row__sub">
              {isRefused ? read.refusalReason ?? "Refused — see rationale." : read.summary ?? ""}
            </div>
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
      })}
    </>
  );
}
