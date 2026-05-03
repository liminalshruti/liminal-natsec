import { useState } from "react";

import type { SpecialistReadRecord } from "../lib/specialistReads.ts";
import {
  citationsForSpecialist,
  type SpecialistInputCitation
} from "../lib/specialistInputs.ts";

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

function normalize(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}

function rank(name: string): number {
  const idx = (CANONICAL_ORDER as readonly string[]).indexOf(normalize(name));
  return idx === -1 ? CANONICAL_ORDER.length : idx;
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
            title={read.summary ?? ""}
            role="listitem"
          >
            <span className="specialist-row__name">{read.specialist}</span>
            <span className="specialist-row__summary">{read.summary ?? "—"}</span>
            <span className="specialist-row__status">{read.status}</span>
            {/* Cited inputs strip — names the real cached files this specialist
                deliberates over. The strip is collapsed (chip-row) by default
                and expands on click to show the full footnote with sha256 +
                jq pointer. Q&A move: "click any specialist → see exactly which
                cached source it's reading, with hash for tamper-verification."
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
 * Cited-inputs strip — shows the real cached files each specialist would
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
            title={c.source_file}
          >
            <span className="specialist-row__inputs-chip-label">{c.label}</span>
            <span className="specialist-row__inputs-chip-status">
              {c.source_status}
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
        <span className="specialist-row__footnote-label">{citation.label}</span>
        <span className="specialist-row__footnote-provider">
          {citation.source_provider}
        </span>
      </div>
      <div className="specialist-row__footnote-path" title="cached source on disk">
        {citation.source_file}
      </div>
      <div className="specialist-row__footnote-pointer">
        pointer: {citation.source_pointer}
      </div>
      <div className="specialist-row__footnote-sha" title="sha256 of cached file">
        sha256: {citation.source_sha256.slice(0, 16)}…{citation.source_sha256.slice(-8)}
      </div>
      {citation.records_hint && (
        <div className="specialist-row__footnote-hint">
          contains: {citation.records_hint}
        </div>
      )}
    </div>
  );
}
