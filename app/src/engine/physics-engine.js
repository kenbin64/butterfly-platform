"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhysicsEngine = void 0;
const entity_store_1 = require("../../../core/substrate/entity-store");
const dimensional_1 = require("../../../core/dimensional");
// Physics engine using manifold-based calculations
class PhysicsEngine {
    constructor() {
        this.gravity = 9.81;
        this.isRunning = false;
        this.tickInterval = null;
        this.initializeStore();
        this.initializeDimensionalState();
    }
    initializeStore() {
        // Create physics entity store
        this.physicsStore = new entity_store_1.EntityStore("physics");
        // Manifold-based physics properties
        this.physicsStore.set("gravity", { x: 0, y: this.gravity });
    }
    initializeDimensionalState() {
        this.dimensionalState = (0, dimensional_1.dimFrom)({});
        this.dimensionalState.drill("physics", "status").value = "initialized";
        this.dimensionalState.drill("physics", "bodyCount").value = 0;
    }
    addBody(id, properties) {
        // Manifold-based body creation
        const velocity = properties.isStatic
            ? { x: 0, y: 0 }
            : properties.velocity || { x: properties.vx || 0, y: properties.vy || 0 };
        this.physicsStore.set(id, {
            ...properties,
            id,
            velocity,
            acceleration: properties.acceleration || { x: 0, y: 0 },
            mass: properties.mass || 1,
            isStatic: properties.isStatic || false
        });
        // Update dimensional state
        const currentCount = this.dimensionalState.drill("physics", "bodyCount").value;
        this.dimensionalState.drill("physics", "bodyCount").value = currentCount + 1;
    }
    removeBody(id) {
        const result = this.physicsStore.delete(id);
        if (result) {
            const currentCount = this.dimensionalState.drill("physics", "bodyCount").value;
            this.dimensionalState.drill("physics", "bodyCount").value = currentCount - 1;
        }
        return result;
    }
    update(dt) {
        if (!this.isRunning)
            return;
        // Manifold-based physics simulation
        const bodies = this.physicsStore.getAll().filter(({ id }) => id !== "gravity");
        bodies.forEach(({ id, entity }) => {
            if (entity.isStatic)
                return;
            // Manifold-based velocity update
            const newVelocity = {
                x: entity.velocity.x + entity.acceleration.x * dt,
                y: entity.velocity.y + entity.acceleration.y * dt
            };
            // Manifold-based position update
            const newPosition = {
                x: entity.x + newVelocity.x * dt,
                y: entity.y + newVelocity.y * dt
            };
            // Manifold-based collision detection (simple bounds)
            if (newPosition.x < 0 || newPosition.x > 1000) {
                newVelocity.x *= -0.8; // Bounce with damping
                newPosition.x = Math.max(0, Math.min(1000, newPosition.x));
            }
            if (newPosition.y < 0 || newPosition.y > 600) {
                newVelocity.y *= -0.8;
                newPosition.y = Math.max(0, Math.min(600, newPosition.y));
            }
            // Manifold-based gravity application
            const gravity = this.physicsStore.get("gravity");
            if (gravity) {
                newVelocity.y += gravity.y * dt;
            }
            // Update entity with manifold-based calculations
            this.physicsStore.set(id, {
                ...entity,
                velocity: newVelocity,
                x: newPosition.x,
                y: newPosition.y
            });
        });
    }
    getBody(id) {
        return this.physicsStore.get(id);
    }
    getAllBodies() {
        return this.physicsStore.getAll()
            .filter(({ id }) => id !== "gravity")
            .map(({ entity }) => entity);
    }
    start() {
        this.isRunning = true;
        this.dimensionalState.drill("physics", "status").value = "running";
        this.tickInterval = setInterval(() => this.update(1 / 60), 1000 / 60);
        console.log("PhysicsEngine started - manifold-based");
    }
    stop() {
        this.isRunning = false;
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        this.dimensionalState.drill("physics", "status").value = "stopped";
        console.log("PhysicsEngine stopped");
    }
    getStats() {
        const bodyCount = this.dimensionalState.drill("physics", "bodyCount").value;
        return {
            status: this.dimensionalState.drill("physics", "status").value,
            bodies: bodyCount,
            bodyCount,
            gravity: this.physicsStore.get("gravity"),
            memoryUsage: this.physicsStore.getStats()
        };
    }
}
exports.PhysicsEngine = PhysicsEngine;
