import { forwardRef, useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import type { LoadedScenario } from "../lib/fixtures.ts";
import { saveRule } from "../lib/reviewRulesStore.ts";
import type { UiMode } from "../lib/uiModeStore.ts";
import { R001_DSL } from "../../../shared/rules/builtin.ts";
import type { AlertView } from "../lib/types.ts";
import { askAi, AskError } from "../lib/askClient.ts";
import type { ScenarioState } from "./MapWatchfloor.tsx";
// ReplayControls removed per Shayaun + Shruti feedback (2026-05-03):
// hiding-data-until-click is the wrong frame; the prev/play/next chrome
// adds cognitive load without clear value, and the demo's beat structure
// should be the demo itself, not a UI affordance to seek between beats.
// Manual phase advance during pitch can use the existing CommandLine
// slash commands (`/event 1`, `/event 2`) if needed.
// import { ReplayControls } from "./ReplayControls.tsx";

interface CommandLineProps {
  scenario: LoadedScenario | null;
  mapScenarioState: ScenarioState | undefined;
  onMapScenarioChange?: (state: ScenarioState) => void;
  onReset: (mode?: "soft" | "full") => void;
  onSelectAlert: (id: string) => void;
  alerts: AlertView[];
  uiMode: UiMode;
  /** No-arg call toggles. Pass "demo" or "live" to set explicitly. */
  onToggleUiMode: (next?: UiMode) => void;
  /**
   * Bundled JSON view of the current scenario, sent verbatim as the "case
   * data" payload to Pi-AI when the operator runs `/ask`. Optional so
   * snapshot harness renders without wiring it.
   */
  scenarioContext?: unknown;
}

type InlineResult = {
  kind: "inline";
  status: "ok" | "info" | "error";
  message: string;
};

type AskResult = {
  kind: "ask";
  status: "pending" | "ok" | "error";
  question: string;
  answer?: string;
  error?: string;
  model?: string;
  source?: string;
};

type CommandResult = InlineResult | AskResult;

export const CommandLine = forwardRef<HTMLDivElement, CommandLineProps>(
  function CommandLine(
    {
      scenario,
      mapScenarioState,
      onMapScenarioChange: _onMapScenarioChange,
      onReset,
      onSelectAlert,
      alerts,
      uiMode,
      onToggleUiMode,
      scenarioContext
    }: CommandLineProps,
    ref
  ) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const askAbortRef = useRef<AbortController | null>(null);

  const dismissAsk = useCallback(() => {
    askAbortRef.current?.abort();
    askAbortRef.current = null;
    setResult((prev) => (prev?.kind === "ask" ? null : prev));
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        inputRef.current?.focus();
        setInput("/");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!result || result.kind !== "ask") return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissAsk();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, dismissAsk]);

  useEffect(() => {
    if (!result || result.kind !== "inline") return;
    const handle = window.setTimeout(() => setResult(null), 4000);
    return () => window.clearTimeout(handle);
  }, [result]);

  useEffect(() => {
    return () => {
      askAbortRef.current?.abort();
    };
  }, []);

  function dispatchAsk(question: string) {
    askAbortRef.current?.abort();
    const controller = new AbortController();
    askAbortRef.current = controller;
    setResult({ kind: "ask", status: "pending", question });

    askAi(question, scenarioContext, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setResult({
          kind: "ask",
          status: "ok",
          question,
          answer: response.answer,
          model: response.model,
          source: response.source
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof AskError
            ? err.detail || err.message
            : err instanceof Error
            ? err.message
            : String(err);
        setResult({ kind: "ask", status: "error", question, error: message });
      });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const command = input.trim();
    if (!command) return;
    setInput("");

    const tokens = command.replace(/^\//, "").split(/\s+/);
    const verb = tokens[0]?.toLowerCase();

    if (verb === "ask") {
      const question = command.replace(/^\/?ask\s*/i, "").trim();
      if (!question) {
        setResult({
          kind: "inline",
          status: "error",
          message: "usage: /ask <question>"
        });
        return;
      }
      dispatchAsk(question);
      return;
    }

    setResult(
      runCommand(command, { onReset, onSelectAlert, alerts, uiMode, onToggleUiMode })
    );
  }

  const sourceStatus = scenario
    ? scenario.source === "server"
      ? scenario.state.mode === "real"
        ? `real ${scenario.state.caseGenerationStatus?.toLowerCase() ?? "sources"}`
        : `seeded ${scenario.state.seededAt}`
      : scenario.state.mode === "real"
      ? "local real sources"
      : `local sources ${scenario.warning ?? "offline"}`
    : "connecting...";

  const inlineResult = result?.kind === "inline" ? result : null;
  const askResult = result?.kind === "ask" ? result : null;

  return (
    <footer ref={ref} className="command-line" role="contentinfo" tabIndex={-1}>
      <h2 className="visually-hidden">Command</h2>
      {askResult && <AskPanel result={askResult} onDismiss={dismissAsk} />}
      <span className="command-line__prompt" aria-hidden>
        &gt;
      </span>
      <form
        onSubmit={handleSubmit}
        style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}
      >
        <input
          ref={inputRef}
          className="command-line__input"
          placeholder="/ask <question>, /help, /reset, /save-rule, /event 1|2, /mode demo|live"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onFocus={() => setShowHelp(true)}
          onBlur={() => window.setTimeout(() => setShowHelp(false), 150)}
          aria-label="Command line"
        />
      </form>
      {inlineResult && (
        <span
          className={`command-line__result command-line__result--${inlineResult.status}`}
          role="status"
        >
          {inlineResult.message}
        </span>
      )}
      {showHelp && !result && <CommandHelp />}
      <span className="command-line__hint" style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
        {mapScenarioState && (
          <span title="Map replay clock">{formatClock(mapScenarioState.clockIso)}</span>
        )}
        <span style={{ color: "var(--color-ink-tertiary)" }}>{sourceStatus}</span>
        <button
          type="button"
          onClick={() => onReset("full")}
          title="Full reset (Ctrl+Shift+R)"
          style={{ fontSize: 11 }}
        >
          reset
        </button>
      </span>
    </footer>
  );
  }
);

interface CommandContext {
  onReset: (mode?: "soft" | "full") => void;
  onSelectAlert: (id: string) => void;
  alerts: AlertView[];
  uiMode: UiMode;
  onToggleUiMode: (next?: UiMode) => void;
}

function runCommand(command: string, ctx: CommandContext): InlineResult {
  const tokens = command.replace(/^\//, "").split(/\s+/);
  const verb = tokens[0]?.toLowerCase();
  switch (verb) {
    case "help":
    case "?":
      return {
        kind: "inline",
        status: "info",
        message:
          "/ask <question> · /reset · /save-rule · /event 1|2 · /map-reset · /mode demo|live · slash key opens prompt"
      };
    case "reset":
      ctx.onReset("full");
      return { kind: "inline", status: "ok", message: "scenario reset (rules cleared)" };
    case "map-reset":
      ctx.onReset("soft");
      return { kind: "inline", status: "ok", message: "map replay reset" };
    case "save-rule": {
      saveRule({
        id: "rr:watchfloor:dark-gap-sar-first:v1",
        title: "Dark gap → request SAR/RF first",
        dsl_text: R001_DSL,
        saved_at: new Date().toISOString(),
        active: true
      });
      return { kind: "inline", status: "ok", message: "R-001 saved to review memory" };
    }
    case "event": {
      const which = tokens[1];
      if (which !== "1" && which !== "2") {
        return { kind: "inline", status: "error", message: "usage: /event 1|2" };
      }
      const alert = ctx.alerts.find((entry) =>
        entry.id.includes(`event-${which}`) || entry.id.includes(`event_${which}`)
      );
      if (!alert) {
        return { kind: "inline", status: "error", message: `no event ${which} alert in scenario` };
      }
      ctx.onSelectAlert(alert.id);
      return { kind: "inline", status: "ok", message: `selected ${alert.id}` };
    }
    case "mode": {
      const arg = tokens[1]?.toLowerCase();
      if (arg && arg !== "demo" && arg !== "live") {
        return { kind: "inline", status: "error", message: "usage: /mode demo|live (no arg toggles)" };
      }
      const target: UiMode | undefined = arg as UiMode | undefined;
      const resolved: UiMode =
        target ?? (ctx.uiMode === "demo" ? "live" : "demo");
      if (target && target === ctx.uiMode) {
        return { kind: "inline", status: "info", message: `already in ${resolved} mode` };
      }
      ctx.onToggleUiMode(resolved);
      return { kind: "inline", status: "ok", message: `ui register: ${resolved}` };
    }
    default:
      return { kind: "inline", status: "error", message: `unknown command: ${verb}` };
  }
}

function AskPanel({
  result,
  onDismiss
}: {
  result: AskResult;
  onDismiss: () => void;
}) {
  return (
    <div className="command-line__ask" role="dialog" aria-label="Ask response">
      <div className="command-line__ask-header">
        <span className="command-line__ask-tag">/ask</span>
        <span className="command-line__ask-question">{result.question}</span>
        <button
          type="button"
          className="command-line__ask-close"
          onClick={onDismiss}
          aria-label="Dismiss answer (Esc)"
          title="Dismiss (Esc)"
        >
          ×
        </button>
      </div>
      {result.status === "pending" && (
        <div className="command-line__ask-body command-line__ask-body--pending">
          asking pi-ai…
        </div>
      )}
      {result.status === "ok" && (
        <div className="command-line__ask-body">
          <div className="command-line__ask-answer">{result.answer}</div>
          {(result.model || result.source) && (
            <div className="command-line__ask-meta">
              {result.source ?? "pi-ai"}
              {result.model ? ` · ${result.model}` : ""}
            </div>
          )}
        </div>
      )}
      {result.status === "error" && (
        <div className="command-line__ask-body command-line__ask-body--error">
          {result.error ?? "Pi-AI request failed"}
        </div>
      )}
    </div>
  );
}

function CommandHelp() {
  return (
    <span className="command-line__help">
      <span>/ask &lt;question&gt;</span>
      <span>/help</span>
      <span>/reset</span>
      <span>/save-rule</span>
      <span>/event 1|2</span>
      <span>/map-reset</span>
      <span>/mode demo|live</span>
    </span>
  );
}

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().replace("T", " ").slice(11, 19) + "Z";
}
