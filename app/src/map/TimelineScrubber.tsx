import { useCallback, useMemo, useRef, useState } from "react";
import type { TracksFixture } from "./fixtureLoader.ts";
import { phaseTicks, timelineBounds } from "./replay.ts";
import { TIMELINE_LABEL } from "./tokens.ts";

// Pure controlled component. The owning MapWatchfloor drives the playback
// clock; this scrubber only renders the playhead at clockIso and emits
// onScrub when the user drags. No internal rAF — eliminates the dual-state
// drift that hid map phase advancement under earlier versions.

export interface TimelineScrubberProps {
  fixture: TracksFixture;
  clockIso: string;
  isPlaying: boolean;
  onScrub: (clockIso: string) => void;
  onPlayPause?: (next: boolean) => void;
}

const TICK_LABEL_MAX_CHARS = 18;

export function TimelineScrubber(props: TimelineScrubberProps) {
  const { fixture, clockIso, isPlaying, onScrub, onPlayPause } = props;
  const bounds = useMemo(() => timelineBounds(fixture), [fixture]);
  const ticks = useMemo(() => phaseTicks(fixture), [fixture]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const currentMs = Date.parse(clockIso);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const rail = trackRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const ms = bounds.startMs + ratio * (bounds.endMs - bounds.startMs);
      onScrub(new Date(ms).toISOString());
    },
    [bounds, onScrub]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      updateFromClientX(e.clientX);
    },
    [updateFromClientX]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      updateFromClientX(e.clientX);
    },
    [isDragging, updateFromClientX]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      setIsDragging(false);
    },
    []
  );

  const playheadPct = clamp01(
    (currentMs - bounds.startMs) / Math.max(1, bounds.endMs - bounds.startMs)
  ) * 100;

  return (
    <div className="map-scrubber">
      <div className="map-scrubber-meta">
        <span className="map-scrubber-label">{TIMELINE_LABEL}</span>
        <span className="map-scrubber-clock">{formatClock(clockIso)}</span>
        {onPlayPause && (
          <button
            type="button"
            className="map-scrubber-play"
            onClick={() => onPlayPause(!isPlaying)}
            aria-label={isPlaying ? "Pause replay" : "Play replay"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
        )}
      </div>
      <div
        ref={trackRef}
        className="map-scrubber-track"
        role="slider"
        aria-label={TIMELINE_LABEL}
        aria-valuemin={bounds.startMs}
        aria-valuemax={bounds.endMs}
        aria-valuenow={currentMs}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="map-scrubber-rail" />
        {ticks.map((tick) => {
          const tickPct = clamp01(
            (Date.parse(tick.iso) - bounds.startMs) /
              Math.max(1, bounds.endMs - bounds.startMs)
          ) * 100;
          return (
            <div
              key={tick.phase}
              className="map-scrubber-tick"
              style={{ left: `${tickPct}%` }}
              data-phase={tick.phase}
              title={`${tick.label} · ${formatClock(tick.iso)}`}
            >
              <div className="map-scrubber-tick-mark" />
              <div className="map-scrubber-tick-label">
                {truncate(tick.label, TICK_LABEL_MAX_CHARS)}
              </div>
            </div>
          );
        })}
        <div
          className="map-scrubber-playhead"
          style={{ left: `${playheadPct}%` }}
        />
      </div>
    </div>
  );
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getUTCFullYear();
  const mm = pad2(d.getUTCMonth() + 1);
  const dd = pad2(d.getUTCDate());
  const HH = pad2(d.getUTCHours());
  const MM = pad2(d.getUTCMinutes());
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}Z`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

export default TimelineScrubber;
