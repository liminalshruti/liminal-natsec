import { useMemo } from "react";

import {
  buildHormuzIntelDrawerModel,
  type HormuzIntelDrawerGroup,
  type HormuzIntelDrawerRow
} from "../lib/hormuzIntel.ts";

export function HormuzIntelDrawer() {
  const model = useMemo(() => buildHormuzIntelDrawerModel(), []);

  return (
    <>
      <div className="subhead">
        Hormuz Intel
        <span style={{ marginLeft: 8, color: "var(--color-ink-tertiary)", textTransform: "none" }}>
          {model.availableRows} available · {model.unavailableRows} unavailable
        </span>
      </div>
      <div className="hormuz-intel" role="region" aria-label="Hormuz intel drawer">
        {model.groups.map((group) => (
          <HormuzIntelGroup key={group.id} group={group} />
        ))}
      </div>
    </>
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
        <div className="empty">no cached rows</div>
      ) : (
        group.rows.map((row) => <HormuzIntelRow key={row.id} row={row} />)
      )}
    </details>
  );
}

function HormuzIntelRow({ row }: { row: HormuzIntelDrawerRow }) {
  return (
    <div className="action-row hormuz-intel__row" data-status={row.status}>
      <div className="action-row__title">
        <span>{row.title}</span>
        <span className={row.status === "available" ? "tag tag--ok" : "tag tag--warn"}>
          {row.status}
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
      <div className="hormuz-intel__policy">{row.policyNote}</div>
      <div className="action-row__sub hormuz-intel__source">
        {row.sourceFile ?? row.sourceDocumentId ?? row.source}
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
