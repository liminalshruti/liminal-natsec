// Backward-compat re-export. Phase 2 split this into ProvenanceTrace +
// EvidenceDrawer. Existing call sites can migrate to those.

import { EvidenceDrawer } from "./EvidenceDrawer.tsx";
import { ProvenanceTrace } from "./ProvenanceTrace.tsx";

interface EvidenceChainProps {
  claimId: string | null;
}

export function EvidenceChain({ claimId }: EvidenceChainProps) {
  return (
    <>
      <ProvenanceTrace claimId={claimId} />
      <EvidenceDrawer claimId={claimId} />
    </>
  );
}
