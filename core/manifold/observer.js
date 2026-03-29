"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformObserver = exports.changeObserverChart = exports.moveObserverWorld = exports.moveObserverLocal = exports.observerToWorld = exports.worldToObserver = exports.observerAtChartOrigin = void 0;
const transform_1 = require("../transform/transform");
// Create an observer at the origin of a chart.
const observerAtChartOrigin = (chart) => ({
    chart,
    position: Array(chart.basis.origin.length).fill(0),
});
exports.observerAtChartOrigin = observerAtChartOrigin;
// Convert a world point into the observer's local coordinates.
const worldToObserver = (O, world) => {
    return (0, transform_1.applyTransform)(O.chart.toLocal, world);
};
exports.worldToObserver = worldToObserver;
// Convert a point in the observer's local coordinates into world space.
const observerToWorld = (O, local) => {
    return (0, transform_1.applyTransform)(O.chart.toWorld, local);
};
exports.observerToWorld = observerToWorld;
// Move the observer by a local displacement vector.
// This is motion *in the observer's own frame*.
const moveObserverLocal = (O, deltaLocal) => {
    const newPos = [];
    for (let i = 0; i < O.position.length; i++) {
        newPos.push(O.position[i] + deltaLocal[i]);
    }
    return { chart: O.chart, position: newPos };
};
exports.moveObserverLocal = moveObserverLocal;
// Move the observer by a world-space displacement vector.
const moveObserverWorld = (O, deltaWorld) => {
    const deltaLocal = (0, exports.worldToObserver)(O, deltaWorld);
    return (0, exports.moveObserverLocal)(O, deltaLocal);
};
exports.moveObserverWorld = moveObserverWorld;
// Change the observer's chart while preserving world position.
const changeObserverChart = (O, newChart) => {
    // Convert observer's current position to world.
    const worldPos = (0, exports.observerToWorld)(O, O.position);
    // Convert world position into new chart.
    const newPos = (0, transform_1.applyTransform)(newChart.toLocal, worldPos);
    return { chart: newChart, position: newPos };
};
exports.changeObserverChart = changeObserverChart;
// Apply a world-space transform to the observer (e.g., global motion).
const transformObserver = (O, T) => {
    const worldPos = (0, exports.observerToWorld)(O, O.position);
    const newWorldPos = (0, transform_1.applyTransform)(T, worldPos);
    const newLocalPos = (0, transform_1.applyTransform)(O.chart.toLocal, newWorldPos);
    return { chart: O.chart, position: newLocalPos };
};
exports.transformObserver = transformObserver;
