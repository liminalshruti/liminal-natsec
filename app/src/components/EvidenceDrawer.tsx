import { useMemo, useState } from "react";

import {
  evidenceForClaim,
  type EvidenceForClaim,
  type EvidenceLink
} from "../lib/spineGraph.ts";
import { publicSourcePath, publicStatusLabel, publicText } from "../lib/presentationText.ts";
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

interface Citation {
  label: string;
  source_file: string;
  source_sha256: string | null;
  source_pointer?: string;
  source_status: "real" | "fixture-shape" | "synthetic";
  source_provider: string;
  rationale?: string;
  asset_file?: string;
  asset_sha256?: string;
  asset_kind?: string;
  asset_bytes?: number;
}

/** SHIP-3: epistemic-state contract.
 *  Per docs/design/INSPO_TO_SURFACE_MAP.md SHIP-3 (Source 5 · Aluan Wang ·
 *  "draw with ink that's always wet"). Three states the typography carries:
 *
 *    wet     → mutable, custody-held, contested. The ink hasn't dried.
 *              Status: WEAKENS or CONTRADICTS (the case is still being held).
 *    drying  → specialist consensus forming, confidence in flux.
 *              Status: SUPPORTS but confidence < 0.85 (in-flight commit).
 *    dry     → committed, locked into archival custody.
 *              Status: SUPPORTS and confidence >= 0.85 (verdict reached).
 *
 *  HARD CONSTRAINT (per spec §judge-cannot-distinguish-modes): this
 *  derivation reads only from the evidence-link shape that's identical
 *  across fixture-mode and AIP-mode. Source-data agnostic. */
type EpistemicState = "wet" | "drying" | "dry";

function epistemicStateFor(kind: EvidenceKind, confidence: number | undefined): EpistemicState {
  if (kind === "weakens" || kind === "contradicts") return "wet";
  // supports
  if (confidence != null && confidence >= 0.85) return "dry";
  return "drying";
}

function EvidenceCard({ link, kind }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const data = (link.node.data ?? {}) as Record<string, unknown>;
  const summary = publicOptionalText(
    stringField(data, "summary") ?? stringField(data, "rationale")
  );
  const source = publicOptionalText(stringField(data, "source") ?? stringField(data, "specialist"));
  const confidence = link.edge.provenance?.confidence;
  const citation = data.citation as Citation | undefined;
  const citationSecondary = data.citation_secondary as Citation | undefined;
  const epistemicState = epistemicStateFor(kind, confidence);
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
      data-epistemic={epistemicState}
    >
      <div className="evidence-card__head">
        <TypedObjectChip
          kind="evidence"
          id={link.node.id}
          label={publicText(link.node.title)}
          size="sm"
        />
        <span
          className={`evidence-card__epistemic evidence-card__epistemic--${epistemicState}`}
          title={
            epistemicState === "wet"
              ? "Wet · custody-held, contested. The ink hasn't dried."
              : epistemicState === "drying"
              ? "Drying · specialist consensus forming. Confidence in flux."
              : "Dry · committed to archival custody. Verdict reached."
          }
        >
          <span className="evidence-card__epistemic-glyph" aria-hidden="true">
            {epistemicState === "wet" ? "○" : epistemicState === "drying" ? "◐" : "●"}
          </span>
          <span className="evidence-card__epistemic-label">{epistemicState}</span>
        </span>
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
      {citation && (
        <div className="evidence-card__citation" data-status={citation.source_status}>
          <span className="evidence-card__citation-icon" aria-hidden="true">📎</span>
          <span className="evidence-card__citation-label">{publicText(citation.label)}</span>
          <span className="evidence-card__citation-status">
            {publicStatusLabel(citation.source_status)}
          </span>
        </div>
      )}
      {expanded && (
        <div className="evidence-card__expanded">
          {/* Drill trail — teaches the structure of where the operator just
              landed. Reads as "from case → through evidence → into the cited
              source on disk." Same spine as a Palantir Workshop breadcrumb.
              Renders only when expanded so the chip itself stays clean. */}
          <div className="evidence-card__drill-trail" aria-label="drill path">
            <span>case</span>
            <span className="evidence-card__drill-trail-sep" aria-hidden="true">›</span>
            <span>evidence</span>
            {citation && (
              <>
                <span className="evidence-card__drill-trail-sep" aria-hidden="true">›</span>
                <span className="evidence-card__drill-trail-leaf">
                  {publicText(citation.source_provider)}
                </span>
              </>
            )}
          </div>
          {(summary || link.edge.provenance?.rationale) && (
            <div className="evidence-card__rationale">
              {summary ?? publicText(link.edge.provenance?.rationale ?? "")}
            </div>
          )}
          {citation && <CitationFootnote citation={citation} primary />}
          {citationSecondary && <CitationFootnote citation={citationSecondary} />}
        </div>
      )}
    </div>
  );
}

function CitationFootnote({ citation, primary }: { citation: Citation; primary?: boolean }) {
  return (
    <div
      className={`evidence-card__footnote${primary ? " evidence-card__footnote--primary" : ""}`}
      data-status={citation.source_status}
    >
      <div className="evidence-card__footnote-head">
        <span className="evidence-card__footnote-label">{publicText(citation.label)}</span>
        <span className="evidence-card__footnote-provider">
          {publicText(citation.source_provider)}
        </span>
      </div>
      <div className="evidence-card__footnote-path" title="source on disk">
        {publicSourcePath(citation.source_file)}
      </div>
      {citation.source_pointer && (
        <div className="evidence-card__footnote-pointer">pointer: {citation.source_pointer}</div>
      )}
      {citation.source_sha256 && (
        <div className="evidence-card__footnote-sha" title="source file sha256">
          sha256: {citation.source_sha256.slice(0, 16)}…{citation.source_sha256.slice(-8)}
        </div>
      )}
      {citation.asset_file && (
        <div className="evidence-card__footnote-asset" title="source asset on disk">
          asset: {publicSourcePath(citation.asset_file)}
          {citation.asset_bytes != null && ` · ${(citation.asset_bytes / 1024).toFixed(1)} KB`}
          {citation.asset_kind && ` · ${citation.asset_kind}`}
        </div>
      )}
      {citation.rationale && (
        <div className="evidence-card__footnote-rationale">
          {publicText(citation.rationale)}
        </div>
      )}
    </div>
  );
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function publicOptionalText(value: string | null): string | null {
  return value ? publicText(value) : null;
}
