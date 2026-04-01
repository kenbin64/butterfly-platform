"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainEngine = void 0;
const factory_1 = require("../../../core/factory");
const entity_store_1 = require("../../../core/substrate/entity-store");
const dimensional_1 = require("../../../core/dimensional");
// Main engine that coordinates all subsystems
class MainEngine {
    constructor() {
        this.isRunning = false;
        this.initializeSubstrate();
        this.initializeEntityStores();
        this.initializeDimensionalState();
    }
    initializeSubstrate() {
        // Create a manifold-based substrate with 7-pair helical cascade
        this.substrate = factory_1.SubstrateFactory.create({
            dimensions: 3,
            helixPairs: 7,
            observable: true,
            saddles: [
                { position: [0, 0], orientation: 0 },
                { position: [2, 0], orientation: 90 },
                { position: [4, 0], orientation: 0 }
            ]
        });
    }
    initializeEntityStores() {
        this.entityRegistry = new entity_store_1.EntityStoreRegistry();
        // Create manifold-based entity stores for different domains
        this.entityRegistry.createStore("physics");
        this.entityRegistry.createStore("audio");
        this.entityRegistry.createStore("game");
        this.entityRegistry.createStore("ai");
    }
    initializeDimensionalState() {
        // Create dimensional state for the entire engine
        this.dimensionalState = dimensional_1.Dimension.from({});
        // Set up dimensional structure for engine state
        this.dimensionalState.drill("engine", "status").value = "initialized";
        this.dimensionalState.drill("engine", "frame").value = 0;
        this.dimensionalState.drill("engine", "time").value = 0;
    }
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.dimensionalState.drill("engine", "status").value = "running";
        console.log("MainEngine started - manifold-based");
        this.runLoop();
    }
    stop() {
        this.isRunning = false;
        this.dimensionalState.drill("engine", "status").value = "stopped";
        console.log("MainEngine stopped");
    }
    async runLoop() {
        while (this.isRunning) {
            const frameStart = performance.now();
            // Manifold-based frame update
            this.updateFrame();
            this.updateSubstrate();
            this.updateEntities();
            // Manifold-based timing
            const frameEnd = performance.now();
            const frameTime = frameEnd - frameStart;
            this.dimensionalState.drill("engine", "frameTime").value = frameTime;
            // Wait for next frame (manifold-based timing)
            await this.frameWait();
        }
    }
    updateFrame() {
        const currentFrame = this.dimensionalState.drill("engine", "frame").value;
        this.dimensionalState.drill("engine", "frame").value = currentFrame + 1;
        // Manifold-based frame counter
        this.dimensionalState.drill("engine", "time").value =
            this.dimensionalState.drill("engine", "time").value + 16.67;
    }
    updateSubstrate() {
        // Cascade through the manifold substrate
        this.substrate.cascade();
        // Sample field values for manifold-based operations
        const samplePoint = [Math.sin(Date.now() / 1000), Math.cos(Date.now() / 1000)];
        const fieldValue = this.substrate.sample(samplePoint);
        // Store sample in dimensional state
        this.dimensionalState.drill("engine", "fieldSample").value = fieldValue;
    }
    updateEntities() {
        // Manifold-based entity updates
        const physicsStore = this.entityRegistry.getStore("physics");
        const audioStore = this.entityRegistry.getStore("audio");
        const gameStore = this.entityRegistry.getStore("game");
        // Update physics entities using manifold-based calculations
        if (physicsStore) {
            const entities = physicsStore.getAll();
            entities.forEach(({ id, entity }) => {
                // Manifold-based physics update
                const newX = entity.x + entity.vx * 0.016;
                const newY = entity.y + entity.vy * 0.016;
                physicsStore.set(id, { ...entity, x: newX, y: newY });
            });
        }
        // Flush all changes to substrate
        this.entityRegistry.flushAll();
    }
    async frameWait() {
        return new Promise(resolve => setTimeout(resolve, 16));
    }
    getEngineState() {
        return this.dimensionalState.invoke();
    }
    getStats() {
        return {
            frame: this.dimensionalState.drill("engine", "frame").value,
            status: this.dimensionalState.drill("engine", "status").value,
            time: this.dimensionalState.drill("engine", "time").value,
            frameTime: this.dimensionalState.drill("engine", "frameTime").value,
            fieldSample: this.dimensionalState.drill("engine", "fieldSample").value,
            substrate: this.substrate,
            entityCount: this.entityRegistry.getGlobalStats().entities
        };
    }
}
exports.MainEngine = MainEngine;
