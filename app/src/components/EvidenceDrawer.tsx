import { useMemo, useState } from "react";

import {
  evidenceForClaim,
  type EvidenceForClaim,
  type EvidenceLink
} from "../lib/spineGraph.ts";

interface EvidenceDrawerProps {
  claimId: string | null;
}

type EvidenceKind = "supports" | "weakens" | "contradicts";

const SECTION_META: Record<EvidenceKind, { label: string; tag: string }> = {
  supports: { label: "Supports", tag: "tag tag--ok" },
  weakens: { label: "Weakens", tag: "tag tag--warn" },
  contradicts: { label: "Contradicts", tag: "tag tag--warn" }
};

export function EvidenceDrawer({ claimId }: EvidenceDrawerProps) {
  const evidence = useMemo<EvidenceForClaim>(() => {
    if (!claimId) return { supports: [], weakens: [], contradicts: [] };
    return evidenceForClaim(claimId);
  }, [claimId]);

  const total =
    evidence.supports.length + evidence.weakens.length + evidence.contradicts.length;

  if (!claimId) {
    return (
      <>
        <div className="subhead">Evidence Drawer</div>
        <div className="empty">no claim selected</div>
      </>
    );
  }

  if (total === 0) {
    return (
      <>
        <div className="subhead">Evidence Drawer</div>
        <div className="empty">no evidence linked to this claim</div>
      </>
    );
  }

  return (
    <>
      <div className="subhead">
        Evidence Drawer
        <span style={{ marginLeft: 8, color: "var(--fg-2)", textTransform: "none" }}>
          {evidence.supports.length}+ · {evidence.weakens.length}− ·{" "}
          {evidence.contradicts.length}✕
        </span>
      </div>
      {(["supports", "weakens", "contradicts"] as EvidenceKind[]).map((kind) =>
        evidence[kind].length === 0 ? null : (
          <EvidenceSection
            key={kind}
            kind={kind}
            entries={evidence[kind]}
            tagClass={SECTION_META[kind].tag}
            label={SECTION_META[kind].label}
          />
        )
      )}
    </>
  );
}

interface EvidenceSectionProps {
  kind: EvidenceKind;
  entries: EvidenceLink[];
  tagClass: string;
  label: string;
}

function EvidenceSection({ kind, entries, tagClass, label }: EvidenceSectionProps) {
  return (
    <>
      <div
        className="action-row__sub"
        style={{
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontSize: 10,
          marginTop: 8,
          color: "var(--fg-2)"
        }}
      >
        {label} ({entries.length})
      </div>
      {entries.map((entry) => (
        <EvidenceCard key={entry.node.id} link={entry} kind={kind} tagClass={tagClass} />
      ))}
    </>
  );
}

interface EvidenceCardProps {
  link: EvidenceLink;
  kind: EvidenceKind;
  tagClass: string;
}

function EvidenceCard({ link, kind, tagClass }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const data = (link.node.data ?? {}) as Record<string, unknown>;
  const summary = stringField(data, "summary") ?? stringField(data, "rationale");
  const source = stringField(data, "source") ?? stringField(data, "specialist");
  const confidence = link.edge.provenance?.confidence;
  return (
    <div
      className="action-row"
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((value) => !value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setExpanded((value) => !value);
        }
      }}
      data-expanded={expanded}
      style={{ cursor: "pointer" }}
    >
      <div className="action-row__title">
        <span>{link.node.title}</span>
        <span className={tagClass}>{kind.toUpperCase()}</span>
      </div>
      <div className="action-row__sub" style={{ wordBreak: "break-all" }}>
        {link.node.id}
        {confidence != null && (
          <span style={{ marginLeft: 8, color: "var(--fg-2)" }}>
            confidence {confidence.toFixed(2)}
          </span>
        )}
        {source && (
          <span style={{ marginLeft: 8, color: "var(--fg-2)" }}>· {source}</span>
        )}
      </div>
      {expanded && (summary || link.edge.provenance?.rationale) && (
        <div
          className="action-row__sub"
          style={{
            marginTop: 6,
            padding: "6px 8px",
            background: "var(--bg-0)",
            border: "1px solid var(--line)",
            borderRadius: 2,
            color: "var(--fg-1)"
          }}
        >
          {summary ?? link.edge.provenance?.rationale}
        </div>
      )}
    </div>
  );
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
