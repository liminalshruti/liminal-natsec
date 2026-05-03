# Live 72-Hour Hormuz Intel Brief

Generated from `fixtures/maritime/live-cache/` on May 3, 2026.

## Defensible Demo Claims

- The cache contains 70 normalized Hormuz evidence records; 68 are available.
- Within the last 72 hours, 22 available evidence records have observed timestamps, plus one explicit AISstream feed-gap record.
- Real 72-hour signal exists in public media context, satellite coverage, NAVAREA/UKMTO snapshots, and maritime infrastructure context.
- Do not claim live 72-hour vessel behavior from AISstream or GFW. AISstream free-tier Hormuz collection was empty, so the stored AIS sample is global-only connector proof. GFW returned live API responses; one recent vessel-search hit can support identity/source context, but GFW event windows are older than the 72-hour window.

## 72-Hour Signals

| Source | 72h signal | Demo-safe interpretation |
|---|---:|---|
| GDELT DOC 2.0 | 49 recent Hormuz/Iran/shipping articles | Regional attention is active and multilingual; use as context only. |
| Sentinel-1 STAC | 4 SAR acquisitions | All-weather satellite coverage exists over the AOI for second-source collection. |
| Sentinel-2 STAC | 12 optical acquisitions | Optical collection exists; some tiles have very low cloud cover, others are partially clouded. |
| Sentinel Hub chips | 2 cached image chips | Visual context is available for SAR/optical cross-checking. |
| NAVAREA IX | May 1-2 warnings in NAVAREA IX plus Apr 30 Arabian Sea/Oman warning | Maritime warning environment is current; not all warnings are Hormuz-specific. |
| UKMTO | Current page snapshot | Authoritative maritime-security reporting channel is cached, but recent incident cards were not extracted from the homepage. |
| GFW vessel search | 1 recent identity/search hit | Identity/source context only; not vessel behavior evidence. |
| Overpass | 200 maritime infrastructure elements | The AOI has dense maritime infrastructure context: lights, terminals, seamarks. |
| AISstream | 1 explicit Hormuz feed-gap record | Hormuz-area AISstream collection returned no messages; global sample is not Hormuz evidence. |

## Interesting Insights

1. **Current regional narrative is hot.** GDELT returned 49 articles in the 72-hour window across English, Chinese, Russian, Arabic, German, Bengali, and Indonesian sources. The repeated terms are Iran, war, oil, tanker, shipping, and Hormuz. This supports the demo claim that watchstanders are operating in a noisy, high-attention information environment.

2. **Second-source collection is plausible right now.** Sentinel-1 and Sentinel-2 both have recent coverage over the Hormuz AOI. Sentinel-1 gives SAR continuity regardless of cloud; Sentinel-2 has several low-cloud tiles. This supports the product behavior: when intent is refused, the system recommends second-source SAR/RF/EO corroboration instead of escalation.

3. **Warnings show active regional maritime risk, but not a clean 72-hour Hormuz incident.** NAVAREA IX has fresh May 1-2 warnings in the broader region and an Apr 30 Arabian Sea/Oman warning. Older Strait of Hormuz warnings remain in the enforced-warning table. Use this as regional warning context, not proof of a new Hormuz event in the last 72 hours.

4. **Live vessel behavior is the weak link, and that is actually aligned with the product story.** AISstream’s free tier did not produce Hormuz-area messages, and GFW event windows are delayed/older. GFW vessel search can help with identity/source corroboration, but not live behavior. That means the honest story is: the system protects the evidence chain under missing/contested live feeds instead of pretending the data is complete.

## Do Not Say

- Do not say “we have live AIS in Hormuz from the last 72 hours.”
- Do not say “GFW proves current vessel behavior.”
- Do not say “PortWatch is real-time.” The latest cached PortWatch daily chokepoint rows end on Apr 26, 2026.
- Do not say “NAVAREA/UKMTO proves a new Hormuz incident in the last 72 hours.”

## Say This Instead

> “In the last 72 hours we can see live regional context and satellite collection over Hormuz, but the vessel-behavior feeds are incomplete or delayed. That is exactly the operational problem: the system should preserve custody, refuse intent, and request second-source collection rather than overclaim.”
