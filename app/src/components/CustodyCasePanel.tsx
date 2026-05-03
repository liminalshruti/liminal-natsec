import { useEffect, useMemo, useState } from "react";

import type { AlertView } from "../lib/types.ts";
import {
  actionsForCase,
  caseIdFromAlertId,
  hypothesesForCase,
  primaryClaimForCase,
  reviewApplicationForCase
} from "../lib/spineGraph.ts";
import { specialistReadsForCase } from "../lib/specialistReads.ts";

import { ActionOptions } from "./ActionOptions.tsx";
import { CaseHandoffBanner } from "./CaseHandoffBanner.tsx";
import { ConfidenceBar } from "./ConfidenceBar.tsx";
import { EvidenceDrawer } from "./EvidenceDrawer.tsx";
import { HormuzIntelDrawer } from "./HormuzIntelDrawer.tsx";
import { HypothesisBoard } from "./HypothesisBoard.tsx";
import { ProvenanceTrace } from "./ProvenanceTrace.tsx";
import { ReviewMemory } from "./ReviewMemory.tsx";
import { SpecialistReads } from "./SpecialistReads.tsx";

interface CustodyCasePanelProps {
  selectedAlert: AlertView;
}

export function CustodyCasePanel({ selectedAlert }: CustodyCasePanelProps) {
  const caseId = useMemo(
    () => caseIdFromAlertId(selectedAlert.id),
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
  const primaryClaim = useMemo(() => primaryClaimForCase(caseId), [caseId]);
  const primaryClaimId = primaryClaim?.id ?? null;
  const claimPosterior = useMemo(() => {
    if (!primaryClaim) return null;
    const data = (primaryClaim.data ?? {}) as Record<string, unknown>;
    return typeof data.posterior === "number" ? (data.posterior as number) : null;
  }, [primaryClaim]);
  const claimStatus = useMemo(() => {
    if (!primaryClaim) return null;
    return primaryClaim.status ?? null;
  }, [primaryClaim]);

  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string | null>(null);

  useEffect(() => {
    if (hypotheses.length === 0) {
      setSelectedHypothesisId(null);
      return;
    }
    setSelectedHypothesisId((current) => {
      if (current && hypotheses.some((node) => node.id === current)) return current;
      return hypotheses[0]?.id ?? null;
    });
  }, [hypotheses]);

  return (
    <>
      <CaseHandoffBanner caseId={caseId} ruleApplication={ruleApplication} />
      <div className="kv">
        <div className="kv__k">case</div>
        <div className="kv__v">{caseId ?? selectedAlert.title}</div>
        <div className="kv__k">alert</div>
        <div className="kv__v" style={{ wordBreak: "break-all" }}>
          {selectedAlert.id}
        </div>
        <div className="kv__k">claim</div>
        <div className="kv__v" style={{ wordBreak: "break-all" }}>
          {primaryClaimId ?? "—"}
          {claimStatus && (
            <span
              className={
                claimStatus.toLowerCase().includes("contested") ||
                claimStatus.toLowerCase().includes("review")
                  ? "tag tag--warn"
                  : "tag"
              }
              style={{ marginLeft: 6, fontSize: 9 }}
            >
              {claimStatus}
            </span>
          )}
        </div>
        <div className="kv__k">posterior</div>
        <div className="kv__v">
          <ConfidenceBar value={claimPosterior} variant="primary" />
        </div>
        <div className="kv__k">alert</div>
        <div className="kv__v">
          <span className="tag tag--warn">{selectedAlert.status}</span>
          <span style={{ color: "var(--fg-2)", marginLeft: 8 }}>
            score {selectedAlert.severity.toFixed(2)}
          </span>
        </div>
      </div>

      <HypothesisBoard
        hypotheses={hypotheses}
        primaryClaimId={primaryClaimId}
        selectedHypothesisId={selectedHypothesisId}
        onSelectHypothesis={setSelectedHypothesisId}
      />
      <ProvenanceTrace claimId={primaryClaimId} />
      <EvidenceDrawer claimId={primaryClaimId} />
      <HormuzIntelDrawer />
      <ActionOptions actions={actions} ruleApplication={ruleApplication} />
      <SpecialistReads reads={reads} />
      <ReviewMemory ruleApplication={ruleApplication} caseId={caseId} />
    </>
  );
}
