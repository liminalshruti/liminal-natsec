// TypedObjectChip — Liminal Custody's typed-object visual grammar.
//
// Renders the canonical [TYPE] slug status pattern that gives the surface
// Palantir-Ontology-grade legibility without an actual graph viz. Used wherever
// the panel surfaces a node id: case header, hypothesis board, evidence drawer,
// provenance trace, exec summary, action options.
//
// The chip is the visual atom. Typed grammar at the atom level is what scales
// across domains — see docs/TECHNICAL_PLAN.md §0.2 lexicon.

import type { CSSProperties } from "react";

export type TypedObjectKind =
  | "case"
  | "claim"
  | "hypothesis"
  | "evidence"
  | "anomaly"
  | "observation"
  | "action"
  | "rule"
  | "track"
  | "entity";

export type TypedObjectStatus =
  | "contested"
  | "supported"
  | "refused"
  | "active"
  | "applied"
  | "open"
  | "primary"
  | "alternative"
  | string;

interface TypedObjectChipProps {
  kind: TypedObjectKind;
  /**
   * Full id (e.g. "claim:alara-01:event-1:custody:h1"). Renders as a
   * structured slug — the leading "claim:" prefix is replaced by the [CLAIM]
   * type chip and the rest is shown with " / " separators.
   */
  id?: string;
  /** Optional human-friendly label. If supplied, replaces the slug rendering. */
  label?: string;
  status?: TypedObjectStatus | null;
  /** When supplied, renders a numeric badge (e.g., posterior, confidence). */
  posterior?: number | null;
  size?: "sm" | "md";
  /** Reserved for v3.3 click-to-traverse interaction. */
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

const KIND_CLASS: Record<TypedObjectKind, string> = {
  case: "tchip--case",
  claim: "tchip--claim",
  hypothesis: "tchip--hypothesis",
  evidence: "tchip--evidence",
  anomaly: "tchip--anomaly",
  observation: "tchip--observation",
  action: "tchip--action",
  rule: "tchip--rule",
  track: "tchip--track",
  entity: "tchip--entity"
};

const KIND_LABEL: Record<TypedObjectKind, string> = {
  case: "CASE",
  claim: "CLAIM",
  hypothesis: "HYPOTHESIS",
  evidence: "EVIDENCE",
  anomaly: "ANOMALY",
  observation: "OBSERVATION",
  action: "ACTION",
  rule: "RULE",
  track: "TRACK",
  entity: "ENTITY"
};

function structureSlug(kind: TypedObjectKind, id: string): string {
  const prefix = `${kind}:`;
  const remainder = id.startsWith(prefix) ? id.slice(prefix.length) : id;
  // Render foo:bar:baz as foo / bar / baz to make the structure legible.
  return remainder.split(":").join(" / ");
}

function statusClass(status: TypedObjectStatus | null | undefined): string {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s.includes("refused") || s.includes("contradicted")) return "tchip__status--err";
  if (s.includes("contested") || s.includes("weakened")) return "tchip__status--warn";
  if (s.includes("supported") || s.includes("applied") || s.includes("active")) return "tchip__status--ok";
  return "";
}

export function TypedObjectChip({
  kind,
  id,
  label,
  status,
  posterior,
  size = "md",
  onClick,
  className,
  style
}: TypedObjectChipProps) {
  const slug = label ?? (id ? structureSlug(kind, id) : "");
  return (
    <span
      className={[
        "tchip",
        KIND_CLASS[kind],
        size === "sm" ? "tchip--sm" : "",
        onClick ? "tchip--clickable" : "",
        className ?? ""
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      style={style}
      title={id}
      role={onClick ? "button" : undefined}
    >
      <span className="tchip__type">{KIND_LABEL[kind]}</span>
      {slug && <span className="tchip__slug">{slug}</span>}
      {status && (
        <span className={`tchip__status ${statusClass(status)}`}>{status}</span>
      )}
      {typeof posterior === "number" && (
        <span className="tchip__posterior">{Math.round(posterior * 100)}%</span>
      )}
      {/* Drill chevron — visual signal that this chip drills down to a deeper
          surface (the case panel, the citation footer, the cited document).
          Rendered only when onClick is wired so static chips stay quiet. The
          register matches the substrate panel's "drill-affordance" workshop
          principle: clickable surfaces must SAY they're clickable. */}
      {onClick && <span className="tchip__drill" aria-hidden="true">›</span>}
    </span>
  );
}

/**
 * Inline edge label — the typed-edge visual grammar for provenance traces.
 * Renders as ←[EDGE_TYPE]── target. Matches Palantir's typed-link rendering
 * but in plain CSS, no graph viz dependency.
 */
export function TypedEdge({
  type,
  arrow = "left"
}: {
  type: "SUPPORTS" | "WEAKENS" | "CONTRADICTS" | "TRIGGERS" | "DERIVED_FROM" | "OBSERVED_AS" | "RECOMMENDS" | "REVIEWED_BY" | "APPLIES_TO" | string;
  arrow?: "left" | "right" | "none";
}) {
  const tone = (() => {
    const t = type.toUpperCase();
    if (t === "SUPPORTS" || t === "RECOMMENDS") return "tedge--ok";
    if (t === "CONTRADICTS" || t === "WEAKENS") return "tedge--warn";
    if (t === "REFUSED") return "tedge--err";
    return "";
  })();
  return (
    <span className={`tedge ${tone}`} aria-label={type}>
      {arrow === "left" && <span className="tedge__arrow" aria-hidden>←</span>}
      <span className="tedge__type">{type}</span>
      {arrow === "right" && <span className="tedge__arrow" aria-hidden>→</span>}
    </span>
  );
}
