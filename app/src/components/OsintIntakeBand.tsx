// OsintIntakeBand — pinned input layer above the Specialist Reads strip.
//
// Surfaces the OSINT signal layer that feeds the AI analysis below. Six
// source-family chips (Satellite, AIS, Sanctions, Warnings, OSINT, Infra) with
// counts that "arrive" as the replay clock advances through phases. The same
// family colors reappear on the Specialist Reads rows below, so the operator's
// eye traces Signals → Analysis → Verdict without hover.
//
// Counts are phase-keyed (not per-tick) because the fixture pack's
// observed_at values span 2012→2026 and the replay window is a single
// April 2026 morning — gating on wall-clock would either reveal everything
// instantly or never. Phase-keyed reveal preserves the "signals coming in"
// rhythm during the 3-min demo without inventing fake timestamps.
//
// Click the [▾ all] toggle to expand the per-source roster (the same
// information DataSourcesChips renders as a watchfloor overlay) for the Q&A
// "where do these come from?" question.

import { useEffect, useMemo, useRef, useState } from "react";

import intakeItems from "../../../fixtures/maritime/hormuz-evidence-items.json" with { type: "json" };
import {
  FAMILY_LABEL,
  FAMILY_ORDER,
  FAMILY_PHASE_MIN,
  countsForPhase,
  familyForSource,
  type SourceFamily
} from "../lib/sourceFamilies.ts";

interface OsintIntakeBandProps {
  /** Current replay phase (1..6). Defaults to 1 when scenario state is not yet ready. */
  phase: number;
}

interface IntakeRecord {
  id?: string;
  source?: string;
}

const RECORDS: readonly IntakeRecord[] = intakeItems;

const TOTAL_AVAILABLE = RECORDS.filter((r) => familyForSource(r.source)).length;

export function OsintIntakeBand({ phase }: OsintIntakeBandProps) {
  const counts = useMemo(() => countsForPhase(RECORDS, phase), [phase]);
  const total = useMemo(
    () => FAMILY_ORDER.reduce((sum, fam) => sum + counts[fam], 0),
    [counts]
  );

  // Track which families' counts increased on the most recent phase change so
  // we can pulse only the changed chips. Skipping the pulse on the first
  // render avoids a flash-of-everything on case-open.
  const previousCounts = useRef<Record<SourceFamily, number> | null>(null);
  const [pulseTick, setPulseTick] = useState(0);
  const [pulsing, setPulsing] = useState<Set<SourceFamily>>(() => new Set());

  useEffect(() => {
    const prev = previousCounts.current;
    previousCounts.current = counts;
    if (!prev) return; // first render — no pulse
    const changed = new Set<SourceFamily>();
    for (const fam of FAMILY_ORDER) {
      if (counts[fam] > prev[fam]) changed.add(fam);
    }
    if (changed.size === 0) return;
    setPulsing(changed);
    setPulseTick((n) => n + 1);
    const timer = window.setTimeout(() => setPulsing(new Set()), 700);
    return () => window.clearTimeout(timer);
  }, [counts]);

  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="osint-intake"
      role="region"
      aria-label="OSINT intake — signals feeding the analysis"
    >
      <div className="osint-intake__head">
        <span className="osint-intake__label">INTAKE</span>
        <span className="osint-intake__sub">signals feeding analysis</span>
        <span className="osint-intake__total" aria-live="polite">
          <span className="osint-intake__total-num">{total}</span>
          <span className="osint-intake__total-of">/ {TOTAL_AVAILABLE}</span>
        </span>
      </div>
      <div className="osint-intake__chips" role="list">
        {FAMILY_ORDER.map((fam) => {
          const isArrived = FAMILY_PHASE_MIN[fam] <= phase;
          const count = counts[fam];
          const isPulsing = pulsing.has(fam);
          return (
            <span
              key={fam}
              role="listitem"
              className={[
                "family-chip",
                `family-chip--${fam}`,
                isArrived ? "family-chip--arrived" : "family-chip--pending",
                isPulsing ? "family-chip--pulse" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              data-pulse-key={isPulsing ? pulseTick : undefined}
              title={
                isArrived
                  ? `${FAMILY_LABEL[fam]} · ${count} signals on the watchfloor`
                  : `${FAMILY_LABEL[fam]} · arrives at P${FAMILY_PHASE_MIN[fam]}`
              }
            >
              <span className="family-chip__pip" aria-hidden />
              <span className="family-chip__label">{FAMILY_LABEL[fam]}</span>
              <span className="family-chip__count">{isArrived ? count : "—"}</span>
            </span>
          );
        })}
      </div>
      <button
        type="button"
        className="osint-intake__expand"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span aria-hidden>{expanded ? "▾" : "▸"}</span>
        <span>{expanded ? "hide source roster" : "all sources"}</span>
      </button>
      {expanded && <SourceRoster phase={phase} />}
      <div className="osint-intake__feeds-divider" aria-hidden>
        <span className="osint-intake__feeds-line" />
        <span className="osint-intake__feeds-label">▼ feeds</span>
        <span className="osint-intake__feeds-line" />
      </div>
    </div>
  );
}

function SourceRoster({ phase }: { phase: number }) {
  // Per-source count grouped under each family. Keeps the band itself terse
  // (just six chips) while still letting a curious judge drill down once.
  const bySource = useMemo(() => {
    const map = new Map<string, { family: SourceFamily; count: number }>();
    for (const record of RECORDS) {
      const family = familyForSource(record.source);
      if (!family) continue;
      if (FAMILY_PHASE_MIN[family] > phase) continue;
      const key = record.source ?? "UNKNOWN";
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { family, count: 1 });
      }
    }
    return map;
  }, [phase]);

  const grouped: Record<SourceFamily, Array<{ source: string; count: number }>> = {
    satellite: [],
    ais: [],
    sanctions: [],
    warnings: [],
    osint: [],
    infra: []
  };
  for (const [source, info] of bySource) {
    grouped[info.family].push({ source, count: info.count });
  }
  for (const fam of FAMILY_ORDER) {
    grouped[fam].sort((a, b) => b.count - a.count);
  }

  return (
    <div className="osint-intake__roster" role="list">
      {FAMILY_ORDER.map((fam) => {
        const sources = grouped[fam];
        if (sources.length === 0) return null;
        return (
          <div key={fam} className={`osint-intake__roster-family family-chip--${fam}`} role="listitem">
            <span className="osint-intake__roster-family-label">{FAMILY_LABEL[fam]}</span>
            <span className="osint-intake__roster-list">
              {sources.map((s) => (
                <span key={s.source} className="osint-intake__roster-source">
                  {prettySourceName(s.source)} <span className="osint-intake__roster-count">{s.count}</span>
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function prettySourceName(source: string): string {
  const lower = source.toLowerCase().replace(/_/g, " ");
  if (source === "GLOBAL_FISHING_WATCH") return "GFW";
  if (source === "OPENSANCTIONS") return "OpenSanctions";
  if (source === "NAVAREA_IX") return "NAVAREA IX";
  if (source === "COPERNICUS_CDSE_STAC") return "Copernicus STAC";
  if (source === "SENTINEL_HUB_PROCESS") return "Sentinel Hub";
  if (source === "COPERNICUS_MARINE") return "Copernicus Marine";
  return lower.replace(/\b\w/g, (c) => c.toUpperCase());
}
