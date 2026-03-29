"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.worldToParticle = exports.particleToWorld = exports.stepParticle = exports.stepParticleFlow = exports.stepParticleField = exports.particle = void 0;
const transform_1 = require("../transform/transform");
const flow_1 = require("../manifold/flow");
// Create a particle at a given chart-space position.
const particle = (chart, position, attributes = {}) => ({
    chart,
    position,
    attributes,
});
exports.particle = particle;
// Move a particle by a local flow field.
// p' = p + dt * v(p)
const stepParticleField = (P, F, dt) => {
    const newPos = (0, flow_1.stepFlowPoint)(F, P.position, dt);
    return { chart: P.chart, position: newPos, attributes: P.attributes };
};
exports.stepParticleField = stepParticleField;
// Move a particle by a global flow transform at time t.
const stepParticleFlow = (P, flow, t) => {
    const newPos = (0, flow_1.applyFlowToPoint)(flow, P.chart, P.position, t);
    return { chart: P.chart, position: newPos, attributes: P.attributes };
};
exports.stepParticleFlow = stepParticleFlow;
// Move a particle by both local and global flows.
const stepParticle = (P, fields, flows, dt, t) => {
    let P2 = P;
    // Apply local flow fields.
    for (const F of fields) {
        P2 = (0, exports.stepParticleField)(P2, F, dt);
    }
    // Apply global flows.
    for (const flow of flows) {
        P2 = (0, exports.stepParticleFlow)(P2, flow, t);
    }
    return P2;
};
exports.stepParticle = stepParticle;
// Convert a particle's position to world coordinates.
const particleToWorld = (P) => {
    return (0, transform_1.applyTransform)(P.chart.toWorld, P.position);
};
exports.particleToWorld = particleToWorld;
// Convert a world-space point into the particle's chart coordinates.
const worldToParticle = (P, world) => {
    return (0, transform_1.applyTransform)(P.chart.toLocal, world);
};
exports.worldToParticle = worldToParticle;
