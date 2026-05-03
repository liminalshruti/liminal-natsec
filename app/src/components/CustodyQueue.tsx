import { caseIdFromAlertId, eventIdFromCaseId } from "../lib/spineGraph.ts";
import type { AlertView } from "../lib/types.ts";
import { TypedObjectChip } from "./TypedObjectChip.tsx";

interface CustodyQueueProps {
  alerts: AlertView[];
  selectedAlertId: string | null;
  onSelectAlert: (id: string) => void;
  loading: boolean;
}

export function CustodyQueue({
  alerts,
  selectedAlertId,
  onSelectAlert,
  loading
}: CustodyQueueProps) {
  if (loading) {
    return <div className="empty">loading signal sources...</div>;
  }
  if (alerts.length === 0) {
    return <div className="empty">no anomalies in this scenario</div>;
  }
  const ranked = [...alerts].sort((a, b) => a.rank - b.rank);
  return (
    <div className="custody-queue">
      {ranked.map((alert) => {
        const caseId = caseIdFromAlertId(alert.id);
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
