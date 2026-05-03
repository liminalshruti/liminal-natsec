// DataSourcesChips — small overlay chip cluster on the stage that surfaces
// which live-cache data sources are contributing to the current scenario.
//
// This is the visible representation of Shayaun's live-cache work. Without
// this, judges see a map with vessel tracks and assume it's a single AIS
// feed. With this, they see fourteen named sources (AIS, OSINT, RF,
// satellite imagery, sanctions, port-state, NAVAREA, etc.) all converging
// on the operative case — which IS the multi-modal evidence custody story.
//
// Reads from fixtures/maritime/live-cache/manifest.json which Shayaun's
// cache-hormuz-sources.mjs script populates. Each result has a source name
// and an ok flag; we render a chip per source with status pip.
//
// Positioned absolute on the stage's bottom-left corner, low opacity at
// rest, full opacity on hover. Doesn't interfere with map interaction.

import { useMemo, useState } from "react";

import manifest from "../../../fixtures/maritime/live-cache/manifest.json" with { type: "json" };
import { useDraggable } from "../lib/useDraggable.ts";

interface SourceResult {
  source?: string;
  name?: string;
  key?: string;
  ok?: boolean;
  available?: boolean;
  status?: string | boolean;
}

interface SourceManifest {
  results?: SourceResult[];
  generated_at?: string;
  profile?: string;
}

const SOURCE_LABEL: Record<string, string> = {
  FOUNDRY: "Foundry",
  GLOBAL_FISHING_WATCH: "GFW",
  ACLED: "ACLED",
  EXA: "Exa",
  SHODAN: "Shodan",
  OPENSANCTIONS: "OpenSanctions",
  COPERNICUS_CDSE_AUTH: "Copernicus auth",
  COPERNICUS_CDSE_STAC: "Copernicus STAC",
  SENTINEL_HUB: "Sentinel Hub",
  COPERNICUS_MARINE: "Copernicus Marine",
  AISSTREAM: "AISStream",
  NAVAREA_IX: "NAVAREA IX",
  UKMTO: "UKMTO",
  OVERPASS: "Overpass",
  AISHUB: "AISHub",
  BARENTSWATCH: "BarentsWatch"
};

const CHIP_GROUPS = [
  {
    id: "sentinel-copernicus",
    label: "Sentinel/Copernicus",
    sources: [
      "COPERNICUS_CDSE_AUTH",
      "COPERNICUS_CDSE_STAC",
      "COPERNICUS_MARINE",
      "SENTINEL_HUB"
    ]
  },
  {
    id: "navarea-ukmto",
    label: "NAVAREA/UKMTO",
    sources: ["NAVAREA_IX", "UKMTO"]
  },
  {
    id: "shodan-infra",
    label: "Shodan · infra-only",
    sources: ["SHODAN"],
    infrastructureOnly: true
  }
] as const;

type RawSource = { key: string; label: string; ok: boolean };
type ChipStatus = "ok" | "partial" | "down";
type DisplaySource = {
  key: string;
  label: string;
  ok: boolean;
  status: ChipStatus;
  title: string;
  infrastructureOnly?: boolean;
};

function readSources(manifestData: SourceManifest): Array<{ key: string; label: string; ok: boolean }> {
  const results = manifestData.results ?? [];
  return results
    .map((r) => {
      const key = (r.source ?? r.name ?? r.key ?? "").trim();
      if (!key) return null;
      const okFlag = r.ok ?? r.available ?? (r.status === true || r.status === "ok");
      return {
        key,
        label: SOURCE_LABEL[key] ?? key.toLowerCase().replace(/_/g, " "),
        ok: Boolean(okFlag)
      };
    })
    .filter((x): x is { key: string; label: string; ok: boolean } => x !== null);
}

function displaySources(rawSources: RawSource[]): DisplaySource[] {
  const byKey = new Map(rawSources.map((source) => [source.key, source]));
  const consumed = new Set<string>();
  const grouped = CHIP_GROUPS.flatMap((group) => {
    const groupSources = group.sources
      .map((key) => byKey.get(key))
      .filter((source): source is RawSource => Boolean(source));
    if (groupSources.length === 0) return [];
    for (const source of groupSources) consumed.add(source.key);
    const okCount = groupSources.filter((source) => source.ok).length;
    const status: ChipStatus =
      okCount === groupSources.length ? "ok" : okCount > 0 ? "partial" : "down";
    const sourceNames = groupSources.map((source) => source.label).join(", ");
    const infrastructureOnly = "infrastructureOnly" in group && group.infrastructureOnly;
    return [
      {
        key: group.id,
        label: group.label,
        ok: status === "ok",
        status,
        infrastructureOnly,
        title: infrastructureOnly
          ? `${sourceNames} · infrastructure-only; not vessel behavior evidence`
          : `${sourceNames} · ${okCount}/${groupSources.length} available`
      }
    ];
  });
  const ungrouped = rawSources
    .filter((source) => !consumed.has(source.key))
    .map((source) => ({
      key: source.key,
      label: source.label,
      ok: source.ok,
      status: source.ok ? "ok" as const : "down" as const,
      title: `${source.key} · ${source.ok ? "available" : "unavailable"}`
    }));

  return [...grouped, ...ungrouped];
}

export function DataSourcesChips() {
  const sources = useMemo(() => readSources(manifest as SourceManifest), []);
  const chips = useMemo(() => displaySources(sources), [sources]);
  const [expanded, setExpanded] = useState(false);
  const { style, handleProps } = useDraggable();

  if (sources.length === 0) return null;

  const okCount = sources.filter((s) => s.ok).length;
  const totalCount = sources.length;
  const countState =
    okCount === totalCount ? "ok" : okCount === 0 ? "down" : "partial";

  return (
    <div
      className={`data-sources-chips${expanded ? " data-sources-chips--expanded" : ""}`}
      role="region"
      aria-label="Live data sources"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={style}
    >
      <div className="data-sources-chips__header" {...handleProps}>
        <span className="data-sources-chips__grip" aria-hidden>⋮⋮</span>
        <span className="data-sources-chips__label">DATA SOURCES</span>
        <span className="data-sources-chips__count" data-state={countState}>
          {okCount}/{totalCount}
        </span>
      </div>
      <div className="data-sources-chips__list">
        {chips.map((s) => (
          <span
            key={s.key}
            className={`data-source-chip data-source-chip--${s.status}${
              s.infrastructureOnly ? " data-source-chip--infra-only" : ""
            }`}
            title={s.title}
          >
            <span className="data-source-chip__pip" aria-hidden />
            <span className="data-source-chip__label">{s.label}</span>
            {s.infrastructureOnly && (
              <span className="data-source-chip__guard">not vessel behavior</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
