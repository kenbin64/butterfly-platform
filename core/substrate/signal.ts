import { VecN } from "../geometry/vector";
import { Chart } from "../manifold/manifold";
import { applyTransform } from "../transform/transform";
import { Flow, FlowField, stepFlowPoint, applyFlowToPoint } from "../manifold/flow";

// A Signal is a propagating entity in the substrate.
// It has:
// - a chart-space position
// - an amplitude (scalar)
// - optional metadata
export interface Signal {
    readonly chart: Chart;
    readonly position: VecN;
    readonly amplitude: number;
    readonly meta?: Record<string, unknown>;
}

// Create a signal at a chart-space position.
export const signal = (
    chart: Chart,
    position: VecN,
    amplitude: number = 1,
    meta: Record<string, unknown> = {}
): Signal => ({
    chart,
    position,
    amplitude,
    meta,
});

// Step a signal through a local flow field.
// Position evolves, amplitude unchanged.
export const stepSignalField = (S: Signal, F: FlowField, dt: number): Signal => {
    const newPos = stepFlowPoint(F, S.position, dt);
    return { chart: S.chart, position: newPos, amplitude: S.amplitude, meta: S.meta };
};

// Step a signal through a global flow transform at time t.
export const stepSignalFlow = (S: Signal, flow: Flow, t: number): Signal => {
    const newPos = applyFlowToPoint(flow, S.chart, S.position, t);
    return { chart: S.chart, position: newPos, amplitude: S.amplitude, meta: S.meta };
};

// Apply decay or amplification to a signal.
export const stepSignalAmplitude = (S: Signal, rate: number, dt: number): Signal => {
    const newAmp = S.amplitude * Math.exp(rate * dt);
    return { chart: S.chart, position: S.position, amplitude: newAmp, meta: S.meta };
};

// Full signal update: local fields + global flows + amplitude evolution.
export const stepSignal = (
    S: Signal,
    fields: FlowField[],
    flows: Flow[],
    dt: number,
    t: number,
    amplitudeRate: number = 0
): Signal => {
    let S2 = S;

    // Local flow fields.
    for (const F of fields) {
        S2 = stepSignalField(S2, F, dt);
    }

    // Global flows.
    for (const flow of flows) {
        S2 = stepSignalFlow(S2, flow, t);
    }

    // Amplitude evolution.
    if (amplitudeRate !== 0) {
        S2 = stepSignalAmplitude(S2, amplitudeRate, dt);
    }

    return S2;
};

// Convert a signal's position to world coordinates.
export const signalToWorld = (S: Signal): VecN => {
    return applyTransform(S.chart.toWorld, S.position);
};

// Convert a world-space point into the signal's chart coordinates.
export const worldToSignal = (S: Signal, world: VecN): VecN => {
    return applyTransform(S.chart.toLocal, world);
};