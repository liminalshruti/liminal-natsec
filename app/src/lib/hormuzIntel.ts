import sourceDocumentsFixture from "../../../fixtures/maritime/hormuz-source-documents.json" with { type: "json" };
import evidenceItemsFixture from "../../../fixtures/maritime/hormuz-evidence-items.json" with { type: "json" };

import {
  HORMUZ_DRAWER_GROUPS,
  type HormuzDrawerGroup,
  type HormuzEvidenceItem,
  type HormuzIntelCategory,
  type HormuzIntelSource,
  type HormuzIntelStatus,
  type HormuzSourceDocument
} from "../../../shared/hormuz/types.ts";

export interface RequiredHormuzSource {
  source: HormuzIntelSource;
  label: string;
  drawerGroup: HormuzDrawerGroup;
  category: HormuzIntelCategory;
}

export interface HormuzIntelDrawerRow {
  id: string;
  title: string;
  source: HormuzIntelSource;
  provider: string;
  category: HormuzIntelCategory;
  drawerGroup: HormuzDrawerGroup;
  status: HormuzIntelStatus;
  summary: string;
  detail: string | null;
  sourceFile: string | null;
  sourceDocumentId: string | null;
  confidence: number | null;
  reliability: number | null;
  imageSrc: string | null;
  policyNote: string;
  unavailableReason: string | null;
}

export interface HormuzIntelDrawerGroup {
  id: HormuzDrawerGroup;
  label: HormuzDrawerGroup;
  rows: HormuzIntelDrawerRow[];
  availableCount: number;
  unavailableCount: number;
}

export interface HormuzIntelDrawerModel {
  groups: HormuzIntelDrawerGroup[];
  totalRows: number;
  availableRows: number;
  unavailableRows: number;
}

export const DEFAULT_HORMUZ_REQUIRED_SOURCES: readonly RequiredHormuzSource[] = [
  {
    source: "DANTI",
    label: "Danti multi-int",
    drawerGroup: "OSINT",
    category: "REGIONAL_SECURITY_CONTEXT"
  },
  {
    source: "ACLED",
    label: "ACLED event context",
    drawerGroup: "OSINT",
    category: "REGIONAL_SECURITY_CONTEXT"
  },
  {
    source: "AISSTREAM",
    label: "AISstream sample",
    drawerGroup: "OSINT",
    category: "VESSEL_IDENTITY_CORROBORATION"
  },
  {
    source: "COPERNICUS_CDSE_STAC",
    label: "Copernicus STAC",
    drawerGroup: "Satellite",
    category: "GEO_SPATIOTEMPORAL_CORROBORATION"
  },
  {
    source: "COPERNICUS_MARINE",
    label: "Copernicus Marine currents",
    drawerGroup: "Satellite",
    category: "CROSS_MODAL_CONTEXT"
  },
  {
    source: "SENTINEL_HUB_PROCESS",
    label: "Sentinel Hub imagery",
    drawerGroup: "Satellite",
    category: "CROSS_MODAL_CONTEXT"
  },
  {
    source: "NAVAREA_IX",
    label: "NAVAREA IX warnings",
    drawerGroup: "Maritime Warnings",
    category: "REGIONAL_SECURITY_CONTEXT"
  },
  {
    source: "UKMTO",
    label: "UKMTO warnings",
    drawerGroup: "Maritime Warnings",
    category: "REGIONAL_SECURITY_CONTEXT"
  },
  {
    source: "EXA",
    label: "Exa OSINT",
    drawerGroup: "OSINT",
    category: "REGIONAL_SECURITY_CONTEXT"
  },
  {
    source: "GDELT",
    label: "GDELT DOC 2.0",
    drawerGroup: "OSINT",
    category: "REGIONAL_SECURITY_CONTEXT"
  },
  {
    source: "PORTWATCH",
    label: "IMF PortWatch",
    drawerGroup: "OSINT",
    category: "REGIONAL_SECURITY_CONTEXT"
  },
  {
    source: "GLOBAL_FISHING_WATCH",
    label: "GFW vessel search",
    drawerGroup: "OSINT",
    category: "VESSEL_IDENTITY_CORROBORATION"
  },
  {
    source: "OPENSANCTIONS",
    label: "OpenSanctions",
    drawerGroup: "Entity Risk",
    category: "ENTITY_RISK_ENRICHMENT"
  },
  {
    source: "OVERPASS",
    label: "Overpass maritime context",
    drawerGroup: "Infrastructure Context",
    category: "MARITIME_INFRASTRUCTURE_CONTEXT"
  },
  {
    source: "SHODAN",
    label: "Shodan infrastructure",
    drawerGroup: "Infrastructure Context",
    category: "INFRASTRUCTURE_CONTEXT_ONLY"
  }
] as const;

export const hormuzSourceDocuments =
  sourceDocumentsFixture as HormuzSourceDocument[];
export const hormuzEvidenceItems = evidenceItemsFixture as HormuzEvidenceItem[];

export function buildHormuzIntelDrawerModel(
  evidenceItems: readonly HormuzEvidenceItem[] = hormuzEvidenceItems,
  sourceDocuments: readonly HormuzSourceDocument[] = hormuzSourceDocuments,
  options: { requiredSources?: readonly RequiredHormuzSource[] } = {}
): HormuzIntelDrawerModel {
  const requiredSources = options.requiredSources ?? DEFAULT_HORMUZ_REQUIRED_SOURCES;
  const rows = evidenceItems.map((item) => evidenceRow(item, sourceDocuments));
  const rowKeys = new Set(rows.map((row) => row.id));

  for (const doc of sourceDocuments) {
    if (doc.status !== "unavailable") continue;
    const hasEvidenceForDoc = evidenceItems.some((item) =>
      item.source_document_ids.includes(doc.id)
    );
    if (hasEvidenceForDoc) continue;
    const fallback = requiredSources.find((source) => source.source === doc.source);
    if (!fallback) continue;
    const row = unavailableRow(
      `unavailable:${doc.id}`,
      doc.title,
      fallback,
      doc.status_detail,
      doc.source_file,
      doc.id
    );
    if (!rowKeys.has(row.id)) {
      rows.push(row);
      rowKeys.add(row.id);
    }
  }

  for (const required of requiredSources) {
    const hasSource = sourceDocuments.some((doc) => doc.source === required.source);
    if (hasSource) continue;
    const row = unavailableRow(
      `missing:${required.source}`,
      `${required.label} unavailable`,
      required,
      "source document missing",
      null,
      null
    );
    if (!rowKeys.has(row.id)) {
      rows.push(row);
      rowKeys.add(row.id);
    }
  }

  const groups = HORMUZ_DRAWER_GROUPS.map((group) => {
    const groupRows = rows
      .filter((row) => row.drawerGroup === group)
      .sort(compareRows);
    return {
      id: group,
      label: group,
      rows: groupRows,
      availableCount: groupRows.filter((row) => row.status === "available").length,
      unavailableCount: groupRows.filter((row) => row.status === "unavailable").length
    };
  });

  return {
    groups,
    totalRows: rows.length,
    availableRows: rows.filter((row) => row.status === "available").length,
    unavailableRows: rows.filter((row) => row.status === "unavailable").length
  };
}

function evidenceRow(
  item: HormuzEvidenceItem,
  sourceDocuments: readonly HormuzSourceDocument[]
): HormuzIntelDrawerRow {
  const sourceDoc = sourceDocuments.find((doc) => doc.id === item.source_document_id);
  return {
    id: item.id,
    title: item.title,
    source: item.source,
    provider: item.provider,
    category: item.category,
    drawerGroup: item.drawer_group,
    status: item.status,
    summary: item.summary,
    detail: item.detail,
    sourceFile: item.source_file,
    sourceDocumentId: item.source_document_id,
    confidence: item.confidence,
    reliability: item.reliability,
    imageSrc: item.browser_asset_path ?? null,
    policyNote: item.policy.note,
    unavailableReason:
      item.status === "unavailable" ? sourceDoc?.status_detail ?? item.summary : null
  };
}

function unavailableRow(
  id: string,
  title: string,
  source: RequiredHormuzSource,
  reason: string,
  sourceFile: string | null,
  sourceDocumentId: string | null
): HormuzIntelDrawerRow {
  return {
    id,
    title,
    source: source.source,
    provider: source.label,
    category: source.category,
    drawerGroup: source.drawerGroup,
    status: "unavailable",
    summary: `${source.label} is unavailable: ${reason}.`,
    detail: null,
    sourceFile,
    sourceDocumentId,
    confidence: null,
    reliability: null,
    imageSrc: null,
    policyNote:
      source.category === "INFRASTRUCTURE_CONTEXT_ONLY"
        ? "Infrastructure-only; not vessel behavior evidence."
        : "Unavailable source; no scoring contribution.",
    unavailableReason: reason
  };
}

function compareRows(left: HormuzIntelDrawerRow, right: HormuzIntelDrawerRow): number {
  if (left.status !== right.status) {
    return left.status === "available" ? -1 : 1;
  }
  const source = left.provider.localeCompare(right.provider);
  if (source !== 0) return source;
  return left.title.localeCompare(right.title);
}
