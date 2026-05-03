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
import { DRAFT_CASES, PROMOTE_THRESHOLD, type DraftCase, type DraftCandidateSignal } from "./draftCase.ts";

let state: DraftCase[] = cloneDraftCases(DRAFT_CASES);

/** B-3: signals that just flipped to attached. Used to drive a one-shot
 *  celebration animation. Cleared per-id after RECENT_ATTACH_TTL_MS so the
 *  animation can re-fire if the operator detaches and re-attaches. */
let recentlyAttached: Set<string> = new Set();
const RECENT_ATTACH_TTL_MS = 1200;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function useDraftCase(caseId?: string | null): {
  draft: DraftCase;
  draftCases: DraftCase[];
  attachedCount: number;
  canPromote: boolean;
  /** True if this signal id was attached within the last RECENT_ATTACH_TTL_MS.
   *  Drives the B-3 celebration animation on the corresponding row. */
  isRecentlyAttached: (signalId: string) => boolean;
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

  const draft = findDraft(caseId);
  const attachedCount = draft.candidateSignals.filter((s) => s.attached).length;
  const canPromote = draft.status === "draft" && attachedCount >= PROMOTE_THRESHOLD;

  return {
    draft,
    draftCases: state,
    attachedCount,
    canPromote,
    isRecentlyAttached: (signalId: string) => recentlyAttached.has(signalId),
    toggleAttach: (signalId: string) => {
      const wasAttached =
        state
          .flatMap((draftCase) => draftCase.candidateSignals)
          .find((s) => s.id === signalId)?.attached ?? false;
      state = state.map((draftCase) => ({
        ...draftCase,
        candidateSignals: draftCase.candidateSignals.map((s) =>
          s.id === signalId ? { ...s, attached: !s.attached } : s
        )
      }));
      // Trigger the B-3 celebration only on the attach side of the toggle.
      if (!wasAttached) {
        recentlyAttached.add(signalId);
        emit();
        setTimeout(() => {
          recentlyAttached.delete(signalId);
          emit();
        }, RECENT_ATTACH_TTL_MS);
      } else {
        emit();
      }
    },
    promote: () => {
      if (!canPromote) return;
      state = state.map((draftCase) =>
        draftCase.id === draft.id ? { ...draftCase, status: "promoted" } : draftCase
      );
      emit();
    },
    reset: () => {
      state = cloneDraftCases(DRAFT_CASES);
      recentlyAttached = new Set();
      emit();
    }
  };
}

export type { DraftCase, DraftCandidateSignal };

function findDraft(caseId?: string | null): DraftCase {
  if (caseId) {
    const matched = state.find((draft) => draft.id === caseId);
    if (matched) return matched;
  }
  return state[0]!;
}

function cloneDraftCases(drafts: DraftCase[]): DraftCase[] {
  return drafts.map((draft) => ({
    ...draft,
    context: { ...draft.context },
    candidateSignals: draft.candidateSignals.map((signal) => ({
      ...signal,
      vessel: signal.vessel ? { ...signal.vessel } : undefined
    }))
  }));
}
