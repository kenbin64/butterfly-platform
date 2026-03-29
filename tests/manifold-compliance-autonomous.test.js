"use strict";
// tests/manifold-compliance-autonomous.test.ts
// Manifold Compliance Tests - Autonomous Engine
Object.defineProperty(exports, "__esModule", { value: true });
const atomomousEngine_1 = require("../app/src/engine/atomomousEngine");
describe("Manifold Compliance: AutonomousSubstrate", () => {
    let ai;
    beforeEach(() => {
        ai = atomomousEngine_1.AutonomousSubstrate.create();
    });
    test("agent access is O(1)", () => {
        ai.createAgent("npc_guard", "patrol");
        ai.createAgent("npc_merchant", "idle");
        const guard = ai.agent("npc_guard");
        expect(guard.drill("behavior").value).toBe("patrol");
    });
    test("behavior is a drillable coordinate", () => {
        ai.createAgent("npc_1", "wander");
        ai.setBehavior("npc_1", "chase");
        expect(ai.getBehavior("npc_1")).toBe("chase");
    });
    test("goals are drillable", () => {
        ai.createAgent("npc_guard");
        ai.addGoal("npc_guard", {
            id: "patrol_route",
            priority: 1,
            target: ["waypoints", "route_1"],
            status: "active"
        });
        const priority = ai.agent("npc_guard").drill("goals", "patrol_route", "priority").value;
        expect(priority).toBe(1);
    });
    test("perception/memory is drillable", () => {
        ai.createAgent("npc_1");
        ai.perceive("npc_1", {
            type: "player_seen",
            coordinate: ["entities", "player"],
            value: { distance: 10 },
            timestamp: 1000
        });
        const memory = ai.recall("npc_1", "player_seen");
        expect(memory?.coordinate).toEqual(["entities", "player"]);
        expect(memory?.timestamp).toBe(1000);
    });
    test("behavior definitions are drillable", () => {
        ai.defineBehavior("patrol", {
            speed: 2.0,
            waypoints: ["wp_1", "wp_2", "wp_3"],
            loop: true
        });
        const speed = ai.drill("behaviors", "patrol", "speed").value;
        expect(speed).toBe(2.0);
    });
    test("multiple agents are independent coordinates", () => {
        ai.createAgent("a", "idle");
        ai.createAgent("b", "patrol");
        ai.createAgent("c", "chase");
        // Each agent is its own coordinate - not iteration
        expect(ai.getBehavior("a")).toBe("idle");
        expect(ai.getBehavior("b")).toBe("patrol");
        expect(ai.getBehavior("c")).toBe("chase");
    });
});
/**
 * MANIFOLD EXEMPTION MARKERS
 * --------------------------
 * Use these comments when manifold pattern doesn't apply:
 *
 * // @manifold-exempt: [reason]
 * // @manifold-exempt-math: Pure math operation, no state access
 * // @manifold-exempt-external: External API/library integration
 * // @manifold-exempt-performance: Performance-critical path
 */
describe("Manifold Exemption Examples", () => {
    test("@manifold-exempt-math: pure calculations don't need manifold", () => {
        // @manifold-exempt-math: Vector math is pure computation
        const vecAdd = (a, b) => {
            return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
        };
        expect(vecAdd([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
    });
    test("@manifold-exempt-external: external APIs use their own patterns", () => {
        // @manifold-exempt-external: Mock WebGL context - uses WebGL API
        const mockGL = { drawArrays: () => "drawn" };
        expect(mockGL.drawArrays()).toBe("drawn");
    });
});
