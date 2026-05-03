// ExecSummary — the case file's first impression.
//
// Sticky-header dragon-fold means whatever's at the top of the case file is
// what every forensic-mode reader sees first. P2 (procurement) opens the
// case file; P3-in-Q&A opens it; P1-in-argument-mode opens it. The first
// section they read is this one.
//
// Written in typed-object grammar so the surface teaches its own taxonomy
// without a graph viz. Every named entity gets a TypedObjectChip; every
// derived recommendation names the structural-guard layer that authorized
// (or refused) it.

import { nodeById, type ReviewRuleApplication, type SpineNode } from "../lib/spineGraph.ts";
import type { SpecialistReadRecord } from "../lib/specialistReads.ts";
import { publicText } from "../lib/presentationText.ts";

import { TypedObjectChip } from "./TypedObjectChip.tsx";

interface ExecSummaryProps {
  caseId: string | null;
  claimId: string | null;
  claimStatus?: string;
  claimPosterior: number | null;
  hypothesisCount: number;
  reads: SpecialistReadRecord[];
  actions: SpineNode[];
  ruleApplication: ReviewRuleApplication | null;
}

function findRead(reads: SpecialistReadRecord[], specialist: string): SpecialistReadRecord | undefined {
  return reads.find((r) => r.specialist.toLowerCase().replace(/\s+/g, "_") === specialist);
}

export function ExecSummary({
  caseId,
  claimId,
  claimStatus,
  claimPosterior,
  hypothesisCount,
  reads,
  actions,
  ruleApplication
}: ExecSummaryProps) {
  if (!caseId) {
    return <span className="case-file__placeholder">No case selected.</span>;
  }

  const integrity = findRead(reads, "signal_integrity");
  const intent = findRead(reads, "intent");
  const collection = findRead(reads, "collection");
  const caseNode = nodeById(caseId);
  const claimNode = nodeById(claimId);
  const caseData = (caseNode?.data ?? {}) as Record<string, unknown>;
  const leadSummary =
    typeof caseData.lead_summary === "string" ? caseData.lead_summary : null;
  const recommendedAction = ruleApplication?.recommendedActionId
    ? actions.find((a) => a.id === ruleApplication.recommendedActionId) ?? null
    : actions[0] ?? null;

  return (
    <div className="exec-summary">
      <p>
        A custody case is open for{" "}
        <TypedObjectChip kind="case" id={caseId} label={caseNode?.title} size="sm" />
        {claimId && (
          <>
            {" "}centered on{" "}
            <TypedObjectChip
              kind="claim"
              id={claimId}
              label={claimNode?.title}
              status={claimStatus}
              posterior={claimPosterior}
              size="sm"
            />
          </>
        )}
        . {hypothesisCount > 0 && (
          <>
            {hypothesisCount} hypothes{hypothesisCount === 1 ? "is is" : "es are"} preserved;
            the primary holds the highest posterior contribution.
          </>
        )}
      </p>

      {leadSummary && <p>{publicText(leadSummary)}</p>}

      {integrity && (
        <p>
          <TypedObjectChip
            kind="evidence"
            label="Signal Integrity"
            status={integrity.status}
            size="sm"
          />{" "}
          {integrity.status === "REFUSED"
            ? "is contested. Three independent specialist reads (Identity, Visual, Kinematics) converge on source-chain compromise — defense in depth, not single-row reliance."
            : "is consistent across the source chain."}
        </p>
      )}

      {intent && (
        <p>
          <TypedObjectChip
            kind="evidence"
            label="Intent"
            status={intent.status}
            size="sm"
          />{" "}
          {intent.status === "REFUSED"
            ? "is structurally enforced by the guard (Layer 2: INTENT_INDICATOR missing). Refusal is a server-side invariant, not a UX choice."
            : "verdict produced under guarded specialist call; citations validated."}
        </p>
      )}

      {collection && collection.summary && (
        <p>
          <TypedObjectChip
            kind="action"
            label="Collection"
            status={collection.status}
            size="sm"
          />{" "}
          {publicText(collection.summary)}
        </p>
      )}

      {recommendedAction && (
        <p>
          <strong style={{ color: "var(--color-ink-primary)" }}>Bounded recommendation:</strong>{" "}
          <TypedObjectChip
            kind="action"
            id={recommendedAction.id}
            status={ruleApplication ? "applied" : "open"}
            size="sm"
          />
          {ruleApplication && (
            <>
              {" "}— prior rule{" "}
              <TypedObjectChip
                kind="rule"
                id={ruleApplication.ruleId}
                status="applied"
                size="sm"
              />{" "}
              changed this case's recommendation.
            </>
          )}
          {!ruleApplication && " — no prior rules apply to this case class yet."}
        </p>
      )}
    </div>
  );
}
