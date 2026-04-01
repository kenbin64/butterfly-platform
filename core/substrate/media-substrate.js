"use strict";
/**
 * MediaSubstrate  —  MIA (Media Intelligence Architecture)
 * =========================================================
 * LOOSE COUPLING: This is a purely OPTIONAL registry/event-bus.
 * Every media engine works 100% standalone without it.
 * Engines register here only when cross-engine coordination is desired.
 *
 * Dimensional coordinates:
 *   drill("assets", "<id>")           → registered media asset
 *   drill("scenes", "<id>", "mood")   → scene mood dimension
 *   drill("characters", "<id>")       → character dimension
 *   drill("events", "<channel>")      → pub/sub event channel
 *   drill("registry", "<engineName>") → registered engine reference
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaSubstrate = void 0;
const base_substrate_1 = require("./base-substrate");
// ── MediaSubstrate ───────────────────────────────────────────────────────────
class MediaSubstrate extends base_substrate_1.BaseSubstrate {
    constructor(config) {
        super({ name: "mia", version: "1.0.0", ...config }, null);
    }
    static create(config) {
        return new MediaSubstrate(config);
    }
    // ── Asset registry ────────────────────────────────────────────────────────
    registerAsset(asset) {
        this.drill("assets", asset.id).value = asset;
    }
    getAsset(id) {
        return this.drill("assets", id).value;
    }
    // ── Scene registry ────────────────────────────────────────────────────────
    registerScene(scene) {
        this.drill("scenes", scene.id).value = scene;
        this.drill("scenes", scene.id, "mood").value = scene.mood;
    }
    getScene(id) {
        return this.drill("scenes", id).value;
    }
    sceneMood(id) {
        return this.drill("scenes", id, "mood").value ?? "neutral";
    }
    // ── Character registry ────────────────────────────────────────────────────
    registerCharacter(char) {
        this.drill("characters", char.id).value = char;
    }
    getCharacter(id) {
        return this.drill("characters", id).value;
    }
    // ── Engine registry (loose coupling) ─────────────────────────────────────
    registerEngine(name, engine) {
        this.drill("registry", name).value = engine;
    }
    getEngine(name) {
        return this.drill("registry", name).value;
    }
    // ── Event bus ─────────────────────────────────────────────────────────────
    emit(channel, payload) {
        const ch = this.drill("events", channel);
        ch.value = { payload, ts: Date.now() };
    }
    onEvent(channel, handler) {
        return this.drill("events", channel).observe((v) => {
            if (v && typeof v === "object" && "payload" in v) {
                handler(v.payload);
            }
        });
    }
    // ── BaseSubstrate contract ────────────────────────────────────────────────
    reset() {
        // MIA is a live registry — reset clears registrations only
        this.drill("assets").value = null;
        this.drill("scenes").value = null;
        this.drill("registry").value = null;
        this.drill("events").value = null;
    }
    serialize() {
        return {
            name: this.name,
            version: this._config.version
        };
    }
    hydrate(_state) { }
}
exports.MediaSubstrate = MediaSubstrate;
