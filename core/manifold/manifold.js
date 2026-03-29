"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformManifold = exports.manifold = exports.changeChart = exports.chartFromBasis = void 0;
const transform_1 = require("../transform/transform");
const basis_1 = require("../transform/basis");
// Build a chart from a basis.
const chartFromBasis = (basis) => {
    const toWorld = (0, basis_1.basisToWorldTransform)(basis);
    const toLocal = (0, basis_1.worldToBasisTransform)(basis);
    return { basis, toWorld, toLocal };
};
exports.chartFromBasis = chartFromBasis;
// Convert a point from chart A to chart B.
const changeChart = (A, B, pA) => {
    // world = A.toWorld(pA)
    const world = (0, transform_1.applyTransform)(A.toWorld, pA);
    // pB = B.toLocal(world)
    return (0, transform_1.applyTransform)(B.toLocal, world);
};
exports.changeChart = changeChart;
// Create a manifold from a list of charts.
const manifold = (charts) => ({
    charts,
});
exports.manifold = manifold;
// Apply a world-space transform to every chart in the manifold.
// This produces a new manifold with transformed charts.
const transformManifold = (M, T) => {
    const newCharts = [];
    for (const C of M.charts) {
        // Transform the basis.
        const newBasis = {
            origin: (0, transform_1.applyTransform)(T, C.basis.origin),
            axes: C.basis.axes.map(col => (0, transform_1.applyTransform)(T, col)),
        };
        // Rebuild chart.
        const newChart = (0, exports.chartFromBasis)({
            origin: newBasis.origin,
            axes: transpose(newBasis.axes),
        });
        newCharts.push(newChart);
    }
    return { charts: newCharts };
};
exports.transformManifold = transformManifold;
// Local transpose helper.
const transpose = (M) => {
    const rows = M.length;
    const cols = M[0].length;
    const out = [];
    for (let j = 0; j < cols; j++) {
        const row = [];
        for (let i = 0; i < rows; i++) {
            row.push(M[i][j]);
        }
        out.push(row);
    }
    return out;
};
