/**
 * Watchfloor OSINT signal feed — flatten every cached source in
 * `fixtures/maritime/live-cache/` into a single newest-first stream the
 * substrate panel can render as one list. Each source has a different raw
 * shape; this module owns the per-source adapters that normalize them into
 * one `OsintSignal` row type.
 *
 * Adapters are defensive: a try/catch around each one means a fixture
 * refresh that drifts a single source's shape never blanks the whole feed.
 * Per-source caps keep one chatty source from dominating the list.
 *
 * Imports are static JSON imports (Vite/Node JSON modules), same pattern as
 * `app/src/components/MapLayers.tsx` and `app/src/lib/hormuzIntel.ts`. The
 * data is bundled at build time and parsed once at module load; the result
 * of `loadOsintSignals()` is memoized at module scope.
 */

import aisstreamSample from "../../../fixtures/maritime/live-cache/aisstream-hormuz-sample.json" with { type: "json" };
import exaOsint from "../../../fixtures/maritime/live-cache/exa-hormuz-osint.json" with { type: "json" };
import gdeltArtlist from "../../../fixtures/maritime/live-cache/gdelt-hormuz-doc20-artlist.json" with { type: "json" };
import gfwGaps from "../../../fixtures/maritime/live-cache/gfw-hormuz-gaps.json" with { type: "json" };
import gfwLoitering from "../../../fixtures/maritime/live-cache/gfw-hormuz-loitering.json" with { type: "json" };
import gfwPortVisits from "../../../fixtures/maritime/live-cache/gfw-hormuz-port-visits.json" with { type: "json" };
import maradAdvisories from "../../../fixtures/maritime/live-cache/marad-msci-advisories.json" with { type: "json" };
import navareaDocuments from "../../../fixtures/maritime/live-cache/navarea-ix-warning-documents.json" with { type: "json" };
import ofacMatches from "../../../fixtures/maritime/live-cache/ofac-maritime-sanctions-matches.json" with { type: "json" };
import portwatchTransits from "../../../fixtures/maritime/live-cache/portwatch-hormuz-chokepoint-transits.json" with { type: "json" };
import portwatchDisruptions from "../../../fixtures/maritime/live-cache/portwatch-hormuz-disruptions.json" with { type: "json" };
import sentinel1Stac from "../../../fixtures/maritime/live-cache/copernicus-cdse-sentinel1-stac.json" with { type: "json" };
import sentinel2Stac from "../../../fixtures/maritime/live-cache/copernicus-cdse-sentinel2-stac.json" with { type: "json" };
import shodanAis from "../../../fixtures/maritime/live-cache/shodan-maritime-ais.json" with { type: "json" };

export type OsintCategory =
  | "news"
  | "warnings"
  | "sanctions"
  | "vessel-events"
  | "imagery"
  | "infra";

export interface OsintSignal {
  id: string;
  source: string;
  sourceLabel: string;
  category: OsintCategory;
  title: string;
  detail?: string;
  timestamp?: string;
  url?: string;
  badges?: string[];
}

const PER_SOURCE_CAP = 40;
const MAX_SIGNALS = 220;

const warned = new Set<string>();
function warnOnce(source: string, error: unknown): void {
  if (warned.has(source)) return;
  warned.add(source);
  // eslint-disable-next-line no-console
  console.warn(`[osintSignals] adapter for ${source} failed; skipping`, error);
}

function safeISO(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

function firstLine(text: string): string {
  const newline = text.search(/[\n\r]/);
  return (newline === -1 ? text : text.slice(0, newline)).trim();
}

/** Run an adapter with shape-error containment. */
function runAdapter(source: string, fn: () => OsintSignal[]): OsintSignal[] {
  try {
    return fn();
  } catch (error) {
    warnOnce(source, error);
    return [];
  }
}

// ─── Adapters ──────────────────────────────────────────────────────────────

interface ExaResult {
  id?: string;
  url?: string;
  title?: string;
  publishedDate?: string;
  author?: string;
  summary?: string;
}

function adaptExa(): OsintSignal[] {
  const results = (exaOsint as { body?: { results?: ExaResult[] } }).body?.results ?? [];
  const out: OsintSignal[] = [];
  for (const r of results.slice(0, PER_SOURCE_CAP)) {
    const url = r.url ?? r.id;
    const title = r.title?.trim();
    if (!title) continue;
    const detailRaw = (r.summary ?? "").replace(/^Summary:\s*/i, "").trim();
    const detail = detailRaw ? clip(firstLine(detailRaw), 220) : undefined;
    out.push({
      id: `exa:${r.id ?? r.url ?? title}`,
      source: "EXA",
      sourceLabel: "EXA · web",
      category: "news",
      title,
      detail,
      timestamp: safeISO(r.publishedDate),
      url,
      badges: r.author ? [r.author] : undefined
    });
  }
  return out;
}

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
}

function gdeltSeendateToISO(seendate: string | undefined): string | undefined {
  if (typeof seendate !== "string" || seendate.length < 8) return undefined;
  // Format: YYYYMMDDhhmmss (UTC).
  const m = seendate.match(/^(\d{4})(\d{2})(\d{2})(?:(\d{2})(\d{2})(\d{2}))?$/);
  if (!m) return undefined;
  const [, y, mo, d, h = "00", mi = "00", s = "00"] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? iso : undefined;
}

function adaptGdelt(): OsintSignal[] {
  const articles = (gdeltArtlist as { body?: { articles?: GdeltArticle[] } }).body?.articles ?? [];
  const out: OsintSignal[] = [];
  for (const a of articles.slice(0, PER_SOURCE_CAP)) {
    const title = a.title?.trim();
    if (!title) continue;
    const badges: string[] = [];
    if (a.domain) badges.push(a.domain);
    if (a.sourcecountry) badges.push(a.sourcecountry);
    out.push({
      id: `gdelt:${a.url ?? title}`,
      source: "GDELT",
      sourceLabel: "GDELT · news",
      category: "news",
      title,
      timestamp: gdeltSeendateToISO(a.seendate),
      url: a.url,
      badges: badges.length > 0 ? badges : undefined
    });
  }
  return out;
}

interface MaradAdvisory {
  url?: string;
  title?: string;
  list_title?: string;
  geographic_location?: string;
  threat_type?: string;
  effective_date?: string;
  status_text?: string;
  excerpt?: string;
  matched_terms?: string[];
}

function maradEffectiveStartISO(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  // "MM/DD/YYYY - MM/DD/YYYY" → take the first date as start.
  const m = value.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return undefined;
  const [, mo, d, y] = m;
  const iso = `${y}-${mo}-${d}T00:00:00Z`;
  return Number.isFinite(Date.parse(iso)) ? iso : undefined;
}

function adaptMarad(): OsintSignal[] {
  const advisories = (maradAdvisories as { advisories?: MaradAdvisory[] }).advisories ?? [];
  const out: OsintSignal[] = [];
  for (const a of advisories.slice(0, PER_SOURCE_CAP)) {
    const title = (a.title ?? a.list_title)?.trim();
    if (!title) continue;
    const detail = a.excerpt ? clip(a.excerpt.replace(/\s+/g, " ").trim(), 220) : undefined;
    const badges: string[] = [];
    if (a.geographic_location) badges.push(a.geographic_location);
    if (a.status_text) badges.push(a.status_text);
    out.push({
      id: `marad:${a.url ?? title}`,
      source: "MARAD",
      sourceLabel: "MARAD MSCI · advisory",
      category: "warnings",
      title: clip(title, 160),
      detail,
      timestamp: maradEffectiveStartISO(a.effective_date),
      url: a.url,
      badges: badges.length > 0 ? badges : undefined
    });
  }
  return out;
}

interface NavareaDocument {
  url?: string;
  text?: string;
  matched_terms?: string[];
}

function navareaTextToISO(text: string | undefined): string | undefined {
  if (typeof text !== "string") return undefined;
  // Leading "DDHHMM UTC MMM YY" (e.g. "031500 UTC MAY 26").
  const m = text.match(/^(\d{2})(\d{2})(\d{2})\s+UTC\s+([A-Z]{3})\s+(\d{2})/);
  if (!m) return undefined;
  const [, dd, hh, mm, monStr, yy] = m;
  const months: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
  };
  const mon = months[monStr];
  if (!mon) return undefined;
  const yearFull = `20${yy}`;
  const iso = `${yearFull}-${mon}-${dd}T${hh}:${mm}:00Z`;
  return Number.isFinite(Date.parse(iso)) ? iso : undefined;
}

function navareaTitle(text: string | undefined): string | undefined {
  if (typeof text !== "string") return undefined;
  // Pick the first NAVAREA segment header (e.g. "NAVAREA IX 147/26 NORTHERN GULF KUWAIT")
  // and trim everything up to the first multi-space gap that follows.
  const head = text.replace(/\s+/g, " ").trim();
  const idMatch = head.match(/NAVAREA\s+\S+\s+(\d+\/\d+)/);
  const region = head.split(/(CHARTS?|MARINERS|VESSELS|FOLLOWING|POSSIBLE)/)[0].trim();
  if (idMatch) {
    const after = region.split(idMatch[1])[1]?.trim() ?? "";
    return clip(`${idMatch[1]} · ${after || "advisory"}`, 140);
  }
  return clip(region, 140);
}

function adaptNavarea(): OsintSignal[] {
  const docs = (navareaDocuments as { documents?: NavareaDocument[] }).documents ?? [];
  const out: OsintSignal[] = [];
  for (const d of docs.slice(0, PER_SOURCE_CAP)) {
    const text = d.text;
    const title = navareaTitle(text);
    if (!title) continue;
    const detail = text ? clip(text.replace(/\s+/g, " ").trim(), 220) : undefined;
    out.push({
      id: `navarea:${d.url ?? title}`,
      source: "NAVAREA_IX",
      sourceLabel: "NAVAREA IX · warning",
      category: "warnings",
      title,
      detail,
      timestamp: navareaTextToISO(text),
      url: d.url,
      badges: d.matched_terms && d.matched_terms.length > 0 ? d.matched_terms : undefined
    });
  }
  return out;
}

interface OfacMatch {
  raw_csv?: string;
  matched_terms?: string[];
}
interface OfacRecord {
  name?: string;
  matches?: OfacMatch[];
}

function ofacEntityFromCsv(raw: string): { name: string; detail?: string } {
  const m = raw.match(/^\d+,\s*"([^"]+)"\s*,\s*"?([^",]*)"?/);
  if (!m) return { name: raw.slice(0, 80) };
  const name = m[1];
  const kindRaw = (m[2] ?? "").trim();
  const detail = kindRaw && kindRaw !== "-0-" ? kindRaw : undefined;
  return { name, detail };
}

function adaptOfac(): OsintSignal[] {
  const records = (ofacMatches as { records?: OfacRecord[]; generated_at?: string }).records ?? [];
  const generatedAt = (ofacMatches as { generated_at?: string }).generated_at;
  const ts = safeISO(generatedAt);
  const out: OsintSignal[] = [];
  let perSource = 0;
  for (const rec of records) {
    const datasetLabel = (rec.name ?? "").toUpperCase() || "OFAC";
    for (const match of rec.matches ?? []) {
      if (perSource >= PER_SOURCE_CAP) break;
      const raw = match.raw_csv;
      if (!raw) continue;
      const { name, detail } = ofacEntityFromCsv(raw);
      if (!name) continue;
      const badges: string[] = [];
      if (match.matched_terms) badges.push(...match.matched_terms);
      out.push({
        id: `ofac:${datasetLabel}:${name}:${perSource}`,
        source: "OFAC",
        sourceLabel: `OFAC · ${datasetLabel.toLowerCase()}`,
        category: "sanctions",
        title: clip(name, 140),
        detail,
        timestamp: ts,
        badges: badges.length > 0 ? badges : undefined
      });
      perSource += 1;
    }
    if (perSource >= PER_SOURCE_CAP) break;
  }
  return out;
}

interface GfwEntry {
  id?: string;
  start?: string;
  end?: string;
  vessel?: { name?: string | null; ssvid?: string; flag?: string };
  gap?: { intentionalDisabling?: boolean; durationHours?: number | string };
  loitering?: { totalTimeHours?: number; averageSpeedKnots?: number };
  port_visit?: { startAnchorage?: { name?: string; flag?: string } };
}

function adaptGfwGaps(): OsintSignal[] {
  const entries = (gfwGaps as { body?: { entries?: GfwEntry[] } }).body?.entries ?? [];
  const out: OsintSignal[] = [];
  for (const e of entries.slice(0, PER_SOURCE_CAP)) {
    const vessel = e.vessel?.name ?? e.vessel?.ssvid ?? "unknown vessel";
    const dur = typeof e.gap?.durationHours === "number"
      ? `${e.gap.durationHours.toFixed(1)} h`
      : typeof e.gap?.durationHours === "string"
        ? `${Number.parseFloat(e.gap.durationHours).toFixed(1)} h`
        : "?";
    const intentional = e.gap?.intentionalDisabling;
    const title = `AIS gap · ${vessel} · ${dur}`;
    const badges: string[] = [];
    if (e.vessel?.flag) badges.push(e.vessel.flag);
    if (intentional) badges.push("intentional disable");
    out.push({
      id: `gfw-gap:${e.id ?? `${vessel}:${e.start ?? ""}`}`,
      source: "GFW_GAPS",
      sourceLabel: "GFW · AIS gap",
      category: "vessel-events",
      title,
      timestamp: safeISO(e.start),
      badges: badges.length > 0 ? badges : undefined
    });
  }
  return out;
}

function adaptGfwLoitering(): OsintSignal[] {
  const entries = (gfwLoitering as { body?: { entries?: GfwEntry[] } }).body?.entries ?? [];
  const out: OsintSignal[] = [];
  for (const e of entries.slice(0, PER_SOURCE_CAP)) {
    const vessel = e.vessel?.name ?? e.vessel?.ssvid ?? "unknown vessel";
    const totalH = typeof e.loitering?.totalTimeHours === "number"
      ? `${e.loitering.totalTimeHours.toFixed(0)} h`
      : "?";
    const title = `Loitering · ${vessel} · ${totalH}`;
    const badges: string[] = [];
    if (e.vessel?.flag) badges.push(e.vessel.flag);
    out.push({
      id: `gfw-loiter:${e.id ?? `${vessel}:${e.start ?? ""}`}`,
      source: "GFW_LOITERING",
      sourceLabel: "GFW · loitering",
      category: "vessel-events",
      title,
      timestamp: safeISO(e.start),
      badges: badges.length > 0 ? badges : undefined
    });
  }
  return out;
}

function adaptGfwPortVisits(): OsintSignal[] {
  const entries = (gfwPortVisits as { body?: { entries?: GfwEntry[] } }).body?.entries ?? [];
  const out: OsintSignal[] = [];
  for (const e of entries.slice(0, PER_SOURCE_CAP)) {
    const vessel = e.vessel?.name ?? e.vessel?.ssvid ?? "unknown vessel";
    const port = e.port_visit?.startAnchorage?.name ?? "unknown port";
    const title = `Port visit · ${vessel} → ${port}`;
    const badges: string[] = [];
    const portFlag = e.port_visit?.startAnchorage?.flag;
    if (portFlag) badges.push(portFlag);
    if (e.vessel?.flag && e.vessel.flag !== portFlag) badges.push(`flag ${e.vessel.flag}`);
    out.push({
      id: `gfw-port:${e.id ?? `${vessel}:${e.start ?? ""}`}`,
      source: "GFW_PORT_VISITS",
      sourceLabel: "GFW · port visit",
      category: "vessel-events",
      title,
      timestamp: safeISO(e.start),
      badges: badges.length > 0 ? badges : undefined
    });
  }
  return out;
}

interface PortwatchTransit {
  date?: string;
  portname?: string;
  n_total?: number;
  n_tanker?: number;
  n_container?: number;
  n_dry_bulk?: number;
  capacity?: number;
  ObjectId?: number;
}

function adaptPortwatchTransits(): OsintSignal[] {
  const features = (portwatchTransits as {
    body?: { features?: { attributes?: PortwatchTransit }[] };
  }).body?.features ?? [];
  const out: OsintSignal[] = [];
  for (const f of features.slice(0, PER_SOURCE_CAP)) {
    const a = f.attributes;
    if (!a?.date) continue;
    const total = a.n_total ?? 0;
    const tanker = a.n_tanker ?? 0;
    const container = a.n_container ?? 0;
    const drybulk = a.n_dry_bulk ?? 0;
    const port = a.portname ?? "Strait of Hormuz";
    const title = `Chokepoint transits · ${port} · ${total} ships`;
    const detail = `tanker ${tanker} · container ${container} · dry-bulk ${drybulk} · capacity ${(a.capacity ?? 0).toLocaleString()} dwt`;
    out.push({
      id: `portwatch-transit:${a.ObjectId ?? a.date}`,
      source: "PORTWATCH",
      sourceLabel: "PortWatch · transits",
      category: "vessel-events",
      title,
      detail,
      timestamp: safeISO(`${a.date}T00:00:00Z`)
    });
  }
  return out;
}

interface PortwatchDisruption {
  eventid?: number;
  eventname?: string;
  htmlname?: string;
  htmldescription?: string;
  alertlevel?: string;
  fromdate?: number;
  todate?: number | null;
  affectedports?: string;
}

function adaptPortwatchDisruptions(): OsintSignal[] {
  const features = (portwatchDisruptions as {
    body?: { features?: { attributes?: PortwatchDisruption }[] };
  }).body?.features ?? [];
  const out: OsintSignal[] = [];
  for (const f of features.slice(0, PER_SOURCE_CAP)) {
    const a = f.attributes;
    if (!a) continue;
    const title = a.htmlname ?? a.eventname ?? "PortWatch disruption";
    const detail = a.htmldescription ? clip(a.htmldescription.trim(), 220) : undefined;
    const ts = typeof a.fromdate === "number" && Number.isFinite(a.fromdate)
      ? new Date(a.fromdate).toISOString()
      : undefined;
    const badges: string[] = [];
    if (a.alertlevel) badges.push(a.alertlevel);
    if (a.affectedports) badges.push(a.affectedports);
    out.push({
      id: `portwatch-disruption:${a.eventid ?? title}`,
      source: "PORTWATCH",
      sourceLabel: "PortWatch · disruption",
      category: "warnings",
      title: clip(title, 160),
      detail,
      timestamp: ts,
      badges: badges.length > 0 ? badges : undefined
    });
  }
  return out;
}

interface AisMessage {
  MessageType?: string;
  MetaData?: {
    MMSI?: number | string;
    ShipName?: string;
    time_utc?: string;
    latitude?: number;
    longitude?: number;
  };
}

function adaptAisstream(): OsintSignal[] {
  const messages = (aisstreamSample as { messages?: AisMessage[] }).messages ?? [];
  const fixtureMode = (aisstreamSample as { fixture_mode?: boolean }).fixture_mode === true;
  const out: OsintSignal[] = [];
  for (const m of messages.slice(0, PER_SOURCE_CAP)) {
    const meta = m.MetaData;
    if (!meta?.MMSI) continue;
    const ship = meta.ShipName?.trim() || "unknown";
    const title = `AIS · ${ship} · MMSI ${meta.MMSI}`;
    const detail = typeof meta.latitude === "number" && typeof meta.longitude === "number"
      ? `${m.MessageType ?? "PositionReport"} @ ${meta.latitude.toFixed(3)}, ${meta.longitude.toFixed(3)}`
      : m.MessageType;
    const badges = fixtureMode ? ["fixture sample"] : undefined;
    out.push({
      id: `aisstream:${meta.MMSI}:${meta.time_utc ?? ""}`,
      source: "AISSTREAM",
      sourceLabel: "AISstream · message",
      category: "vessel-events",
      title,
      detail,
      timestamp: safeISO(meta.time_utc),
      badges
    });
  }
  return out;
}

interface StacFeature {
  id?: string;
  properties?: { datetime?: string; "platform"?: string };
  links?: { rel?: string; href?: string }[];
}

function stacItemUrl(feature: StacFeature): string | undefined {
  const selfLink = feature.links?.find((l) => l.rel === "self");
  return selfLink?.href;
}

function adaptSentinel(label: string, mission: string, stac: unknown): OsintSignal[] {
  const features = (stac as { body?: { features?: StacFeature[] } }).body?.features ?? [];
  const out: OsintSignal[] = [];
  for (const f of features.slice(0, PER_SOURCE_CAP)) {
    if (!f.id) continue;
    const title = `${mission} · ${clip(f.id, 96)}`;
    const platform = f.properties?.platform;
    const detail = platform ? `platform ${platform}` : undefined;
    out.push({
      id: `sentinel:${f.id}`,
      source: label,
      sourceLabel: `Copernicus · ${mission}`,
      category: "imagery",
      title,
      detail,
      timestamp: safeISO(f.properties?.datetime),
      url: stacItemUrl(f)
    });
  }
  return out;
}

interface ShodanMatch {
  ip_str?: string;
  hostnames?: string[];
  ports?: number[];
  cpes?: string[];
  tags?: string[];
  maritime_context_hostname?: string;
  timestamp?: string;
}

function adaptShodan(): OsintSignal[] {
  const matches = (shodanAis as { body?: { matches?: ShodanMatch[] } }).body?.matches ?? [];
  const out: OsintSignal[] = [];
  for (const m of matches.slice(0, PER_SOURCE_CAP)) {
    const host = m.maritime_context_hostname ?? m.hostnames?.[0] ?? m.ip_str;
    if (!host) continue;
    const ports = (m.ports ?? []).slice(0, 6).join(", ");
    const title = `Infra · ${host}`;
    const detail = ports ? `ports ${ports}${(m.ports ?? []).length > 6 ? "…" : ""}` : undefined;
    const badges: string[] = [];
    if (m.tags) badges.push(...m.tags.slice(0, 3));
    out.push({
      id: `shodan:${m.ip_str ?? host}:${m.maritime_context_hostname ?? ""}`,
      source: "SHODAN",
      sourceLabel: "Shodan · AIS infra",
      category: "infra",
      title,
      detail,
      timestamp: safeISO(m.timestamp),
      badges: badges.length > 0 ? badges : undefined
    });
  }
  return out;
}

// ─── Loader ────────────────────────────────────────────────────────────────

let memo: OsintSignal[] | null = null;

export function loadOsintSignals(): OsintSignal[] {
  if (memo) return memo;

  const all: OsintSignal[] = [
    ...runAdapter("EXA", adaptExa),
    ...runAdapter("GDELT", adaptGdelt),
    ...runAdapter("MARAD", adaptMarad),
    ...runAdapter("NAVAREA_IX", adaptNavarea),
    ...runAdapter("OFAC", adaptOfac),
    ...runAdapter("GFW_GAPS", adaptGfwGaps),
    ...runAdapter("GFW_LOITERING", adaptGfwLoitering),
    ...runAdapter("GFW_PORT_VISITS", adaptGfwPortVisits),
    ...runAdapter("PORTWATCH_TRANSITS", adaptPortwatchTransits),
    ...runAdapter("PORTWATCH_DISRUPTIONS", adaptPortwatchDisruptions),
    ...runAdapter("AISSTREAM", adaptAisstream),
    ...runAdapter("SENTINEL_1", () => adaptSentinel("SENTINEL_1", "Sentinel-1 SAR", sentinel1Stac)),
    ...runAdapter("SENTINEL_2", () => adaptSentinel("SENTINEL_2", "Sentinel-2 truecolor", sentinel2Stac)),
    ...runAdapter("SHODAN", adaptShodan)
  ];

  // De-dupe by id (sources occasionally re-emit the same record).
  const byId = new Map<string, OsintSignal>();
  for (const s of all) {
    if (!byId.has(s.id)) byId.set(s.id, s);
  }
  const deduped = Array.from(byId.values());

  // Sort newest-first; rows missing a timestamp fall to the bottom.
  deduped.sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
    const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
    if (tb !== ta) return tb - ta;
    return a.source.localeCompare(b.source);
  });

  memo = deduped.slice(0, MAX_SIGNALS);
  return memo;
}

export function categoryCounts(signals: readonly OsintSignal[]): Record<OsintCategory | "all", number> {
  const counts: Record<OsintCategory | "all", number> = {
    all: signals.length,
    news: 0,
    warnings: 0,
    sanctions: 0,
    "vessel-events": 0,
    imagery: 0,
    infra: 0
  };
  for (const s of signals) counts[s.category] += 1;
  return counts;
}

export const OSINT_CATEGORY_ORDER: readonly (OsintCategory | "all")[] = [
  "all",
  "news",
  "warnings",
  "sanctions",
  "vessel-events",
  "imagery",
  "infra"
] as const;

export const OSINT_CATEGORY_LABELS: Record<OsintCategory | "all", string> = {
  all: "all",
  news: "news",
  warnings: "warnings",
  sanctions: "sanctions",
  "vessel-events": "vessel",
  imagery: "imagery",
  infra: "infra"
};
