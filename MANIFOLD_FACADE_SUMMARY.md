# Dimensional Manifold Architecture Summary

## The Manifold

The manifold is the base mathematical space defined by z = x \* y on a
7-section helix. It is a generative substrate — not storage, not a buffer,
not a serialization format. Data is discovered by following path expressions
(addresses into the geometry).

## Dimensional Substrates

Substrates are dimensional constructs, not type-based containers.

| Dimension | Substrate | What it is                                   |
| --------- | --------- | -------------------------------------------- |
| 0D        | Point     | Single manifold coordinate (number, boolean) |
| 1D        | Linear    | A set of points (waveform, time series)      |
| 2D        | Planar    | A set of linears (image, grid, UI layout)    |
| 3D        | Volume    | A set of planes (voxels, physics space)      |
| Whole     | Object    | A volume collapsed to a single z in N+1      |

**Core rule**: A substrate in dimension N is a point in dimension N+1.

## Traversal

- Dimensions are unbounded — no start, no end, no length.
- The only traversal is z-invocation: evaluate z = x \* y.
- z IS the value — it does not "return" anything.
- Loops and recursion operate only on finite sets of path expressions.
- Delta caching is mandatory on both encode and decode paths.

## Architecture Layers

1. **Manifold** — Pure geometry. z = x \* y. No reconstruction, no codecs.
2. **Substrate** — Dimensional structure holding sets of path expressions.
3. **Engine** — Laws of motion. Reconstruction happens here, not in the manifold.

## Core Components

- `core/substrate/base-substrate.ts` — BaseSubstrate with helix encoding, delta cache, path table
- `core/substrate/path-expressions.ts` — PathExpr type, evaluatePath(), discoverPath()
- `core/substrate/primitive-substrate.ts` — NumberSubstrate, StringSubstrate, BooleanSubstrate
- `core/manifold/` — Manifold state, math converter, dimension API

## Core Principle

The manifold is the universe.
Substrates are the dimensions.
Engines are the laws of motion.
Data is the path you take through it.
