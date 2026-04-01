"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformBasis = exports.worldToBasisTransform = exports.basisToWorldTransform = exports.toLocal = exports.toWorld = exports.standardBasis = void 0;
const matrix_1 = require("./matrix");
const transform_1 = require("./transform");
// Create the standard basis at the origin.
const standardBasis = (n) => ({
    origin: Array(n).fill(0),
    axes: (0, matrix_1.identityMatrix)(n),
});
exports.standardBasis = standardBasis;
// Convert a vector expressed in this basis into world coordinates.
// world = origin + axes * local
const toWorld = (B, local) => {
    const rotated = (0, matrix_1.applyMatrixToVector)(B.axes, local);
    const out = [];
    for (let i = 0; i < rotated.length; i++) {
        out.push(rotated[i] + B.origin[i]);
    }
    return out;
};
exports.toWorld = toWorld;
// Convert a world vector into this basis's coordinates.
// local = axes^{-1} * (world - origin)
// We assume axes is orthonormal (true for all rotation‑derived bases).
const toLocal = (B, world) => {
    const shifted = [];
    for (let i = 0; i < world.length; i++) {
        shifted.push(world[i] - B.origin[i]);
    }
    // For orthonormal axes, inverse = transpose.
    const axesT = transpose(B.axes);
    return (0, matrix_1.applyMatrixToVector)(axesT, shifted);
};
exports.toLocal = toLocal;
// Build a transform that maps coordinates from basis B to world space.
const basisToWorldTransform = (B) => ({
    M: B.axes,
    t: [...B.origin],
});
exports.basisToWorldTransform = basisToWorldTransform;
// Build a transform that maps world coordinates into basis B.
const worldToBasisTransform = (B) => {
    const axesT = transpose(B.axes);
    const negOrigin = [];
    for (let i = 0; i < B.origin.length; i++) {
        negOrigin.push(-B.origin[i]);
    }
    const t = (0, matrix_1.applyMatrixToVector)(axesT, negOrigin);
    return { M: axesT, t };
};
exports.worldToBasisTransform = worldToBasisTransform;
// Transform a basis by a world‑space transform T.
// This produces a new basis B' = T ∘ B.
const transformBasis = (T, B) => {
    const newOrigin = (0, transform_1.applyTransform)(T, B.origin);
    const newAxes = [];
    for (let i = 0; i < B.axes.length; i++) {
        const col = B.axes.map(row => row[i]);
        const transformed = (0, transform_1.applyTransform)(T, col);
        newAxes.push(transformed);
    }
    // newAxes is currently column‑major; convert to row‑major.
    return {
        origin: newOrigin,
        axes: transpose(newAxes),
    };
};
exports.transformBasis = transformBasis;
// Transpose helper (local to this file).
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
