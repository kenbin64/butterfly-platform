"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyFlowToObserver = exports.applyFlowToPoint = exports.stepFlowObserver = exports.stepFlowPoint = void 0;
const transform_1 = require("../transform/transform");
// Apply one step of a flow field to a point in a chart.
// p' = p + dt * v(p)
const stepFlowPoint = (F, p, dt) => {
    const v = F.velocity(p);
    const out = [];
    for (let i = 0; i < p.length; i++) {
        out.push(p[i] + dt * v[i]);
    }
    return out;
};
exports.stepFlowPoint = stepFlowPoint;
// Apply one step of a flow field to an observer.
// The observer moves according to the flow in its own chart.
const stepFlowObserver = (F, O, dt) => {
    const v = F.velocity(O.position);
    const delta = v.map(x => dt * x);
    return {
        chart: O.chart,
        position: O.position.map((x, i) => x + delta[i]),
    };
};
exports.stepFlowObserver = stepFlowObserver;
// Apply a flow transform to a point in a chart at time t.
const applyFlowToPoint = (flow, chart, p, t) => {
    const world = (0, transform_1.applyTransform)(chart.toWorld, p);
    const world2 = (0, transform_1.applyTransform)(flow.transformAt(t), world);
    return (0, transform_1.applyTransform)(chart.toLocal, world2);
};
exports.applyFlowToPoint = applyFlowToPoint;
// Apply a flow transform to an observer at time t.
const applyFlowToObserver = (flow, O, t) => {
    const world = (0, transform_1.applyTransform)(O.chart.toWorld, O.position);
    const world2 = (0, transform_1.applyTransform)(flow.transformAt(t), world);
    const newLocal = (0, transform_1.applyTransform)(O.chart.toLocal, world2);
    return { chart: O.chart, position: newLocal };
};
exports.applyFlowToObserver = applyFlowToObserver;
