import { VecN } from "../geometry/vector";
import { Matrix, applyMatrixToVector, multiplyMatrices, identityMatrix } from "./matrix";

// An affine transform is defined as:
//   x' = Mx + t
// where M is an n×n matrix and t is an n‑vector.
export interface Affine {
    readonly M: Matrix; // linear part
    readonly t: VecN;   // translation part
}

// Create an identity affine transform in n dimensions.
export const identityAffine = (n: number): Affine => ({
    M: identityMatrix(n),
    t: Array(n).fill(0),
});

// Apply an affine transform to a vector/point.
export const applyAffine = (A: Affine, v: VecN): VecN => {
    const linear = applyMatrixToVector(A.M, v);
    const out: VecN = [];
    for (let i = 0; i < linear.length; i++) {
        out.push(linear[i] + A.t[i]);
    }
    return out;
};

// Compose two affine transforms: A ∘ B
// Meaning: first apply B, then apply A.
// Result: M = A.M * B.M
//         t = A.M * B.t + A.t
export const composeAffine = (A: Affine, B: Affine): Affine => {
    const M = multiplyMatrices(A.M, B.M);

    const Bt = applyMatrixToVector(A.M, B.t);
    const t: VecN = [];
    for (let i = 0; i < Bt.length; i++) {
        t.push(Bt[i] + A.t[i]);
    }

    return { M, t };
};

// Build a pure translation affine transform.
export const translation = (offset: VecN): Affine => {
    return {
        M: identityMatrix(offset.length),
        t: [...offset],
    };
};

// Build a pure uniform scaling affine transform.
export const uniformScale = (n: number, s: number): Affine => {
    const M = identityMatrix(n).map(row => row.map(v => v * s));
    const t = Array(n).fill(0);
    return { M, t };
};