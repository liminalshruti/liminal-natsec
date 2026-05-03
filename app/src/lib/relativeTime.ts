/**
 * Relative-time helpers shared across the watchfloor pane (custody queue,
 * OSINT signal feed). Operators glancing at the substrate want a single-read
 * answer to "is this fresh or stale" — these helpers normalize that across
 * every list surface so the pane reads as one thing.
 *
 * Reference frame is a "now" timestamp passed by the caller (so the
 * component can tick once for the whole list rather than per-row).
 */

export type Staleness = "fresh" | "settled" | "stale" | "unknown";

/**
 * Render an ISO timestamp as a monotonic-decreasing relative string:
 * "now", "30s", "2m", "1h 04m", "6h", "2d", or fall back to YYYY-MM-DD past
 * 7 days.
 */
export function formatRelative(iso: string | undefined, now: number): string {
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

/**
 * Stale-state classification: fresh (<5min) → settled (5-30min) → stale
 * (>30min). Used by row-level styling to color-code age.
 */
export function classifyStaleness(iso: string | undefined, now: number): Staleness {
  if (!iso) return "unknown";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "unknown";
  const diffMin = Math.floor((now - t) / 60_000);
  if (diffMin < 5) return "fresh";
  if (diffMin < 30) return "settled";
  return "stale";
}
