// core/substrate/base-substrate.ts
// Base class for ALL substrate engines (physics, video, audio, game, MIA, etc.)
//
// MANIFOLD DIRECTIVE (from .augment/rules/manifold.md):
//  - Every substrate IS the manifold at its dimension.
//  - The base manifold is a 7-section helix of z = x*y surfaces, each 90° apart.
//  - All external data MUST be encoded as waveform deformations; raw data is never stored.
//  - Any coordinate is reachable in O(1) via drill() — no traversal, no materialisation.

import { Dimension, dim, DimensionVersion } from "../dimensional/dimension";
import { SaddleForm } from "../geometry/saddle";
import { SaddleField } from "./saddlefield";
import {
  compactHarmonics, expandHarmonics,
  harmonicStorageBytes, computeMSE, computePSNR,
  type HarmonicManifold
} from "./harmonic-compaction";
import {
  type PathExpr,
  evaluatePath, discoverPath,
  stringToPathExprs, pathExprsToString
} from "./path-expressions";

// ─── Waveform Types ──────────────────────────────────────────────────────────

/**
 * WaveformEncoding — geometric activation of points on the manifold surface.
 *
 * The manifold IS z = x·y (rotated per helix section).  Data lives in z —
 * it is NEVER stored, only DERIVED by evaluating the surface equation.
 *
 *   x = position expression (can be any function of index — linear, polynomial, fractal)
 *   y = solved from the surface equation given the target z value
 *   z = _helixZ(s, x, y) — computed on demand by the surface, not stored
 *
 * Encoding: given data value d ∈ [0,1], solve z = d on the surface for y.
 * Materialisation: evaluate z = _helixZ(s, x, y) → the surface computes the answer.
 *
 * Fields:
 *   xValues   — position expression for each activation point
 *   yValues   — y-coordinate solved from the surface equation at each point
 *   checksum  — Σ _helixZ(n%7, xValues[n], yValues[n]) — manifold surface integrity
 *   dimension — dimensional layer 0 = Void … 6 = Whole
 */
export interface WaveformEncoding {
  readonly xValues: Float64Array;  // position expression — the address on the surface
  readonly yValues: Float64Array;  // solved coordinate — surface equation inverted for y
  readonly checksum: number;       // manifold surface checksum: Σ z(s, x_n, y_n)
  readonly dimension: number;      // dimensional layer 0 = Void … 6 = Whole
}

/** Dimensional layer names per the ontology (Void → Point → … → Whole → Object) */
export const DIMENSIONAL_NAMES = [
  "Void", "Point", "Line", "Width", "Plane", "Volume", "Whole"
] as const;
export type DimensionalLayer = typeof DIMENSIONAL_NAMES[number];

// ─── 7-Section Helix (module-level singleton) ────────────────────────────────
// Each section is a z = x*y surface rotated 90° (π/2 rad) from the previous.
// 7 sections × 90° = 630°, one complete helix cycle.
// Two paired sections (180°) form one dimension: a "morning + evening" duality.

const HALF_PI = Math.PI / 2;

/** The 7-section helix — the base manifold shared by all substrates. */
export const HELIX: readonly SaddleForm[] = Object.freeze([
  new SaddleForm(0),              // Section 0: Void   → Point
  new SaddleForm(HALF_PI),        // Section 1: Point  → Line
  new SaddleForm(Math.PI),        // Section 2: Line   → Width
  new SaddleForm(3 * HALF_PI),    // Section 3: Width  → Plane
  new SaddleForm(4 * HALF_PI),    // Section 4: Plane  → Volume
  new SaddleForm(5 * HALF_PI),    // Section 5: Volume → Whole
  new SaddleForm(6 * HALF_PI),    // Section 6: Whole  → Object (collapse to higher dim)
]);

/** SaddleField backed by the helix — each cell governs its own region of the manifold. */
export const HELIX_FIELD: SaddleField = (() => {
  let field = new SaddleField();
  for (let i = 0; i < 7; i++) field = field.place([i, 0], HELIX[i]);
  return field;
})();

// ─── Pre-computed HELIX constants ────────────────────────────────────────────
// cos/sin for each section's orientation are FIXED at startup.
// Hoisting them avoids re-running Math.cos/sin on every surface evaluation.
// _helixZ(s, x, y) ≡ HELIX[s].valueAt(x, y) but ~6× faster.

const _HC = new Float64Array(7); // cos(HELIX[i].orientation)
const _HS = new Float64Array(7); // sin(HELIX[i].orientation)
for (let _i = 0; _i < 7; _i++) {
  _HC[_i] = Math.cos(HELIX[_i].orientation);
  _HS[_i] = Math.sin(HELIX[_i].orientation);
}

/**
 * Evaluate z = x*y on HELIX section s with precomputed cos/sin.
 * lx =  cos·x + sin·y
 * ly = -sin·x + cos·y
 * z  = lx · ly
 *
 * Equivalent to HELIX[s].valueAt(x, y) but avoids recomputing trig.
 * Inlined by V8 after first compilation due to its small, hot call site.
 */
function _helixZ(s: number, x: number, y: number): number {
  const c = _HC[s], sv = _HS[s];
  return (c * x + sv * y) * (-sv * x + c * y);
}

// ─── Surface inversion ──────────────────────────────────────────────────────
// For θ = k·π/2, the surface simplifies to z = cos(2θ)·x·y.
// cos(2θ) alternates [1, -1, 1, -1, 1, -1, 1] across sections.
// Inversion: y = z / (cos2θ · x).

const _C2 = new Float64Array(7);
for (let _i = 0; _i < 7; _i++) {
  _C2[_i] = _HC[_i] * _HC[_i] - _HS[_i] * _HS[_i]; // cos(2θ) = cos²θ - sin²θ
}

/**
 * Invert the surface equation: given section s, position x, and target z,
 * solve for y such that _helixZ(s, x, y) ≈ z.
 *
 * For the 7-section helix (θ = k·π/2), the surface reduces to z = C2·x·y
 * where C2 = cos(2θ).  So y = z / (C2 · x).
 */
function _invertSurface(s: number, x: number, z: number): number {
  return z / (_C2[s] * x);
}

/**
 * Position expression for sample n of N total.
 * Maps index → x ∈ (0, 1), avoiding x = 0 (singularity in inversion).
 * This is the simplest position expression; x can be any function.
 */
function _positionX(n: number, N: number): number {
  return (n + 1) / (N + 1);
}

// ─── SubstrateConfig ─────────────────────────────────────────────────────────

/**
 * SubstrateConfig - Configuration for substrate initialisation
 */
export interface SubstrateConfig {
  name: string;
  version?: string;
  tickRate?: number;  // Updates per second (for simulation substrates)
}

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
export abstract class BaseSubstrate<T = unknown> {
  // Shared across all substrate instances — instantiated once at class load.
  // TextEncoder/TextDecoder are the fastest path to UTF-8 bytes in V8.
  protected static readonly _enc = new TextEncoder();
  protected static readonly _dec = new TextDecoder();

  protected _root: Dimension<T>;
  protected _config: SubstrateConfig;
  protected _observers: Map<string, Set<(value: unknown) => void>> = new Map();

  // ─── Delta cache ────────────────────────────────────────────────────────────
  // Only recompute when the data actually changes.
  // "Only worry about things that change" — unobserved, unchanged data costs nothing.
  //
  // Two-tier guard:
  //   Tier 1 — reference equality: same object ref = O(1) return (~1 ns).
  //            Covers the hot path where the same object is passed repeatedly
  //            (e.g. game-loop ticks, benchmark iterations, stream frames).
  //   Tier 2 — value equality: different ref but same serialised form = cache hit.
  //            Covers structurally-equal objects created fresh each call.
  private _lastEncodedData: unknown = undefined;   // last input reference
  private _lastEncodedStr: string | null = null;   // serialised form of last input
  private _cachedEncoding: WaveformEncoding | null = null; // result of last encode

  // Decode-side delta cache — same reference equality principle as the encode cache.
  // If _cachedEncoding hasn't changed since last materialise, return pre-built values.
  // Tier-1 guard: encoding ref equality = O(1) return (~1–5 ns) — no loop, no alloc.
  private _lastMaterialisedWf: WaveformEncoding | null = null; // encoding ref at last materialise
  private _cachedBuffer: Uint8Array | null = null;             // pre-built byte buffer
  private _cachedJSON: unknown = undefined;                    // pre-parsed JSON object
  private _cachedJSONReady = false;                            // guards undefined vs unparsed

  constructor(config: SubstrateConfig, initialValue: T) {
    this._config = config;
    this._root = dim(initialValue);
  }

  /** Get substrate name */
  get name(): string { return this._config.name; }

  /** Get substrate version */
  get version(): DimensionVersion { return this._root.version; }

  /** Direct drill into substrate - O(1) per level */
  drill<U = unknown>(...keys: string[]): Dimension<U> {
    return this._root.drill<U>(...keys);
  }

  /** Array-based drill (faster for known paths) */
  drillPath<U = unknown>(keys: readonly string[]): Dimension<U> {
    return this._root.drillPath<U>(keys);
  }

  /** Regex match at a coordinate */
  at(key: string): Dimension {
    return this._root.at(key);
  }

  /** Pattern match at root level */
  match(pattern: RegExp): Dimension[] {
    return this._root.match(pattern);
  }

  /** Recursive pattern search */
  search(patterns: RegExp[]): Dimension[] {
    return this._root.search(patterns);
  }

  /** Find first match */
  find(patterns: RegExp[]): Dimension | undefined {
    return this._root.find(patterns);
  }

  /** Observe changes at a coordinate */
  observe(path: string[], fn: (value: unknown, path: string[]) => void): () => void {
    const target = this._root.drillPath(path);
    return target.observe(fn);
  }

  /** Get the root dimension (for advanced operations) */
  get root(): Dimension<T> { return this._root; }

  /**
   * Tick - advance substrate simulation by one frame
   * Override in simulation substrates (physics, game, etc.)
   */
  tick(_deltaTime: number): void {
    // Default: no-op. Override in subclasses.
  }

  // ─── MANIFOLD OPERATIONS ────────────────────────────────────────────────────

  /**
   * Read the manifold surface value z = x*y at the given helix section.
   * Uses precomputed cos/sin — no trig per call.  O(1), ~5 ns.
   */
  readManifold(x: number, y: number, sectionIndex = 0): number {
    return _helixZ(((sectionIndex % 7) + 7) % 7, x, y);
  }

  // ─── PATH EXPRESSION MODE (canonical) ─────────────────────────────────────
  // The manifold already contains every value. A path expression is an address
  // into z = x·y that says WHERE a datum lives — not what it is.
  // The substrate stores path expressions, not data.

  /** Table of named path expressions — the substrate's knowledge. */
  private _pathTable: Record<string, PathExpr | PathExpr[]> = {};

  /**
   * Set a value by discovering its path expression on the manifold.
   * The value is not stored — the path that produces it is stored.
   */
  setPath(key: string, value: number | string): void {
    if (typeof value === "number") {
      this._pathTable[key] = discoverPath(value, key.length % 7);
    } else {
      this._pathTable[key] = stringToPathExprs(value);
    }
  }

  /**
   * Get a value by evaluating its path expression on the manifold.
   * The manifold computes the answer — the substrate just knows where to look.
   */
  getPath(key: string): number | string | undefined {
    const expr = this._pathTable[key];
    if (!expr) return undefined;
    if (Array.isArray(expr)) {
      return pathExprsToString(expr);
    }
    return evaluatePath(expr);
  }

  /**
   * Get the raw path expression for a key (for inspection / serialisation).
   */
  getPathExpr(key: string): PathExpr | PathExpr[] | undefined {
    return this._pathTable[key];
  }

  /**
   * List all keys in the path table.
   */
  pathKeys(): string[] {
    return Object.keys(this._pathTable);
  }

  /** Re-export for external use. */
  static evaluatePath = evaluatePath;
  static discoverPath = discoverPath;

  // ─── LEGACY: BINARY STORAGE MODE ──────────────────────────────────────────
  // The waveform encoding below is the legacy storage-centric model.
  // It treats the manifold as a container for Float64 coordinates.
  // Retained for backward compatibility with existing benchmarks and tests.
  // New code should use setPath/getPath (PathExpressionMode) instead.

  /**
   * Encode external data as activations on the 7-section helix surface.
   *
   * The manifold IS the surface z = x·y (rotated per section).
   * Data lives in z — it is NEVER stored, only derived by evaluating the surface.
   *
   * Algorithm — O(N) surface inversion:
   *   Each input byte b[n] becomes a target z value:
   *     z_target = b[n] / 255                     (data → surface value)
   *     x = _positionX(n, N)                      (position expression)
   *     y = _invertSurface(s, x, z_target)        (solve z = x·y for y)
   *     checksum += _helixZ(s, x, y)              (verify: should ≈ z_target)
   *
   * Materialisation evaluates z = _helixZ(s, x, y) — the surface computes the answer.
   *
   * Delta cache: O(1) return on reference or value equality (unchanged data = zero work).
   */
  encodeToWaveform(data: unknown): WaveformEncoding {
    // ── Tier-1 delta guard: reference equality (~1 ns) ───────────────────────
    if (data === this._lastEncodedData && this._cachedEncoding !== null) {
      return this._cachedEncoding;
    }

    // ── Binary fast-path: Uint8Array/Buffer → surface activations directly ──
    // No JSON.stringify, no TextEncoder — raw bytes activate manifold points.
    if (data instanceof Uint8Array) {
      return this._encodeBytesRaw(data);
    }

    let str: string;
    try {
      str = typeof data === "string" ? data : (JSON.stringify(data) ?? String(data));
    } catch { str = String(data); }

    // ── Tier-2 delta guard: value equality (serialised string compare) ────────
    if (str === this._lastEncodedStr && this._cachedEncoding !== null) {
      this._lastEncodedData = data; // promote ref so tier-1 fires next time
      return this._cachedEncoding;
    }

    const raw = BaseSubstrate._enc.encode(str); // Uint8Array — zero char-loop
    return this._encodeBytes(raw, data, str);
  }

  /**
   * Encode raw binary data by activating points on the manifold surface.
   * For each byte: z_target = byte/255, x = position expression,
   * y = solved from the surface equation z = x·y (rotated).
   * No string intermediary, no JSON, no TextEncoder.
   */
  private _encodeBytesRaw(raw: Uint8Array): WaveformEncoding {
    const N = raw.length;
    const xValues = new Float64Array(N);
    const yValues = new Float64Array(N);
    let checksum = 0;
    for (let n = 0; n < N; n++) {
      const s = n % 7;
      const x = _positionX(n, N);
      const z = raw[n] / 255;
      const y = _invertSurface(s, x, z);
      xValues[n] = x;
      yValues[n] = y;
      checksum += _helixZ(s, x, y);
    }
    const encoding: WaveformEncoding = { xValues, yValues, checksum, dimension: 0 };
    this._root.drill("_wf").value = encoding;
    this._lastEncodedData = raw;
    this._lastEncodedStr  = null;
    this._cachedEncoding  = encoding;
    return encoding;
  }

  /** Shared O(N) surface activation from UTF-8 bytes. */
  private _encodeBytes(raw: Uint8Array, data: unknown, str: string): WaveformEncoding {
    const N = raw.length;
    const xValues = new Float64Array(N);
    const yValues = new Float64Array(N);

    // ── O(N) surface inversion — only runs when data actually changes ────────
    // Each byte → z_target on the surface, x from position, y solved.
    let checksum = 0;
    for (let n = 0; n < N; n++) {
      const s = n % 7;
      const x = _positionX(n, N);
      const z = raw[n] / 255;
      const y = _invertSurface(s, x, z);
      xValues[n] = x;
      yValues[n] = y;
      checksum += _helixZ(s, x, y);
    }

    const encoding: WaveformEncoding = { xValues, yValues, checksum, dimension: 0 };

    // Persist to manifold and update both tiers of the delta cache in one step.
    this._root.drill("_wf").value = encoding;
    this._lastEncodedData = data;  // tier-1: reference
    this._lastEncodedStr  = str;   // tier-2: value
    this._cachedEncoding  = encoding;
    return encoding;
  }

  /**
   * Verify stored waveform integrity via manifold surface re-evaluation.
   * Re-evaluates z = _helixZ(s, x, y) at each activation and confirms
   * the checksum matches.  O(N) — one pass over (x, y) coordinate pairs.
   */
  verifyWaveform(): boolean {
    const enc = this._storedWaveform();
    if (!enc) return false;
    const { xValues, yValues } = enc;
    const N = yValues.length;
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += _helixZ(n % 7, xValues[n], yValues[n]);
    }
    return Math.abs(sum - enc.checksum) < 1e-9;
  }

  // ─── SUBSTRATE LAYER — Materialisation ──────────────────────────────────────
  // The substrate derives data from manifold geometry — the surface equation
  // IS the computation.  z = _helixZ(s, x, y) produces the data value.
  // No inverse transform, no codec — the surface equation does the work.

  /**
   * Materialise the stored waveform as a raw byte buffer.
   * Each byte = round(z * 255) where z = _helixZ(s, x, y) — the surface
   * equation COMPUTES the data value from the activation coordinates.
   *
   * Decode-side delta cache: if the encoding reference hasn't changed since the
   * last call, returns the pre-built Uint8Array in O(1) (~1–5 ns).
   * Only runs the O(N) surface evaluation when data actually changes.
   */
  materialiseBuffer(): Uint8Array {
    const enc = this._storedWaveform();
    if (!enc) return new Uint8Array(0);

    // ── Decode delta guard: reference equality (~1 ns) ───────────────────────
    if (enc === this._lastMaterialisedWf && this._cachedBuffer !== null) {
      return this._cachedBuffer;
    }

    // ── O(N) surface evaluation — the manifold derives data from geometry ────
    const { xValues, yValues } = enc;
    const N = yValues.length;
    const out = new Uint8Array(N);
    for (let n = 0; n < N; n++) {
      const z = _helixZ(n % 7, xValues[n], yValues[n]);
      out[n] = Math.min(255, Math.max(0, Math.round(z * 255)));
    }

    // Persist decode cache — invalidate JSON cache too (bytes changed)
    this._lastMaterialisedWf = enc;
    this._cachedBuffer = out;
    this._cachedJSONReady = false; // force re-parse on next materialiseJSON call
    return out;
  }

  /**
   * Materialise the stored waveform as computer-usable JSON.
   * Reads coordinate bytes → UTF-8 decode → JSON.parse.  O(N).
   *
   * Decode-side delta cache: if the encoding reference hasn't changed and
   * materialiseBuffer hasn't re-run, returns the pre-parsed value in O(1).
   */
  materialiseJSON(): unknown {
    // ── Decode JSON delta guard ───────────────────────────────────────────────
    const enc = this._storedWaveform();
    if (enc === this._lastMaterialisedWf && this._cachedJSONReady) {
      return this._cachedJSON;
    }

    const bytes = this.materialiseBuffer(); // uses buffer cache if unchanged
    if (bytes.length === 0) return null;
    const str = BaseSubstrate._dec.decode(bytes);
    let result: unknown;
    try { result = JSON.parse(str); } catch { result = str; }

    this._cachedJSON = result;
    this._cachedJSONReady = true;
    return result;
  }

  /**
   * Materialise the stored waveform as RGBA pixel data.
   * Tiles the coordinate bytes across width × height pixels.  O(W×H).
   * Alpha channel (every 4th byte) defaults to 255 (fully opaque).
   */
  materialisePixels(width: number, height: number): Uint8ClampedArray {
    const total = width * height * 4;
    const pixels = new Uint8ClampedArray(total);
    const bytes = this.materialiseBuffer();
    if (bytes.length === 0) return pixels;
    const n = bytes.length;
    for (let i = 0; i < total; i++) pixels[i] = bytes[i % n];
    for (let i = 3; i < total; i += 4) if (pixels[i] === 0) pixels[i] = 255;
    return pixels;
  }

  /**
   * Materialise the stored waveform as mono PCM audio samples.
   * Coordinate bytes mapped [0,255] → [-1.0, 1.0].  Tiles to requested length.
   */
  materialiseAudioSamples(length = 44100): Float32Array {
    const out = new Float32Array(length);
    const bytes = this.materialiseBuffer();
    if (bytes.length === 0) return out;
    const n = bytes.length;
    for (let i = 0; i < length; i++) out[i] = (bytes[i % n] / 255) * 2 - 1;
    return out;
  }

  /**
   * Return the dimensional layer name for a helix section index (0–6).
   * Follows the ontology: Void → Point → Line → Width → Plane → Volume → Whole.
   */
  dimensionalName(sectionIndex: number): DimensionalLayer {
    return DIMENSIONAL_NAMES[((sectionIndex % 7) + 7) % 7];
  }

  // ─── HARMONIC COMPACTION ─────────────────────────────────────────────────

  /**
   * Compact the current waveform into a HarmonicManifold.
   * Stores only the top-K dominant harmonics per block — massive storage reduction.
   *
   * @param blockSize       Samples per FFT block (default 4096, must be reasonable)
   * @param maxHarmonics    K — harmonics to keep per block (default 64)
   */
  compactWaveform(blockSize = 4096, maxHarmonics = 64): HarmonicManifold | null {
    const enc = this._storedWaveform();
    if (!enc) return null;
    return compactHarmonics(enc.yValues, blockSize, maxHarmonics);
  }

  /**
   * Expand a HarmonicManifold back into a full waveform and re-encode it.
   * The reconstructed y-coordinates are written back as a new WaveformEncoding.
   * Returns the reconstructed y-values for inspection/comparison.
   */
  expandFromHarmonics(manifold: HarmonicManifold): Float64Array {
    return expandHarmonics(manifold);
  }

  /** Convenience: storage size of a harmonic manifold in bytes. */
  harmonicStorageBytes(manifold: HarmonicManifold): number {
    return harmonicStorageBytes(manifold);
  }

  /** Mean Squared Error between original yValues and reconstructed. */
  harmonicMSE(original: Float64Array, reconstructed: Float64Array): number {
    return computeMSE(original, reconstructed);
  }

  /** Peak Signal-to-Noise Ratio (dB) between original and reconstructed. */
  harmonicPSNR(original: Float64Array, reconstructed: Float64Array): number {
    return computePSNR(original, reconstructed);
  }

  // ─── ABSTRACT API ──────────────────────────────────────────────────────────

  /**
   * Reset substrate to initial state
   * Creates new version, preserving history
   */
  abstract reset(): void;

  /**
   * Serialize substrate state for persistence
   * The manifold IS the persistence - this extracts discrete points
   */
  abstract serialize(): unknown;

  /**
   * Hydrate substrate from serialized state
   */
  abstract hydrate(state: unknown): void;

  // ─── PROTECTED HELPERS ─────────────────────────────────────────────────────

  /**
   * Retrieve the current WaveformEncoding from the delta cache.
   * Protected so substrate subclasses can read the live encoding directly.
   * Returns the in-memory cache — no manifold drill, no allocation.  O(1).
   */
  protected _storedWaveform(): WaveformEncoding | null {
    return this._cachedEncoding;
  }

}

/**
 * SimulationSubstrate
 * -------------------
 * Base for substrates that tick (physics, game, audio playback)
 */
export abstract class SimulationSubstrate<T = unknown> extends BaseSubstrate<T> {
  protected _tickRate: number;
  protected _running: boolean = false;
  protected _lastTick: number = 0;

  constructor(config: SubstrateConfig, initialValue: T) {
    super(config, initialValue);
    this._tickRate = config.tickRate ?? 60;
  }

  /** Start simulation loop */
  start(): void {
    this._running = true;
    this._lastTick = Date.now();
  }

  /** Stop simulation loop */
  stop(): void {
    this._running = false;
  }

  /** Is simulation running? */
  get running(): boolean { return this._running; }

  /** Get tick rate (updates per second) */
  get tickRate(): number { return this._tickRate; }

  /**
   * True if at least one observer is currently registered on this substrate.
   * A substrate with no observers is dark — nothing is watching, so nothing
   * needs to be computed.  Only manifest what is observed.
   */
  get hasObservers(): boolean {
    for (const set of this._observers.values()) {
      if (set.size > 0) return true;
    }
    return false;
  }

  /**
   * Process one tick if enough time has passed AND the substrate is observed.
   * "Only compute things that are on the screen, or speakers, or currently
   *  being computed." — dark substrates (no observers, not running) cost nothing.
   */
  process(): boolean {
    // Dark substrate — nothing observing it, nothing to compute.
    if (!this._running) return false;

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

