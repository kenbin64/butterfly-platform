"use strict";
// core/substrate/code-substrate.ts
// Self-coding manifold substrate - code as waveform geometry
// The manifold can represent, transform, and improve its own code
//
// ═══════════════════════════════════════════════════════════════════════════
// CODE AS GEOMETRY
// ═══════════════════════════════════════════════════════════════════════════
//
// Traditional:  code → parse → AST → transform → generate → code
// Manifold:     code → encode as waveform → geometric transform → decode
//
// Each code construct maps to a drill section:
//   Section 1: Imports/Dependencies
//   Section 2: Type Definitions  
//   Section 3: State/Variables
//   Section 4: Functions/Methods
//   Section 5: Logic/Control Flow
//   Section 6: Output/Effects
//   Section 7: Meta/Self-Reference
//
// The waveform amplitude at each section = complexity/weight of that aspect
// Transforming the geometry = refactoring the code
// ═══════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeSubstrate = exports.CodeSection = void 0;
const base_substrate_1 = require("./base-substrate");
const flow_1 = require("./flow");
/** Code section types mapped to drill sections */
var CodeSection;
(function (CodeSection) {
    CodeSection[CodeSection["IMPORTS"] = 1] = "IMPORTS";
    CodeSection[CodeSection["TYPES"] = 2] = "TYPES";
    CodeSection[CodeSection["STATE"] = 3] = "STATE";
    CodeSection[CodeSection["FUNCTIONS"] = 4] = "FUNCTIONS";
    CodeSection[CodeSection["LOGIC"] = 5] = "LOGIC";
    CodeSection[CodeSection["EFFECTS"] = 6] = "EFFECTS";
    CodeSection[CodeSection["META"] = 7] = "META"; // Self-reference, reflection
})(CodeSection || (exports.CodeSection = CodeSection = {}));
/**
 * CodeSubstrate - Self-modifying code as manifold geometry
 *
 * Code is encoded into the 7 diamond sections:
 *   - Each section's amplitude = total complexity of that code type
 *   - Pinch points = boundaries between code concerns
 *   - Rotation = version/transformation state
 *
 * The manifold can:
 *   - Analyze its own structure
 *   - Suggest optimizations (reduce amplitude = reduce complexity)
 *   - Transform code geometrically
 *   - Generate new code from waveform patterns
 */
class CodeSubstrate extends base_substrate_1.BaseSubstrate {
    constructor(config) {
        super({ name: "code", version: "1.0.0", ...config }, { units: {}, version: 0, seed: 0 });
        this._drill = new flow_1.DiamondDrill();
        this._root.value.seed = this._drill.seed;
    }
    /** Get the diamond drill */
    get drill() { return this._drill; }
    /** Register a code unit */
    register(unit) {
        const state = this._root.value;
        state.units[unit.name] = unit;
        this._updateDrill();
    }
    /** Remove a code unit */
    unregister(name) {
        const state = this._root.value;
        delete state.units[name];
        this._updateDrill();
    }
    /** Update drill geometry from code units */
    _updateDrill() {
        const state = this._root.value;
        const sectionTotals = [0, 0, 0, 0, 0, 0, 0];
        for (const unit of Object.values(state.units)) {
            sectionTotals[unit.section - 1] += unit.complexity;
        }
        this._drill.encode(sectionTotals);
    }
    /** Analyze code structure - returns complexity by section */
    analyze() {
        return this._drill.decode().map((amplitude, i) => ({
            section: (i + 1),
            name: CodeSection[i + 1],
            complexity: amplitude
        }));
    }
    /** Find the most complex section (optimization target) */
    findHotspot() {
        const analysis = this.analyze();
        const hotspot = analysis.reduce((max, s) => s.complexity > max.complexity ? s : max);
        return { section: hotspot.section, complexity: hotspot.complexity };
    }
    /** Sample the code waveform at any point */
    sample(theta) {
        return this._drill.sample(theta);
    }
    /** Get the complete code waveform */
    getWaveform(resolution = 70) {
        return this._drill.getWaveform(resolution);
    }
    /** Rotate seed - invalidates external interpretations */
    rotateSeed() {
        const newSeed = this._drill.rotateSeed();
        this._root.value.seed = newSeed;
        return newSeed;
    }
    // Required abstract implementations
    reset() {
        this._root.value = { units: {}, version: 0, seed: this._drill.seed };
        this._drill.encode([0, 0, 0, 0, 0, 0, 0]);
    }
    serialize() {
        return {
            state: this._root.value,
            equation: this._drill.getEquation()
        };
    }
    hydrate(data) {
        const d = data;
        this._root.value = d.state;
    }
}
exports.CodeSubstrate = CodeSubstrate;
