import { VecN } from "../geometry/vector";
import { Chart } from "../manifold/manifold";
import { applyTransform } from "../transform/transform";

// A ScalarField assigns a scalar value to each point in a chart.
export interface ScalarField {
    valueAt: (p: VecN) => number;
}

// A VectorField assigns a vector (in chart coordinates) to each point.
export interface VectorField {
    valueAt: (p: VecN) => VecN;
}

// A TensorField assigns an n×n matrix to each point.
// This is the ND analogue of a metric, stress tensor, etc.
export interface TensorField {
    valueAt: (p: VecN) => number[][];
}

// Sample a scalar field at a world-space point.
export const sampleScalarWorld = (F: ScalarField, chart: Chart, world: VecN): number => {
    const local = applyTransform(chart.toLocal, world);
    return F.valueAt(local);
};

// Sample a vector field at a world-space point.
export const sampleVectorWorld = (F: VectorField, chart: Chart, world: VecN): VecN => {
    const local = applyTransform(chart.toLocal, world);
    return F.valueAt(local);
};

// Sample a tensor field at a world-space point.
export const sampleTensorWorld = (F: TensorField, chart: Chart, world: VecN): number[][] => {
    const local = applyTransform(chart.toLocal, world);
    return F.valueAt(local);
};

// Push a vector field forward through a world-space transform.
// This is the ND analogue of a pushforward map.
export const pushforwardVectorField = (
    F: VectorField,
    chart: Chart,
    T: { M: number[][]; t: VecN }
): VectorField => {
    return {
        valueAt: (p: VecN) => {
            const v = F.valueAt(p);
            return applyTransform({ M: T.M, t: Array(v.length).fill(0) }, v);
        },
    };
};