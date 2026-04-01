// core/engine/engine-registry.ts
// ================================================================
//  ENGINE REGISTRY — Mix-and-match engine profiles
// ================================================================
//
// The registry maps profile names to engine factory functions.
// A profile is a recipe: which engines to wire up and how.
//
// A 2D platformer uses: render + audio + game  (no physics volume).
// A 3D sim uses:         physics + render + audio + game.
// A music app uses:      audio only.
// A physics sandbox:     physics + render.
//
// Custom profiles can be registered at runtime.
// Building a profile returns an EngineSuite ready to start().

import { type IEngine, EngineSuite } from "./engine-interface";
import { PhysicsEngine, type PhysicsConfig } from "./physics-engine";
import { AudioEngine, type AudioConfig } from "./audio-engine";
import { RenderEngine, type RenderConfig } from "./render-engine";
import { ThreeRenderEngine, type ThreeRenderConfig } from "./three-render-engine";
import { GameEngine, type GameConfig } from "./game-engine";
import { RulesEngine, type RulesConfig } from "./rules-engine";
import { CharacterEngine, type CharacterConfig } from "./character-engine";

// ─── Config union for all engines ────────────────────────────────────────────

export interface RegistryConfig {
  physics?: Partial<PhysicsConfig>;
  audio?: Partial<AudioConfig>;
  render?: Partial<RenderConfig>;
  threeRender?: Partial<ThreeRenderConfig>;
  game?: Partial<GameConfig>;
  rules?: Partial<RulesConfig>;
  characters?: Partial<CharacterConfig>;
}

// ─── Profile definition ─────────────────────────────────────────────────────

/**
 * An EngineProfile is a factory: given optional config overrides,
 * it produces a set of named IEngine instances.
 *
 * The registry wraps these into an EngineSuite.
 */
export type EngineFactory = (config?: RegistryConfig) => IEngine[];

export interface ProfileEntry {
  name: string;
  description: string;
  factory: EngineFactory;
}

// ─── EngineRegistry ─────────────────────────────────────────────────────────

export class EngineRegistry {
  private _profiles: Map<string, ProfileEntry> = new Map();

  constructor() {
    this._registerBuiltins();
  }

  /** Register a custom profile. Overwrites if name exists. */
  register(name: string, description: string, factory: EngineFactory): void {
    this._profiles.set(name, { name, description, factory });
  }

  /** Unregister a profile by name. */
  unregister(name: string): boolean {
    return this._profiles.delete(name);
  }

  /** Check if a profile exists. */
  has(name: string): boolean {
    return this._profiles.has(name);
  }

  /** Get profile metadata (without building). */
  getProfile(name: string): ProfileEntry | undefined {
    return this._profiles.get(name);
  }

  /** List all registered profile names. */
  profileNames(): string[] {
    return Array.from(this._profiles.keys());
  }

  /** List all profiles with descriptions. */
  listProfiles(): Array<{ name: string; description: string }> {
    return Array.from(this._profiles.values()).map(p => ({
      name: p.name,
      description: p.description,
    }));
  }

  /**
   * Build an EngineSuite from a registered profile.
   * Throws if profile not found.
   */
  build(profileName: string, config?: RegistryConfig): EngineSuite {
    const profile = this._profiles.get(profileName);
    if (!profile) {
      throw new Error(`EngineRegistry: unknown profile "${profileName}". Available: ${this.profileNames().join(", ")}`);
    }
    const engines = profile.factory(config);
    const suite = new EngineSuite(profileName);
    // Loop over finite set of engines — not a dimension.
    for (const engine of engines) {
      suite.add(engine);
    }
    return suite;
  }

  // ─── Built-in profiles ──────────────────────────────────────────────────

  private _registerBuiltins(): void {
    // 3D game: all engines including rules and characters
    this.register("game-3d", "Full 3D game — physics, audio, render, game, rules, characters", (cfg) => [
      new PhysicsEngine(undefined, cfg?.physics),
      new AudioEngine(cfg?.audio),
      new RenderEngine(cfg?.render),
      new GameEngine(cfg?.game),
      new RulesEngine(cfg?.rules),
      new CharacterEngine(cfg?.characters),
    ]);

    // 2D game: no physics volume
    this.register("game-2d", "2D game — audio, render, game, rules, characters (no physics)", (cfg) => [
      new AudioEngine(cfg?.audio),
      new RenderEngine(cfg?.render),
      new GameEngine(cfg?.game),
      new RulesEngine(cfg?.rules),
      new CharacterEngine(cfg?.characters),
    ]);

    // Audio-only: music apps, DAWs, sound tools
    this.register("audio-only", "Audio workstation — audio engine only", (cfg) => [
      new AudioEngine(cfg?.audio),
    ]);

    // Simulation: physics + game logic, no rendering or audio
    this.register("simulation", "Headless simulation — physics + game logic", (cfg) => [
      new PhysicsEngine(undefined, cfg?.physics),
      new GameEngine(cfg?.game),
    ]);

    // Physics sandbox: physics + render, no game logic or audio
    this.register("physics-sandbox", "Physics sandbox — physics + render", (cfg) => [
      new PhysicsEngine(undefined, cfg?.physics),
      new RenderEngine(cfg?.render),
    ]);

    // Render-only: visualization, UI apps, slideshow
    this.register("render-only", "Visual app — render engine only", (cfg) => [
      new RenderEngine(cfg?.render),
    ]);

    // 3D game with Three.js: full 3D pipeline
    this.register("game-3d-threejs", "Full 3D game with Three.js — physics, audio, 3D render, game, rules, characters", (cfg) => [
      new PhysicsEngine(undefined, cfg?.physics),
      new AudioEngine(cfg?.audio),
      new ThreeRenderEngine(cfg?.threeRender),
      new GameEngine(cfg?.game),
      new RulesEngine(cfg?.rules),
      new CharacterEngine(cfg?.characters),
    ]);

    // 3D render-only with Three.js: visualization, 3D viewer
    this.register("render-3d-threejs", "3D visualization — Three.js render engine only", (cfg) => [
      new ThreeRenderEngine(cfg?.threeRender),
    ]);
  }
}

/** Singleton default registry with all built-in profiles. */
export const defaultRegistry = new EngineRegistry();

