import { useMemo } from "react";

import type { AlertView } from "../lib/types.ts";
import {
  actionsForCase,
  caseIdFromAlertId,
  hypothesesForCase,
  reviewApplicationForCase
} from "../lib/spineGraph.ts";
import { specialistReadsForCase } from "../lib/specialistReads.ts";

import { ActionOptions } from "./ActionOptions.tsx";
import { EvidenceChain } from "./EvidenceChain.tsx";
import { HypothesisBoard } from "./HypothesisBoard.tsx";
import { ReviewMemory } from "./ReviewMemory.tsx";
import { SpecialistReads } from "./SpecialistReads.tsx";

interface CustodyCasePanelProps {
  selectedAlert: AlertView;
}

export function CustodyCasePanel({ selectedAlert }: CustodyCasePanelProps) {
  const caseId = useMemo(
    () => caseIdFromAlertId(selectedAlert.id) ?? deriveCaseId(selectedAlert.id),
    [selectedAlert.id]
  );
  const hypotheses = useMemo(
    () => (caseId ? hypothesesForCase(caseId) : []),
    [caseId]
  );
  const actions = useMemo(
    () => (caseId ? actionsForCase(caseId) : []),
    [caseId]
  );
  const ruleApplication = useMemo(
    () => (caseId ? reviewApplicationForCase(caseId) : null),
    [caseId]
  );
  const reads = useMemo(
    () => (caseId ? specialistReadsForCase(caseId) : []),
    [caseId]
  );
  const claimId = useMemo(() => firstClaimId(caseId), [caseId]);

  return (
    <>
      <div className="kv">
        <div className="kv__k">case</div>
        <div className="kv__v">{caseId ?? selectedAlert.title}</div>
        <div className="kv__k">alert</div>
        <div className="kv__v" style={{ wordBreak: "break-all" }}>
          {selectedAlert.id}
        </div>
        <div className="kv__k">status</div>
        <div className="kv__v">
          <span className="tag tag--warn">{selectedAlert.status}</span>
        </div>
        <div className="kv__k">score</div>
        <div className="kv__v">{selectedAlert.severity.toFixed(2)}</div>
      </div>

      <HypothesisBoard hypotheses={hypotheses} />
      <ActionOptions actions={actions} ruleApplication={ruleApplication} />
      <EvidenceChain caseId={caseId} claimId={claimId} />
      <SpecialistReads reads={reads} />
      <ReviewMemory ruleApplication={ruleApplication} caseId={caseId} />
    </>
  );
}

function firstClaimId(caseId: string | null): string | null {
  if (!caseId) return null;
  // Convention: claim:<scenario>:<eventSlug>:custody:h1 — scenario+eventSlug
  // matches the trailing slug of the case id (`case:alara-01:event-1`).
  const slug = caseId.replace(/^case:/, "");
  return `claim:${slug}:custody:h1`;
}

function deriveCaseId(alertId: string): string | null {
  // Anomaly ids in this fixture pack don't all carry case_id; fall back to a
  // simple parse so the UI still binds. Pattern: anom:<kind>:<...>:<eventTag>
  const match = alertId.match(/event-([12])/);
  if (!match) return null;
  return `case:alara-01:event-${match[1]}`;
}
