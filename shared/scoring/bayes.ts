export interface FeatureContributionInput {
  feature: string;
  llrNats?: number;
  llr?: number;
  value?: unknown;
  evidenceIds?: string[];
}

export interface HypothesisInput {
  id: string;
  prior: number;
  contributions?: FeatureContributionInput[];
}

export interface FeatureContribution {
  feature: string;
  llrNats: number;
  value?: unknown;
  evidenceIds: string[];
}

export interface HypothesisPosterior {
  id: string;
  prior: number;
  normalizedPrior: number;
  logEvidence: number;
  posterior: number;
  contributions: FeatureContribution[];
}

export interface BayesResult {
  posteriors: Record<string, number>;
  hypotheses: HypothesisPosterior[];
  logNormalizer: number;
}

export function fuse(hypotheses: HypothesisInput[]): BayesResult {
  if (hypotheses.length < 2) {
    throw new Error("Bayesian fusion requires at least two hypotheses");
  }

  const priorTotal = hypotheses.reduce((total, hypothesis) => {
    assertProbabilityWeight(hypothesis.prior, `prior for ${hypothesis.id}`);
    return total + hypothesis.prior;
  }, 0);

  if (priorTotal <= 0) {
    throw new Error("At least one hypothesis must have non-zero prior");
  }

  const scored = hypotheses.map((hypothesis) => {
    if (!hypothesis.id) {
      throw new Error("Hypothesis id is required");
    }

    const normalizedPrior = hypothesis.prior / priorTotal;
    const contributions = normalizeContributions(hypothesis.contributions ?? []);
    const logEvidence = contributions.reduce((total, contribution) => total + contribution.llrNats, 0);

    return {
      id: hypothesis.id,
      prior: hypothesis.prior,
      normalizedPrior,
      logEvidence,
      posterior: 0,
      contributions
    };
  });
  const logScores = scored.map((hypothesis) => Math.log(hypothesis.normalizedPrior) + hypothesis.logEvidence);
  const logNormalizer = logSumExp(logScores);
  const posteriors: Record<string, number> = {};
  const normalized = scored.map((hypothesis, index) => {
    const posterior = Math.exp(logScores[index] - logNormalizer);
    posteriors[hypothesis.id] = posterior;

    return {
      ...hypothesis,
      posterior
    };
  });

  return {
    posteriors,
    hypotheses: normalized,
    logNormalizer
  };
}

export function logPosteriorOdds(result: BayesResult, numeratorId: string, denominatorId: string): number {
  const numerator = findHypothesis(result, numeratorId);
  const denominator = findHypothesis(result, denominatorId);

  return Math.log(numerator.posterior / denominator.posterior);
}

export function sumContributionDelta(result: BayesResult, numeratorId: string, denominatorId: string): number {
  const numerator = findHypothesis(result, numeratorId);
  const denominator = findHypothesis(result, denominatorId);

  return numerator.logEvidence - denominator.logEvidence;
}

export function contributionMap(result: BayesResult, hypothesisId: string): Record<string, number> {
  const hypothesis = findHypothesis(result, hypothesisId);
  const map: Record<string, number> = {};

  for (const contribution of hypothesis.contributions) {
    map[contribution.feature] = (map[contribution.feature] ?? 0) + contribution.llrNats;
  }

  return map;
}

function normalizeContributions(contributions: FeatureContributionInput[]): FeatureContribution[] {
  return contributions.map((contribution) => {
    const llrNats = contribution.llrNats ?? contribution.llr;
    if (!contribution.feature) {
      throw new Error("Feature contribution requires a feature name");
    }
    if (!Number.isFinite(llrNats)) {
      throw new Error(`Feature ${contribution.feature} must include a finite llrNats value`);
    }

    return {
      feature: contribution.feature,
      llrNats: llrNats as number,
      value: contribution.value,
      evidenceIds: contribution.evidenceIds ?? []
    };
  });
}

function findHypothesis(result: BayesResult, id: string): HypothesisPosterior {
  const hypothesis = result.hypotheses.find((candidate) => candidate.id === id);
  if (!hypothesis) {
    throw new Error(`Unknown hypothesis: ${id}`);
  }

  return hypothesis;
}

function logSumExp(values: number[]): number {
  const max = Math.max(...values);
  const total = values.reduce((sum, value) => sum + Math.exp(value - max), 0);

  return max + Math.log(total);
}

function assertProbabilityWeight(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative number`);
  }
}
