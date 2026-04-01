// core/substrate/primitive-substrate.ts
// Primitive Substrates — manifold-native containers for primitive data types.
//
// These substrates are concerned ONLY with primitives (number, string, boolean).
// They are not simulation substrates — no tick, no frame loop.
// Values are discovered on the z = x·y helix via path expressions, not stored as raw data.

import { BaseSubstrate, SubstrateConfig } from "./base-substrate";
import {
  PathExpr,
  evaluatePath,
  discoverPath,
  stringToPathExprs,
  pathExprsToString,
} from "./path-expressions";

// ─── NumberSubstrate ──────────────────────────────────────────────────────────

/**
 * NumberSubstrate
 * ---------------
 * A substrate for a single numeric value on the manifold.
 *
 * The number is not stored — its path expression (manifold address) is stored.
 * Reading the value evaluates the path on the z = x·y surface.
 *
 * Coordinates:
 *   drill("value")  → the current number
 *   drill("path")   → the path expression (address)
 */
export class NumberSubstrate extends BaseSubstrate<number> {
  private _path: PathExpr;

  constructor(initialValue: number = 0, config?: Partial<SubstrateConfig>) {
    super({ name: "number", version: "1.0.0", ...config }, initialValue);
    this._path = discoverPath(initialValue);
    this.drill("value").value = initialValue;
  }

  /** Get the current value by evaluating the manifold at the stored path. */
  get value(): number {
    return evaluatePath(this._path);
  }

  /** Set a new value by discovering its path on the manifold. */
  set value(n: number) {
    this._path = discoverPath(n);
    this.drill("value").value = n;
  }

  /** Get the path expression (manifold address) for the current value. */
  get pathExpr(): PathExpr { return this._path; }

  /** Arithmetic: add — returns a new NumberSubstrate. */
  add(other: number | NumberSubstrate): NumberSubstrate {
    const v = typeof other === "number" ? other : other.value;
    return new NumberSubstrate(this.value + v);
  }

  /** Arithmetic: multiply — returns a new NumberSubstrate. */
  multiply(other: number | NumberSubstrate): NumberSubstrate {
    const v = typeof other === "number" ? other : other.value;
    return new NumberSubstrate(this.value * v);
  }

  /** Arithmetic: subtract — returns a new NumberSubstrate. */
  subtract(other: number | NumberSubstrate): NumberSubstrate {
    const v = typeof other === "number" ? other : other.value;
    return new NumberSubstrate(this.value - v);
  }

  /** Arithmetic: divide — returns a new NumberSubstrate. */
  divide(other: number | NumberSubstrate): NumberSubstrate {
    const v = typeof other === "number" ? other : other.value;
    if (v === 0) throw new Error("Division by zero on the manifold");
    return new NumberSubstrate(this.value / v);
  }

  reset(): void {
    this._path = discoverPath(0);
    this.drill("value").value = 0;
  }

  serialize(): { value: number; path: PathExpr } {
    return { value: this.value, path: this._path };
  }

  hydrate(state: { value: number; path: PathExpr }): void {
    this._path = state.path;
    this.drill("value").value = state.value;
  }
}

// ─── StringSubstrate ──────────────────────────────────────────────────────────

/**
 * StringSubstrate
 * ---------------
 * A substrate for string values on the manifold.
 *
 * Each character is a path expression — its char code discovered on the surface.
 * The string is a sequence of manifold addresses, not stored bytes.
 *
 * Coordinates:
 *   drill("value")   → the current string
 *   drill("length")  → character count
 *   drill("char", i) → character at index i
 */
export class StringSubstrate extends BaseSubstrate<string> {
  private _paths: PathExpr[];

  constructor(initialValue: string = "", config?: Partial<SubstrateConfig>) {
    super({ name: "string", version: "1.0.0", ...config }, initialValue);
    this._paths = stringToPathExprs(initialValue);
    this.drill("value").value = initialValue;
    this.drill("length").value = initialValue.length;
  }

  /** Get the current string by evaluating all character paths on the manifold. */
  get value(): string {
    return pathExprsToString(this._paths);
  }

  /** Set a new string by discovering path expressions for each character. */
  set value(s: string) {
    this._paths = stringToPathExprs(s);
    this.drill("value").value = s;
    this.drill("length").value = s.length;
  }

  /** Get the path expressions (manifold addresses) for each character. */
  get pathExprs(): PathExpr[] { return this._paths; }

  /** Get string length (number of path expressions). */
  get length(): number { return this._paths.length; }

  /** Get character at index by evaluating a single path. */
  charAt(index: number): string {
    if (index < 0 || index >= this._paths.length) return "";
    return String.fromCharCode(Math.round(evaluatePath(this._paths[index])));
  }

  /** Concatenate — returns a new StringSubstrate. */
  concat(other: string | StringSubstrate): StringSubstrate {
    const v = typeof other === "string" ? other : other.value;
    return new StringSubstrate(this.value + v);
  }

  /** Slice — returns a new StringSubstrate. */
  slice(start: number, end?: number): StringSubstrate {
    const sliced = this._paths.slice(start, end);
    const sub = new StringSubstrate("");
    sub._paths = sliced;
    sub.drill("value").value = pathExprsToString(sliced);
    sub.drill("length").value = sliced.length;
    return sub;
  }

  /** Check if the string includes a substring. */
  includes(search: string): boolean {
    return this.value.includes(search);
  }

  reset(): void {
    this._paths = [];
    this.drill("value").value = "";
    this.drill("length").value = 0;
  }

  serialize(): { value: string; paths: PathExpr[] } {
    return { value: this.value, paths: this._paths };
  }

  hydrate(state: { value: string; paths: PathExpr[] }): void {
    this._paths = state.paths;
    this.drill("value").value = state.value;
    this.drill("length").value = state.paths.length;
  }
}

// ─── BooleanSubstrate ─────────────────────────────────────────────────────────

/**
 * BooleanSubstrate
 * ----------------
 * A substrate for boolean values on the manifold.
 *
 * Boolean maps to helix geometry:
 *   true  → Section 1 (Point — existence)
 *   false → Section 0 (Void — absence)
 *
 * The path expression for true evaluates to 1; for false, to 0.
 *
 * Coordinates:
 *   drill("value")   → the current boolean
 *   drill("section") → helix section (0 or 1)
 */
export class BooleanSubstrate extends BaseSubstrate<boolean> {
  private _path: PathExpr;

  constructor(initialValue: boolean = false, config?: Partial<SubstrateConfig>) {
    super({ name: "boolean", version: "1.0.0", ...config }, initialValue);
    this._path = discoverPath(initialValue ? 1 : 0, initialValue ? 1 : 0);
    this.drill("value").value = initialValue;
    this.drill("section").value = initialValue ? 1 : 0;
  }

  /** Get the current boolean by evaluating the manifold. */
  get value(): boolean {
    return Math.round(evaluatePath(this._path)) === 1;
  }

  /** Set a new boolean value. */
  set value(b: boolean) {
    this._path = discoverPath(b ? 1 : 0, b ? 1 : 0);
    this.drill("value").value = b;
    this.drill("section").value = b ? 1 : 0;
  }

  /** Get the path expression. */
  get pathExpr(): PathExpr { return this._path; }

  /** Logical NOT — returns a new BooleanSubstrate. */
  not(): BooleanSubstrate {
    return new BooleanSubstrate(!this.value);
  }

  /** Logical AND — returns a new BooleanSubstrate. */
  and(other: boolean | BooleanSubstrate): BooleanSubstrate {
    const v = typeof other === "boolean" ? other : other.value;
    return new BooleanSubstrate(this.value && v);
  }

  /** Logical OR — returns a new BooleanSubstrate. */
  or(other: boolean | BooleanSubstrate): BooleanSubstrate {
    const v = typeof other === "boolean" ? other : other.value;
    return new BooleanSubstrate(this.value || v);
  }

  /** Logical XOR — returns a new BooleanSubstrate. */
  xor(other: boolean | BooleanSubstrate): BooleanSubstrate {
    const v = typeof other === "boolean" ? other : other.value;
    return new BooleanSubstrate(this.value !== v);
  }

  reset(): void {
    this._path = discoverPath(0, 0);
    this.drill("value").value = false;
    this.drill("section").value = 0;
  }

  serialize(): { value: boolean; path: PathExpr } {
    return { value: this.value, path: this._path };
  }

  hydrate(state: { value: boolean; path: PathExpr }): void {
    this._path = state.path;
    this.drill("value").value = state.value;
    this.drill("section").value = state.value ? 1 : 0;
  }
}
