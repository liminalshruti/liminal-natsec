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
import { EvidenceDrawer } from "./EvidenceDrawer.tsx";
import { ExecSummary } from "./ExecSummary.tsx";
import { HormuzIntelDrawer } from "./HormuzIntelDrawer.tsx";
import { HypothesisBoard } from "./HypothesisBoard.tsx";
import { KnowledgeGraphViz } from "./KnowledgeGraphViz.tsx";
import { ProvenanceTrace } from "./ProvenanceTrace.tsx";
import { ReviewMemory } from "./ReviewMemory.tsx";
import { SpecialistReads } from "./SpecialistReads.tsx";
import { TypedObjectChip } from "./TypedObjectChip.tsx";

interface CustodyCasePanelProps {
  selectedAlert: AlertView;
}

// v3.2 IA — see WorkingPanel.tsx and docs/TECHNICAL_PLAN.md §0.2.
// Operative surface (Zones 1+2) is pinned; forensic surface (Zone 3 case file)
// scrolls with dragon-fold sticky section headers.
export function CustodyCasePanel({ selectedAlert }: CustodyCasePanelProps) {
  const caseId = useMemo(
    () => selectedAlert.caseId ?? caseIdFromAlertId(selectedAlert.id),
    [selectedAlert.caseId, selectedAlert.id]
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

  // Reset case-file scroll position when the selected case changes —
  // case 2 is a different document than case 1, top of the new doc.
  useEffect(() => {
    const forensic = document.querySelector(".working__forensic");
    if (forensic) forensic.scrollTop = 0;
  }, [caseId]);

  // ── Zone 1 verb derivation ────────────────────────────────────────────────
  // Verb-with-posture (Round 1 fork iii). Verb is the system's recommendation;
  // posture-WHILE clause is the constraint annotation that hedges honestly.
  // Concrete derivation lives in ActionOptions; here we surface the lead verb
  // + claim status as the WHILE-line for now (v3.2 will derive from ranked
  // ActionOptions once that contract exists).
  const verbLabel = ruleApplication
    ? "RECOMMEND collection"
    : claimStatus?.toLowerCase().includes("contested")
    ? "RECOMMEND monitor"
    : "RECOMMEND review";

  const postureLabel = ruleApplication
    ? null
    : claimStatus?.toLowerCase().includes("contested")
    ? "WHILE custody contested"
    : null;

  return (
    <>
      {/* ── OPERATIVE SURFACE (pinned) ──────────────────────────────────────── */}
      <div className="working__operative">
        <CaseHandoffBanner caseId={caseId} ruleApplication={ruleApplication} />

        <div className="zone1">
          {/* key={verbLabel} forces React to remount on label change so the
              CSS keyframe replays — produces the staged crossfade visible to
              judges during the rule-fire moment. */}
          <div key={`v-${verbLabel}`} className="zone1__verb">{verbLabel}</div>
          {postureLabel && (
            <div key={`p-${postureLabel}`} className="zone1__posture">
              <span className="zone1__posture-while">WHILE</span>
              {postureLabel.replace(/^WHILE /i, "")}
            </div>
          )}
          {ruleApplication && (
            <div key={`r-${ruleApplication.ruleId}`} className="zone1__posture">
              <span className="zone1__posture-while">PRIOR RULE APPLIED</span>
            </div>
          )}
        </div>

        {/* Metadata strip — case + claim chips inline, subordinate to the
            verb. Posterior bar moves into the chip's own posterior badge.
            Three KV rows collapsed into one strip; verb keeps primacy. */}
        <div className="zone1__meta">
          {caseId && (
            <TypedObjectChip
              kind="case"
              id={caseId}
              status={selectedAlert.status}
              size="sm"
            />
          )}
          {primaryClaimId && (
            <TypedObjectChip
              kind="claim"
              id={primaryClaimId}
              status={claimStatus ?? undefined}
              posterior={claimPosterior}
              size="sm"
            />
          )}
        </div>

        {/* Zone 2 — causal flow, top to bottom: SUBSTRATE → VERDICT.
            Specialist reads feed the Bayesian fusion that produces the
            hypotheses' posteriors. Rendering them stacked (not side-by-
            side) makes the causal relationship visible: 6 specialist
            voices on top, 3 ranked hypotheses below as the verdict. */}
        <div className="zone2 zone2--causal">
          <div className="zone2__substrate">
            <div className="zone2__row-label">Specialists</div>
            <SpecialistReads reads={reads} />
          </div>
          <div className="zone2__causal-arrow" aria-hidden>
            ▼
          </div>
          <div className="zone2__verdict">
            <div className="zone2__row-label">Hypotheses</div>
            <HypothesisBoard
              hypotheses={hypotheses}
              primaryClaimId={primaryClaimId}
              selectedHypothesisId={selectedHypothesisId}
              onSelectHypothesis={setSelectedHypothesisId}
            />
          </div>
        </div>
      </div>

      {/* ── FORENSIC SURFACE — the case vault. Workshop principle: "every UI
          surface should feel like it's holding something, not resolving it."
          Section headers reframe from generic file-sections to vault
          holdings — each is an artifact in custody. Dragon-fold pattern
          stays; the verb changes. */}
      <div className="working__forensic">
        <div className="case-file">
          <section className="case-file__section">
            <div className="case-file__section-header">
              <span>Brief</span>
              <span className="case-file__section-meta">held in vault</span>
            </div>
            <div className="case-file__section-body">
              <ExecSummary
                caseId={caseId}
                claimId={primaryClaimId}
                claimStatus={claimStatus ?? undefined}
                claimPosterior={claimPosterior}
                hypothesisCount={hypotheses.length}
                reads={reads}
                actions={actions}
                ruleApplication={ruleApplication}
              />
            </div>
          </section>

          <section className="case-file__section">
            <div className="case-file__section-header">
              <span>Knowledge graph</span>
              <span className="case-file__section-meta">case subgraph · BFS depth 4</span>
            </div>
            <div className="case-file__section-body">
              <KnowledgeGraphViz caseId={caseId} />
            </div>
          </section>

          <section className="case-file__section">
            <div className="case-file__section-header">
              <span>Provenance chain</span>
              <span className="case-file__section-meta">action ← claim ← hypothesis ← anomaly ← observation</span>
            </div>
            <div className="case-file__section-body">
              <ProvenanceTrace claimId={primaryClaimId} />
            </div>
          </section>

          <section className="case-file__section">
            <div className="case-file__section-header">
              <span>Evidence held</span>
              <span className="case-file__section-meta">supports · weakens · contradicts</span>
            </div>
            <div className="case-file__section-body">
              <EvidenceDrawer claimId={primaryClaimId} />
              <HormuzIntelDrawer />
            </div>
          </section>

          <section className="case-file__section">
            <div className="case-file__section-header">
              <span>Bounded actions</span>
              <span className="case-file__section-meta">recommendations under the guard</span>
            </div>
            <div className="case-file__section-body">
              <ActionOptions actions={actions} ruleApplication={ruleApplication} />
            </div>
          </section>

          <section className="case-file__section">
            <div className="case-file__section-header">
              <span>Review memory</span>
              <span className="case-file__section-meta">operator doctrine</span>
            </div>
            <div className="case-file__section-body">
              <ReviewMemory ruleApplication={ruleApplication} caseId={caseId} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
