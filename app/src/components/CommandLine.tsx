import { useEffect, useRef, useState, type FormEvent } from "react";

import type { LoadedScenario } from "../lib/fixtures.ts";
import { saveRule } from "../lib/reviewRulesStore.ts";
import { R001_DSL } from "../../../shared/rules/builtin.ts";
import type { AlertView } from "../lib/types.ts";
import type { ScenarioState } from "./MapWatchfloor.tsx";

interface CommandLineProps {
  scenario: LoadedScenario | null;
  mapScenarioState: ScenarioState | undefined;
  onReset: (mode?: "soft" | "full") => void;
  onSelectAlert: (id: string) => void;
  alerts: AlertView[];
}

interface CommandResult {
  status: "ok" | "info" | "error";
  message: string;
}

export function CommandLine({
  scenario,
  mapScenarioState,
  onReset,
  onSelectAlert,
  alerts
}: CommandLineProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
    if (!result) return;
    const handle = window.setTimeout(() => setResult(null), 4000);
    return () => window.clearTimeout(handle);
  }, [result]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const command = input.trim();
    if (!command) return;
    setInput("");
    setResult(runCommand(command, { onReset, onSelectAlert, alerts }));
  }

  const sourceStatus = scenario
    ? scenario.source === "server"
      ? scenario.state.mode === "real"
        ? `real ${scenario.state.caseGenerationStatus?.toLowerCase() ?? "cache"}`
        : `seeded ${scenario.state.seededAt}`
      : scenario.state.mode === "real"
      ? "static real cache"
      : `fallback ${scenario.warning ?? "offline"}`
    : "connecting...";

  return (
    <footer className="command-line" role="contentinfo">
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
          placeholder="/help, /reset, /save-rule, /event 1|2"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onFocus={() => setShowHelp(true)}
          onBlur={() => window.setTimeout(() => setShowHelp(false), 150)}
          aria-label="Command line"
        />
      </form>
      {result && (
        <span
          className={`command-line__result command-line__result--${result.status}`}
          role="status"
        >
          {result.message}
        </span>
      )}
      {showHelp && !result && <CommandHelp />}
      <span className="command-line__hint" style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
        {mapScenarioState && (
          <>
            <span title="Map replay clock">{formatClock(mapScenarioState.clockIso)}</span>
            <span title="Replay state">
              {mapScenarioState.isPlaying ? "▶" : "⏸"}
            </span>
          </>
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

interface CommandContext {
  onReset: (mode?: "soft" | "full") => void;
  onSelectAlert: (id: string) => void;
  alerts: AlertView[];
}

function runCommand(command: string, ctx: CommandContext): CommandResult {
  const tokens = command.replace(/^\//, "").split(/\s+/);
  const verb = tokens[0]?.toLowerCase();
  switch (verb) {
    case "help":
    case "?":
      return {
        status: "info",
        message:
          "/reset · /save-rule · /event 1|2 · /map-reset · slash key opens prompt"
      };
    case "reset":
      ctx.onReset("full");
      return { status: "ok", message: "scenario reset (rules cleared)" };
    case "map-reset":
      ctx.onReset("soft");
      return { status: "ok", message: "map replay reset" };
    case "save-rule": {
      saveRule({
        id: "rr:watchfloor:dark-gap-sar-first:v1",
        title: "Dark gap → request SAR/RF first",
        dsl_text: R001_DSL,
        saved_at: new Date().toISOString(),
        active: true
      });
      return { status: "ok", message: "R-001 saved to review memory" };
    }
    case "event": {
      const which = tokens[1];
      if (which !== "1" && which !== "2") {
        return { status: "error", message: "usage: /event 1|2" };
      }
      const alert = ctx.alerts.find((entry) =>
        entry.id.includes(`event-${which}`) || entry.id.includes(`event_${which}`)
      );
      if (!alert) {
        return { status: "error", message: `no event ${which} alert in scenario` };
      }
      ctx.onSelectAlert(alert.id);
      return { status: "ok", message: `selected ${alert.id}` };
    }
    default:
      return { status: "error", message: `unknown command: ${verb}` };
  }
}

function CommandHelp() {
  return (
    <span className="command-line__help">
      <span>/help</span>
      <span>/reset</span>
      <span>/save-rule</span>
      <span>/event 1|2</span>
      <span>/map-reset</span>
    </span>
  );
}

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().replace("T", " ").slice(11, 19) + "Z";
}
