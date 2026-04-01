"use strict";
/**
 * StorySubstrate  —  Script Writing, Shot Lists & Storyboard
 * ===========================================================
 * STANDALONE — depends only on core primitives.
 *
 * Capabilities:
 *   • Three-act script structure    (acts → sequences → scenes → beats)
 *   • Dialogue lines + action lines (slugline, parenthetical, character cues)
 *   • Shot list                     (coverage, lens, movement, blocking)
 *   • Storyboard panels             (visual description, camera angle, mood)
 *   • Scene-mood tagging            (shared mood vocabulary with score substrate)
 *   • Character arc tracking        (emotional state per scene)
 *
 * Coordinate space:
 *   drill("script","act<n>","seq<n>","scene<n>","beat<n>") → ScriptBeat
 *   drill("shots",  "<sceneId>","<shotId>")                → Shot
 *   drill("board",  "<sceneId>","<panelId>")               → StoryPanel
 *   drill("chars",  "<charId>",  "<sceneId>")              → CharArcPoint
 *   drill("meta",   "<sceneId>")                           → SceneMeta
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorySubstrate = void 0;
const base_substrate_1 = require("../../../../core/substrate/base-substrate");
// ── StorySubstrate ────────────────────────────────────────────────────────────
class StorySubstrate extends base_substrate_1.BaseSubstrate {
    constructor(config) {
        super({ name: "story", version: "1.0.0", ...config }, null);
    }
    static create(config) {
        return new StorySubstrate(config);
    }
    // ── Script management ─────────────────────────────────────────────────────
    addBeat(beat) {
        const path = `act${beat.act}`;
        this.drill("script", path, `seq${beat.sequence}`, `scene${beat.scene}`, `beat${beat.beat}`).value = beat;
    }
    getBeat(act, seq, scene, beat) {
        return this.drill("script", `act${act}`, `seq${seq}`, `scene${scene}`, `beat${beat}`).value;
    }
    /** Search all beats with a given mood */
    beatsByMood(mood) {
        return this.search([/script/, /.*/, /.*/, /.*/, /.*/])
            .map(d => d.value)
            .filter(b => b && b.mood === mood);
    }
    // ── Shot list ─────────────────────────────────────────────────────────────
    addShot(shot) {
        this.drill("shots", shot.sceneId, shot.id).value = shot;
    }
    getShot(sceneId, shotId) {
        return this.drill("shots", sceneId, shotId).value;
    }
    getShotsForScene(sceneId) {
        return this.drill("shots", sceneId).match(/.*/).map(d => d.value).filter(Boolean)
            .sort((a, b) => a.number - b.number);
    }
    // ── Storyboard panels ─────────────────────────────────────────────────────
    addPanel(panel) {
        this.drill("board", panel.sceneId, panel.id).value = panel;
    }
    getPanel(sceneId, panelId) {
        return this.drill("board", sceneId, panelId).value;
    }
    getPanelsForScene(sceneId) {
        return this.drill("board", sceneId).match(/.*/).map(d => d.value).filter(Boolean)
            .sort((a, b) => a.panelIndex - b.panelIndex);
    }
    // ── Character arc ─────────────────────────────────────────────────────────
    setCharArc(point) {
        this.drill("chars", point.charId, point.sceneId).value = point;
    }
    getCharArc(charId, sceneId) {
        return this.drill("chars", charId, sceneId).value;
    }
    // ── Scene metadata ────────────────────────────────────────────────────────
    setSceneMeta(meta) {
        this.drill("meta", meta.id).value = meta;
    }
    getSceneMeta(id) {
        return this.drill("meta", id).value;
    }
    // ── BaseSubstrate contract ────────────────────────────────────────────────
    reset() {
        this.drill("script").value = null;
        this.drill("shots").value = null;
        this.drill("board").value = null;
        this.drill("chars").value = null;
        this.drill("meta").value = null;
    }
    serialize() { return { name: this.name }; }
    hydrate(_state) { }
}
exports.StorySubstrate = StorySubstrate;
