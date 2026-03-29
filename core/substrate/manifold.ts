import { VecN } from "../geometry/vector";
import { SaddleForm } from "../geometry/saddle";
import { Chart, chartFromBasis } from "../manifold/manifold";
import { Manifold, manifold } from "../manifold/manifold";
import { standardBasis } from "../transform/basis";
import { SaddleField } from "./saddlefield";

// A SaddleManifold is a Manifold whose charts are shaped by SaddleForms.
// Each chart's coordinate system is oriented by a SaddleForm's axes —
// the zero directions of the saddle become the chart's basis vectors.
// This makes the saddle geometry a first-class coordinate system,
// not just a field value.

// Build a Chart whose basis is aligned to a SaddleForm's zero axes.
// The two zero directions (lx=0 and ly=0) become the x and y basis axes.
// Origin is placed at the given world position.
export const chartFromSaddle = (origin: VecN, form: SaddleForm): Chart => {
    const [d1, d2] = form.zeroDirections();
    const n = origin.length;

    // Build an n-dimensional basis: first two axes from the saddle,
    // remaining axes are standard (identity).
    const axes: number[][] = [];
    for (let i = 0; i < n; i++) {
        const row: number[] = [];
        for (let j = 0; j < n; j++) {
            if (i === 0) row.push(j < d1.length ? d1[j] : 0);
            else if (i === 1) row.push(j < d2.length ? d2[j] : 0);
            else row.push(i === j ? 1 : 0);
        }
        axes.push(row);
    }

    return chartFromBasis({ origin, axes });
};

// A SaddleManifold wraps a standard Manifold with saddle-derived charts
// and keeps the SaddleField that governs the geometry.
export interface SaddleManifold {
    readonly manifold: Manifold;
    readonly field: SaddleField;
}

// Build a SaddleManifold from a SaddleField.
// One chart is created per cell in the field.
export const saddleManifold = (field: SaddleField): SaddleManifold => {
    const charts: Chart[] = field.cells.map(cell => {
        const origin: VecN = [cell.position[0], cell.position[1]];
        return chartFromSaddle(origin, cell.form);
    });

    // Always include a standard chart at the origin as the world reference.
    if (charts.length === 0) {
        charts.push(chartFromBasis(standardBasis(2)));
    }

    return { manifold: manifold(charts), field };
};

// Find the chart in a SaddleManifold that governs a given world point.
// This is the chart whose saddle cell is nearest to the point.
export const chartAt = (sm: SaddleManifold, p: VecN): Chart => {
    const cell = sm.field.nearest(p);
    if (!cell) return sm.manifold.charts[0];
    const origin: VecN = [cell.position[0], cell.position[1]];
    return chartFromSaddle(origin, cell.form);
};
