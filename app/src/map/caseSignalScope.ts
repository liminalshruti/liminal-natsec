export const CASE_HUGE_IDENTITY = "case:alara-01:event-1";
export const CASE_HORMUZ_SYNTHESIS = "case:alara-01:event-2";
export const CASE_REAL_SANCTIONED_FLEET = "case:real:hormuz:sdn-live-fleet";
export const CASE_REAL_LOITERING_CLUSTERS = "case:real:hormuz:loitering-clusters";
export const CASE_REAL_IRAN_LAST_PORT = "case:real:hormuz:iran-last-port-laundering";
export const CASE_REAL_GREY_MARKET_ROUTING = "case:real:hormuz:grey-market-china-routing";
export const CASE_REAL_ROSHAK_SIGNAL = "case:real:hormuz:roshak-signal-integrity";

const DRAFT_CASE_ID_BY_MMSI = new Map([
  ["352005822", "case:draft:hormuz:352005822"],
  ["229706000", "case:draft:hormuz:229706000"],
  ["636023725", "case:draft:hormuz:636023725"],
  ["341317000", "case:draft:hormuz:341317000"],
  ["518998467", "case:draft:hormuz:518998467"],
  ["212851000", "case:draft:hormuz:212851000"]
]);

export type CaseEventId = "event_1" | "event_2";

export interface MapSignalScope {
  caseId: string | null;
}

export interface TimelineAnchor {
  clockIso: string;
  phase: 1 | 2 | 3 | 4 | 5 | 6;
}

export const HUGE_LAST_KNOWN_AIS = {
  coordinates: [102.02867, 2.148] as [number, number],
  observedAt: "2026-03-19T16:31:00Z",
  sourceLabel: "MyShipTracking · third-party AIS last-known"
} as const;

interface VesselScopeInput {
  kind?: string;
  name?: string;
  shipName?: string;
  mmsi?: string;
  imo?: string;
  flag?: string;
  destination?: string;
  lastPort?: string;
  currentPort?: string;
  operator?: string;
  isIranFlag?: boolean;
  isOrderDestination?: boolean;
  isForeignFlagIranLastPort?: boolean;
  isImplausibleSpeed?: boolean;
  isChinaRouting?: boolean;
  isAnchorOrMoored?: boolean;
}

const HUGE_NAMES = new Set(["HUGE", "HATEF", "GLORY", "SVS GILBERT"]);
const HUGE_IMOS = new Set(["9357183"]);
const HUGE_MMSIS = new Set(["422206900", "212256000"]);

const HORMUZ_SYNTHESIS_NAMES = new Set([
  "ADRIAN DARYA",
  "AMIR ABBAS",
  "ARTARIA",
  "AZARGOUN",
  "BASKAR",
  "DARYA MAHER",
  "DARYABAR",
  "GOLSAN",
  "HAMOUNA",
  "HOMA",
  "JAMIL 8",
  "KAMINEH",
  "KASHAN",
  "MATIN",
  "NOUR 1",
  "OURA",
  "ROSHAK",
  "SAVAHEL",
  "SHAMIM",
  "SHAYAN 1",
  "ARAM 110",
  "CAPILANO",
  "ELPIS",
  "KOTOKU MARU NO.10",
  "YEKTA II"
]);

const REAL_SANCTIONED_FLEET_NAMES = new Set([
  "ADRIAN DARYA",
  "HAMOUNA",
  "AZARGOUN",
  "KASHAN",
  "SHAYAN 1",
  "AMIR ABBAS",
  "MATIN",
  "KAMINEH",
  "DARYABAR",
  "NOUR 1",
  "BASKAR",
  "ARTARIA",
  "DARYA MAHER",
  "GOLSAN",
  "HOMA",
  "JAMIL 8",
  "OURA",
  "SAVAHEL",
  "SHAMIM",
  "ARAM 110",
  "PETUNIA"
]);

const REAL_LOITERING_CLUSTER_NAMES = new Set([
  "HOMA",
  "AMIR ABBAS",
  "MATIN",
  "KAMINEH",
  "NOUR 1",
  "NOT DEFINED",
  "SAHEL KHAMIR",
  "ADRIAN DARYA",
  "ARTARIA",
  "AZARGOUN",
  "BASKAR",
  "BREEZ",
  "CAPILANO",
  "DELICE",
  "GOLSAN",
  "HAMOUNA",
  "HUDA",
  "KASHAN",
  "KOTOKU MARU NO.10",
  "MARIVEX",
  "MIDAS 7",
  "MIKAEEL",
  "SHAMIM",
  "SHAYAN 1",
  "TINA II"
]);

const REAL_IRAN_LAST_PORT_NAMES = new Set([
  "YEKTA II",
  "TINA II",
  "MARIVEX",
  "ELPIS",
  "KOTOKU MARU NO.10",
  "CAPILANO"
]);

const REAL_CHINA_ROUTING_NAMES = new Set(["HAMOUNA", "DARYABAR"]);

const HORMUZ_SYNTHESIS_IMOS = new Set([
  "9359416",
  "9452191",
  "9226944",
  "9283019",
  "9405942",
  "9619751",
  "9369710",
  "9165815",
  "9820271",
  "9452414",
  "9573086",
  "9744271",
  "9270696",
  "9446415",
  "9506370",
  "9387815",
  "9405966",
  "9419187",
  "9270658",
  "9420356",
  "9495911",
  "9358577",
  "9212400",
  "9159476",
  "1085564"
]);

export function caseEventId(caseId: string | null | undefined): CaseEventId | null {
  if (caseId === CASE_HUGE_IDENTITY || caseId?.endsWith("event-1")) return "event_1";
  if (caseId === CASE_HORMUZ_SYNTHESIS || caseId?.endsWith("event-2")) return "event_2";
  if (caseId?.startsWith("case:real:hormuz:")) return "event_2";
  return null;
}

export function timelineAnchorForCase(caseId: string | null | undefined): TimelineAnchor | null {
  if (caseId === CASE_HUGE_IDENTITY || caseId?.endsWith("event-1")) {
    return { clockIso: "2026-04-18T10:00:00.000Z", phase: 1 };
  }
  if (caseId === CASE_HORMUZ_SYNTHESIS || caseId?.endsWith("event-2")) {
    return { clockIso: "2026-04-18T12:08:00.000Z", phase: 6 };
  }
  if (caseId?.startsWith("case:real:hormuz:")) {
    return { clockIso: "2026-04-18T12:08:00.000Z", phase: 6 };
  }
  if (caseId?.startsWith("case:draft:hormuz:")) {
    return { clockIso: "2026-04-18T12:08:00.000Z", phase: 6 };
  }
  return null;
}

export function caseScopeLabel(caseId: string | null | undefined): string {
  if (caseId === CASE_HUGE_IDENTITY || caseId?.endsWith("event-1")) {
    return "HUGE identity";
  }
  if (caseId === CASE_HORMUZ_SYNTHESIS || caseId?.endsWith("event-2")) {
    return "Hormuz synthesis";
  }
  if (caseId === CASE_REAL_SANCTIONED_FLEET) return "sanctioned fleet";
  if (caseId === CASE_REAL_LOITERING_CLUSTERS) return "loitering clusters";
  if (caseId === CASE_REAL_IRAN_LAST_PORT) return "Iran last-port";
  if (caseId === CASE_REAL_GREY_MARKET_ROUTING) return "grey-market routing";
  if (caseId === CASE_REAL_ROSHAK_SIGNAL) return "ROSHAK signal";
  if (caseId?.startsWith("case:draft:hormuz:")) return "single-vessel draft";
  return "all mapped OSINT";
}

export function encodeCaseIds(caseIds: readonly string[]): string {
  return caseIds.length === 0 ? "" : `|${Array.from(new Set(caseIds)).join("|")}|`;
}

export function caseScopeToken(caseId: string): string {
  return `|${caseId}|`;
}

export function matchesCaseScope(
  encodedCaseIds: string | null | undefined,
  caseId: string | null | undefined
): boolean {
  if (!caseId) return true;
  return typeof encodedCaseIds === "string" && encodedCaseIds.includes(caseScopeToken(caseId));
}

export function caseIdsForDantiTraffic(input: VesselScopeInput): string[] {
  const out: string[] = [];
  const draftCaseId = DRAFT_CASE_ID_BY_MMSI.get(normalizeIdentifier(input.mmsi));
  if (draftCaseId) out.push(draftCaseId);
  if (isHugeIdentitySignal(input)) out.push(CASE_HUGE_IDENTITY);
  if (isHormuzSynthesisSignal(input)) out.push(CASE_HORMUZ_SYNTHESIS);
  if (isRealSanctionedFleetSignal(input)) out.push(CASE_REAL_SANCTIONED_FLEET);
  if (isRealLoiteringClusterSignal(input)) out.push(CASE_REAL_LOITERING_CLUSTERS);
  if (isRealIranLastPortSignal(input)) out.push(CASE_REAL_IRAN_LAST_PORT);
  if (isRealGreyMarketRoutingSignal(input)) out.push(CASE_REAL_GREY_MARKET_ROUTING);
  if (isRealRoshakSignal(input)) out.push(CASE_REAL_ROSHAK_SIGNAL);
  return Array.from(new Set(out));
}

export function caseIdsForSanctionedOverlay(input: VesselScopeInput): string[] {
  const out: string[] = [];
  if (isHugeIdentitySignal(input)) out.push(CASE_HUGE_IDENTITY);
  if (input.kind === "sanctioned_vessel" || input.kind === "ais_gap" || isHormuzSynthesisSignal(input)) {
    out.push(CASE_HORMUZ_SYNTHESIS);
  }
  if (input.kind === "sanctioned_vessel" || isRealSanctionedFleetSignal(input)) {
    out.push(CASE_REAL_SANCTIONED_FLEET);
  }
  if (isRealRoshakSignal(input)) out.push(CASE_REAL_ROSHAK_SIGNAL);
  return Array.from(new Set(out));
}

export function isHugeIdentitySignal(input: VesselScopeInput): boolean {
  const name = normalize(input.name ?? input.shipName);
  const imo = normalizeIdentifier(input.imo);
  const mmsi = normalizeIdentifier(input.mmsi);
  return (
    (name !== "" && HUGE_NAMES.has(name)) ||
    (imo !== "" && HUGE_IMOS.has(imo)) ||
    (mmsi !== "" && HUGE_MMSIS.has(mmsi))
  );
}

function isHormuzSynthesisSignal(input: VesselScopeInput): boolean {
  const name = normalize(input.name ?? input.shipName);
  const imo = normalizeIdentifier(input.imo);
  const portText = normalize(
    [input.destination, input.lastPort, input.currentPort].filter(Boolean).join(" ")
  );
  const operator = normalize(input.operator);
  return (
    (name !== "" && HORMUZ_SYNTHESIS_NAMES.has(name)) ||
    (imo !== "" && HORMUZ_SYNTHESIS_IMOS.has(imo)) ||
    input.isIranFlag === true ||
    input.isOrderDestination === true ||
    input.isForeignFlagIranLastPort === true ||
    input.isImplausibleSpeed === true ||
    input.isChinaRouting === true ||
    /QESHM|GHESHM|BANDAR ABBAS/.test(portText) ||
    /IRISL|NITC|NIOC|OFAC/.test(operator)
  );
}

function isRealSanctionedFleetSignal(input: VesselScopeInput): boolean {
  const name = normalize(input.name ?? input.shipName);
  return name !== "" && REAL_SANCTIONED_FLEET_NAMES.has(name);
}

function isRealLoiteringClusterSignal(input: VesselScopeInput): boolean {
  const name = normalize(input.name ?? input.shipName);
  const portText = normalize(
    [input.destination, input.lastPort, input.currentPort].filter(Boolean).join(" ")
  );
  return (
    (name !== "" && REAL_LOITERING_CLUSTER_NAMES.has(name)) ||
    /QESHM|GHESHM|POHL|BANDAR ABBAS ANCH/.test(portText)
  );
}

function isRealIranLastPortSignal(input: VesselScopeInput): boolean {
  const name = normalize(input.name ?? input.shipName);
  return (
    (name !== "" && REAL_IRAN_LAST_PORT_NAMES.has(name)) ||
    input.isForeignFlagIranLastPort === true
  );
}

function isRealGreyMarketRoutingSignal(input: VesselScopeInput): boolean {
  const name = normalize(input.name ?? input.shipName);
  return (
    input.isOrderDestination === true ||
    input.isChinaRouting === true ||
    (name !== "" && REAL_CHINA_ROUTING_NAMES.has(name))
  );
}

function isRealRoshakSignal(input: VesselScopeInput): boolean {
  const name = normalize(input.name ?? input.shipName);
  const imo = normalizeIdentifier(input.imo);
  return name === "ROSHAK" || imo === "9405966";
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/\s+/g, " ") : "";
}

function normalizeIdentifier(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}
