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

import { BaseSubstrate, SubstrateConfig } from "./base-substrate";
import { Dimension, dim } from "../dimensional/dimension";
import { DiamondDrill, DrillSection } from "./flow";

/** Code section types mapped to drill sections */
export enum CodeSection {
  IMPORTS = 1,      // Dependencies, imports
  TYPES = 2,        // Type definitions, interfaces
  STATE = 3,        // Variables, state
  FUNCTIONS = 4,    // Methods, functions
  LOGIC = 5,        // Control flow, algorithms
  EFFECTS = 6,      // Output, side effects
  META = 7          // Self-reference, reflection
}

/** Code unit that can be encoded into the drill */
export interface CodeUnit {
  section: CodeSection;
  name: string;
  complexity: number;    // Maps to amplitude
  dependencies: string[];
  source?: string;
}

/** State shape for code substrate */
interface CodeState {
  units: Record<string, CodeUnit>;
  version: number;
  seed: number;
}

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
export class CodeSubstrate extends BaseSubstrate<CodeState> {
  private readonly _drill: DiamondDrill;
  
  constructor(config?: Partial<SubstrateConfig>) {
    super(
      { name: "code", version: "1.0.0", ...config },
      { units: {}, version: 0, seed: 0 }
    );
    this._drill = new DiamondDrill();
    this._root.value!.seed = this._drill.seed;
  }
  
  /** Get the diamond drill */
  get drill(): DiamondDrill { return this._drill; }
  
  /** Register a code unit */
  register(unit: CodeUnit): void {
    const state = this._root.value!;
    state.units[unit.name] = unit;
    this._updateDrill();
  }
  
  /** Remove a code unit */
  unregister(name: string): void {
    const state = this._root.value!;
    delete state.units[name];
    this._updateDrill();
  }
  
  /** Update drill geometry from code units */
  private _updateDrill(): void {
    const state = this._root.value!;
    const sectionTotals = [0, 0, 0, 0, 0, 0, 0];
    
    for (const unit of Object.values(state.units)) {
      sectionTotals[unit.section - 1] += unit.complexity;
    }
    
    this._drill.encode(sectionTotals);
  }
  
  /** Analyze code structure - returns complexity by section */
  analyze(): { section: CodeSection; name: string; complexity: number }[] {
    return this._drill.decode().map((amplitude, i) => ({
      section: (i + 1) as CodeSection,
      name: CodeSection[i + 1],
      complexity: amplitude
    }));
  }
  
  /** Find the most complex section (optimization target) */
  findHotspot(): { section: CodeSection; complexity: number } {
    const analysis = this.analyze();
    const hotspot = analysis.reduce((max, s) => 
      s.complexity > max.complexity ? s : max
    );
    return { section: hotspot.section, complexity: hotspot.complexity };
  }
  
  /** Sample the code waveform at any point */
  sample(theta: number): number {
    return this._drill.sample(theta);
  }
  
  /** Get the complete code waveform */
  getWaveform(resolution: number = 70): number[] {
    return this._drill.getWaveform(resolution);
  }
  
  /** Rotate seed - invalidates external interpretations */
  rotateSeed(): number {
    const newSeed = this._drill.rotateSeed();
    this._root.value!.seed = newSeed;
    return newSeed;
  }
  
  // Required abstract implementations
  reset(): void {
    this._root.value = { units: {}, version: 0, seed: this._drill.seed };
    this._drill.encode([0, 0, 0, 0, 0, 0, 0]);
  }
  
  serialize(): unknown {
    return {
      state: this._root.value,
      equation: this._drill.getEquation()
    };
  }
  
  hydrate(data: unknown): void {
    const d = data as { state: CodeState; equation: ReturnType<DiamondDrill['getEquation']> };
    this._root.value = d.state;
  }
}

