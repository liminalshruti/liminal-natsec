# Strait of Hormuz Live Cache

This directory stores shareable cached data pulled from live/public sources so teammates can develop without API keys.

Do not store API keys here. The refresh script reads secrets from ignored `config.ini`.

Refresh locally:

```sh
node scripts/cache-hormuz-sources.mjs
```

Expected source files:

- `aisstream-hormuz-sample.json` — bounded AISstream WebSocket sample.
- `gfw-hormuz-gaps.json` — Global Fishing Watch AIS-off/gap event query.
- `gfw-hormuz-port-visits.json` — Global Fishing Watch port visit event query.
- `gfw-hormuz-loitering.json` — Global Fishing Watch loitering event query.
- `navarea-ix-warnings.html` — public NAVAREA IX warning page snapshot.
- `ukmto-home.html` — public UKMTO page snapshot.
- `overpass-hormuz-maritime.json` — OSM/Overpass maritime context.
- `manifest.json` — cache generation summary.
