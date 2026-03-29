import { VecN } from "../geometry/vector";
import { Transform, applyTransform, composeTransform } from "../transform/transform";
import { Basis, basisToWorldTransform, worldToBasisTransform } from "../transform/basis";

// A Chart is a local coordinate system on the manifold.
// It is defined by a Basis (origin + axes) and a Transform
// that maps local coordinates to world coordinates.
export interface Chart {
    readonly basis: Basis;          // coordinate frame
    readonly toWorld: Transform;    // local → world
    readonly toLocal: Transform;    // world → local
}

// Build a chart from a basis.
export const chartFromBasis = (basis: Basis): Chart => {
    const toWorld = basisToWorldTransform(basis);
    const toLocal = worldToBasisTransform(basis);
    return { basis, toWorld, toLocal };
};

// Convert a point from chart A to chart B.
export const changeChart = (A: Chart, B: Chart, pA: VecN): VecN => {
    // world = A.toWorld(pA)
    const world = applyTransform(A.toWorld, pA);

    // pB = B.toLocal(world)
    return applyTransform(B.toLocal, world);
};

// A Manifold is a collection of charts (an atlas).
// Each chart covers some region of the manifold.
export interface Manifold {
    readonly charts: Chart[];
}

// Create a manifold from a list of charts.
export const manifold = (charts: Chart[]): Manifold => ({
    charts,
});

// Apply a world-space transform to every chart in the manifold.
// This produces a new manifold with transformed charts.
export const transformManifold = (M: Manifold, T: Transform): Manifold => {
    const newCharts: Chart[] = [];

    for (const C of M.charts) {
        // Transform the basis.
        const newBasis = {
            origin: applyTransform(T, C.basis.origin),
            axes: C.basis.axes.map(col => applyTransform(T, col)),
        };

        // Rebuild chart.
        const newChart = chartFromBasis({
            origin: newBasis.origin,
            axes: transpose(newBasis.axes),
        });

        newCharts.push(newChart);
    }

    return { charts: newCharts };
};

// Local transpose helper.
const transpose = (M: number[][]): number[][] => {
    const rows = M.length;
    const cols = M[0].length;
    const out: number[][] = [];
    for (let j = 0; j < cols; j++) {
        const row: number[] = [];
        for (let i = 0; i < rows; i++) {
            row.push(M[i][j]);
        }
        out.push(row);
    }
    return out;
};