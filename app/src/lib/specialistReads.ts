import specialistFixtures from "../../../fixtures/maritime/specialist-reads.json" with { type: "json" };

export interface SpecialistReadRecord {
  id: string;
  case_id: string;
  specialist: string;
  status: "OK" | "REFUSED";
  summary?: string;
  refusalReason?: string;
  citations?: string[];
}

interface SpecialistFixtureFile {
  reads?: Array<{
    id: string;
    case_id: string;
    specialist: string;
    status: string;
    summary?: string;
    refusal_reason?: string;
    refusalReason?: string;
    citations?: string[];
    [key: string]: unknown;
  }>;
}

const SOURCE = specialistFixtures as SpecialistFixtureFile;

export function specialistReadsForCase(caseId: string): SpecialistReadRecord[] {
  return (SOURCE.reads ?? [])
    .filter((read) => read.case_id === caseId)
    .map((read) => ({
      id: read.id,
      case_id: read.case_id,
      specialist: read.specialist,
      status: read.status === "REFUSED" ? "REFUSED" : "OK",
      summary: read.summary,
      refusalReason: read.refusal_reason ?? read.refusalReason,
      citations: read.citations
    }));
}
