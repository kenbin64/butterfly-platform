import { VecN } from "../geometry/vector";
import { Transform, applyTransform } from "../transform/transform";
import { Chart } from "./manifold";
import { Observer } from "./observer";

// A FlowField assigns a velocity vector to each point in a chart.
// This is the discrete computational analogue of a vector field.
export interface FlowField {
    // Given a point in chart coordinates, return its velocity in chart coordinates.
    velocity: (p: VecN) => VecN;
}

// Apply one step of a flow field to a point in a chart.
// p' = p + dt * v(p)
export const stepFlowPoint = (F: FlowField, p: VecN, dt: number): VecN => {
    const v = F.velocity(p);
    const out: VecN = [];
    for (let i = 0; i < p.length; i++) {
        out.push(p[i] + dt * v[i]);
    }
    return out;
};

// Apply one step of a flow field to an observer.
// The observer moves according to the flow in its own chart.
export const stepFlowObserver = (F: FlowField, O: Observer, dt: number): Observer => {
    const v = F.velocity(O.position);
    const delta = v.map(x => dt * x);
    return {
        chart: O.chart,
        position: O.position.map((x, i) => x + delta[i]),
    };
};

// A Flow is a time-evolving world-space transform.
// This is the discrete analogue of integrating a flow field globally.
export interface Flow {
    // Given time t, return a world-space transform.
    transformAt: (t: number) => Transform;
}

// Apply a flow transform to a point in a chart at time t.
export const applyFlowToPoint = (flow: Flow, chart: Chart, p: VecN, t: number): VecN => {
    const world = applyTransform(chart.toWorld, p);
    const world2 = applyTransform(flow.transformAt(t), world);
    return applyTransform(chart.toLocal, world2);
};

// Apply a flow transform to an observer at time t.
export const applyFlowToObserver = (flow: Flow, O: Observer, t: number): Observer => {
    const world = applyTransform(O.chart.toWorld, O.position);
    const world2 = applyTransform(flow.transformAt(t), world);
    const newLocal = applyTransform(O.chart.toLocal, world2);
    return { chart: O.chart, position: newLocal };
};