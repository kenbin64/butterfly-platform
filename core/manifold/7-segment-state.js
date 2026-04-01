"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSegments = void 0;
exports.evolveManifold = evolveManifold;
exports.createManifoldState = createManifoldState;
exports.normalizeManifoldState = normalizeManifoldState;
exports.combineManifoldStates = combineManifoldStates;
exports.manifoldStateDistance = manifoldStateDistance;
// ---------------------------------------------
// Unified Evolution Function F
// F = G ∘ C ∘ K ∘ E ∘ Ge ∘ R ∘ I
// ---------------------------------------------
function evolveManifold(state, segments) {
    // Apply the 7 orthogonal transforms in governed order
    const s1 = segments.identity(state);
    const s2 = segments.relation(s1);
    const s3 = segments.geometry(s2);
    const s4 = segments.expression(s3);
    const s5 = segments.collapse(s4);
    const s6 = segments.creation(s5);
    const s7 = segments.governance(s6);
    return s7;
}
// ---------------------------------------------
// Default Segment Operators
// ---------------------------------------------
exports.defaultSegments = {
    // Identity: Entity identity and versioning
    identity: (state) => ({
        ...state,
        id: state.id + 1
    }),
    // Relation: Entity relationships and constraints
    relation: (state) => ({
        ...state,
        relation: state.relation + 0.1
    }),
    // Geometry: Spatial positioning and transformations
    geometry: (state) => ({
        ...state,
        geometry: state.geometry + 0.05
    }),
    // Expression: State changes and property updates
    expression: (state) => ({
        ...state,
        expression: state.expression + 0.2
    }),
    // Collapse: State reduction and optimization
    collapse: (state) => ({
        ...state,
        collapse: Math.min(1, state.collapse + 0.1)
    }),
    // Creation: Entity lifecycle and versioning
    creation: (state) => ({
        ...state,
        creation: state.creation + 1
    }),
    // Governance: Rules, constraints, and optimization levels
    governance: (state) => ({
        ...state,
        governance: Math.min(1, state.governance + 0.05)
    })
};
// ---------------------------------------------
// Manifold State Factory
// ---------------------------------------------
function createManifoldState(initial) {
    return {
        id: 0,
        relation: 0,
        geometry: 0,
        expression: 0,
        collapse: 0,
        creation: 0,
        governance: 0,
        ...initial
    };
}
// ---------------------------------------------
// Manifold State Utilities
// ---------------------------------------------
function normalizeManifoldState(state) {
    return {
        id: Math.max(0, Math.min(1, state.id)),
        relation: Math.max(0, Math.min(1, state.relation)),
        geometry: Math.max(0, Math.min(1, state.geometry)),
        expression: Math.max(0, Math.min(1, state.expression)),
        collapse: Math.max(0, Math.min(1, state.collapse)),
        creation: Math.max(0, Math.min(1, state.creation)),
        governance: Math.max(0, Math.min(1, state.governance))
    };
}
// Round to 10 significant decimal places to eliminate IEEE-754 drift
function roundManifold(v) {
    return Math.round(v * 1e10) / 1e10;
}
function combineManifoldStates(states) {
    if (states.length === 0)
        return createManifoldState();
    const combined = states.reduce((acc, state) => ({
        id: acc.id + state.id,
        relation: acc.relation + state.relation,
        geometry: acc.geometry + state.geometry,
        expression: acc.expression + state.expression,
        collapse: acc.collapse + state.collapse,
        creation: acc.creation + state.creation,
        governance: acc.governance + state.governance
    }));
    // Apply rounding before clamping to eliminate IEEE-754 floating-point drift
    const rounded = {
        id: roundManifold(combined.id),
        relation: roundManifold(combined.relation),
        geometry: roundManifold(combined.geometry),
        expression: roundManifold(combined.expression),
        collapse: roundManifold(combined.collapse),
        creation: roundManifold(combined.creation),
        governance: roundManifold(combined.governance)
    };
    return normalizeManifoldState(rounded);
}
function manifoldStateDistance(a, b) {
    const diff = {
        id: a.id - b.id,
        relation: a.relation - b.relation,
        geometry: a.geometry - b.geometry,
        expression: a.expression - b.expression,
        collapse: a.collapse - b.collapse,
        creation: a.creation - b.creation,
        governance: a.governance - b.governance
    };
    return Math.sqrt(diff.id ** 2 +
        diff.relation ** 2 +
        diff.geometry ** 2 +
        diff.expression ** 2 +
        diff.collapse ** 2 +
        diff.creation ** 2 +
        diff.governance ** 2);
}
