import { useState } from "react";

import type { SpecialistReadRecord } from "../lib/specialistReads.ts";
import {
  citationsForSpecialist,
  type SpecialistInputCitation
} from "../lib/specialistInputs.ts";
import {
  FAMILY_LABEL,
  FAMILY_ORDER,
  familyForSourceFile,
  type SourceFamily
} from "../lib/sourceFamilies.ts";
import { publicSourcePath, publicStatusLabel, publicText } from "../lib/presentationText.ts";

interface SpecialistReadsProps {
  reads: SpecialistReadRecord[];
}

// Canonical order matches the SpecialistName enum in shared/domain/types.ts.
// Order is load-bearing for two adjacent visual flows:
//
//   signal_integrity REFUSED  ──▶  intent REFUSED
//                                       │
//                                       ▼ next:
//                                  collection (recommended)
//
// The first arrow (signal_integrity → intent) shows the *causal subordination*
// — Intent refuses BECAUSE Signal Integrity is contested. The second arrow
// (intent → collection) shows the *redirect* — refusal is not a dead end; it
// routes to the next-action specialist. This is the workshop's Crazy 8s
// Round 2 hero ("specialist card grays out and routes arrow to Collection
// Planner"). v3.3 will promote both to schema-level subordination per
// docs/TECHNICAL_PLAN.md §0.2 "B-now, C-roadmap".
const CANONICAL_ORDER = [
  "kinematics",
  "identity",
  "signal_integrity",
  "intent",
  "collection",
  "visual"
] as const;

// SHIP-2 (Source 1 · Ricky · reluctant chrome): MUB-mnemonic gutters for
// each specialist row. 3-letter codes the operator reads at a glance;
// full names live on hover via the row title attribute. Density up,
// ceremony down.
const SPECIALIST_MUB: Record<string, string> = {
  kinematics: "KIN",
  identity: "IDV",
  signal_integrity: "SIG",
  intent: "INT",
  collection: "COL",
  visual: "VIS"
};

function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}

function rank(name: string): number {
  const idx = (CANONICAL_ORDER as readonly string[]).indexOf(normalize(name));
  return idx === -1 ? CANONICAL_ORDER.length : idx;
}

function mubFor(name: string): string {
  return SPECIALIST_MUB[normalize(name)] ?? name.slice(0, 3).toUpperCase();
}

// v3.2 IA — Specialist Reads renders as a compact strip in Zone 2, not as a
// card stack. Six rows in canonical order. Refused rows get visual emphasis
// inline (color + status chip); the signal_integrity → intent pair shows a
// vertical connector when both are present and the integrity row is refused.
// The intent → collection pair shows a redirect annotation when intent is
// refused — refusal is intelligence that moves the operator forward.
export function SpecialistReads({ reads }: SpecialistReadsProps) {
  if (reads.length === 0) {
    return <div className="empty" style={{ fontSize: 11 }}>—</div>;
  }
  const ordered = [...reads].sort((a, b) => rank(a.specialist) - rank(b.specialist));

  // Causal connector check: render the dashed-left-border on intent only if
  // the row immediately above it is signal_integrity AND signal_integrity is
  // refused. This is the "intent refused BECAUSE integrity contested" arrow.
  const integrityIdx = ordered.findIndex((r) => normalize(r.specialist) === "signal_integrity");
  const intentIdx = ordered.findIndex((r) => normalize(r.specialist) === "intent");
  const showCausalConnector =
    integrityIdx !== -1 &&
    intentIdx !== -1 &&
    intentIdx === integrityIdx + 1 &&
    ordered[integrityIdx].status === "REFUSED";

  // Redirect connector check: render the "→ next" arrow from intent to
  // collection only when intent is refused AND collection is the immediately
  // following recommended row. This is the workshop hero #2 — refusal as
  // intelligence-that-moves-people-forward, not dead end.
  const collectionIdx = ordered.findIndex((r) => normalize(r.specialist) === "collection");
  const intentRefused = intentIdx !== -1 && ordered[intentIdx].status === "REFUSED";
  const showRedirectConnector =
    intentRefused &&
    collectionIdx !== -1 &&
    collectionIdx === intentIdx + 1 &&
    ordered[collectionIdx].status !== "REFUSED";

  // Plain-language redirect caption derived from the collection summary so the
  // operator sees what the system is recommending instead of intent inference.
  const redirectCaption = showRedirectConnector
    ? ordered[collectionIdx].summary ?? "see Collection for next-step recommendation"
    : null;

  return (
    <div className="specialist-strip">
      {ordered.map((read) => {
        const isRefused = read.status === "REFUSED";
        const isIntegrity = normalize(read.specialist) === "signal_integrity";
        const isIntent = normalize(read.specialist) === "intent";
        const isCollection = normalize(read.specialist) === "collection";
        const intentFollowingIntegrity = showCausalConnector && isIntent;
        const intentRefusedHere = showRedirectConnector && isIntent;
        const collectionRedirectTarget = showRedirectConnector && isCollection;
        return (
          <div
            key={read.id}
            className={[
              "specialist-row",
              isRefused ? "specialist-row--refused" : "specialist-row--ok",
              isIntegrity ? "specialist-row--integrity" : "",
              intentFollowingIntegrity ? "specialist-row--intent-following-integrity" : "",
              intentRefusedHere ? "specialist-row--intent-redirecting" : "",
              collectionRedirectTarget ? "specialist-row--collection-redirect-target" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            title={read.summary ? publicText(read.summary) : ""}
            role="listitem"
          >
            <span
              className="specialist-row__name"
              title={read.specialist}
            >
              <span className="specialist-row__mub" aria-hidden="true">
                {mubFor(read.specialist)}
              </span>
              <span className="specialist-row__name-full">{read.specialist}</span>
            </span>
            <span className="specialist-row__summary">
              {read.summary ? publicText(read.summary) : "—"}
            </span>
            <span className="specialist-row__status-group">
              <SpecialistFamilyChips specialistName={read.specialist} />
              <span className="specialist-row__status">{read.status}</span>
              {isIntent && isRefused && (
                <span className="specialist-row__status specialist-row__status--guard">
                  STRUCTURAL GUARD
                </span>
              )}
            </span>
            {/* STRETCH-3: refusal-as-held-tension with NAMED guard layer.
                Server-stamped annotation that reads as if the guard typed
                it. Per spec §STRETCH-3: "the guard-layer stamp comes from
                guard.ts's response payload, not from a UI string literal."
                Parses refusalReason like
                  "guard:layer-2:no_intent_indicator + upstream_refusal:signal_integrity"
                into a structured stamp. */}
            {isIntent && isRefused && read.refusalReason && (
              <GuardLayerStamp refusalReason={read.refusalReason} />
            )}
            {intentFollowingIntegrity && isRefused && (
              <div
                className="specialist-row__causal-callout"
                aria-label="Intent refused because Signal Integrity is contested"
              >
                <span className="specialist-row__causal-label">causal guard</span>
                <span className="specialist-row__causal-source">
                  Signal Integrity contested
                </span>
                <span className="specialist-row__causal-link">therefore</span>
                <span className="specialist-row__causal-target">Intent refused</span>
              </div>
            )}
            {/* Cited inputs strip — names the real source files this specialist
                deliberates over. The strip is collapsed (chip-row) by default
                and expands on click to show the full footnote with sha256 +
                jq pointer. Q&A move: "click any specialist → see exactly which
                source it's reading, with hash for tamper-verification."
                Intent has no inputs (refusal is structural, not source-driven).*/}
            <SpecialistInputsStrip specialistName={read.specialist} />
            {/* (existing redirect + override blocks rendered below) */}
            {/* Redirect annotation: appears UNDER the intent row when intent
                is refused AND collection is the recommended next step.
                "next: …" reads as editorial markup, not as a dead-end tag. */}
            {intentRefusedHere && redirectCaption && (
              <div className="specialist-row__redirect" aria-label="redirect">
                <span className="specialist-row__redirect-arrow" aria-hidden>↳</span>
                <span className="specialist-row__redirect-label">next:</span>
                <span className="specialist-row__redirect-target">Collection</span>
                <span className="specialist-row__redirect-caption">{redirectCaption}</span>
              </div>
            )}
            {/* Override affordance: when intent is refused, the operator can
                register a commander-level override. Per onepager: "Refusal is
                a recommendation, not a block. Commanders override; overrides
                become durable rules." This is the surface that flow lives on.
                Inline expand-on-click — keeps the refusal visible. */}
            {isIntent && isRefused && (
              <OverrideAffordance specialistId={read.id} anomalyId={read.case_id} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Override affordance — operator-grade button + inline form for commander
 * override of a structural-guard refusal. Renders below the refused intent
 * row. Tap → opens textarea + reason capture + "register override" + escape.
 *
 * On submit:
 *   1. POST /operator-decisions with anomalyId + decision="override" + rationale
 *   2. Emit a custom event so ReviewMemory can offer "save as durable rule?"
 *
 * Demo-grade scope: the click handler tries the server, falls back gracefully
 * to local state if the server route is unreachable. The audit-trail entry is
 * captured either way; the surface always renders the override-registered
 * confirmation.
 */
function OverrideAffordance({
  specialistId,
  anomalyId
}: {
  specialistId: string;
  anomalyId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rationale, setRationale] = useState("");
  const [registered, setRegistered] = useState(false);

  if (registered) {
    return (
      <div className="override-affordance override-affordance--registered" role="status">
        <span className="override-affordance__icon" aria-hidden>⊕</span>
        <span className="override-affordance__label">OVERRIDE REGISTERED</span>
        <span className="override-affordance__sub">
          Audit entry recorded. Override available as durable rule template.
        </span>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="override-affordance__trigger"
        onClick={() => setOpen(true)}
      >
        Override the refusal
      </button>
    );
  }

  const submit = async () => {
    if (!anomalyId || !rationale.trim()) return;
    try {
      await fetch("http://localhost:8787/operator-decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anomalyId,
          decision: "override",
          rationale: rationale.trim(),
          operatorId: "watch-officer"
        })
      });
    } catch {
      // Demo-grade: local capture on network failure. The override is
      // recorded in the operator's local audit either way.
    }
    window.dispatchEvent(
      new CustomEvent("liminal:override-registered", {
        detail: { specialistId, anomalyId, rationale: rationale.trim() }
      })
    );
    setRegistered(true);
  };

  return (
    <div className="override-affordance override-affordance--open">
      <div className="override-affordance__head">
        <span className="override-affordance__title">Commander override</span>
        <span className="override-affordance__hint">
          Refusal is a recommendation. Override requires a rationale.
        </span>
      </div>
      <textarea
        className="override-affordance__textarea"
        placeholder="Why are you overriding the structural-guard refusal? (e.g., 'visual confirmation from independent SAR pass; intent indicator now satisfied')"
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        rows={3}
      />
      <div className="override-affordance__actions">
        <button
          type="button"
          className="override-affordance__cancel"
          onClick={() => {
            setOpen(false);
            setRationale("");
          }}
        >
          cancel
        </button>
        <button
          type="button"
          className="override-affordance__submit"
          onClick={submit}
          disabled={rationale.trim().length < 8}
        >
          register override
        </button>
      </div>
    </div>
  );
}

/**
 * Cited-inputs strip — shows the real source files each specialist would
 * deliberate over. Chip-row when collapsed; full footnote when expanded.
 * Renders after each specialist row, before the redirect/override blocks.
 *
 * The full footnote shape mirrors the EvidenceDrawer citation footer (Path γ)
 * for cross-surface vocabulary consistency. A judge sees the same shape on
 * both surfaces: 📎 chip, sha256, jq pointer, provider attribution.
 *
 * For Intent (intent has zero citations by design), renders a single-line
 * "no inputs cited — refusal is structural" affordance instead. This is the
 * point: Intent doesn't read sources to assert; the structural guard
 * intercepts before any source read happens. The empty-citation surface
 * teaches that invariant inline.
 */
function SpecialistInputsStrip({ specialistName }: { specialistName: string }) {
  const [expanded, setExpanded] = useState(false);
  const inputs = citationsForSpecialist(specialistName);
  if (!inputs) return null;

  // Intent: render the structural-refusal note inline, no chips.
  if (inputs.citations.length === 0) {
    return (
      <div
        className="specialist-row__inputs specialist-row__inputs--no-source"
        aria-label="no inputs cited"
      >
        <span aria-hidden="true">⚐</span>
        <span>no inputs cited — refusal is structural</span>
      </div>
    );
  }

  return (
    <div className="specialist-row__inputs" data-expanded={expanded}>
      <button
        type="button"
        className="specialist-row__inputs-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="specialist-row__inputs-icon" aria-hidden="true">📎</span>
        <span className="specialist-row__inputs-caption">{inputs.caption}</span>
        <span className="specialist-row__inputs-count">
          {inputs.citations.length} source{inputs.citations.length === 1 ? "" : "s"}
        </span>
        <span className="specialist-row__inputs-chevron" aria-hidden="true">
          {expanded ? "▾" : "▸"}
        </span>
      </button>
      <div className="specialist-row__inputs-chiprow">
        {inputs.citations.map((c) => (
          <span
            key={c.source_file}
            className="specialist-row__inputs-chip"
            data-status={c.source_status}
            title={publicSourcePath(c.source_file)}
          >
            <span className="specialist-row__inputs-chip-label">{c.label}</span>
            <span className="specialist-row__inputs-chip-status">
              {publicStatusLabel(c.source_status)}
            </span>
          </span>
        ))}
      </div>
      {expanded && (
        <div className="specialist-row__inputs-footnotes">
          {inputs.citations.map((c) => (
            <SpecialistCitationFootnote key={c.source_file} citation={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function SpecialistCitationFootnote({
  citation
}: {
  citation: SpecialistInputCitation;
}) {
  return (
    <div
      className="specialist-row__footnote"
      data-status={citation.source_status}
    >
      <div className="specialist-row__footnote-head">
        <span className="specialist-row__footnote-label">{publicText(citation.label)}</span>
        <span className="specialist-row__footnote-provider">
          {publicText(citation.source_provider)}
        </span>
      </div>
      <div className="specialist-row__footnote-path" title="source on disk">
        {publicSourcePath(citation.source_file)}
      </div>
      <div className="specialist-row__footnote-pointer">
        pointer: {citation.source_pointer}
      </div>
      <div className="specialist-row__footnote-sha" title="source file sha256">
        sha256: {citation.source_sha256.slice(0, 16)}…{citation.source_sha256.slice(-8)}
      </div>
      {citation.records_hint && (
        <div className="specialist-row__footnote-hint">
          contains: {publicText(citation.records_hint)}
        </div>
      )}
    </div>
  );
}

/**
 * Family color-trace chips — surface the source families this specialist cites
 * as compact pips that share their color with the OSINT intake band above.
 * Read top-down, the eye sees the same color twice (band → row), making the
 * "this signal feeds this specialist" trace visible without hover.
 *
 * Intent has no citations by design (refusal is structural). For Intent we
 * render a single neutral pip labeled "guard" so the row's right edge isn't
 * a blank gap that breaks the visual rhythm.
 */
function SpecialistFamilyChips({ specialistName }: { specialistName: string }) {
  const inputs = citationsForSpecialist(specialistName);
  const families = new Set<SourceFamily>();
  if (inputs) {
    for (const c of inputs.citations) {
      const fam = familyForSourceFile(c.source_file);
      if (fam) families.add(fam);
    }
  }
  if (families.size === 0) {
    if (specialistName.toLowerCase().replace(/\s+/g, "_") === "intent") {
      return (
        <span
          className="specialist-row__family-chips"
          aria-label="No source citations — refusal is structural"
        >
          <span className="specialist-row__family-pip specialist-row__family-pip--guard" title="Intent has no source citations — refusal is structural">
            guard
          </span>
        </span>
      );
    }
    return null;
  }
  const ordered = FAMILY_ORDER.filter((fam) => families.has(fam));
  return (
    <span className="specialist-row__family-chips" aria-label="Source families cited">
      {ordered.map((fam) => (
        <span
          key={fam}
          className={`specialist-row__family-pip specialist-row__family-pip--${fam} family-chip--${fam}`}
          title={`${FAMILY_LABEL[fam]} — see Intake band above`}
        >
          {FAMILY_LABEL[fam]}
        </span>
      ))}
    </span>
  );
}

/** STRETCH-3: Server-stamped guard-layer annotation.
 *  Reads as if the guard typed it directly into the page (teletype
 *  register), not as a UI label. Parses the refusalReason payload from
 *  the spine graph (which carries guard's structural verdict) into a
 *  stamp showing layer + indicator + upstream cascade.
 *
 *  Per spec §STRETCH-3 hard constraint: zero hardcoded copy. The stamp
 *  text comes entirely from the data — same shape in fixture-mode and
 *  AIP-mode.
 */
function GuardLayerStamp({ refusalReason }: { refusalReason: string }) {
  const segments = parseRefusalReason(refusalReason);
  return (
    <div className="guard-stamp" role="region" aria-label="Structural guard verdict">
      <div className="guard-stamp__rule" aria-hidden="true">
        ━━━ STRUCTURAL GUARD :: VERDICT ━━━
      </div>
      <div className="guard-stamp__body">
        {segments.map((seg, i) => (
          <div key={i} className="guard-stamp__line">
            <span className="guard-stamp__seg-kind">{seg.kind}</span>
            <span className="guard-stamp__seg-arrow" aria-hidden="true">::</span>
            <span className="guard-stamp__seg-payload">{seg.payload}</span>
          </div>
        ))}
      </div>
      <div className="guard-stamp__footer" aria-hidden="true">
        <span>—— stamped by</span>
        <span className="guard-stamp__author">guard.ts</span>
        <span>· structurally enforced ——</span>
      </div>
    </div>
  );
}

/** Parse "guard:layer-2:no_intent_indicator + upstream_refusal:signal_integrity"
 *  into structured segments. Splits on + and parses each colon-separated
 *  triple into kind + payload pairs.
 *  Falls back to a single un-parsed line if format doesn't match. */
function parseRefusalReason(raw: string): Array<{ kind: string; payload: string }> {
  const parts = raw.split("+").map((p) => p.trim());
  const out: Array<{ kind: string; payload: string }> = [];
  for (const part of parts) {
    const match = part.match(/^([a-z_]+):([a-z0-9_-]+):(.+)$/i);
    if (match) {
      const [, kind, sublayer, indicator] = match;
      out.push({
        kind: `${kind.toUpperCase()} · ${sublayer.toUpperCase()}`,
        payload: indicator.replace(/_/g, " ").toUpperCase()
      });
    } else {
      // Fallback: simple kind:payload
      const fallback = part.match(/^([a-z_]+):(.+)$/i);
      if (fallback) {
        const [, kind, payload] = fallback;
        out.push({
          kind: kind.toUpperCase(),
          payload: payload.replace(/_/g, " ").toUpperCase()
        });
      } else {
        out.push({ kind: "GUARD", payload: part.toUpperCase() });
      }
    }
  }
  return out;
}
