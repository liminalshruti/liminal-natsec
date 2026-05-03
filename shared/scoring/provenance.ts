export interface ConfidenceDelta {
  id: string;
  label?: string;
  delta: number;
}

export interface ConfidenceFlowStep {
  id: string;
  label?: string;
  prior: number;
  delta: number;
  posterior: number;
}

export interface ConfidenceFlow {
  initialPrior: number;
  finalPosterior: number;
  totalDelta: number;
  steps: ConfidenceFlowStep[];
}

export function posteriorFromPriorAndDeltas(prior: number, deltas: number[]): number {
  assertProbability(prior, "prior");
  let logOdds = probabilityToLogOdds(prior);

  for (const [index, delta] of deltas.entries()) {
    if (!Number.isFinite(delta)) {
      throw new Error(`delta[${index}] must be finite`);
    }
    logOdds += delta;
  }

  return logOddsToProbability(logOdds);
}

export function buildConfidenceFlow(prior: number, deltas: ConfidenceDelta[]): ConfidenceFlow {
  assertProbability(prior, "prior");

  let current = prior;
  let totalDelta = 0;
  const steps = deltas.map((delta) => {
    if (!Number.isFinite(delta.delta)) {
      throw new Error(`Delta ${delta.id} must be finite`);
    }

    const stepPrior = current;
    current = posteriorFromPriorAndDeltas(current, [delta.delta]);
    totalDelta += delta.delta;

    return {
      id: delta.id,
      label: delta.label,
      prior: stepPrior,
      delta: delta.delta,
      posterior: current
    };
  });

  return {
    initialPrior: prior,
    finalPosterior: current,
    totalDelta,
    steps
  };
}

export function reproducePosteriorFromTrace(steps: ConfidenceFlowStep[]): number {
  if (steps.length === 0) {
    throw new Error("Trace must include at least one confidence-flow step");
  }

  const initialPrior = steps[0].prior;
  const deltas = steps.map((step) => step.delta);

  return posteriorFromPriorAndDeltas(initialPrior, deltas);
}

export function assertTraceReproducesPosterior(
  steps: ConfidenceFlowStep[],
  expectedPosterior: number,
  tolerance = 1e-6
): boolean {
  const reproduced = reproducePosteriorFromTrace(steps);

  return Math.abs(reproduced - expectedPosterior) <= tolerance;
}

export function probabilityToLogOdds(probability: number): number {
  assertProbability(probability, "probability");
  if (probability === 0) return Number.NEGATIVE_INFINITY;
  if (probability === 1) return Number.POSITIVE_INFINITY;

  return Math.log(probability / (1 - probability));
}

export function logOddsToProbability(logOdds: number): number {
  if (logOdds === Number.POSITIVE_INFINITY) return 1;
  if (logOdds === Number.NEGATIVE_INFINITY) return 0;
  if (!Number.isFinite(logOdds)) {
    throw new Error("logOdds must be finite or an explicit infinity");
  }

  if (logOdds >= 0) {
    const expNegative = Math.exp(-logOdds);
    return 1 / (1 + expNegative);
  }

  const expPositive = Math.exp(logOdds);
  return expPositive / (1 + expPositive);
}

function assertProbability(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1`);
  }
}
