// MapTelemetryHud — observability-grade overlay for the stage.
//
// Workshop register: "telemetry / observability designer." Datadog / Grafana /
// Honeycomb / Vercel surfaces all share a visual language: dark substrate,
// mono labels, live counters, freshness timestamps, status-color borders.
// This HUD ports that register onto the stage's top-right corner — the
// operator sees system state at a glance without leaving the map.
//
// Pins to top-right of the stage's panel__body, doesn't affect map pan/zoom.
// The HUD reads from existing scenario state — no new data wiring needed.

import { useMemo } from "react";

import type { ScenarioState } from "./MapWatchfloor.tsx";
import type { LoadedScenario } from "../lib/fixtures.ts";
import { useDraggable } from "../lib/useDraggable.ts";
import { PHASE_LABELS } from "../map/tokens.ts";

interface MapTelemetryHudProps {
  scenario: LoadedScenario | null;
  scenarioState: ScenarioState | undefined;
}

interface MetricRow {
  label: string;
  value: string;
  /** Tone for status-color border. */
  tone?: "ok" | "warn" | "alert" | "neutral";
  /** Optional secondary label, e.g. "12ms" or "3 specialists". */
  meta?: string;
}

export function MapTelemetryHud({ scenario, scenarioState }: MapTelemetryHudProps) {
  const metrics = useMemo<MetricRow[]>(() => {
    if (!scenario) {
      return [
        { label: "system", value: "booting…", tone: "neutral" }
      ];
    }
    const state = scenario.state;
    const phase = scenarioState?.phase ?? 1;
    const phaseLabel = PHASE_LABELS[phase] ?? "—";
    const alertCount = state.alerts?.length ?? 0;
    const lastRefresh = state.lastRefreshAt ?? state.seededAt;
    const refreshAgo = lastRefresh ? formatAgo(lastRefresh) : "n/a";
    const sourceMode = state.mode === "real" ? "real cache" : "demo fixture";

    // SHIP-2 (reluctant chrome · Source 1 · Ricky): mnemonic stacks tied
    // to the demo's structural beats, not generic system metrics.
    // Labels read as MUB-style 3-letter mnemonics; values are the live
    // measurable property the system is currently reading.
    //
    // Canonical numbers per onepager:
    //   dark gap  = 38 min (not 47)
    //   MMSI sep  = 4.2 nm
    //   specialists = 6 (Kinematics · Identity · Signal Integrity ·
    //                    Intent · Collection · Visual)
    const churnCount = phase >= 3 ? 2 : phase >= 2 ? 1 : 0;
    const darkMinutes = phase >= 5 ? 38 : phase >= 2 ? Math.min(phase * 8, 38) : 0;
    const sigStatus = phase >= 4 ? "contested" : phase >= 2 ? "watching" : "clear";
    const sigTone = phase >= 4 ? "alert" : phase >= 2 ? "warn" : "ok";
    return [
      {
        label: "PHA · BEAT",
        value: `P${phase}`,
        meta: phaseLabel.toUpperCase(),
        tone: phase >= 5 ? "alert" : phase >= 2 ? "warn" : "ok"
      },
      {
        label: "MMSI · CHURN",
        value: churnCount.toString(),
        meta: churnCount > 0 ? "2 IDs · 1 TARGET" : "—",
        tone: churnCount > 0 ? "warn" : "neutral"
      },
      {
        label: "DARK · GAP",
        value: darkMinutes > 0 ? `${darkMinutes}m` : "—",
        meta: darkMinutes >= 38 ? "4.2NM SEP" : darkMinutes > 0 ? "TRACKING" : "QUIET",
        tone: darkMinutes >= 38 ? "alert" : darkMinutes > 0 ? "warn" : "neutral"
      },
      {
        label: "SIG · INT",
        value: sigStatus.toUpperCase(),
        meta: phase >= 4 ? "GUARD L2 · LIVE" : "GUARD READY",
        tone: sigTone
      },
      {
        label: "SPECIALISTS",
        value: "6/6",
        meta: phase >= 5 ? "INTENT · REFUSED" : "ACTIVE",
        tone: phase >= 5 ? "alert" : "ok"
      },
      {
        label: "SOURCE",
        value: sourceMode === "real cache" ? "REAL" : "FIXTURE",
        meta: refreshAgo.toUpperCase(),
        tone: state.mode === "real" ? "ok" : "neutral"
      }
    ];
  }, [scenario, scenarioState?.phase]);

  const { style, handleProps } = useDraggable();

  return (
    <div className="map-telemetry-hud" role="region" aria-label="Map telemetry" style={style}>
      <div className="map-telemetry-hud__header" {...handleProps}>
        <span className="map-telemetry-hud__grip" aria-hidden>⋮⋮</span>
        <span className="map-telemetry-hud__diamond" aria-hidden>◇</span>
        <span className="map-telemetry-hud__title">Watchfloor telemetry</span>
        <span className="map-telemetry-hud__pulse" aria-hidden />
      </div>
      <div className="map-telemetry-hud__metrics">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`map-telemetry-hud__row map-telemetry-hud__row--${metric.tone ?? "neutral"}`}
          >
            <span className="map-telemetry-hud__row-label">{metric.label}</span>
            <span className="map-telemetry-hud__row-value">{metric.value}</span>
            {metric.meta && (
              <span className="map-telemetry-hud__row-meta">{metric.meta}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatAgo(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch {
    return iso.slice(0, 10);
  }
}
