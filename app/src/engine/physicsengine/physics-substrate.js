"use strict";
// app/src/engine/physicsengine/physics-substrate.ts
// Manifold-based physics engine substrate
// Produces traditional physics results through dimensional programming
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhysicsSubstrate = void 0;
const base_substrate_1 = require("../../../../core/substrate/base-substrate");
const DEFAULT_CONFIG = {
    name: "physics",
    version: "1.0.0",
    tickRate: 60
};
const DEFAULT_WORLD = {
    gravity: [0, -9.81, 0],
    airResistance: 0.01
};
const DEFAULT_BODY = {
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
class PhysicsSubstrate extends base_substrate_1.SimulationSubstrate {
    constructor(config) {
        const state = {
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
    static create(config) {
        return new PhysicsSubstrate(config);
    }
    /** Add a body at coordinate */
    addBody(id, initial) {
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
    body(id) {
        return this.drill("bodies", id);
    }
    /** Apply force to body */
    applyForce(bodyId, force) {
        const body = this.body(bodyId);
        const mass = body.drill("mass").value || 1;
        const acc = body.drill("acceleration").value || [0, 0, 0];
        // F = ma → a = F/m
        body.drill("acceleration").value = [
            acc[0] + force[0] / mass,
            acc[1] + force[1] / mass,
            acc[2] + force[2] / mass
        ];
    }
    /** Apply impulse (instant velocity change) */
    applyImpulse(bodyId, impulse) {
        const body = this.body(bodyId);
        const mass = body.drill("mass").value || 1;
        const vel = body.drill("velocity").value || [0, 0, 0];
        body.drill("velocity").value = [
            vel[0] + impulse[0] / mass,
            vel[1] + impulse[1] / mass,
            vel[2] + impulse[2] / mass
        ];
    }
    /** Tick - advance physics simulation */
    tick(dt) {
        const gravity = this.drill("world", "gravity").value || [0, -9.81, 0];
        const airRes = this.drill("world", "airResistance").value || 0.01;
        // Get all body IDs (discrete points only)
        const bodyIds = this.drill("bodies").keys();
        // Update each body (direct coordinate access, not iteration over infinite dimension)
        for (const id of bodyIds) {
            this._integrateBody(id, dt, gravity, airRes);
        }
    }
    /** Integrate single body physics */
    _integrateBody(id, dt, gravity, airRes) {
        const body = this.body(id);
        if (body.drill("static").value)
            return;
        const pos = body.drill("position").value || [0, 0, 0];
        const vel = body.drill("velocity").value || [0, 0, 0];
        const acc = body.drill("acceleration").value || [0, 0, 0];
        // Apply gravity
        const totalAcc = [
            acc[0] + gravity[0],
            acc[1] + gravity[1],
            acc[2] + gravity[2]
        ];
        // Velocity verlet integration
        const newVel = [
            vel[0] + totalAcc[0] * dt - vel[0] * airRes,
            vel[1] + totalAcc[1] * dt - vel[1] * airRes,
            vel[2] + totalAcc[2] * dt - vel[2] * airRes
        ];
        const newPos = [
            pos[0] + newVel[0] * dt,
            pos[1] + newVel[1] * dt,
            pos[2] + newVel[2] * dt
        ];
        // Update coordinates (creates new versions)
        body.drill("position").value = newPos;
        body.drill("velocity").value = newVel;
        body.drill("acceleration").value = [0, 0, 0]; // Reset acceleration
    }
    /** Reset to initial state */
    reset() {
        this.drill("bodies").keys().forEach(id => {
            const body = this.body(id);
            body.drill("position").value = [0, 0, 0];
            body.drill("velocity").value = [0, 0, 0];
            body.drill("acceleration").value = [0, 0, 0];
        });
        this.drill("collisions").value = [];
    }
    /** Serialize for persistence */
    serialize() {
        const bodies = {};
        for (const id of this.drill("bodies").keys()) {
            const b = this.body(id);
            bodies[id] = {
                position: b.drill("position").value || [0, 0, 0],
                velocity: b.drill("velocity").value || [0, 0, 0],
                acceleration: b.drill("acceleration").value || [0, 0, 0],
                mass: b.drill("mass").value || 1,
                restitution: b.drill("restitution").value || 0.5,
                friction: b.drill("friction").value || 0.3,
                static: b.drill("static").value || false
            };
        }
        return {
            world: {
                gravity: this.drill("world", "gravity").value || [0, -9.81, 0],
                airResistance: this.drill("world", "airResistance").value || 0.01
            },
            bodies,
            collisions: []
        };
    }
    /** Hydrate from serialized state */
    hydrate(state) {
        this.drill("world", "gravity").value = state.world.gravity;
        this.drill("world", "airResistance").value = state.world.airResistance;
        for (const [id, body] of Object.entries(state.bodies)) {
            this.addBody(id, body);
        }
    }
}
exports.PhysicsSubstrate = PhysicsSubstrate;
