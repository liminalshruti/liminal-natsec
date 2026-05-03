# Inspo → Surface Map · Liminal Custody Pre-Demo Refresh

**Date:** 2026-05-03
**Source manifest:** `_inspo/inspo/2026-04-28/manifest.json`
**Target surface:** `liminal-natsec/export/html/` (7 screens + 30 components)
**Live source:** `liminal-natsec/app/src/`
**Current register:** dark-mode HUD · `#0c1116` · Geist Mono · slate accents

---

## Posts (priority order — sig-5 / highest_signal first)

### 1. `03_rickyretouch_containment-mubs` · sig 5 · highest_signal
- **Register:** scientific-instrument-readout
- **Techniques:** houdini-particle-grid, hud-overlay-typography, live-driven-not-keyframed
- **URL:** https://x.com/rickyretouch/status/2047828891767566538
- **Local:** `_inspo/inspo/2026-04-28/raw/03_rickyretouch_containment-mubs.png` · live: `03_rickyretouch_live.png`
- **Author discussion (full reply thread, captured via Playwright):**
  - SMcL asked: "What's driving the dots on the grid or is it key framed?"
  - Ricky: "Not key framed. Points are being driven along the lines from their current position to a target position. The blinking you see is the wait time before a new position is assigned. **There are other influences like global speed, crowd avoidance, a global chase position, etc.**"
  - The "other influences" are the key. Each point is an agent under shared field forces. The grid isn't a grid; it's a population deforming under simultaneous forces.
- **Mapped move (chrome-level):** **Reluctant chrome, driven readouts.** Every margin label = a measurable property the system is currently reading; alive simulation lives in the center, instrumentation lives in the gutters.
- **Mapped move (architectural):** **Field forces visible through their effects.** You don't render the force; you render what the force does to the population. Liminal Custody's deepest claim is exactly this — MMSI churn, dark gap, signal-integrity contestation are *forces acting on a target's identity*. Refusal isn't a verdict; it's "the forces don't compose."
- **Target surfaces (4):**
  1. **MapTelemetryHud** — corner-anchored stacks of 3–4 mnemonic labels with live values (`MMSI · CHURN · 2`, `SIG · INT · CONTESTED`, `DARK · 47m`). Tick brackets `[ ]` frame the map's edges.
  2. **ConfidenceBar** — render as a driven instrument: tick scale, current needle, prior-position ghost, label cluster `CONF · 0.72 · Δ -0.08`. Meter not progress bar.
  3. **SubstratePanel + SpecialistReads** — 5 specialist rows wear MUB-mnemonic gutters (`SIG`, `INT`, `BHV`, `IDV`, `PRV`); full names on hover. Density up, ceremony down.
  4. **HypothesisBoard / SpecialistReads / EvidenceChain (architectural reframe — APPROVED for pre-demo):** Each row visualizes a *force vector* acting on the target. Confidence is force magnitude. Refusal is "forces don't compose." Causal line copy follows: "Intent refused because force vectors do not converge." Touches: HypothesisBoard, HypothesisSurface, SpecialistReads, ConfidenceBar, EvidenceChain, refusal copy in screen-05-intent-refused.
- **Reject:** the Houdini wireframe-vortex form itself. Importing it would read as decoration. Take the register, leave the form.

### 2. `04_poetengineer_bookmark-topology` · sig 5 · highest_signal · orbit_candidate
- **Register:** self-as-topology
- **Techniques:** topological-data-analysis, mapper-algorithm, embedding-extraction, three-view-projection
- **URL:** https://x.com/poetengineer__/status/2047711260188323997
- **Local:** `_inspo/inspo/2026-04-28/raw/04_poetengineer_bookmark-topology.png` · live: `04_poetengineer_live.png`
- **Author stack (from replies):**
  - Mediapipe in browser (hand tracking)
  - `lucasimi/tda-mapper-python` for the mapper algorithm
  - PCA / density / centroid are **filter functions fed into mapper**, not the topology itself (Q&A defense vs the CosmicEgg.Earth critique that "PCA is not TDA")
- **Discussion · craft signals worth lifting:**
  - **AI知恵袋:** *"Most people wonder what they're interested in. You built a topology of it."* — names the verb: **build a topology of, don't list.**
  - **議論脳:** *"It looks less like a map of the saved information and more like a map of where attention is biased."* — **the map is of the asymmetry, not the data.**
  - **Tao:** the failure mode is "fragmented knowledge gathering dust"; the repair is "structured cognitive map."
  - **Isaac:** "mind palace from Sherlock Holmes" — accessible mental model for non-technical judges.
  - **softyoda:** for a "live" feel, **latency budget < 5ms** is the real constraint (not visual fidelity).
  - **CosmicEgg + Kat exchange:** mapper = topology engine; PCA/density/centroid = filter functions. Architecture defensible to a hostile expert.
- **Mapped move:** **The substrate itself rendered as a mapper-style topology.** Same population, three filter functions, none sufficient alone, all describing the same shape. Refusal = "the topology has a bias zone the forces can't reconcile."
- **Target surfaces (4):**
  1. **SubstratePanel (primary)** — render substrate signals as a node-edge topology. Each signal type (MMSI, behavioral, dark-gap, signal-integrity, identity-churn) is a cluster. Edges = causal/temporal relationships. Operator toggles **filter function** live: Density / PCA / Centroid. Three views, same substrate. Demo-able as a live toggle.
  2. **HypothesisBoard (secondary)** — extends Move 4 from Post 1: forces are now **edges in the substrate topology**; a hypothesis is a path through the graph; refusal is "no path exists that crosses the bias zone without breaking signal integrity."
  3. **EvidenceChain** — re-cast as paths through the substrate. Provenance = sensor-cluster → specialist-filter → claim-node. Outlier evidence appears at the topological periphery, not the bottom of a list.
  4. **Causal-line copy:** *"Density says contested. PCA says outlier. Centroid says anomalous. The forces don't compose."*
- **Pitch language to lift (regardless of UI):**
  - **Round-1/Round-2 line:** *"We don't show you a map of the data. We show you a map of where attention is biased in the substrate."* (Defensible against Maven framing.)
  - **Accessible frame for non-technical judges:** "a mind palace for the case file."
- **Reject:** hand-gesture interaction (Mediapipe — demo-fragile); 3D rotation (static topology with filter-toggle reads better in 30s).
- **Orbit note:** Kat (`@poetengineer__`) flagged orbit_candidate in manifest. Technically generous in replies, names her stack openly. Worth following up post-demo via inspo-orbit.

### 3. `06_nickpattison_relace-brand` · sig 5 · highest_signal · orbit_candidate
- **Register:** americana-technical
- **Techniques:** parchment-data-cards, warm-landscape-photography, earthy-palette, lineage-from-printed-materials
- **URL:** https://x.com/thenickpattison/status/2027747047072231550
- **Local:** `_inspo/inspo/2026-04-28/raw/06_nickpattison_relace-brand.png` · live: `06_nickpattison_live.png`
- **Author framing:** *"Americana adventure, but in the wild west of code. We reference old science books, 1960s trail maps, and created a loop mark that doubles as a lasso."*
- **Discussion · craft signals:**
  - **Latte:** *"The best branding tells a story without needing words"* — lineage carries narrative.
  - **Kamran:** consistency is the hard part when borrowing physical/printed lineage; hand-built > generated.
  - **Relace = AI infrastructure for coding agents** — direct tonal sibling to Liminal Custody (substrate/evidence layer for AI agents).
- **Mapped move:** **Escape AI-slop via lineage citation.** Don't aestheticize "vintage" — *cite* pre-digital instruments of measurement. Brand says: we descend from things measured, drawn by hand, validated over decades.
- **Liminal Custody lineage (vs Pattison's Wild West):** naval charts, intelligence cables, range cards, signal logs, reconnaissance overlays. Pre-digital instruments of custody and measurement.
- **Target surfaces (4):**
  1. **Two-register shell** — Map/live world stays cold + instrument (current `#0c1116` slate). **Case file layer wears warm archival**: cable-stock paper, range-card layouts, archival monotype headers. Live world = cold; custody record = warm.
  2. **CustodyCasePanel · CaseHandoffBanner · ProvenanceTrace · ReviewMemory** — wear warm-archival register. Hand-stamped numbering (`CASE 044`, `WATCH OFFICER · D. ARI` in slab serif/monotype).
  3. **EvidenceDrawer / EvidenceChain** — chain-of-custody renders as a **range card**: tabular, hand-typed form with inkpad-style annotations of live values. Two-layer: form is archival, values are live.
  4. **Logotype / app shell wordmark (stake direction, not shippable today)** — "LIMINAL CUSTODY" in slab/monotype with a **single mark that reads as both chain-link and citation arrow**. Not padlock/shield. A mark of held continuity.
- **Pitch language to lift:**
  - **Genre positioning vs Maven:** "Maven is the spacecraft instrument panel. We're the ledger the spacecraft writes to." Differentiation by visual register, not just feature.
  - **"Evidence chain before it becomes command action"** reframed: the part of the custody record that exists *before* adjudication. Older, slower, weight-bearing.
- **Reject:**
  - Literal Americana/cowboy imagery — wrong sub-domain. Use naval/intel archival lineage instead.
  - Photography as primary surface — reads decorative for our demo. Use lineage (typography, paper, mark-stamp) without the photography crutch.

### 4. `02_nyk_compounding` · sig 5
- **Register:** knowledge-mesh-as-living-system
- **Techniques:** network-graph-viz, particle-system, compound-growth-metaphor
- **URL:** https://x.com/nyk_builderz/status/2033373044220342645
- **Local:** `_inspo/inspo/2026-04-28/raw/02_nyk_compounding.png` · live: `02_nyk_live.png`
- **Author framing:** the post quotes Nyk's own thread *"Claude + Obsidian: The Memory Stack That Compounds — Teams burn 30-40 minutes per Claude session re-explaining what they already knew yesterday. Everything is a context problem."* + a follow-up *"Context Engineering Is The Only Engineering That Matters Now."*
- **Discussion · craft signals:**
  - **Vladyslav Hunt:** *"the agent that remembers beats the agent that reasons"* — single sharpest line in the discussion.
  - **Coach Carroll:** *"What's the difference between using this Vs just writing to a db?"* — names the legitimate critique. The mesh isn't different from a DB unless the **structure does work**.
- **Mapped move:** **Mesh compounds visibly over the demo.** Temporal, not spatial. The substrate isn't a static graph — it densifies as evidence accumulates. By refusal time, the operator and judge can see the weight enforcing the refusal. Structure-as-load-bearing.
- **Target surfaces (3):**
  1. **SubstratePanel temporal compounding (primary)** — sparse at cold-open; populates live as the demo runs (dark gap → churn → signal integrity → refusal). `[+ NODE]` / `[+ EDGE]` annotations in the gutter let operator and judge count the substrate filling. Composes with Post 2 Move 1 (filter-toggle): by the end, you can switch views AND see compounded structure.
  2. **ReviewMemory + ReviewRuleSaved** — the strongest single moment for the move. When a rule is saved, a single new node attaches with edges fanning out to prior cases the rule now applies to. **Rule earning its weight in real time** — fixes the demo's most abstract beat.
  3. **CustodyQueue idle-state widget** — substrate is still compounding when no case is active: prior cases, archived rules, learned patterns. Slow particle drift + occasional new node. Frames substrate as alive between cases, not just during them.
- **Pitch language to lift (strongest in the inspo set so far):**
  - **"The substrate that holds beats the model that adjudicates."** Riff on Vladyslav: Maven adjudicates; Liminal holds. The substrate is what makes the refusal carry weight.
  - **"Custody is a context problem."** Then: identity is a context problem, refusal is a context problem, doctrine is a context problem. Mesh is what makes context computable.
- **Q&A defense — direct answer to Coach Carroll's question:** "It's not a DB. DB queries are flat; the mesh-shape itself enforces refusal. The guard doesn't fire on a flag — it fires because the mesh contains a contradiction the chase positions can't reconcile." (Composes Move 4-Post-1 + Move 1-Post-2 + this one.)
- **Reject:**
  - Static density-snapshot at the end. The whole move IS watching compounding.
  - "Beautiful background animation" framing. The mesh has to be **legible** — operator and judge must be able to count nodes and trace at least one edge during the demo.
- **Cost surfaced:** SubstratePanel can't be baked. Has to populate from event handlers tied to the demo script. Real implementation cost. Worth the cost, but stage it so the script is rehearsable.

### 5. `01_AluanWang_inkfield` · sig 4 · **strongest single phrase in the inspo set for Liminal's claim**
- **Register:** organic-digital-tension
- **Techniques:** generative-graphics, fluid-simulation, limited-palette
- **URL:** https://x.com/IOivm/status/2039164501740990935
- **Local:** `_inspo/inspo/2026-04-28/raw/01_AluanWang_inkfield.png` · live: `01_AluanWang_live.png`
- **Author framing:** *"Draw with ink that's always wet."* Drawings stored as JSON event recordings (not pixels) — humans and agents learning from each other through the recording.
- **Discussion · craft signals:**
  - **Ash Thornton:** *"this effect reminds me of the film Arrival"* — Aluan agrees, names the lineage: heptapod ink-language, meaning held without time-direction.
  - **Gallery framing:** *"A gallery of InkField JSON recordings — humans and agents learning from each other."* Substrate-as-events, not substrate-as-output.
- **Mapped move:** **Meaning held in suspension, never crystallized.** Substrate stored as replayable events, not finished outputs. The wet-state IS the custody-state. Refusal = "this shape doesn't close."
- **Target surfaces (4):**
  1. **Refusal screen (screen-05) — primary** — refusal is *the moment the ink refuses to dry*. Not "INTENT REFUSED" as a stamp, but a held-tension visual: forces from Move 4-Post-1 pull, but the topology won't close. Operator sees the system honoring the in-between by refusing to commit.
  2. **EvidenceChain temporal register** — three states: **wet** (live/mutable, shimmer), **drying** (specialist confirmation in progress, fading saturation), **dry** (committed, locked into archival register from Post 3). Typography carries epistemic state. **Lowest-cost / highest-payoff move from this post.**
  3. **Replay controls — substrate-as-JSON-events** — scrub backward unwets ink; scrub forward re-applies. Replay is of **events that produced the substrate's current shape**, not of the output. Continuous reformability, not playback.
  4. **CommandLine / DemoPromptP1–P6** — operator commands enter wet; specialists stroke through with their reads; prompt "dries" only when consensus holds. Literal visual contract: prompt stays wet until substrate confirms.
- **Pitch language to lift (best 8-second framing in the set):**
  - **"Custody is the period when the ink is still wet."**
  - **"We don't commit; we hold."** Maven adjudicates; Liminal holds.
  - **Arrival lineage for non-technical judges:** "Custody is the heptapod logogram of evidence — meaning held in suspension before it commits to a direction."
- **Reject:**
  - Literal ink-bleed visuals. Wet-ink is a **state semantic**, not an aesthetic style. Form stays mnemonic-archival from Post 3.
  - Heptapod logograms as decoration. Lineage citation, not appropriation.
- **Cost:** EvidenceChain wet/drying/dry typography = small (highest ROI). Refusal-as-held-tension = medium. Replay-as-event-scrub = high.

### 6. `05_taylor_particle-ghosts` · sig 4 · **handle with ethical care**
- **Register:** embodied-presence-as-data
- **Techniques:** three-js-particles, blender-cloth-sim, figure-as-particle-cloud
- **URL:** https://x.com/taylor_sntx/status/2027500912864813471
- **Local:** `_inspo/inspo/2026-04-28/raw/05_taylor_particle-ghosts.png` · live: `05_taylor_live.png`
- **Discussion:** sparse (1 reply, 95 likes). Post does its work visually, not through dialogue. **Image content:** shrouded humanoid figure (Madonna/Pietà register) rendered as particle points. Solemn, reverent, grave — not sci-fi.
- **Mapped move:** **Presence-via-particle-density.** Form emerges from accumulated points; gestalt > resolution. Identity has a shape, not a label.
- **Ethical guardrail (hard):** humanoid forms for surveilled targets are operationally and ethically wrong in a NatSec context. Lift the **technique** (presence-via-density), reject the **iconography** (humanoid).
- **Target surfaces (3):**
  1. **TypedObjectChip (primary)** — target gets a particle-cloud signature **at chip scale** (small inline cluster, not a full cloud). Long clean track = tight dense cloud. Churn = fragmented restless cloud. Two MMSIs suspected to be same target visually bleed toward each other. **Cloud IS the identity claim** — operator reads coherence from the visual, not a `0.72` number.
  2. **NamedOperatorCard** — operators wear a different particle register (dense, stable, archival). Two registers mark moral asymmetry: operator is a person; target is a hypothesis being held in custody. **This is how the move escapes the dehumanizing read.**
  3. **HypothesisSurface** — two competing hypotheses render as two clouds in the same field. Overlap = contested zone. Operator sees *where the identity claims compete* spatially. Composes with Post 2 Move 1: toggle the filter, clouds rearrange.
- **Pitch language to lift:**
  - **"Identity has a shape, not a label."**
  - **"Two MMSIs, one shape — the identity is what the signals describe in aggregate, not what they declare individually."** Strongest Q&A defense for dark-gap / churn moment.
- **Reject (hard):**
  - Humanoid figures for targets. Wrong iconography for the domain.
  - Aestheticizing the target. Particle clouds = measurement clouds, NOT portraits.
- **Cost:** Full HypothesisSurface particle field = medium-high. Small inline cluster sparkline in TypedObjectChip = lowest-cost meaningful expression.

### 8. `08_AliGrids_curation` · curatorial feed · meta-rule + 2 micro-moves
- **Type:** curator account, not maker. Bio: *"No Freelance. Carefully collecting UI/UX, dev & creative inspiration."*
- **URL:** https://x.com/AliGrids
- **Local:** `_inspo/inspo/2026-04-28/raw/08_AliGrids_profile.png`
- **Discussion · craft signals from his feed:**
  - **Post 6 caption (the meta-rule):** *"you can feel the system behind it · this is what crafted interfaces look like."* Verification heuristic: a judge should be able to feel the system behind the chrome in 5 seconds. If chrome reads as decoration → fail. If chrome reads as instrumentation → pass.
  - **Post 4 (Emil Kowalski clip-path delete):** confirmation-via-affordance, not modal. Replaces "Are you sure?" dialogs with the action *being* the gesture.
  - **Post 5 (OrionReed folkjs html-in-canvas):** *"same DOM element, multiple places, no cloning, just transforms."* Defers "Hypotheses as paths through substrate" cost: render same DOM transformed into multiple positions instead of three copies. Re-budget V-Next on this technique.
- **Mapped move (rolls up):** **"You can feel the system behind it"** as the verification heuristic for every other move in this doc. Chrome must instrument, not decorate.
- **Target surfaces:**
  1. **All ship-list moves** — apply the heuristic at each gate. Open the screen; ask: do I feel a system behind this in 5 seconds?
  2. **Wet/drying/dry transitions (SHIP-3)** — let the affordance encode the consequence. No "Are you sure?" before commit.
- **Reject:** treating this as a primary aesthetic source. AliGrids is a meta-source (curatorial taste, technique pointers).

---

### 9. `09_macbethAI_generative` · sig 4 · 3 moves, 1 ships today
- **Type:** generative-art / AI-art account. Bio: *"always exploring, always experimenting, always creating."*
- **URL:** https://x.com/macbethAI
- **Local:** `_inspo/inspo/2026-04-28/raw/09_macbethAI_profile.png`
- **Visual signals:**
  - **Filename-as-title naming:** `terms_&_conditions`, `temple_time_1`, `cube_`, `confusion_`, `exploring_`. Reads as raw artifacts checked into version control, not human-titled artworks.
  - **High-contrast B&W particle decay / glitch / datamosh** — work that makes computation visible by showing it failing.
  - **Reposted noper's `Datamosher`:** *"turns normal clips into broken-motion, smeared, artifact-heavy datamosh outputs."* Legibility through controlled corruption.
- **Mapped moves:**
  1. **Filename-as-title naming (SHIPS TODAY).** Every operator-facing label, case ID, evidence key wears `snake_case_` form: `case_044_`, `mmsi_churn_evt_2_`, `signal_int_contested_`. Reinforces "the system's own log of itself" register. Cost: ~zero — copy/labeling pass alongside SHIP-1.
  2. **Datamosh as legibility-through-failure** — render the 47-minute dark gap as **visible signal corruption** in the substrate (smearing/dropout) during the gap window, not as a colored timeline region. The gap *looks* like signal absence. Composes with Ricky's force-driven points (Move 1) and Aluan's wet ink (Move 5). V-Next.
  3. **B&W as primary palette** — push current `#0c1116` slate further: near-black ground, near-white ink, very limited accent (red for refusal, amber for contested). Constraint as legitimacy. Most NatSec dashboards over-color; B&W reads older and more confident. Stage for V-Next palette work.
- **Reject:** datamosh applied broadly as decoration. The technique only works at the moment of failure (the gap), not as an ambient style.

---

### 10. `10_aerockrose_stage` · stage inspo · 3 stage moves
- **Type:** stage/production register from Sequoia AI Ascent (sourced via aerockrose's quote of Karpathy's masterclass).
- **URL:** https://x.com/aerockrose
- **Local:** `_inspo/inspo/2026-04-28/raw/10_aerockrose_profile.png` · prior captures: `~/liminal/aerockrose-post.png`, `~/liminal/aerockrose-viewport.png`
- **Visual signals:** Sequoia AI Ascent stage — monochromatic backdrop, generous negative space, single subject, "AI Ascent" wordmark unobtrusive, chair-and-host format. Broadcast register, not conference register.
- **Mapped moves:**
  1. **Persistent broadcast chyron (SHIPS TODAY)** — desktop app titlebar/chrome wears a low-key lower-third throughout the demo: `LIMINAL CUSTODY · CASE 044 · D. ARI · WATCH-1` in archival monotype. Application-chrome expression of SHIP-1's archival typography. Reads as broadcast/operations register. Lowest-cost stage move.
  2. **One-subject-per-beat focus management** — for each of the 6 demo beats, active surface gets full prominence; everything else recedes to ~30% opacity. CSS opacity layer keyed off demo script. Composes with SHIP-2 + SHIP-3 (un-foregrounded chrome behaves like dried ink). **Demo direction as design.** STRETCH (today).
  3. **Single substrate-state chyron at bottom of screen** — one persistent live line in plain English: `substrate :: holding · 14 nodes wet · 3 specialists drying`. System's continuous self-narration. Gives non-technical judge a thread to follow. STRETCH (today).
- **Reject:** literal Sequoia branding (chair, beige backdrop) as visual decoration. Take the **production register** (single subject, broadcast chyron, focus management), not the props.

---

### 11. `11_macbeth_secrets_` · object-scale wireframe · low cost, high register reinforcement
- **URL:** https://x.com/macbethAI/status/2050061709029822908
- **Local:** `_inspo/inspo/2026-04-28/raw/11_macbeth_secrets.png`
- **Author title:** `secrets_` (filename-as-title convention again — reinforces SHIP-4 with same-creator precedent)
- **Visual:** wireframe building/structure, white edges on near-black, with delicate vertical strokes rising from it like flames or signal beacons. Object-scale render of a "secrets" container — visible *because* it's drawn entirely as edges.
- **Discussion · single pertinent reply:** joja_peaches: *"this is really calming."* Names the contradiction that makes the move work: a wireframe of a "secrets" container reads as **calming, not forbidding**. Transparent custody.
- **Mapped move:** **Transparent custody.** Render the secret-keeping container as edges so structure is visible while contents stay implicit. Joinery exposed; corners ticked; interior treated as a measured volume, not a flat surface.
- **Target surfaces:**
  1. **CustodyCasePanel + EvidenceDrawer** — replace solid panel borders with outline + corner ticks; subtle visible joinery where panels meet. Composes with SHIP-1 (archival) — the archival case file is *visibly assembled*, not a flat surface.
- **Cost:** Low. CSS pass: outline + corner ticks instead of solid borders. Slot into SHIP-1 timeline.

---

### 12. `12_ayushsoni_visual_system_doc` · system-in-poses documentation · ⚠️ ethical flag
- **URL:** https://x.com/ayushsoni_io/status/2050179780314792079
- **Local:** `_inspo/inspo/2026-04-28/raw/12_ayushsoni.png`
- **⚠️ Ethical flag:** Ayush Soni is the same `@ayushsoni_io` publicly accused (with Community Notes confirmation) in Source 6's discussion of using Adam Fuhrer's branding without permission for `firststar.vc`. The technique transfers; **don't cite Ayush by name** in any Liminal-published brand reference. Cite the underlying technique and cleaner sources.
- **Visual:** 4-quadrant grid showing the same icon system in four states/contexts — left muted/desaturated, right saturated; top warm orange palette, bottom cool purple. Each quadrant contains multiple instances of the same iconographic vocabulary at varied scales.
- **Discussion · craft signals:**
  - **Paul Bokelman:** *"makes my day better after seeing so much slop."* — second time the inspo set names AI-slop as the failure-mode being escaped (after Pattison Source 3).
  - **Harsh:** *"the visual flow here is smooth — my eye just moves through it naturally."*
- **Mapped move:** **System-in-poses documentation as proof-of-coherence.** A single artifact (image, slide, or thumbnail-grid `index.html`) showing all 6 demo screens at thumbnail scale, all rendered in the unified register, all visibly belonging to the same system. Judge sees coherence across screens before clicking through.
- **Target surfaces:**
  1. **STRETCH-4 (NEW)** — auto-generate a thumbnail grid asset from the 7 export HTMLs once SHIP-1/2/3 land. Drop it into the pitch deck and as the new `index.html` for `export/html/`.
- **Cost:** Low — html-screenshot tool against the 7 screens, 4×2 grid layout. Ships *after* the screens themselves are unified.

---

### 13. `13_avichawla_blockify` · concept + pitch language, not visual
- **URL:** https://x.com/_avichawla/status/2050102355979583615
- **Local:** `_inspo/inspo/2026-04-28/raw/13_avichawla.png`
- **Visual:** thread post with one comparison diagram ("Naive RAG vs Blockify") — two stacked node-flow graphs, dark background, light visual weight. Visual contribution low; **substantive content high.**
- **Concept (the actual signal):** standard RAG treats every chunk identically regardless of *version, clearance level, or source authority*. Blockify adds metadata at the chunk layer so retrieval prefers authoritative sources. **Liminal's substrate is exactly this at the evidence layer.**
- **Discussion · craft signals:**
  - **Sathish:** *"every number here comes from Blockify's own benchmarks. No independent reproduction."* → discipline: mark internal vs independent benchmarks in pitch.
  - **Benjamin Booth:** *"sit quietly in an architecture as a 're-RAG' — a continuous refinement sidecar."* — strongest one-line architectural framing for where Liminal sits in a NatSec stack.
- **Mapped moves:**
  1. **"Naive vs Liminal" comparison slide** — single round-2 deck slide. Two stacked flow diagrams in unified dark register: "Naive Sensor Fusion" → flat retrieval. "Liminal Custody" → custody sidecar refines source-authority, version, clearance, provenance before adjudication. Cost: low. High pitch ROI.
  2. **Pitch language additions:**
     - *"Liminal Custody is a substrate sidecar that refines source authority before retrieval."*
     - *"Standard sensor fusion treats every signal as if it has the same authority. We attach version, clearance, provenance, and integrity to every chunk before any model sees it."*
  3. **Discipline:** mark internal vs independent benchmarks whenever pitch material cites numbers.
- **Reject:** Avi's diagram visual style (flat, generic). Render the comparison in the unified register from SHIP-1/2/3.

---

### 14. `14_iamai_omni_volsurface` · roughness-is-signal · sharpest anti-pattern in the set
- **URL:** https://x.com/iamai_omni/status/2050200886027460999
- **Local:** `_inspo/inspo/2026-04-28/raw/14_iamai_omni.png` · prior viewport: `~/liminal/iamai-omni-viewport.png`
- **Visual:** 3D implied-volatility surface for options across multiple companies — colored mesh terrain in dark space, peaks/valleys, axis-anchored. **Genre:** Bloomberg Terminal / Artemis Capital lineage (trader-screen register), not Houdini-art or generative-art.
- **Discussion · the critical exchange:**
  - **LJ Ding:** *"This doesn't look smooth. It seems like no handling was done for low liquidity dates, and the bid-ask spread wasn't considered either."* — names that the **artifacts in the surface ARE data** about market conditions; smoothing loses information.
  - **iamai's response:** *"Get ready to add a bit of smoothness; originally I wanted to make it like this."* — agrees, intends to clean.
  - **The conflict resolves the move:** LJ is right; iamai is wrong about smoothness. **Roughness is signal.**
  - **Maia Tong:** *"This doesn't require PhD level — undergrad MATLAB in financial engineering."* — names that the math is conventional; the legibility is the move.
- **Mapped move (sharpest single anti-pattern in the set):** **Don't render confidence the system doesn't have.** Refusing to smooth artifacts is a register-level commitment. A smoothed substrate looks confident but lies. A rough substrate looks honest but unfinished. Liminal's wet-ink claim IS the claim that the system should refuse to smooth what shouldn't be smooth.
- **Target surfaces:**
  1. **ConfidenceBar (extends SHIP-2)** — when substrate coverage in a region is low, the bar's edges **jitter / fragment / show gaps** rather than render a clean arc. The roughness IS the confidence statement.
  2. **SubstratePanel topology (V-Next)** — sparse regions have visibly broken edges, not interpolated curves.
  3. **3D vol-surface lineage (V-Next)** — when SubstratePanel becomes a topology view, borrow Bloomberg/Artemis register: dense colorimetric mesh, axis labels, peaks/valleys legible across cases. *"Substrate-as-volatility-surface"* — vol surfaces show where market is uncertain; substrate surfaces show where custody is uncertain. Same artifact shape.
- **Pitch language:** *"Maven smooths uncertainty into a number. We render it as terrain — peaks where signal is dense, valleys where it's contested. The roughness is the data."*
- **Reject:** smoothing as the default. Render the unevenness.

---

### 7. `07_AiwithYasir_gitnexus` · sig 3 · conceptual move only
- **Register:** code-as-knowledge-graph
- **URL:** https://x.com/AiwithYasir/status/2047589529650176333
- **Local:** `_inspo/inspo/2026-04-28/raw/07_AiwithYasir_gitnexus.png` · live: `07_AiwithYasir_live.png`
- **Author framing:** salesy "🚨Breaking" thread-bait (Shaw's reply: *"shitty breaking news aesthetic but the repo is cool"*). Substance in replies, not OP.
- **Discussion · craft signals:**
  - **Guri Singh:** *"a shift from AI generating code to actually understanding systems, which is where real reliability starts to matter."*
  - **OneManSaas:** *"that's the difference between documentation and actual intelligence."*
  - **Yasir's honest caveat:** GitNexus is static AST + inferred flows, **not full runtime telemetry**. Worth noting for Q&A integrity.
- **Mapped move:** **Blast radius — show downstream consequences before commit.** Conceptual, not visual.
- **Note:** post is sig-3 because the visual contribution is low (generic dark-mode dev-tool aesthetic, AI-slop framing). Pattison Post 3 is the explicit antidote.
- **Target surfaces (1):**
  1. **DemoPromptP1–P6 / ActionOptions — preview-before-commit** — when operator considers an action ("apply rule," "save hypothesis"), substrate shows downstream edges lighting up to all nodes that would change. Composes with Post 4 (compounding mesh) + Post 5 (wet ink) — the action's effect is visible while the ink is still wet. Prevents accidental rule-saves; demonstrates structural awareness.
- **Pitch language to lift:**
  - **"AI systems that generate adjudications can ship breaking changes to custody. Liminal sees the downstream commitment before any rule commits."**
  - **"This is not a database; it's structural awareness."**
- **Reject:**
  - GitNexus's visual style and the OP's "🚨Breaking" framing — AI-slop. Pattison register is the antidote.
  - "Blast radius" as operator-facing copy — wrong register. Use **"downstream commitment"** or **"what changes if I commit."**
- **Cost:** Lowest of any post. Edge-highlight UI affordance on existing screens. Composes with other moves rather than adding new surface.

---

## Surface inventory (where moves can land)

**Demo screens (`export/html/screens/`):**
- screen-01-cold-open
- screen-02-dark-gap
- screen-03-mmsi-churn
- screen-04-signal-integrity
- screen-05-intent-refused
- screen-06-doctrine-applied
- screen-idle-case-open

**Components (`export/html/components/`):**
- ActionOptions, CaseHandoffBanner, CommandLine, ConfidenceBar, CustodyCasePanel, CustodyQueue, DataSourcesChips, DemoPromptP1–P6, EvidenceChain, EvidenceDrawer, ExecSummary, HormuzIntelDrawer, HypothesisBoard, HypothesisSurface, MapTelemetryHud, NamedOperatorCard, ProvenanceTrace, ReplayControls, ReviewMemory, SpecialistReads, SubstratePanel, TypedObjectChip, WorkflowStrip, WorkingPanel, WorkingPanelEmpty

---

## Canonical anchors (added after reading repo canon · README, onepager, integration-state, v4-judge-calibrated, public-repo-notes)

### The canonical sentences (DO NOT compete with these)

These are locked in pitch canon. Every design move below must serve them, not displace them.

- **"Maven is the foundation. We are the substrate."** (one-sentence positioning)
- **"Command systems start too late. Liminal Custody protects the evidence before it becomes command — and refusal is structurally enforced, not requested."** (single-sentence drill)
- **"Pre-decisional infrastructure for unresolved context."** (Shruti's own framing in the onepager bio — supersedes my "wet ink" synthesis as primary external language; "wet ink" stays as internal design vocabulary)

### The four-layer framework (every move maps to one layer)

| **SUBSTRATE / X** | **CUSTODY** | **REFUSAL** | **REVIEW MEMORY / Y** |
|---|---|---|---|
| raw multi-domain observations | preserved hypotheses, source-integrity, contested claims | server-side structural guard, AI cannot overclaim | operator corrections become durable rules |

### Never-cut invariants (README §201 — load-bearing)

1. Persistent shell (desktop)
2. Dark gap + two-MMSI identity churn
3. Hypothesis board
4. Signal Integrity row
5. Specialist refusal (structurally enforced)
6. Causal line: *"Intent refused because Signal Integrity contested"*
7. Evidence / provenance trace
8. Review rule saved
9. Prior rule applied / second case changed

### Make-or-break beat

> *"the second case is changed by the prior rule, AND the system shows that Intent refused because the structural guard fired on Layer 2."*

### Hard design constraint surfaced from public-repo-notes + integration-state §6

**The judge cannot visually distinguish demo mode from Q&A mode.** SHIP-3 (wet/drying/dry typography), STRETCH-3 (refusal-as-held-tension), and SHIP-2+14 (ConfidenceBar roughness) **must render identically whether driven by fixture or by live AIP**. Designs cannot key off data source. The structural guard is the invariant; the UI honors that invariant by being source-agnostic.

### Judge-by-judge sentence map (v4 §4) — design must enable each one

Every move below names which judge-sentence(s) it makes naturally accessible during the demo.

| Judge | Sentence to enable | Where in UI |
|---|---|---|
| Army (xTech) | *"90-day pilot with maritime watchfloor"* | App shell chyron + onepager opening (SHIP-5) |
| Shield Capital | *"Shayaun is OffSec / top 100 HTB"* | Refusal moment (SHIP-3 + STRETCH-3) — guard's structural enforcement is Shayaun's IP |
| IQT | *"unsolved layer between substrate and command"* | Substrate panel + custody panel adjacency (SHIP-1, SHIP-2) |
| DCVC | *"moat is the substrate"* | SubstratePanel visible weight + V-Next compounding mesh |
| Palantir | *"ship as an AIP module"* | Q&A fallback parity — UI doesn't change between modes (hard constraint above) |
| Stanford Gordian | *"restraint as a security feature"* | Refusal-as-held-tension (STRETCH-3) — the visual must read as restraint, not failure |
| L3Harris | *"between feeds and C2"* | Substrate / Custody / Command three-zone visual (architecture diagram in README, plus zone labeling in app shell) |
| Berkeley DTS | Shruti + Shayaun bona fides | NamedOperatorCard + team byline in chyron |

---

## Synthesis · 14 sources compose into one product language

Unusual for an inspo set: these aren't fourteen aesthetics, they're **fourteen facets of one move** — *the substrate is the load-bearing thing; everything else is reluctant chrome around it. Where the substrate is uncertain, render the uncertainty; don't smooth it.*

| Source | Layer | Contribution |
|---|---|---|
| 1 · Ricky | structural / chrome | reluctant chrome, forces visible through effects |
| 2 · Kat | structural / topology | same substrate, three filter functions |
| 3 · Pattison | register / lineage | escape AI-slop via archival citation |
| 4 · Nyk | temporal / structural | mesh compounds visibly over the demo |
| 5 · Aluan | temporal / state | wet → drying → dry; ink that won't crystallize |
| 6 · Taylor | identity expression | identity has a shape, not a label |
| 7 · Yasir | affordance | preview blast radius before commit |
| 8 · AliGrids | meta-rule | "you can feel the system behind it" — verification heuristic |
| 9 · Macbeth (feed) | naming + palette | filename-as-title; B&W; legibility-through-failure |
| 10 · aerockrose | stage / production | broadcast chyron; one subject per beat |
| 11 · Macbeth (`secrets_`) | container | transparent custody — wireframe joinery, not solid panels |
| 12 · Ayush ⚠️ | documentation | system-in-poses thumbnail grid as proof-of-coherence |
| 13 · Avi Chawla | concept + pitch | substrate-as-sidecar; "Naive vs Liminal" comparison slide |
| 14 · iamai | honesty | **roughness is signal — don't smooth what shouldn't be smooth** |

### Canonical sentence (falls out of the synthesis)

> **Liminal Custody is the wet ink phase of the evidence chain.**
> **We render the substrate as a topology under force; we let the ink stay wet until the topology composes; we keep the record in archival form once it dries.**

Three phases in one sentence: **wet** (custody, current case under analysis), **drying** (adjudication-in-progress, specialist consensus forming), **dry** (committed record, archival custody). Composes nearly word-for-word with the canonical positioning *"Liminal gives form to inner life"* — inner life is the wet phase of identity.

### Pitch lines that survived synthesis (rank-ordered, post-14)

1. **"Custody is the period when the ink is still wet."** (Source 5)
2. **"Maven smooths uncertainty into a number. We render it as terrain."** (Source 14) ⟵ NEW · sharpest differentiator
3. **"The substrate that holds beats the model that adjudicates."** (Source 4, Vladyslav riff)
4. **"Liminal Custody is a substrate sidecar that refines source authority before retrieval."** (Source 13, Booth riff) ⟵ NEW · clearest architectural framing
5. **"We don't show you a map of the data. We show you a map of where attention is biased in the substrate."** (Source 2)
6. **"Maven is the spacecraft instrument panel. We are the ledger the spacecraft writes to."** (Source 3)
7. **"Standard sensor fusion treats every signal as if it has the same authority. We attach version, clearance, provenance, and integrity to every chunk before any model sees it."** (Source 13) ⟵ NEW
8. **"Identity has a shape, not a label."** (Source 6)
9. **"This is not a database; it's structural awareness."** (Source 7, OneManSaas riff)

---

## Pre-demo ship list (today, May 3 · 1-day budget) — UPDATED with sources 8/9/10

Constraint: **the refresh must compose into a single visible thing on demo day, not ten half-finished things.** Sources 8/9/10 add three near-zero-cost moves that should slot in alongside SHIP-1/2/3 rather than displacing them.

### Verification heuristic (apply at every gate)

From AliGrids (Source 8): **"You can feel the system behind it."** Open the screen; ask: do I feel a system behind this in 5 seconds? If chrome reads as decoration → fail. If chrome reads as instrumentation → pass.

### Ship today (5 moves — all near-zero or low cost · each maps to invariant + judge)

**SHIP-1 · Two-register shell + archival typography** _(Source 3)_
- Cold dark register stays for map/live world.
- Case-file layer (CustodyCasePanel, CaseHandoffBanner, ProvenanceTrace, ReviewMemory, EvidenceDrawer) gets warm archival treatment: cable-stock paper background, monotype/slab serif headers, hand-stamped case numbering.
- **Invariants reinforced:** #1 persistent shell · #7 evidence/provenance · #8 review rule saved
- **Judge sentences enabled:** IQT (unsolved layer) · DCVC (substrate moat) · L3Harris (between feeds and C2)
- **Why first:** highest-contrast visual hit, no behavior change, no demo-script risk. Reads instantly as "this is older, weight-bearing infrastructure" — the canonical positioning.

**SHIP-2 · Reluctant chrome + driven readouts** _(Source 1, chrome-level)_
- MapTelemetryHud: corner-anchored mnemonic stacks (`MMSI · CHURN · 2`, `SIG · INT · CONTESTED`, `DARK · 38m`). Tick brackets `[ ]` frame the map.
- ConfidenceBar: render as driven instrument (tick scale, current needle, prior ghost, `CONF · 0.72 · Δ -0.08` cluster).
- SubstratePanel + SpecialistReads: 6 specialist rows (Kinematics, Identity, **Signal Integrity**, Intent, Collection, Visual — per integration-state §8 decision) wear MUB-mnemonic gutters; full names on hover.
- **Invariants reinforced:** #2 dark gap + two-MMSI · #4 Signal Integrity row · #6 causal line
- **Judge sentences enabled:** IQT · L3Harris
- **Numerical alignment:** dark gap is **38 minutes** per onepager (not 47 — corrected from my earlier draft). Two-MMSI separation is **4.2 nautical miles**.

**SHIP-3 · EvidenceChain wet/drying/dry typography** _(Source 5)_
- Three states: **wet** (shimmer/breathe), **drying** (fading saturation), **dry** (locked into SHIP-1's archival register).
- Typography carries epistemic state. CSS transitions only.
- **HARD CONSTRAINT:** must render identically in fixture-mode and AIP-mode (per integration-state §6). The state read comes from the guard's response, not from the data-source.
- **Invariants reinforced:** #5 structural refusal · #7 evidence/provenance · #6 causal line
- **Judge sentences enabled:** Shield (Shayaun's structural integrity) · Stanford Gordian (restraint as security feature) · Palantir (Q&A parity)
- **Why:** cheapest expression of the sharpest claim ("pre-decisional infrastructure for unresolved context" / "wet ink"). Threads through 5 of 7 screens. The drying→dry transition IS the structural guard's verdict moment, visible.

**SHIP-4 · Filename-as-title naming pass** _(Source 9)_
- Every operator-facing label, case ID, evidence key wears `snake_case_` form: `case_alara_01_`, `mmsi_churn_evt_2_`, `signal_int_contested_`, `rule_r_001_active_`.
- **Use canonical scenario name:** `case_alara_01` (per `fixtures/maritime/scenario-alara-01.jsonl`), not `case_044`. Anchor to actual fixture identifiers.
- Cost: ~zero. Run as a copy/labeling pass alongside SHIP-1.
- **Invariants reinforced:** #1 persistent shell (system-as-its-own-log register) · all 9 indirectly (consistent labeling)
- **Judge sentences enabled:** Berkeley DTS (operator literacy) · IQT (substrate-layer credibility)

**SHIP-5 · Persistent broadcast chyron** _(Source 10)_
- Desktop app titlebar/chrome wears a low-key lower-third throughout: `LIMINAL CUSTODY · CASE alara_01 · 5TH FLEET · 0200Z` in archival monotype.
- **Use canonical operator framing:** "5TH FLEET · 0200Z" not generic operator label. Per onepager §2 named operator persona.
- Single horizontal line, persistent across all screens. Application-chrome expression of SHIP-1.
- **Invariants reinforced:** #1 persistent shell
- **Judge sentences enabled:** Army/xTech (named pilot — 5th Fleet watchfloor, 0200 local) · Berkeley DTS (operator-network credibility)
- **Why:** broadcast register that grounds the demo in the named operator from the first frame. Plays for the judge in their peripheral vision the entire 3-minute demo.

### Ship today add-ons from Sources 11–14 (slot into existing tracks, not new tracks)

**SHIP-1+11 · Wireframe joinery for case-file panels** _(Source 11)_ ⟵ MERGE INTO SHIP-1
- CustodyCasePanel + EvidenceDrawer: replace solid panel borders with **outline + corner ticks + visible joinery** at panel meeting points. Composes with SHIP-1's archival typography: case file is *visibly assembled*, not a flat surface.
- Cost: low CSS pass during SHIP-1.

**SHIP-2+14 · Roughness in ConfidenceBar** _(Source 14)_ ⟵ MERGE INTO SHIP-2
- When substrate coverage in a region is low, ConfidenceBar's edges **jitter / fragment / show gaps** instead of rendering a clean arc. The roughness IS the confidence statement — anti-smoothing as a register commitment.
- Cost: medium during SHIP-2. Requires a coverage signal exposed by the substrate; if not available today, fall back to varying border-radius / dashed segments to suggest fragmentation.

### Stretch (only if SHIP-1–5 land cleanly by 4pm, in this order)

**STRETCH-1 · Substrate-state chyron at bottom** _(Source 10)_
- Single persistent line in plain English: `substrate :: holding · 14 nodes wet · 3 specialists drying`.
- System's continuous self-narration. Threads non-technical judges through any beat they miss.
- Cost: low. Single CSS line + a small state hook.

**STRETCH-2 · One-subject-per-beat focus management** _(Source 10)_
- Each demo beat dims everything except the active surface to ~30% opacity.
- CSS opacity layer keyed off demo script. Composes with SHIP-2 (chrome) + SHIP-3 (wet ink) — un-foregrounded chrome reads like dried ink.
- Cost: medium. Demo direction as design.

**STRETCH-3 · Refusal as held-tension, with named guard layer** _(Sources 5 + 1, anchored to canon)_
- Screen-05: not "INTENT REFUSED" stamp. Two simultaneous reads:
  1. The held-tension visual — forces from SpecialistReads pull but the topology won't close. The ink refuses to dry.
  2. **The named guard layer fires visibly.** "STRUCTURAL GUARD · LAYER 2 · INTENT_INDICATOR MISSING" appears as a **server-stamped** annotation, not a UI label — typeset like the guard wrote it itself, not the UI announcing it. Per integration-state §3 + §5 + §8 (Layer 2 is the make-or-break beat).
- The dashed connector to `signal_integrity` makes the causal pair visible — per README §63 ("dashed connector to signal_integrity makes the causal pair visible") and the canonical causal line *"Intent refused because Signal Integrity is contested."*
- **Invariants reinforced:** #4 Signal Integrity row · #5 structural refusal · #6 causal line · MAKE-OR-BREAK part 1
- **Judge sentences enabled:** Shield (Shayaun's structural integrity is THIS) · Stanford Gordian (restraint as security feature) · Palantir (it's the same beat in fixture and live AIP)
- **HARD CONSTRAINT:** the guard-layer stamp comes from `guard.ts`'s response payload, not from a UI string literal. If the guard reports `layers: ["intent_indicator", "signal_integrity_contested"]`, the UI displays both. Zero hardcoded copy in this surface.
- Highest narrative ROI of all stretches. Single surface, careful animation.
- Cost: medium-high. Cut if STRETCH-1/2 already ate the time.

**STRETCH-4 · System-in-poses thumbnail grid** _(Source 12)_ ⟵ NEW
- Auto-generated 4×2 thumbnail grid from the 7 export HTMLs after SHIP-1/2/3 land. Replaces or augments current `export/html/index.html`. Becomes a deck-ready artifact: judge sees coherence at a glance.
- Cost: low. Run after the screens are unified — it's the proof artifact.

**STRETCH-5 · "Naive Sensor Fusion vs Liminal Custody" comparison slide** _(Source 13)_
- Single deck slide: two stacked flow diagrams in unified dark register. Lifts pitch language from #4/#7 in the rank-ordered list.
- Cost: low. Round-2 deck artifact, not UI.

**STRETCH-6 · Second-case rule-applied beat (MAKE-OR-BREAK part 2)** _(Sources 4 + 7, anchored to canon)_
- Screen showing the **second case** with the prior rule visibly applied — `[R-001]` chip in zone, recommendation reordered (per README §66).
- **The "rule earning its weight" visualization from Move 4 (Source 4):** when R-001 is applied to the second case, render the rule's **edges fanning out** from the rule chip to every prior-case node it now touches. Compounding made visible. The judge sees the *moat* — review memory as durable doctrine.
- Composes with SHIP-3 (wet → drying → dry): R-001 is a **dry rule reaching back into a previously-dried case** and re-wetting one of its edges. Visual contract: dried evidence can become wet again under doctrine.
- **Invariants reinforced:** #8 review rule saved · #9 prior rule applied / second case changed · MAKE-OR-BREAK part 2
- **Judge sentences enabled:** DCVC (the moat is the substrate — visible compounding) · IQT (substrate-layer novel) · Army (durable operating doctrine = pilot-able)
- Cost: medium. Same compounding-mesh implementation cost as Source 4's V-Next entry, but constrained to a single rule + single case = tractable today.
- **This is the second half of the make-or-break beat.** STRETCH-3 is part 1 (refusal). STRETCH-6 is part 2 (rule applied). Together they ARE the demo. If only one stretch ships, prioritize STRETCH-6 — refusal works without animation; rule-applied does not.

---

## V-Next backlog (post-demo, deeper iteration)

These moves are real but too deep for a 1-day budget. Stage for next iteration.

| Move | Source posts | Cost | Why deferred |
|---|---|---|---|
| Substrate-as-topology with filter-toggle (Density / PCA / Centroid) | 2 | high | Net-new viz layer; needs mapper algorithm wiring; rehearsal time we don't have |
| Mesh compounds during demo (live node/edge population) | 4 | high | Event handlers tied to demo script; demo-fragility risk |
| Hypotheses as paths through substrate / forces as edges | 1 + 2 | high → **medium** | **Re-budgeted:** AliGrids' html-in-canvas / shared-DOM technique (Source 8) lowers cost — render same DOM transformed into multiple positions instead of three copies |
| TypedObjectChip particle-cloud signature | 6 | high | Particle rendering at chip scale; ethical guardrails to design carefully |
| Preview blast radius on hover | 7 | medium | Composes well but requires substrate to be live first (V-Next) |
| Replay-as-event-scrub (substrate JSON-events) | 5 | high | Replay state machine rewrite |
| Logotype with chain-link/citation-arrow mark | 3 | medium | Brand-system work, separate sprint |
| CustodyQueue idle-state compounding widget | 4 | medium | Net-new surface, not in critical demo path |
| Datamosh dark-gap visualization | 9 | medium | The 47-min gap rendered as visible signal corruption (smearing/dropout), not a colored region |
| B&W-first palette pass | 9 | medium | Push current slate further: near-black ground, near-white ink, very limited accent. Brand-system sprint |
| Confirmation-via-affordance (no "Are you sure?" modals) | 8 | low-medium | Emil Kowalski clip-path pattern; replaces commit dialogs; needs UX design pass per affordance |

---

## Implementation order for today (UPDATED post-canon-read)

Reading the canonical docs surfaces TWO things that change priority:
1. The **make-or-break beat has two halves** (refusal + rule-applied). My earlier ordering only emphasized half. STRETCH-6 (rule-applied) is now elevated because rule-applied can't land without animation but refusal can.
2. The **judge cannot distinguish demo-mode from Q&A-mode** is a hard design constraint. SHIP-3 + SHIP-2+14 + STRETCH-3 must read off `guard.ts` response payload, not data-source.

1. **Now → noon:** SHIP-1 (archival case-file register) **+ SHIP-4 (snake_case_ naming)** **+ SHIP-1+11 (wireframe joinery)**. Touch CustodyCasePanel, CaseHandoffBanner, ProvenanceTrace, ReviewMemory, EvidenceDrawer.
2. **Noon → 2pm:** SHIP-2 (reluctant chrome) **+ SHIP-5 (broadcast chyron with `5TH FLEET · 0200Z`)** **+ SHIP-2+14 (ConfidenceBar roughness)**. Touch MapTelemetryHud, ConfidenceBar, SubstratePanel, SpecialistReads, app shell.
3. **2pm → 4pm:** SHIP-3 (wet/drying/dry typography, source-agnostic). Touch EvidenceChain across all screens.
4. **4pm → 5:30pm:** STRETCH-6 (second-case rule-applied beat — MAKE-OR-BREAK part 2). Highest-priority stretch because rule-applied requires animation; refusal does not.
5. **5:30pm → 6pm:** STRETCH-3 (refusal-as-held-tension with named Layer 2). MAKE-OR-BREAK part 1; lower urgency only because the existing fixture refusal already lands narratively even without polish.
6. **6pm → 6:30pm:** STRETCH-1 (substrate-state chyron) **+ STRETCH-4 (thumbnail grid)** in parallel. Both cheap.
7. **6:30pm → cutoff:** STRETCH-5 (deck comparison slide) **OR** STRETCH-2 (focus management). Cut to whichever is more demo-night-load-bearing.

**Verification at each ship gate (three heuristics now):**
- AliGrids: *do I feel a system behind this in 5 seconds?* If no → fix.
- iamai-omni: *am I rendering confidence the system doesn't have?* If yes → roughen.
- **Canon parity (NEW):** *does this UI surface read off `guard.ts` response, or does it bake in copy?* If baked → rewire to read from response payload before moving on.

**Anchor checks before each ship gate:**
- Numbers: dark gap = **38 min**, MMSI separation = **4.2 nm**, scenario name = **alara-01** (not 044).
- Operator framing: **5th Fleet · 0200 local · Strait of Hormuz · Watch Officer**.
- Specialist rows: **6 rows** (Kinematics, Identity, Signal Integrity, Intent, Collection, Visual) per integration-state §8.
- Refusal layer: **Layer 2 · INTENT_INDICATOR missing** (named verbatim per integration-state §5 + §8).
