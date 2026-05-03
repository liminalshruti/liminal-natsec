// Shared mutable state for the AI-proposed draft case. Substrate panel,
// working panel, and notice toast all read from this hook so they stay in
// sync without lifting state through AppShell. Pattern: a tiny pub/sub
// store + hook, no Redux/Zustand dependency.
//
// Why not lift to AppShell: keeping the draft-case state contained to the
// surfaces that touch it minimizes the blast radius. The make-or-break
// beat (Caldera identity churn → refusal → rule fire) doesn't depend on
// this state, so AppShell stays simple.

import { useEffect, useState } from "react";
import { DRAFT_CASE, PROMOTE_THRESHOLD, type DraftCase, type DraftCandidateSignal } from "./draftCase.ts";

let state: DraftCase = { ...DRAFT_CASE, candidateSignals: DRAFT_CASE.candidateSignals.map((s) => ({ ...s })) };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function useDraftCase(): {
  draft: DraftCase;
  attachedCount: number;
  canPromote: boolean;
  toggleAttach: (signalId: string) => void;
  promote: () => void;
  reset: () => void;
} {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const attachedCount = state.candidateSignals.filter((s) => s.attached).length;
  const canPromote = state.status === "draft" && attachedCount >= PROMOTE_THRESHOLD;

  return {
    draft: state,
    attachedCount,
    canPromote,
    toggleAttach: (signalId: string) => {
      state = {
        ...state,
        candidateSignals: state.candidateSignals.map((s) =>
          s.id === signalId ? { ...s, attached: !s.attached } : s
        )
      };
      emit();
    },
    promote: () => {
      if (!canPromote) return;
      state = { ...state, status: "promoted" };
      emit();
    },
    reset: () => {
      state = { ...DRAFT_CASE, candidateSignals: DRAFT_CASE.candidateSignals.map((s) => ({ ...s })) };
      emit();
    }
  };
}

export type { DraftCase, DraftCandidateSignal };
