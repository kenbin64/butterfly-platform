import { VecN } from "../geometry/vector";
import { Matrix, identityMatrix, applyMatrixToVector, multiplyMatrices } from "./matrix";
import { Transform, identityTransform, applyTransform, composeTransform } from "./transform";

// A Basis is an origin + an ordered set of basis vectors.
// This defines a coordinate frame in n dimensions.
export interface Basis {
    readonly origin: VecN;   // point in world coordinates
    readonly axes: Matrix;   // n×n matrix whose columns are basis vectors
}

// Create the standard basis at the origin.
export const standardBasis = (n: number): Basis => ({
    origin: Array(n).fill(0),
    axes: identityMatrix(n),
});

// Convert a vector expressed in this basis into world coordinates.
// world = origin + axes * local
export const toWorld = (B: Basis, local: VecN): VecN => {
    const rotated = applyMatrixToVector(B.axes, local);
    const out: VecN = [];
    for (let i = 0; i < rotated.length; i++) {
        out.push(rotated[i] + B.origin[i]);
    }
    return out;
};

// Convert a world vector into this basis's coordinates.
// local = axes^{-1} * (world - origin)
// We assume axes is orthonormal (true for all rotation‑derived bases).
export const toLocal = (B: Basis, world: VecN): VecN => {
    const shifted: VecN = [];
    for (let i = 0; i < world.length; i++) {
        shifted.push(world[i] - B.origin[i]);
    }

    // For orthonormal axes, inverse = transpose.
    const axesT = transpose(B.axes);

    return applyMatrixToVector(axesT, shifted);
};

// Build a transform that maps coordinates from basis B to world space.
export const basisToWorldTransform = (B: Basis): Transform => ({
    M: B.axes,
    t: [...B.origin],
});

// Build a transform that maps world coordinates into basis B.
export const worldToBasisTransform = (B: Basis): Transform => {
    const axesT = transpose(B.axes);
    const negOrigin: VecN = [];
    for (let i = 0; i < B.origin.length; i++) {
        negOrigin.push(-B.origin[i]);
    }
    const t = applyMatrixToVector(axesT, negOrigin);
    return { M: axesT, t };
};

// Transform a basis by a world‑space transform T.
// This produces a new basis B' = T ∘ B.
export const transformBasis = (T: Transform, B: Basis): Basis => {
    const newOrigin = applyTransform(T, B.origin);

    const newAxes: Matrix = [];
    for (let i = 0; i < B.axes.length; i++) {
        const col: VecN = B.axes.map(row => row[i]);
        const transformed = applyTransform(T, col);
        newAxes.push(transformed);
    }

    // newAxes is currently column‑major; convert to row‑major.
    return {
        origin: newOrigin,
        axes: transpose(newAxes),
    };
};

// Transpose helper (local to this file).
const transpose = (M: Matrix): Matrix => {
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