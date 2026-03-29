// core/substrate/flow.ts
// Helical cascade system with turn-key mechanics
// OPTIMIZED: Uses typed arrays, caching, and minimal allocations

import { VecN } from "../geometry/vector";
import { add, scale, mag } from "../ops";

// Pre-computed constants
const DEG_TO_RAD = Math.PI / 180;

// Reusable typed arrays for zero-allocation notification
const _stateBuffer = new Float64Array(7);
const _changedBuffer = new Uint8Array(7);

/** Observer for cascade state changes */
export type CascadeObserver = (state: Float64Array, changedKeys: Uint8Array) => void;

/**
 * SaddlePair - One unit of the helical structure
 * Two saddles at 90° to each other.
 * OPTIMIZED: Cached radians, inline normalization
 */
export class SaddlePair {
  rotation: number;
  readonly isTurnKey: boolean;
  readonly index: number;
  private _radians: number;
  private _dirty: boolean = true;

  constructor(index: number, rotation: number = 0) {
    this.index = index;
    this.rotation = ((rotation % 360) + 360) % 360;
    this.isTurnKey = (index & 1) === 0; // Bitwise even check
    this._radians = this.rotation * DEG_TO_RAD;
    this._dirty = false;
  }

  /** Turn by 90°. Returns true if this is a turn key. */
  turn(): boolean {
    this.rotation = (this.rotation + 90) % 360;
    this._dirty = true;
    return this.isTurnKey;
  }

  /** Get rotation in radians (cached) */
  get radians(): number {
    if (this._dirty) {
      this._radians = this.rotation * DEG_TO_RAD;
      this._dirty = false;
    }
    return this._radians;
  }
}

/**
 * HelicalCascade - 7 pairs with turn keys at 2, 4, 6
 *
 * Structure:
 *   1 ─── 2 ─── 3 ─── 4 ─── 5 ─── 6 ─── 7
 *         ●         ●         ●
 *       KEY       KEY       KEY
 *
 * Coupling points: 3 (keys 2+4), 5 (keys 4+6)
 */
export class HelicalCascade {
  readonly pairs: SaddlePair[];
  readonly TURN_KEYS: readonly [2, 4, 6] = [2, 4, 6];
  private _observers: Set<CascadeObserver> = new Set();

  constructor(initialState?: number[]) {
    this.pairs = Array.from({ length: 7 }, (_, i) =>
      new SaddlePair(i + 1, initialState?.[i] ?? 0)
    );
  }

  /** Get pair by 1-based index */
  getPair(index: number): SaddlePair | undefined {
    return index >= 1 && index <= 7 ? this.pairs[index - 1] : undefined;
  }

  /** Turn a key, cascading to neighbors */
  turnKey(keyIndex: 2 | 4 | 6): void {
    const affected: number[] = [];

    // Turn key and neighbors
    [keyIndex - 1, keyIndex, keyIndex + 1].forEach(i => {
      const pair = this.getPair(i);
      if (pair) { pair.turn(); affected.push(i); }
    });

    this._notify(affected);
  }

  /** Turn all keys in sequence */
  fullCascade(): void {
    const affected: number[] = [];
    for (const key of this.TURN_KEYS) {
      [key - 1, key, key + 1].forEach(i => {
        const pair = this.getPair(i);
        if (pair) { pair.turn(); affected.push(i); }
      });
    }
    this._notify([...new Set(affected)]);
  }

  /** Get rotation state as array */
  state(): number[] { return this.pairs.map(p => p.rotation); }

  /** Get rotation state as Float64Array (zero allocation) */
  stateTyped(): Float64Array {
    for (let i = 0; i < 7; i++) {
      _stateBuffer[i] = this.pairs[i].rotation;
    }
    return _stateBuffer;
  }

  /** Observe state changes */
  observe(fn: CascadeObserver): () => void {
    this._observers.add(fn);
    return () => this._observers.delete(fn);
  }

  /** Reset all rotations to 0 */
  reset(): void {
    for (let i = 0; i < 7; i++) {
      this.pairs[i].rotation = 0;
    }
    this._notify([1, 2, 3, 4, 5, 6, 7]);
  }

  private _notify(changed: number[]): void {
    if (this._observers.size === 0) return; // Fast path

    // Fill typed arrays
    for (let i = 0; i < 7; i++) {
      _stateBuffer[i] = this.pairs[i].rotation;
      _changedBuffer[i] = 0;
    }
    for (const idx of changed) {
      _changedBuffer[idx - 1] = 1;
    }

    this._observers.forEach(fn => fn(_stateBuffer, _changedBuffer));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DRILL SECTION MODEL - Diamond/Hexagon Geometry
// ═══════════════════════════════════════════════════════════════════════════
//
// Visual representation (side view):
//
//      ◇──────◇──────◇──────◇──────◇──────◇──────◇
//     ╱ ╲    ╱ ╲    ╱ ╲    ╱ ╲    ╱ ╲    ╱ ╲    ╱ ╲
//    ╱   ╲  ╱   ╲  ╱   ╲  ╱   ╲  ╱   ╲  ╱   ╲  ╱   ╲
//   ◇     ◇◇     ◇◇     ◇◇     ◇◇     ◇◇     ◇◇     ◇
//    ╲   ╱  ╲   ╱  ╲   ╱  ╲   ╱  ╲   ╱  ╲   ╱  ╲   ╱
//     ╲ ╱    ╲ ╱    ╲ ╱    ╲ ╱    ╲ ╱    ╲ ╱    ╲ ╱
//      ◇──────◇──────◇──────◇──────◇──────◇──────◇
//      1      2      3      4      5      6      7
//           [K]          [K]          [K]
//
// Each diamond = one saddle section
// ═══════════════════════════════════════════════════════════════════════════
// DIAMOND DRILL GEOMETRY - z = xy PERFECT HELIX
// ═══════════════════════════════════════════════════════════════════════════
//
// CORE PRINCIPLE: SUBSTRATE AS SEED
//   Only the SUBSTRATE needs to be stored - NOT the data itself.
//   The substrate is a SEED that extracts data from the manifold.
//   This is DETERMINISTIC: same substrate → same data, always.
//
// COORDINATE SYSTEM (The 3 Axes):
//   X = SUBSTRATE LENGTH - runs along the entire helix spine
//   Y = AMPLITUDE - the "fat" bulge height at any point
//   Z = OSCILLATION - twist from single point → fat → single point
//
// DIMENSIONAL STRUCTURE:
//   Each PINCH POINT (where ribbon comes to a single point) = 90° angle change
//   Each 90° angle change = entry to a NEW DIMENSION
//   7 sections = 7 dimensional spaces accessible via the drill
//
// THE FUNDAMENTAL STRUCTURE:
//   7 units on the z = xy saddle surface
//   Units 2, 4, 6 are rotated 90° on the x-axis (TurnKey sections)
//   This creates a PERFECT HELIX through 3D space
//
// GEOMETRY VISUAL:
//   ◇──────◇──────◇──────◇──────◇──────◇──────◇
//   │  1   │  2   │  3   │  4   │  5   │  6   │  7  │
//   pinch  fat   pinch  fat   pinch  fat   pinch
//         (90°)       (90°)       (90°)
//
// DATA EXTRACTION (not storage):
//   The manifold IS the infinite data space (z = xy surface)
//   The substrate IS the address/seed (x, y coordinates)
//   Given substrate → drill into manifold → extract z deterministically
//   No data storage needed - the geometry holds everything
//
// DINING PHILOSOPHERS SYNCHRONIZATION:
//   Each section = a philosopher at the table
//   Pinch points = forks shared between adjacent philosophers
//   A section can only be accessed when it "holds" both forks
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DrillSection - One diamond segment of the twisted ribbon helix
 *
 * SUBSTRATE AS SEED:
 *   The section properties ARE the seed - no data storage needed.
 *   Given the same substrate parameters, extract() returns the same value.
 *   This is deterministic: substrate → manifold → data
 *
 * COORDINATE AXES:
 *   X = position along helix spine (substrate length, 0 to wavelength)
 *   Y = amplitude at this X (0 at pinch points, max at fat center)
 *   Z = oscillation/twist (rotates 90° at each pinch = dimensional gate)
 *
 * Each pinch point (where Y=0) is a 90° dimensional boundary.
 * The substrate parameters define WHERE to drill into the manifold.
 */
export class DrillSection {
  readonly index: number;

  // SUBSTRATE PARAMETERS - These ARE the seed (not data storage)
  warp: number;           // Distortion factor for z=xy surface
  amplitude: number;      // Y-axis: fat bulge height (max extraction depth)
  wavelength: number;     // X-axis: section length along helix spine
  frequency: number;      // Oscillation rate (extraction frequency)
  bandwidth: number;      // Y range: extraction window size
  angle: number;          // Z-axis: twist angle (dimensional position)
  phase: number;          // Position in oscillation cycle (0 to 2π)

  // DINING PHILOSOPHERS - Fork state for synchronization
  private _leftFork: boolean = false;   // Coupling to previous section
  private _rightFork: boolean = false;  // Coupling to next section
  private _eating: boolean = false;     // Currently accessing data

  constructor(index: number, amplitude: number = 1, wavelength: number = 1) {
    this.index = index;
    this.warp = 0;                    // No distortion by default (flat z=xy surface)
    this.amplitude = amplitude;       // Y-axis: fat bulge height
    this.wavelength = wavelength;     // X-axis: section length along helix spine
    this.frequency = 1.0;
    this.bandwidth = amplitude * 2;   // Y range: symmetric around zero
    // Z-axis: Each section accumulates 90° (π/2) of twist
    // Pinch points are dimensional boundaries at 90° intervals
    this.angle = (index - 1) * (Math.PI / 2);  // 90° per section = new dimension
    this.phase = 0;
  }

  /**
   * Is this section a TurnKey (coupling point)?
   * Even-indexed sections (2, 4, 6) are TurnKey - they couple adjacent sections.
   */
  get isTurnKey(): boolean {
    return this.index % 2 === 0 && this.index >= 2 && this.index <= 6;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DINING PHILOSOPHERS SYNCHRONIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /** Try to pick up left fork (coupling to previous section) */
  pickUpLeftFork(): boolean {
    if (!this._leftFork) {
      this._leftFork = true;
      return true;
    }
    return false;
  }

  /** Try to pick up right fork (coupling to next section) */
  pickUpRightFork(): boolean {
    if (!this._rightFork) {
      this._rightFork = true;
      return true;
    }
    return false;
  }

  /** Put down both forks */
  putDownForks(): void {
    this._leftFork = false;
    this._rightFork = false;
    this._eating = false;
  }

  /** Can this philosopher eat? (Both forks held) */
  canEat(): boolean {
    return this._leftFork && this._rightFork;
  }

  /** Start eating (accessing data) - must hold both forks */
  startEating(): boolean {
    if (this.canEat()) {
      this._eating = true;
      return true;
    }
    return false;
  }

  /** Is this section currently being accessed? */
  get isEating(): boolean {
    return this._eating;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TWISTED RIBBON SAMPLING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Sample the twisted ribbon at position t (0 to 1 across the section)
   * Incorporates all geometric attributes
   */
  sample(t: number): number {
    // Base waveform: sine with frequency modulation
    const waveform = Math.sin((t * this.frequency + this.phase) * Math.PI);

    // Apply twist (ribbon rotation affects amplitude)
    const twist = Math.cos(this.angle);

    // TurnKey sections have stronger coupling
    const coupling = this.isTurnKey ? 1.2 : 1.0;

    return this.amplitude * waveform * twist * coupling;
  }

  /**
   * Sample the saddle surface z = xy at position (x, y)
   * This is the fundamental geometric operation
   */
  sampleSaddle(x: number, y: number): number {
    // Map to saddle coordinates centered at origin
    const sx = (x - 0.5) * 2 * this.wavelength;
    const sy = (y - 0.5) * 2;

    // Apply ribbon twist
    const twisted_x = sx * Math.cos(this.angle) - sy * Math.sin(this.angle);
    const twisted_y = sx * Math.sin(this.angle) + sy * Math.cos(this.angle);

    return this.amplitude * twisted_x * twisted_y;  // z = xy on twisted ribbon
  }

  /**
   * Get inflection point data (information at the pinch)
   * Inflections are where adjacent sections couple
   */
  getInflection(side: 'left' | 'right'): { position: number; curvature: number; angle: number } {
    const t = side === 'left' ? 0 : 1;
    return {
      position: t,
      curvature: this.curvature(t),
      angle: this.angle + (side === 'right' ? Math.PI / 14 : 0)
    };
  }

  /** Get the curvature at position t (second derivative - rate of change) */
  curvature(t: number): number {
    const freq = this.frequency * Math.PI;
    return -this.amplitude * freq * freq * Math.sin((t * this.frequency + this.phase) * Math.PI);
  }

  /** Is this position near an inflection point (the pinch)? */
  isInflection(t: number, threshold: number = 0.05): boolean {
    return t < threshold || t > (1 - threshold);
  }

  /** Rotate the section (advance phase) */
  rotate(delta: number): void {
    this.angle = ((this.angle + delta * DEG_TO_RAD) % (Math.PI * 2));
    this.phase = (this.phase + delta * 0.01) % (Math.PI * 2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSTRATE AS SEED - Deterministic Data Extraction
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract data from the manifold using this substrate as the seed.
   *
   * DETERMINISTIC: Same substrate parameters → same output, always.
   * No data is stored - the manifold geometry IS the data source.
   *
   * @param x - Position along helix spine (0 to wavelength)
   * @param y - Amplitude position (0 to 1, where 0.5 = center of fat)
   * @returns The z value from the warped z=xy surface
   */
  extract(x: number, y: number = 0.5): number {
    // Normalize x to section position (0 to 1)
    const t = x / this.wavelength;

    // Calculate y amplitude at this x position (diamond shape: pinch → fat → pinch)
    // At t=0 and t=1 (pinch points), amplitude is 0
    // At t=0.5 (center), amplitude is maximum
    const diamondY = this.amplitude * Math.sin(t * Math.PI) * y;

    // Apply the z=xy saddle surface with twist
    const twisted_x = t * Math.cos(this.angle) - diamondY * Math.sin(this.angle);
    const twisted_y = t * Math.sin(this.angle) + diamondY * Math.cos(this.angle);

    // z = xy on the warped surface (warp distorts the saddle)
    const z = twisted_x * twisted_y * (1 + this.warp);

    // Apply frequency modulation and phase
    const modulation = Math.sin((t * this.frequency + this.phase) * Math.PI);

    // The extracted value is deterministic - same substrate → same result
    return z * modulation * this.bandwidth;
  }

  /**
   * Get the substrate seed as a compact representation.
   * This is ALL that needs to be stored - the data extracts from it.
   */
  getSeed(): { i: number; w: number; a: number; l: number; f: number; b: number; g: number; p: number } {
    return {
      i: this.index,       // Section index (dimension)
      w: this.warp,        // Warp distortion
      a: this.amplitude,   // Y max (fat height)
      l: this.wavelength,  // X length (spine segment)
      f: this.frequency,   // Oscillation rate
      b: this.bandwidth,   // Extraction window
      g: this.angle,       // Z twist (angle)
      p: this.phase        // Phase position
    };
  }

  /**
   * Restore a section from a seed.
   * Given the seed, ALL data can be re-extracted deterministically.
   */
  static fromSeed(seed: { i: number; w: number; a: number; l: number; f: number; b: number; g: number; p: number }): DrillSection {
    const section = new DrillSection(seed.i, seed.a, seed.l);
    section.warp = seed.w;
    section.frequency = seed.f;
    section.bandwidth = seed.b;
    section.angle = seed.g;
    section.phase = seed.p;
    return section;
  }

  /** Get all geometric attributes as a data packet */
  getGeometry(): {
    index: number;
    amplitude: number;
    wavelength: number;
    frequency: number;
    bandwidth: number;
    angle: number;
    phase: number;
    isTurnKey: boolean;
  } {
    return {
      index: this.index,
      amplitude: this.amplitude,
      wavelength: this.wavelength,
      frequency: this.frequency,
      bandwidth: this.bandwidth,
      angle: this.angle,
      phase: this.phase,
      isTurnKey: this.isTurnKey
    };
  }
}

/**
 * DiamondDrill - 7-section twisted ribbon manifold with Dining Philosophers sync
 *
 * SUBSTRATE AS SEED:
 *   Only the drill seed needs to be stored - NOT the data.
 *   The seed deterministically extracts data from the z=xy manifold.
 *   Same seed → same data extraction, always.
 *
 * COORDINATE SYSTEM:
 *   X = position along entire helix spine (substrate length)
 *   Y = amplitude (fat bulge height at any point)
 *   Z = oscillation (twist from pinch → fat → pinch, each 90° = new dimension)
 *
 * DIMENSIONAL STRUCTURE:
 *   7 sections = 7 dimensional spaces
 *   Each pinch point = 90° rotation = dimensional boundary
 *   Units 2, 4, 6 are TurnKey coupling sections
 *
 * SYNCHRONIZATION: Dining Philosophers model
 *   - 7 sections = 7 philosophers at a circular table
 *   - Pinch points = forks shared between philosophers
 *   - Access requires both forks (lock-free sync through geometry)
 */
export class DiamondDrill {
  readonly sections: DrillSection[];
  private _shaftRotation: number = 0;
  private _seed: number;

  // Dining Philosophers: 7 forks between 7 philosophers (circular)
  private _forks: boolean[] = [false, false, false, false, false, false, false];

  constructor(seed?: number) {
    this._seed = seed ?? Math.floor(Math.random() * 0xFFFFFFFF);
    this.sections = Array.from({ length: 7 }, (_, i) => new DrillSection(i + 1));
  }

  get seed(): number { return this._seed; }

  /** Rotate seed for security */
  rotateSeed(): number {
    this._seed = Math.floor(Math.random() * 0xFFFFFFFF);
    return this._seed;
  }

  /** Hash function for seed-based scrambling */
  private _seedHash(index: number): number {
    let h = this._seed ^ (index * 2654435761);
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 0xFFFFFFFF;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DINING PHILOSOPHERS - Thread synchronization through geometry
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Try to acquire access to a section (philosopher tries to eat)
   * Must acquire both forks (left and right coupling points)
   * Returns true if access granted, false if blocked
   */
  tryAcquire(sectionIndex: number): boolean {
    const idx = (sectionIndex - 1) % 7;  // Convert 1-based to 0-based
    const leftFork = idx;
    const rightFork = (idx + 1) % 7;

    // Try to pick up both forks atomically
    if (!this._forks[leftFork] && !this._forks[rightFork]) {
      this._forks[leftFork] = true;
      this._forks[rightFork] = true;
      this.sections[idx].pickUpLeftFork();
      this.sections[idx].pickUpRightFork();
      this.sections[idx].startEating();
      return true;
    }
    return false;
  }

  /**
   * Release access to a section (philosopher stops eating)
   */
  release(sectionIndex: number): void {
    const idx = (sectionIndex - 1) % 7;
    const leftFork = idx;
    const rightFork = (idx + 1) % 7;

    this._forks[leftFork] = false;
    this._forks[rightFork] = false;
    this.sections[idx].putDownForks();
  }

  /**
   * Check if a section is currently being accessed
   */
  isLocked(sectionIndex: number): boolean {
    const idx = (sectionIndex - 1) % 7;
    return this.sections[idx].isEating;
  }

  /**
   * Execute a function with exclusive access to a section
   * This is the safe way to access manifold data
   */
  withSection<T>(sectionIndex: number, fn: (section: DrillSection) => T): T | null {
    if (!this.tryAcquire(sectionIndex)) {
      return null;  // Section is busy
    }
    try {
      return fn(this.sections[(sectionIndex - 1) % 7]);
    } finally {
      this.release(sectionIndex);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TWISTED RIBBON SAMPLING
  // ═══════════════════════════════════════════════════════════════════════════

  /** Sample the entire twisted ribbon at position θ (0 to 7 spans all sections) */
  sample(theta: number): number {
    // Determine which section we're in
    const sectionIndex = Math.floor(theta) % 7;
    const t = theta - Math.floor(theta);  // Position within section

    const section = this.sections[sectionIndex];
    const rawValue = section.sample(t);

    // Apply seed scrambling (geometric encryption)
    const scramble = this._seedHash(sectionIndex) * 2 - 1;  // -1 to 1
    return rawValue * (1 + scramble * 0.1 * Math.sin(this._shaftRotation * DEG_TO_RAD));
  }

  /**
   * O(1) DRILL - Direct coordinate access without iteration
   * This is the fundamental operation: drill to (section, x, y) and get z = xy
   */
  drill(section: number, x: number = 0.5, y: number = 0.5): number {
    if (section < 1 || section > 7) {
      throw new Error(`Invalid section ${section}. Must be 1-7.`);
    }
    const sec = this.sections[section - 1];
    const z = sec.sampleSaddle(x, y);
    // Apply seed-based scramble for security
    const scramble = this._seedHash(section);
    return z * (0.9 + scramble * 0.2);
  }

  /**
   * Get TurnKey sections (coupling points)
   */
  getTurnKeys(): DrillSection[] {
    return this.sections.filter(s => s.isTurnKey);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBSTRATE AS SEED - Deterministic Data Extraction
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract data from the manifold at any (x, y) coordinate.
   *
   * DETERMINISTIC: Same seed + same coordinates → same result, always.
   * No data storage - the manifold geometry IS the infinite data source.
   *
   * @param x - Position along entire helix spine (0 to 7*wavelength)
   * @param y - Amplitude position (0 to 1, where 0.5 = center of fat)
   * @returns The z value from the warped z=xy surface
   */
  extract(x: number, y: number = 0.5): number {
    // Determine which section we're drilling into
    const sectionIndex = Math.min(Math.floor(x), 6);
    const localX = x - sectionIndex;  // Position within section

    // Extract from that section
    const section = this.sections[sectionIndex];
    const rawZ = section.extract(localX * section.wavelength, y);

    // Apply drill seed for additional determinism
    const seedMod = this._seedHash(sectionIndex);
    return rawZ * (0.9 + seedMod * 0.2);
  }

  /**
   * Get the complete drill seed - this is ALL that needs to be stored.
   * From this seed, ALL data can be re-extracted deterministically.
   */
  getDrillSeed(): {
    seed: number;
    rotation: number;
    sections: ReturnType<DrillSection['getSeed']>[];
  } {
    return {
      seed: this._seed,
      rotation: this._shaftRotation,
      sections: this.sections.map(s => s.getSeed())
    };
  }

  /**
   * Restore a drill from its seed.
   * Given the seed, the entire manifold is reconstructed.
   */
  static fromDrillSeed(drillSeed: {
    seed: number;
    rotation: number;
    sections: Parameters<typeof DrillSection.fromSeed>[0][];
  }): DiamondDrill {
    const drill = new DiamondDrill(drillSeed.seed);
    drill._shaftRotation = drillSeed.rotation;
    for (let i = 0; i < 7 && i < drillSeed.sections.length; i++) {
      const restored = DrillSection.fromSeed(drillSeed.sections[i]);
      Object.assign(drill.sections[i], {
        warp: restored.warp,
        amplitude: restored.amplitude,
        wavelength: restored.wavelength,
        frequency: restored.frequency,
        bandwidth: restored.bandwidth,
        angle: restored.angle,
        phase: restored.phase
      });
    }
    return drill;
  }

  /** Encode data into section warps (NOT storage - modifies the seed) */
  encode(data: number[]): void {
    for (let i = 0; i < Math.min(data.length, 7); i++) {
      this.sections[i].warp = data[i];  // Warp the surface
      this.sections[i].amplitude = Math.abs(data[i]) + 1;  // Amplitude follows
    }
  }

  /** Decode by extracting from each section center */
  decode(): number[] {
    return this.sections.map(s => s.extract(s.wavelength / 2, 0.5));
  }

  /** Rotate the entire drill shaft */
  rotate(delta: number): void {
    this._shaftRotation = ((this._shaftRotation + delta) % 360 + 360) % 360;
    // Propagate rotation to all sections
    for (const section of this.sections) {
      section.rotate(delta);
    }
  }

  get rotation(): number { return this._shaftRotation; }

  /** Get the complete waveform across all sections */
  getWaveform(resolution: number = 100): number[] {
    const wave: number[] = [];
    for (let i = 0; i < resolution; i++) {
      const theta = (i / resolution) * 7;  // 0 to 7
      wave.push(this.sample(theta));
    }
    return wave;
  }

  /** Get the pinch points (boundaries between sections) */
  getPinchPoints(): number[] {
    return [0, 1, 2, 3, 4, 5, 6, 7];
  }

  /**
   * Get storage representation (the ribbon's geometric equation)
   * All information encoded in these parameters
   */
  getEquation(): {
    seed: number;
    amplitudes: number[];
    wavelengths: number[];
    frequencies: number[];
    angles: number[];
    phases: number[];
    rotation: number;
  } {
    return {
      seed: this._seed,
      amplitudes: this.sections.map(s => s.amplitude),
      wavelengths: this.sections.map(s => s.wavelength),
      frequencies: this.sections.map(s => s.frequency),
      angles: this.sections.map(s => s.angle),
      phases: this.sections.map(s => s.phase),
      rotation: this._shaftRotation
    };
  }

  /** Restore from equation (reconstruct the ribbon geometry) */
  static fromEquation(eq: {
    seed: number;
    amplitudes: number[];
    wavelengths?: number[];
    frequencies?: number[];
    angles?: number[];
    phases?: number[];
    rotation: number;
  }): DiamondDrill {
    const drill = new DiamondDrill(eq.seed);
    for (let i = 0; i < 7; i++) {
      drill.sections[i].amplitude = eq.amplitudes[i] ?? 1;
      drill.sections[i].wavelength = eq.wavelengths?.[i] ?? 1;
      drill.sections[i].frequency = eq.frequencies?.[i] ?? 1;
      drill.sections[i].angle = eq.angles?.[i] ?? (i * Math.PI / 7);
      drill.sections[i].phase = eq.phases?.[i] ?? 0;
    }
    drill._shaftRotation = eq.rotation;
    return drill;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// OIL RIG DRILL MODEL - Waveform Data Carrier (Harmonic Version)
// ═══════════════════════════════════════════════════════════════════════════
//
// Like an oil rig drill: central shaft with attachments that rotate together.
// The waveform IS the data - you only store the wave equation.
//
// EVERY DIMENSION ENCODES INFORMATION:
//   • θ (theta)    → position along shaft (coordinate address)
//   • amplitude    → magnitude of data
//   • phase (φ)    → timing/offset
//   • frequency (ω)→ density of information
//   • x, y values  → 2D coordinates at each point
//   • curvature    → rate of change (derivative)
//   • harmonics    → layered data (Fourier components)
//
// Storage = ONLY the waveform parameters:
//   f(θ) = Σ Aₙ·sin(nωθ + φₙ)  (sum of harmonics)
//
// The waveform generates data on demand - no storage of actual values.
//
// SECURITY: Seed-based geometric encryption
//   • Seed randomizes phase offsets in the waveform
//   • Without seed, sampled data is meaningless noise
//   • Seed can rotate per-run, per-session, per-user
//   • Even stolen code/data is useless without current seed
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OilRigDrill - Secure waveform data carrier with seed-based encryption
 *
 * The drill shaft holds attachments (harmonics) that encode data.
 * A randomized seed scrambles the phase relationships.
 * Without the seed, the waveform cannot be correctly interpreted.
 */
export class OilRigDrill {
  // Harmonics: amplitude and phase for each frequency component
  private _harmonics: Array<{ amplitude: number; phase: number; frequency: number }> = [];

  // Security seed - randomizes the entire waveform interpretation
  private _seed: number;

  // Rotation state of the central shaft
  private _shaftRotation: number = 0;

  constructor(seed?: number) {
    // Generate random seed if not provided
    this._seed = seed ?? Math.floor(Math.random() * 0xFFFFFFFF);
  }

  /** Get current seed (for authorized access only) */
  get seed(): number { return this._seed; }

  /** Rotate seed - invalidates all previous interpretations */
  rotateSeed(): number {
    this._seed = Math.floor(Math.random() * 0xFFFFFFFF);
    return this._seed;
  }

  /** Set specific seed (for session synchronization) */
  setSeed(seed: number): void {
    this._seed = seed;
  }

  /**
   * Hash function for seed-based phase scrambling.
   * Deterministic for same seed+index, random-looking otherwise.
   */
  private _seedHash(index: number): number {
    // Simple but effective hash combining seed and index
    let h = this._seed ^ (index * 2654435761);
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 0xFFFFFFFF * Math.PI * 2;
  }

  /**
   * Add a harmonic (attachment) to the drill shaft.
   * Each harmonic encodes data at a different frequency.
   */
  addHarmonic(amplitude: number, phase: number, frequency: number = 1): void {
    this._harmonics.push({ amplitude, phase, frequency });
  }

  /**
   * Sample the waveform at position θ.
   * Returns the combined value of all harmonics WITH seed scrambling.
   * Without correct seed, result is meaningless.
   */
  sample(theta: number): number {
    let value = 0;
    for (let i = 0; i < this._harmonics.length; i++) {
      const h = this._harmonics[i];
      // Phase is scrambled by seed - without seed, wrong phase = wrong data
      const scrambledPhase = h.phase + this._seedHash(i);
      value += h.amplitude * Math.sin(h.frequency * theta + scrambledPhase + this._shaftRotation);
    }
    return value;
  }

  /**
   * Sample WITHOUT seed scrambling (raw waveform).
   * Only useful for debugging or if you already know the data.
   */
  sampleRaw(theta: number): number {
    let value = 0;
    for (const h of this._harmonics) {
      value += h.amplitude * Math.sin(h.frequency * theta + h.phase + this._shaftRotation);
    }
    return value;
  }

  /**
   * Encode data as harmonics (Fourier-like decomposition).
   * The seed scrambles the encoding - same data, different seed = different waveform.
   */
  encode(data: number[]): void {
    this._harmonics = [];
    for (let i = 0; i < data.length; i++) {
      // Amplitude is the data value
      // Phase is scrambled by seed
      // Frequency increases with index
      this.addHarmonic(
        data[i],
        -this._seedHash(i),  // Pre-scramble phase so sample() unscrambles it
        i + 1
      );
    }
  }

  /**
   * Decode data from harmonics at θ=0.
   * Only works with correct seed.
   */
  decode(length: number): number[] {
    // With correct seed, sampling at specific θ values recovers original data
    const result: number[] = [];
    for (let i = 0; i < length; i++) {
      // Each harmonic's contribution at θ=0
      if (i < this._harmonics.length) {
        result.push(this._harmonics[i].amplitude);
      } else {
        result.push(0);
      }
    }
    return result;
  }

  /** Rotate the central shaft - all attachments rotate together */
  rotate(delta: number): void {
    this._shaftRotation += delta;
  }

  /** Get shaft rotation */
  get rotation(): number { return this._shaftRotation; }

  /** Get number of harmonics (attachments on the drill) */
  get harmonicCount(): number { return this._harmonics.length; }

  /**
   * Find inflection points - where the curve changes direction.
   * Each section between inflections is a complete data unit.
   *
   * The "fat part" (peak/trough) → magnitude
   * The x-axis crossing → boundary
   * Inflection → section delimiter
   */
  findInflections(startTheta: number, endTheta: number, resolution: number = 100): number[] {
    const inflections: number[] = [];
    const step = (endTheta - startTheta) / resolution;

    let prevCurvature = 0;
    for (let i = 1; i < resolution - 1; i++) {
      const theta = startTheta + i * step;

      // Approximate second derivative (curvature)
      const y0 = this.sample(theta - step);
      const y1 = this.sample(theta);
      const y2 = this.sample(theta + step);
      const curvature = y2 - 2 * y1 + y0;  // Second derivative approx

      // Inflection = curvature changes sign
      if (prevCurvature !== 0 && Math.sign(curvature) !== Math.sign(prevCurvature)) {
        inflections.push(theta);
      }
      prevCurvature = curvature;
    }
    return inflections;
  }

  /**
   * Get complete curve sections bounded by inflections.
   * Each section is a data packet with:
   *   - amplitude (fat part height)
   *   - width (section span)
   *   - area (integral - total information)
   */
  getSections(startTheta: number, endTheta: number): Array<{
    start: number;
    end: number;
    amplitude: number;
    width: number;
    area: number;
  }> {
    const inflections = this.findInflections(startTheta, endTheta);
    const sections: Array<{ start: number; end: number; amplitude: number; width: number; area: number }> = [];

    const boundaries = [startTheta, ...inflections, endTheta];

    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i];
      const end = boundaries[i + 1];
      const width = end - start;

      // Find amplitude (max absolute value in section)
      let amplitude = 0;
      let area = 0;
      const steps = 20;
      const stepSize = width / steps;

      for (let j = 0; j <= steps; j++) {
        const theta = start + j * stepSize;
        const value = this.sample(theta);
        amplitude = Math.max(amplitude, Math.abs(value));
        area += value * stepSize;  // Riemann sum
      }

      sections.push({ start, end, amplitude, width, area });
    }

    return sections;
  }

  /**
   * Get the waveform equation as a string (for storage/transmission).
   * This is ALL you need to store - the seed + harmonic parameters.
   */
  getWaveEquation(): { seed: number; harmonics: Array<{ amplitude: number; phase: number; frequency: number }> } {
    return {
      seed: this._seed,
      harmonics: [...this._harmonics]
    };
  }

  /**
   * Restore from a wave equation.
   * Requires the correct seed to interpret correctly.
   */
  static fromEquation(eq: { seed: number; harmonics: Array<{ amplitude: number; phase: number; frequency: number }> }): OilRigDrill {
    const drill = new OilRigDrill(eq.seed);
    drill._harmonics = [...eq.harmonics];
    return drill;
  }
}

/**
 * ContinuousDrill - Infinite helix data representation
 *
 * The drill bit as a continuous spiral where:
 *   - θ (theta) = position along the helix (0 to ∞)
 *   - distortion(θ) = data encoded at that position
 *   - Sample at any θ to read data
 *   - Perturb at any θ to write data
 */
export class ContinuousDrill {
  // Distortion stored as sparse map: θ → amplitude
  // Only stores non-zero distortions (TINY storage)
  private _distortions: Map<number, number> = new Map();

  // Resolution for θ quantization (how fine-grained)
  private readonly _resolution: number;

  // Current rotation of the entire drill
  private _rotation: number = 0;

  constructor(resolution: number = 1000) {
    this._resolution = resolution;
  }

  /** Quantize θ to resolution */
  private _quantize(theta: number): number {
    return Math.round(theta * this._resolution) / this._resolution;
  }

  /** Write data at position θ - distorts the helix */
  distort(theta: number, amplitude: number): void {
    const key = this._quantize(theta);
    if (amplitude === 0) {
      this._distortions.delete(key);
    } else {
      this._distortions.set(key, amplitude);
    }
  }

  /** Read data at position θ - samples the distortion */
  sample(theta: number): number {
    const key = this._quantize(theta);
    return this._distortions.get(key) ?? 0;
  }

  /**
   * Sample with interpolation between distortion points.
   * Returns smooth value even between stored distortions.
   */
  sampleSmooth(theta: number): number {
    const key = this._quantize(theta);
    const exact = this._distortions.get(key);
    if (exact !== undefined) return exact;

    // Find nearest distortions and interpolate
    let lower: number | undefined;
    let upper: number | undefined;

    for (const k of this._distortions.keys()) {
      if (k <= theta && (lower === undefined || k > lower)) lower = k;
      if (k >= theta && (upper === undefined || k < upper)) upper = k;
    }

    if (lower === undefined && upper === undefined) return 0;
    if (lower === undefined) return this._distortions.get(upper!)!;
    if (upper === undefined) return this._distortions.get(lower!)!;
    if (lower === upper) return this._distortions.get(lower)!;

    // Linear interpolation
    const t = (theta - lower) / (upper - lower);
    const vLower = this._distortions.get(lower)!;
    const vUpper = this._distortions.get(upper)!;
    return vLower + t * (vUpper - vLower);
  }

  /** Rotate the entire drill - shifts all θ values */
  rotate(delta: number): void {
    this._rotation += delta;
  }

  /** Get current rotation */
  get rotation(): number { return this._rotation; }

  /**
   * Encode arbitrary data as distortion pattern.
   * Data becomes a wave along the helix.
   */
  encode(data: number[], startTheta: number = 0): void {
    for (let i = 0; i < data.length; i++) {
      this.distort(startTheta + i / this._resolution, data[i]);
    }
  }

  /**
   * Decode distortion pattern back to data.
   * Samples the wave to reconstruct values.
   */
  decode(startTheta: number, length: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < length; i++) {
      result.push(this.sample(startTheta + i / this._resolution));
    }
    return result;
  }

  /** Get storage size - number of distortion points (TINY) */
  get storageSize(): number { return this._distortions.size; }

  /** Get all distortion points for visualization */
  getDistortions(): Array<{ theta: number; amplitude: number }> {
    return Array.from(this._distortions.entries())
      .map(([theta, amplitude]) => ({ theta, amplitude }))
      .sort((a, b) => a.theta - b.theta);
  }
}

/**
 * StaticFlow
 * ----------
 * A directed propagation descriptor across the substrate.
 * Defined by:
 *   - origin: starting point in chart-space coordinates
 *   - direction: normalized vector indicating propagation direction
 *   - magnitude: scalar speed/intensity of propagation
 *
 * StaticFlow is a static descriptor; it does not update itself.
 * It is distinct from the dynamic Flow interface in manifold/flow.ts,
 * which represents a time-evolving world-space transform.
 */
export class StaticFlow {
  readonly origin: VecN;
  readonly direction: VecN;
  readonly magnitude: number;

  constructor(origin: VecN, direction: VecN, magnitude: number) {
    this.origin = origin;
    const len = mag(direction);
    this.direction = len === 0 ? direction.map(() => 0) : scale(direction, 1 / len);
    this.magnitude = magnitude;
  }

  /**
   * project(t)
   * ----------
   * Returns the point reached after propagating for scalar t.
   * This is a geometric projection, not a simulation step.
   */
  project(t: number): VecN {
    return add(this.origin, scale(this.direction, this.magnitude * t));
  }

  /**
   * sample(n)
   * ---------
   * Returns n evenly spaced points along the flow, from t=0 to t=1.
   */
  sample(n: number): VecN[] {
    if (n <= 1) return [this.origin];
    const dt = 1 / (n - 1);
    const result: VecN[] = [];
    for (let i = 0; i < n; i++) {
      result.push(this.project(i * dt));
    }
    return result;
  }
}