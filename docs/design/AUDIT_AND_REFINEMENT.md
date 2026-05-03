# Audit & Refinement Plan · Live App

**Date:** 2026-05-03
**Scope:** Defects observed in the running `app/` at 1440 × 900, demo mode, before any case selected.
**Posture:** Refine the existing design system. Do not introduce a parallel one.
**Companion:** `INSPO_TO_SURFACE_MAP.md` (the inspo synthesis); this doc is the ground-truth audit those moves attach to.

---

## Reading what's already shipped (don't duplicate)

The app already has a real, considered design system. Anchor any refinement to these existing primitives — extending them, not replacing them.

**Type stack** (`app/src/styles.css:34–37`):
- `--font-mono`: Geist Mono · operator surface, default body, IDs
- `--font-sans`: Geist · ambient UI chrome (rare)
- `--font-serif`: Fraunces · case-file headers, exec summary
- `--font-hand`: Liminal Hand → Caveat · DemoPrompt + marginalia

**Semantic color tokens** (`app/src/styles.css:68–82`):
- `--color-decision` `#7aa9ff` · system recommendation
- `--color-contested` `#e0996b` · refusable / weakened / hedge state
- `--color-refused` `#ec7558` · structural refusal · differentiator color
- `--color-resolved` `#6ec3a8` · supported / applied / clean
- `--color-substrate` `#08090c` · warm black, page background
- `--color-frame` `#0d0f14` · panel chrome
- `--color-elevated` `#14171f` · card / hover
- `--color-edge` `#1d2230` · 1px lines
- `--color-edge-strong` `#2a3142` · emphasized borders
- `--color-glass` `rgba(20, 23, 31, 0.62)` · backdrop-blur surfaces
- Ink: `--color-ink-primary/secondary/tertiary/quaternary`

**Layout grid** (`app/src/styles.css:141–167`):
- `app-shell` is a 5-column grid: `var(--substrate-pane-width) 8px minmax(420px, 1fr) 8px var(--working-pane-width)` · `36px 1fr 32px` rows
- Default widths (`AppShell.tsx:284–289`): substrate 240–320, working 380–560 keyed to viewport

**Existing differentiated surfaces (already present, NOT new work):**
- `.specialist-row--refused` + `.specialist-row--integrity` + `.specialist-row--intent-following-integrity` + `.specialist-row--intent-redirecting` · refusal treatment
- `.specialist-row__status--guard` + `.specialist-row__family-pip--guard` + `.data-source-chip__guard` · guard markings
- `.specialist-row__causal-callout` + `.specialist-row__causal-label` + `.zone2--causal` · causal connector ("Intent refused **because** Signal Integrity contested")
- `.workflow-strip__pane--active` · pane-active state
- `data-active-pane` + `data-ui-mode` attributes on `.app-shell` for downstream selectors
- `.tchip--case`, `.tchip--hypothesis` · typed-object chips
- `.zone1__verb` · the primary verb (currently the **only** ≥16px display element on the page)

**Inspo moves that map to refinements of these primitives** (not new components):

| Inspo move | Refines existing surface |
|---|---|
| Reluctant chrome / driven readouts (Source 1) | `MapTelemetryHud.tsx` + `--color-edge` weight + tick brackets |
| Three filter views (Source 2) | `SubstratePanel` filter UI when it exists; V-Next |
| Archival lineage (Source 3) | `CustodyCasePanel`, `ProvenanceTrace`, `EvidenceDrawer`, `ReviewMemory` — apply Fraunces + warmer secondary palette |
| Compounding mesh (Source 4) | `KnowledgeGraphViz.tsx` (already present) — reframe as compounding, not static |
| Wet → drying → dry (Source 5) | EvidenceDrawer / ProvenanceTrace row state styling |
| Filename-as-title (Source 9) | snake_case_ for case IDs and event keys (already partially in use — `case_alara_01`) |
| Broadcast chyron (Source 10) | `.app-topbar` already serves this; refine wordmark wrap |
| Wireframe joinery (Source 11) | Reduce `.panel` solid borders to corner ticks (chrome refinement) |
| Roughness as signal (Source 14) | `ConfidenceBar.tsx` low-coverage state |

---

## Verification log · 2026-05-03 17:15 (post-pull at `74da0bf`)

All 9 ships from `INSPO_TO_SURFACE_MAP.md` are merged and verified live in the running app at `:5173`, viewport 1440×900.

| Ship | PR | Verified surface | Evidence |
|---|---|---|---|
| SHIP-1 | #40 | warm-archival case file + wireframe joinery | `verify-01-P1-cold-open-1440.png` working pane + `verify-03-EV2-rule-applied-1440.png` |
| SHIP-2 | #41 | MUB-mnemonic HUD, specialist gutters | `verify-01` map telemetry corner; `verify-06` HUD with PHASE 6 · 72H RULE MEMORY |
| SHIP-3 | #42 | wet/drying/dry typography on evidence | DOM scan confirms; renders in working pane below fold |
| SHIP-4 | #38 | snake_case_ chips + breadcrumb | breadcrumb `Watchfloor / alara_01_ / event_2_` with trailing underscores |
| SHIP-5 | #39 | persistent broadcast chyron | `LIMINAL CUSTODY · CASE alara_01_ · 5TH FLEET · 0200Z · WATCH-1` at top of every screenshot |
| STRETCH-1 | #43 | substrate-state chyron · plain-English narration | `verify-06`: `substrate :: REVIEWING · 4 nodes wet · 0 specialists drying · rule r-001 applied · second case re-ranked` |
| STRETCH-2 | #46 | phase-keyed activePane | sample loop captured P1→P2→P3 with `activePane: "stage"` per geographic-beat mapping |
| STRETCH-3 | #44 | server-stamped guard verdict | `verify-05b` shows archival-paper stamp: `STRUCTURAL GUARD :: VERDICT · RULE :: R-001 · GUARD · LAYER-2 :: NO INTENT INDICATOR · STAMPED BY GUARD.TS · STRUCTURALLY ENFORCED` |
| STRETCH-6 | #45 | rule-compounding edges (MAKE-OR-BREAK part 2) | `verify-04` shows sage-green arc-edges from rule pivot to 2 RE-RANKED prior cases (`case_alara_01_event_2_`, `case_marad_2026_004_cluster_`) + 2 UNCHANGED |

**Replay engine end-to-end verified.** Hitting play on EV2 advances P1→P2→P3 on a clock, then through the analytical beats with operator interaction. By P6 the make-or-break payoff lands in three parallel encodings: (1) chyron handoff at bottom in plain English, (2) PRIOR REVIEW RULE banner at top of working pane, (3) rule-compounding edges visualization in Review Memory section. A judge missing every other beat will read the chyron and know what just happened.

**No defects observed.** The original audit's Tier-A defects (A0 string concatenation bug, A1 working-pane scroll affordance, A2 selection a11y, A3 EV1-buries-payoff, A4 only-one-display-element) are either resolved by the shipped surfaces or do not reproduce in the live app at `74da0bf`. Tier B/C/D defects remain open as v-next polish; none threaten the demo.

---

## Audit corrections (added after second-pass DOM inspection)

The first pass of this audit overstated several defects. The second pass — which actually clicked through EV1 and EV2, opened the working pane, and inspected `.working__operative` / `.working__forensic` separately — corrects the record. Read these before the defect list.

**Confirmed working as designed:**

- The bounded-scroll architecture (`.working__operative` `max-height: 68%; overflow-y: auto` + `.working__forensic` `flex: 1 1 220px; overflow-y: auto`) is wired correctly at `app/src/styles.css:914–942`. On case selection, the operative pane is 536px (top:80) and forensic is 252px (top:616) at 1440×900. Both surfaces render their content within their own scroll regions.
- **Refusal + causal + guard surfaces all render correctly** when the appropriate case is selected. EV1 shows `refused_count: 3, causal_count: 1, guard_pips: 1` and EV2 shows the **"PRIOR REVIEW RULE CHANGED THIS RECOMMENDATION"** banner with `PRIOR RULE APPLIED` chip on the verb — make-or-break beat #2 ships correctly.
- The recommendation reorder (`Task SAR/RF` becomes `RECOMMENDED`, `Monitor Hormuz traffic` becomes `PRIOR TOP`) renders inline on EV2's bounded actions. Per `integration-state.md:9` "second case recommendation changes from Escalate to Request Collection" — verified shipping.

**Three new defects surfaced in the second pass:**

- **N1 · Header text concatenation bug.** `.panel--working .panel__header` renders as `"Working Panelcase"` (missing space between "Working Panel" and the trailing `case` tchip). Same pattern in `.review-memory__section-header`: `"Watchfloor doctrineno entries"` (missing space). Same pattern in `.action-row__title` for hypothesis rows: `"HYPOTHESISSame IMO, current MMSI..."`. **This is a string-template defect, not a CSS one.** Highest-priority fix because it reads as broken on every screenshot.
- **N2 · No `aria-selected` / `data-selected` on `.alert-row`.** Selection is tracked via `data-active="true"` but neither standard a11y attribute is set. Assistive tech can't discover which case is selected. Fix: add `aria-selected={isActive}` to the alert-row.
- **N3 · EV1 is the default-loaded case, but EV2 carries the demo payoff.** A judge browsing left-to-right sees EV1's clean "RECOMMEND collection · supported · 92%" first; the make-or-break beat (PRIOR RULE APPLIED, contested 76%) lives on EV2. There's no visible signpost telling the operator/judge to click EV2 next, and EV2's row in the substrate pane is visually quieter than EV1 (the 84% open chip is darker than EV1's 92%). Fix options: (a) auto-select EV2 on first load, (b) visually mark EV2 with a "rule fired" pip, (c) add a stage chyron pointing the judge to the next beat.

**Defects from the first pass that are now retracted or downgraded:**

- ~~A1 (working-pane internal scroll)~~ → **DOWNGRADED** to "discoverability of scroll affordance." The scroll architecture exists; what's missing is a fade gradient, sticky section header, or scrollbar visibility hint at the operative/forensic boundary so the eye knows there's more below.
- ~~A2 (no initial focus target)~~ → **CONFIRMED** but selection visual is stronger than I claimed (`data-active="true"` triggers a working visual treatment). What's missing is the initial focus + the a11y attribute (defect N2).
- ~~Defect 13 (second case beat below the fold)~~ → **RETRACTED** — beat ships correctly when EV2 is selected. Replaced by defect N3.
- ~~Defect 14 (refusal moment not in visible viewport)~~ → **PARTIALLY RETRACTED** — refusal renders on EV1 in the operative scroll region. Defect remains: at projector distance, the refused-row treatment may not read clearly enough. To be verified visually before fixing.
- ~~Defect 15 (guard stamp invisible)~~ → **RETRACTED** — `.specialist-row__family-pip--guard` renders correctly.
- ~~Defect 16 (causal connector renders only at specific phase)~~ → **RETRACTED** — `.specialist-row__causal-callout` renders correctly on EV1 case-load.

---

## Audit findings · revised defect list, prioritized by demo-criticality

### Tier A · MAKE-OR-BREAK in jeopardy · ship-today

These five defects directly threaten the demo's load-bearing beats. Fix first.

#### A0 — String-template concatenation bug across three surfaces (NEW · was N1)

- **Observed:** Three different surfaces render literal text concatenated with no separator:
  - `.panel--working .panel__header` → `"Working Panelcase"` (label + tchip)
  - `.review-memory__section-header` → `"Watchfloor doctrineno entries"` (heading + count)
  - `.action-row__title` for hypothesis rows → `"HYPOTHESISSame IMO, current MMSI differs from OFAC"` (kicker + claim)
- **Files:** Likely `WorkingPanel.tsx` header markup, `ReviewMemory.tsx` section header, `HypothesisBoard.tsx` or wherever `.action-row__title` for hypotheses is composed.
- **Fix:** add explicit whitespace or a separator between the kicker and the body. CSS `gap: 6px` on the parent + ensuring child elements are inline-block, OR add a `· ` literal.
- **Why first:** reads as broken on every screenshot. Higher priority than aesthetic refinement because it actively damages credibility — a judge sees `HYPOTHESISSame IMO` and reads the system as low-quality.
- **Verify:** screenshot every case state and search for any kicker+body string with no whitespace boundary.

#### A1 — Working pane scroll affordance not discoverable (DOWNGRADED from "below the fold")

- **Observed (corrected):** the bounded-scroll architecture works — `.working__operative` 536px (operative content) + `.working__forensic` 252px (forensic case file). What's missing is **discoverability** — the operator/judge has no visual cue that scroll exists in either region. ReviewMemory inside the forensic surface is reachable but not signposted. At first glance, the working pane appears to end where the visible viewport ends.
- **Files:** `app/src/styles.css` `.working__operative` (line 914) and `.working__forensic` (line 930).
- **Fix:**
  - Bottom-fade gradient (`linear-gradient(to bottom, transparent, var(--color-frame))`) at the bottom 24px of `.working__operative` when `scroll-bottom > 8px` — encodes "more content below."
  - Visible scrollbar in `.working__forensic` instead of `scrollbar-gutter: stable` only — let the scroll thumb show as a discoverability cue.
  - Sticky h3 section headers inside `.working__forensic` (Review memory · Intake · Bounded actions) so the operator sees the section names while scrolling.
- **Verify:** scroll cue visible in screenshots without animation; sticky headers don't overlap content as they snap.

#### A2 — No initial focus target; selection a11y missing (was N2 + downgraded original A2)

- **Observed:** `document.activeElement === document.body` on load. `.alert-row` carries `data-active="true"` for the visually selected case but **no `aria-selected` attribute** — assistive tech can't surface selection state. Visual selection is acceptable at this zoom level; the gap is keyboard + a11y.
- **Files:** `AppShell.tsx` (focus management around line 164–246), `SubstratePanel.tsx`, the `.alert-row` markup wherever it's authored.
- **Fix:**
  - On mount, focus the active alert-row (initially EV1, or EV2 per defect A4 below).
  - Add `aria-selected={isActive}` and `role="option"` (with parent `role="listbox"`) to `.alert-row`. That's the standard a11y contract for a list-with-selection.
  - Global `:focus-visible { outline: 2px solid var(--color-decision); outline-offset: 2px; }`.
- **Verify:** keyboard `Tab` reaches alert-row first; arrow keys cycle EV1 ↔ EV2; screen-reader announces "EV 1 · selected" on focus.

#### A3 — Default-loaded case (EV1) buries the demo payoff (NEW · was N3)

- **Observed:** EV1 surfaces a clean `RECOMMEND collection · supported · 92%` view. The make-or-break-beat-2 surface (R-001 fired, contested 76%, recommendation reordered to "Task SAR/RF") lives on **EV2**. A judge browsing left-to-right sees EV1 first and may close the demo before clicking EV2.
- **Files:** `App.tsx:18` (`selectedAlertId` initialization), `lib/fixtures.ts` (alert ordering), `SubstratePanel.tsx` (visual emphasis on EV2).
- **Fix (one of):**
  - **Preferred:** auto-select EV2 on first load when `R-001` is in `localStorage` saved-rules (i.e., the rule has fired). When no rule saved, default EV1.
  - **Alternative:** add a "rule fired" pip on EV2's substrate row (small `--color-refused` dot + "R-001 applied" caption) so the eye is pulled there.
  - **Stretch:** when the operator is on EV1, show an inline next-step prompt at the bottom of the working pane: *"Saved rule R-001 changed the next case → open EV2."* — this is the canonical "second case changed" handoff in copy.
- **Verify:** on first load with R-001 saved, EV2 is selected; on first load with no saved rules, EV1 is selected; the prompt text reads naturally.

#### A4 — `.zone1__verb` is the only display-scale element on the page (was A3)

- **Observed:** DOM scan finds **exactly one** element ≥16px that reads as a heading — `RECOMMEND collection` at 18px/600. Every other section header is ≤13px. Visual hierarchy collapses; the operator's eye has no anchor besides the verb.
- **Files:** `app/src/styles.css` panel headers (`.panel__header`), section labels in `WorkingPanel.tsx`, `SubstratePanel.tsx`, `CustodyCasePanel.tsx`.
- **Fix:**
  - Promote pane-header titles to **14px Geist Mono caps + 0.16em letter-spacing** so they read as section headers (currently 11–12px, indistinguishable from labels).
  - Promote the Real OSINT Case header in working pane to **15px Fraunces 500** (serif lift — already documented as the editorial-density register in `styles.css:31`). Currently visually flat.
  - Add a single **20px Fraunces italic** named-operator line in the substrate pane header — that's your judge-anchor sentence ("Watch officer · 5th Fleet · 0200 local"). Currently buried at 13px.
- **Verify:** screenshot shows ≥4 distinct typographic levels.

---

### Tier B · Demo-coherence defects · ship-today if green by 4pm

#### B1 — No DOM heading structure (`<h1>`–`<h6>` count = 0)

- **Observed:** Zero semantic headings on the entire page. Visual hierarchy is faked through CSS classes only. Screen readers and assistive tech see one undifferentiated block.
- **Files:** `AppShell.tsx`, `SubstratePanel.tsx`, `WorkingPanel.tsx`, `CustodyCasePanel.tsx`, `ReviewMemory.tsx`, `SpecialistReads.tsx`.
- **Fix:**
  - `<h1>` (visually hidden) on `.app-shell` — "Liminal Custody Watchfloor"
  - `<h2>` per pane: "Substrate", "Stage", "Working", "Command"
  - `<h3>` per zone in WorkingPanel: "Verdict", "Refusal", "Review memory", "Evidence"
  - Existing `.panel__header` text becomes the visible content of these tags; no visual change.
- **Verify:** `document.querySelectorAll('h1,h2,h3').length >= 8`. Lighthouse a11y headings rule passes.

#### B2 — Map (544px) narrower than working pane (560px) at 1440×900

- **Observed:** Stage column resolves to 544px after grid resolves substrate (320) + 8 + working (560) + 8. Geographic anchor is the third-largest pane. Canon says map dominates; in practice it doesn't.
- **Files:** `app/src/styles.css:152–159` (grid template), `AppShell.tsx:284–289` (`defaultPaneWidths`).
- **Fix:**
  - At ≥1440 viewport, lower `defaultPaneWidths` working from 560 → 480.
  - Bump `PANE_LIMITS.workingMax` from 760 → 640 to prevent operator from inflating it past sensible.
  - At ≥1600, allow stage minmax to grow to `minmax(720px, 1fr)`.
- **Verify:** at 1440×900, `.panel--stage` width ≥ 624px; at 1600, ≥ 720px.

#### B3 — Topbar wordmark wraps to two lines

- **Observed:** "LIMINAL CUSTODY · WATCHFLOOR" wraps because workflow strip (387px) + breadcrumb (594px) + status (~120px) over-budget the 36px-tall row at 1440px viewport.
- **Files:** `AppShell.tsx:173–187` topbar markup, `app/src/styles.css` `.app-topbar__brand`.
- **Fix:**
  - Shorten brand to **`LIMINAL · CUSTODY`** (drop "WATCHFLOOR" — that's already the page title and the substrate-pane label).
  - Apply `.app-topbar__brand { white-space: nowrap; flex: 0 0 auto; }`.
  - Move `WorkflowStrip` numerals inline with the breadcrumb on the same baseline (they're stepper indicators, semantically part of the navigation path).
- **Verify:** brand renders single-line at viewport widths ≥ 1280.

#### B4 — Substrate pane mixes three epistemic registers at one visual weight

- **Observed:** "On the Watchfloor" (2 cases), "AI-Proposed" (1 draft), "OSINT Signals" (308) stack with similar typography and weight. Three different categories — operational cases / AI suggestions / raw substrate — read as one undifferentiated list.
- **Files:** `SubstratePanel.tsx`, `app/src/styles.css` substrate-pane sections.
- **Fix:**
  - Hard horizontal rule + section header between the three: `WATCHFLOOR · 2 OPEN`, `AI · PROPOSED · 1`, `SUBSTRATE · 308`.
  - Subtle background tier shift: cases get `--color-frame`, AI proposals get `--color-elevated` tint with `--color-decision` 2px left bar (since AI is making a decision claim), substrate items revert to `--color-substrate`.
  - Different row chrome per register: cases as solid rows, AI proposals as dashed-border cards (provisional state — connects to wet/drying/dry register from inspo Source 5), substrate signals as dense feed lines.
- **Verify:** at quick glance, the three registers are distinguishable without reading text.

#### B5 — MapTelemetryHud overlaps map labels

- **Observed:** "PHASE 1 WATCH" and "WATCHFLOOR TELEMETRY" labels overlap with AOI box label "OFAC · GFW · Sentinel" in the screenshot.
- **Files:** `MapTelemetryHud.tsx`, `MapWatchfloor.css`.
- **Fix:**
  - Pin telemetry HUD to bottom-right corner with `position: absolute; bottom: var(--s-3); right: var(--s-3); z-index: 5;`
  - Phase badge stays top-left, but with `padding: 4px 8px` and `background: var(--color-glass)` so it reads against any map ground.
  - Add `pointer-events: none` to the HUD; only the underlying map should receive hover/click.
- **Verify:** at every replay phase, no HUD element overlaps another text label.

---

### Tier C · Visual hierarchy refinement · ship-today if A and B green

#### C1 — Pane-internal spacing inconsistent

- **Observed:** Substrate pane uses ~14px padding, working pane ~18–24px, command line ~4px. No consistent scale.
- **Files:** `app/src/styles.css` panel rules.
- **Fix:** introduce `--s-1: 4px` … `--s-6: 32px` scale at `:root` (if not already present); enforce `--s-3` (12px) at all `.panel__body` inner padding, `--s-4` (16px) gaps between sections.

#### C2 — Selected case visual weight too light

- **Observed:** EV1 selected vs EV2 unselected differ by ~1px border. Invisible at projector distance.
- **Files:** `SubstratePanel.tsx`, `app/src/styles.css` selectors for selected substrate row.
- **Fix:**
  - Selected: 3px left bar in `--color-decision`, `background: var(--color-elevated)`, `color: var(--color-ink-primary)`.
  - Unselected: `background: transparent`, `color: var(--color-ink-secondary)`.
- **Verify:** reads at 50% zoom from across the room.

#### C3 — AI-draft toast affordance unclear

- **Observed:** "AI draft · Hormuz Watch Box dark-vessel proposal" pill in the working-pane header has no visible action. Operator/judge sees a label without a path.
- **Files:** `AiNoticeToast.tsx`, `WorkingPanel.tsx` empty state.
- **Fix:**
  - When no case is selected, working pane shows an explicit empty state: title `AI · proposed case` + the proposal summary + a primary button `Open this case`.
  - Toast at top continues to summarize, but the primary affordance lives inside the working pane.
- **Verify:** keyboard `Enter` on the empty-state button selects the AI-proposed case.

#### C4 — Workflow strip and breadcrumb compete for attention

- **Observed:** WorkflowStrip numerals (`01 02 03 04`) and breadcrumb segments (`Watchfloor / alara-01 / Event 1`) both live in the topbar. Two different navigation systems, neither dominant.
- **Files:** `AppShell.tsx:173–187`, `WorkflowStrip.tsx`, `.topbar-crumbs`.
- **Fix:**
  - WorkflowStrip becomes a thin progress bar (4 segments), not a separate text strip. Active step lights up; inactive steps remain visible as dotted rule.
  - Breadcrumb takes the wider chunk of topbar real estate as primary navigation.
- **Verify:** screenshot — one navigation system dominates; the other recedes.

---

### Tier D · A11y + keyboard navigation · should ship before submission

#### D1 — 47 clickable elements, no defined keyboard order

- **Files:** `AppShell.tsx`, all components.
- **Fix:** explicit `tabIndex` ordering, define landmark roles (`role="navigation"`, `role="main"`, `role="complementary"`) on the panes, document keyboard shortcuts in a help overlay (`/help` already exists in CommandLine; surface its contents).

#### D2 — No skip-to-pane affordance

- **Fix:** Cmd+1/2/3/4 hotkeys to focus substrate / stage / working / command. Already documented in CLAUDE.md as "persistent shell"; surface the hotkeys.

#### D3 — Focus rings stripped or invisible

- **Fix:** global `:focus-visible { outline: 2px solid var(--color-decision); outline-offset: 2px; }` rule. Override `outline: none` resets in `app/src/styles.css`.

---

### Tier E · Verified-as-shipped (demo-critical surfaces that already exist correctly)

These were initial concerns from the audit's first pass; DOM inspection confirms they're already wired. Do not re-implement; verify they reach the visible viewport.

- **`.specialist-row--refused`** with `--integrity`, `--intent-following-integrity`, `--intent-redirecting` modifiers · refusal treatment is sophisticated and already exists.
- **`.specialist-row__status--guard`** + **`.specialist-row__family-pip--guard`** + **`.data-source-chip__guard`** · guard stamps are present.
- **`.specialist-row__causal-callout`** + **`.specialist-row__causal-label`** + **`.zone2--causal`** · causal connector ("Intent refused because Signal Integrity contested") is already a structured surface.

**Action:** screenshot screen-04, screen-05 (signal integrity, intent refused) phases at 1440×900 to verify these surfaces sit above-the-fold during their respective beats. If yes, they're done. If no, they fold into Tier A (refactor).

---

## Refinement order for today (REVISED post-second-pass)

Same hour budget; updated priorities reflect the corrected defect picture.

| Window | Tier | Fixes |
|---|---|---|
| now → 11am | **A0** | concatenation bug — fix the three "kicker+body" surfaces (panel header, review-memory section header, hypothesis row title). Highest priority because it reads as broken. |
| 11am → noon | **A1, A2** | scroll affordance (fade gradient + visible scrollbar in forensic + sticky section h3); `aria-selected` on alert-row + initial focus |
| noon → 1pm | **A3, A4** | EV2-default-on-rule-saved + R-001 pip on substrate row; promote section headers (`.panel__header` → 14px caps + Real OSINT Case → Fraunces 15/500 + named-operator → 20px Fraunces italic) |
| 1pm → 2pm | **B1, B2, B3** | semantic h1–h3 structure; grid rebalance (working 480 / stage 720+ at ≥1440); topbar wordmark single-line |
| 2pm → 3pm | **B4, B5** | substrate three-register separation; map HUD pin to bottom-right with glass background |
| 3pm → 4:30pm | **C1, C2, C3, C4** | spacing scale enforcement; selected-state strengthen; AI-draft empty state; workflow-strip → progress bar |
| 4:30pm → 5:30pm | **D1, D2, D3** | tabIndex + landmarks + skip-to-pane; Cmd+1/2/3/4 hotkeys; global focus-visible ring |
| 5:30pm → cutoff | **E** | screenshot every phase + selection state; sweep regressions |

After A0 lands, regenerate `audit-04-working-pane-detail.png` and confirm no concatenated strings remain. That's the single screenshot that should be the most-changed before/after.

## Verification heuristics (apply at each gate)

Three from the inspo synthesis + one from this audit:

1. **AliGrids:** *Do I feel a system behind this in 5 seconds?*
2. **iamai:** *Am I rendering confidence the system doesn't have?*
3. **Canon parity (integration-state §6):** *Does this read off `guard.ts` response, or does it bake in copy?*
4. **Audit-grounded (NEW):** *Can a judge at projector distance, 50% zoom, identify the four panes and the active selection without text?*

## What to NOT do

- Do not introduce new design tokens that compete with `--color-decision/contested/refused/resolved`.
- Do not introduce new font families. Geist Mono, Geist, Fraunces, Liminal Hand are the locked stack.
- Do not write a parallel HTML vision file. Refinements live in `app/src/`.
- Do not touch `guard.ts` or anything in `server/src/specialists/`. Visual refinement only.
- Do not rename selectors that downstream `data-active-pane` / `data-ui-mode` / `--substrate-pane-width` depend on.

## Provenance

- DOM audit: `audit-01-initial-1440.png`, `audit-02-initial-fullpage.png` in this folder.
- Live app: `http://localhost:5173/` (vite dev), `http://localhost:8787/` (server).
- Companion: `INSPO_TO_SURFACE_MAP.md`.
- Canon: `liminal-custody-onepager.md`, `integration-state.md`, `v4-judge-calibrated-demo.md`, `public-repo-notes.md`, `README.md` `#never-cut-invariants`.
