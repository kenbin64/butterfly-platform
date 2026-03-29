import { VecN } from "../geometry/vector";
import { Chart } from "../manifold/manifold";
import { applyTransform } from "../transform/transform";
import { Flow, FlowField, stepFlowPoint, applyFlowToPoint } from "../manifold/flow";

// A Particle is a point that lives in a specific chart.
// It has:
// - a position in chart coordinates
// - optional attributes (scalar, vector, tensor, etc.)
export interface Particle {
    readonly chart: Chart;
    readonly position: VecN;
    readonly attributes?: Record<string, unknown>;
}

// Create a particle at a given chart-space position.
export const particle = (
    chart: Chart,
    position: VecN,
    attributes: Record<string, unknown> = {}
): Particle => ({
    chart,
    position,
    attributes,
});

// Move a particle by a local flow field.
// p' = p + dt * v(p)
export const stepParticleField = (P: Particle, F: FlowField, dt: number): Particle => {
    const newPos = stepFlowPoint(F, P.position, dt);
    return { chart: P.chart, position: newPos, attributes: P.attributes };
};

// Move a particle by a global flow transform at time t.
export const stepParticleFlow = (P: Particle, flow: Flow, t: number): Particle => {
    const newPos = applyFlowToPoint(flow, P.chart, P.position, t);
    return { chart: P.chart, position: newPos, attributes: P.attributes };
};

// Move a particle by both local and global flows.
export const stepParticle = (
    P: Particle,
    fields: FlowField[],
    flows: Flow[],
    dt: number,
    t: number
): Particle => {
    let P2 = P;

    // Apply local flow fields.
    for (const F of fields) {
        P2 = stepParticleField(P2, F, dt);
    }

    // Apply global flows.
    for (const flow of flows) {
        P2 = stepParticleFlow(P2, flow, t);
    }

    return P2;
};

// Convert a particle's position to world coordinates.
export const particleToWorld = (P: Particle): VecN => {
    return applyTransform(P.chart.toWorld, P.position);
};

// Convert a world-space point into the particle's chart coordinates.
export const worldToParticle = (P: Particle, world: VecN): VecN => {
    return applyTransform(P.chart.toLocal, world);
};