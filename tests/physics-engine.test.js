"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const physics_engine_1 = require("../app/src/engine/physics-engine");
describe("PhysicsEngine", () => {
    let physicsEngine;
    beforeEach(() => {
        physicsEngine = new physics_engine_1.PhysicsEngine();
    });
    afterEach(() => {
        physicsEngine.stop();
    });
    test("should initialize with default settings", () => {
        const stats = physicsEngine.getStats();
        expect(stats).toBeDefined();
        expect(stats.status).toBe("initialized");
        expect(stats.bodies).toBeDefined();
        expect(stats.bodies).toBe(0);
    });
    test("should start and stop engine", () => {
        physicsEngine.start();
        expect(physicsEngine.getStats().status).toBe("running");
        physicsEngine.stop();
        expect(physicsEngine.getStats().status).toBe("stopped");
    });
    test("should add and remove bodies", () => {
        const bodyId = "test-body";
        const bodyData = {
            x: 100,
            y: 200,
            vx: 5,
            vy: 10,
            mass: 1,
            isStatic: false
        };
        physicsEngine.addBody(bodyId, bodyData);
        expect(physicsEngine.getAllBodies()).toHaveLength(1);
        const body = physicsEngine.getBody(bodyId);
        expect(body).toBeDefined();
        expect(body.id).toBe(bodyId);
        expect(body.x).toBe(100);
        expect(body.y).toBe(200);
        physicsEngine.removeBody(bodyId);
        expect(physicsEngine.getAllBodies()).toHaveLength(0);
    });
    test("should update body positions over time", async () => {
        const bodyId = "moving-body";
        const initialX = 100;
        const initialY = 200;
        const velocityX = 10;
        const velocityY = 5;
        physicsEngine.addBody(bodyId, {
            x: initialX,
            y: initialY,
            vx: velocityX,
            vy: velocityY,
            mass: 1,
            isStatic: false
        });
        physicsEngine.start();
        // Wait for a few physics updates
        await new Promise(resolve => setTimeout(resolve, 100));
        const body = physicsEngine.getBody(bodyId);
        expect(body.x).toBeGreaterThan(initialX);
        expect(body.y).toBeGreaterThan(initialY);
        physicsEngine.stop();
    });
    test("should handle static bodies", () => {
        const staticBodyId = "static-body";
        const initialX = 50;
        const initialY = 75;
        physicsEngine.addBody(staticBodyId, {
            x: initialX,
            y: initialY,
            vx: 100, // This should be ignored for static bodies
            vy: 100,
            mass: 1,
            isStatic: true
        });
        const body = physicsEngine.getBody(staticBodyId);
        expect(body.isStatic).toBe(true);
        expect(body.velocity.x).toBe(0);
        expect(body.velocity.y).toBe(0);
    });
    test("should apply gravity to dynamic bodies", async () => {
        const bodyId = "gravity-body";
        const initialY = 100;
        physicsEngine.addBody(bodyId, {
            x: 0,
            y: initialY,
            vx: 0,
            vy: 0,
            mass: 1,
            isStatic: false
        });
        physicsEngine.start();
        // Wait for gravity to take effect
        await new Promise(resolve => setTimeout(resolve, 200));
        const body = physicsEngine.getBody(bodyId);
        expect(body.y).toBeGreaterThan(initialY);
        physicsEngine.stop();
    });
    test("should handle multiple bodies", () => {
        const bodies = [
            { id: "body1", x: 0, y: 0, vx: 1, vy: 1 },
            { id: "body2", x: 10, y: 10, vx: 2, vy: 2 },
            { id: "body3", x: 20, y: 20, vx: 3, vy: 3 }
        ];
        bodies.forEach(body => {
            physicsEngine.addBody(body.id, {
                x: body.x,
                y: body.y,
                vx: body.vx,
                vy: body.vy,
                mass: 1,
                isStatic: false
            });
        });
        expect(physicsEngine.getAllBodies()).toHaveLength(3);
        const allBodies = physicsEngine.getAllBodies();
        expect(allBodies.some(b => b.id === "body1")).toBe(true);
        expect(allBodies.some(b => b.id === "body2")).toBe(true);
        expect(allBodies.some(b => b.id === "body3")).toBe(true);
    });
    test("should handle collision detection and bounds", () => {
        const bodyId = "boundary-body";
        // Create a body that will hit the right boundary
        physicsEngine.addBody(bodyId, {
            x: 990, // Close to right boundary (1000)
            y: 300,
            vx: 200, // Moving right fast
            vy: 0,
            mass: 1,
            isStatic: false
        });
        // Manually tick the engine instead of relying on setInterval timing.
        // The engine must be running for update() to apply.
        physicsEngine.start();
        // Clear the internal interval so we control ticks deterministically.
        if (physicsEngine.tickInterval) {
            clearInterval(physicsEngine.tickInterval);
            physicsEngine.tickInterval = null;
        }
        // Advance several frames — enough for the body to reach x=1000 and bounce.
        for (let i = 0; i < 10; i++) {
            physicsEngine.update(1 / 60);
        }
        const body = physicsEngine.getBody(bodyId);
        expect(body.x).toBeLessThanOrEqual(1000); // Should not exceed boundary
        expect(body.velocity.x).toBeLessThan(0); // Should bounce back (negative velocity)
        physicsEngine.stop();
    });
    test("should handle gravity configuration", () => {
        const gravity = physicsEngine.getStats().gravity;
        expect(gravity).toBeDefined();
        expect(gravity.x).toBe(0);
        expect(gravity.y).toBe(9.81);
    });
    test("should return undefined for non-existent body", () => {
        const body = physicsEngine.getBody("non-existent");
        expect(body).toBeUndefined();
    });
    test("should handle body removal gracefully", () => {
        const bodyId = "test-body";
        physicsEngine.addBody(bodyId, { x: 0, y: 0, vx: 0, vy: 0, mass: 1, isStatic: false });
        expect(physicsEngine.getBody(bodyId)).toBeDefined();
        physicsEngine.removeBody(bodyId);
        expect(physicsEngine.getBody(bodyId)).toBeUndefined();
        // Removing non-existent body should not throw
        expect(() => physicsEngine.removeBody("non-existent")).not.toThrow();
    });
});
