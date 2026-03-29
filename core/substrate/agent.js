"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stepAgent = exports.perceiveTensor = exports.perceiveVector = exports.perceiveScalar = exports.stepAgentFlow = exports.stepAgentField = exports.agent = void 0;
const observer_1 = require("../manifold/observer");
const flow_1 = require("../manifold/flow");
// Create an agent at an observer's position.
const agent = (observer, state = {}) => ({
    observer,
    state,
});
exports.agent = agent;
// Move an agent by a local flow field (chart-space velocity).
const stepAgentField = (A, F, dt) => {
    const v = F.velocity(A.observer.position);
    const delta = v.map(x => dt * x);
    const newObserver = (0, observer_1.moveObserverLocal)(A.observer, delta);
    return { observer: newObserver, state: A.state };
};
exports.stepAgentField = stepAgentField;
// Move an agent by a global flow transform at time t.
// applyFlowToPoint already returns chart-local coordinates; no further transform needed.
const stepAgentFlow = (A, flow, t) => {
    const newLocal = (0, flow_1.applyFlowToPoint)(flow, A.observer.chart, A.observer.position, t);
    const newObserver = { chart: A.observer.chart, position: newLocal };
    return { observer: newObserver, state: A.state };
};
exports.stepAgentFlow = stepAgentFlow;
// Agents can perceive scalar, vector, or tensor fields.
// The field is evaluated at the agent's chart-space position directly.
// The previous local→world→local roundtrip was a no-op and has been removed.
const perceiveScalar = (A, F) => F.valueAt(A.observer.position);
exports.perceiveScalar = perceiveScalar;
const perceiveVector = (A, F) => F.valueAt(A.observer.position);
exports.perceiveVector = perceiveVector;
const perceiveTensor = (A, F) => F.valueAt(A.observer.position);
exports.perceiveTensor = perceiveTensor;
// Full agent update: local fields + global flows + optional state update.
const stepAgent = (A, fields, flows, dt, t, updateState = s => s) => {
    let A2 = A;
    // Local flow fields.
    for (const F of fields) {
        A2 = (0, exports.stepAgentField)(A2, F, dt);
    }
    // Global flows.
    for (const flow of flows) {
        A2 = (0, exports.stepAgentFlow)(A2, flow, t);
    }
    // State update.
    const newState = updateState(A2.state, A2);
    return { observer: A2.observer, state: newState };
};
exports.stepAgent = stepAgent;
