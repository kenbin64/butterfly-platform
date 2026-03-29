import { VecN } from "../geometry/vector";
import { Transform } from "../transform/transform";
import { Manifold, transformManifold } from "../manifold/manifold";
import { Observer } from "../manifold/observer";
import { Flow, FlowField, applyFlowToObserver } from "../manifold/flow";

// The Substrate is the evolving geometric medium.
// It contains:
// - a manifold (charts + frames)
// - a set of observers
// - a set of flow fields (local motion)
// - a set of global flows (world-space transforms)
export interface Substrate {
    readonly manifold: Manifold;
    readonly observers: Observer[];
    readonly fields: FlowField[];
    readonly flows: Flow[];
}

// Create a substrate with a manifold and optional components.
export const substrate = (
    manifold: Manifold,
    observers: Observer[] = [],
    fields: FlowField[] = [],
    flows: Flow[] = []
): Substrate => ({
    manifold,
    observers,
    fields,
    flows,
});

// Step the substrate forward by dt at time t.
// This updates:
// - observers (local flow fields + global flows)
// - manifold (global flows)
export const stepSubstrate = (S: Substrate, dt: number, t: number): Substrate => {
    // 1. Update observers.
    const updatedObservers: Observer[] = S.observers.map(O => {
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
            O2 = applyFlowToObserver(flow, O2, t);
        }

        return O2;
    });

    // 2. Update manifold via global flows.
    let updatedManifold = S.manifold;
    for (const flow of S.flows) {
        const T = flow.transformAt(t);
        updatedManifold = transformManifold(updatedManifold, T);
    }

    return {
        manifold: updatedManifold,
        observers: updatedObservers,
        fields: S.fields,
        flows: S.flows,
    };
};