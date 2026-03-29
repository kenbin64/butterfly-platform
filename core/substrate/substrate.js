"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stepSubstrate = exports.substrate = void 0;
const manifold_1 = require("../manifold/manifold");
const flow_1 = require("../manifold/flow");
// Create a substrate with a manifold and optional components.
const substrate = (manifold, observers = [], fields = [], flows = []) => ({
    manifold,
    observers,
    fields,
    flows,
});
exports.substrate = substrate;
// Step the substrate forward by dt at time t.
// This updates:
// - observers (local flow fields + global flows)
// - manifold (global flows)
const stepSubstrate = (S, dt, t) => {
    // 1. Update observers.
    const updatedObservers = S.observers.map(O => {
        let O2 = O;
        // Apply local flow fields (chart-space velocities).
        for (const F of S.fields) {
            const v = F.velocity(O2.position);
            const delta = v.map(x => dt * x);
            O2 = {
                chart: O2.chart,
                position: O2.position.map((x, i) => x + delta[i]),
            };
        }
        // Apply global flows (world-space transforms).
        for (const flow of S.flows) {
            O2 = (0, flow_1.applyFlowToObserver)(flow, O2, t);
        }
        return O2;
    });
    // 2. Update manifold via global flows.
    let updatedManifold = S.manifold;
    for (const flow of S.flows) {
        const T = flow.transformAt(t);
        updatedManifold = (0, manifold_1.transformManifold)(updatedManifold, T);
    }
    return {
        manifold: updatedManifold,
        observers: updatedObservers,
        fields: S.fields,
        flows: S.flows,
    };
};
exports.stepSubstrate = stepSubstrate;
