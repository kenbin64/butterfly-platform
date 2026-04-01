// core/engine/physics-engine.ts
// ================================================================
//  PHYSICS ENGINE — 3D Volume
// ================================================================
//
// Operates on IVolumeSubstrate. Bodies are planes in the volume.
// Gravity, velocity integration, collision detection via z-invocation
// on the volume's finite set of planes.
//
// Loose coupling: receives substrate via constructor. No cross-engine deps.

import {
  type IEngine, type EngineStats,
  EngineState,
} from "./engine-interface";

import {
  type IVolumeSubstrate,
  type ILinearSubstrate,
} from "../substrate/substrate-interface";

import {
  VolumeSubstrate,
  LinearSubstrate,
  PlanarSubstrate,
  PointSubstrate,
} from "../substrate/dimensional-substrate";

// ─── Physics Config ─────────────────────────────────────────────────────────

export interface PhysicsConfig {
  gravity: number;        // m/s² downward (default 9.81)
  airResistance: number;  // damping factor (default 0.01)
  boundsWidth: number;    // world bounds X
  boundsHeight: number;   // world bounds Y
  boundsDepth: number;    // world bounds Z
}

const DEFAULT_CONFIG: PhysicsConfig = {
  gravity: 9.81,
  airResistance: 0.01,
  boundsWidth: 1000,
  boundsHeight: 1000,
  boundsDepth: 1000,
};

// ─── Body representation ────────────────────────────────────────────────────
// Each body is a plane in the volume:
//   Row 0: [px, py, pz]       — position
//   Row 1: [vx, vy, vz]       — velocity
//   Row 2: [mass, radius, 0]  — properties

export class PhysicsEngine implements IEngine {
  readonly name = "physics";
  private _state: EngineState = EngineState.Idle;
  private _config: PhysicsConfig;
  private _volume: VolumeSubstrate;
  private _tickCount = 0;
  private _totalTime = 0;
  private _lastTickDuration = 0;

  // Config as points on the manifold
  private _gravityPoint: PointSubstrate;
  private _airResPoint: PointSubstrate;

  constructor(volume?: VolumeSubstrate, config?: Partial<PhysicsConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._volume = volume ?? new VolumeSubstrate("physics-world");
    this._gravityPoint = new PointSubstrate("gravity", this._config.gravity);
    this._airResPoint = new PointSubstrate("airResistance", this._config.airResistance);
  }

  get state(): EngineState { return this._state; }

  /** The physics volume (3D space). */
  get volume(): VolumeSubstrate { return this._volume; }

  /** Gravity as a manifold point. */
  get gravity(): number { return this._gravityPoint.value; }
  set gravity(g: number) { this._gravityPoint.setPath("value", g); }

  /** Number of bodies (planes in the volume). */
  get bodyCount(): number { return this._volume.planes.length; }

  /**
   * Add a body to the physics world.
   * Returns the plane index (body ID).
   */
  addBody(px: number, py: number, pz: number,
          vx = 0, vy = 0, vz = 0,
          mass = 1, radius = 1): number {
    this._volume.addPlane([
      [px, py, pz],       // row 0: position
      [vx, vy, vz],       // row 1: velocity
      [mass, radius, 0],  // row 2: properties
    ]);
    return this._volume.planes.length - 1;
  }

  /** Read body position by index. */
  getPosition(bodyIdx: number): [number, number, number] {
    const v = this._volume;
    return [
      v.evaluateAt(bodyIdx, 0, 0),
      v.evaluateAt(bodyIdx, 0, 1),
      v.evaluateAt(bodyIdx, 0, 2),
    ];
  }

  /** Read body velocity by index. */
  getVelocity(bodyIdx: number): [number, number, number] {
    const v = this._volume;
    return [
      v.evaluateAt(bodyIdx, 1, 0),
      v.evaluateAt(bodyIdx, 1, 1),
      v.evaluateAt(bodyIdx, 1, 2),
    ];
  }

  /**
   * Tick — advance physics simulation by dt seconds.
   *
   * Iterates the finite set of planes (bodies) — not a dimension.
   * For each body: integrate velocity, apply gravity, update position.
   * All reads via z-invocation on the volume.
   */
  tick(dt: number): void {
    if (this._state !== EngineState.Running) return;
    const t0 = performance.now();
    const g = this._gravityPoint.value;
    const airRes = this._airResPoint.value;

    // Rebuild volume with updated physics.
    // Loop over finite set of planes (bodies).
    const newPlanes: number[][][] = [];
    for (let i = 0; i < this._volume.planes.length; i++) {
      const plane = this._volume.planes[i];
      // Read current state via z-invocation
      const px = plane.evaluateAt(0, 0);
      const py = plane.evaluateAt(0, 1);
      const pz = plane.evaluateAt(0, 2);
      let vx = plane.evaluateAt(1, 0);
      let vy = plane.evaluateAt(1, 1);
      let vz = plane.evaluateAt(1, 2);
      const mass = plane.evaluateAt(2, 0);
      const radius = plane.evaluateAt(2, 1);

      // Apply gravity (downward on Y axis)
      vy -= g * dt;
      // Apply air resistance
      vx *= (1 - airRes * dt);
      vy *= (1 - airRes * dt);
      vz *= (1 - airRes * dt);

      // Integrate position
      const nx = px + vx * dt;
      const ny = py + vy * dt;
      const nz = pz + vz * dt;

      newPlanes.push([
        [nx, ny, nz],
        [vx, vy, vz],
        [mass, radius, 0],
      ]);
    }

    // Replace volume content
    this._volume.reset();
    for (const p of newPlanes) this._volume.addPlane(p);

    this._lastTickDuration = performance.now() - t0;
    this._tickCount++;
    this._totalTime += dt;
  }

  start(): void { this._state = EngineState.Running; }
  stop(): void { this._state = EngineState.Stopped; }
  pause(): void { this._state = EngineState.Paused; }
  resume(): void { this._state = EngineState.Running; }

  reset(): void {
    this._state = EngineState.Idle;
    this._volume.reset();
    this._tickCount = 0;
    this._totalTime = 0;
    this._lastTickDuration = 0;
  }

  serialize(): unknown {
    return {
      config: { ...this._config },
      volume: this._volume.serialize(),
      tickCount: this._tickCount,
      totalTime: this._totalTime,
    };
  }

  hydrate(state: any): void {
    if (state.config) this._config = { ...DEFAULT_CONFIG, ...state.config };
    if (state.volume) this._volume.hydrate(state.volume);
    this._tickCount = state.tickCount ?? 0;
    this._totalTime = state.totalTime ?? 0;
  }

  getStats(): EngineStats {
    return {
      name: this.name,
      state: this._state,
      tickCount: this._tickCount,
      totalTime: this._totalTime,
      lastTickDuration: this._lastTickDuration,
    };
  }
}

