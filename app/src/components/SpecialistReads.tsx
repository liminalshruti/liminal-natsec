import type { SpecialistReadRecord } from "../lib/specialistReads.ts";

interface SpecialistReadsProps {
  reads: SpecialistReadRecord[];
}

// Canonical order matches the SpecialistName enum in shared/domain/types.ts.
// Order is load-bearing: Signal Integrity sits between Identity and Intent so
// the causal connector (signal_integrity REFUSED → intent REFUSED) reads as
// adjacent rows in the strip. v3.3 will promote this to schema-level
// subordination per docs/TECHNICAL_PLAN.md §0.2 "B-now, C-roadmap".
const CANONICAL_ORDER = [
  "kinematics",
  "identity",
  "signal_integrity",
  "intent",
  "collection",
  "visual"
] as const;

function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}

function rank(name: string): number {
  const idx = (CANONICAL_ORDER as readonly string[]).indexOf(normalize(name));
  return idx === -1 ? CANONICAL_ORDER.length : idx;
}

// v3.2 IA — Specialist Reads renders as a compact strip in Zone 2, not as a
// card stack. Six rows in canonical order. Refused rows get visual emphasis
// inline (color + status chip); the signal_integrity → intent pair shows a
// vertical connector when both are present and the integrity row is refused.
export function SpecialistReads({ reads }: SpecialistReadsProps) {
  if (reads.length === 0) {
    return <div className="empty" style={{ fontSize: 11 }}>—</div>;
  }
  const ordered = [...reads].sort((a, b) => rank(a.specialist) - rank(b.specialist));

  // Connector check: render the dashed-left-border on intent only if the row
  // immediately above it is signal_integrity AND signal_integrity is refused.
  const integrityIdx = ordered.findIndex((r) => normalize(r.specialist) === "signal_integrity");
  const intentIdx = ordered.findIndex((r) => normalize(r.specialist) === "intent");
  const showConnector =
    integrityIdx !== -1 &&
    intentIdx !== -1 &&
    intentIdx === integrityIdx + 1 &&
    ordered[integrityIdx].status === "REFUSED";

  return (
    <div className="specialist-strip">
      {ordered.map((read, i) => {
        const isRefused = read.status === "REFUSED";
        const isIntegrity = normalize(read.specialist) === "signal_integrity";
        const isIntent = normalize(read.specialist) === "intent";
        const intentFollowingIntegrity = showConnector && isIntent;
        return (
          <div
            key={read.id}
            className={[
              "specialist-row",
              isRefused ? "specialist-row--refused" : "specialist-row--ok",
              isIntegrity ? "specialist-row--integrity" : "",
              intentFollowingIntegrity ? "specialist-row--intent-following-integrity" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            title={read.summary ?? ""}
            role="listitem"
          >
            <span className="specialist-row__name">{read.specialist}</span>
            <span className="specialist-row__summary">{read.summary ?? "—"}</span>
            <span className="specialist-row__status">{read.status}</span>
          </div>
        );
      })}
    </div>
  );
}
