"use strict";
// app/src/engine/atomomousEngine/autonomous-substrate.ts
// Manifold-based autonomous agent substrate
// Drill to agents, behaviors, goals, perceptions
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousSubstrate = void 0;
const base_substrate_1 = require("../../../../core/substrate/base-substrate");
const DEFAULT_CONFIG = {
    name: "autonomous",
    version: "1.0.0",
    tickRate: 30 // AI ticks less frequently
};
/**
 * AutonomousSubstrate
 * -------------------
 * Manifold-based autonomous agent system.
 *
 * Coordinates:
 *   drill("agents", "npc_01")                      → agent dimension
 *   drill("agents", "npc_01", "behavior")          → current behavior
 *   drill("agents", "npc_01", "goals", "patrol")   → goal state
 *   drill("agents", "npc_01", "memory", "player_last_seen") → perception
 *   drill("behaviors", "patrol", "waypoints")      → behavior config
 *
 * Agents don't iterate over the world - they drill to perceived coordinates.
 */
class AutonomousSubstrate extends base_substrate_1.SimulationSubstrate {
    constructor(config) {
        super({ ...DEFAULT_CONFIG, ...config }, {
            agents: {}
        });
    }
    /** Create autonomous substrate */
    static create(config) {
        return new AutonomousSubstrate(config);
    }
    /** Create an agent */
    createAgent(id, initialBehavior = "idle") {
        const agent = this.drill("agents", id);
        agent.drill("active").value = true;
        agent.drill("behavior").value = initialBehavior;
        agent.drill("goals").value = [];
        return agent;
    }
    /** Get agent by ID - O(1) */
    agent(id) {
        return this.drill("agents", id);
    }
    /** Set agent behavior */
    setBehavior(agentId, behavior) {
        this.agent(agentId).drill("behavior").value = behavior;
    }
    /** Get current behavior */
    getBehavior(agentId) {
        return this.agent(agentId).drill("behavior").value || "idle";
    }
    /** Add goal to agent */
    addGoal(agentId, goal) {
        const agent = this.agent(agentId);
        const goalDim = agent.drill("goals", goal.id);
        goalDim.drill("priority").value = goal.priority;
        goalDim.drill("target").value = goal.target;
        goalDim.drill("status").value = goal.status;
    }
    /** Record perception */
    perceive(agentId, perception) {
        const agent = this.agent(agentId);
        const mem = agent.drill("memory", perception.type);
        mem.drill("coordinate").value = perception.coordinate;
        mem.drill("value").value = perception.value;
        mem.drill("timestamp").value = perception.timestamp;
    }
    /** Query memory */
    recall(agentId, perceptionType) {
        const mem = this.agent(agentId).drill("memory", perceptionType);
        const coord = mem.drill("coordinate").value;
        if (!coord)
            return undefined;
        return {
            type: perceptionType,
            coordinate: coord,
            value: mem.drill("value").value,
            timestamp: mem.drill("timestamp").value || 0
        };
    }
    /** Define behavior template */
    defineBehavior(id, config) {
        const behavior = this.drill("behaviors", id);
        for (const [key, value] of Object.entries(config)) {
            behavior.drill(key).value = value;
        }
        return behavior;
    }
    /** Get all active agents */
    activeAgents() {
        return this.drill("agents").match(/.*/).filter(a => a.drill("active").value === true);
    }
    /** Tick - process agent behaviors */
    tick(dt) {
        // Each active agent processes its current behavior
        // Behaviors drill to coordinates, not iterate
        const agents = this.drill("agents").keys();
        for (const id of agents) {
            const agent = this.agent(id);
            if (!agent.drill("active").value)
                continue;
            // Update agent timestamp
            const lastTick = agent.drill("lastTick").value || 0;
            agent.drill("lastTick").value = lastTick + dt;
        }
    }
    /** Reset all agents */
    reset() {
        const agents = this.drill("agents").keys();
        for (const id of agents) {
            this.agent(id).drill("behavior").value = "idle";
            this.agent(id).drill("goals").value = [];
        }
    }
    /** Serialize */
    serialize() {
        return { agents: {} };
    }
    /** Hydrate */
    hydrate(_state) {
        // Restore agents from state
    }
}
exports.AutonomousSubstrate = AutonomousSubstrate;
