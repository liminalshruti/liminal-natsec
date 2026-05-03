# Live 72-Hour Hormuz Intel Brief

Generated from `fixtures/maritime/live-cache/` on May 3, 2026.

Window used for strict 72-hour claims: `2026-04-30T14:36:19Z` to `2026-05-03T14:36:19Z`.

## Defensible Demo Claims

- The normalized drawer now contains 82 evidence records from 30 source documents; 79 are available and 3 are explicitly unavailable.
- Strict 72-hour signal exists in satellite collection, warning/source snapshots, GFW identity history freshness, infrastructure context, and current sanctions-cache retrieval.
- The stronger DANTI/MarineTraffic ship pull is real and useful, but its vessel-position snapshot is April 2, 2026. Use it for traffic-density and vessel-identity context, not last-72-hour movement.
- AISstream still did not produce usable Hormuz-area messages. GDELT live fetch is currently rate-limited/fallback. Do not claim either as live vessel behavior.

## 72-Hour Signals

| Source | Signal | Demo-safe interpretation |
|---|---:|---|
| Sentinel-1 STAC | 4 SAR acquisitions on May 1-2 | All-weather satellite coverage exists over/near the Hormuz AOI. |
| Sentinel-2 STAC | 12 raw optical tiles on May 2; 4 normalized rows | Optical collection exists; several raw tiles have low cloud cover. |
| Sentinel Hub | 2 cached SAR/optical chips | Visual cross-check assets are available for the watchfloor. |
| NAVAREA IX | Current full-text warning cache, including May 1-2 regional warnings | Regional warning environment is active; no clean new Hormuz-specific incident in the strict window. |
| UKMTO | Current product/page snapshot | Authoritative reporting channel is cached; recent-incidents page did not expose a new incident list. |
| GFW | BAO LI and KASOS identity histories last observed May 1; IRIS Y identity hit May 1 | Identity/source corroboration only, not live kinematics. |
| OFAC | Current official CSV snapshot; 50 Iran-program vessels extracted | Entity-risk enrichment only; sanctions rows do not prove location or behavior. |
| Overpass | 200 maritime infrastructure elements | Dense port/anchorage/seamark context around the AOI. |
| AISstream | Explicit feed gap | Free-tier live collection did not produce usable Hormuz AIS messages. |
| GDELT | Unavailable/rate-limited | Fixture fallback excluded from real OSINT claims. |

## Ship Data Upgrade

The DANTI pull adds a strong archived vessel-density layer:

- `danti-hormuz-ship-paginated.json`: 502 MarineTraffic ship-position records, 301 unique vessels.
- Snapshot window: `2026-04-02T14:36:59Z` to `2026-04-02T17:15:18Z`.
- Vessel mix: 198 tanker records, 29 Iran-flag records, 175 anchored/moored tanker records, 23 underway tanker records.
- Port/anchorage concentration: Khor Fakkan anchorage, Sharjah anchorage, Hamriya Free Zone, Dubai anchorage, Fujairah anchorage, Bandar Abbas anchorage.
- Representative tanker sequences normalized into the drawer: TAILOGY, AVA 6, LONGEVITY 7, PADMANABH, BARAKAALE I, and CRAVE.

## Interesting Insights

1. The operating picture is not empty. The DANTI snapshot shows dense commercial traffic around UAE/Oman/Iran anchorages, while PortWatch and official advisories explain why a chokepoint disruption would matter.

2. The strongest current evidence is collection and context, not intent. Sentinel-1/Sentinel-2/Sentinel Hub show collection availability; MARAD/NAVAREA/UKMTO/OFAC show risk context; GFW and DANTI help with identity/source enrichment.

3. The best vessel-specific lead is identity integrity, not movement. OFAC lists Iranian tanker entities, and GFW shows identity-history complexity for `HUGE`/IMO `9357183`, including a current IRN identity and historical MMSI/name changes. That supports entity-risk and custody review, not a hostile-intent claim.

4. Recent GFW dark-gap candidates exist, but they are not proven hostile. The MARAD-overlap cache has five recent intentional-disabling rows from April, with two both-ends-inside and two one-end-inside the advisory corridor. None is OFAC-listed in the cache.

## Do Not Say

- Do not say we have verified live Hormuz AIS behavior from the last 72 hours.
- Do not say the April 2 DANTI/MarineTraffic snapshot proves May 1-3 vessel movement.
- Do not say GFW identity history proves kinematics or intent.
- Do not say Shodan is vessel behavior evidence; it is infra-only.
- Do not say GDELT is live right now; the current cache is rate-limited/fallback.

## Say This Instead

> “The last 72 hours give us current satellite collection, official warning context, sanctions/entity risk, and fresh identity-source corroboration. The stronger ship-density layer is archived DANTI/MarineTraffic data, so the system keeps it as context and refuses to turn it into intent. That is the point: preserve custody, separate source classes, and request second-source collection instead of overclaiming.”
