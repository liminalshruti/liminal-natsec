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
        return (
          <div
            key={alert.id}
            className="alert-row alert-row--typed"
            data-active={isActive}
            data-event={eventId ?? undefined}
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
