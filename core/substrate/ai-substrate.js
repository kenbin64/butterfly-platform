"use strict";
// core/substrate/ai-substrate.ts
// AI improvement through manifold geometry
// The AI's knowledge/capabilities exist as waveform distortion
//
// ═══════════════════════════════════════════════════════════════════════════
// AI AS MANIFOLD GEOMETRY
// ═══════════════════════════════════════════════════════════════════════════
//
// Traditional AI: weights → compute → output → backprop → update weights
// Manifold AI:    knowledge as geometry → navigate → transform geometry
//
// The 7 diamond sections map to AI capabilities:
//   Section 1: Perception    (input processing)
//   Section 2: Memory        (knowledge storage)
//   Section 3: Reasoning     (logic, inference)
//   Section 4: Generation    (output production)
//   Section 5: Learning      (self-improvement)
//   Section 6: Action        (effects on world)
//   Section 7: Reflection    (meta-cognition)
//
// IMPROVEMENT = geometric transformation of the manifold
// Not gradient descent - direct shape manipulation
// ═══════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.AISubstrate = exports.AISection = void 0;
const base_substrate_1 = require("./base-substrate");
const flow_1 = require("./flow");
/** AI capability sections */
var AISection;
(function (AISection) {
    AISection[AISection["PERCEPTION"] = 1] = "PERCEPTION";
    AISection[AISection["MEMORY"] = 2] = "MEMORY";
    AISection[AISection["REASONING"] = 3] = "REASONING";
    AISection[AISection["GENERATION"] = 4] = "GENERATION";
    AISection[AISection["LEARNING"] = 5] = "LEARNING";
    AISection[AISection["ACTION"] = 6] = "ACTION";
    AISection[AISection["REFLECTION"] = 7] = "REFLECTION"; // Self-awareness, meta-cognition
})(AISection || (exports.AISection = AISection = {}));
/**
 * AISubstrate - Self-improving AI through manifold geometry
 *
 * Knowledge exists as distortion of the 7 diamond sections.
 * Learning = transforming the geometry.
 * Improvement = increasing amplitude in weak sections.
 *
 * The AI can:
 *   - Drill to any knowledge coordinate instantly
 *   - Transform its own capability geometry
 *   - Generate new knowledge from waveform patterns
 *   - Reflect on its own structure (Section 7)
 */
class AISubstrate extends base_substrate_1.BaseSubstrate {
    constructor(config) {
        super({ name: "ai", version: "1.0.0", ...config }, { knowledge: {}, capabilities: [1, 1, 1, 1, 1, 1, 1], seed: 0, generation: 0 });
        this._drill = new flow_1.DiamondDrill();
        this._root.value.seed = this._drill.seed;
        this._drill.encode(this._root.value.capabilities);
    }
    get drill() { return this._drill; }
    get generation() { return this._root.value.generation; }
    /** Store knowledge in the manifold */
    learn(unit) {
        const state = this._root.value;
        state.knowledge[unit.id] = unit;
        // Increase capability in the relevant section
        state.capabilities[unit.section - 1] += unit.weight;
        this._drill.encode(state.capabilities);
    }
    /** Retrieve knowledge by drilling to coordinates */
    recall(id) {
        return this._root.value.knowledge[id];
    }
    /** Get all knowledge in a section */
    recallSection(section) {
        return Object.values(this._root.value.knowledge)
            .filter(k => k.section === section);
    }
    /** Analyze current capabilities */
    introspect() {
        return this._drill.decode().map((level, i) => ({
            section: (i + 1),
            name: AISection[i + 1],
            level
        }));
    }
    /** Find weakest capability (improvement target) */
    findWeakness() {
        const caps = this.introspect();
        return caps.reduce((min, c) => c.level < min.level ? c : min);
    }
    /** Find strongest capability */
    findStrength() {
        const caps = this.introspect();
        return caps.reduce((max, c) => c.level > max.level ? c : max);
    }
    /**
     * IMPROVE - Transform the manifold geometry
     * This is the core self-improvement mechanism.
     * Instead of gradient descent, we directly manipulate the shape.
     */
    improve(section, amount) {
        const state = this._root.value;
        state.capabilities[section - 1] += amount;
        state.generation++;
        this._drill.encode(state.capabilities);
        this._drill.rotate(amount); // Rotation marks the transformation
    }
    /** Auto-improve: strengthen weakest section using reflection */
    autoImprove() {
        const weakness = this.findWeakness();
        const reflection = this._drill.sample(6.5); // Sample reflection section
        // Use reflection amplitude to determine improvement amount
        const amount = Math.max(0.1, Math.abs(reflection) * 0.1);
        this.improve(weakness.section, amount);
        return {
            improved: weakness.section,
            newLevel: this._root.value.capabilities[weakness.section - 1]
        };
    }
    /** Generate insight from waveform pattern */
    generateInsight() {
        const waveform = this._drill.getWaveform(7);
        const pattern = waveform.map(v => v > 0 ? '↑' : '↓').join('');
        const strength = this.findStrength();
        const weakness = this.findWeakness();
        return `Pattern: ${pattern} | Strong: ${AISection[strength.section]} | Weak: ${AISection[weakness.section]}`;
    }
    // Required implementations
    reset() {
        this._root.value = { knowledge: {}, capabilities: [1, 1, 1, 1, 1, 1, 1], seed: this._drill.seed, generation: 0 };
        this._drill.encode([1, 1, 1, 1, 1, 1, 1]);
    }
    serialize() {
        return { state: this._root.value, equation: this._drill.getEquation() };
    }
    hydrate(data) {
        const d = data;
        this._root.value = d.state;
        this._drill.encode(d.state.capabilities);
    }
}
exports.AISubstrate = AISubstrate;
