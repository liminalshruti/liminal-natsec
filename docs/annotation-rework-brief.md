# Annotation system rework — brief

**Status:** in-flight, ripped from the demo on 2026-05-03 (PR #B-2 wave).
**Owner:** Shruti.
**Why:** the existing `DemoPrompt` component was the only in-app annotation
surface, and it failed three operator tests:

1. **Tied to specific UI elements** — DemoPrompt rendered as a fixed overlay
   in the stage's lower-left, regardless of which UI element was the
   subject of the line. Annotations should sit *next-to* the thing they
   describe, with arrows/connectors when proximity isn't possible.
2. **Survives no-narration video** — the 1-min backup demo recording
   may run without audio. DemoPrompt's text was *narration-replacement*
   (e.g. "Normal traffic. The watch is quiet."), not *element-meaning*.
   A muted viewer couldn't tell which beat the prompt described.
3. **Extends beyond the stage** — substrate panel, working panel,
   command line all need annotations during the demo (e.g. "this verb
   is the system's posture, not a recommendation"). DemoPrompt was
   stage-only.

## Design principles for the rework

- **Element-bound:** every annotation declares its target element by
  selector or React ref. Position is computed from the target's
  bounding box; arrow points at the target.
- **Non-blocking:** annotations sit in margins, gutters, off-canvas
  overflow. They never cover an interactive surface.
- **Layered visibility:** three modes — *off* (clean operator state),
  *demo* (narrative beats visible), *learn* (intuitive-UI mode for
  first-time-user discovery).
- **Survives mute:** annotation copy should describe what the element
  *is*, not what the speaker is *saying*. Element-meaning, not
  narration-replacement.
- **Mode-toggleable:** keyboard shortcut (`A`) cycles modes during
  demo; persists in localStorage for next launch.
- **Cross-pane:** AppShell-level mount, target selectors point to
  any panel.

## Implementation sketch (post-submission)

```ts
// New component shapes
<AnnotationOverlay mode="demo" />
<Annotation
  target="#zone1__verb"
  position="right"
  mode="demo"
  copy="System posture — what the system is doing, not recommending."
/>
```

- One `<AnnotationOverlay>` mounted at AppShell root
- Annotations registered as JSX children, target via CSS selector or React ref
- Overlay computes positions on resize/scroll via ResizeObserver
- SVG arrows from annotation badge → target edge

## Why this isn't shipping in the H~36 window

The user-facing surface (3 modes + cross-pane targets + arrow rendering +
ResizeObserver positioning) is at minimum a 3-4 hour build. The submission
window doesn't have that runway, and shipping a half-done annotation
system reads as worse than no annotations at all.

The demo for tomorrow ships *without* annotations. The 1-min recording
relies on UI affordances + on-screen text that already self-narrate
(verb, posture, refusal banner, citation chips, drop zone label).
Round 2 (top 6, on stage) will use spoken narration; the annotation
system is for the post-hackathon learning surface and operator-grade
deployment.

## What to keep from DemoPrompt during the rework

- The phase-triggered timing logic (`useEffect` on phase change)
- The keyboard ESC dismiss handler
- The auto-fade pattern for less-aggressive presence
- The font register (Liminal Hand → Caveat fallback)
- The cue table (phase → headline + next-beat) — useful as data
  source for new element-bound annotations

## What to replace

- The fixed-position overlay — annotations bind to elements, not coords
- The narration-replacement copy — replace with element-meaning copy
- The stage-only mount — overlay is AppShell-level
