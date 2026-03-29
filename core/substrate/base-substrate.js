"use strict";
// core/substrate/base-substrate.ts
// Base class for all substrate engines (physics, video, audio, game, etc.)
// Substrates wrap domain-specific logic in dimensional programming patterns
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationSubstrate = exports.BaseSubstrate = void 0;
const dimension_1 = require("../dimensional/dimension");
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
class BaseSubstrate {
    constructor(config, initialValue) {
        this._observers = new Map();
        this._config = config;
        this._root = (0, dimension_1.dim)(initialValue);
    }
    /** Get substrate name */
    get name() { return this._config.name; }
    /** Get substrate version */
    get version() { return this._root.version; }
    /** Direct drill into substrate - O(1) per level */
    drill(...keys) {
        return this._root.drill(...keys);
    }
    /** Array-based drill (faster for known paths) */
    drillPath(keys) {
        return this._root.drillPath(keys);
    }
    /** Regex match at a coordinate */
    at(key) {
        return this._root.at(key);
    }
    /** Pattern match at root level */
    match(pattern) {
        return this._root.match(pattern);
    }
    /** Recursive pattern search */
    search(patterns) {
        return this._root.search(patterns);
    }
    /** Find first match */
    find(patterns) {
        return this._root.find(patterns);
    }
    /** Observe changes at a coordinate */
    observe(path, fn) {
        const target = this._root.drillPath(path);
        return target.observe(fn);
    }
    /** Get the root dimension (for advanced operations) */
    get root() { return this._root; }
    /**
     * Tick - advance substrate simulation by one frame
     * Override in simulation substrates (physics, game, etc.)
     */
    tick(_deltaTime) {
        // Default: no-op. Override in subclasses.
    }
}
exports.BaseSubstrate = BaseSubstrate;
/**
 * SimulationSubstrate
 * -------------------
 * Base for substrates that tick (physics, game, audio playback)
 */
class SimulationSubstrate extends BaseSubstrate {
    constructor(config, initialValue) {
        super(config, initialValue);
        this._running = false;
        this._lastTick = 0;
        this._tickRate = config.tickRate ?? 60;
    }
    /** Start simulation loop */
    start() {
        this._running = true;
        this._lastTick = Date.now();
    }
    /** Stop simulation loop */
    stop() {
        this._running = false;
    }
    /** Is simulation running? */
    get running() { return this._running; }
    /** Get tick rate (updates per second) */
    get tickRate() { return this._tickRate; }
    /** Process one tick if enough time has passed */
    process() {
        if (!this._running)
            return false;
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
exports.SimulationSubstrate = SimulationSubstrate;
