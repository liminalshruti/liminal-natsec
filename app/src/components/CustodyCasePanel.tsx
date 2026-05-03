import { useEffect, useMemo, useState } from "react";

import type { AlertView } from "../lib/types.ts";
import {
  actionsForCase,
  caseIdFromAlertId,
  hypothesesForCase,
  nodeById,
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
import { HypothesisSurface } from "./HypothesisSurface.tsx";
import { KnowledgeGraphViz } from "./KnowledgeGraphViz.tsx";
import { OsintIntakeBand } from "./OsintIntakeBand.tsx";
import { ProvenanceTrace } from "./ProvenanceTrace.tsx";
import { ReviewMemory } from "./ReviewMemory.tsx";
import { SpecialistReads } from "./SpecialistReads.tsx";
import { TypedObjectChip } from "./TypedObjectChip.tsx";

interface CustodyCasePanelProps {
  selectedAlert: AlertView;
  /** Current replay phase (1..6). Drives the OSINT intake band's phase-keyed reveal. */
  replayPhase?: number;
}

// v3.2 IA — see WorkingPanel.tsx and docs/TECHNICAL_PLAN.md §0.2.
// Operative surface (Zones 1+2) is pinned; forensic surface (Zone 3 case file)
// scrolls with dragon-fold sticky section headers.
export function CustodyCasePanel({ selectedAlert, replayPhase = 1 }: CustodyCasePanelProps) {
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
  const caseNode = useMemo(() => nodeById(caseId), [caseId]);
  const ruleApplication = useMemo(
    () => (caseId ? reviewApplicationForCase(caseId) : null),
    [caseId]
  );
  const changedRuleApplication = ruleApplication?.changed ? ruleApplication : null;
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
  const hasRecommendedCollection = actions.some((action) => {
    const data = (action.data ?? {}) as Record<string, unknown>;
    const actionType =
      typeof data.actionType === "string"
        ? data.actionType
        : typeof data.kind === "string"
          ? data.kind
          : "";
    return (
      action.status?.toLowerCase().includes("recommended") ||
      action.status?.toLowerCase().includes("changed") ||
      actionType === "REQUEST_SAR_OR_RF_CORROBORATION"
    );
  });

  const verbLabel = changedRuleApplication || hasRecommendedCollection
    ? "RECOMMEND collection"
    : claimStatus?.toLowerCase().includes("contested")
    ? "RECOMMEND monitor"
    : "RECOMMEND review";

  const postureLabel = changedRuleApplication
    ? null
    : claimStatus?.toLowerCase().includes("contested")
    ? "WHILE custody contested"
    : null;

  return (
    <>
      {/* ── OPERATIVE SURFACE (pinned) ──────────────────────────────────────── */}
      <div className="working__operative">
        <CaseHandoffBanner caseId={caseId} ruleApplication={changedRuleApplication} />

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
          {changedRuleApplication && (
            <div key={`r-${changedRuleApplication.ruleId}`} className="zone1__posture">
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
              label={caseNode?.title}
              status={selectedAlert.status}
              size="sm"
            />
          )}
          {primaryClaimId && (
            <TypedObjectChip
              kind="claim"
              id={primaryClaimId}
              label={primaryClaim?.title}
              status={claimStatus ?? undefined}
              posterior={claimPosterior}
              size="sm"
            />
          )}
        </div>

        <CaseLead node={caseNode} />

        {/* Intake band — OSINT signals feeding the analysis below. Phase-keyed
            reveal so chips "arrive" as the replay clock advances. The same
            family colors reappear on the Specialist Reads rows so the eye
            traces Signals → Analysis → Verdict without hover. */}
        <OsintIntakeBand phase={replayPhase} />

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
          stays; the verb changes.

          Section order is load-bearing for the 3-min demo. The proof chain
          beats — Signal Integrity contested → Intent refused → Review rule
          saved → Changed recommendation — must be visible without scrolling
          past filler. Bounded actions (the PRIOR TOP / RECOMMENDED diff) and
          Review memory (the rule-writing surface) lead the stack and start
          open. Brief stays open as supporting narrative. The richer-but-
          filler-in-3-min sections (Knowledge graph, Posterior surface,
          Provenance chain, Evidence held) are demoted and closed by
          default — preserved for Q&A, kept off the focal path. */}
      <div className="working__forensic">
        <div className="case-file">
          <details className="case-file__section" open>
            <summary className="case-file__section-header">
              <span>Bounded actions</span>
              <span className="case-file__section-meta">recommendations under the guard</span>
            </summary>
            <div className="case-file__section-body">
              <ActionOptions actions={actions} ruleApplication={changedRuleApplication} />
            </div>
          </details>

          <details className="case-file__section" open>
            <summary className="case-file__section-header">
              <span>Review memory</span>
              <span className="case-file__section-meta">operator doctrine</span>
            </summary>
            <div className="case-file__section-body">
              <ReviewMemory ruleApplication={changedRuleApplication} caseId={caseId} />
            </div>
          </details>

          <details className="case-file__section">
            <summary className="case-file__section-header">
              <span>Brief</span>
              <span className="case-file__section-meta">held in vault</span>
            </summary>
            <div className="case-file__section-body">
              <ExecSummary
                caseId={caseId}
                claimId={primaryClaimId}
                claimStatus={claimStatus ?? undefined}
                claimPosterior={claimPosterior}
                hypothesisCount={hypotheses.length}
                reads={reads}
                actions={actions}
                ruleApplication={changedRuleApplication}
              />
            </div>
          </details>

          <details className="case-file__section">
            <summary className="case-file__section-header">
              <span>Knowledge graph</span>
              <span className="case-file__section-meta">case subgraph · BFS depth 4</span>
            </summary>
            <div className="case-file__section-body">
              <KnowledgeGraphViz caseId={caseId} />
            </div>
          </details>

          <details className="case-file__section">
            <summary className="case-file__section-header">
              <span>Posterior surface</span>
              <span className="case-file__section-meta">3 hypotheses × 6 phases · isometric wireframe</span>
            </summary>
            <div className="case-file__section-body">
              <HypothesisSurface caseId={caseId} />
            </div>
          </details>

          <details className="case-file__section">
            <summary className="case-file__section-header">
              <span>Provenance chain</span>
              <span className="case-file__section-meta">action ← claim ← hypothesis ← anomaly ← observation</span>
            </summary>
            <div className="case-file__section-body">
              <ProvenanceTrace claimId={primaryClaimId} />
            </div>
          </details>

          <details className="case-file__section">
            <summary className="case-file__section-header">
              <span>Evidence held</span>
              <span className="case-file__section-meta">supports · weakens · contradicts</span>
            </summary>
            <div className="case-file__section-body">
              <EvidenceDrawer claimId={primaryClaimId} />
              <HormuzIntelDrawer />
            </div>
          </details>
        </div>
      </div>
    </>
  );
}

function CaseLead({ node }: { node: ReturnType<typeof nodeById> }) {
  const data = (node?.data ?? {}) as Record<string, unknown>;
  const leadSummary =
    typeof data.lead_summary === "string" ? data.lead_summary : null;
  const context = isRecord(data.case_context) ? data.case_context : {};
  const features = isRecord(data.features) ? data.features : {};
  const keyFindings = Array.isArray(data.key_findings)
    ? data.key_findings.filter((item): item is string => typeof item === "string")
    : [];
  const sourceMix = Array.isArray(data.source_mix)
    ? data.source_mix.filter((item): item is string => typeof item === "string")
    : [];
  const contextItems = [
    stringValue(context.watch_box_name) ?? stringValue(features.aoi_name),
    stringValue(context.replay_anchor),
    stringValue(context.review_window_label) ??
      (typeof features.review_window_hours === "number"
        ? `${features.review_window_hours}h review window`
        : null)
  ].filter((item): item is string => Boolean(item));
  const scopeNote = stringValue(context.scope_note);

  if (!leadSummary && keyFindings.length === 0 && contextItems.length === 0 && !scopeNote) {
    return null;
  }

  return (
    <div className="case-lead" role="region" aria-label="Case OSINT synthesis">
      <div className="case-lead__head">
        <span className="case-lead__eyebrow">REAL OSINT CASE</span>
        {sourceMix.length > 0 && (
          <span className="case-lead__sources">
            {sourceMix.slice(0, 5).join(" · ")}
          </span>
        )}
      </div>
      {contextItems.length > 0 && (
        <div className="case-lead__context">
          {contextItems.map((item) => (
            <span key={item} className="case-lead__context-chip">
              {item}
            </span>
          ))}
        </div>
      )}
      {leadSummary && <div className="case-lead__summary">{leadSummary}</div>}
      {scopeNote && <div className="case-lead__scope">{scopeNote}</div>}
      {keyFindings.length > 0 && (
        <div className="case-lead__findings">
          {keyFindings.slice(0, 3).map((finding) => (
            <span key={finding} className="case-lead__finding">
              {finding}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
