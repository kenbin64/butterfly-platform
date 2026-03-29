"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worldToSignal = exports.signalToWorld = exports.stepSignal = exports.stepSignalAmplitude = exports.stepSignalFlow = exports.stepSignalField = exports.signal = void 0;
const transform_1 = require("../transform/transform");
const flow_1 = require("../manifold/flow");
// Create a signal at a chart-space position.
const signal = (chart, position, amplitude = 1, meta = {}) => ({
    chart,
    position,
    amplitude,
    meta,
});
exports.signal = signal;
// Step a signal through a local flow field.
// Position evolves, amplitude unchanged.
const stepSignalField = (S, F, dt) => {
    const newPos = (0, flow_1.stepFlowPoint)(F, S.position, dt);
    return { chart: S.chart, position: newPos, amplitude: S.amplitude, meta: S.meta };
};
exports.stepSignalField = stepSignalField;
// Step a signal through a global flow transform at time t.
const stepSignalFlow = (S, flow, t) => {
    const newPos = (0, flow_1.applyFlowToPoint)(flow, S.chart, S.position, t);
    return { chart: S.chart, position: newPos, amplitude: S.amplitude, meta: S.meta };
};
exports.stepSignalFlow = stepSignalFlow;
// Apply decay or amplification to a signal.
const stepSignalAmplitude = (S, rate, dt) => {
    const newAmp = S.amplitude * Math.exp(rate * dt);
    return { chart: S.chart, position: S.position, amplitude: newAmp, meta: S.meta };
};
exports.stepSignalAmplitude = stepSignalAmplitude;
// Full signal update: local fields + global flows + amplitude evolution.
const stepSignal = (S, fields, flows, dt, t, amplitudeRate = 0) => {
    let S2 = S;
    // Local flow fields.
    for (const F of fields) {
        S2 = (0, exports.stepSignalField)(S2, F, dt);
    }
    // Global flows.
    for (const flow of flows) {
        S2 = (0, exports.stepSignalFlow)(S2, flow, t);
    }
    // Amplitude evolution.
    if (amplitudeRate !== 0) {
        S2 = (0, exports.stepSignalAmplitude)(S2, amplitudeRate, dt);
    }
    return S2;
};
exports.stepSignal = stepSignal;
// Convert a signal's position to world coordinates.
const signalToWorld = (S) => {
    return (0, transform_1.applyTransform)(S.chart.toWorld, S.position);
};
exports.signalToWorld = signalToWorld;
// Convert a world-space point into the signal's chart coordinates.
const worldToSignal = (S, world) => {
    return (0, transform_1.applyTransform)(S.chart.toLocal, world);
};
exports.worldToSignal = worldToSignal;
