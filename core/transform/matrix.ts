import { VecN } from "../geometry/vector";

// A Matrix is represented as an array of rows.
// Each row is a VecN, and all rows must have equal length.
export type Matrix = number[][];

// Create an identity matrix of size n x n.
export const identityMatrix = (n: number): Matrix => {
    const M: Matrix = [];
    for (let i = 0; i < n; i++) {
        const row: number[] = [];
        for (let j = 0; j < n; j++) {
            row.push(i === j ? 1 : 0);
        }
        M.push(row);
    }
    return M;
};

// Multiply a matrix M by a vector v: M * v
export const applyMatrixToVector = (M: Matrix, v: VecN): VecN => {
    const out: VecN = [];
    for (let i = 0; i < M.length; i++) {
        let sum = 0;
        for (let j = 0; j < v.length; j++) {
            sum += M[i][j] * v[j];
        }
        out.push(sum);
    }
    return out;
};

// Multiply two matrices: A * B
export const multiplyMatrices = (A: Matrix, B: Matrix): Matrix => {
    const rowsA = A.length;
    const colsA = A[0].length;
    const rowsB = B.length;
    const colsB = B[0].length;

    if (colsA !== rowsB) {
        throw new Error("Matrix dimension mismatch: A.cols must equal B.rows");
    }

    const out: Matrix = [];
    for (let i = 0; i < rowsA; i++) {
        const row: number[] = [];
        for (let j = 0; j < colsB; j++) {
            let sum = 0;
            for (let k = 0; k < colsA; k++) {
                sum += A[i][k] * B[k][j];
            }
            row.push(sum);
        }
        out.push(row);
    }
    return out;
};

// Transpose a matrix: swap rows and columns.
export const transpose = (M: Matrix): Matrix => {
    const rows = M.length;
    const cols = M[0].length;

    const out: Matrix = [];
    for (let j = 0; j < cols; j++) {
        const row: number[] = [];
        for (let i = 0; i < rows; i++) {
            row.push(M[i][j]);
        }
        out.push(row);
    }
    return out;
};