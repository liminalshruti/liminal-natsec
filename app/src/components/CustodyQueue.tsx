import { caseIdFromAlertId, eventIdFromCaseId } from "../lib/spineGraph.ts";
import type { AlertView } from "../lib/types.ts";

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
    <>
      {ranked.map((alert) => {
        const caseId = caseIdFromAlertId(alert.id);
        const eventId = eventIdFromCaseId(caseId);
        const isActive = alert.id === selectedAlertId;
        return (
          <div
            key={alert.id}
            className="alert-row"
            data-active={isActive}
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
            <span className="alert-row__pip" />
            <div>
              <div className="alert-row__title">{alert.title}</div>
              <div className="alert-row__sub" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {eventId && (
                  <span
                    className={`tag ${eventId === "event-2" ? "tag--ok" : "tag--accent"}`}
                    style={{ fontSize: 9 }}
                  >
                    {eventId === "event-1" ? "EV 1" : "EV 2"}
                  </span>
                )}
                <span>{alert.status}</span>
                <span style={{ color: "var(--fg-2)" }}>· score {alert.severity.toFixed(2)}</span>
              </div>
            </div>
            <div className="alert-row__rank">#{alert.rank}</div>
          </div>
        );
      })}
    </>
  );
}
