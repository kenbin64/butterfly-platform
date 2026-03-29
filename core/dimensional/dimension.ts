// core/dimensional/dimension.ts
// Dimensional Programming: Objects ARE dimensions. Points ARE dimensions.
// No tree traversal - direct drilling: Object → Point → Point → Object
//
// DESIGN PRINCIPLES:
// - Manifolds ARE the data - no external caching needed
// - Deterministic: same substrate → same results, always
// - Versioned: substrates are immutable, old values persist
// - Persistable: the manifold structure IS the persistence layer
//
// PARADIGM RULES:
// - NEVER iterate a dimension (infinite) - only finite sets can iterate
// - Single object lookup = O(1) - drill directly to the point
// - Multiple elements = use recursion to drill through pattern
// - Pattern matching = use Regex to describe addresses
// - The manifold IS the index - no external indexes needed

export type DimensionObserver<T> = (value: T, path: string[]) => void;

/** Version tracking for substrate history */
export interface DimensionVersion {
  readonly id: number;
  readonly timestamp: number;
  readonly parent: DimensionVersion | null;
}

let _versionCounter = 0;

/**
 * Dimension<T>
 * ------------
 * The fundamental unit of dimensional programming.
 * Every Dimension is both a value AND a container of lower dimensions.
 *
 * Key insight: A point in dimension N IS dimension N-1.
 * - 3D object → drill to 2D plane → drill to 1D line → drill to 0D point
 * - No iteration. Direct access via coordinates.
 *
 * MANIFOLD PROPERTIES:
 * - Deterministic: drilling always returns the same dimension
 * - Versioned: mutations create new versions, history preserved
 * - Persistent: the manifold IS the data, no cache needed
 */
export class Dimension<T = unknown> {
  private _value: T;
  private _parts: Map<string, Dimension> = new Map();
  private _observers: Set<DimensionObserver<T>> = new Set();
  private _parent: Dimension | null = null;
  private _key: string = "";
  private _version: DimensionVersion;

  constructor(value: T, parentVersion: DimensionVersion | null = null) {
    this._value = value;
    this._version = {
      id: ++_versionCounter,
      timestamp: Date.now(),
      parent: parentVersion
    };
  }

  /** Get the version info for this dimension */
  get version(): DimensionVersion { return this._version; }

  /** Get the value at this dimension */
  get value(): T { return this._value; }

  /** Set value and notify observers */
  set value(v: T) {
    this._value = v;
    this._notify();
  }

  /** Direct drill - access a part by key. Creates if needed. */
  at<U = unknown>(key: string): Dimension<U> {
    let child = this._parts.get(key) as any;
    if (!child) {
      // Creating new coordinate is a mutation - increment parent's version
      this._version = {
        id: ++_versionCounter,
        timestamp: Date.now(),
        parent: this._version
      };
      
      // Create child with version lineage from parent
      child = new Dimension<U>(undefined as U, this._version);
      child._parent = this as any;
      child._key = key;
      this._parts.set(key, child);
      
      // Notify mutation
      this._notify();
    }
    return child as Dimension<U>;
  }

  /** Multi-level drill - direct path access, O(depth) but minimal per-step overhead */
  drill<U = unknown>(...keys: string[]): Dimension<U> {
    let current: any = this;
    const len = keys.length;
    for (let i = 0; i < len; i++) {
      current = current.at(keys[i]);
    }
    return current as Dimension<U>;
  }

  /** Fast drill with array (avoids rest parameter allocation) */
  drillPath<U = unknown>(keys: readonly string[]): Dimension<U> {
    let current: any = this;
    const len = keys.length;
    for (let i = 0; i < len; i++) {
      current = current.at(keys[i]);
    }
    return current as Dimension<U>;
  }

  /** Observe changes at this dimension */
  observe(fn: DimensionObserver<T>): () => void {
    this._observers.add(fn);
    return () => this._observers.delete(fn);
  }

  /**
   * Get the path from root to this dimension.
   * Since manifolds are deterministic, this always returns the same path
   * for the same dimension - no caching needed, the manifold IS the path.
   */
  get path(): string[] {
    const p: string[] = [];
    let current: any = this;
    while (current?._parent) {
      p.unshift(current._key);
      current = current._parent;
    }
    return p;
  }

  /**
   * Create a new version of this dimension with updated value.
   * The old version persists (immutable history).
   */
  withValue<U>(newValue: U): Dimension<U> {
    const versioned = new Dimension<U>(newValue, this._version);
    versioned._parent = this._parent;
    versioned._key = this._key;
    // Copy child references (they still point to their versions)
    for (const [k, child] of this._parts.entries()) {
      (versioned as any)._parts.set(k, child);
    }
    return versioned;
  }

  /** Invoke - get or compute value, triggering observation */
  invoke(): T {
    this._notify();
    return this._value;
  }

  /** List all part keys at this dimension */
  keys(): string[] {
    return [...this._parts.keys()];
  }

  /** Check if a part exists */
  has(key: string): boolean {
    return this._parts.has(key);
  }

  /** Number of parts (dimensionality indicator) */
  get rank(): number {
    return this._parts.size;
  }

  /**
   * Regex-based drill - find matching keys at this level.
   * Returns discrete points that match the pattern.
   * NOTE: Only searches existing discrete keys, not infinite dimension.
   */
  match(pattern: RegExp): Dimension[] {
    const results: Dimension[] = [];
    for (const [key, child] of this._parts.entries()) {
      if (pattern.test(key)) {
        results.push(child);
      }
    }
    return results;
  }

  /**
   * Recursive search with regex - drills down through matching paths.
   * Each pattern in the array matches one level of depth.
   * Returns all discrete points that match the full path pattern.
   *
   * Example: search([/user_.+/, /profile/, /email/])
   * Matches: user_123/profile/email, user_abc/profile/email, etc.
   */
  search(patterns: RegExp[]): Dimension[] {
    if (patterns.length === 0) return [this] as any;

    const [current, ...rest] = patterns;
    const matches = this.match(current);

    if (rest.length === 0) return matches;

    // Recursively drill into each match
    const results: Dimension[] = [];
    for (const m of matches) {
      results.push(...m.search(rest));
    }
    return results;
  }

  /**
   * Find first match with regex path - O(1) per level when patterns are specific.
   * Returns undefined if no match found.
   */
  find(patterns: RegExp[]): Dimension | undefined {
    if (patterns.length === 0) return this as any;

    const [current, ...rest] = patterns;

    for (const [key, child] of this._parts.entries()) {
      if (current.test(key)) {
        if (rest.length === 0) return child as any;
        const found = child.find(rest);
        if (found) return found;
      }
    }
    return undefined;
  }

  private _notify(): void {
    const p = this.path;
    for (const obs of this._observers) {
      obs(this._value, p);
    }
    // Bubble up to parent
    this._parent?._notifyChild(this._key, this._value);
  }

  private _notifyChild(key: string, value: unknown): void {
    // Parent can react to child changes
    for (const obs of this._observers) {
      obs(this._value, [...this.path, key]);
    }
    this._parent?._notifyChild(this._key, this._value);
  }
}

/** Create a dimension from any value */
export const dim = <T>(value: T): Dimension<T> => new Dimension(value);

/** Create a dimension that auto-populates from an object */
export const dimFrom = <T extends object>(obj: T): Dimension<T> => {
  const d = new Dimension(obj);
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "object" && v !== null) {
      const child = dimFrom(v);
      (d as any)._parts.set(k, child);
      (child as any)._parent = d;
      (child as any)._key = k;
    } else {
      d.at(k).value = v;
    }
  }
  return d;
};

