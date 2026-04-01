// core/substrate/dimensional-substrate.ts
// ================================================================
//  CONCRETE DIMENSIONAL SUBSTRATES
// ================================================================
//
// Building blocks for all engines. Each class implements the
// dimensional interface from substrate-interface.ts.
//
// Rules enforced:
//   • Loops only on finite sets of path expressions — never on dimensions.
//   • Traversal only by z-invocation (z = x·y on 7-section helix).
//   • Delta caching on both encode (discover) and decode (evaluate).
//   • Substrates store path expressions, not raw data.
//   • A substrate in dimension N is a point in dimension N+1.

import {
  type PathExpr,
  evaluatePath,
  discoverPath,
} from "./path-expressions";

import {
  SubstrateDimension,
  type IPointSubstrate,
  type ILinearSubstrate,
  type IPlanarSubstrate,
  type IVolumeSubstrate,
  type IObjectSubstrate,
} from "./substrate-interface";

// ─── Shared delta-cache helper ──────────────────────────────────────────────
// Encode-side: if the value hasn't changed, return the cached PathExpr.
// Decode-side: if the PathExpr hasn't changed, return the cached z.

interface DeltaCache {
  lastPath: PathExpr | null;
  lastZ: number;
}

function cachedEvaluate(cache: DeltaCache, expr: PathExpr): number {
  // Ref equality — O(1) guard. Same path object → same z.
  if (cache.lastPath === expr) return cache.lastZ;
  const z = evaluatePath(expr);
  cache.lastPath = expr;
  cache.lastZ = z;
  return z;
}

// ─── 0D: PointSubstrate ─────────────────────────────────────────────────────

export class PointSubstrate implements IPointSubstrate {
  readonly dimension = SubstrateDimension.Point;
  readonly name: string;

  private _path: PathExpr;
  private _pathTable: Map<string, PathExpr> = new Map();
  private _cache: DeltaCache = { lastPath: null, lastZ: 0 };

  constructor(name: string, initialValue: number = 0) {
    this.name = name;
    this._path = discoverPath(initialValue);
    this._pathTable.set("value", this._path);
  }

  /** The single z-value at this coordinate. */
  get value(): number {
    return cachedEvaluate(this._cache, this._path);
  }

  /** Evaluate z = x·y at the stored path expression. */
  evaluate(): number {
    return this.value;
  }

  setPath(key: string, value: number): void {
    const expr = discoverPath(value);
    this._pathTable.set(key, expr);
    if (key === "value") this._path = expr;
  }

  getPath(key: string): number | undefined {
    const expr = this._pathTable.get(key);
    return expr ? evaluatePath(expr) : undefined;
  }

  getPathExpr(key: string): PathExpr | undefined {
    return this._pathTable.get(key);
  }

  pathKeys(): string[] {
    return Array.from(this._pathTable.keys());
  }

  serialize(): { paths: Record<string, PathExpr> } {
    const paths: Record<string, PathExpr> = {};
    for (const [k, v] of this._pathTable) paths[k] = v;
    return { paths };
  }

  hydrate(state: { paths: Record<string, PathExpr> }): void {
    this._pathTable.clear();
    for (const [k, v] of Object.entries(state.paths)) {
      this._pathTable.set(k, v);
    }
    this._path = this._pathTable.get("value") ?? discoverPath(0);
    this._cache = { lastPath: null, lastZ: 0 };
  }

  reset(): void {
    this._path = discoverPath(0);
    this._pathTable.clear();
    this._pathTable.set("value", this._path);
    this._cache = { lastPath: null, lastZ: 0 };
  }
}

// ─── 1D: LinearSubstrate ────────────────────────────────────────────────────

export class LinearSubstrate implements ILinearSubstrate {
  readonly dimension = SubstrateDimension.Linear;
  readonly name: string;

  private _points: PathExpr[] = [];
  private _pathTable: Map<string, PathExpr | PathExpr[]> = new Map();
  private _caches: DeltaCache[] = [];

  constructor(name: string, values?: number[]) {
    this.name = name;
    if (values) {
      // Iterate the finite set of provided values — not a dimension.
      this._points = values.map((v, i) => discoverPath(v, i % 7));
      this._caches = values.map(() => ({ lastPath: null, lastZ: 0 }));
    }
    this._pathTable.set("points", this._points);
  }

  /** The finite set of point addresses in this linear. */
  get points(): ReadonlyArray<PathExpr> { return this._points; }

  /** Number of points in the set. */
  get count(): number { return this._points.length; }

  /** Evaluate a specific point in the set by index. */
  evaluateAt(index: number): number {
    if (index < 0 || index >= this._points.length) return 0;
    return cachedEvaluate(this._caches[index], this._points[index]);
  }



  /** Add a point to the set by discovering its path on the manifold. */
  addPoint(value: number, section?: number): void {
    const expr = discoverPath(value, section ?? this._points.length % 7);
    this._points.push(expr);
    this._caches.push({ lastPath: null, lastZ: 0 });
    this._pathTable.set("points", this._points);
  }

  setPath(key: string, value: number): void {
    const expr = discoverPath(value, Number(key) % 7);
    const idx = Number(key);
    if (!isNaN(idx) && idx >= 0 && idx < this._points.length) {
      this._points[idx] = expr;
      this._caches[idx] = { lastPath: null, lastZ: 0 };
    }
    this._pathTable.set(key, expr);
  }

  getPath(key: string): number | undefined {
    const expr = this._pathTable.get(key);
    if (!expr) return undefined;
    if (Array.isArray(expr)) return undefined; // use evaluateAt for arrays
    return evaluatePath(expr);
  }

  getPathExpr(key: string): PathExpr | PathExpr[] | undefined {
    return this._pathTable.get(key);
  }

  pathKeys(): string[] {
    return Array.from(this._pathTable.keys());
  }

  serialize(): { points: PathExpr[] } {
    return { points: [...this._points] };
  }

  hydrate(state: { points: PathExpr[] }): void {
    this._points = [...state.points];
    this._caches = state.points.map(() => ({ lastPath: null, lastZ: 0 }));
    this._pathTable.clear();
    this._pathTable.set("points", this._points);
  }

  reset(): void {
    this._points = [];
    this._caches = [];
    this._pathTable.clear();
    this._pathTable.set("points", this._points);
  }
}

// ─── 2D: PlanarSubstrate ────────────────────────────────────────────────────

export class PlanarSubstrate implements IPlanarSubstrate {
  readonly dimension = SubstrateDimension.Planar;
  readonly name: string;

  private _linears: LinearSubstrate[] = [];
  private _pathTable: Map<string, PathExpr | PathExpr[]> = new Map();

  constructor(name: string, rows?: number[][]) {
    this.name = name;
    if (rows) {
      // Iterate the finite set of rows — not a dimension.
      this._linears = rows.map((row, i) =>
        new LinearSubstrate(`${name}:row${i}`, row)
      );
    }
  }

  /** The finite set of linear addresses in this plane. */
  get linears(): ReadonlyArray<ILinearSubstrate> { return this._linears; }

  /** Evaluate a specific coordinate (row, col) on the surface. */
  evaluateAt(row: number, col: number): number {
    if (row < 0 || row >= this._linears.length) return 0;
    return this._linears[row].evaluateAt(col);
  }

  /** Add a row (linear) to the plane. */
  addLinear(values: number[]): void {
    this._linears.push(
      new LinearSubstrate(`${this.name}:row${this._linears.length}`, values)
    );
  }

  setPath(key: string, value: number): void {
    const expr = discoverPath(value);
    this._pathTable.set(key, expr);
  }

  getPath(key: string): number | undefined {
    const expr = this._pathTable.get(key);
    if (!expr || Array.isArray(expr)) return undefined;
    return evaluatePath(expr);
  }

  getPathExpr(key: string): PathExpr | PathExpr[] | undefined {
    return this._pathTable.get(key);
  }

  pathKeys(): string[] {
    return Array.from(this._pathTable.keys());
  }

  serialize(): { rows: { points: PathExpr[] }[] } {
    return { rows: this._linears.map(l => l.serialize()) };
  }

  hydrate(state: { rows: { points: PathExpr[] }[] }): void {
    this._linears = state.rows.map((row, i) => {
      const lin = new LinearSubstrate(`${this.name}:row${i}`);
      lin.hydrate(row);
      return lin;
    });
    this._pathTable.clear();
  }

  reset(): void {
    this._linears = [];
    this._pathTable.clear();
  }
}

// ─── 3D: VolumeSubstrate ────────────────────────────────────────────────────

export class VolumeSubstrate implements IVolumeSubstrate {
  readonly dimension = SubstrateDimension.Volume;
  readonly name: string;

  private _planes: PlanarSubstrate[] = [];
  private _pathTable: Map<string, PathExpr | PathExpr[]> = new Map();

  constructor(name: string, planes?: number[][][]) {
    this.name = name;
    if (planes) {
      // Iterate the finite set of planes — not a dimension.
      this._planes = planes.map((rows, i) =>
        new PlanarSubstrate(`${name}:plane${i}`, rows)
      );
    }
  }

  /** The finite set of planar addresses in this volume. */
  get planes(): ReadonlyArray<IPlanarSubstrate> { return this._planes; }

  /** Evaluate a specific coordinate (plane, row, col) in the volume. */
  evaluateAt(plane: number, row: number, col: number): number {
    if (plane < 0 || plane >= this._planes.length) return 0;
    return this._planes[plane].evaluateAt(row, col);
  }

  /** Add a plane to the volume. */
  addPlane(rows: number[][]): void {
    this._planes.push(
      new PlanarSubstrate(`${this.name}:plane${this._planes.length}`, rows)
    );
  }

  setPath(key: string, value: number): void {
    const expr = discoverPath(value);
    this._pathTable.set(key, expr);
  }

  getPath(key: string): number | undefined {
    const expr = this._pathTable.get(key);
    if (!expr || Array.isArray(expr)) return undefined;
    return evaluatePath(expr);
  }

  getPathExpr(key: string): PathExpr | PathExpr[] | undefined {
    return this._pathTable.get(key);
  }

  pathKeys(): string[] {
    return Array.from(this._pathTable.keys());
  }

  serialize(): { planes: { rows: { points: PathExpr[] }[] }[] } {
    return { planes: this._planes.map(p => p.serialize()) };
  }

  hydrate(state: { planes: { rows: { points: PathExpr[] }[] }[] }): void {
    this._planes = state.planes.map((p, i) => {
      const plane = new PlanarSubstrate(`${this.name}:plane${i}`);
      plane.hydrate(p);
      return plane;
    });
    this._pathTable.clear();
  }

  reset(): void {
    this._planes = [];
    this._pathTable.clear();
  }
}

// ─── Whole: ObjectSubstrate ─────────────────────────────────────────────────
//
// A volume collapsed to a single z in N+1.
// The entire volume is represented as one point in the next dimension.
// z-invocation: invoke z on the volume to get the collapsed coordinate.

export class ObjectSubstrate implements IObjectSubstrate {
  readonly dimension = SubstrateDimension.Whole;
  readonly name: string;

  private _volume: VolumeSubstrate;
  private _pathTable: Map<string, PathExpr | PathExpr[]> = new Map();
  private _zCache: DeltaCache = { lastPath: null, lastZ: 0 };
  private _zPath: PathExpr;

  constructor(name: string, volume: VolumeSubstrate) {
    this.name = name;
    this._volume = volume;
    // Collapse: compute a representative z from the volume's content.
    // The collapsed z is itself discoverable on the manifold.
    this._zPath = this._computeCollapsedPath();
    this._pathTable.set("z", this._zPath);
  }

  /** The volume this object collapses. */
  get volume(): IVolumeSubstrate { return this._volume; }

  /** The collapsed z-value representing this entire object in N+1. */
  get z(): number {
    return cachedEvaluate(this._zCache, this._zPath);
  }

  /**
   * Compute the collapsed z.
   * Iterate the finite set of planes, accumulate z values,
   * then discover the path for the collapsed sum.
   */
  private _computeCollapsedPath(): PathExpr {
    let sum = 0;
    // Loop over finite set of planes — not a dimension.
    for (const plane of this._volume.planes) {
      for (const linear of plane.linears) {
        // Loop over finite set of points — not a dimension.
        for (let i = 0; i < linear.count; i++) {
          sum += linear.evaluateAt(i);
        }
      }
    }
    return discoverPath(sum, 6); // section 6 = Whole
  }

  /** Recompute the collapsed z (call after volume mutation). */
  collapse(): void {
    this._zPath = this._computeCollapsedPath();
    this._pathTable.set("z", this._zPath);
    this._zCache = { lastPath: null, lastZ: 0 };
  }

  setPath(key: string, value: unknown): void {
    if (typeof value === "number") {
      const expr = discoverPath(value);
      this._pathTable.set(key, expr);
    }
  }

  getPath(key: string): unknown {
    if (key === "z") return this.z;
    const expr = this._pathTable.get(key);
    if (!expr || Array.isArray(expr)) return undefined;
    return evaluatePath(expr);
  }

  getPathExpr(key: string): PathExpr | PathExpr[] | undefined {
    return this._pathTable.get(key);
  }

  pathKeys(): string[] {
    return Array.from(this._pathTable.keys());
  }

  serialize(): { volume: ReturnType<VolumeSubstrate["serialize"]>; z: PathExpr } {
    return { volume: this._volume.serialize(), z: this._zPath };
  }

  hydrate(state: { volume: { planes: { rows: { points: PathExpr[] }[] }[] }; z: PathExpr }): void {
    this._volume.hydrate(state.volume);
    this._zPath = state.z;
    this._zCache = { lastPath: null, lastZ: 0 };
    this._pathTable.clear();
    this._pathTable.set("z", this._zPath);
  }

  reset(): void {
    this._volume.reset();
    this._zPath = discoverPath(0, 6);
    this._zCache = { lastPath: null, lastZ: 0 };
    this._pathTable.clear();
    this._pathTable.set("z", this._zPath);
  }
}
