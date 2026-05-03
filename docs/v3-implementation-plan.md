# Liminal Custody — v3 Implementation Plan

**Status:** v3 patch on top of `docs/v2/Liminal Custody_Implementation_Plan_v2.md`. v2 remains the canonical build plan. This document captures *only what changes* in v3, plus the signal-integrity surface that becomes Shayaun's differentiator.

---

## 1. What v3 changes vs v2

| Layer | v2 | v3 |
|---|---|---|
| Track | Implicit (PS1+PS3 hybrid) | **PS1 primary, PS3 narrative, PS4 differentiator** |
| Specialist reads | 4 (Kinematics, Identity, Intent, Collection) | **5 — Signal Integrity inserted between Identity and Intent** |
| Graph schema | 10 node types | **11 — `sourceIntegrityCheck` added** |
| Owner lanes | Shayaun = map/replay; Shruti = graph/case/review-memory | **Same, plus: Signal Integrity fixture + technical Q&A → Shayaun** |
| Pitch | Single-shape | **Round 1 (Maven-invisible) + Round 2 (Maven-augmenting)** |
| Demo spine | 6 beats | 6 beats with Signal Integrity *visibly causing* the Intent refusal |

Stack, file structure, owner lanes, and phase gates from v2 are unchanged.

---

## 2. Schema delta (full TypeScript)

Drop into `graph-spine/schema.ts`:

```ts
export type NodeType =
  | 'observation'
  | 'entity'
  | 'evidence'
  | 'sourceIntegrityCheck'   // v3 addition
  | 'anomaly'
  | 'hypothesis'
  | 'claim'
  | 'track'
  | 'actionOption'
  | 'reviewRule'
  | 'case';

export interface BaseNode {
  id: string;
  type: NodeType;
  created_at: string;
  properties: Record<string, unknown>;
}

export interface SourceIntegrityCheck extends BaseNode {
  type: 'sourceIntegrityCheck';
  properties: {
    source_id: string;                          // e.g., "ais-feed-01"
    status: 'clean' | 'degraded' | 'contested' | 'unknown';
    indicators: string[];                       // human-readable bullets
    confidence?: number;                        // 0–1
    rationale: string;                          // single sentence
    linked_evidence_ids: string[];
    detected_at: string;
  };
}
```

Edge types from v2 are sufficient. `sourceIntegrityCheck` connects via:

- `DERIVED_FROM` → `evidence`, `observation`
- `WEAKENS` / `SUPPORTS` → `claim`, `hypothesis`
- `TRIGGERS` → `actionOption` (used to make refusal causally legible)

---

## 3. Fixture additions

New file: `fixtures/maritime/source-integrity-checks.json`

Seed with **one** record matching the demo scenario:

```json
[
  {
    "id": "sic-001",
    "type": "sourceIntegrityCheck",
    "created_at": "2026-05-02T14:38:00Z",
    "properties": {
      "source_id": "ais-feed-01",
      "status": "contested",
      "indicators": [
        "38-minute transmission gap on MMSI-111",
        "Reappearance under MMSI-222 with metadata mismatch",
        "Single-source confirmation only (no second feed)",
        "Course continuity within plausible spoofing envelope"
      ],
      "confidence": 0.68,
      "rationale": "Signal chain insufficient for escalation without second-source confirmation.",
      "linked_evidence_ids": ["ev-047", "ev-048", "ev-052"],
      "detected_at": "2026-05-02T14:38:00Z"
    }
  }
]
```

Existing fixture file `specialist-reads.json` gets one new entry between Identity and Intent:

```json
{
  "id": "sr-signal-integrity",
  "label": "Signal Integrity",
  "status": "CONTESTED",
  "summary": "Source chain degraded; single-source confirmation only.",
  "linked_node_ids": ["sic-001"],
  "triggers_refusal_for": ["sr-intent"]
}
```

The `triggers_refusal_for` field is what makes the UI causally legible: Intent renders as REFUSED *because* Signal Integrity is CONTESTED.

---

## 4. UI delta

`app/src/components/SpecialistReads.tsx` (already in v2 plan) renders 6 rows instead of 4. v3.2 confirms the canonical order is Kinematics → Identity → **Signal Integrity** → Intent → Collection → Visual.

Row order:

```
Kinematics        OK         Track continuity likely preserved
Identity          OK         Metadata conflict: MMSI-111 → MMSI-222
Signal Integrity  CONTESTED  Source chain degraded; single-source confirmation only
Intent            REFUSED    Insufficient evidence to infer hostile intent
Collection        OK         Recommend EO/SAR imagery + second-source confirmation
```

**Visual treatment:**
- CONTESTED status: amber/orange, distinct from OK and REFUSED
- REFUSED row: red border or stamp; hero treatment per v2 §9.6
- Signal Integrity row: tooltip / expandable showing the 4 indicators
- Below the table: a single line — *"Intent refused because Signal Integrity is contested"* — wired to the `triggers_refusal_for` field

---

## 5. Owner lane updates

### Shayaun — additions to v2 lane

In addition to v2 ownership (`tracks.geojson`, MapLibre, scrubber, dark gap, two-MMSI visual, zone polygon, fly-to, screen recording fallback):

```
+ source-integrity-checks.json (fixture)
+ Signal Integrity demo narrative
+ AIS spoofing / dark gap technical Q&A
+ Real Strait of Hormuz data sourcing (if non-blocking)
+ Digital Defense / PS4 framing in pitch Q&A
```

The Signal Integrity *component* is rendered by Shruti's `SpecialistReads.tsx`. The *data* and the *technical defense in Q&A* are Shayaun's.

### Shruti — additions to v2 lane

```
+ Specialist reads UI delta (6 rows incl. Visual, causal-legibility line from signal_integrity → intent)
+ Round 1 / Round 2 scripts
+ Architecture visual showing pre-command layer
+ Maven-augmenting frame in deck
+ Procurement path slide
+ "What we do not do" slide
```

### Shared / overlap

```
+ Contract for sourceIntegrityCheck node (Shruti owns schema, Shayaun owns fixture realism)
+ Demo timing: when does Signal Integrity row populate vs. Intent refusal fire?
+ Naming consistency: "source chain", "evidence chain", "signal integrity" — pick one and stick
```

---

## 6. Contract questions to resolve in first 30 minutes

These are *not* unblocked yet. Resolve before parallel build.

1. **Naming.** Are we calling it "Signal Integrity" or "Source Integrity"? The fixture says `sourceIntegrityCheck` (node type). The UI says "Signal Integrity" (operator-friendly). Pick one for both, or accept the split (node type internal, label external). **Default: accept the split — `sourceIntegrityCheck` internally, "Signal Integrity" in UI.**
2. **Causal wiring.** Does the Signal Integrity row visually *animate before* the Intent row (sequential) or render simultaneously? **Default: sequential, 400ms apart, with a visible arrow or line connecting them.**
3. **Real AIS.** If Shayaun has a fast Hormuz adapter, do we hot-swap the fixture for a snapshot taken ≤4 hours before pitch? **Default: yes if it works by H8; otherwise stay deterministic.**
4. **Reset behavior.** Does `Ctrl+Shift+R` clear the Signal Integrity status too? **Default: yes, full state reset.**

---

## 7. Build sequence — v3 inserts only

The v2 hour-by-hour holds. v3 inserts these tasks at specific points:

| Hour | Insertion | Owner |
|---|---|---|
| 0–1 | Add `sourceIntegrityCheck` to `graph-spine/schema.ts` | Shruti |
| 1–2 | Write `source-integrity-checks.json` fixture | **Shayaun** |
| 2–3 | Wire fixture into graph load | Shruti |
| 13–15 | Render Signal Integrity row in `SpecialistReads.tsx` | Shruti |
| 15–17 | Wire `triggers_refusal_for` causal line | Shruti |
| 17–19 | Shayaun reviews fixture realism, edits indicators if needed | Shayaun |
| 22–24 | Visual polish: amber CONTESTED treatment, expandable indicators | Shruti |

No new phase gates. v3 fits inside v2's H3 / H8 / H13 / H20 / H25 / H31 structure.

---

## 8. What v3 does *not* require

- No live LLM calls for Signal Integrity. Indicators are pre-written in the fixture.
- No live network feed. Real AIS is opt-in, not blocking.
- No new third-party libraries.
- No backend.
- No Neo4j / Palantir AIP runtime integration. Both remain "use only if provisioned in 30 minutes; otherwise drop."

---

## 9. The make-or-break moment (v3 update)

v2 said: *"A second event card shows a changed recommendation because of a human review rule."*

v3 amends: *"…and the system shows that Intent refused because Signal Integrity was contested — restraint as a security feature."*

If the second-case-changed beat lands and the Signal-Integrity-causes-refusal beat lands, Liminal Custody has two differentiators that no other team will have. If only one lands, ship that one. If neither lands, fall back to v2 Win State C.
