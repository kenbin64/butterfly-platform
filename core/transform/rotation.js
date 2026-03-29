"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rotationBetween = exports.rotateVector = exports.planeRotation = void 0;
const matrix_1 = require("./matrix");
// Create an n×n rotation matrix that rotates in the plane (i, j)
// by angle θ. All other axes are untouched.
//
// This is the only correct ND rotation primitive.
// Any full ND rotation is a composition of these plane rotations.
const planeRotation = (n, i, j, theta) => {
    if (i === j) {
        throw new Error("Rotation plane requires two distinct axes i ≠ j");
    }
    if (i < 0 || j < 0 || i >= n || j >= n) {
        throw new Error("Rotation plane indices out of bounds");
    }
    const M = (0, matrix_1.identityMatrix)(n);
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    // Insert the 2×2 rotation block into the identity matrix.
    M[i][i] = c;
    M[i][j] = -s;
    M[j][i] = s;
    M[j][j] = c;
    return M;
};
exports.planeRotation = planeRotation;
// Apply a rotation matrix to a vector.
// (This is just a convenience wrapper.)
const rotateVector = (R, v) => {
    const out = [];
    for (let i = 0; i < R.length; i++) {
        let sum = 0;
        for (let j = 0; j < v.length; j++) {
            sum += R[i][j] * v[j];
        }
        out.push(sum);
    }
    return out;
};
exports.rotateVector = rotateVector;
// Build a rotation that rotates vector v into vector w
// within the plane they span. This is the ND generalization
// of "rotate one vector onto another".
//
// If v and w are parallel, this returns identity.
const rotationBetween = (v, w) => {
    if (v.length !== w.length) {
        throw new Error("Vectors must have same dimension");
    }
    const n = v.length;
    // Compute dot and magnitudes.
    let dot = 0;
    let vv = 0;
    let ww = 0;
    for (let i = 0; i < n; i++) {
        dot += v[i] * w[i];
        vv += v[i] * v[i];
        ww += w[i] * w[i];
    }
    const magV = Math.sqrt(vv);
    const magW = Math.sqrt(ww);
    if (magV === 0 || magW === 0) {
        throw new Error("Cannot rotate zero vector");
    }
    // Normalize.
    const vn = v.map(x => x / magV);
    const wn = w.map(x => x / magW);
    // If vectors are already aligned, return identity.
    let aligned = true;
    for (let i = 0; i < n; i++) {
        if (Math.abs(vn[i] - wn[i]) > 1e-12) {
            aligned = false;
            break;
        }
    }
    if (aligned) {
        return (0, matrix_1.identityMatrix)(n);
    }
    // Find the plane spanned by vn and wn.
    // We need two orthonormal vectors u and v2.
    const u = vn;
    const v2 = [];
    for (let i = 0; i < n; i++) {
        v2.push(wn[i] - dot / (magV * magW) * vn[i]);
    }
    // Normalize v2.
    let v2norm = 0;
    for (let i = 0; i < n; i++)
        v2norm += v2[i] * v2[i];
    v2norm = Math.sqrt(v2norm);
    for (let i = 0; i < n; i++)
        v2[i] /= v2norm;
    // Compute angle between vn and wn.
    const cosTheta = dot / (magV * magW);
    const theta = Math.acos(Math.min(1, Math.max(-1, cosTheta)));
    // Build rotation matrix as identity + rank‑2 update.
    const R = (0, matrix_1.identityMatrix)(n);
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    // For every pair (i, j), update:
    // R += (c - 1) * (u_i u_j + v2_i v2_j) + s * (v2_i u_j - u_i v2_j)
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            R[i][j] += (c - 1) * (u[i] * u[j] + v2[i] * v2[j]) + s * (v2[i] * u[j] - u[i] * v2[j]);
        }
    }
    return R;
};
exports.rotationBetween = rotationBetween;
