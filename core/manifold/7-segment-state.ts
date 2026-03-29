// ---------------------------------------------
// 7‑Segment Manifold State
// ---------------------------------------------
export interface ManifoldState {
  id: number;                     // Identity axis
  relation: number;               // Relation axis
  geometry: number;               // Geometry axis
  expression: number;             // Expression axis
  collapse: number;               // Collapse axis
  creation: number;               // Creation axis
  governance: number;             // Law / constraint axis
}

// ---------------------------------------------
// Segment Operator Type
// Each segment is a 90° orthogonal transform
// ---------------------------------------------
export type SegmentOperator = (state: ManifoldState) => ManifoldState;

// ---------------------------------------------
// Unified Evolution Function F
// F = G ∘ C ∘ K ∘ E ∘ Ge ∘ R ∘ I
// ---------------------------------------------
export function evolveManifold(
  state: ManifoldState,
  segments: {
    identity: SegmentOperator;
    relation: SegmentOperator;
    geometry: SegmentOperator;
    expression: SegmentOperator;
    collapse: SegmentOperator;
    creation: SegmentOperator;
    governance: SegmentOperator;
  }
): ManifoldState {

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
export const defaultSegments = {
  // Identity: Entity identity and versioning
  identity: (state: ManifoldState): ManifoldState => ({
    ...state,
    id: state.id + 1
  }),

  // Relation: Entity relationships and constraints
  relation: (state: ManifoldState): ManifoldState => ({
    ...state,
    relation: state.relation + 0.1
  }),

  // Geometry: Spatial positioning and transformations
  geometry: (state: ManifoldState): ManifoldState => ({
    ...state,
    geometry: state.geometry + 0.05
  }),

  // Expression: State changes and property updates
  expression: (state: ManifoldState): ManifoldState => ({
    ...state,
    expression: state.expression + 0.2
  }),

  // Collapse: State reduction and optimization
  collapse: (state: ManifoldState): ManifoldState => ({
    ...state,
    collapse: Math.min(1, state.collapse + 0.1)
  }),

  // Creation: Entity lifecycle and versioning
  creation: (state: ManifoldState): ManifoldState => ({
    ...state,
    creation: state.creation + 1
  }),

  // Governance: Rules, constraints, and optimization levels
  governance: (state: ManifoldState): ManifoldState => ({
    ...state,
    governance: Math.min(1, state.governance + 0.05)
  })
};

// ---------------------------------------------
// Manifold State Factory
// ---------------------------------------------
export function createManifoldState(initial?: Partial<ManifoldState>): ManifoldState {
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
export function normalizeManifoldState(state: ManifoldState): ManifoldState {
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

export function combineManifoldStates(states: ManifoldState[]): ManifoldState {
  if (states.length === 0) return createManifoldState();
  
  const combined = states.reduce((acc, state) => ({
    id: acc.id + state.id,
    relation: acc.relation + state.relation,
    geometry: acc.geometry + state.geometry,
    expression: acc.expression + state.expression,
    collapse: acc.collapse + state.collapse,
    creation: acc.creation + state.creation,
    governance: acc.governance + state.governance
  }));

  return normalizeManifoldState(combined);
}

export function manifoldStateDistance(a: ManifoldState, b: ManifoldState): number {
  const diff = {
    id: a.id - b.id,
    relation: a.relation - b.relation,
    geometry: a.geometry - b.geometry,
    expression: a.expression - b.expression,
    collapse: a.collapse - b.collapse,
    creation: a.creation - b.creation,
    governance: a.governance - b.governance
  };

  return Math.sqrt(
    diff.id ** 2 +
    diff.relation ** 2 +
    diff.geometry ** 2 +
    diff.expression ** 2 +
    diff.collapse ** 2 +
    diff.creation ** 2 +
    diff.governance ** 2
  );
}