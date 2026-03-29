"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chartAt = exports.saddleManifold = exports.chartFromSaddle = void 0;
const manifold_1 = require("../manifold/manifold");
const manifold_2 = require("../manifold/manifold");
const basis_1 = require("../transform/basis");
// A SaddleManifold is a Manifold whose charts are shaped by SaddleForms.
// Each chart's coordinate system is oriented by a SaddleForm's axes —
// the zero directions of the saddle become the chart's basis vectors.
// This makes the saddle geometry a first-class coordinate system,
// not just a field value.
// Build a Chart whose basis is aligned to a SaddleForm's zero axes.
// The two zero directions (lx=0 and ly=0) become the x and y basis axes.
// Origin is placed at the given world position.
const chartFromSaddle = (origin, form) => {
    const [d1, d2] = form.zeroDirections();
    const n = origin.length;
    // Build an n-dimensional basis: first two axes from the saddle,
    // remaining axes are standard (identity).
    const axes = [];
    for (let i = 0; i < n; i++) {
        const row = [];
        for (let j = 0; j < n; j++) {
            if (i === 0)
                row.push(j < d1.length ? d1[j] : 0);
            else if (i === 1)
                row.push(j < d2.length ? d2[j] : 0);
            else
                row.push(i === j ? 1 : 0);
        }
        axes.push(row);
    }
    return (0, manifold_1.chartFromBasis)({ origin, axes });
};
exports.chartFromSaddle = chartFromSaddle;
// Build a SaddleManifold from a SaddleField.
// One chart is created per cell in the field.
const saddleManifold = (field) => {
    const charts = field.cells.map(cell => {
        const origin = [cell.position[0], cell.position[1]];
        return (0, exports.chartFromSaddle)(origin, cell.form);
    });
    // Always include a standard chart at the origin as the world reference.
    if (charts.length === 0) {
        charts.push((0, manifold_1.chartFromBasis)((0, basis_1.standardBasis)(2)));
    }
    return { manifold: (0, manifold_2.manifold)(charts), field };
};
exports.saddleManifold = saddleManifold;
// Find the chart in a SaddleManifold that governs a given world point.
// This is the chart whose saddle cell is nearest to the point.
const chartAt = (sm, p) => {
    const cell = sm.field.nearest(p);
    if (!cell)
        return sm.manifold.charts[0];
    const origin = [cell.position[0], cell.position[1]];
    return (0, exports.chartFromSaddle)(origin, cell.form);
};
exports.chartAt = chartAt;
