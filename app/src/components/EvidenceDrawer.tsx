import { useMemo, useState } from "react";

import {
  evidenceForClaim,
  type EvidenceForClaim,
  type EvidenceLink
} from "../lib/spineGraph.ts";
import { TypedEdge, TypedObjectChip } from "./TypedObjectChip.tsx";

interface EvidenceDrawerProps {
  claimId: string | null;
}

type EvidenceKind = "supports" | "weakens" | "contradicts";

// Evidence-kind → schema EdgeType, for the typed-edge label inside each row.
// SUPPORTS gets the ok tone, WEAKENS the warn tone, CONTRADICTS the err tone —
// the same semantic mapping ProvenanceTrace uses, so the eye reads the same
// vocabulary across the case file's two evidence-bearing sections.
const EDGE_TYPE_BY_KIND: Record<EvidenceKind, string> = {
  supports: "SUPPORTS",
  weakens: "WEAKENS",
  contradicts: "CONTRADICTS"
};

const SECTION_LABEL: Record<EvidenceKind, string> = {
  supports: "Supports",
  weakens: "Weakens",
  contradicts: "Contradicts"
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
        <span style={{ marginLeft: 8, color: "var(--color-ink-tertiary)", textTransform: "none" }}>
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
            label={SECTION_LABEL[kind]}
          />
        )
      )}
    </>
  );
}

interface EvidenceSectionProps {
  kind: EvidenceKind;
  entries: EvidenceLink[];
  label: string;
}

function EvidenceSection({ kind, entries, label }: EvidenceSectionProps) {
  return (
    <>
      <div className="evidence-section__header">
        <TypedEdge type={EDGE_TYPE_BY_KIND[kind]} arrow="none" />
        <span className="evidence-section__count">{entries.length}</span>
      </div>
      {entries.map((entry) => (
        <EvidenceCard key={entry.node.id} link={entry} kind={kind} />
      ))}
    </>
  );
}

interface EvidenceCardProps {
  link: EvidenceLink;
  kind: EvidenceKind;
}

function EvidenceCard({ link, kind }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const data = (link.node.data ?? {}) as Record<string, unknown>;
  const summary = stringField(data, "summary") ?? stringField(data, "rationale");
  const source = stringField(data, "source") ?? stringField(data, "specialist");
  const confidence = link.edge.provenance?.confidence;
  return (
    <div
      className="evidence-card"
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
      data-kind={kind}
    >
      <div className="evidence-card__head">
        <TypedObjectChip
          kind="evidence"
          id={link.node.id}
          label={link.node.title}
          size="sm"
        />
      </div>
      {(confidence != null || source) && (
        <div className="evidence-card__meta">
          {confidence != null && (
            <span className="evidence-card__confidence">
              confidence {confidence.toFixed(2)}
            </span>
          )}
          {source && <span className="evidence-card__source">{source}</span>}
        </div>
      )}
      {expanded && (summary || link.edge.provenance?.rationale) && (
        <div className="evidence-card__rationale">
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
