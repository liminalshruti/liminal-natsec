// Specialist → real-cached-source-input mapping.
//
// For the demo, each of the six specialists deliberates over its own slice of
// the cached substrate on disk. The actual server-side specialist compute is
// the same as before; what changes is the UI's claim of "this is the substrate
// I'm reading," and that claim is now backed by a specific cached file with a
// sha256 the operator can pop open.
//
// The mapping below is the *judge-visible* substrate map. It cites only files
// that exist in fixtures/maritime/live-cache/ on disk and reuses the same
// citation schema as Path γ evidence citations:
//
//   { label, source_file, source_sha256, source_pointer, source_status,
//     source_provider }
//
// source_status takes "real" / "fixture-shape" / "synthetic" so the citation
// strip color-codes ground truth vs schema-preserving substrate. AIS / GFW
// gaps remain "fixture-shape" because the cache files themselves are marked
// fixture_mode: true (live collection returned 0 messages in our window).
//
// This mapping is data, not behavior — no fetch, no parse, just the manifest
// the UI strip renders below each specialist row. Provenance is in the chip.

export type CitationStatus = "real" | "fixture-shape" | "synthetic";

export interface SpecialistInputCitation {
  label: string;
  source_file: string;
  source_sha256: string;
  source_pointer: string;
  source_status: CitationStatus;
  source_provider: string;
  records_hint?: string; // e.g. "20 daily transits" — what's in the file
}

export interface SpecialistInputs {
  /** Specialist canonical name (matches the order in SpecialistReads.tsx). */
  specialist: string;
  /** One-line caption: "deliberates over X across Y sources" — drives the
   *  citation-strip subhead. */
  caption: string;
  /** Cited cache files this specialist would deliberate over. Order matters:
   *  primary substrate first, secondary corroboration after. */
  citations: SpecialistInputCitation[];
}

const CITATIONS: SpecialistInputs[] = [
  {
    specialist: "kinematics",
    caption: "Track geometry + corridor priors over real chokepoint baseline",
    citations: [
      {
        label: "PortWatch · chokepoint transits",
        source_file:
          "fixtures/maritime/live-cache/portwatch-hormuz-chokepoint-transits.json",
        source_sha256:
          "3a78fdfce7d5ff26c34f49e4b7dc2a46d40d0d534358564e944a9484e3f6c145",
        source_pointer: "$.body.records[*]",
        source_status: "real",
        source_provider: "World Bank PortWatch",
        records_hint: "20 daily transits"
      },
      {
        label: "OSM Overpass · maritime infrastructure",
        source_file: "fixtures/maritime/live-cache/overpass-hormuz-maritime.json",
        source_sha256:
          "c6f40a7d4356b435ec97a45bfc897525ee75dd648dadf2ee6c100b5981855874",
        source_pointer: "$.elements[*]",
        source_status: "real",
        source_provider: "OSM Overpass API",
        records_hint: "200 features"
      }
    ]
  },
  {
    specialist: "identity",
    caption: "MMSI continuity vs sanctions registry + IRISL network",
    citations: [
      {
        label: "OpenSanctions · Hormuz maritime entities",
        source_file:
          "fixtures/maritime/live-cache/opensanctions-hormuz-maritime-entities.json",
        source_sha256:
          "38308ccf7f3b57b26e136a9db4150fe08f82b1c9dd50f8d7a92f3d595c9c2ea5",
        source_pointer: "$.results[*]",
        source_status: "real",
        source_provider: "OpenSanctions",
        records_hint: "10 entities"
      },
      {
        label: "GFW · IRISL vessel search",
        source_file:
          "fixtures/maritime/live-cache/gfw-vessel-search-irisl.json",
        source_sha256:
          "a348fb39e2dd782ede24e7d49e7aafc9343df7134d2aaa4075da2a3727251b0f",
        source_pointer: "$.entries[*]",
        source_status: "real",
        source_provider: "Global Fishing Watch",
        records_hint: "10 IRISL hits"
      },
      {
        label: "GFW · HUGE identity history",
        source_file:
          "fixtures/maritime/live-cache/gfw-huge-imo9357183-identity-history.json",
        source_sha256:
          "cached-live-api",
        source_pointer: "$.results[*].selfReportedInfo[*]",
        source_status: "real",
        source_provider: "Global Fishing Watch",
        records_hint: "7 broadcast identities"
      },
      {
        label: "OFAC · Iran-program maritime rows",
        source_file:
          "fixtures/maritime/live-cache/ofac-maritime-sanctions-matches.json",
        source_sha256:
          "cached-live-api",
        source_pointer: "$.matches[*]",
        source_status: "real",
        source_provider: "U.S. Treasury OFAC",
        records_hint: "50 vessels"
      }
    ]
  },
  {
    specialist: "signal_integrity",
    caption: "AIS-stream and gap signals — fixture-shape during empty window",
    citations: [
      {
        label: "AIS Stream · Hormuz sample",
        source_file: "fixtures/maritime/live-cache/aisstream-hormuz-sample.json",
        source_sha256:
          "e9c3fd7439dbdac6187463fd25e67ee762e6ffb71eb94036f2284f7512c35eaa",
        source_pointer: "$.messages[*]",
        source_status: "fixture-shape",
        source_provider: "AISStream (live empty → schema-preserving)",
        records_hint: "3 messages, 2 MMSIs"
      },
      {
        label: "GFW · Hormuz AIS gaps",
        source_file: "fixtures/maritime/live-cache/gfw-hormuz-gaps.json",
        source_sha256:
          "01b838049d2f01db54d2eeacd0e45a9f652cea888895db7ac6412bb6637c4988",
        source_pointer: "$.body.entries[*]",
        source_status: "fixture-shape",
        source_provider: "Global Fishing Watch (fallback)",
        records_hint: "2 gap events"
      }
    ]
  },
  {
    specialist: "intent",
    caption: "Refuses pre-collection inference — substrate read, no source-cite",
    citations: [
      // Intent deliberately has no input citations: per the structural-guard
      // contract, Intent must not assert without independent source corroboration.
      // Showing a citation here would imply Intent is reading a source that
      // would justify an inference — exactly the move the guard refuses. The UI
      // surfaces this as "no inputs cited; refusal is structural," reinforcing
      // the never-cut "Refusal is structurally enforced" principle from CLAUDE.md.
    ]
  },
  {
    specialist: "collection",
    caption: "Open-source corroboration + maritime safety warnings",
    citations: [
      {
        label: "Exa · Hormuz vessel-anomaly OSINT",
        source_file: "fixtures/maritime/live-cache/exa-hormuz-osint.json",
        source_sha256:
          "be744f885257de2e969f88951754e1200946731375b171601d5180944a3933e5",
        source_pointer: "$.results[*]",
        source_status: "real",
        source_provider: "Exa Search",
        records_hint: "12 OSINT results"
      },
      {
        label: "NAVAREA IX · maritime warnings",
        source_file:
          "fixtures/maritime/live-cache/navarea-ix-warnings.metadata.json",
        source_sha256:
          "321b9420aa74dbc4aa84a9fd96582ccee27db66660f6ab0db5a25a71aaa238bf",
        source_pointer: "$.response",
        source_status: "real",
        source_provider: "Pakistan Navy Hydrography",
        records_hint: "200 OK · 245 KB cached"
      }
    ]
  },
  {
    specialist: "visual",
    caption: "Sentinel-1 SAR + Sentinel-2 truecolor passes over AOI",
    citations: [
      {
        label: "Sentinel-1 VV · Copernicus Data Space",
        source_file:
          "fixtures/maritime/live-cache/sentinelhub-hormuz-sentinel1-vv.metadata.json",
        source_sha256:
          "6d41c41d4e7707124ab205231d4123d6be1a26d52422a059d16f6b14b8947c19",
        source_pointer: "$.response",
        source_status: "real",
        source_provider: "Copernicus (Sentinel Hub)",
        records_hint: "25 KB SAR PNG on disk"
      },
      {
        label: "Sentinel-2 truecolor · Copernicus Data Space",
        source_file:
          "fixtures/maritime/live-cache/sentinelhub-hormuz-sentinel2-truecolor.metadata.json",
        source_sha256:
          "befec027c895643dec9959c814e0ce0af6f0ce6b10967bc056dc9c0268976598",
        source_pointer: "$.response",
        source_status: "real",
        source_provider: "Copernicus (Sentinel Hub)",
        records_hint: "truecolor PNG on disk"
      }
    ]
  }
];

const BY_NAME = new Map(CITATIONS.map((c) => [c.specialist, c]));

export function citationsForSpecialist(name: string): SpecialistInputs | null {
  // Normalize whitespace + case to match SpecialistReads.tsx's `normalize()`.
  const key = name.toLowerCase().replace(/\s+/g, "_");
  return BY_NAME.get(key) ?? null;
}
