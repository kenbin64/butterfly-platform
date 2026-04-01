// core/engine/engine-interface.ts
// ================================================================
//  ENGINE INTERFACE + SUITE ORCHESTRATOR
// ================================================================
//
// Engines are the laws of motion. They operate on substrates
// (the dimensions) by invoking z on finite sets of path expressions.
//
// Loose coupling rules:
//   • Engines receive substrates via constructor injection.
//   • No engine imports or references another engine.
//   • EngineSuite orchestrates multiple engines — engines don't know about it.
//   • Every engine can run independently (standalone) or in a suite.

import { type ISubstrate } from "../substrate/substrate-interface";

// ─── Engine States ──────────────────────────────────────────────────────────

export enum EngineState {
  Idle = "idle",
  Running = "running",
  Paused = "paused",
  Stopped = "stopped",
}

// ─── IEngine — the universal engine contract ────────────────────────────────

/**
 * Every engine implements this interface.
 * Engines are laws of motion that act on substrates (dimensions).
 *
 * The engine does NOT own the substrate — it receives it.
 * Multiple engines can share the same substrate (read different dimensions).
 * An engine can operate on zero substrates (pure logic engine).
 */
export interface IEngine {
  /** Human-readable engine name. */
  readonly name: string;

  /** Current state of the engine. */
  readonly state: EngineState;

  /**
   * Advance the engine by dt seconds.
   * This is the core law-of-motion method.
   * All work happens here: z-invocations on the substrate's finite sets.
   */
  tick(dt: number): void;

  /** Start the engine (transitions Idle/Stopped → Running). */
  start(): void;

  /** Stop the engine (transitions Running/Paused → Stopped). */
  stop(): void;

  /** Pause the engine (transitions Running → Paused). */
  pause(): void;

  /** Resume from pause (transitions Paused → Running). */
  resume(): void;

  /** Reset engine to initial state. */
  reset(): void;

  /** Serialize engine-specific state (not the substrate — the engine). */
  serialize(): unknown;

  /** Hydrate engine from serialized state. */
  hydrate(state: unknown): void;

  /** Get engine stats for diagnostics. */
  getStats(): EngineStats;
}

// ─── Engine Stats ───────────────────────────────────────────────────────────

export interface EngineStats {
  name: string;
  state: EngineState;
  tickCount: number;
  totalTime: number;
  lastTickDuration: number;
}

// ─── EngineSuite — runs multiple engines together ───────────────────────────

/**
 * EngineSuite orchestrates a collection of IEngine instances.
 *
 * Rules:
 *   • Engines are added/removed dynamically.
 *   • tick(dt) calls each engine's tick in registration order.
 *   • Engines don't know about the suite — they just get ticked.
 *   • The suite itself is an IEngine, so suites can nest.
 */
export class EngineSuite implements IEngine {
  readonly name: string;
  private _state: EngineState = EngineState.Idle;
  private _engines: IEngine[] = [];
  private _tickCount = 0;
  private _totalTime = 0;
  private _lastTickDuration = 0;

  constructor(name: string) {
    this.name = name;
  }

  get state(): EngineState { return this._state; }

  /** Add an engine to the suite. Returns the suite for chaining. */
  add(engine: IEngine): this {
    this._engines.push(engine);
    return this;
  }

  /** Remove an engine by name. */
  remove(name: string): boolean {
    const idx = this._engines.findIndex(e => e.name === name);
    if (idx === -1) return false;
    this._engines.splice(idx, 1);
    return true;
  }

  /** Get an engine by name. */
  get(name: string): IEngine | undefined {
    return this._engines.find(e => e.name === name);
  }

  /** All registered engines. */
  get engines(): ReadonlyArray<IEngine> { return this._engines; }

  /** Tick all engines in registration order. */
  tick(dt: number): void {
    if (this._state !== EngineState.Running) return;
    const t0 = performance.now();
    // Loop over the finite set of engines — not a dimension.
    for (const engine of this._engines) {
      engine.tick(dt);
    }
    this._lastTickDuration = performance.now() - t0;
    this._tickCount++;
    this._totalTime += dt;
  }

  start(): void {
    this._state = EngineState.Running;
    for (const engine of this._engines) engine.start();
  }

  stop(): void {
    this._state = EngineState.Stopped;
    for (const engine of this._engines) engine.stop();
  }

  pause(): void {
    this._state = EngineState.Paused;
    for (const engine of this._engines) engine.pause();
  }

  resume(): void {
    this._state = EngineState.Running;
    for (const engine of this._engines) engine.resume();
  }

  reset(): void {
    this._state = EngineState.Idle;
    this._tickCount = 0;
    this._totalTime = 0;
    this._lastTickDuration = 0;
    for (const engine of this._engines) engine.reset();
  }

  serialize(): { engines: Record<string, unknown> } {
    const engines: Record<string, unknown> = {};
    for (const engine of this._engines) {
      engines[engine.name] = engine.serialize();
    }
    return { engines };
  }

  hydrate(state: { engines: Record<string, unknown> }): void {
    for (const engine of this._engines) {
      const s = state.engines[engine.name];
      if (s !== undefined) engine.hydrate(s);
    }
  }

  getStats(): EngineStats {
    return {
      name: this.name,
      state: this._state,
      tickCount: this._tickCount,
      totalTime: this._totalTime,
      lastTickDuration: this._lastTickDuration,
    };
  }

  /** Get stats from all engines (including this suite). */
  getAllStats(): EngineStats[] {
    return [this.getStats(), ...this._engines.map(e => e.getStats())];
  }
}

