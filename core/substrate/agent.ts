import { VecN } from "../geometry/vector";
import { Observer, moveObserverLocal } from "../manifold/observer";
import { Flow, FlowField, applyFlowToPoint } from "../manifold/flow";
import { ScalarField, VectorField, TensorField } from "./field";

// An Agent is a hybrid entity with:
// - an observer (perception + frame)
// - an internal state (arbitrary key-value store)
export interface Agent {
    readonly observer: Observer;
    readonly state: Record<string, unknown>;
}

// Create an agent at an observer's position.
export const agent = (
    observer: Observer,
    state: Record<string, unknown> = {}
): Agent => ({
    observer,
    state,
});

// Move an agent by a local flow field (chart-space velocity).
export const stepAgentField = (A: Agent, F: FlowField, dt: number): Agent => {
    const v = F.velocity(A.observer.position);
    const delta = v.map(x => dt * x);
    const newObserver = moveObserverLocal(A.observer, delta);
    return { observer: newObserver, state: A.state };
};

// Move an agent by a global flow transform at time t.
// applyFlowToPoint already returns chart-local coordinates; no further transform needed.
export const stepAgentFlow = (A: Agent, flow: Flow, t: number): Agent => {
    const newLocal = applyFlowToPoint(flow, A.observer.chart, A.observer.position, t);
    const newObserver = { chart: A.observer.chart, position: newLocal };
    return { observer: newObserver, state: A.state };
};

// Agents can perceive scalar, vector, or tensor fields.
// The field is evaluated at the agent's chart-space position directly.
// The previous local→world→local roundtrip was a no-op and has been removed.
export const perceiveScalar = (A: Agent, F: ScalarField): number =>
    F.valueAt(A.observer.position);

export const perceiveVector = (A: Agent, F: VectorField): VecN =>
    F.valueAt(A.observer.position);

export const perceiveTensor = (A: Agent, F: TensorField): number[][] =>
    F.valueAt(A.observer.position);

// Full agent update: local fields + global flows + optional state update.
export const stepAgent = (
    A: Agent,
    fields: FlowField[],
    flows: Flow[],
    dt: number,
    t: number,
    updateState: (state: Record<string, unknown>, A: Agent) => Record<string, unknown> = s => s
): Agent => {
    let A2 = A;

    // Local flow fields.
    for (const F of fields) {
        A2 = stepAgentField(A2, F, dt);
    }

    // Global flows.
    for (const flow of flows) {
        A2 = stepAgentFlow(A2, flow, t);
    }

    // State update.
    const newState = updateState(A2.state, A2);

    return { observer: A2.observer, state: newState };
};