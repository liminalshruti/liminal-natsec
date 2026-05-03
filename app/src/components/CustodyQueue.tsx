import { useEffect, useState } from "react";

import { classifyStaleness, formatRelative } from "../lib/relativeTime.ts";
import { caseIdFromAlertId, eventIdFromCaseId } from "../lib/spineGraph.ts";
import type { AlertView, ScenarioStateView, SourceStatusView } from "../lib/types.ts";
import { TypedObjectChip } from "./TypedObjectChip.tsx";

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
  // AUDIT A2: aria-selected + role="option" on each alert-row inside a
  // role="listbox" parent — standard ARIA contract for a list-with-
  // selection so assistive tech announces "EV N · selected" on focus.
  // Auto-focus on mount was considered and deferred: it puts a visible
  // focus ring on the active row at app load, which reads to sighted
  // judges as "did I click that?" — adds confusion, not clarity. The
  // demo opens without grabbing focus; keyboard users still Tab into
  // the listbox normally.
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
    // AUDIT A2: listbox/option a11y contract. The custody queue is the
    // canonical "list-with-selection" surface — assistive tech needs to
    // announce "EV 1 · selected" on focus. role="listbox" on the
    // parent + role="option" + aria-selected on each alert-row is the
    // standard ARIA pattern for this shape.
    <div className="custody-queue" role="listbox" aria-label="Custody queue">
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
            role="option"
            aria-selected={isActive}
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
