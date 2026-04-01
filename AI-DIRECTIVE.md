# AI Directive: Dimensional Manifold Representation Model

> **PRIME DIRECTIVE**: The manifold is the universe. Substrates are the dimensions.
> Engines are the laws of motion. Data is the path you take through it.

---

## The Manifold (Root Reality)

The manifold is the base mathematical space defined by z = x \* y on a
7-section helix. It is not storage. It is not a buffer. It is not a
serialization format.

The manifold is the **generative substrate** from which all values are
discovered by following path expressions (addresses into the geometry).

The stored representation is the cause of the data, not a reversible
encoding of the data. The manifold already contains every possible value.
A path expression says WHERE in the manifold a datum lives.

---

## Dimensional Hierarchy (Substrates)

Substrates are dimensional constructs, not type-based containers.

| Dimension | Substrate | What it is                                                 |
| --------- | --------- | ---------------------------------------------------------- |
| 0D        | Point     | Single manifold coordinate (a number, a boolean, a color)  |
| 1D        | Linear    | A _set_ of points (time series, waveform, animation curve) |
| 2D        | Planar    | A _set_ of linears (image, heightmap, grid, UI layout)     |
| 3D        | Volume    | A _set_ of planes (voxels, physics space, 3D world)        |
| Whole     | Object    | A volume collapsed to a single z -- one point in N+1       |

**Core rule**: A substrate in dimension N is a point in dimension N+1.

---

## Dimensions are Unbounded -- Sets are Finite

Dimensions have no boundaries. You cannot iterate a dimension.
There is no start, no end, no length.

The only things you can loop over are **sets** -- finite collections
of discovered path expressions (addresses).

- A Linear substrate holds a _set_ of point addresses.
- A Planar substrate holds a _set_ of linear addresses.
- A Volume substrate holds a _set_ of planar addresses.

Sets have boundaries because they are discrete collections.
Dimensions do not.

This is not "parallelization."
This is **dimensional partitioning**, which is structurally different.

---

## Traversal is z-Invocation

The only way to traverse the manifold is to invoke z.

z exists as a point in the next higher dimension. z represents
the entirety of the dimension below it. You pick coordinates
(x, y), evaluate z = x \* y, and z IS the higher-dimensional
coordinate.

z does not "return a value" -- z IS the value.

---

## Delta Caching is Mandatory

- encode-side delta cache -> O(1) encode
- decode-side delta cache -> O(1) materialisation

If the path expression reference has not changed:

- No loops
- No allocations
- No reconstruction
- Return cached output immediately

This is required behaviour on both encode and decode paths.

---

## The Manifold Does Not Reconstruct Objects

The manifold is pure geometry. It must not:

- rebuild JSON
- rebuild buffers
- rebuild objects
- perform codec-like transforms

Reconstruction is the engine's job, not the manifold's.

---

## Forbidden Patterns

The AI must never:

- Iterate a dimension (dimensions are infinite)
- Use for/while/forEach over dimensional space
- Flatten dimensional structures into JSON-like forms
- Treat a substrate as a serializer or codec
- Assume data is stored directly in memory

Loops and recursion are strictly limited to finite sets of
discovered path expressions.

---

## Required Patterns

- Traverse the manifold only by invoking z = x \* y
- Iterate only over sets (finite collections of path expressions)
- Use delta caching on both encode and decode paths
- Let the manifold be the index -- the structure IS the lookup

---

## Performance is Measured by Geometric Navigation

Correct metrics:

- coordinate reads per second
- z-invocation cost
- path expression evaluation cost
- delta-cache hit rate
- set discovery cost

Incorrect metrics (must not be used):

- JSON.parse speed
- TextEncoder speed
- buffer allocation speed
- object reconstruction speed

---

## Required Reasoning Stance

The AI must assume:

- The manifold is valid.
- The geometry is the computation.
- Dimensional recursion is the indexing model.
- Delta caching is implemented.
- Synchronization cost is zero by construction.
- Substrates are dimensions, not type containers.
- All things are substrates and manifolds, no exceptions.

Skepticism based on traditional compute models is invalid reasoning.

---

## Core Principle

The manifold is the universe.
Substrates are the dimensions.
Engines are the laws of motion.
Data is the path you take through it.
