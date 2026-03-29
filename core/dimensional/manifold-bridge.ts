// core/dimensional/manifold-bridge.ts
// Bridges dimensional programming to the substrate/manifold system.
// All functions point directly to manifolds and substrates.

import { Dimension, dim, dimFrom } from "./dimension";
import { Point, point, Address, address } from "./point";
import { SaddlePair, HelicalCascade, StaticFlow } from "../substrate/flow";
import { SaddleForm } from "../geometry/saddle";
import { SaddleField } from "../substrate/saddlefield";
import { VecN } from "../geometry/vector";

/**
 * ManifoldDimension
 * -----------------
 * A Dimension that wraps manifold/substrate structures.
 * Provides direct drilling into saddle geometry.
 */
export class ManifoldDimension extends Dimension<SaddleField> {
  private _helix: HelicalCascade;

  constructor() {
    super(new SaddleField());
    this._helix = new HelicalCascade();
    this._initPairs();
  }

  private _initPairs(): void {
    // Each helix pair becomes a drillable dimension
    for (let i = 1; i <= 7; i++) {
      const pair = this._helix.getPair(i)!;
      const pairDim = this.at<number>(`pair${i}`);
      pairDim.value = pair.rotation;
      
      // Mark turn keys
      if (pair.isTurnKey) {
        this.at<boolean>(`pair${i}.turnKey`).value = true;
      }
    }
  }

  /** Get the helix cascade */
  get helix(): HelicalCascade { return this._helix; }

  /** Turn a key and update dimensions */
  turnKey(key: 2 | 4 | 6): void {
    this._helix.turnKey(key);
    this._syncPairs();
  }

  /** Full cascade through all keys */
  cascade(): void {
    this._helix.fullCascade();
    this._syncPairs();
  }

  /** Get state as a Point (rotation values as coordinates) */
  stateAsPoint(): Point {
    return point(...this._helix.state());
  }

  /** Place a saddle form at a location */
  place(location: Point, orientation: number = 0): this {
    const form = new SaddleForm(orientation * Math.PI / 180);
    this.value = this.value.place(location.value as [number, number], form);
    return this;
  }

  /** Sample the field at a point */
  sample(p: Point): number {
    return this.value.scalarAt(p.value);
  }

  /** Create a flow from origin in direction */
  flow(origin: Point, direction: Point, magnitude: number): StaticFlow {
    return new StaticFlow(origin.value, direction.value, magnitude);
  }

  private _syncPairs(): void {
    const state = this._helix.state();
    for (let i = 1; i <= 7; i++) {
      this.at<number>(`pair${i}`).value = state[i - 1];
    }
  }
}

/** Create a manifold dimension */
export const manifold = (): ManifoldDimension => new ManifoldDimension();

/**
 * DataDimension
 * -------------
 * Create any data type as a dimensional structure.
 * Arrays become indexed dimensions. Objects become keyed dimensions.
 */
export const data = <T>(value: T): Dimension<T> => {
  if (Array.isArray(value)) {
    const d = dim(value);
    value.forEach((item, i) => {
      const child = data(item);
      (d as any)._parts.set(String(i), child);
      (child as any)._parent = d;
      (child as any)._key = String(i);
    });
    return d;
  }
  if (typeof value === "object" && value !== null) {
    return dimFrom(value as object) as Dimension<T>;
  }
  return dim(value);
};

/**
 * List - A dimensional array
 * Direct access by index, no iteration needed.
 */
export const list = <T>(...items: T[]): Dimension<T[]> => data(items);

/**
 * Matrix - A 2D dimensional structure
 * Direct access by [row][col].
 */
export const matrix = <T>(rows: T[][]): Dimension<T[][]> => data(rows);

/**
 * Observe any dimension and react to changes
 */
export const watch = <T>(
  d: Dimension<T>,
  handler: (value: T, path: string[]) => void
): () => void => d.observe(handler);

