export type Vector = number[];
export type Matrix = number[][];

const EPSILON = 1e-12;

export function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

export function assertVector(vector: Vector, label = "vector"): void {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error(`${label} must be a non-empty vector`);
  }

  vector.forEach((value, index) => assertFiniteNumber(value, `${label}[${index}]`));
}

export function assertMatrix(matrix: Matrix, label = "matrix"): void {
  if (!Array.isArray(matrix) || matrix.length === 0 || matrix[0].length === 0) {
    throw new Error(`${label} must be a non-empty matrix`);
  }

  const columns = matrix[0].length;
  matrix.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== columns) {
      throw new Error(`${label} must be rectangular`);
    }

    row.forEach((value, columnIndex) => {
      assertFiniteNumber(value, `${label}[${rowIndex}][${columnIndex}]`);
    });
  });
}

export function zeros(rows: number, columns: number): Matrix {
  if (!Number.isInteger(rows) || rows <= 0 || !Number.isInteger(columns) || columns <= 0) {
    throw new Error("Matrix dimensions must be positive integers");
  }

  return Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0));
}

export function identity(size: number): Matrix {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("Identity matrix size must be a positive integer");
  }

  const matrix = zeros(size, size);
  for (let index = 0; index < size; index += 1) {
    matrix[index][index] = 1;
  }

  return matrix;
}

export function cloneMatrix(matrix: Matrix): Matrix {
  assertMatrix(matrix);
  return matrix.map((row) => [...row]);
}

export function transpose(matrix: Matrix): Matrix {
  assertMatrix(matrix);
  const rows = matrix.length;
  const columns = matrix[0].length;
  const result = zeros(columns, rows);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      result[column][row] = matrix[row][column];
    }
  }

  return result;
}

export function add(a: Matrix, b: Matrix): Matrix {
  assertSameShape(a, b, "add");
  return a.map((row, rowIndex) => row.map((value, columnIndex) => value + b[rowIndex][columnIndex]));
}

export function subtract(a: Matrix, b: Matrix): Matrix {
  assertSameShape(a, b, "subtract");
  return a.map((row, rowIndex) => row.map((value, columnIndex) => value - b[rowIndex][columnIndex]));
}

export function scale(matrix: Matrix, scalar: number): Matrix {
  assertMatrix(matrix);
  assertFiniteNumber(scalar, "scalar");
  return matrix.map((row) => row.map((value) => value * scalar));
}

export function multiply(a: Matrix, b: Matrix): Matrix {
  assertMatrix(a, "left matrix");
  assertMatrix(b, "right matrix");

  if (a[0].length !== b.length) {
    throw new Error(`Cannot multiply ${a.length}x${a[0].length} by ${b.length}x${b[0].length}`);
  }

  const result = zeros(a.length, b[0].length);

  for (let row = 0; row < a.length; row += 1) {
    for (let column = 0; column < b[0].length; column += 1) {
      let total = 0;
      for (let inner = 0; inner < a[0].length; inner += 1) {
        total += a[row][inner] * b[inner][column];
      }
      result[row][column] = total;
    }
  }

  return result;
}

export function multiplyMatrixVector(matrix: Matrix, vector: Vector): Vector {
  assertMatrix(matrix);
  assertVector(vector);

  if (matrix[0].length !== vector.length) {
    throw new Error(`Cannot multiply ${matrix.length}x${matrix[0].length} matrix by ${vector.length} vector`);
  }

  return matrix.map((row) => dot(row, vector));
}

export function dot(a: Vector, b: Vector): number {
  assertVector(a, "left vector");
  assertVector(b, "right vector");

  if (a.length !== b.length) {
    throw new Error("Vector dimensions must match");
  }

  return a.reduce((total, value, index) => total + value * b[index], 0);
}

export function inverse(matrix: Matrix): Matrix {
  assertMatrix(matrix);

  const size = matrix.length;
  if (matrix[0].length !== size) {
    throw new Error("Only square matrices can be inverted");
  }

  const augmented = matrix.map((row, rowIndex) => [...row, ...identity(size)[rowIndex]]);

  for (let pivotColumn = 0; pivotColumn < size; pivotColumn += 1) {
    let pivotRow = pivotColumn;
    for (let row = pivotColumn + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivotColumn]) > Math.abs(augmented[pivotRow][pivotColumn])) {
        pivotRow = row;
      }
    }

    if (Math.abs(augmented[pivotRow][pivotColumn]) < EPSILON) {
      throw new Error("Matrix is singular and cannot be inverted");
    }

    if (pivotRow !== pivotColumn) {
      const current = augmented[pivotColumn];
      augmented[pivotColumn] = augmented[pivotRow];
      augmented[pivotRow] = current;
    }

    const pivot = augmented[pivotColumn][pivotColumn];
    for (let column = 0; column < size * 2; column += 1) {
      augmented[pivotColumn][column] /= pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivotColumn) continue;

      const factor = augmented[row][pivotColumn];
      for (let column = 0; column < size * 2; column += 1) {
        augmented[row][column] -= factor * augmented[pivotColumn][column];
      }
    }
  }

  return augmented.map((row) => row.slice(size));
}

export function inverse2(matrix: Matrix): Matrix {
  assertMatrix(matrix);
  if (matrix.length !== 2 || matrix[0].length !== 2) {
    throw new Error("inverse2 expects a 2x2 matrix");
  }

  const [[a, b], [c, d]] = matrix;
  const determinant = a * d - b * c;
  if (Math.abs(determinant) < EPSILON) {
    throw new Error("Matrix is singular and cannot be inverted");
  }

  return [
    [d / determinant, -b / determinant],
    [-c / determinant, a / determinant]
  ];
}

export function eigenSymmetric2(matrix: Matrix): {
  values: [number, number];
  vectors: [[number, number], [number, number]];
} {
  assertMatrix(matrix);
  if (matrix.length !== 2 || matrix[0].length !== 2) {
    throw new Error("eigenSymmetric2 expects a 2x2 matrix");
  }

  const a = matrix[0][0];
  const b = (matrix[0][1] + matrix[1][0]) / 2;
  const c = matrix[1][1];
  const center = (a + c) / 2;
  const radius = Math.sqrt(((a - c) / 2) ** 2 + b ** 2);
  const first = center + radius;
  const second = center - radius;
  const firstVector = normalize2(Math.abs(b) > EPSILON ? [first - c, b] : a >= c ? [1, 0] : [0, 1]);
  const secondVector: [number, number] = [-firstVector[1], firstVector[0]];

  return {
    values: [first, second],
    vectors: [firstVector, secondVector]
  };
}

export function ellipseAxes(
  covariance: Matrix,
  chiSquareThreshold = 5.991
): {
  major: number;
  minor: number;
  angleRadians: number;
} {
  const eigen = eigenSymmetric2(covariance);
  return {
    major: Math.sqrt(Math.max(eigen.values[0], 0) * chiSquareThreshold),
    minor: Math.sqrt(Math.max(eigen.values[1], 0) * chiSquareThreshold),
    angleRadians: Math.atan2(eigen.vectors[0][1], eigen.vectors[0][0])
  };
}

function normalize2(vector: number[]): [number, number] {
  const length = Math.hypot(vector[0], vector[1]);
  if (length < EPSILON) {
    return [1, 0];
  }

  return [vector[0] / length, vector[1] / length];
}

function assertSameShape(a: Matrix, b: Matrix, operation: string): void {
  assertMatrix(a, "left matrix");
  assertMatrix(b, "right matrix");

  if (a.length !== b.length || a[0].length !== b[0].length) {
    throw new Error(`Matrix dimensions must match for ${operation}`);
  }
}
