// app/src/engine/physicsengine/physics-substrate.ts
// Manifold-based physics engine substrate
// Produces traditional physics results through dimensional programming

import { SimulationSubstrate, SubstrateConfig } from "../../../../core/substrate/base-substrate";
import { Dimension } from "../../../../core/dimensional/dimension";

/** Vector3 type for physics calculations */
export type Vec3 = [number, number, number];

/** Physics body state */
export interface PhysicsBodyState {
  position: Vec3;
  velocity: Vec3;
  acceleration: Vec3;
  mass: number;
  restitution: number;  // Bounciness 0-1
  friction: number;
  static: boolean;      // Immovable objects
}

/** Physics world configuration */
export interface PhysicsWorldConfig {
  gravity: Vec3;
  airResistance: number;
  bounds?: { min: Vec3; max: Vec3 };
}

/** Physics substrate state shape */
interface PhysicsState {
  world: PhysicsWorldConfig;
  bodies: Record<string, PhysicsBodyState>;
  collisions: Array<{ a: string; b: string; normal: Vec3; depth: number }>;
}

const DEFAULT_CONFIG: SubstrateConfig = {
  name: "physics",
  version: "1.0.0",
  tickRate: 60
};

const DEFAULT_WORLD: PhysicsWorldConfig = {
  gravity: [0, -9.81, 0],
  airResistance: 0.01
};

const DEFAULT_BODY: PhysicsBodyState = {
  position: [0, 0, 0],
  velocity: [0, 0, 0],
  acceleration: [0, 0, 0],
  mass: 1,
  restitution: 0.5,
  friction: 0.3,
  static: false
};

/**
 * PhysicsSubstrate
 * ----------------
 * Manifold-based physics simulation.
 * 
 * Coordinates:
 *   drill("world", "gravity")           → Vec3
 *   drill("bodies", "player", "position") → Vec3
 *   drill("bodies", "player", "velocity") → Vec3
 *   drill("collisions")                 → collision events
 * 
 * All physics bodies are discrete points in the manifold.
 * No iteration over bodies - drill directly to coordinates.
 */
export class PhysicsSubstrate extends SimulationSubstrate<PhysicsState> {
  
  constructor(config?: Partial<SubstrateConfig>) {
    const state: PhysicsState = {
      world: { ...DEFAULT_WORLD },
      bodies: {},
      collisions: []
    };
    super({ ...DEFAULT_CONFIG, ...config }, state);
    
    // Initialize world coordinates
    this.drill("world", "gravity").value = [...DEFAULT_WORLD.gravity];
    this.drill("world", "airResistance").value = DEFAULT_WORLD.airResistance;
  }

  /** Create physics substrate */
  static create(config?: Partial<SubstrateConfig>): PhysicsSubstrate {
    return new PhysicsSubstrate(config);
  }

  /** Add a body at coordinate */
  addBody(id: string, initial?: Partial<PhysicsBodyState>): Dimension {
    const body = { ...DEFAULT_BODY, ...initial };
    const dim = this.drill("bodies", id);
    
    // Set each property as a discrete coordinate
    dim.drill("position").value = [...body.position];
    dim.drill("velocity").value = [...body.velocity];
    dim.drill("acceleration").value = [...body.acceleration];
    dim.drill("mass").value = body.mass;
    dim.drill("restitution").value = body.restitution;
    dim.drill("friction").value = body.friction;
    dim.drill("static").value = body.static;
    
    return dim;
  }

  /** Get body by ID - O(1) */
  body(id: string): Dimension {
    return this.drill("bodies", id);
  }

  /** Apply force to body */
  applyForce(bodyId: string, force: Vec3): void {
    const body = this.body(bodyId);
    const mass = body.drill<number>("mass").value || 1;
    const acc = body.drill<Vec3>("acceleration").value || [0, 0, 0];
    
    // F = ma → a = F/m
    body.drill("acceleration").value = [
      acc[0] + force[0] / mass,
      acc[1] + force[1] / mass,
      acc[2] + force[2] / mass
    ];
  }

  /** Apply impulse (instant velocity change) */
  applyImpulse(bodyId: string, impulse: Vec3): void {
    const body = this.body(bodyId);
    const mass = body.drill<number>("mass").value || 1;
    const vel = body.drill<Vec3>("velocity").value || [0, 0, 0];
    
    body.drill("velocity").value = [
      vel[0] + impulse[0] / mass,
      vel[1] + impulse[1] / mass,
      vel[2] + impulse[2] / mass
    ];
  }

  /** Tick - advance physics simulation */
  tick(dt: number): void {
    const gravity = this.drill<Vec3>("world", "gravity").value || [0, -9.81, 0];
    const airRes = this.drill<number>("world", "airResistance").value || 0.01;
    
    // Get all body IDs (discrete points only)
    const bodyIds = this.drill("bodies").keys();
    
    // Update each body (direct coordinate access, not iteration over infinite dimension)
    for (const id of bodyIds) {
      this._integrateBody(id, dt, gravity, airRes);
    }
  }

  /** Integrate single body physics */
  private _integrateBody(id: string, dt: number, gravity: Vec3, airRes: number): void {
    const body = this.body(id);
    
    if (body.drill<boolean>("static").value) return;
    
    const pos = body.drill<Vec3>("position").value || [0, 0, 0];
    const vel = body.drill<Vec3>("velocity").value || [0, 0, 0];
    const acc = body.drill<Vec3>("acceleration").value || [0, 0, 0];
    
    // Apply gravity
    const totalAcc: Vec3 = [
      acc[0] + gravity[0],
      acc[1] + gravity[1],
      acc[2] + gravity[2]
    ];

    // Velocity verlet integration
    const newVel: Vec3 = [
      vel[0] + totalAcc[0] * dt - vel[0] * airRes,
      vel[1] + totalAcc[1] * dt - vel[1] * airRes,
      vel[2] + totalAcc[2] * dt - vel[2] * airRes
    ];

    const newPos: Vec3 = [
      pos[0] + newVel[0] * dt,
      pos[1] + newVel[1] * dt,
      pos[2] + newVel[2] * dt
    ];

    // Update coordinates (creates new versions)
    body.drill("position").value = newPos;
    body.drill("velocity").value = newVel;
    body.drill("acceleration").value = [0, 0, 0];  // Reset acceleration
  }

  /** Reset to initial state */
  reset(): void {
    this.drill("bodies").keys().forEach(id => {
      const body = this.body(id);
      body.drill("position").value = [0, 0, 0];
      body.drill("velocity").value = [0, 0, 0];
      body.drill("acceleration").value = [0, 0, 0];
    });
    this.drill("collisions").value = [];
  }

  /** Serialize for persistence */
  serialize(): PhysicsState {
    const bodies: Record<string, PhysicsBodyState> = {};

    for (const id of this.drill("bodies").keys()) {
      const b = this.body(id);
      bodies[id] = {
        position: b.drill<Vec3>("position").value || [0, 0, 0],
        velocity: b.drill<Vec3>("velocity").value || [0, 0, 0],
        acceleration: b.drill<Vec3>("acceleration").value || [0, 0, 0],
        mass: b.drill<number>("mass").value || 1,
        restitution: b.drill<number>("restitution").value || 0.5,
        friction: b.drill<number>("friction").value || 0.3,
        static: b.drill<boolean>("static").value || false
      };
    }

    return {
      world: {
        gravity: this.drill<Vec3>("world", "gravity").value || [0, -9.81, 0],
        airResistance: this.drill<number>("world", "airResistance").value || 0.01
      },
      bodies,
      collisions: []
    };
  }

  /** Hydrate from serialized state */
  hydrate(state: PhysicsState): void {
    this.drill("world", "gravity").value = state.world.gravity;
    this.drill("world", "airResistance").value = state.world.airResistance;

    for (const [id, body] of Object.entries(state.bodies)) {
      this.addBody(id, body);
    }
  }
}

