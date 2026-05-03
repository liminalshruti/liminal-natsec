# Real Data Mode Contingency

This note exists because the real-data path intentionally lets provider data decide
what the watchfloor shows. That is the right default for credibility, but it can
produce a confusing demo if the refresh window is empty, stale, blocked, or just
operationally boring.

## Default Interpretation

Real mode should not silently invent a case.

If AISstream, GFW, or other providers do not yield enough evidence for a dark
gap or identity-churn case, the correct output is a no-case state with source
status, refresh time, and a plain reason. A no-case result is not a runtime
failure. It means the current provider window did not support the custody case.

## What Counts As Confusing

Treat the real-data outcome as suspect when any of these happen:

- The app shows no case, but provider status does not explain why.
- A case appears without clear source-document and evidence links.
- Infrastructure-only sources appear to support kinematics, vessel behavior, or intent.
- The map has tracks, but the case panel has no generated anomaly or hypothesis.
- The demo story changes so much that a viewer cannot understand what decision is being protected.

## Response Ladder

Use this order before changing product behavior:

1. Inspect refresh status and source documents.
2. Check whether AISstream produced enough timestamped positions inside the configured AOI.
3. Check whether the dark-gap threshold or refresh window is too narrow.
4. Show the no-case state if the evidence is genuinely insufficient.
5. Switch to explicitly labeled demo mode only for presentation continuity.

Do not silently fall back from real mode to synthetic data.

## Demo Mode Boundary

The Alara replay can remain as an explicit demo fixture, but it must be labeled as
demo data in the topbar, command surface, and any exported evidence trace. It is
acceptable for sales, judging, and walkthrough reliability. It is not acceptable
as the default answer to "is the app operating on real data?"

## Product Principle

The system is more credible when it says "no supported case from current data"
than when it manufactures a narrative. The fallback should protect operator
understanding, not preserve theatrics.
