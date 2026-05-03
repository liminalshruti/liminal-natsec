import type { SpecialistReadRecord } from "../lib/specialistReads.ts";

interface SpecialistReadsProps {
  reads: SpecialistReadRecord[];
}

// Canonical order matches the SpecialistName enum in shared/domain/types.ts.
// Order is load-bearing for two adjacent visual flows:
//
//   signal_integrity REFUSED  ──▶  intent REFUSED
//                                       │
//                                       ▼ next:
//                                  collection (recommended)
//
// The first arrow (signal_integrity → intent) shows the *causal subordination*
// — Intent refuses BECAUSE Signal Integrity is contested. The second arrow
// (intent → collection) shows the *redirect* — refusal is not a dead end; it
// routes to the next-action specialist. This is the workshop's Crazy 8s
// Round 2 hero ("specialist card grays out and routes arrow to Collection
// Planner"). v3.3 will promote both to schema-level subordination per
// docs/TECHNICAL_PLAN.md §0.2 "B-now, C-roadmap".
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
// The intent → collection pair shows a redirect annotation when intent is
// refused — refusal is intelligence that moves the operator forward.
export function SpecialistReads({ reads }: SpecialistReadsProps) {
  if (reads.length === 0) {
    return <div className="empty" style={{ fontSize: 11 }}>—</div>;
  }
  const ordered = [...reads].sort((a, b) => rank(a.specialist) - rank(b.specialist));

  // Causal connector check: render the dashed-left-border on intent only if
  // the row immediately above it is signal_integrity AND signal_integrity is
  // refused. This is the "intent refused BECAUSE integrity contested" arrow.
  const integrityIdx = ordered.findIndex((r) => normalize(r.specialist) === "signal_integrity");
  const intentIdx = ordered.findIndex((r) => normalize(r.specialist) === "intent");
  const showCausalConnector =
    integrityIdx !== -1 &&
    intentIdx !== -1 &&
    intentIdx === integrityIdx + 1 &&
    ordered[integrityIdx].status === "REFUSED";

  // Redirect connector check: render the "→ next" arrow from intent to
  // collection only when intent is refused AND collection is the immediately
  // following recommended row. This is the workshop hero #2 — refusal as
  // intelligence-that-moves-people-forward, not dead end.
  const collectionIdx = ordered.findIndex((r) => normalize(r.specialist) === "collection");
  const intentRefused = intentIdx !== -1 && ordered[intentIdx].status === "REFUSED";
  const showRedirectConnector =
    intentRefused &&
    collectionIdx !== -1 &&
    collectionIdx === intentIdx + 1 &&
    ordered[collectionIdx].status !== "REFUSED";

  // Plain-language redirect caption derived from the collection summary so the
  // operator sees what the system is recommending instead of intent inference.
  const redirectCaption = showRedirectConnector
    ? ordered[collectionIdx].summary ?? "see Collection for next-step recommendation"
    : null;

  return (
    <div className="specialist-strip">
      {ordered.map((read) => {
        const isRefused = read.status === "REFUSED";
        const isIntegrity = normalize(read.specialist) === "signal_integrity";
        const isIntent = normalize(read.specialist) === "intent";
        const isCollection = normalize(read.specialist) === "collection";
        const intentFollowingIntegrity = showCausalConnector && isIntent;
        const intentRefusedHere = showRedirectConnector && isIntent;
        const collectionRedirectTarget = showRedirectConnector && isCollection;
        return (
          <div
            key={read.id}
            className={[
              "specialist-row",
              isRefused ? "specialist-row--refused" : "specialist-row--ok",
              isIntegrity ? "specialist-row--integrity" : "",
              intentFollowingIntegrity ? "specialist-row--intent-following-integrity" : "",
              intentRefusedHere ? "specialist-row--intent-redirecting" : "",
              collectionRedirectTarget ? "specialist-row--collection-redirect-target" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            title={read.summary ?? ""}
            role="listitem"
          >
            <span className="specialist-row__name">{read.specialist}</span>
            <span className="specialist-row__summary">{read.summary ?? "—"}</span>
            <span className="specialist-row__status">{read.status}</span>
            {/* Redirect annotation: appears UNDER the intent row when intent
                is refused AND collection is the recommended next step.
                "next: …" reads as editorial markup, not as a dead-end tag. */}
            {intentRefusedHere && redirectCaption && (
              <div className="specialist-row__redirect" aria-label="redirect">
                <span className="specialist-row__redirect-arrow" aria-hidden>↳</span>
                <span className="specialist-row__redirect-label">next:</span>
                <span className="specialist-row__redirect-target">Collection</span>
                <span className="specialist-row__redirect-caption">{redirectCaption}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
