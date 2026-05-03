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

GDELT-only refresh:

```sh
node scripts/cache-hormuz-sources.mjs --profile=gdelt
```

PortWatch-only refresh:

```sh
node scripts/cache-hormuz-sources.mjs --profile=portwatch
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
- `gdelt-hormuz-doc20-artlist.json` — GDELT DOC 2.0 no-key article list for Hormuz regional media context.
- `portwatch-hormuz-chokepoint-transits.json` — IMF PortWatch no-key ArcGIS rows from `Daily_Chokepoints_Data` for Hormuz (`portid='chokepoint6'`).
- `portwatch-hormuz-disruptions.json` — IMF PortWatch no-key disruption events for Hormuz and nearby Gulf ports/chokepoints.
- `gfw-vessel-search-irisl.json` — lightweight Global Fishing Watch Vessel API key/capability check.
- `gfw-hormuz-gaps.json` — Global Fishing Watch AIS-off/gap event query.
- `gfw-hormuz-port-visits.json` — Global Fishing Watch port visit event query.
- `gfw-hormuz-loitering.json` — Global Fishing Watch loitering event query.
- `shodan-api-info.json` — Shodan key/account capability check.
- `shodan-maritime-ais.json` — Shodan AIS infrastructure context. Resolves a curated set of public AIS-aggregator hostnames (AISHub, MarineTraffic, VesselFinder, aprs.fi) via DNS and queries Shodan InternetDB (`https://internetdb.shodan.io/{ip}`) — free, unauthenticated, replaces the paid `/shodan/host/search` endpoint that returns 403 for free-tier API keys. Infrastructure-only; the guard's Layer 6 forbids these records from supporting kinematics or intent claims.
- `censys-maritime-infrastructure.json` — Censys maritime/AIS/NMEA infrastructure search; infrastructure-only context. The cache prefers Censys Search v2 when `CENSYS_API_ID` + `CENSYS_API_SECRET` are set (free-tier path; HTTP Basic auth on `search.censys.io/api/v2/hosts/search`). Otherwise it tries Platform v3 with `CENSYS_API_TOKEN` + `CENSYS_ORGANIZATION_ID`. Falls back to fixture rows when neither credential set is available.
- `opensanctions-hormuz-maritime-entities.json` — OpenSanctions searches for maritime/sanctions entities relevant to Hormuz.
- `copernicus-cdse-auth.json` — CDSE credential check with tokens stripped.
- `copernicus-cdse-sentinel1-stac.json` — recent Sentinel-1 GRD STAC metadata over Hormuz.
- `copernicus-cdse-sentinel2-stac.json` — recent Sentinel-2 L2A STAC metadata over Hormuz.
- `sentinelhub-auth.json` — Sentinel Hub OAuth check with tokens stripped.
- `sentinelhub-hormuz-sentinel2-truecolor.png` — Sentinel-2 true-color demo chip when Process API succeeds.
- `sentinelhub-hormuz-sentinel1-vv.png` — Sentinel-1 VV demo chip when Process API succeeds.
- `copernicus-marine-credential-check.json` — Copernicus Marine credential/toolbox check.
- `copernicus-marine-hormuz-currents.nc` — small Copernicus Marine surface-current sample near Hormuz, when the `copernicusmarine subset` CLI is installed and succeeds.
- `copernicus-marine-hormuz-currents.metadata.json` — currents sample. When the Copernicus Marine CLI is unavailable or the subset fails, the cache falls back to Open-Meteo Marine (`https://marine-api.open-meteo.com/v1/marine`) — free, unauthenticated, returns hourly `ocean_current_velocity`/`direction` at point queries. The fallback path emits `data_provider: "OPEN_METEO_MARINE"` and converts km/h → m/s into the same `(uo_mps, vo_mps)` shape downstream consumers expect.
- `navarea-ix-warnings.html` — public NAVAREA IX warning page snapshot.
- `ukmto-home.html` — public UKMTO page snapshot.
- `overpass-hormuz-maritime.json` — OSM/Overpass maritime context.
- `overpass-hormuz-maritime.attempts.json` — Overpass endpoint fallback attempt summary.
- `manifest.json` — latest fast/all cache generation summary.
- `manifest-fast.json` — fast-source cache generation summary.
- `manifest-slow.json` — slow-source cache generation summary.
- `manifest-danti.json` — Danti-only cache generation summary.
- `manifest-fallbacks.json` — fixture-fallback cache generation summary.
