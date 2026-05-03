import {
  add,
  dot,
  ellipseAxes,
  identity,
  inverse2,
  multiply,
  multiplyMatrixVector,
  subtract,
  transpose,
  type Matrix,
  type Vector
} from "../lib/matrix.ts";

export interface GeoPing {
  lat: number;
  lon: number;
  timestamp?: string | number | Date;
  t?: string | number | Date;
  sogKnots?: number;
  cogDeg?: number;
}

export interface KalmanOptions {
  measurementStdMeters?: number;
  processAccelerationStdMps2?: number;
  ellipseSegments?: number;
  chiSquareThreshold?: number;
}

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface KalmanPrediction {
  likelihood: number;
  mahalanobis: number;
  mahalanobisSquared: number;
  predictedState: {
    lat: number;
    lon: number;
    vxMps: number;
    vyMps: number;
    speedKnots: number;
    courseDeg: number;
  };
  covariance2: Matrix;
  ellipsePolygon: GeoJsonPolygon;
  reference: {
    lat: number;
    lon: number;
  };
}

const EARTH_RADIUS_METERS = 6_371_000;
const KNOTS_PER_MPS = 1 / 0.514444;
const DEFAULT_MEASUREMENT_STD_METERS = 35;
const DEFAULT_PROCESS_ACCELERATION_STD_MPS2 = 0.012;
const DEFAULT_CHI_SQUARE_95_2D = 5.991;
const DEFAULT_ELLIPSE_SEGMENTS = 64;

export function predict(
  trackPings: GeoPing[],
  gapDurationSeconds: number,
  candidatePing: GeoPing,
  options: KalmanOptions = {}
): KalmanPrediction {
  if (trackPings.length < 2) {
    throw new Error("At least two track pings are required for dark-gap prediction");
  }

  const sortedPings = [...trackPings].sort((a, b) => timeSeconds(a) - timeSeconds(b));
  const reference = { lat: sortedPings[0].lat, lon: sortedPings[0].lon };
  const measurementStd = options.measurementStdMeters ?? DEFAULT_MEASUREMENT_STD_METERS;
  const accelerationStd = options.processAccelerationStdMps2 ?? DEFAULT_PROCESS_ACCELERATION_STD_MPS2;
  const measurementVariance = measurementStd ** 2;
  const firstPoint = toLocalMeters(sortedPings[0], reference);
  const initialVelocity = velocityFromCourseSpeed(sortedPings[0]) ?? velocityFromPings(sortedPings[0], sortedPings[1], reference);

  let state: Vector = [firstPoint[0], firstPoint[1], initialVelocity[0], initialVelocity[1]];
  let covariance: Matrix = [
    [measurementVariance, 0, 0, 0],
    [0, measurementVariance, 0, 0],
    [0, 0, 25, 0],
    [0, 0, 0, 25]
  ];
  let previousTime = timeSeconds(sortedPings[0]);

  for (let index = 1; index < sortedPings.length; index += 1) {
    const ping = sortedPings[index];
    const currentTime = timeSeconds(ping);
    const dt = currentTime - previousTime;
    if (dt <= 0) {
      throw new Error("Track ping timestamps must be strictly increasing");
    }

    ({ state, covariance } = predictState(state, covariance, dt, accelerationStd));
    ({ state, covariance } = updatePosition(state, covariance, toLocalMeters(ping, reference), measurementVariance));
    previousTime = currentTime;
  }

  if (!Number.isFinite(gapDurationSeconds) || gapDurationSeconds < 0) {
    throw new Error("gapDurationSeconds must be a non-negative finite number");
  }

  ({ state, covariance } = predictState(state, covariance, gapDurationSeconds, accelerationStd));

  const predictedLocal: [number, number] = [state[0], state[1]];
  const candidateLocal = toLocalMeters(candidatePing, reference);
  const covariance2 = [
    [covariance[0][0] + measurementVariance, covariance[0][1]],
    [covariance[1][0], covariance[1][1] + measurementVariance]
  ];
  const innovation = [candidateLocal[0] - predictedLocal[0], candidateLocal[1] - predictedLocal[1]];
  const covarianceInverse = inverse2(covariance2);
  const mahalanobisSquared = Math.max(0, dot(innovation, multiplyMatrixVector(covarianceInverse, innovation)));
  const predictedGeo = toGeoPoint(predictedLocal, reference);
  const speedMps = Math.hypot(state[2], state[3]);

  return {
    likelihood: Math.exp(-0.5 * mahalanobisSquared),
    mahalanobis: Math.sqrt(mahalanobisSquared),
    mahalanobisSquared,
    predictedState: {
      lat: predictedGeo.lat,
      lon: predictedGeo.lon,
      vxMps: state[2],
      vyMps: state[3],
      speedKnots: speedMps * KNOTS_PER_MPS,
      courseDeg: normalizeDegrees((Math.atan2(state[2], state[3]) * 180) / Math.PI)
    },
    covariance2,
    ellipsePolygon: buildEllipsePolygon(
      predictedLocal,
      covariance2,
      reference,
      options.ellipseSegments ?? DEFAULT_ELLIPSE_SEGMENTS,
      options.chiSquareThreshold ?? DEFAULT_CHI_SQUARE_95_2D
    ),
    reference
  };
}

export function pointMahalanobisSquared(prediction: KalmanPrediction, point: GeoPing): number {
  const center = toLocalMeters(prediction.predictedState, prediction.reference);
  const candidate = toLocalMeters(point, prediction.reference);
  const innovation = [candidate[0] - center[0], candidate[1] - center[1]];

  return Math.max(0, dot(innovation, multiplyMatrixVector(inverse2(prediction.covariance2), innovation)));
}

export function isPointInsidePredictionEllipse(
  prediction: KalmanPrediction,
  point: GeoPing,
  chiSquareThreshold = DEFAULT_CHI_SQUARE_95_2D
): boolean {
  return pointMahalanobisSquared(prediction, point) <= chiSquareThreshold;
}

function predictState(
  state: Vector,
  covariance: Matrix,
  dt: number,
  accelerationStd: number
): {
  state: Vector;
  covariance: Matrix;
} {
  const transition: Matrix = [
    [1, 0, dt, 0],
    [0, 1, 0, dt],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
  const process = processNoise(dt, accelerationStd);

  return {
    state: multiplyMatrixVector(transition, state),
    covariance: add(multiply(multiply(transition, covariance), transpose(transition)), process)
  };
}

function updatePosition(
  state: Vector,
  covariance: Matrix,
  measurement: [number, number],
  measurementVariance: number
): {
  state: Vector;
  covariance: Matrix;
} {
  const observation: Matrix = [
    [1, 0, 0, 0],
    [0, 1, 0, 0]
  ];
  const measurementCovariance: Matrix = [
    [measurementVariance, 0],
    [0, measurementVariance]
  ];
  const innovation = [
    measurement[0] - state[0],
    measurement[1] - state[1]
  ];
  const innovationCovariance = add(
    multiply(multiply(observation, covariance), transpose(observation)),
    measurementCovariance
  );
  const gain = multiply(multiply(covariance, transpose(observation)), inverse2(innovationCovariance));
  const update = multiplyMatrixVector(gain, innovation);
  const updatedState = state.map((value, index) => value + update[index]);
  const updatedCovariance = multiply(subtract(identity(4), multiply(gain, observation)), covariance);

  return {
    state: updatedState,
    covariance: updatedCovariance
  };
}

function processNoise(dt: number, accelerationStd: number): Matrix {
  const variance = accelerationStd ** 2;
  const dt2 = dt ** 2;
  const dt3 = dt ** 3;
  const dt4 = dt ** 4;

  return [
    [(dt4 / 4) * variance, 0, (dt3 / 2) * variance, 0],
    [0, (dt4 / 4) * variance, 0, (dt3 / 2) * variance],
    [(dt3 / 2) * variance, 0, dt2 * variance, 0],
    [0, (dt3 / 2) * variance, 0, dt2 * variance]
  ];
}

function toLocalMeters(point: Pick<GeoPing, "lat" | "lon">, reference: { lat: number; lon: number }): [number, number] {
  const latRadians = (reference.lat * Math.PI) / 180;
  const x = ((point.lon - reference.lon) * Math.PI * EARTH_RADIUS_METERS * Math.cos(latRadians)) / 180;
  const y = ((point.lat - reference.lat) * Math.PI * EARTH_RADIUS_METERS) / 180;

  return [x, y];
}

function toGeoPoint(point: [number, number], reference: { lat: number; lon: number }): { lat: number; lon: number } {
  const latRadians = (reference.lat * Math.PI) / 180;

  return {
    lat: reference.lat + (point[1] * 180) / (Math.PI * EARTH_RADIUS_METERS),
    lon: reference.lon + (point[0] * 180) / (Math.PI * EARTH_RADIUS_METERS * Math.cos(latRadians))
  };
}

function velocityFromPings(a: GeoPing, b: GeoPing, reference: { lat: number; lon: number }): [number, number] {
  const dt = timeSeconds(b) - timeSeconds(a);
  if (dt <= 0) {
    throw new Error("Track ping timestamps must be strictly increasing");
  }

  const first = toLocalMeters(a, reference);
  const second = toLocalMeters(b, reference);

  return [(second[0] - first[0]) / dt, (second[1] - first[1]) / dt];
}

function velocityFromCourseSpeed(ping: GeoPing): [number, number] | null {
  if (!Number.isFinite(ping.sogKnots) || !Number.isFinite(ping.cogDeg)) {
    return null;
  }

  const speedMps = (ping.sogKnots as number) * 0.514444;
  const radians = ((ping.cogDeg as number) * Math.PI) / 180;

  return [speedMps * Math.sin(radians), speedMps * Math.cos(radians)];
}

function timeSeconds(ping: GeoPing): number {
  const value = ping.timestamp ?? ping.t;
  if (value instanceof Date) {
    return value.getTime() / 1000;
  }

  if (typeof value === "number") {
    return value > 10_000_000_000 ? value / 1000 : value;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed / 1000;
    }
  }

  throw new Error("Each track ping must include a parseable timestamp or t value");
}

function buildEllipsePolygon(
  center: [number, number],
  covariance: Matrix,
  reference: { lat: number; lon: number },
  segments: number,
  chiSquareThreshold: number
): GeoJsonPolygon {
  const safeSegments = Math.max(16, Math.floor(segments));
  const axes = ellipseAxes(covariance, chiSquareThreshold);
  const cos = Math.cos(axes.angleRadians);
  const sin = Math.sin(axes.angleRadians);
  const coordinates: number[][] = [];

  for (let index = 0; index <= safeSegments; index += 1) {
    const theta = (index / safeSegments) * Math.PI * 2;
    const unrotatedX = axes.major * Math.cos(theta);
    const unrotatedY = axes.minor * Math.sin(theta);
    const x = center[0] + unrotatedX * cos - unrotatedY * sin;
    const y = center[1] + unrotatedX * sin + unrotatedY * cos;
    const geo = toGeoPoint([x, y], reference);

    coordinates.push([geo.lon, geo.lat]);
  }

  return {
    type: "Polygon",
    coordinates: [coordinates]
  };
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}
