"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTranslation = exports.applyLinear = exports.toAffine = exports.fromAffine = exports.fromMatrix = exports.composeTransform = exports.applyTransform = exports.identityTransform = void 0;
const matrix_1 = require("./matrix");
const affine_1 = require("./affine");
// Create an identity transform in n dimensions.
const identityTransform = (n) => ({
    M: (0, matrix_1.identityMatrix)(n),
    t: Array(n).fill(0),
});
exports.identityTransform = identityTransform;
// Apply a transform to a vector/point.
const applyTransform = (T, v) => {
    return (0, affine_1.applyAffine)(T, v);
};
exports.applyTransform = applyTransform;
// Compose two transforms: T = A ∘ B
// Meaning: first apply B, then apply A.
const composeTransform = (A, B) => {
    const C = (0, affine_1.composeAffine)(A, B);
    return { M: C.M, t: C.t };
};
exports.composeTransform = composeTransform;
// Build a transform from a pure matrix (no translation).
const fromMatrix = (M) => {
    return {
        M,
        t: Array(M.length).fill(0),
    };
};
exports.fromMatrix = fromMatrix;
// Build a transform from an affine.
const fromAffine = (A) => ({
    M: A.M,
    t: A.t,
});
exports.fromAffine = fromAffine;
// Convert a transform back to an affine.
const toAffine = (T) => ({
    M: T.M,
    t: T.t,
});
exports.toAffine = toAffine;
// Apply only the linear part of a transform.
const applyLinear = (T, v) => {
    return (0, matrix_1.applyMatrixToVector)(T.M, v);
};
exports.applyLinear = applyLinear;
// Add a translation to an existing transform.
const withTranslation = (T, offset) => {
    if (offset.length !== T.t.length) {
        throw new Error("Translation dimension mismatch");
    }
    const t = [];
    for (let i = 0; i < offset.length; i++) {
        t.push(T.t[i] + offset[i]);
    }
    return { M: T.M, t };
};
exports.withTranslation = withTranslation;
