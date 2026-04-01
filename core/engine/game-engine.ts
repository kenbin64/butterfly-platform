// core/engine/game-engine.ts
// ================================================================
//  GAME ENGINE — Whole (Object)
// ================================================================
//
// Operates on ObjectSubstrate instances. Each game entity is an
// ObjectSubstrate (a volume collapsed to a single z in N+1).
// Entity queries, component access, state management via z-invocation.
//
// Loose coupling: entities are added/removed dynamically.
// No cross-engine deps. Physics/Audio/Render engines are separate.

import {
  type IEngine, type EngineStats,
  EngineState,
} from "./engine-interface";

import { type IObjectSubstrate } from "../substrate/substrate-interface";
import {
  ObjectSubstrate,
  VolumeSubstrate,
  PointSubstrate,
} from "../substrate/dimensional-substrate";

// ─── Game Config ────────────────────────────────────────────────────────────

export interface GameConfig {
  maxEntities: number;
  tickRate: number;  // ticks per second
}

const DEFAULT_CONFIG: GameConfig = {
  maxEntities: 10000,
  tickRate: 60,
};

// ─── Entity ─────────────────────────────────────────────────────────────────

interface Entity {
  name: string;
  object: ObjectSubstrate;
  tags: Set<string>;
  active: boolean;
}

// ─── GameEngine ─────────────────────────────────────────────────────────────

export class GameEngine implements IEngine {
  readonly name = "game";
  private _state: EngineState = EngineState.Idle;
  private _config: GameConfig;
  private _entities: Map<string, Entity> = new Map();
  private _score: PointSubstrate;
  private _tickCount = 0;
  private _totalTime = 0;
  private _lastTickDuration = 0;

  constructor(config?: Partial<GameConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._score = new PointSubstrate("score", 0);
  }

  get state(): EngineState { return this._state; }

  /** Current score (manifold point). */
  get score(): number { return this._score.value; }
  set score(v: number) { this._score.setPath("value", v); }

  /** Number of entities. */
  get entityCount(): number { return this._entities.size; }

  /**
   * Create an entity from a volume (which gets collapsed to an ObjectSubstrate).
   * Returns the ObjectSubstrate.
   */
  createEntity(name: string, volume: VolumeSubstrate, tags: string[] = []): ObjectSubstrate {
    const obj = new ObjectSubstrate(name, volume);
    this._entities.set(name, {
      name,
      object: obj,
      tags: new Set(tags),
      active: true,
    });
    return obj;
  }

  /** Add a pre-built ObjectSubstrate as an entity. */
  addEntity(name: string, object: ObjectSubstrate, tags: string[] = []): void {
    this._entities.set(name, {
      name,
      object,
      tags: new Set(tags),
      active: true,
    });
  }

  /** Remove an entity by name. */
  removeEntity(name: string): boolean {
    return this._entities.delete(name);
  }

  /** Get an entity's ObjectSubstrate by name. */
  getEntity(name: string): ObjectSubstrate | undefined {
    return this._entities.get(name)?.object;
  }

  /** Get all entity names (finite set). */
  entityNames(): string[] {
    return Array.from(this._entities.keys());
  }

  /** Get entity names matching a tag (finite set filter). */
  entitiesByTag(tag: string): string[] {
    const result: string[] = [];
    // Loop over finite set of entities — not a dimension.
    for (const [name, entity] of this._entities) {
      if (entity.tags.has(tag) && entity.active) result.push(name);
    }
    return result;
  }

  /** Set entity active state. */
  setActive(name: string, active: boolean): void {
    const e = this._entities.get(name);
    if (e) e.active = active;
  }

  /** Check if entity is active. */
  isActive(name: string): boolean {
    return this._entities.get(name)?.active ?? false;
  }

  /**
   * Tick — process all active entities.
   * Each entity's collapsed z can be re-evaluated if volumes mutated.
   * Iterates the finite set of entities — not a dimension.
   */
  tick(dt: number): void {
    if (this._state !== EngineState.Running) return;
    const t0 = performance.now();

    // Loop over finite set of entities.
    for (const [, entity] of this._entities) {
      if (!entity.active) continue;
      // Re-collapse if underlying volume changed.
      // The engine's job is to invoke collapse — the manifold does the math.
      entity.object.collapse();
    }

    this._lastTickDuration = performance.now() - t0;
    this._tickCount++;
    this._totalTime += dt;
  }

  start(): void { this._state = EngineState.Running; }
  stop(): void { this._state = EngineState.Stopped; }
  pause(): void { this._state = EngineState.Paused; }
  resume(): void { this._state = EngineState.Running; }

  reset(): void {
    this._state = EngineState.Idle;
    this._entities.clear();
    this._score.setPath("value", 0);
    this._tickCount = 0;
    this._totalTime = 0;
    this._lastTickDuration = 0;
  }

  serialize(): unknown {
    const entities: Record<string, unknown> = {};
    for (const [name, entity] of this._entities) {
      entities[name] = {
        data: entity.object.serialize(),
        tags: Array.from(entity.tags),
        active: entity.active,
      };
    }
    return { config: this._config, score: this._score.value, entities };
  }

  hydrate(state: any): void {
    if (state.config) this._config = { ...DEFAULT_CONFIG, ...state.config };
    if (state.score != null) this._score.setPath("value", state.score);
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
}

