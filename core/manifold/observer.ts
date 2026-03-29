import { VecN } from "../geometry/vector";
import { applyTransform } from "../transform/transform";
import { Chart } from "./manifold";

// An Observer is an entity with:
// - a current chart (local coordinate system)
// - a position in that chart
export interface Observer {
    readonly chart: Chart;     // the chart the observer is currently using
    readonly position: VecN;   // coordinates in chart space
}

// Create an observer at the origin of a chart.
export const observerAtChartOrigin = (chart: Chart): Observer => ({
    chart,
    position: Array(chart.basis.origin.length).fill(0),
});

// Convert a world point into the observer's local coordinates.
export const worldToObserver = (O: Observer, world: VecN): VecN => {
    return applyTransform(O.chart.toLocal, world);
};

// Convert a point in the observer's local coordinates into world space.
export const observerToWorld = (O: Observer, local: VecN): VecN => {
    return applyTransform(O.chart.toWorld, local);
};

// Move the observer by a local displacement vector.
// This is motion *in the observer's own frame*.
export const moveObserverLocal = (O: Observer, deltaLocal: VecN): Observer => {
    const newPos: VecN = [];
    for (let i = 0; i < O.position.length; i++) {
        newPos.push(O.position[i] + deltaLocal[i]);
    }
    return { chart: O.chart, position: newPos };
};

// Move the observer by a world-space displacement vector.
export const moveObserverWorld = (O: Observer, deltaWorld: VecN): Observer => {
    const deltaLocal = worldToObserver(O, deltaWorld);
    return moveObserverLocal(O, deltaLocal);
};

// Change the observer's chart while preserving world position.
export const changeObserverChart = (O: Observer, newChart: Chart): Observer => {
    // Convert observer's current position to world.
    const worldPos = observerToWorld(O, O.position);

    // Convert world position into new chart.
    const newPos = applyTransform(newChart.toLocal, worldPos);

    return { chart: newChart, position: newPos };
};

// Apply a world-space transform to the observer (e.g., global motion).
export const transformObserver = (O: Observer, T: { M: number[][]; t: VecN }): Observer => {
    const worldPos = observerToWorld(O, O.position);
    const newWorldPos = applyTransform(T, worldPos);
    const newLocalPos = applyTransform(O.chart.toLocal, newWorldPos);
    return { chart: O.chart, position: newLocalPos };
};