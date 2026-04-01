// core/substrate/representation-table.ts
// ================================================================
//  REPRESENTATION TABLE — The Data Model Layer
// ================================================================
//
// A RepresentationTable is NOT data — it is addresses.
// Every entry maps a human-readable key to a PathExpr on the manifold.
// The table contains zero payload bytes.
//
// Properties:
//   • Lossless   — round-trips through serialize/hydrate without loss
//   • Compact    — stores only path expressions (section, angle, radius, depth)
//   • Generative — values are discovered by z-invocation, not stored
//   • Dimensional — each entry is a coordinate in manifold space
//   • Deterministic — same path always yields the same z
//
// The table never evaluates math directly.
// It calls the path-expressions layer, which calls the manifold.

import {
  type PathExpr,
  evaluatePath,
  discoverPath,
  stringToPathExprs,
  pathExprsToString,
} from "./path-expressions";

// ─── Entry types ────────────────────────────────────────────────────────────

/** A single entry in the representation table. */
export interface TableEntry {
  /** The path expression (address into the manifold). */
  readonly path: PathExpr;
  /** Optional: array of path expressions (for string/compound data). */
  readonly paths?: ReadonlyArray<PathExpr>;
}

// ─── RepresentationTable ────────────────────────────────────────────────────

/**
 * RepresentationTable — a named collection of addresses into the manifold.
 *
 * Example usage:
 *   const car = new RepresentationTable("car");
 *   car.set("wheels", 4);
 *   car.set("color", 0xFF0000);
 *   car.setString("name", "Mustang");
 *
 * The table stores ONLY PathExprs. Values are discovered via z-invocation.
 */
export class RepresentationTable {
  readonly name: string;

  // Scalar entries: key → PathExpr
  private _scalars: Map<string, PathExpr> = new Map();

  // Compound entries: key → PathExpr[] (strings, arrays of addresses)
  private _compounds: Map<string, PathExpr[]> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  // ─── Scalar operations (numbers, booleans, colors) ──────────────────────

  /** Store a numeric value by discovering its path on the manifold. */
  set(key: string, value: number, section?: number): void {
    this._scalars.set(key, discoverPath(value, section));
  }

  /** Retrieve a numeric value by z-invocation on its path. */
  get(key: string): number | undefined {
    const expr = this._scalars.get(key);
    return expr ? evaluatePath(expr) : undefined;
  }

  /** Get the raw PathExpr for a key (for composition, not evaluation). */
  getExpr(key: string): PathExpr | undefined {
    return this._scalars.get(key);
  }

  /** Check if a scalar key exists. */
  has(key: string): boolean {
    return this._scalars.has(key);
  }

  /** Remove a scalar entry. */
  delete(key: string): boolean {
    return this._scalars.delete(key);
  }

  // ─── Compound operations (strings, arrays) ─────────────────────────────

  /** Store a string as a sequence of path expressions (one per character). */
  setString(key: string, value: string): void {
    this._compounds.set(key, stringToPathExprs(value));
  }

  /** Retrieve a string by z-invocation on each character's path. */
  getString(key: string): string | undefined {
    const exprs = this._compounds.get(key);
    return exprs ? pathExprsToString(exprs) : undefined;
  }

  /** Store an array of numbers as a sequence of path expressions. */
  setArray(key: string, values: number[]): void {
    this._compounds.set(key, values.map((v, i) => discoverPath(v, i % 7)));
  }

  /** Retrieve an array of numbers by z-invocation. */
  getArray(key: string): number[] | undefined {
    const exprs = this._compounds.get(key);
    return exprs ? exprs.map(e => evaluatePath(e)) : undefined;
  }

  /** Get raw compound PathExpr[] for a key. */
  getCompoundExpr(key: string): ReadonlyArray<PathExpr> | undefined {
    return this._compounds.get(key);
  }

  /** Check if a compound key exists. */
  hasCompound(key: string): boolean {
    return this._compounds.has(key);
  }

  /** Remove a compound entry. */
  deleteCompound(key: string): boolean {
    return this._compounds.delete(key);
  }

  // ─── Inspection ────────────────────────────────────────────────────────

  /** All scalar keys (finite set). */
  scalarKeys(): string[] { return Array.from(this._scalars.keys()); }

  /** All compound keys (finite set). */
  compoundKeys(): string[] { return Array.from(this._compounds.keys()); }

  /** All keys (finite set). */
  allKeys(): string[] { return [...this.scalarKeys(), ...this.compoundKeys()]; }

  /** Total number of entries. */
  get size(): number { return this._scalars.size + this._compounds.size; }

  // ─── Composition ───────────────────────────────────────────────────────

  /** Merge another table's entries into this one (non-destructive). */
  merge(other: RepresentationTable): void {
    for (const key of other.scalarKeys()) {
      const expr = other.getExpr(key);
      if (expr) this._scalars.set(key, expr);
    }
    for (const key of other.compoundKeys()) {
      const exprs = other.getCompoundExpr(key);
      if (exprs) this._compounds.set(key, [...exprs]);
    }
  }

  /** Create a shallow clone of this table. */
  clone(newName?: string): RepresentationTable {
    const copy = new RepresentationTable(newName ?? this.name);
    copy.merge(this);
    return copy;
  }

  // ─── Serialization ─────────────────────────────────────────────────────

  /** Serialize to pure path expressions (no payload bytes). */
  serialize(): { scalars: Record<string, PathExpr>; compounds: Record<string, PathExpr[]> } {
    const scalars: Record<string, PathExpr> = {};
    for (const [k, v] of this._scalars) scalars[k] = v;
    const compounds: Record<string, PathExpr[]> = {};
    for (const [k, v] of this._compounds) compounds[k] = [...v];
    return { scalars, compounds };
  }

  /** Hydrate from serialized state. */
  hydrate(state: { scalars: Record<string, PathExpr>; compounds: Record<string, PathExpr[]> }): void {
    this._scalars.clear();
    this._compounds.clear();
    for (const [k, v] of Object.entries(state.scalars)) {
      this._scalars.set(k, v);
    }
    for (const [k, v] of Object.entries(state.compounds)) {
      this._compounds.set(k, [...v]);
    }
  }

  /** Reset to empty state. */
  reset(): void {
    this._scalars.clear();
    this._compounds.clear();
  }
}

