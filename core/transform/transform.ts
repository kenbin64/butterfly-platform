import { VecN } from "../geometry/vector";
import { Matrix, applyMatrixToVector, multiplyMatrices, identityMatrix } from "./matrix";
import { Affine, applyAffine, composeAffine, identityAffine } from "./affine";

// A Transform is the unified representation of geometric action.
// It is always affine: x' = Mx + t
export interface Transform {
    readonly M: Matrix; // linear part
    readonly t: VecN;   // translation part
}

// Create an identity transform in n dimensions.
export const identityTransform = (n: number): Transform => ({
    M: identityMatrix(n),
    t: Array(n).fill(0),
});

// Apply a transform to a vector/point.
export const applyTransform = (T: Transform, v: VecN): VecN => {
    return applyAffine(T, v);
};

// Compose two transforms: T = A ∘ B
// Meaning: first apply B, then apply A.
export const composeTransform = (A: Transform, B: Transform): Transform => {
    const C = composeAffine(A, B);
    return { M: C.M, t: C.t };
};

// Build a transform from a pure matrix (no translation).
export const fromMatrix = (M: Matrix): Transform => {
    return {
        M,
        t: Array(M.length).fill(0),
    };
};

// Build a transform from an affine.
export const fromAffine = (A: Affine): Transform => ({
    M: A.M,
    t: A.t,
});

// Convert a transform back to an affine.
export const toAffine = (T: Transform): Affine => ({
    M: T.M,
    t: T.t,
});

// Apply only the linear part of a transform.
export const applyLinear = (T: Transform, v: VecN): VecN => {
    return applyMatrixToVector(T.M, v);
};

// Add a translation to an existing transform.
export const withTranslation = (T: Transform, offset: VecN): Transform => {
    if (offset.length !== T.t.length) {
        throw new Error("Translation dimension mismatch");
    }
    const t: VecN = [];
    for (let i = 0; i < offset.length; i++) {
        t.push(T.t[i] + offset[i]);
    }
    return { M: T.M, t };
};