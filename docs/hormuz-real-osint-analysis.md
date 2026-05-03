# Hormuz Real OSINT Analysis

Generated May 3, 2026 from `fixtures/maritime/live-cache/`.

## What Was Collected

- `navarea-ix-warning-documents.json`: 30 full-text NAVAREA IX warning documents.
- `ukmto-product-pages.json`: UKMTO home, recent incidents, warnings, advisories, JMIC, CMF, and industry product pages.
- `marad-msci-advisories.json`: 12 MARAD MSCI advisory pages, including active and historical Hormuz/Persian Gulf/Gulf of Oman advisories.
- `ofac-maritime-sanctions-matches.json`: filtered official OFAC SDN and consolidated sanctions CSV rows for maritime/Iran/Hormuz terms.
- `stanford-rfi-hormuz-probe.json`: GNSS interference probe attempts; no JSON files reached through probed public URL patterns.
- `paid-manual-osint-source-plan.json`: gated/manual sources still required for vessel behavior and registry-grade ownership.

## Findings

1. MARAD 2026-004 is the strongest current official source for threat context.
   - It is active for the Persian Gulf, Strait of Hormuz, and Gulf of Oman from March 13 to September 9, 2026.
   - It identifies Iranian attacks on commercial vessels as the threat type.
   - It explicitly includes direct missile attacks, armed UAVs, armed USVs, small-boat/helicopter boarding history, VHF/email manipulation risk, and significant GNSS interference/spoofing/jamming.
   - Demo implication: use MARAD as authoritative regional-threat context, not as proof that a specific vessel is hostile.

2. NAVAREA IX full-text warnings show concrete maritime hazards in/near Hormuz, but not a new last-72-hour Hormuz incident.
   - April 9: West Bukha oil field RACON in the Strait of Hormuz reported unlit.
   - April 1: container ship `SAFEEN PRESTIGE` reported sunk near Ras Makhruq with remnant oil spill.
   - March 12: bulk carrier reported involved in a security incident causing a fire in the Strait of Hormuz.
   - February 28: broader Gulf-region military conflict warning covering Persian Gulf, Gulf of Oman, North Arabian Sea, and Strait of Hormuz.
   - Demo implication: these are operational context and historical hazard markers, not fresh 72-hour vessel behavior.

3. UKMTO open pages provide reporting/product structure, but the fetched `recent-incidents` page currently reports 0 incidents.
   - UKMTO remains important as the authoritative reporting channel.
   - The open pages do not currently provide a rich machine-readable incident list.
   - Demo implication: show UKMTO as a cached source/channel, not as a source proving a new incident.

4. OFAC gives strong entity-risk enrichment.
   - The filtered official CSV cache found 276 maritime/Iran-relevant rows across SDN and consolidated sanctions data.
   - Rows include sanctioned Iranian tanker and shipping entities/vessels, including many linked to National Iranian Tanker Company.
   - Demo implication: useful for identity/entity risk once a vessel name, IMO, MMSI, manager, owner, or operator is known. It does not establish live location or behavior.

5. GNSS/RF evidence is partially supported, but still needs better measurements.
   - MARAD 2026-004 is enough to support the claim that GNSS interference/spoofing/jamming is an operational concern in the area.
   - Stanford RFI public data was not directly reachable through the probed URL patterns; use `rfi-fileparser` or ADS-B Exchange/OpenSky access next.
   - Demo implication: the system can justify asking for second-source navigation integrity checks, but should not claim measured local jamming from our cache yet.

## Bottom Line

The real OSINT supports a high-risk Hormuz watchfloor narrative: official U.S. maritime advisories, full NAVAREA warning text, sanctions records, and recent media/satellite context all point to a contested maritime operating environment. The missing layer is still vessel behavior: we need licensed AIS history or manual exports to make specific claims about a vessel's movement, dark gap, or intent.

## Highest-Value Next Data

1. Spire/exactEarth/MarineTraffic/Kpler/Signal Ocean export for the last 72 hours over the Persian Gulf, Strait of Hormuz, and Gulf of Oman.
2. Equasis or IMO GISIS export for any vessels named by AIS/GFW/OFAC.
3. Stanford RFI via `rfi-fileparser`, or ADS-B Exchange/OpenSky access, for GNSS integrity corroboration.
4. UKMTO/JMIC/CMF PDF/product downloads if the site exposes current product file links after login or subscription.
