"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transpose = exports.multiplyMatrices = exports.applyMatrixToVector = exports.identityMatrix = void 0;
// Create an identity matrix of size n x n.
const identityMatrix = (n) => {
    const M = [];
    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) {
            row.push(i === j ? 1 : 0);
        }
        M.push(row);
    }
    return M;
};
exports.identityMatrix = identityMatrix;
// Multiply a matrix M by a vector v: M * v
const applyMatrixToVector = (M, v) => {
    const out = [];
    for (let i = 0; i < M.length; i++) {
        let sum = 0;
        for (let j = 0; j < v.length; j++) {
            sum += M[i][j] * v[j];
        }
        out.push(sum);
    }
    return out;
};
exports.applyMatrixToVector = applyMatrixToVector;
// Multiply two matrices: A * B
const multiplyMatrices = (A, B) => {
    const rowsA = A.length;
    const colsA = A[0].length;
    const rowsB = B.length;
    const colsB = B[0].length;
    if (colsA !== rowsB) {
        throw new Error("Matrix dimension mismatch: A.cols must equal B.rows");
    }
    const out = [];
    for (let i = 0; i < rowsA; i++) {
        const row = [];
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
exports.multiplyMatrices = multiplyMatrices;
// Transpose a matrix: swap rows and columns.
const transpose = (M) => {
    const rows = M.length;
    const cols = M[0].length;
    const out = [];
    for (let j = 0; j < cols; j++) {
        const row = [];
        for (let i = 0; i < rows; i++) {
            row.push(M[i][j]);
        }
        out.push(row);
    }
    return out;
};
exports.transpose = transpose;
