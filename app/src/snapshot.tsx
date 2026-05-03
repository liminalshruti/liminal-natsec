import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { loadScenario, type LoadedScenario } from "./lib/fixtures.ts";
import {
  actionsForCase,
  caseIdFromAlertId,
  hypothesesForCase,
  primaryClaimForCase,
  reviewApplicationForCase
} from "./lib/spineGraph.ts";
import { specialistReadsForCase } from "./lib/specialistReads.ts";
import type { AlertView } from "./lib/types.ts";

import { ActionOptions } from "./components/ActionOptions.tsx";
import { AiNoticeToast } from "./components/AiNoticeToast.tsx";
import { CaseHandoffBanner } from "./components/CaseHandoffBanner.tsx";
import { CommandLine } from "./components/CommandLine.tsx";
import { ConfidenceBar } from "./components/ConfidenceBar.tsx";
import { CustodyCasePanel } from "./components/CustodyCasePanel.tsx";
import { CustodyQueue } from "./components/CustodyQueue.tsx";
import { DataSourcesChips } from "./components/DataSourcesChips.tsx";
import { DraftCaseCard } from "./components/DraftCaseCard.tsx";
import { DRAFT_CASES } from "./lib/draftCase.ts";
import { DraftCaseDetail } from "./components/DraftCaseDetail.tsx";
import { EvidenceChain } from "./components/EvidenceChain.tsx";
import { EvidenceDrawer } from "./components/EvidenceDrawer.tsx";
import { ExecSummary } from "./components/ExecSummary.tsx";
import { HormuzIntelDrawer } from "./components/HormuzIntelDrawer.tsx";
import { HypothesisBoard } from "./components/HypothesisBoard.tsx";
import { HypothesisSurface } from "./components/HypothesisSurface.tsx";
import { MapTelemetryHud } from "./components/MapTelemetryHud.tsx";
import { NamedOperatorCard } from "./components/NamedOperatorCard.tsx";
import { ProvenanceTrace } from "./components/ProvenanceTrace.tsx";
import { ReviewMemory } from "./components/ReviewMemory.tsx";
import { SpecialistReads } from "./components/SpecialistReads.tsx";
import { SubstratePanel } from "./components/SubstratePanel.tsx";
import { TypedObjectChip } from "./components/TypedObjectChip.tsx";
import { WorkingPanel } from "./components/WorkingPanel.tsx";

// DemoPrompt + ReplayControls intentionally NOT imported — both deferred
// (annotation rework brief, replay-controls user-removal) but their files
// remain in the codebase for future re-instatement. Don't surface in
// the export until they're either revived or fully deleted.

import "./styles.css";

interface HarnessContext {
  scenario: LoadedScenario;
  alert: AlertView;
  caseId: string | null;
}

type Renderer = (ctx: HarnessContext) => ReactNode;

const registry: Record<string, { label: string; render: Renderer; wide?: boolean }> = {
  CustodyCasePanel: {
    label: "Custody case panel",
    wide: true,
    render: ({ alert }) => <CustodyCasePanel selectedAlert={alert} />
  },
  WorkingPanel: {
    label: "Working panel (case open)",
    wide: true,
    render: ({ alert, scenario }) => (
      <WorkingPanel selectedAlert={alert} scenarioState={scenario.state} loading={false} uiMode="demo" />
    )
  },
  WorkingPanelEmpty: {
    label: "Working panel (no case selected)",
    wide: true,
    render: ({ scenario }) => (
      <WorkingPanel selectedAlert={null} scenarioState={scenario.state} loading={false} uiMode="demo" />
    )
  },
  HypothesisBoard: {
    label: "Hypothesis board",
    render: ({ caseId }) => {
      const hypotheses = caseId ? hypothesesForCase(caseId) : [];
      const claim = primaryClaimForCase(caseId);
      return (
        <HypothesisBoard
          hypotheses={hypotheses}
          primaryClaimId={claim?.id ?? null}
          selectedHypothesisId={hypotheses[0]?.id ?? null}
          onSelectHypothesis={() => undefined}
        />
      );
    }
  },
  HypothesisSurface: {
    label: "Hypothesis posterior surface",
    wide: true,
    render: ({ caseId }) => <HypothesisSurface caseId={caseId} />
  },
  SpecialistReads: {
    label: "Specialist reads (6 rows)",
    render: ({ caseId }) => <SpecialistReads reads={caseId ? specialistReadsForCase(caseId) : []} />
  },
  ReviewMemory: {
    label: "Review memory",
    render: ({ caseId }) => {
      const app = caseId ? reviewApplicationForCase(caseId) : null;
      return <ReviewMemory ruleApplication={app?.changed ? app : null} caseId={caseId} />;
    }
  },
  ActionOptions: {
    label: "Bounded action options",
    render: ({ caseId }) => {
      const actions = caseId ? actionsForCase(caseId) : [];
      const app = caseId ? reviewApplicationForCase(caseId) : null;
      return <ActionOptions actions={actions} ruleApplication={app?.changed ? app : null} />;
    }
  },
  ExecSummary: {
    label: "Executive brief",
    wide: true,
    render: ({ caseId }) => {
      const claim = primaryClaimForCase(caseId);
      const claimId = claim?.id ?? null;
      const data = (claim?.data ?? {}) as Record<string, unknown>;
      const claimPosterior = typeof data.posterior === "number" ? (data.posterior as number) : null;
      const reads = caseId ? specialistReadsForCase(caseId) : [];
      const actions = caseId ? actionsForCase(caseId) : [];
      const hypotheses = caseId ? hypothesesForCase(caseId) : [];
      const app = caseId ? reviewApplicationForCase(caseId) : null;
      return (
        <ExecSummary
          caseId={caseId}
          claimId={claimId}
          claimStatus={claim?.status ?? undefined}
          claimPosterior={claimPosterior}
          hypothesisCount={hypotheses.length}
          reads={reads}
          actions={actions}
          ruleApplication={app?.changed ? app : null}
        />
      );
    }
  },
  EvidenceChain: {
    label: "Evidence chain",
    render: ({ caseId }) => {
      const claim = primaryClaimForCase(caseId);
      return <EvidenceChain claimId={claim?.id ?? null} />;
    }
  },
  EvidenceDrawer: {
    label: "Evidence drawer (supports / weakens / contradicts)",
    render: ({ caseId }) => {
      const claim = primaryClaimForCase(caseId);
      return <EvidenceDrawer claimId={claim?.id ?? null} />;
    }
  },
  ProvenanceTrace: {
    label: "Provenance trace",
    render: ({ caseId }) => {
      const claim = primaryClaimForCase(caseId);
      return <ProvenanceTrace claimId={claim?.id ?? null} />;
    }
  },
  CaseHandoffBanner: {
    label: "Case handoff banner",
    wide: true,
    render: ({ caseId }) => {
      const app = caseId ? reviewApplicationForCase(caseId) : null;
      return <CaseHandoffBanner caseId={caseId} ruleApplication={app?.changed ? app : null} />;
    }
  },
  ConfidenceBar: {
    label: "Confidence bar",
    render: () => (
      <div style={{ display: "grid", gap: 14, padding: 18, maxWidth: 360 }}>
        <ConfidenceBar value={0.84} variant="primary" label="Custody continuity" />
        <ConfidenceBar value={0.41} variant="default" label="Spoof hypothesis" />
        <ConfidenceBar value={0.18} variant="muted" label="Receiver gap" />
        <ConfidenceBar value={null} label="Unscored" />
      </div>
    )
  },
  TypedObjectChip: {
    label: "Typed object chips",
    render: () => (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 18 }}>
        <TypedObjectChip kind="case" id="case:alara-01:event-1" status="OPEN" />
        <TypedObjectChip kind="claim" id="claim:alara-01:event-1:custody:h1" status="CONTESTED" posterior={0.62} />
        <TypedObjectChip kind="hypothesis" id="hyp:alara-01:event-1:same-vessel" status="primary" posterior={0.71} />
        <TypedObjectChip kind="evidence" id="evid:alara-01:event-1:rf-001" status="WEAKENS" />
        <TypedObjectChip kind="action" id="act:alara-01:event-1:retask-collect" status="RECOMMENDED" />
      </div>
    )
  },
  // DemoPromptP1-P6 removed — annotation overlay deferred pending element-
  // bound annotation system rework. See docs/annotation-rework-brief.md.
  MapTelemetryHud: {
    label: "Map telemetry HUD",
    render: ({ scenario }) => (
      <MapTelemetryHud
        scenario={scenario}
        scenarioState={{ phase: 4, clockIso: "2026-04-18T12:30:00Z", isPlaying: false }}
      />
    )
  },
  // ReplayControls removed per Shayaun + Shruti agreement: hiding-data-
  // until-click was the wrong frame. The demo's beat structure is the
  // demo itself running its replay clock, not a UI affordance to seek.
  AiNoticeToast: {
    label: "AI notice toast (banner mode)",
    render: () => (
      <div style={{ position: "relative", height: 220, padding: 24, background: "#0c1116" }}>
        <AiNoticeToast onClickDraft={() => undefined} />
      </div>
    )
  },
  DraftCaseCard: {
    label: "Draft case card (substrate panel chip)",
    render: () => (
      <div style={{ padding: 12, maxWidth: 320 }}>
        <DraftCaseCard
          draftCaseId={DRAFT_CASES[0]!.id}
          selectedAlertId={null}
          onSelect={() => undefined}
        />
      </div>
    )
  },
  DraftCaseDetail: {
    label: "Draft case detail (working panel)",
    wide: true,
    render: () => <DraftCaseDetail />
  },
  SubstratePanel: {
    label: "Substrate panel",
    render: ({ scenario, alert }) => (
      <SubstratePanel
        alerts={scenario.state.alerts}
        scenarioState={scenario.state}
        selectedAlertId={alert.id}
        onSelectAlert={() => undefined}
        loading={false}
      />
    )
  },
  CustodyQueue: {
    label: "Custody queue",
    render: ({ scenario, alert }) => (
      <CustodyQueue
        alerts={scenario.state.alerts}
        scenarioState={scenario.state}
        selectedAlertId={alert.id}
        onSelectAlert={() => undefined}
        loading={false}
      />
    )
  },
  DataSourcesChips: { label: "Data sources chips", render: () => <DataSourcesChips /> },
  NamedOperatorCard: { label: "Named operator card", render: () => <NamedOperatorCard /> },
  HormuzIntelDrawer: { label: "Hormuz intel drawer", render: () => <HormuzIntelDrawer /> },
  CommandLine: {
    label: "Command line",
    wide: true,
    render: ({ scenario }) => (
      <CommandLine
        scenario={scenario}
        mapScenarioState={{ phase: 1, clockIso: "2026-04-18T09:55:00Z", isPlaying: false }}
        onMapScenarioChange={() => undefined}
        onReset={() => undefined}
        onSelectAlert={() => undefined}
        alerts={scenario.state.alerts}
        uiMode="demo"
        onToggleUiMode={() => undefined}
      />
    )
  }
};

export const SNAPSHOT_REGISTRY_NAMES = Object.keys(registry);

function alertForName(scenario: LoadedScenario, requested: string | null): AlertView | null {
  const alerts = scenario.state.alerts;
  if (alerts.length === 0) return null;
  if (requested) {
    const match = alerts.find((entry) => entry.id === requested || entry.caseId === requested);
    if (match) return match;
    const idx = Number(requested);
    if (Number.isInteger(idx) && alerts[idx]) return alerts[idx];
  }
  return alerts[0];
}

function Harness() {
  const [scenario, setScenario] = useState<LoadedScenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const componentName = params.get("component");
  const alertHint = params.get("alert");

  useEffect(() => {
    let cancelled = false;
    loadScenario()
      .then((result) => {
        if (!cancelled) setScenario(result);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <ErrorScreen message={error} />;
  }
  if (!scenario) {
    return <Status>loading scenario fixtures…</Status>;
  }

  if (!componentName) {
    return <Catalog scenario={scenario} />;
  }

  const entry = registry[componentName];
  if (!entry) {
    return <ErrorScreen message={`Unknown component "${componentName}". See ?component= catalog.`} />;
  }

  const alert = alertForName(scenario, alertHint);
  if (!alert) {
    return <ErrorScreen message="Scenario fixture has no alerts to seed harness props." />;
  }

  const caseId = alert.caseId ?? caseIdFromAlertId(alert.id);
  return (
    <Frame label={entry.label} wide={entry.wide}>
      {entry.render({ scenario, alert, caseId })}
    </Frame>
  );
}

function Frame({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div
      data-snapshot-frame
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary, #0c1116)",
        color: "var(--fg-primary, #e6edf3)",
        padding: "32px",
        display: "flex",
        justifyContent: "center"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: wide ? 1180 : 720,
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}
      >
        <header
          style={{
            fontFamily: "'Geist Mono', ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--fg-muted, #7d8b97)"
          }}
        >
          {label}
        </header>
        <div data-snapshot-target style={{ display: "flex", flexDirection: "column", minHeight: 200 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Status({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg-primary, #0c1116)",
        color: "var(--fg-muted, #7d8b97)",
        fontFamily: "'Geist Mono', ui-monospace, monospace",
        fontSize: 12,
        letterSpacing: "0.1em",
        textTransform: "uppercase"
      }}
    >
      {children}
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 32,
        background: "var(--bg-primary, #0c1116)",
        color: "var(--color-refused, #ff6464)",
        fontFamily: "'Geist Mono', ui-monospace, monospace"
      }}
    >
      {message}
    </div>
  );
}

function Catalog({ scenario }: { scenario: LoadedScenario }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 32,
        background: "var(--bg-primary, #0c1116)",
        color: "var(--fg-primary, #e6edf3)",
        fontFamily: "'Geist Mono', ui-monospace, monospace"
      }}
    >
      <h1 style={{ fontSize: 18, letterSpacing: "0.16em", textTransform: "uppercase" }}>
        snapshot harness
      </h1>
      <p style={{ color: "var(--fg-muted, #7d8b97)", maxWidth: 680, lineHeight: 1.6 }}>
        Append <code>?component=&lt;name&gt;</code> to render one component in isolation.
        Optional <code>&amp;alert=&lt;id|index&gt;</code> picks the seeding alert (default: first alert in scenario fixtures —{" "}
        {scenario.state.alerts[0]?.id ?? "none"}).
      </p>
      <ul style={{ display: "grid", gap: 6, paddingLeft: 18 }}>
        {Object.entries(registry).map(([name, entry]) => (
          <li key={name}>
            <a
              style={{ color: "var(--accent, #5fa8d3)" }}
              href={`?component=${encodeURIComponent(name)}`}
            >
              {name}
            </a>{" "}
            <span style={{ color: "var(--fg-muted, #7d8b97)" }}>— {entry.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root element not found");
}
createRoot(container).render(<Harness />);
