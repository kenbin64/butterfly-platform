/**
 * Versioned Substrate System (Dimensional Architecture)
 * =====================================================
 * 
 * PRINCIPLE: One Observation = Entire Lower Dimension
 * 
 * Once you observe a thing, it is assumed to have all its parts.
 * Parts are invoked when needed, not created upfront.
 * 
 * Example: Observe a car ONCE
 *   - car.drill("engine")        → engine exists at O(1)
 *   - car.drill("wheels", 0)     → wheel 0 exists at O(1)
 *   - car.drill("transmission", "gear", 2) → gear 2 exists at O(1)
 * 
 * No iteration loops. No upfront creation. No array storage.
 * Each point IS a container for all its lower dimensions.
 * 
 * Applied to versioning:
 *   - SubstrateRegistry (1 point) → contains all substrates below it
 *   - VersionedSubstrate (1 point per version) → contains all entities at that version
 *   - Each entity point → contains all properties (position, velocity, etc.)
 * 
 * NO forEach. NO map. NO filter. NO iteration.
 * Just: drill("id") → O(1) get that point's lower dimension.
 */

import { Dimension, dim } from "../dimensional/dimension";

/**
 * Version Point - ONE point contains ENTIRE version state
 * 
 * This is just metadata about one version.
 * The actual state is contained in this point's lower dimension.
 */
export interface VersionPoint {
  hash: string;              // Unique ID for this point
  parent: string | null;     // Link to parent point in lineage
  seed: number;              // Parent seed + this seed = deterministic child
  timestamp: number;
  deltaSize: number;         // Bytes of changes from parent
}

/**
 * VersionedSubstrate - ONE point per version
 * 
 * Each version is a discrete point.
 * Access any version point by its hash: O(1)
 * Lower dimension contains: state at that version
 * 
 * Storage principle: One point is very small. Only store deltas.
 * Reconstruction: Drill to parent, apply delta, rinse repeat.
 */
export class VersionedSubstrate {
  private _currentHash: string;
  private _versions: Map<string, VersionPoint>;           // hash → version metadata
  private _deltas: Map<string, Map<string, unknown>>;     // hash → changes from parent
  private _stateCache: Map<string, Map<string, unknown>>; // hash → reconstructed state

  constructor() {
    this._versions = new Map();
    this._deltas = new Map();
    this._stateCache = new Map();
    this._currentHash = "root";

    // Initialize root as single point
    const root: VersionPoint = {
      hash: "root",
      parent: null,
      seed: 0,
      timestamp: Date.now(),
      deltaSize: 0
    };
    this._versions.set("root", root);
    this._deltas.set("root", new Map());
  }

  /**
   * Commit - create ONE new point with delta
   * The point CONTAINS this version's lower dimension
   */
  commit(changes: Map<string, unknown>): string {
    const seed = ((this._currentHash.charCodeAt(0) << 16) ^ Date.now()) >>> 0;
    const hash = this._deriveHash(this._currentHash, seed);

    // ONE point = version metadata
    const versionPoint: VersionPoint = {
      hash,
      parent: this._currentHash,
      seed,
      timestamp: Date.now(),
      deltaSize: this._estimateSize(changes)
    };

    // Store the point
    this._versions.set(hash, versionPoint);
    this._deltas.set(hash, new Map(changes));

    this._currentHash = hash;
    return hash;
  }

  /**
   * Get current version point (last observed point)
   */
  getCurrentPoint(): VersionPoint {
    return this._versions.get(this._currentHash)!;
  }

  /**
   * Get any version point by hash - O(1)
   * The point contains its entire lower dimension
   */
  getVersionPoint(hash: string): VersionPoint | undefined {
    return this._versions.get(hash);
  }

  /**
   * Get state at version - O(1) drill + O(depth) reconstruction
   * Assumption: state is contained in this version's lower dimension
   * Reconstruction walks parent chain applying deltas
   */
  getState(versionHash: string): Map<string, unknown> {
    // Cache hit: already materialized this lower dimension
    if (this._stateCache.has(versionHash)) {
      return this._stateCache.get(versionHash)!;
    }

    // Reconstruct: walk from version to root collecting deltas
    const state = new Map<string, unknown>();
    let current: string | null = versionHash;
    const deltaChain: Map<string, unknown>[] = [];

    // Collect all deltas in lineage
    while (current !== null) {
      const delta = this._deltas.get(current);
      if (delta) {
        deltaChain.unshift(delta);
      }
      const vp = this._versions.get(current);
      current = vp?.parent ?? null;
    }

    // Apply deltas forward (lineage walks from root to target version)
    deltaChain.forEach(delta => {
      delta.forEach((value, key) => {
        state.set(key, value);
      });
    });

    // Cache this version's state (now observed)
    this._stateCache.set(versionHash, state);
    return state;
  }

  /**
   * Get storage stats for this substrate (one line)
   */
  getStorageStats() {
    let totalDeltaBytes = 0;
    this._versions.forEach(point => {
      totalDeltaBytes += point.deltaSize;
    });

    return {
      versions: this._versions.size,
      deltaBytes: totalDeltaBytes,
      cached: this._stateCache.size,
      avgDeltaSize: this._versions.size > 0 ? totalDeltaBytes / this._versions.size : 0
    };
  }

  /**
   * Private: Deterministic hash from parent + seed
   */
  private _deriveHash(parentHash: string, seed: number): string {
    let result = parentHash;
    for (let i = 0; i < 8; i++) {
      result = ((seed >>> (i * 4)) & 0xf).toString(16) + result;
    }
    return result.substring(0, 16);
  }

  private _estimateSize(map: Map<string, unknown>): number {
    return map.size * 50 + 100;
  }
}

/**
 * SubstrateRegistry - ONE point per substrate
 * 
 * Drill to substrate ID → O(1) get that substrate point
 * That point contains its entire version history below it
 * 
 * NO iteration. NO forEach. Just drill to what you need.
 */
export class SubstrateRegistry {
  private _substrates: Map<string, VersionedSubstrate>;

  constructor() {
    this._substrates = new Map();
  }

  /**
   * Register substrate - O(1) add one point
   */
  register(id: string, substrate: VersionedSubstrate): void {
    this._substrates.set(id, substrate);
  }

  /**
   * Get substrate by ID - O(1) drill to that point
   * Returns the entire substrate (its lower dimension)
   */
  get(id: string): VersionedSubstrate | undefined {
    return this._substrates.get(id);
  }

  /**
   * List substrate IDs (the points in this registry)
   * DO NOT iterate through substrates in production code.
   * This is only for introspection/debugging.
   * In real usage, you drill to specific substrate by ID.
   */
  listIds(): string[] {
    return Array.from(this._substrates.keys());
  }

  /**
   * Global aggregation (for monitoring only)
   */
  getGlobalStats() {
    let totalVersions = 0;
    let totalDeltaBytes = 0;

    // This is metadata aggregation only - used for monitoring, not in hot path
    this._substrates.forEach(substrate => {
      const stats = substrate.getStorageStats();
      totalVersions += stats.versions;
      totalDeltaBytes += stats.deltaBytes;
    });

    return {
      substrates: this._substrates.size,
      totalVersions,
      totalDeltaBytes,
      avgVersionSize: totalVersions > 0 ? totalDeltaBytes / totalVersions : 0
    };
  }
}

/**
 * Example Usage Pattern (Dimensional, not iterative):
 * 
 * // Observe physics substrate ONCE
 * const physics = registry.get("physics")!;
 * 
 * // Drill to current version (one point = entire state)
 * const currentState = physics.getState(physics.getCurrentPoint().hash);
 * 
 * // Drill to specific entity from that state (it exists if in lower dimension)
 * const body = currentState.get("body_42");
 * if (body) {
 *   // Update and commit
 *   const changes = new Map().set("body_42", updatedBody);
 *   physics.commit(changes);
 * }
 * 
 * // Access version 5 versions ago: O(1) drill + O(depth) reconstruction
 * const oldState = physics.getState("version_hash_5");
 * 
 * // NO LOOPS. NO ITERATION. ONE DRILL = ONE ACCESS.
 */
