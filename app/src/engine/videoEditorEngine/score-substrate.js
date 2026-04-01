"use strict";
/**
 * ScoreSubstrate  —  Original Score & Theme Generation
 * =====================================================
 * STANDALONE — depends only on core primitives.
 *
 * Capabilities:
 *   • Mood-driven theme generation (maps scene mood → musical parameters)
 *   • Character leitmotifs        (unique melodic motif per character)
 *   • Orchestration profiles      (strings, brass, electronics, hybrid)
 *   • Tempo sync to edit rhythm   (BPM locks to cut density)
 *   • Music ducking               (auto-lower score under dialogue)
 *   • Stem export structure       (melody, harmony, rhythm, bass, fx)
 *
 * Coordinate space:
 *   drill("themes",   "<sceneId>")          → SceneTheme
 *   drill("leitmotif","<charId>")           → CharacterMotif
 *   drill("stems",    "<sceneId>","<stem>") → StemData
 *   drill("tempo",    "<sceneId>")          → TempoMap
 *   drill("duck",     "<sceneId>","<ms>")   → DuckEvent
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreSubstrate = void 0;
const base_substrate_1 = require("../../../../core/substrate/base-substrate");
// ── Mood → musical parameter presets ────────────────────────────────────────
const MOOD_PRESETS = {
    neutral: { key: "C", mode: "major", bpm: 88, orchestration: ["strings", "piano"], dynamicLevel: 0.4 },
    tense: { key: "Eb", mode: "phrygian", bpm: 132, orchestration: ["strings", "brass", "percussion"], dynamicLevel: 0.8 },
    joyful: { key: "G", mode: "major", bpm: 120, orchestration: ["strings", "woodwind", "piano"], dynamicLevel: 0.7 },
    melancholy: { key: "D", mode: "minor", bpm: 60, orchestration: ["strings", "piano", "pad"], dynamicLevel: 0.35 },
    action: { key: "A", mode: "dorian", bpm: 160, orchestration: ["brass", "percussion", "synth"], dynamicLevel: 1.0 },
    romantic: { key: "F", mode: "lydian", bpm: 72, orchestration: ["strings", "piano", "choir"], dynamicLevel: 0.55 },
    horror: { key: "Ab", mode: "locrian", bpm: 50, orchestration: ["strings", "synth", "pad", "fx"], dynamicLevel: 0.65 },
    comedic: { key: "C", mode: "mixolydian", bpm: 140, orchestration: ["woodwind", "guitar", "piano"], dynamicLevel: 0.6 },
    epic: { key: "E", mode: "minor", bpm: 104, orchestration: ["strings", "brass", "choir", "percussion"], dynamicLevel: 0.95 },
};
// ── ScoreSubstrate ────────────────────────────────────────────────────────────
class ScoreSubstrate extends base_substrate_1.BaseSubstrate {
    constructor(config) {
        super({ name: "score", version: "1.0.0", ...config }, null);
    }
    static create(config) {
        return new ScoreSubstrate(config);
    }
    // ── Theme generation ──────────────────────────────────────────────────────
    generateTheme(sceneId, mood, overrides = {}) {
        const preset = MOOD_PRESETS[mood] ?? MOOD_PRESETS.neutral;
        const theme = {
            sceneId,
            mood,
            key: (overrides.key ?? preset.key ?? "C"),
            mode: (overrides.mode ?? preset.mode ?? "major"),
            bpm: overrides.bpm ?? preset.bpm ?? 100,
            timeSignature: overrides.timeSignature ?? [4, 4],
            orchestration: overrides.orchestration ?? preset.orchestration ?? ["strings"],
            dynamicLevel: overrides.dynamicLevel ?? preset.dynamicLevel ?? 0.5,
            notes: overrides.notes ?? "",
        };
        this.drill("themes", sceneId).value = theme;
        return theme;
    }
    getTheme(sceneId) {
        return this.drill("themes", sceneId).value;
    }
    // ── Character leitmotifs ──────────────────────────────────────────────────
    setLeitmotif(motif) {
        this.drill("leitmotif", motif.charId).value = motif;
    }
    getLeitmotif(charId) {
        return this.drill("leitmotif", charId).value;
    }
    // ── Stems ─────────────────────────────────────────────────────────────────
    setStem(sceneId, stemData) {
        this.drill("stems", sceneId, stemData.stem).value = stemData;
    }
    getStem(sceneId, stem) {
        return this.drill("stems", sceneId, stem).value;
    }
    // ── Tempo mapping ─────────────────────────────────────────────────────────
    syncTempToCuts(sceneId, cutsPerMinute, bpmOverride) {
        // Lock BPM to cut rhythm: 1 cut = 1 bar → BPM = cuts/min × 4 (4/4 time)
        const bpm = bpmOverride ?? Math.max(40, Math.min(200, cutsPerMinute * 4));
        const tempoMap = {
            sceneId, bpm, cutDensity: cutsPerMinute, syncedToCuts: !bpmOverride
        };
        this.drill("tempo", sceneId).value = tempoMap;
        return tempoMap;
    }
    // ── Music ducking ─────────────────────────────────────────────────────────
    addDuckEvent(sceneId, event) {
        this.drill("duck", sceneId, String(event.startMs)).value = event;
    }
    getDuckEvents(sceneId) {
        return this.drill("duck", sceneId).match(/.*/).map(d => d.value).filter(Boolean);
    }
    // ── BaseSubstrate contract ────────────────────────────────────────────────
    reset() {
        this.drill("themes").value = null;
        this.drill("leitmotif").value = null;
        this.drill("stems").value = null;
        this.drill("tempo").value = null;
        this.drill("duck").value = null;
    }
    serialize() { return { name: this.name }; }
    hydrate(_state) { }
}
exports.ScoreSubstrate = ScoreSubstrate;
