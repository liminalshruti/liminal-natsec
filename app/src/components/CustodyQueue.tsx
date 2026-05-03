import { useEffect, useState } from "react";

import { caseIdFromAlertId, eventIdFromCaseId } from "../lib/spineGraph.ts";
import type { AlertView, ScenarioStateView, SourceStatusView } from "../lib/types.ts";
import { TypedObjectChip } from "./TypedObjectChip.tsx";

/**
 * Relative-time formatter for substrate alerts. Operators glancing at the
 * watchfloor want to know "is this case fresh or stale" in one read. The
 * formatter renders monotonic-decreasing relative strings: "now", "30s",
 * "2m", "12m", "1h 04m", "6h ago", "2d". Past 7d falls through to ISO date.
 *
 * Reference frame is the now-tick (updated every 30s) so the strings stay
 * accurate without per-row React state.
 */
function formatRelative(iso: string | undefined, now: number): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const diffSec = Math.max(0, Math.floor((now - t) / 1000));
  if (diffSec < 10) return "now";
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  const remM = diffMin - diffH * 60;
  if (diffH < 24) return remM > 0 ? `${diffH}h ${String(remM).padStart(2, "0")}m` : `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return iso.slice(0, 10);
}

/** Stale-state classification: fresh (<5min) → settled (5-30min) → stale (>30min). */
function classifyStaleness(iso: string | undefined, now: number): "fresh" | "settled" | "stale" | "unknown" {
  if (!iso) return "unknown";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "unknown";
  const diffMin = Math.floor((now - t) / 60_000);
  if (diffMin < 5) return "fresh";
  if (diffMin < 30) return "settled";
  return "stale";
}

interface CustodyQueueProps {
  alerts: AlertView[];
  scenarioState: ScenarioStateView | null;
  selectedAlertId: string | null;
  onSelectAlert: (id: string) => void;
  loading: boolean;
}

export function CustodyQueue({
  alerts,
  scenarioState,
  selectedAlertId,
  onSelectAlert,
  loading
}: CustodyQueueProps) {
  // Tick every 30s so relative-time strings stay accurate without per-row
  // state. Operators care about "fresh / settled / stale" classifications
  // changing over the course of a watch. D2 ambient motion: tick every
  // second so the relative-time counter ("12s" → "13s" → "14s") IS the
  // visible heartbeat. Operator at 0200 sees time itself moving — the
  // surface reads as alive, not paused.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(handle);
  }, []);

  if (loading) {
    return <div className="empty">loading signal sources...</div>;
  }
  if (alerts.length === 0) {
    if (scenarioState?.mode === "real") {
      return (
        <div className="real-empty">
          <div className="real-empty__title">no real custody cases</div>
          <div className="real-empty__body">
            {scenarioState.emptyReason ??
              "The current real-data cache did not produce an operator-review case."}
          </div>
          <SourceStatusRows statuses={scenarioState.sourceStatuses ?? []} />
        </div>
      );
    }
    return <div className="empty">no anomalies in this scenario</div>;
  }
  const ranked = [...alerts].sort((a, b) => a.rank - b.rank);
  return (
    <div className="custody-queue">
      {ranked.map((alert) => {
        const caseId = alert.caseId ?? caseIdFromAlertId(alert.id);
        const eventId = eventIdFromCaseId(caseId);
        const isActive = alert.id === selectedAlertId;
        const relativeAge = formatRelative(alert.detectedAt, now);
        const staleness = classifyStaleness(alert.detectedAt, now);
        return (
          <div
            key={alert.id}
            className="alert-row alert-row--typed"
            data-active={isActive}
            data-event={eventId ?? undefined}
            data-staleness={staleness}
            role="button"
            tabIndex={0}
            onClick={() => onSelectAlert(alert.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectAlert(alert.id);
              }
            }}
          >
            {eventId && (
              <span
                className={`alert-row__event alert-row__event--${eventId}`}
                aria-label={eventId === "event-1" ? "Event 1" : "Event 2"}
              >
                {eventId === "event-1" ? "EV 1" : "EV 2"}
              </span>
            )}
            <div className="alert-row__body">
              <TypedObjectChip
                kind="case"
                id={caseId ?? alert.id}
                label={alert.title}
                status={alert.status?.toLowerCase()}
                posterior={alert.severity}
                size="sm"
              />
              <div className="alert-row__meta">
                <span
                  className={`alert-row__age alert-row__age--${staleness}`}
                  title={`Detected ${alert.detectedAt}`}
                >
                  {relativeAge}
                </span>
                {staleness === "fresh" && (
                  <span className="alert-row__pulse" aria-hidden />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SourceStatusRows({ statuses }: { statuses: SourceStatusView[] }) {
  if (statuses.length === 0) return null;
  return (
    <div className="source-status-list" aria-label="Real data source status">
      {statuses.map((status) => (
        <div
          className="source-status-row"
          data-status={status.status}
          key={`${status.source}:${status.fileName ?? status.detail}`}
        >
          <div className="source-status-row__head">
            <span>{status.source}</span>
            <span>{status.status.replace(/_/g, " ")}</span>
          </div>
          <div className="source-status-row__detail">{status.detail}</div>
        </div>
      ))}
    </div>
  );
}
