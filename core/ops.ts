import { VecN } from "./geometry/vector";

// Dot product: sum of component-wise products.
export const dot = (a: VecN, b: VecN): number => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += a[i] * b[i];
    }
    return sum;
};

// Magnitude (length) of a vector.
export const mag = (v: VecN): number => {
    return Math.sqrt(dot(v, v));
};

// Vector addition: component-wise sum.
export const add = (a: VecN, b: VecN): VecN => {
    const out: VecN = [];
    for (let i = 0; i < a.length; i++) {
        out.push(a[i] + b[i]);
    }
    return out;
};

// Scale a vector by a scalar: v * s
export const scale = (v: VecN, s: number): VecN => {
    const out: VecN = [];
    for (let i = 0; i < v.length; i++) {
        out.push(v[i] * s);
    }
    return out;
};