import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";

import type { AlertView } from "../lib/types.ts";
import type { LoadedScenario } from "../lib/fixtures.ts";
import { buildAskContext } from "../lib/askContext.ts";
import { eventIdFromCaseId } from "../lib/spineGraph.ts";
import { PHASE_LABELS } from "../map/tokens.ts";
import type { UiMode } from "../lib/uiModeStore.ts";
import { CommandLine } from "./CommandLine.tsx";
import type { ScenarioState as MapScenarioState } from "./MapWatchfloor.tsx";
import { StageViewport } from "./StageViewport.tsx";
import { SubstratePanel } from "./SubstratePanel.tsx";
import { WorkflowStrip } from "./WorkflowStrip.tsx";
import { WorkingPanel } from "./WorkingPanel.tsx";
import { AiNoticeToast } from "./AiNoticeToast.tsx";

interface AppShellProps {
  scenario: LoadedScenario | null;
  selectedAlertId: string | null;
  selectedAlert: AlertView | null;
  selectedCaseId: string | null;
  /** Pass an alert id to select it, or null to clear the current selection. */
  onSelectAlert: (id: string | null) => void;
  mapScenarioState: MapScenarioState | undefined;
  onMapScenarioChange: (next: MapScenarioState) => void;
  resetSignal: number;
  onReset: (mode?: "soft" | "full") => void;
  resetToast: string | null;
  uiMode: UiMode;
  /** No-arg call toggles between "demo" and "live". */
  onToggleUiMode: (next?: UiMode) => void;
}

interface PaneWidths {
  substrate: number;
  working: number;
}

const PANE_LIMITS = {
  substrateMin: 220,
  substrateMax: 560,
  workingMin: 360,
  workingMax: 760,
  stageMin: 420,
  resizeColumns: 16
};

export function AppShell({
  scenario,
  selectedAlertId,
  selectedAlert,
  selectedCaseId,
  onSelectAlert,
  mapScenarioState,
  onMapScenarioChange,
  resetSignal,
  onReset,
  resetToast,
  uiMode,
  onToggleUiMode
}: AppShellProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [paneWidths, setPaneWidths] = useState<PaneWidths>(() =>
    defaultPaneWidths(viewportWidth())
  );
  const [resizingPane, setResizingPane] = useState<"substrate" | "working" | null>(null);
  const eventId = eventIdFromCaseId(selectedCaseId);
  // D1 focus state: which pane should the operator's eye land on first?
  // When a case is selected, the working panel is operationally hot — that's
  // the make-or-break beat surface. When no case is selected, the stage
  // (map + replay) is the watchstanding-glance surface. Substrate becomes
  // active only on alert-hover (deferred to v3.3 — for now substrate stays
  // dim alongside whichever non-active pane it pairs with).
  const activePane: "substrate" | "stage" | "working" = selectedAlert
    ? "working"
    : "stage";
  const shellStyle = useMemo(
    () =>
      ({
        "--substrate-pane-width": `${paneWidths.substrate}px`,
        "--working-pane-width": `${paneWidths.working}px`
      }) as CSSProperties,
    [paneWidths]
  );

  const scenarioContext = useMemo(
    () => buildAskContext(scenario, selectedAlertId),
    [scenario, selectedAlertId]
  );

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    return () => window.cancelAnimationFrame(raf);
  }, [paneWidths]);

  const clampForShell = useCallback((next: PaneWidths, priority?: keyof PaneWidths) => {
    const width = shellRef.current?.getBoundingClientRect().width ?? viewportWidth();
    return clampPaneWidths(next, width, priority);
  }, []);

  const setClampedWidths = useCallback(
    (next: PaneWidths | ((prev: PaneWidths) => PaneWidths), priority?: keyof PaneWidths) => {
      setPaneWidths((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        return clampForShell(resolved, priority);
      });
    },
    [clampForShell]
  );

  const beginPaneResize = useCallback(
    (pane: "substrate" | "working") => (event: ReactPointerEvent<HTMLElement>) => {
      const shell = shellRef.current;
      if (!shell) return;
      event.preventDefault();
      setResizingPane(pane);

      const rect = shell.getBoundingClientRect();
      const onMove = (moveEvent: PointerEvent) => {
        setPaneWidths((prev) => {
          const next =
            pane === "substrate"
              ? { ...prev, substrate: moveEvent.clientX - rect.left }
              : { ...prev, working: rect.right - moveEvent.clientX };
          return clampPaneWidths(next, rect.width, pane);
        });
      };
      const onUp = () => {
        setResizingPane(null);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    []
  );

  function adjustPaneWidth(pane: "substrate" | "working", delta: number) {
    setClampedWidths(
      (prev) =>
        pane === "substrate"
          ? { ...prev, substrate: prev.substrate + delta }
          : { ...prev, working: prev.working + delta },
      pane
    );
  }

  return (
    <div
      ref={shellRef}
      className="app-shell"
      data-active-pane={activePane}
      data-ui-mode={uiMode}
      data-resizing-pane={resizingPane ?? undefined}
      style={shellStyle}
    >
      <header className="app-topbar">
        <span className="app-topbar__brand">Liminal Custody · Watchfloor</span>
        <WorkflowStrip />
        <Breadcrumb
          scenario={scenario}
          eventId={eventId}
          selectedAlert={selectedAlert}
          mapScenarioState={mapScenarioState}
          onClearSelection={() => onSelectAlert(null)}
        />
        <div className="app-topbar__status">
          <SourceIndicator scenario={scenario} />
          <UiModeChip uiMode={uiMode} onToggle={onToggleUiMode} />
        </div>
      </header>
      <SubstratePanel
        alerts={scenario?.state.alerts ?? []}
        scenarioState={scenario?.state ?? null}
        selectedAlertId={selectedAlertId}
        onSelectAlert={onSelectAlert}
        loading={!scenario}
      />
      <PaneResizeHandle
        pane="substrate"
        label="Resize watchfloor pane"
        onPointerDown={beginPaneResize("substrate")}
        onNudge={(delta) => adjustPaneWidth("substrate", delta)}
      />
      <StageViewport
        selectedAlert={selectedAlert}
        selectedCaseId={selectedCaseId}
        loading={!scenario}
        scenario={scenario}
        scenarioState={mapScenarioState}
        onScenarioStateChange={onMapScenarioChange}
        resetSignal={resetSignal}
      />
      <PaneResizeHandle
        pane="working"
        label="Resize working pane"
        onPointerDown={beginPaneResize("working")}
        onNudge={(delta) => adjustPaneWidth("working", delta)}
      />
      <WorkingPanel
        selectedAlert={selectedAlert}
        selectedAlertId={selectedAlertId}
        scenarioState={scenario?.state ?? null}
        loading={!scenario}
        uiMode={uiMode}
        replayPhase={mapScenarioState?.phase ?? 1}
      />
      <CommandLine
        scenario={scenario}
        mapScenarioState={mapScenarioState}
        onMapScenarioChange={onMapScenarioChange}
        onReset={onReset}
        onSelectAlert={onSelectAlert}
        alerts={scenario?.state.alerts ?? []}
        uiMode={uiMode}
        onToggleUiMode={onToggleUiMode}
        scenarioContext={scenarioContext}
      />
      {resetToast && (
        <div className="reset-toast" role="status" aria-live="polite">
          {resetToast}
        </div>
      )}
      {/* AiNoticeToast — top-of-screen banner announcing the AI-discovered
          draft case on demo start. Auto-collapses to a corner pill after
          8s. Click → selects the draft case in the working panel. Lives at
          the AppShell root so it overlays cleanly. */}
      <AiNoticeToast onClickDraft={(id) => onSelectAlert(id)} />
    </div>
  );
}

function PaneResizeHandle({
  pane,
  label,
  onPointerDown,
  onNudge
}: {
  pane: "substrate" | "working";
  label: string;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onNudge: (delta: number) => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 48 : 24;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    onNudge(pane === "substrate" ? direction * step : -direction * step);
  }
  return (
    <div
      className={`pane-resizer pane-resizer--${pane}`}
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}

function viewportWidth(): number {
  return typeof window === "undefined" ? 1440 : window.innerWidth;
}

function defaultPaneWidths(width: number): PaneWidths {
  if (width < 1024) return { substrate: 240, working: 380 };
  if (width < 1280) return { substrate: 272, working: 432 };
  if (width < 1440) return { substrate: 296, working: 480 };
  return { substrate: 320, working: 520 };
}

function clampPaneWidths(
  next: PaneWidths,
  viewport: number,
  priority: keyof PaneWidths = "substrate"
): PaneWidths {
  let substrate = clamp(next.substrate, PANE_LIMITS.substrateMin, PANE_LIMITS.substrateMax);
  let working = clamp(next.working, PANE_LIMITS.workingMin, PANE_LIMITS.workingMax);
  const maxSideTotal = Math.max(
    PANE_LIMITS.substrateMin + PANE_LIMITS.workingMin,
    viewport - PANE_LIMITS.stageMin - PANE_LIMITS.resizeColumns
  );

  if (substrate + working > maxSideTotal) {
    const overflow = substrate + working - maxSideTotal;
    if (priority === "substrate") {
      working = Math.max(PANE_LIMITS.workingMin, working - overflow);
    } else {
      substrate = Math.max(PANE_LIMITS.substrateMin, substrate - overflow);
    }
  }

  return { substrate: Math.round(substrate), working: Math.round(working) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function PhaseBadge({ state }: { state: MapScenarioState | undefined }) {
  if (!state) return null;
  const label = PHASE_LABELS[state.phase] ?? "—";
  return (
    <span
      className="tag tag--accent"
      title={`Phase ${state.phase} · ${label}`}
      style={{ marginLeft: 4 }}
    >
      P{state.phase} · {label}
    </span>
  );
}

/**
 * Topbar breadcrumb — a structured navigation trail from watchfloor → scenario
 * → event → currently-selected case. Each non-leaf segment is clickable to
 * navigate up the trail (Watchfloor and scenario segments both clear the
 * current case selection; the case itself stays as the leaf).
 *
 * The phase pill stays as the rightmost segment because phase is a *state of
 * the scenario timeline*, not a navigation level. It tells the operator which
 * beat of the replay they're in, which is different from "which case."
 */
function Breadcrumb({
  scenario,
  eventId,
  selectedAlert,
  mapScenarioState,
  onClearSelection
}: {
  scenario: LoadedScenario | null;
  eventId: string | null;
  selectedAlert: AlertView | null;
  mapScenarioState: MapScenarioState | undefined;
  onClearSelection: () => void;
}) {
  if (!scenario) {
    return (
      <nav className="topbar-crumbs" aria-label="Watchfloor breadcrumb">
        <span className="topbar-crumbs__seg topbar-crumbs__seg--root">Watchfloor</span>
        <span className="topbar-crumbs__sep" aria-hidden>/</span>
        <span className="topbar-crumbs__seg topbar-crumbs__seg--muted">loading…</span>
      </nav>
    );
  }
  // Pull the scenario short-name out of "scenario:alara-01" → "alara-01".
  const scenarioShort = scenario.state.scenarioRunId.replace(/^scenario:/, "");
  // Whether non-leaf segments should be interactive. Only meaningful when a
  // case is currently selected (i.e., there's something to navigate "up" from).
  const hasSelection = Boolean(selectedAlert);
  return (
    <nav className="topbar-crumbs" aria-label="Watchfloor breadcrumb">
      {hasSelection ? (
        <button
          type="button"
          className="topbar-crumbs__seg topbar-crumbs__seg--root topbar-crumbs__seg--clickable"
          onClick={onClearSelection}
          title="Return to watchfloor — clear case selection"
        >
          Watchfloor
        </button>
      ) : (
        <span className="topbar-crumbs__seg topbar-crumbs__seg--root">Watchfloor</span>
      )}
      <span className="topbar-crumbs__sep" aria-hidden>/</span>
      {hasSelection ? (
        <button
          type="button"
          className="topbar-crumbs__seg topbar-crumbs__seg--clickable"
          onClick={onClearSelection}
          title={`Return to scenario root — ${scenario.state.scenarioRunId}`}
        >
          {scenarioShort}
        </button>
      ) : (
        <span className="topbar-crumbs__seg" title={scenario.state.scenarioRunId}>
          {scenarioShort}
        </span>
      )}
      {eventId && (
        <>
          <span className="topbar-crumbs__sep" aria-hidden>/</span>
          <span
            className={`topbar-crumbs__seg topbar-crumbs__event topbar-crumbs__event--${eventId}`}
          >
            {eventId === "event-1" ? "Event 1" : "Event 2"}
          </span>
        </>
      )}
      {selectedAlert && (
        <>
          <span className="topbar-crumbs__sep" aria-hidden>/</span>
          <span
            className="topbar-crumbs__seg topbar-crumbs__seg--current"
            title={selectedAlert.id}
          >
            {selectedAlert.title}
          </span>
        </>
      )}
      {mapScenarioState && (
        <span
          key={`phase-${mapScenarioState.phase}`}
          className="topbar-crumbs__phase topbar-crumbs__phase--just-changed"
          title={`Phase ${mapScenarioState.phase} · ${PHASE_LABELS[mapScenarioState.phase] ?? "—"}`}
        >
          <span className="topbar-crumbs__phase-pip" aria-hidden />
          P{mapScenarioState.phase}
        </span>
      )}
    </nav>
  );
}

/**
 * Topbar chip that displays the current UI mode and toggles on click. Demo
 * mode is the pitch register (handwritten phase prompts, ink coastline, four-
 * layer empty stencil, named-operator card, stipple backdrop). Live mode
 * strips that scaffolding while preserving every functional surface.
 *
 * Discoverable via three paths: this chip, /mode in the command line, and
 * Ctrl+Shift+M.
 */
function UiModeChip({
  uiMode,
  onToggle
}: {
  uiMode: UiMode;
  onToggle: (next?: UiMode) => void;
}) {
  const next: UiMode = uiMode === "demo" ? "live" : "demo";
  return (
    <button
      type="button"
      className="ui-mode-chip"
      data-ui-mode={uiMode}
      onClick={() => onToggle(next)}
      title={`UI register: ${uiMode}. Click to switch to ${next}. (Ctrl+Shift+M)`}
      aria-label={`UI mode: ${uiMode}; click to switch to ${next}`}
    >
      <span className="ui-mode-chip__dot" aria-hidden />
      <span className="ui-mode-chip__label">{uiMode}</span>
    </button>
  );
}

function SourceIndicator({ scenario }: { scenario: LoadedScenario | null }) {
  if (!scenario) {
    return (
      <span>
        <span className="app-topbar__dot" /> connecting
      </span>
    );
  }
  if (scenario.source === "server") {
    return (
      <span>
        <span className="app-topbar__dot app-topbar__dot--ok" />{" "}
        {scenario.state.mode === "real" ? "server real" : "live server"}
      </span>
    );
  }
  if (scenario.state.mode === "real") {
    return (
      <span title={scenario.warning ?? "static real cache"}>
        <span className="app-topbar__dot app-topbar__dot--fallback" /> static real cache
      </span>
    );
  }
  return (
    <span title={scenario.warning ?? "fixture fallback"}>
      <span className="app-topbar__dot app-topbar__dot--fallback" /> fixture fallback
    </span>
  );
}
