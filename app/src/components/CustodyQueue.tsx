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
      {ranked.map((alert) => (
        <div
          key={alert.id}
          className="alert-row"
          data-active={alert.id === selectedAlertId}
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
            <div className="alert-row__sub">
              {alert.status} · score {alert.severity.toFixed(2)}
            </div>
          </div>
          <div className="alert-row__rank">#{alert.rank}</div>
        </div>
      ))}
    </>
  );
}
