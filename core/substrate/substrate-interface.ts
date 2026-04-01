// core/substrate/substrate-interface.ts
// ================================================================
//  DIMENSIONAL SUBSTRATE INTERFACES
// ================================================================
//
// These interfaces define the dimensional substrate contract.
// Substrates are dimensional constructs, not type containers.
// A substrate in dimension N is a point in dimension N+1.
//
// The manifold (z = x·y, 7-section helix) is the generative substrate.
// Data is discovered by evaluating path expressions on the manifold.
// The substrate stores path expressions, not payloads.

import { type PathExpr } from "./path-expressions";

// ─── Dimensional Enum ────────────────────────────────────────────────────────

/** The five dimensional levels of the substrate hierarchy. */
export enum SubstrateDimension {
  /** 0D — Single manifold coordinate. */
  Point = 0,
  /** 1D — Ordered points forming a path. */
  Linear = 1,
  /** 2D — Grid or surface of linears. */
  Planar = 2,
  /** 3D — Stack of planes forming a cubic region. */
  Volume = 3,
  /** A volume collapsed to a single z in N+1. */
  Whole = 4,
}

// ─── Base Interface ──────────────────────────────────────────────────────────

/**
 * ISubstrate — the root contract for every dimensional substrate.
 *
 * Every substrate:
 *   • lives at a specific dimension
 *   • holds a finite set of path expressions (addresses into the manifold)
 *   • evaluates z = x·y to discover values — never stores raw data
 *   • supports delta caching on both encode and decode paths
 */
export interface ISubstrate<T = unknown> {
  /** Which dimensional level this substrate occupies. */
  readonly dimension: SubstrateDimension;

  /** Human-readable name. */
  readonly name: string;

  /** Store a value by discovering its path expression on the manifold. */
  setPath(key: string, value: T): void;

  /** Retrieve a value by evaluating its path expression on the manifold. */
  getPath(key: string): T | undefined;

  /** Get the raw path expression for a key (for inspection/serialisation). */
  getPathExpr(key: string): PathExpr | PathExpr[] | undefined;

  /** List all keys (finite set of discovered addresses). */
  pathKeys(): string[];

  /** Serialize substrate state (path expressions, not raw data). */
  serialize(): unknown;

  /** Hydrate substrate from serialized state. */
  hydrate(state: unknown): void;

  /** Reset to initial state. */
  reset(): void;
}

// ─── 0D: Point ───────────────────────────────────────────────────────────────

/**
 * IPointSubstrate — a single coordinate on the manifold.
 *
 * Holds one path expression. Evaluating it yields a scalar:
 * a number, a boolean, a color value.
 */
export interface IPointSubstrate extends ISubstrate<number> {
  readonly dimension: SubstrateDimension.Point;

  /** The single z-value at this coordinate. */
  readonly value: number;

  /** Evaluate z = x·y at the stored path expression. */
  evaluate(): number;
}

// ─── 1D: Linear ──────────────────────────────────────────────────────────────

/**
 * ILinearSubstrate — a set of points forming a path.
 *
 * Time series, audio waveforms, animation curves, camera rails.
 * Each member of the set is a 0D point address.
 * The dimension between points is continuous and unbounded —
 * the set is what makes it finite.
 */
export interface ILinearSubstrate extends ISubstrate<number> {
  readonly dimension: SubstrateDimension.Linear;

  /** The finite set of point addresses in this linear. */
  readonly points: ReadonlyArray<PathExpr>;

  /** Number of points in the set (not the dimension — the set). */
  readonly count: number;

  /** Evaluate a specific point in the set by index. */
  evaluateAt(index: number): number;
}

// ─── 2D: Planar ──────────────────────────────────────────────────────────────

/**
 * IPlanarSubstrate — a set of linears forming a surface.
 *
 * Images, heightmaps, UI layouts, tilemaps.
 * Each member is a 1D linear address.
 */
export interface IPlanarSubstrate extends ISubstrate<number> {
  readonly dimension: SubstrateDimension.Planar;

  /** The finite set of linear addresses in this plane. */
  readonly linears: ReadonlyArray<ILinearSubstrate>;

  /** Evaluate a specific coordinate (row, col) on the surface. */
  evaluateAt(row: number, col: number): number;
}

// ─── 3D: Volume ──────────────────────────────────────────────────────────────

/**
 * IVolumeSubstrate — a set of planes forming a cubic region.
 *
 * Voxels, physics spaces, spatial audio fields, 3D worlds.
 * Each member is a 2D planar address.
 */
export interface IVolumeSubstrate extends ISubstrate<number> {
  readonly dimension: SubstrateDimension.Volume;

  /** The finite set of planar addresses in this volume. */
  readonly planes: ReadonlyArray<IPlanarSubstrate>;

  /** Evaluate a specific coordinate (plane, row, col) in the volume. */
  evaluateAt(plane: number, row: number, col: number): number;
}

// ─── Whole: Object ───────────────────────────────────────────────────────────

/**
 * IObjectSubstrate — a volume collapsed to a single z in N+1.
 *
 * Meshes, rigid bodies, characters, rooms, levels.
 * The entire volume is treated as one point in the next dimension.
 */
export interface IObjectSubstrate extends ISubstrate<unknown> {
  readonly dimension: SubstrateDimension.Whole;

  /** The volume this object collapses. */
  readonly volume: IVolumeSubstrate;

  /** The collapsed z-value representing this entire object in N+1. */
  readonly z: number;
}

