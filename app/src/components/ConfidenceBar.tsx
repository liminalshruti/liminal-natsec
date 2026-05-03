interface ConfidenceBarProps {
  value: number | null;
  variant?: "default" | "primary" | "muted";
  label?: string;
}

// Compact horizontal bar showing a posterior in [0, 1]. The bar is intentionally
// small — the goal is "read at a glance" not "studied chart."
export function ConfidenceBar({
  value,
  variant = "default",
  label
}: ConfidenceBarProps) {
  const safe = clampUnit(value);
  const display = safe == null ? "—" : `${(safe * 100).toFixed(0)}%`;
  return (
    <div className="confidence-bar" data-variant={variant} title={label ?? display}>
      <div className="confidence-bar__track">
        <div
          className="confidence-bar__fill"
          style={{ width: safe == null ? 0 : `${safe * 100}%` }}
        />
      </div>
      <div className="confidence-bar__value">{display}</div>
    </div>
  );
}

function clampUnit(value: number | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
