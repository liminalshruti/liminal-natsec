import { useMemo } from "react";

import {
  buildHormuzIntelDrawerModel,
  type HormuzIntelDrawerGroup,
  type HormuzIntelDrawerRow
} from "../lib/hormuzIntel.ts";
import { publicSourcePath } from "../lib/presentationText.ts";

const SOURCE_COVERAGE = [
  { id: "portwatch", label: "PortWatch", sources: ["PORTWATCH"] },
  { id: "gdelt", label: "GDELT", sources: ["GDELT"] },
  { id: "exa", label: "Exa", sources: ["EXA"] },
  { id: "sanctions", label: "Sanctions", sources: ["OPENSANCTIONS", "OFAC"] },
  { id: "gfw", label: "GFW", sources: ["GLOBAL_FISHING_WATCH"] },
  { id: "navarea-ukmto", label: "NAVAREA/UKMTO", sources: ["NAVAREA_IX", "UKMTO"] },
  {
    id: "sentinel-copernicus",
    label: "Sentinel/Copernicus",
    sources: ["SENTINEL_HUB_PROCESS", "COPERNICUS_CDSE_STAC", "COPERNICUS_MARINE"]
  },
  {
    id: "shodan-infra",
    label: "Shodan",
    sources: ["SHODAN"],
    infrastructureOnly: true
  }
] as const;

export function HormuzIntelDrawer() {
  const model = useMemo(() => buildHormuzIntelDrawerModel(), []);
  const coverageRows = useMemo(
    () => model.groups.flatMap((group) => group.rows),
    [model]
  );

  return (
    <>
      <div className="subhead">
        Hormuz Intel
        <span style={{ marginLeft: 8, color: "var(--color-ink-tertiary)", textTransform: "none" }}>
          {model.availableRows} available · {model.unavailableRows} unavailable
        </span>
      </div>
      <SourceCoverageRail rows={coverageRows} />
      <div className="hormuz-intel" role="region" aria-label="Hormuz intel drawer">
        {model.groups.map((group) => (
          <HormuzIntelGroup key={group.id} group={group} />
        ))}
      </div>
    </>
  );
}

function SourceCoverageRail({ rows }: { rows: HormuzIntelDrawerRow[] }) {
  return (
    <div className="hormuz-intel__coverage" aria-label="Required Hormuz source coverage">
      <div className="hormuz-intel__coverage-label">watchfloor source coverage</div>
      <div className="hormuz-intel__coverage-list">
        {SOURCE_COVERAGE.map((source) => {
          const expectedSources = source.sources as readonly string[];
          const sourceRows = rows.filter((row) => expectedSources.includes(row.source));
          const availableSources = new Set<string>(
            sourceRows
              .filter((row) => row.status === "available")
              .map((row) => row.source)
          );
          const availableCount = expectedSources.filter((name) =>
            availableSources.has(name)
          ).length;
          const status =
            availableCount === expectedSources.length
              ? "available"
              : availableCount > 0
                ? "partial"
                : "unavailable";
          const countLabel =
            expectedSources.length > 1
              ? `${availableCount}/${expectedSources.length}`
              : status;
          const infrastructureOnly =
            "infrastructureOnly" in source && source.infrastructureOnly;

          return (
            <span
              key={source.id}
              className="hormuz-intel__coverage-chip"
              data-status={status}
              data-infra-only={infrastructureOnly ? "true" : undefined}
              title={`${source.label}: ${countLabel}`}
            >
              <span className="hormuz-intel__coverage-pip" aria-hidden />
              <span>{source.label}</span>
              <span className="hormuz-intel__coverage-state">{countLabel}</span>
              {infrastructureOnly && (
                <span className="hormuz-intel__coverage-guard">infra-only</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function HormuzIntelGroup({ group }: { group: HormuzIntelDrawerGroup }) {
  return (
    <details className="hormuz-intel__group" open={group.rows.length > 0}>
      <summary className="hormuz-intel__summary">
        <span>{group.label}</span>
        <span className="hormuz-intel__count">
          {group.availableCount}/{group.rows.length}
        </span>
      </summary>
      {group.rows.length === 0 ? (
        <div className="empty">no rows</div>
      ) : (
        group.rows.map((row) => <HormuzIntelRow key={row.id} row={row} />)
      )}
    </details>
  );
}

function HormuzIntelRow({ row }: { row: HormuzIntelDrawerRow }) {
  const isInfrastructureOnly = row.category === "INFRASTRUCTURE_CONTEXT_ONLY";
  return (
    <div className="action-row hormuz-intel__row" data-status={row.status}>
      <div className="action-row__title">
        <span>{row.title}</span>
        <span className="hormuz-intel__title-tags">
          {isInfrastructureOnly && (
            <span className="tag tag--infra">infra only</span>
          )}
          <span className={row.status === "available" ? "tag tag--ok" : "tag tag--warn"}>
            {row.status}
          </span>
        </span>
      </div>
      <div className="action-row__sub">
        {row.provider} · {row.category}
      </div>
      {row.imageSrc && (
        <img
          className="hormuz-intel__chip"
          src={row.imageSrc}
          alt=""
          loading="lazy"
        />
      )}
      <div className="hormuz-intel__text">{row.summary}</div>
      {row.unavailableReason && (
        <div className="hormuz-intel__unavailable">{row.unavailableReason}</div>
      )}
      {isInfrastructureOnly && (
        <div className="hormuz-intel__claim-guard">
          Infrastructure only · not vessel behavior evidence
        </div>
      )}
      <div className="hormuz-intel__policy">{row.policyNote}</div>
      <div className="action-row__sub hormuz-intel__source">
        {row.sourceFile ? publicSourcePath(row.sourceFile) : row.sourceDocumentId ?? row.source}
        {row.confidence != null && (
          <span>
            {" "}
            · confidence {row.confidence.toFixed(2)} · reliability{" "}
            {(row.reliability ?? 0).toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
