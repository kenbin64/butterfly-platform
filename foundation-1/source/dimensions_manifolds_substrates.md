# Dimensions, Manifolds, and Substrates

This document formalizes the relationships between dimensions (axes of variation), manifolds (shapes of possibility), and substrates (interpreters) within Foundation‑1. It consolidates the paradigm into enforceable, testable contracts that preserve determinism, purity, and scalability.

---

## Dimensions: Axes of Variation

A dimension is a rule that allows length to vary in a new, independent direction. Each dimension introduces one additional degree of freedom. Dimensions define the coordinate system of the universe; they do not compute or store values.

- Point (0D): no length
- Line (1D): one length
- Plane (2D): two perpendicular lengths
- Volume (3D): three perpendicular lengths
- Higher dimensions: continue by adding independent axes

Properties
- Emergence is sequential: a higher dimension extends all lower ones.
- No forward references: a dimension cannot depend on axes that emerge later.
- Orthogonality is structural: each new axis is independent (distinct identity and order), not a stored value.
- Dimensions are declarations only: they specify how variation is possible, not what values exist.

Nested-iteration law (computational view)
- Lower dimensions fully traverse for each single tick of a higher dimension (nested loops). A lower dimension “occupies” a single coordinate point in the higher dimension while semantically denoting its entire lower-dimensional extent at that slice.

---

## Manifolds: Shapes of Possibility

A manifold is a continuous geometric space defined by one or more dimensions. It is not a container of values; it specifies structure and meaning by declaring how coordinates map to semantics.

Manifolds answer:
- Which dimensions exist in this space?
- How do those axes relate (purely structurally)?
- How do coordinates map to meaning (without computing or storing values)?

Examples
- Color manifold: hue, saturation, brightness
- Spatial manifold: x, y, z
- Wave manifold: frequency, amplitude, phase

Properties
- Pure and stateless: no internal state, no caching, no side‑effects.
- Declarative: define axes and interpretation rules; they do not compute derived values.
- Sliceable: binding higher-dimension coordinates yields a lower-dimensional slice that denotes a complete traversal of remaining axes without mutating the manifold.

---

## Substrates: Interpreters of Manifolds

A substrate interprets manifold coordinates into final, concrete outputs called manifestation packets. Substrates translate geometry into hardware-facing, deterministic packets. They do not compute new values or modify manifolds.

Examples
- Pixel substrate: interprets (x, y, color) into pixel packets
- Sound substrate: interprets (frequency, amplitude, phase) into sound packets
- Physics substrate: interprets (position, velocity) into motion packets

Properties
- Pure interpretation: map coordinates to packets without state or computation beyond translation.
- No storage: do not retain inputs or outputs internally.
- Finalization boundary: only manifestation packets become bits and bytes.

---

## How They Work Together

1) Dimensions define axes of variation
- Independent directions along which values may change; purely declarative.

2) Manifolds define geometric meaning
- Combine dimensions into a structured, continuous space; specify coordinate semantics.

3) Substrates interpret into outputs
- Read coordinates from manifolds; emit final, minimal, deterministic packets.

Separation of concerns
- Dimensions = rules of variation
- Manifolds = geometric meaning
- Substrates = interpretation into packets

Nothing overlaps. Nothing duplicates. Nothing computes unnecessarily.

---

## z = x · y: A Universal Example

- Dimensions: x and y are axes of variation.
- Manifold: the saddle surface z = x·y encodes structure (sign regions, curvature) as geometry.
- Substrate: interprets regions/sign/thresholds from coordinates into final packets (e.g., classification or control signals) without computing new values beyond translation.

The geometry itself encodes logic and thresholds.

---

## Contracts and Invariants

Dimensional contracts
- Sequential emergence: D(n+1) extends D(n); no forward references.
- Axis identity: each axis has a unique name and ordinal (immutable).
- Declaration-only: dimensions carry zero runtime data.

Manifold contracts
- Purity: no state, no I/O, no globals.
- Structural mapping: declare axes and meaning; do not compute derived values.
- Slicing: binding higher axes returns a pure lower-dimensional view; full traversal of free axes is equivalent to evaluating the full space and filtering on the bound coordinates.

Substrate contracts
- Interpretation only: map coordinates to final packets without mutation or storage.
- Deterministic: same inputs => same packets, order defined by canonical axis/identity.
- Minimality: packets contain only final fields; no internal references back into the engine.

Packet contracts
- Frozen/immutable; deterministic; minimal schema per packet type.

Context and process rules (interaction layer)
- Delta-only: process only changed coordinates or slices.
- Viewport-only: limit evaluation to visible/active regions.
- Stable iteration order: nested-iteration semantics define canonical order; parallel execution must preserve the same observable order in outputs.

---

## Testing Guidance (Deterministic and Enforceable)

Dimensional tests
- Validate axis registry uniqueness and sequential order.
- Disallow imports from future dimensions (static import graph check).

Manifold tests
- Purity: before/after object graphs unchanged; no attribute writes.
- Slice equivalence: full evaluation filtered by a bound coordinate equals the evaluation of the bound slice.

Substrate/packet tests
- Determinism: identical inputs produce identical packets in identical order.
- Minimality/immutability: packets are frozen; mutation raises.

End-to-end
- Golden traces: hash outputs for fixed inputs; ensure serial vs parallel equivalence.
- Delta propagation: modifying a higher-axis coordinate only re-evaluates affected lower-dimensional slices.

---

## Integration Notes

- Dimensions are defined centrally as immutable axes with names and ordinals.
- Manifolds consume axis declarations, not raw data; entities carry only coordinates.
- Substrates live at the boundary to hardware or external systems and are the only producers of bits/bytes.
- Geometry kernel (pure math on coordinates) supports interpretation while maintaining purity and determinism.

This document is a normative part of Foundation‑1. Implementations must adhere to these contracts to maintain determinism, purity, and dimensional integrity across the universe.
