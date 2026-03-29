"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousSubstrate = exports.Scene = exports.AutonomousActor = void 0;
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
class AutonomousActor {
    constructor(id, role) {
        this._script = [];
        this._currentNodeIndex = 0;
        this._isPerforming = false;
        this._state = {};
        this._performanceLog = [];
        this._co_actors = new Set(); // Other actors in this scene
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
    setScript(nodes) {
        this._script = nodes;
        this._currentNodeIndex = 0;
    }
    /**
     * Get current script (for auditing/debugging)
     */
    getScript() {
        return [...this._script];
    }
    /**
     * Get role definition (what character this is)
     */
    getRole() {
        return { ...this._role };
    }
    /**
     * Set co-actors (other NPCs/players in this scene)
     */
    setCoActors(actors) {
        this._co_actors = new Set(actors);
    }
    /**
     * Get current objective (story beat)
     * Returns next action in script (transparent)
     */
    getObjective() {
        if (this._currentNodeIndex < this._script.length) {
            return this._script[this._currentNodeIndex];
        }
        return null;
    }
    /**
     * Perform next action in script
     * Returns what happened (choreography result)
     */
    perform() {
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
    _performAction(node) {
        const intensity = node.intensity || 50;
        switch (node.action) {
            case "roar":
                return `${this._id} roars dramatically (intensity: ${intensity})${node.target ? ` toward ${node.target}` : ""}`;
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
                return `${this._id} retreats${node.parameters?.destination ? ` toward ${node.parameters.destination}` : ""}`;
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
    getPerformanceLog() {
        return this._performanceLog.map(entry => ({
            timestamp: entry.timestamp,
            action: entry.node.action,
            result: entry.result
        }));
    }
    /**
     * Get current state (for display/debugging)
     */
    getState() {
        return { ...this._state };
    }
    /**
     * Get co-actors in this scene
     */
    getCoActors() {
        return Array.from(this._co_actors);
    }
    /**
     * Is this actor currently performing?
     */
    isPerforming() {
        return this._isPerforming || this._currentNodeIndex < this._script.length;
    }
    /**
     * Reset script position (start over)
     */
    reset() {
        this._currentNodeIndex = 0;
        this._performanceLog = [];
    }
    /**
     * Get character perspective (for debugging/documentation)
     * Shows both meta-awareness and character commitment
     */
    getCharacterPerspective() {
        const role = this._role;
        return {
            metaAwareness: `I am ${role.name}, an actor in this game world. All NPCs and players know we're in a cooperative game.`,
            characterCommitment: `But during play, I am EXACTLY ${role.name}: ${role.description}. I respond authentically to what happens.`,
            roleAuthenticity: `My motivation is ${role.motivation || "character-driven"}. I never break character or complain about game outcomes. Even if defeated, I react as my character would.`
        };
    }
}
exports.AutonomousActor = AutonomousActor;
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
class Scene {
    constructor(id, name) {
        this._actors = new Map();
        this._eventLog = [];
        this._id = id;
        this._name = name;
    }
    /**
     * Add actor to scene
     */
    addActor(actor) {
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
    getActor(roleName) {
        return this._actors.get(roleName);
    }
    /**
     * Execute one cycle of choreography
     * All actors perform their next action
     */
    performCycle() {
        const results = new Map();
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
    runToCompletion() {
        const timeline = Array.from(this._actors.entries()).map(([name]) => ({
            actor: name,
            events: []
        }));
        // Perform until all actors finish
        const maxCycles = 1000; // Safety limit
        let cycles = 0;
        while (cycles < maxCycles) {
            const anyPerforming = Array.from(this._actors.values()).some(actor => actor.isPerforming());
            if (!anyPerforming)
                break;
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
    getEventLog() {
        return [...this._eventLog];
    }
    /**
     * Get scene summary
     */
    getSummary() {
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
exports.Scene = Scene;
/**
 * AutonomousSubstrate - Registry of all autonomous actors and scenes
 *
 * Manages all NPCs and their choreographed performances across the game world.
 */
class AutonomousSubstrate {
    constructor() {
        this._actors = new Map();
        this._scenes = new Map();
        this._globalLog = [];
        this._globalLog.push({ timestamp: Date.now(), type: "init", details: "AutonomousSubstrate created" });
    }
    /**
     * Create or register an autonomous actor
     */
    createActor(id, role) {
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
    getActor(id) {
        return this._actors.get(id);
    }
    /**
     * Create a scene (choreographed interaction)
     */
    createScene(id, name) {
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
    getScene(id) {
        return this._scenes.get(id);
    }
    /**
     * Get global audit log
     */
    getAuditLog() {
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
exports.AutonomousSubstrate = AutonomousSubstrate;
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
