# Strait of Hormuz Live Cache

This directory stores shareable cached data pulled from live/public sources so teammates can develop without API keys.

Do not store API keys here. The refresh script reads secrets from ignored `config.ini`.

Refresh locally:

```sh
node scripts/cache-hormuz-sources.mjs
```

Fast refresh for demo-safe sources:

```sh
node scripts/cache-hormuz-sources.mjs --profile=fast
```

Slow refresh for streaming/heavy sources:

```sh
node scripts/cache-hormuz-sources.mjs --profile=slow
```

Danti-only refresh:

```sh
node scripts/cache-hormuz-sources.mjs --profile=danti
```

ACLED-only refresh:

```sh
node scripts/cache-hormuz-sources.mjs --profile=acled
```

Fixture fallbacks for blocked/empty providers:

```sh
node scripts/cache-hormuz-sources.mjs --profile=fallbacks
```

Expected source files:

- `aisstream-hormuz-sample.json` — bounded AISstream WebSocket sample.
- `acled-auth.json` — ACLED OAuth credential check with tokens stripped.
- `acled-hormuz-events.json` — ACLED-shaped regional event context; fixture fallback when live read is blocked.
- `foundry-ontologies.json` — Foundry token reachability and visible ontology metadata, when access allows it.
- `danti-auth.json` — Danti OIDC/browser-login credential check with tokens stripped.
- `danti-hormuz-query.json` — Danti natural-language query result for Strait of Hormuz context.
- `exa-hormuz-osint.json` — Exa web/news search results for Hormuz maritime context.
- `gfw-vessel-search-irisl.json` — lightweight Global Fishing Watch Vessel API key/capability check.
- `gfw-hormuz-gaps.json` — Global Fishing Watch AIS-off/gap event query.
- `gfw-hormuz-port-visits.json` — Global Fishing Watch port visit event query.
- `gfw-hormuz-loitering.json` — Global Fishing Watch loitering event query.
- `shodan-api-info.json` — Shodan key/account capability check.
- `shodan-maritime-ais.json` — Shodan AIS-related infrastructure search.
- `censys-maritime-infrastructure.json` — Censys Platform maritime/AIS/NMEA infrastructure search; infrastructure-only context. Free-plan Platform accounts have no organization ID, so this is expected to use fixture fallback until an org UUID/API entitlement is available.
- `opensanctions-hormuz-maritime-entities.json` — OpenSanctions searches for maritime/sanctions entities relevant to Hormuz.
- `copernicus-cdse-auth.json` — CDSE credential check with tokens stripped.
- `copernicus-cdse-sentinel1-stac.json` — recent Sentinel-1 GRD STAC metadata over Hormuz.
- `copernicus-cdse-sentinel2-stac.json` — recent Sentinel-2 L2A STAC metadata over Hormuz.
- `sentinelhub-auth.json` — Sentinel Hub OAuth check with tokens stripped.
- `sentinelhub-hormuz-sentinel2-truecolor.png` — Sentinel-2 true-color demo chip when Process API succeeds.
- `sentinelhub-hormuz-sentinel1-vv.png` — Sentinel-1 VV demo chip when Process API succeeds.
- `copernicus-marine-credential-check.json` — Copernicus Marine credential/toolbox check.
- `copernicus-marine-hormuz-currents.nc` — small Copernicus Marine surface-current sample near Hormuz, when subset succeeds.
- `copernicus-marine-hormuz-currents.metadata.json` — request/response metadata for the currents sample.
- `navarea-ix-warnings.html` — public NAVAREA IX warning page snapshot.
- `ukmto-home.html` — public UKMTO page snapshot.
- `overpass-hormuz-maritime.json` — OSM/Overpass maritime context.
- `overpass-hormuz-maritime.attempts.json` — Overpass endpoint fallback attempt summary.
- `manifest.json` — latest fast/all cache generation summary.
- `manifest-fast.json` — fast-source cache generation summary.
- `manifest-slow.json` — slow-source cache generation summary.
- `manifest-danti.json` — Danti-only cache generation summary.
- `manifest-fallbacks.json` — fixture-fallback cache generation summary.
