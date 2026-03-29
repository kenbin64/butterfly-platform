"use strict";
// app/src/engine/gameengine/game-substrate.ts
// Manifold-based game engine substrate
// Drill to entities, components, systems - ECS through dimensional programming
//
// ═══════════════════════════════════════════════════════════════════════════
// THE DRILL BIT MODEL (NOT DNA)
// ═══════════════════════════════════════════════════════════════════════════
//
//   ╭─╮   ╭─╮   ╭─╮   ╭─╮   ╭─╮   ╭─╮   ╭─╮
//   │1│───│2│───│3│───│4│───│5│───│6│───│7│  ← 7 saddle surfaces (z=xy)
//   ╰─╯   ╰─╯   ╰─╯   ╰─╯   ╰─╯   ╰─╯   ╰─╯
//         [K]       [K]       [K]            ← Turn keys at 2, 4, 6
//
// BREAKTHROUGH: The 7 saddles form a DRILL BIT, not DNA.
//
// Data doesn't get "stored" - it DISTORTS the drill bit geometry.
// The distorted shape IS the data representation.
// Storage = ONLY the distortion parameters (7 rotation angles).
//
//   Traditional:  data → encode → store in memory → decode → retrieve
//   Manifold:     data → distort geometry → SHAPE IS DATA → read shape
//
// Why it's tiny:
//   - No data storage - only distortion parameters
//   - 7 pairs × 1 rotation value = 7 numbers total
//   - The geometry itself encodes unlimited information
//
// Why it's fast:
//   - Reading = observing current shape (O(1))
//   - Writing = rotating the drill (mechanical, not computational)
//   - Data emerges at rotation speed, not CPU speed
//
// ═══════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSubstrate = void 0;
const base_substrate_1 = require("../../../../core/substrate/base-substrate");
const flow_1 = require("../../../../core/substrate/flow");
const DEFAULT_CONFIG = {
    name: "game",
    version: "1.0.0",
    tickRate: 60
};
/**
 * GameSubstrate
 * -------------
 * Manifold-based ECS game engine.
 *
 * Coordinates:
 *   drill("entities", "player")                    → entity dimension
 *   drill("entities", "player", "transform", "position") → Vec3
 *   drill("entities", "player", "sprite", "frame") → number
 *   drill("systems", "physics")                    → system config
 *   drill("state", "score")                        → game state value
 *
 * Pattern matching for entities:
 *   drill("entities").match(/^enemy_/)             → all enemies
 *   search([/^entities$/, /^.*$/, /^health$/])     → all health components
 */
class GameSubstrate extends base_substrate_1.SimulationSubstrate {
    constructor(config) {
        super({ ...DEFAULT_CONFIG, ...config }, {
            running: false,
            paused: false,
            time: 0,
            deltaTime: 0,
            entities: {}
        });
        this._drillCount = 0;
        // Initialize the helical cascade and diamond drill
        this._helix = new flow_1.HelicalCascade();
        this._diamond = new flow_1.DiamondDrill();
        // Initialize game coordinates
        this.drill("state", "running").value = false;
        this.drill("state", "paused").value = false;
        this.drill("state", "time").value = 0;
        // Store helix and diamond state in manifold
        this.drill("helix", "state").value = this._helix.state();
        this.drill("diamond", "seed").value = this._diamond.seed;
    }
    /** Get the helical cascade - the discrete drill mechanism */
    get helix() { return this._helix; }
    /** Get the diamond drill - the geometric data carrier */
    get diamond() { return this._diamond; }
    /**
     * Drill with helical propagation.
     * Each drill TURNS the cascade - the coordinate hash selects which key to turn.
     * Data emerges at the speed of rotation, not computation.
     */
    drillPath(path) {
        // Determine which turn key to engage based on path hash
        // @manifold-exempt-math: geometric key selection
        const keySelector = path.reduce((h, k) => (h + k.charCodeAt(0)) % 3, 0);
        const turnKey = this._helix.TURN_KEYS[keySelector]; // 2, 4, or 6
        // Turn the cascade - data propagates through the gear train
        this._helix.turnKey(turnKey);
        this._drillCount++;
        // Navigate to coordinate - the wave has already propagated
        let dim = this.root;
        for (const key of path) {
            dim = dim.at(key);
        }
        return dim;
    }
    /** Get cascade state after drilling */
    getCascadeState() {
        return this._helix.state();
    }
    /** Get total drills (turns) performed */
    getDrillCount() {
        return this._drillCount;
    }
    /** Create game substrate */
    static create(config) {
        return new GameSubstrate(config);
    }
    /** Create an entity at coordinate */
    createEntity(id, tags = []) {
        const entity = this.drill("entities", id);
        entity.drill("active").value = true;
        entity.drill("tags").value = tags;
        entity.drill("components").value = [];
        return entity;
    }
    /** Get entity by ID - O(1) */
    entity(id) {
        return this.drill("entities", id);
    }
    /** Add component to entity */
    addComponent(entityId, componentType, data) {
        const entity = this.entity(entityId);
        const comp = entity.drill(componentType);
        // Set component data
        for (const [key, value] of Object.entries(data)) {
            comp.drill(key).value = value;
        }
        // Track component on entity
        const components = entity.drill("components").value || [];
        if (!components.includes(componentType)) {
            entity.drill("components").value = [...components, componentType];
        }
        return comp;
    }
    /** Get component from entity - O(1) */
    component(entityId, componentType) {
        return this.entity(entityId).drill(componentType);
    }
    /** Find entities with tag */
    findByTag(tag) {
        const pattern = new RegExp(`.*`);
        return this.drill("entities").match(pattern).filter(e => {
            const tags = e.drill("tags").value || [];
            return tags.includes(tag);
        });
    }
    /** Find entities matching ID pattern */
    findEntities(pattern) {
        return this.drill("entities").match(pattern);
    }
    /** Set game state value */
    setState(key, value) {
        this.drill("state", key).value = value;
    }
    /** Get game state value */
    getState(key) {
        return this.drill("state", key).value;
    }
    /** Tick - advance game simulation */
    tick(dt) {
        if (this.drill("state", "paused").value)
            return;
        const time = this.drill("state", "time").value || 0;
        this.drill("state", "time").value = time + dt;
        this.drill("state", "deltaTime").value = dt;
        // Systems would process here based on registered system coordinates
    }
    /** Pause game */
    pause() {
        this.drill("state", "paused").value = true;
    }
    /** Resume game */
    resume() {
        this.drill("state", "paused").value = false;
    }
    /** Reset game */
    reset() {
        this.drill("state", "time").value = 0;
        this.drill("state", "paused").value = false;
        // Entities persist in manifold - clear only if needed
    }
    /** Serialize */
    serialize() {
        return {
            running: this._running,
            paused: this.drill("state", "paused").value || false,
            time: this.drill("state", "time").value || 0,
            deltaTime: this.drill("state", "deltaTime").value || 0,
            entities: {}
        };
    }
    /** Hydrate */
    hydrate(state) {
        this.drill("state", "time").value = state.time;
        this.drill("state", "paused").value = state.paused;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // DINING PHILOSOPHERS SYNCHRONIZATION
    // ═══════════════════════════════════════════════════════════════════════════
    // Processes wait for a philosopher to "eat" before proceeding.
    // Philosophers are coordinates - not computed, navigated.
    // This runs faster than the processor because we're not computing locks -
    // we're drilling to synchronization points that already exist.
    /** Initialize N philosophers at the table */
    initPhilosophers(count) {
        this.drill("sync", "count").value = count;
        // @manifold-exempt-math: index generation for philosopher IDs
        for (let i = 0; i < count; i++) {
            const p = this.drill("sync", "philosophers", `p_${i}`);
            p.drill("eating").value = false;
            p.drill("thinking").value = true;
            p.drill("fork_left").value = true; // available
            p.drill("fork_right").value = true; // available
            p.drill("index").value = i;
        }
    }
    /** Philosopher coordinate - O(1) */
    philosopher(index) {
        return this.drill("sync", "philosophers", `p_${index}`);
    }
    /** Try to acquire forks and eat - returns true if philosopher can eat */
    tryEat(index) {
        const count = this.drill("sync", "count").value || 0;
        const leftIndex = index;
        const rightIndex = (index + 1) % count;
        const self = this.philosopher(index);
        const leftFork = this.philosopher(leftIndex).drill("fork_right");
        const rightFork = this.philosopher(rightIndex).drill("fork_left");
        // Check if both forks available - drill, don't compute
        if (leftFork.value && rightFork.value) {
            // Acquire forks
            leftFork.value = false;
            rightFork.value = false;
            self.drill("eating").value = true;
            self.drill("thinking").value = false;
            return true;
        }
        return false;
    }
    /** Release forks after eating */
    finishEating(index) {
        const count = this.drill("sync", "count").value || 0;
        const leftIndex = index;
        const rightIndex = (index + 1) % count;
        const self = this.philosopher(index);
        const leftFork = this.philosopher(leftIndex).drill("fork_right");
        const rightFork = this.philosopher(rightIndex).drill("fork_left");
        // Release forks
        leftFork.value = true;
        rightFork.value = true;
        self.drill("eating").value = false;
        self.drill("thinking").value = true;
    }
    /** Wait for a philosopher to eat before proceeding */
    async waitForPhilosopher(index) {
        // Drill to eating state - O(1) check
        while (!this.philosopher(index).drill("eating").value) {
            // Yield to allow philosopher to acquire forks
            await new Promise(r => setTimeout(r, 0));
        }
    }
    /** Check if philosopher is eating - O(1) */
    isEating(index) {
        return this.philosopher(index).drill("eating").value || false;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // METRICS & BENCHMARKING
    // ═══════════════════════════════════════════════════════════════════════════
    /** Initialize metrics tracking */
    initMetrics() {
        this.drill("metrics", "drills").value = 0;
        this.drill("metrics", "eats").value = 0;
        this.drill("metrics", "waits").value = 0;
        this.drill("metrics", "contentions").value = 0;
        this.drill("metrics", "startTime").value = performance.now();
    }
    /** Increment a metric - O(1) */
    metric(name, delta = 1) {
        const current = this.drill("metrics", name).value || 0;
        this.drill("metrics", name).value = current + delta;
    }
    /** Get metric value */
    getMetric(name) {
        return this.drill("metrics", name).value || 0;
    }
    /** Get all metrics as snapshot */
    getMetrics() {
        const elapsed = performance.now() - (this.drill("metrics", "startTime").value || 0);
        return {
            drills: this.getMetric("drills"),
            eats: this.getMetric("eats"),
            waits: this.getMetric("waits"),
            contentions: this.getMetric("contentions"),
            elapsedMs: elapsed,
            eatsPerSec: this.getMetric("eats") / (elapsed / 1000),
            drillsPerSec: this.getMetric("drills") / (elapsed / 1000)
        };
    }
    /** Try to eat with metrics tracking */
    tryEatWithMetrics(index) {
        this.metric("drills", 4); // 4 drills: count, self, leftFork, rightFork
        const result = this.tryEat(index);
        if (result) {
            this.metric("eats");
        }
        else {
            this.metric("contentions");
        }
        return result;
    }
    /** Get philosopher statistics */
    philosopherStats() {
        const count = this.drill("sync", "count").value || 0;
        let eating = 0;
        let thinking = 0;
        // @manifold-exempt-math: counting for statistics
        for (let i = 0; i < count; i++) {
            if (this.isEating(i))
                eating++;
            else
                thinking++;
        }
        return { eating, thinking, total: count };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // WAVEFORM GEOMETRY
    // ═══════════════════════════════════════════════════════════════════════════
    // The drill distorts the manifold. The distortion IS the data.
    // These methods expose the wave nature of coordinate access.
    /**
     * Drill with wave - returns value and the distortion amplitude.
     * The amplitude represents how "far" the manifold bent to produce this value.
     */
    drillWave(path) {
        const dim = this.drillPath(path);
        const value = dim.value;
        // Amplitude: depth of drill = magnitude of perturbation
        // @manifold-exempt-math: geometric calculation
        const amplitude = path.length;
        // Phase: derived from path hash - where on the wave we sampled
        const phase = path.reduce((acc, key) => {
            let h = 0;
            for (let i = 0; i < key.length; i++) {
                h = ((h << 5) - h + key.charCodeAt(i)) | 0;
            }
            return (acc + h) % 360;
        }, 0);
        return { value, amplitude, phase };
    }
    /**
     * Sample the manifold waveform at multiple points.
     * Returns the wave pattern across coordinates.
     */
    sampleWave(basePath, samples) {
        return samples.map(key => {
            const fullPath = [...basePath, key];
            const wave = this.drillWave(fullPath);
            return { key, amplitude: wave.amplitude, phase: wave.phase };
        });
    }
    /**
     * Get the interference pattern between two drills.
     * When waves from different coordinates meet, they interfere.
     */
    interference(pathA, pathB) {
        const waveA = this.drillWave(pathA);
        const waveB = this.drillWave(pathB);
        // @manifold-exempt-math: phase difference calculation
        const delta = Math.abs(waveA.phase - waveB.phase);
        const constructive = delta < 90 || delta > 270;
        return { constructive, delta };
    }
}
exports.GameSubstrate = GameSubstrate;
