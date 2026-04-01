"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngine = void 0;
const entity_store_1 = require("../../../core/substrate/entity-store");
const dimensional_1 = require("../../../core/dimensional");
// Game engine using manifold-based game logic
class GameEngine {
    constructor() {
        this.isRunning = false;
        this.gameState = {};
        this.tickInterval = null;
        this.initializeStore();
        this.initializeDimensionalState();
        this.initializeGameState();
    }
    initializeStore() {
        // Create game entity store
        this.gameStore = new entity_store_1.EntityStore("game");
        // Manifold-based game properties
        this.gameStore.set("gameSettings", {
            width: 800,
            height: 600,
            fps: 60,
            backgroundColor: "#000000"
        });
    }
    initializeDimensionalState() {
        this.dimensionalState = (0, dimensional_1.dimFrom)({});
        this.dimensionalState.drill("game", "status").value = "initialized";
        this.dimensionalState.drill("game", "level").value = 1;
        this.dimensionalState.drill("game", "score").value = 0;
        this.dimensionalState.drill("game", "lives").value = 3;
    }
    initializeGameState() {
        this.gameState = {
            entities: {},
            collisions: [],
            events: []
        };
    }
    createEntity(id, type, properties) {
        // Manifold-based entity creation
        this.gameStore.set(id, {
            type,
            ...properties,
            id,
            health: properties.health || 100,
            position: properties.position || { x: 0, y: 0 },
            velocity: (() => {
                const v = properties.velocity || { x: 0, y: 0 };
                const vx = v.x ?? v.vx ?? 0;
                const vy = v.y ?? v.vy ?? 0;
                return { x: vx, y: vy, vx, vy };
            })(),
            isAlive: true,
            created: Date.now()
        });
        // Update game state
        this.gameState.entities[id] = {
            type,
            health: properties.health || 100,
            position: properties.position || { x: 0, y: 0 },
            velocity: properties.velocity || { x: 0, y: 0 },
            isAlive: true
        };
    }
    removeEntity(id) {
        const result = this.gameStore.delete(id);
        if (result) {
            delete this.gameState.entities[id];
        }
        return result;
    }
    updateEntity(id, properties) {
        const entity = this.gameStore.get(id);
        if (entity) {
            this.gameStore.set(id, { ...entity, ...properties });
            // Update game state
            if (this.gameState.entities[id]) {
                this.gameState.entities[id] = { ...this.gameState.entities[id], ...properties };
            }
        }
    }
    getEntity(id) {
        return this.gameStore.get(id);
    }
    getAllEntities() {
        return this.gameStore.getAll()
            .filter(({ id }) => id !== "gameSettings")
            .map(({ entity }) => entity);
    }
    update(dt) {
        if (!this.isRunning)
            return;
        // Manifold-based game logic update
        const entities = this.getAllEntities();
        const collisions = [];
        // Manifold-based entity updates
        entities.forEach(entity => {
            if (!entity.isAlive)
                return;
            // Manifold-based movement
            const newPosition = {
                x: entity.position.x + entity.velocity.x * dt,
                y: entity.position.y + entity.velocity.y * dt
            };
            // Manifold-based boundary checking
            const settings = this.gameStore.get("gameSettings");
            if (settings) {
                if (newPosition.x < 0 || newPosition.x > settings.width) {
                    entity.velocity.x *= -0.8;
                    newPosition.x = Math.max(0, Math.min(settings.width, newPosition.x));
                }
                if (newPosition.y < 0 || newPosition.y > settings.height) {
                    entity.velocity.y *= -0.8;
                    newPosition.y = Math.max(0, Math.min(settings.height, newPosition.y));
                }
            }
            // Manifold-based health decay
            if (entity.type === "enemy") {
                entity.health -= dt * 0.1;
                if (entity.health <= 0) {
                    entity.isAlive = false;
                    this.dimensionalState.drill("game", "score").value += 10;
                }
            }
            // Update entity
            this.updateEntity(entity.id, {
                position: newPosition,
                health: entity.health
            });
        });
        // Manifold-based collision detection
        this.detectCollisions(entities);
    }
    detectCollisions(entities) {
        // Manifold-based collision detection (simple AABB)
        const collisions = [];
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const entity1 = entities[i];
                const entity2 = entities[j];
                if (!entity1.isAlive || !entity2.isAlive)
                    continue;
                // Manifold-based collision check
                const distance = Math.sqrt(Math.pow(entity1.position.x - entity2.position.x, 2) +
                    Math.pow(entity1.position.y - entity2.position.y, 2));
                if (distance < 20) { // Simple radius-based collision
                    collisions.push({ entity1: entity1.id, entity2: entity2.id, distance });
                    // Manifold-based collision response
                    entity1.velocity.x *= -0.5;
                    entity1.velocity.y *= -0.5;
                    entity2.velocity.x *= -0.5;
                    entity2.velocity.y *= -0.5;
                    // Manifold-based damage
                    entity1.health -= 10;
                    entity2.health -= 10;
                    if (entity1.health <= 0)
                        entity1.isAlive = false;
                    if (entity2.health <= 0)
                        entity2.isAlive = false;
                }
            }
        }
        // Store collisions in game state
        this.gameState.collisions = collisions;
    }
    start() {
        this.isRunning = true;
        this.dimensionalState.drill("game", "status").value = "running";
        this.tickInterval = setInterval(() => this.update(1 / 60), 1000 / 60);
        console.log("GameEngine started - manifold-based");
    }
    stop() {
        this.isRunning = false;
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        this.dimensionalState.drill("game", "status").value = "stopped";
        console.log("GameEngine stopped");
    }
    setLevel(level) {
        this.dimensionalState.drill("game", "level").value = level;
        // Manifold-based level setup
        this.setupLevel(level);
    }
    setupLevel(level) {
        // Manifold-based level generation
        for (let i = 0; i < level * 2; i++) {
            this.createEntity(`enemy_${i}`, "enemy", {
                position: {
                    x: Math.random() * 800,
                    y: Math.random() * 600
                },
                velocity: {
                    x: (Math.random() - 0.5) * 100,
                    y: (Math.random() - 0.5) * 100
                },
                health: 50 + level * 10
            });
        }
    }
    getStats() {
        const entityCount = this.getAllEntities().length;
        return {
            status: this.dimensionalState.drill("game", "status").value,
            level: this.dimensionalState.drill("game", "level").value,
            score: this.dimensionalState.drill("game", "score").value,
            lives: this.dimensionalState.drill("game", "lives").value,
            entities: entityCount,
            entityCount,
            memoryUsage: this.gameStore.getStats(),
            gameState: this.gameState
        };
    }
    getGameState() {
        return this.gameState;
    }
}
exports.GameEngine = GameEngine;
