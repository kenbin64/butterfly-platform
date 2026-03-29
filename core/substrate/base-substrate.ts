// core/substrate/base-substrate.ts
// Base class for all substrate engines (physics, video, audio, game, etc.)
// Substrates wrap domain-specific logic in dimensional programming patterns

import { Dimension, dim, DimensionVersion } from "../dimensional/dimension";

/**
 * SubstrateConfig - Configuration for substrate initialization
 */
export interface SubstrateConfig {
  name: string;
  version?: string;
  tickRate?: number;  // Updates per second (for simulation substrates)
}

/**
 * BaseSubstrate
 * -------------
 * Foundation for all domain-specific substrates.
 * 
 * A substrate:
 * - Exposes dimensional coordinates for domain objects
 * - Internally uses manifold operations (no iteration)
 * - Outputs familiar domain results (vectors, colors, samples)
 * 
 * PARADIGM: You drill to coordinates, not search for objects.
 */
export abstract class BaseSubstrate<T = unknown> {
  protected _root: Dimension<T>;
  protected _config: SubstrateConfig;
  protected _observers: Map<string, Set<(value: unknown) => void>> = new Map();
  
  constructor(config: SubstrateConfig, initialValue: T) {
    this._config = config;
    this._root = dim(initialValue);
  }

  /** Get substrate name */
  get name(): string { return this._config.name; }
  
  /** Get substrate version */
  get version(): DimensionVersion { return this._root.version; }

  /** Direct drill into substrate - O(1) per level */
  drill<U = unknown>(...keys: string[]): Dimension<U> {
    return this._root.drill<U>(...keys);
  }

  /** Array-based drill (faster for known paths) */
  drillPath<U = unknown>(keys: readonly string[]): Dimension<U> {
    return this._root.drillPath<U>(keys);
  }

  /** Regex match at a coordinate */
  at(key: string): Dimension {
    return this._root.at(key);
  }

  /** Pattern match at root level */
  match(pattern: RegExp): Dimension[] {
    return this._root.match(pattern);
  }

  /** Recursive pattern search */
  search(patterns: RegExp[]): Dimension[] {
    return this._root.search(patterns);
  }

  /** Find first match */
  find(patterns: RegExp[]): Dimension | undefined {
    return this._root.find(patterns);
  }

  /** Observe changes at a coordinate */
  observe(path: string[], fn: (value: unknown, path: string[]) => void): () => void {
    const target = this._root.drillPath(path);
    return target.observe(fn);
  }

  /** Get the root dimension (for advanced operations) */
  get root(): Dimension<T> { return this._root; }

  /**
   * Tick - advance substrate simulation by one frame
   * Override in simulation substrates (physics, game, etc.)
   */
  tick(_deltaTime: number): void {
    // Default: no-op. Override in subclasses.
  }

  /**
   * Reset substrate to initial state
   * Creates new version, preserving history
   */
  abstract reset(): void;

  /**
   * Serialize substrate state for persistence
   * The manifold IS the persistence - this extracts discrete points
   */
  abstract serialize(): unknown;

  /**
   * Hydrate substrate from serialized state
   */
  abstract hydrate(state: unknown): void;
}

/**
 * SimulationSubstrate
 * -------------------
 * Base for substrates that tick (physics, game, audio playback)
 */
export abstract class SimulationSubstrate<T = unknown> extends BaseSubstrate<T> {
  protected _tickRate: number;
  protected _running: boolean = false;
  protected _lastTick: number = 0;

  constructor(config: SubstrateConfig, initialValue: T) {
    super(config, initialValue);
    this._tickRate = config.tickRate ?? 60;
  }

  /** Start simulation loop */
  start(): void {
    this._running = true;
    this._lastTick = Date.now();
  }

  /** Stop simulation loop */
  stop(): void {
    this._running = false;
  }

  /** Is simulation running? */
  get running(): boolean { return this._running; }

  /** Get tick rate (updates per second) */
  get tickRate(): number { return this._tickRate; }

  /** Process one tick if enough time has passed */
  process(): boolean {
    if (!this._running) return false;
    
    const now = Date.now();
    const delta = (now - this._lastTick) / 1000;
    const targetDelta = 1 / this._tickRate;
    
    if (delta >= targetDelta) {
      this.tick(delta);
      this._lastTick = now;
      return true;
    }
    return false;
  }
}

