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
  CENSYS: "Censys",
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

export function DataSourcesChips() {
  const sources = useMemo(() => readSources(manifest as SourceManifest), []);
  const [expanded, setExpanded] = useState(false);

  if (sources.length === 0) return null;

  const okCount = sources.filter((s) => s.ok).length;
  const totalCount = sources.length;

  return (
    <div
      className={`data-sources-chips${expanded ? " data-sources-chips--expanded" : ""}`}
      role="region"
      aria-label="Live data sources"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="data-sources-chips__header">
        <span className="data-sources-chips__label">DATA SOURCES</span>
        <span className="data-sources-chips__count">
          {okCount}/{totalCount}
        </span>
      </div>
      <div className="data-sources-chips__list">
        {sources.map((s) => (
          <span
            key={s.key}
            className={`data-source-chip${s.ok ? " data-source-chip--ok" : " data-source-chip--down"}`}
            title={`${s.key} · ${s.ok ? "available" : "unavailable"}`}
          >
            <span className="data-source-chip__pip" aria-hidden />
            <span className="data-source-chip__label">{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
