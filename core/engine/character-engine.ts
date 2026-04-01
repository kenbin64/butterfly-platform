// core/engine/character-engine.ts
// ================================================================
//  CHARACTER ENGINE — Generic Character Spawner & Manager
// ================================================================
//
// Defines and manages characters without being character-specific.
// Characters have:
//   • Attributes   — generic key→value pairs (PointSubstrate each)
//   • Backstory    — narrative text (string)
//   • Personality  — trait name→intensity pairs (PointSubstrate each)
//   • Autonomous flag — autonomous characters are "actors" aware
//     it's a game and that nobody actually gets hurt.
//   • Non-autonomous characters are player-controlled.
//
// The engine provides a spawner (factory from definitions) and
// per-tick behavior updates for autonomous characters.
//
// Loose coupling: no cross-engine deps. Characters are ObjectSubstrates.

import {
  type IEngine, type EngineStats,
  EngineState,
} from "./engine-interface";

import {
  PointSubstrate,
  VolumeSubstrate,
  ObjectSubstrate,
} from "../substrate/dimensional-substrate";

// ─── Character Types ─────────────────────────────────────────────────────────

/**
 * CharacterDefinition — the template for spawning characters.
 * Not character-specific: any game can define its own attribute keys,
 * personality trait names, and backstory content.
 */
export interface CharacterDefinition {
  /** Template name (e.g., "warrior", "merchant", "villager"). */
  templateName: string;
  /** Default attributes (e.g., { health: 100, strength: 50 }). */
  attributes: Record<string, number>;
  /** Personality traits and intensities 0–1 (e.g., { courage: 0.8 }). */
  personality: Record<string, number>;
  /** Narrative backstory text. */
  backstory: string;
  /** Is this character autonomous (AI actor) or player-controlled? */
  autonomous: boolean;
}

/**
 * BehaviorFn — autonomous character behavior callback.
 * Called each tick for autonomous characters.
 * Receives the character and dt, can read/modify attributes.
 */
export type BehaviorFn = (character: Character, dt: number) => void;

/**
 * Character — a spawned instance. Each character is an ObjectSubstrate
 * (a volume collapsed to a single z in N+1).
 */
export interface Character {
  /** Unique instance name. */
  readonly name: string;
  /** Which template it was spawned from. */
  readonly templateName: string;
  /** The character's underlying ObjectSubstrate. */
  readonly object: ObjectSubstrate;
  /** Named attributes as manifold points. */
  readonly attributes: Map<string, PointSubstrate>;
  /** Personality traits as manifold points (0–1 intensity). */
  readonly personality: Map<string, PointSubstrate>;
  /** Narrative backstory. */
  backstory: string;
  /** Autonomous = AI actor. Non-autonomous = player-controlled. */
  readonly autonomous: boolean;
  /**
   * Autonomous characters are actors — they know it's a game
   * and that nobody actually gets hurt. This is their awareness.
   */
  readonly awareness: "actor" | "player-controlled";
  /** Is this character currently active in the scene? */
  active: boolean;
  /** Optional behavior function for autonomous characters. */
  behavior: BehaviorFn | null;
}

// ─── Character Config ────────────────────────────────────────────────────────

export interface CharacterConfig {
  maxCharacters: number;
}

const DEFAULT_CONFIG: CharacterConfig = {
  maxCharacters: 10000,
};

// ─── CharacterEngine ─────────────────────────────────────────────────────────

export class CharacterEngine implements IEngine {
  readonly name = "characters";
  private _state: EngineState = EngineState.Idle;
  private _config: CharacterConfig;
  private _definitions: Map<string, CharacterDefinition> = new Map();
  private _characters: Map<string, Character> = new Map();
  private _tickCount = 0;
  private _totalTime = 0;
  private _lastTickDuration = 0;

  constructor(config?: Partial<CharacterConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  get state(): EngineState { return this._state; }

  /** Number of spawned characters. */
  get characterCount(): number { return this._characters.size; }

  /** Number of registered definitions. */
  get definitionCount(): number { return this._definitions.size; }

  // ─── Definition Management ──────────────────────────────────────────────

  /** Register a character definition (template). */
  defineCharacter(def: CharacterDefinition): void {
    this._definitions.set(def.templateName, def);
  }

  /** Remove a definition. */
  removeDefinition(templateName: string): boolean {
    return this._definitions.delete(templateName);
  }

  /** List all definition template names (finite set). */
  definitionNames(): string[] {
    return Array.from(this._definitions.keys());
  }

  /** Get a definition by template name. */
  getDefinition(templateName: string): CharacterDefinition | undefined {
    return this._definitions.get(templateName);
  }

  // ─── Spawning ────────────────────────────────────────────────────────────

  /**
   * Spawn a character instance from a registered definition.
   * Each spawned character gets its own ObjectSubstrate (volume→z).
   * Autonomous characters are actors — they know it's a game.
   */
  spawn(instanceName: string, templateName: string, overrides?: {
    attributes?: Record<string, number>;
    personality?: Record<string, number>;
    backstory?: string;
    behavior?: BehaviorFn;
  }): Character {
    const def = this._definitions.get(templateName);
    if (!def) {
      throw new Error(`CharacterEngine: unknown template "${templateName}". Available: ${this.definitionNames().join(", ")}`);
    }

    // Merge defaults with overrides.
    const attrs = { ...def.attributes, ...overrides?.attributes };
    const traits = { ...def.personality, ...overrides?.personality };
    const story = overrides?.backstory ?? def.backstory;

    // Build attribute PointSubstrates (finite set of named points).
    const attrMap = new Map<string, PointSubstrate>();
    for (const [key, val] of Object.entries(attrs)) {
      attrMap.set(key, new PointSubstrate(`${instanceName}:attr:${key}`, val));
    }

    // Build personality PointSubstrates.
    const personalityMap = new Map<string, PointSubstrate>();
    for (const [key, val] of Object.entries(traits)) {
      personalityMap.set(key, new PointSubstrate(`${instanceName}:trait:${key}`, val));
    }

    // Create underlying volume → object substrate.
    const volume = new VolumeSubstrate(`${instanceName}:volume`);
    const object = new ObjectSubstrate(`${instanceName}:object`, volume);

    const character: Character = {
      name: instanceName,
      templateName,
      object,
      attributes: attrMap,
      personality: personalityMap,
      backstory: story,
      autonomous: def.autonomous,
      awareness: def.autonomous ? "actor" : "player-controlled",
      active: true,
      behavior: overrides?.behavior ?? null,
    };

    this._characters.set(instanceName, character);
    return character;
  }

  /** Get a spawned character by name. */
  getCharacter(name: string): Character | undefined {
    return this._characters.get(name);
  }

  /** Remove a spawned character. */
  despawn(name: string): boolean {
    return this._characters.delete(name);
  }

  /** List all spawned character names (finite set). */
  characterNames(): string[] {
    return Array.from(this._characters.keys());
  }

  /** Get all active autonomous characters (finite set). */
  activeAutonomous(): Character[] {
    return Array.from(this._characters.values())
      .filter(c => c.active && c.autonomous);
  }

  /** Get all active non-autonomous (player-controlled) characters. */
  activePlayerControlled(): Character[] {
    return Array.from(this._characters.values())
      .filter(c => c.active && !c.autonomous);
  }

  /** Get an attribute value for a character. */
  getAttribute(characterName: string, attrName: string): number | undefined {
    return this._characters.get(characterName)?.attributes.get(attrName)?.value;
  }

  /** Set an attribute value for a character (updates manifold point). */
  setAttribute(characterName: string, attrName: string, value: number): void {
    const attr = this._characters.get(characterName)?.attributes.get(attrName);
    if (attr) attr.setPath("value", value);
  }

  // ─── IEngine lifecycle ──────────────────────────────────────────────────

  /**
   * Tick — update all active autonomous characters.
   * Calls each autonomous character's behavior function if set.
   * Iterates the finite set of characters — not a dimension.
   */
  tick(dt: number): void {
    if (this._state !== EngineState.Running) return;
    const t0 = performance.now();

    // Loop over finite set of active autonomous characters.
    const autonomous = this.activeAutonomous();
    for (const character of autonomous) {
      if (character.behavior) {
        character.behavior(character, dt);
      }
      // Re-collapse the object substrate after behavior updates.
      character.object.collapse();
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
    this._tickCount = 0;
    this._totalTime = 0;
    this._lastTickDuration = 0;
    this._characters.clear();
  }

  serialize(): unknown {
    const characters: Record<string, {
      templateName: string;
      attributes: Record<string, number>;
      personality: Record<string, number>;
      backstory: string;
      active: boolean;
    }> = {};
    for (const [name, char] of this._characters) {
      const attrs: Record<string, number> = {};
      for (const [k, v] of char.attributes) attrs[k] = v.value;
      const traits: Record<string, number> = {};
      for (const [k, v] of char.personality) traits[k] = v.value;
      characters[name] = {
        templateName: char.templateName,
        attributes: attrs,
        personality: traits,
        backstory: char.backstory,
        active: char.active,
      };
    }
    return {
      config: { ...this._config },
      characters,
      tickCount: this._tickCount,
      totalTime: this._totalTime,
    };
  }

  hydrate(state: any): void {
    if (state.config) this._config = { ...DEFAULT_CONFIG, ...state.config };
    this._tickCount = state.tickCount ?? 0;
    this._totalTime = state.totalTime ?? 0;
    // Hydrate characters (definitions must already be registered).
    if (state.characters) {
      for (const [name, cs] of Object.entries(state.characters) as [string, any][]) {
        if (this._characters.has(name)) {
          const char = this._characters.get(name)!;
          char.active = cs.active;
          char.backstory = cs.backstory;
          for (const [k, v] of Object.entries(cs.attributes) as [string, number][]) {
            char.attributes.get(k)?.setPath("value", v);
          }
          for (const [k, v] of Object.entries(cs.personality) as [string, number][]) {
            char.personality.get(k)?.setPath("value", v);
          }
        } else if (this._definitions.has(cs.templateName)) {
          // Re-spawn from definition with saved state.
          const char = this.spawn(name, cs.templateName, {
            attributes: cs.attributes,
            personality: cs.personality,
            backstory: cs.backstory,
          });
          char.active = cs.active;
        }
      }
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
}
