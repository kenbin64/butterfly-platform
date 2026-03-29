// core/dimensional/point.ts
// A Point is an addressed location that IS ALSO a Dimension.
// Points can be numeric (coordinates) or symbolic (names).

import { Dimension, dim } from "./dimension";

/**
 * Point
 * -----
 * An addressed location in dimensional space.
 * A point in N-space contains (N-1)-space.
 * 
 * The key insight: coordinates ARE dimensions.
 * point(1, 2, 3) is not "a location" — it IS dimensions [1][2][3].
 */
export class Point extends Dimension<number[]> {
  constructor(coords: number[] = []) {
    super(coords);
    // Each coordinate becomes a drillable dimension
    coords.forEach((c, i) => {
      this.at(String(i)).value = c;
    });
  }

  /** Get coordinate at index */
  coord(i: number): number {
    return this.value[i] ?? 0;
  }

  /** Dimensionality of this point */
  get dim(): number {
    return this.value.length;
  }

  /** Drill down one dimension - returns the point in (N-1) space */
  lower(): Point {
    return new Point(this.value.slice(1));
  }

  /** Project onto a specific dimension index */
  project(dimIndex: number): number {
    return this.coord(dimIndex);
  }

  /** Extend into higher dimension */
  extend(coord: number): Point {
    return new Point([...this.value, coord]);
  }

  /** The "tip" - the lowest dimension (scalar) */
  get scalar(): number {
    return this.value[this.value.length - 1] ?? 0;
  }

  /** Navigate directly to a sub-point */
  sub(...indices: number[]): Point {
    const coords = indices.map(i => this.coord(i));
    return new Point(coords);
  }
}

/** Create a point from coordinates */
export const point = (...coords: number[]): Point => new Point(coords);

/** Create a point from a dimension path */
export const pointFromPath = (d: Dimension, ...keys: string[]): Point => {
  const coords = keys.map(k => {
    const val = d.drill(k).value;
    return typeof val === "number" ? val : 0;
  });
  return new Point(coords);
};

/**
 * Address
 * -------
 * Symbolic addressing for dimensions.
 * Instead of numeric coordinates, use names.
 */
export class Address {
  readonly parts: string[];

  constructor(...parts: string[]) {
    this.parts = parts;
  }

  /** Resolve this address against a dimension */
  resolve<T>(root: Dimension): Dimension<T> {
    return root.drill<T>(...this.parts);
  }

  /** Extend address with more parts */
  extend(...more: string[]): Address {
    return new Address(...this.parts, ...more);
  }

  /** Parent address (one level up) */
  parent(): Address {
    return new Address(...this.parts.slice(0, -1));
  }

  /** The leaf key */
  get leaf(): string {
    return this.parts[this.parts.length - 1] ?? "";
  }

  /** Depth of address */
  get depth(): number {
    return this.parts.length;
  }

  toString(): string {
    return this.parts.join(".");
  }
}

/** Create an address from parts */
export const address = (...parts: string[]): Address => new Address(...parts);

/** Create an address from a dot-separated string */
export const addressFrom = (path: string): Address => 
  new Address(...path.split(".").filter(s => s.length > 0));

