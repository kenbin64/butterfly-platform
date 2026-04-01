"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniformScale = exports.translation = exports.composeAffine = exports.applyAffine = exports.identityAffine = void 0;
const matrix_1 = require("./matrix");
// Create an identity affine transform in n dimensions.
const identityAffine = (n) => ({
    M: (0, matrix_1.identityMatrix)(n),
    t: Array(n).fill(0),
});
exports.identityAffine = identityAffine;
// Apply an affine transform to a vector/point.
const applyAffine = (A, v) => {
    const linear = (0, matrix_1.applyMatrixToVector)(A.M, v);
    const out = [];
    for (let i = 0; i < linear.length; i++) {
        out.push(linear[i] + A.t[i]);
    }
    return out;
};
exports.applyAffine = applyAffine;
// Compose two affine transforms: A ∘ B
// Meaning: first apply B, then apply A.
// Result: M = A.M * B.M
//         t = A.M * B.t + A.t
const composeAffine = (A, B) => {
    const M = (0, matrix_1.multiplyMatrices)(A.M, B.M);
    const Bt = (0, matrix_1.applyMatrixToVector)(A.M, B.t);
    const t = [];
    for (let i = 0; i < Bt.length; i++) {
        t.push(Bt[i] + A.t[i]);
    }
    return { M, t };
};
exports.composeAffine = composeAffine;
// Build a pure translation affine transform.
const translation = (offset) => {
    return {
        M: (0, matrix_1.identityMatrix)(offset.length),
        t: [...offset],
    };
};
exports.translation = translation;
// Build a pure uniform scaling affine transform.
const uniformScale = (n, s) => {
    const M = (0, matrix_1.identityMatrix)(n).map(row => row.map(v => v * s));
    const t = Array(n).fill(0);
    return { M, t };
};
exports.uniformScale = uniformScale;
