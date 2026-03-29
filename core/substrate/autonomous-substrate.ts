/**
 * AutonomousSubstrate - Actor-Based NPC System
 * ============================================
 * 
 * All NPCs are ACTORS performing visible, choreographed roles.
 * 
 * CRUCIAL DISTINCTION:
 *   - NPCs KNOW they are in a game (meta-awareness)
 *   - But they play their parts EXACTLY like their characters (authentic roleplay)
 *   - During play: fully immersive, never breaking character
 *   - Nothing is canned/scripted dialogue trees
 *   - The game decides outcomes, NPCs respond authentically
 * 
 * Example:
 *   Dragon KNOWS: "I'm an actor in a game world"
 *   Dragon PLAYS: "But I will guard this hoard fiercely and realistically"
 *   (Not wooden, not canned, not breaking immersion - just cooperative theater)
 * 
 * Implementation:
 *   - Role defines character archetype (Dragon: fierce, territorial, intelligent)
 *   - Scripts are choreography, not canned dialogue
 *   - NPCs react to game outcomes authentically
 *   - All behavior is transparent and auditable
 * 
 * Example:
 *   const dragon = new AutonomousActor("dragon_1", dragonRole);
 *   dragon.setScript([
 *     { action: "defend_hoard", target: "player_1" },
 *     { action: "attack", choreography: "fierce_combat" },
 *     { action: "retreat", condition: "health_low" }
 *   ]);
 *   dragon.perform(); // Plays dragon role authentically
 */

import { EntityStore } from "./entity-store";

/**
 * Behavior node in a script (choreographed action)
 */
export interface BehaviorNode {
  action: string;                    // "roar", "move", "attack", etc.
  target?: string;                   // Entity ID (NPC or player)
  targetLocation?: { x: number; y: number };
  intensity?: number;                // 0-100 (how dramatic)
  choreography?: string;             // How to perform (e.g., "fire_breath", "sword_swing")
  parameters?: Record<string, unknown>; // Additional options
  delay?: number;                    // Milliseconds before executing
}

/**
 * Role definition - What character this NPC is playing
 */
export interface NPCRole {
  name: string;                      // "Dragon", "Merchant", "Guard", "Wolf"
  description: string;               // "A fierce dragon guarding its cave"
  capabilities: string[];            // ["roar", "fly", "fire_breath"]
  alignment?: string;                // "hostile", "neutral", "friendly" (for narrative)
  visible: boolean;                  // Always true - transparent
  
  // Character authenticity guidelines (for roleplay)
  archetype?: string;                // "Predator", "Trader", "Enforcer", "Creature"
  motivation?: string;               // Why does this character act? (hoard, profit, duty, survival)
  responseStyle?: string;            // How does this character communicate? (proud, shrewd, stern, primal)
}

/**
 * AutonomousActor - Single NPC performing a role
 * 
 * IMPORTANT: Dual consciousness model
 *   - Meta layer: NPC KNOWS it's an actor in a game
 *   - Play layer: NPC commits FULLY to character during gameplay
 *   - Never breaks character during interactions
 *   - Responds authentically to game outcomes
 * 
 * Example:
 *   Meta: "I'm a dragon actor and players are other actors"
 *   Play: "But I will defend my hoard fiercely and intelligently"
 *   
 *   If player defeats me: I retreat authentically, don't complain about "it's rigged"
 *   If I defeat player: I gloat as a dragon would, not as an actor
 * 
 * NOT canned dialogue or rigid scripting.
 * Just authentic roleplay by agents who know they're in a cooperative game.
 */
export class AutonomousActor {
  private _id: string;
  private _role: NPCRole;
  private _script: BehaviorNode[] = [];
  private _currentNodeIndex = 0;
  private _isPerforming = false;
  private _state: Record<string, unknown> = {};
  private _performanceLog: Array<{ timestamp: number; node: BehaviorNode; result: string }> = [];
  private _co_actors: Set<string> = new Set(); // Other actors in this scene

  constructor(id: string, role: NPCRole) {
    this._id = id;
    this._role = role;
    this._state = {
      position: { x: 0, y: 0 },
      health: 100,
      isAlive: true,
      currentAction: "idle"
    };
  }

  /**
   * Set the choreographed script for this actor
   */
  setScript(nodes: BehaviorNode[]): void {
    this._script = nodes;
    this._currentNodeIndex = 0;
  }

  /**
   * Get current script (for auditing/debugging)
   */
  getScript(): BehaviorNode[] {
    return [...this._script];
  }

  /**
   * Get role definition (what character this is)
   */
  getRole(): NPCRole {
    return { ...this._role };
  }

  /**
   * Set co-actors (other NPCs/players in this scene)
   */
  setCoActors(actors: string[]): void {
    this._co_actors = new Set(actors);
  }

  /**
   * Get current objective (story beat)
   * Returns next action in script (transparent)
   */
  getObjective(): BehaviorNode | null {
    if (this._currentNodeIndex < this._script.length) {
      return this._script[this._currentNodeIndex];
    }
    return null;
  }

  /**
   * Perform next action in script
   * Returns what happened (choreography result)
   */
  perform(): string {
    if (!this._isPerforming && this._script.length === 0) {
      return `${this._id} has no script to perform`;
    }

    if (this._currentNodeIndex >= this._script.length) {
      this._isPerforming = false;
      return `${this._id} finished performance`;
    }

    const node = this._script[this._currentNodeIndex];
    this._state.currentAction = node.action;

    // Execute the choreography
    const result = this._performAction(node);

    // Log the performance
    this._performanceLog.push({
      timestamp: Date.now(),
      node,
      result
    });

    this._currentNodeIndex++;
    return result;
  }

  /**
   * Execute choreographed action
   * This is where the "acting" happens
   */
  private _performAction(node: BehaviorNode): string {
    const intensity = node.intensity || 50;

    switch (node.action) {
      case "roar":
        return `${this._id} roars dramatically (intensity: ${intensity})${
          node.target ? ` toward ${node.target}` : ""
        }`;

      case "attack":
        // Choreographed combat - not real harm
        const healthLoss = Math.max(1, Math.floor(intensity / 2));
        return `${this._id} performs "${node.choreography || "attack"}" on ${node.target} (theatrical damage: ${healthLoss}HP)`;

      case "move":
        const location = node.targetLocation || { x: 0, y: 0 };
        this._state.position = location;
        return `${this._id} moves to (${location.x}, ${location.y})`;

      case "speak":
        return `${this._id} says: "${node.parameters?.message || "..."}"`; 

      case "perform":
        // Generic performance action
        return `${this._id} performs: ${node.choreography || "action"}`;

      case "retreat":
        return `${this._id} retreats${
          node.parameters?.destination ? ` toward ${node.parameters.destination}` : ""
        }`;

      case "wait":
        return `${this._id} waits for cue`;

      case "interact":
        return `${this._id} interacts with ${node.target} (choreography: ${node.choreography || "dialogue"})`;

      default:
        return `${this._id} performs action: ${node.action}`;
    }
  }

  /**
   * Get performance history (auditable)
   * Shows exactly what this actor did and when
   */
  getPerformanceLog(): Array<{ timestamp: number; action: string; result: string }> {
    return this._performanceLog.map(entry => ({
      timestamp: entry.timestamp,
      action: entry.node.action,
      result: entry.result
    }));
  }

  /**
   * Get current state (for display/debugging)
   */
  getState(): Record<string, unknown> {
    return { ...this._state };
  }

  /**
   * Get co-actors in this scene
   */
  getCoActors(): string[] {
    return Array.from(this._co_actors);
  }

  /**
   * Is this actor currently performing?
   */
  isPerforming(): boolean {
    return this._isPerforming || this._currentNodeIndex < this._script.length;
  }

  /**
   * Reset script position (start over)
   */
  reset(): void {
    this._currentNodeIndex = 0;
    this._performanceLog = [];
  }

  /**
   * Get character perspective (for debugging/documentation)
   * Shows both meta-awareness and character commitment
   */
  getCharacterPerspective(): {
    metaAwareness: string;
    characterCommitment: string;
    roleAuthenticity: string;
  } {
    const role = this._role;
    return {
      metaAwareness: `I am ${role.name}, an actor in this game world. All NPCs and players know we're in a cooperative game.`,
      characterCommitment: `But during play, I am EXACTLY ${role.name}: ${role.description}. I respond authentically to what happens.`,
      roleAuthenticity: `My motivation is ${role.motivation || "character-driven"}. I never break character or complain about game outcomes. Even if defeated, I react as my character would.`
    };
  }
}

/**
 * Scene - Multiple actors performing coordinated choreography
 * 
 * A scene is a collective performance:
 *   - Player vs Dragon
 *   - Marketplace interaction
 *   - Party vs Multiple enemies
 *   - Animal herd behavior
 * 
 * All actors know they're in a scene together.
 * Interactions are choreographed, not emergent.
 */
export class Scene {
  private _id: string;
  private _name: string;
  private _actors: Map<string, AutonomousActor> = new Map();
  private _eventLog: Array<{ timestamp: number; actor: string; event: string }> = [];

  constructor(id: string, name: string) {
    this._id = id;
    this._name = name;
  }

  /**
   * Add actor to scene
   */
  addActor(actor: AutonomousActor): void {
    this._actors.set(actor.getRole().name, actor);
    this._eventLog.push({
      timestamp: Date.now(),
      actor: actor.getRole().name,
      event: "joined_scene"
    });
  }

  /**
   * Get actor by role name
   */
  getActor(roleName: string): AutonomousActor | undefined {
    return this._actors.get(roleName);
  }

  /**
   * Execute one cycle of choreography
   * All actors perform their next action
   */
  performCycle(): Map<string, string> {
    const results = new Map<string, string>();

    this._actors.forEach((actor, roleName) => {
      const result = actor.perform();
      results.set(roleName, result);
      this._eventLog.push({
        timestamp: Date.now(),
        actor: roleName,
        event: result
      });
    });

    return results;
  }

  /**
   * Run entire choreography to completion
   */
  runToCompletion(): Array<{ actor: string; timeline: string[] }> {
    const timeline: Array<{ actor: string; events: string[] }> = Array.from(this._actors.entries()).map(([name]) => ({
      actor: name,
      events: []
    }));

    // Perform until all actors finish
    const maxCycles = 1000; // Safety limit
    let cycles = 0;
    while (cycles < maxCycles) {
      const anyPerforming = Array.from(this._actors.values()).some(actor => actor.isPerforming());
      if (!anyPerforming) break;

      this.performCycle();
      cycles++;
    }

    return timeline.map(item => ({
      actor: item.actor,
      timeline: this._actors
        .get(item.actor)
        ?.getPerformanceLog()
        .map(entry => entry.result) || []
    }));
  }

  /**
   * Get event log (auditable scene history)
   */
  getEventLog(): Array<{ timestamp: number; actor: string; event: string }> {
    return [...this._eventLog];
  }

  /**
   * Get scene summary
   */
  getSummary(): {
    name: string;
    actors: number;
    events: number;
    duration: number; // Milliseconds
  } {
    const timestamps = this._eventLog.map(e => e.timestamp);
    const duration = timestamps.length > 0 ? Math.max(...timestamps) - Math.min(...timestamps) : 0;

    return {
      name: this._name,
      actors: this._actors.size,
      events: this._eventLog.length,
      duration
    };
  }
}

/**
 * AutonomousSubstrate - Registry of all autonomous actors and scenes
 * 
 * Manages all NPCs and their choreographed performances across the game world.
 */
export class AutonomousSubstrate {
  private _actors: Map<string, AutonomousActor> = new Map();
  private _scenes: Map<string, Scene> = new Map();
  private _globalLog: Array<{ timestamp: number; type: string; details: string }> = [];

  constructor() {
    this._globalLog.push({ timestamp: Date.now(), type: "init", details: "AutonomousSubstrate created" });
  }

  /**
   * Create or register an autonomous actor
   */
  createActor(id: string, role: NPCRole): AutonomousActor {
    const actor = new AutonomousActor(id, role);
    this._actors.set(id, actor);
    this._globalLog.push({
      timestamp: Date.now(),
      type: "actor_created",
      details: `Actor "${id}" with role "${role.name}"`
    });
    return actor;
  }

  /**
   * Get actor by ID
   */
  getActor(id: string): AutonomousActor | undefined {
    return this._actors.get(id);
  }

  /**
   * Create a scene (choreographed interaction)
   */
  createScene(id: string, name: string): Scene {
    const scene = new Scene(id, name);
    this._scenes.set(id, scene);
    this._globalLog.push({
      timestamp: Date.now(),
      type: "scene_created",
      details: `Scene "${name}"`
    });
    return scene;
  }

  /**
   * Get scene by ID
   */
  getScene(id: string): Scene | undefined {
    return this._scenes.get(id);
  }

  /**
   * Get global audit log
   */
  getAuditLog(): Array<{ timestamp: number; type: string; details: string }> {
    return [...this._globalLog];
  }

  /**
   * Statistics
   */
  getStats() {
    let performingActors = 0;
    let totalActions = 0;

    this._actors.forEach(actor => {
      if (actor.isPerforming()) {
        performingActors++;
      }
      totalActions += actor.getPerformanceLog().length;
    });

    return {
      totalActors: this._actors.size,
      performingActors,
      totalScenes: this._scenes.size,
      totalActions,
      auditLogEntries: this._globalLog.length
    };
  }
}

/**
 * ============================================================================
 * USAGE EXAMPLE: Dragon Encounter Scene
 * ============================================================================
 * 
 * // Create substrate
 * const autonomous = new AutonomousSubstrate();
 * 
 * // Create dragon actor
 * const dragonRole: NPCRole = {
 *   name: "Dragon",
 *   description: "A fierce dragon guarding treasure",
 *   capabilities: ["roar", "fly", "fire_breath", "defend"],
 *   alignment: "hostile",
 *   visible: true
 * };
 * const dragon = autonomous.createActor("dragon_1", dragonRole);
 * 
 * // Choreograph the dragon's performance
 * dragon.setScript([
 *   { action: "roar", intensity: 100 },
 *   { action: "attack", target: "player_1", choreography: "fire_breath", intensity: 75 },
 *   { action: "move", targetLocation: { x: 50, y: 50 } },
 *   { action: "attack", target: "player_1", choreography: "claw_swipe", intensity: 60 },
 *   { action: "retreat", parameters: { destination: "cave" } }
 * ]);
 * 
 * // Create scene
 * const scene = autonomous.createScene("encounter_1", "Dragon's Lair");
 * scene.addActor(dragon);
 * 
 * // Execute choreography
 * while (dragon.isPerforming()) {
 *   const results = scene.performCycle();
 *   console.log(results);
 *   // Output:
 *   // "dragon_1 roars dramatically (intensity: 100)"
 *   // "dragon_1 performs "fire_breath" on player_1 (theatrical damage: 37HP)"
 *   // ... etc
 * }
 * 
 * // Audit what happened
 * console.log(scene.getEventLog());
 * // Shows exact sequence of events, all choreographed
 * 
 * // No surprises. No hidden AI. No real harm.
 * // Just actors performing a coordinated scene.
 */
