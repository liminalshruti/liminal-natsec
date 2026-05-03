/**
 * WatchfloorOsintFeed — newest-first stream of every OSINT signal cached in
 * `fixtures/maritime/live-cache/`, mounted under the custody queue inside
 * `SubstratePanel`. Closes the watchfloor read: judges and operators see
 * the substrate is loaded, not just a custody queue with five rows.
 *
 * Data flows from the static-import adapter set in `lib/osintSignals.ts`.
 * No fetching, no server roundtrip — module-load snapshot is enough for
 * the demo critical path. Filter chips narrow by category; "load more"
 * paginates so the DOM stays light at first paint.
 */

import { useEffect, useMemo, useState } from "react";

import {
  categoryCounts,
  loadOsintSignals,
  OSINT_CATEGORY_LABELS,
  OSINT_CATEGORY_ORDER,
  type OsintCategory,
  type OsintSignal
} from "../lib/osintSignals.ts";
import { classifyStaleness, formatRelative } from "../lib/relativeTime.ts";

const PAGE_SIZE = 40;

type Filter = OsintCategory | "all";
type SortMode = "newest" | "relevance";

export function WatchfloorOsintFeed() {
  const all = useMemo(() => loadOsintSignals(), []);
  const counts = useMemo(() => categoryCounts(all), [all]);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination when filter or sort changes — otherwise switching
  // from a 200-row list to a 5-row one still shows the "load more" button.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, sortMode]);

  // Tick every second so relative-time strings stay live (shared cadence
  // with the custody queue above).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(handle);
  }, []);

  const filteredRaw = filter === "all" ? all : all.filter((s) => s.category === filter);

  // M-5: high-signal-first sort. The default "newest" path is unchanged
  // (loadOsintSignals already returns newest-first). Relevance sort:
  // signals with a relevance score lift to top, ordered desc; signals
  // without a score keep their newest-first order at the bottom.
  const filtered = useMemo(() => {
    if (sortMode === "newest") return filteredRaw;
    const scored = filteredRaw.filter((s) => typeof s.relevance === "number");
    const unscored = filteredRaw.filter((s) => typeof s.relevance !== "number");
    scored.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
    return [...scored, ...unscored];
  }, [filteredRaw, sortMode]);

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  return (
    <section className="watchfloor-osint-feed" aria-label="Recent OSINT signals">
      <header className="watchfloor-osint-feed__header">
        <span>OSINT signals</span>
        <span className="watchfloor-osint-feed__sort" role="group" aria-label="Sort signals">
          <button
            type="button"
            className="watchfloor-osint-feed__sort-btn"
            data-active={sortMode === "newest"}
            onClick={() => setSortMode("newest")}
            aria-pressed={sortMode === "newest"}
            title="Sort by most recent timestamp"
          >
            newest
          </button>
          <button
            type="button"
            className="watchfloor-osint-feed__sort-btn"
            data-active={sortMode === "relevance"}
            onClick={() => setSortMode("relevance")}
            aria-pressed={sortMode === "relevance"}
            title="Sort by Danti relevance score × |sentiment|"
          >
            high-signal
          </button>
        </span>
        <span className="tag">{filtered.length}</span>
      </header>
      <div className="watchfloor-osint-feed__chips" role="tablist" aria-label="Filter signals by category">
        {OSINT_CATEGORY_ORDER.map((cat) => {
          const count = counts[cat] ?? 0;
          if (cat !== "all" && count === 0) return null;
          const active = filter === cat;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={active}
              className="watchfloor-osint-feed__chip"
              data-active={active}
              onClick={() => setFilter(cat)}
            >
              <span>{OSINT_CATEGORY_LABELS[cat]}</span>
              <span className="watchfloor-osint-feed__chip-count">{count}</span>
            </button>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <div className="empty">no signals in this category</div>
      ) : (
        <ul className="watchfloor-osint-feed__list">
          {visible.map((signal) => (
            <OsintSignalRow key={signal.id} signal={signal} now={now} />
          ))}
        </ul>
      )}
      {remaining > 0 && (
        <button
          type="button"
          className="watchfloor-osint-feed__more"
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
        >
          Load {Math.min(PAGE_SIZE, remaining)} more · {remaining} remaining
        </button>
      )}
    </section>
  );
}

function OsintSignalRow({ signal, now }: { signal: OsintSignal; now: number }) {
  const relative = formatRelative(signal.timestamp, now);
  const staleness = classifyStaleness(signal.timestamp, now);
  const interactive = Boolean(signal.url);
  const Tag = interactive ? "a" : "div";
  const interactiveProps = interactive
    ? { href: signal.url, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <li className="osint-signal-row" data-category={signal.category} data-staleness={staleness}>
      <Tag className="osint-signal-row__inner" {...interactiveProps}>
        <div className="osint-signal-row__head">
          <span className="osint-signal-row__source">{signal.sourceLabel}</span>
          <span
            className={`osint-signal-row__age osint-signal-row__age--${staleness}`}
            title={signal.timestamp ?? "no timestamp"}
          >
            {relative}
          </span>
        </div>
        <div className="osint-signal-row__title">{signal.title}</div>
        {signal.media?.type === "image" && (
          <OsintSignalImage media={signal.media} />
        )}
        {signal.detail && <div className="osint-signal-row__detail">{signal.detail}</div>}
        {signal.badges && signal.badges.length > 0 && (
          <div className="osint-signal-row__badges">
            {signal.badges.slice(0, 4).map((b, i) => (
              <span key={`${b}:${i}`} className="osint-signal-row__badge">{b}</span>
            ))}
          </div>
        )}
      </Tag>
    </li>
  );
}

function OsintSignalImage({ media }: { media: Extract<OsintSignal["media"], { type: "image" }> }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <figure className="osint-signal-row__media">
      <img
        src={media.src}
        alt={media.alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={() => setHidden(true)}
      />
      {media.caption && <figcaption>{media.caption}</figcaption>}
    </figure>
  );
}
