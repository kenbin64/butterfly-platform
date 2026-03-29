"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scale = exports.add = exports.mag = exports.dot = void 0;
// Dot product: sum of component-wise products.
const dot = (a, b) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
};
exports.dot = dot;
// Magnitude (length) of a vector.
const mag = (v) => {
    return Math.sqrt((0, exports.dot)(v, v));
};
exports.mag = mag;
// Vector addition: component-wise sum.
const add = (a, b) => {
    const out = [];
    for (let i = 0; i < a.length; i++) {
        out.push(a[i] + b[i]);
    }
    return out;
};
exports.add = add;
// Scale a vector by a scalar: v * s
const scale = (v, s) => {
    const out = [];
    for (let i = 0; i < v.length; i++) {
        out.push(v[i] * s);
    }
    return out;
};
exports.scale = scale;
