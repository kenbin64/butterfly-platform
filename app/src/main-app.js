"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainApp = void 0;
const main_engine_1 = require("./engine/main-engine");
const physics_engine_1 = require("./engine/physics-engine");
const audio_engine_1 = require("./engine/audio-engine");
const game_engine_1 = require("./engine/game-engine");
const ai_engine_1 = require("./engine/ai-engine");
const renderer_engine_1 = require("./engine/renderer-engine");
// Main application that coordinates all manifold-based engines
class MainApp {
    constructor() {
        this.isRunning = false;
        this.initializeEngines();
        this.setupEventListeners();
    }
    initializeEngines() {
        // Manifold-based engine initialization
        this.mainEngine = new main_engine_1.MainEngine();
        this.physicsEngine = new physics_engine_1.PhysicsEngine();
        this.audioEngine = new audio_engine_1.AudioEngine();
        this.gameEngine = new game_engine_1.GameEngine();
        this.aiEngine = new ai_engine_1.AIEngine();
        this.rendererEngine = new renderer_engine_1.RendererEngine();
    }
    setupEventListeners() {
        // Manifold-based event coordination
        this.gameEngine.start();
        this.physicsEngine.start();
        this.audioEngine.start();
        this.aiEngine.start();
        this.rendererEngine.start();
        this.mainEngine.start();
        console.log("MainApp initialized - all engines manifold-based");
    }
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        console.log("MainApp started - manifold-based application");
        this.runMainLoop();
    }
    stop() {
        this.isRunning = false;
        this.mainEngine.stop();
        this.physicsEngine.stop();
        this.audioEngine.stop();
        this.gameEngine.stop();
        this.aiEngine.stop();
        this.rendererEngine.stop();
        console.log("MainApp stopped");
    }
    async runMainLoop() {
        const frameDuration = 1000 / 60; // 60 FPS
        let lastTime = performance.now();
        while (this.isRunning) {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            // Manifold-based frame update
            this.update(deltaTime);
            this.render();
            // Manifold-based timing
            const frameTime = performance.now() - currentTime;
            const sleepTime = Math.max(0, frameDuration - frameTime);
            await new Promise(resolve => setTimeout(resolve, sleepTime));
        }
    }
    update(deltaTime) {
        // Manifold-based update coordination
        this.updatePhysics(deltaTime);
        this.updateAI(deltaTime);
        this.updateGame(deltaTime);
        this.updateAudio(deltaTime);
    }
    updatePhysics(deltaTime) {
        // Manifold-based physics update
        this.physicsEngine.update(deltaTime);
        // Manifold-based entity synchronization
        const bodies = this.physicsEngine.getAllBodies();
        bodies.forEach(body => {
            // Update game entities with physics positions
            this.gameEngine.updateEntity(body.id, {
                position: { x: body.x, y: body.y },
                velocity: { x: body.vx, y: body.vy }
            });
        });
    }
    updateAI(deltaTime) {
        // Manifold-based AI update
        const agents = this.aiEngine.getAllAgents();
        agents.forEach(agent => {
            if (agent.isActive && agent.type === "player") {
                // Manifold-based decision making
                const state = this.gameEngine.getEntity(agent.controlledEntityId);
                if (state) {
                    const decision = this.aiEngine.makeDecision(agent.id, state);
                    // Manifold-based action execution
                    this.executeAIDecision(agent.id, decision);
                }
            }
        });
    }
    executeAIDecision(agentId, decision) {
        // Manifold-based action execution
        const agent = this.aiEngine.getAgent(agentId);
        if (!agent || !decision)
            return;
        switch (decision.type) {
            case "predicted":
                // Manifold-based movement
                const controlledEntity = this.gameEngine.getEntity(agent.controlledEntityId);
                if (controlledEntity) {
                    const newX = controlledEntity.position.x + (decision.action - 1) * 5;
                    const newY = controlledEntity.position.y;
                    this.gameEngine.updateEntity(agent.controlledEntityId, {
                        position: { x: newX, y: newY }
                    });
                }
                break;
            case "random":
                // Manifold-based random action
                break;
        }
    }
    updateGame(deltaTime) {
        // Manifold-based game update
        this.gameEngine.update(deltaTime);
    }
    updateAudio(deltaTime) {
        // Manifold-based audio update
        // (Audio updates are handled within the audio engine)
    }
    render() {
        // Manifold-based rendering
        const entities = this.gameEngine.getAllEntities();
        this.rendererEngine.render(entities);
        // Manifold-based UI updates
        this.updateUI();
    }
    updateUI() {
        // Manifold-based UI updates
        const stats = {
            main: this.mainEngine.getStats(),
            physics: this.physicsEngine.getStats(),
            audio: this.audioEngine.getStats(),
            game: this.gameEngine.getStats(),
            ai: this.aiEngine.getStats(),
            renderer: this.rendererEngine.getStats()
        };
        // Manifold-based debug display
        this.displayDebugInfo(stats);
    }
    displayDebugInfo(stats) {
        // Manifold-based debug display
        if (this.rendererEngine.getCanvas()) {
            const ctx = this.rendererEngine.getCanvas().getContext("2d");
            if (ctx) {
                ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                ctx.fillRect(10, 10, 200, 150);
                ctx.fillStyle = "#ffffff";
                ctx.font = "12px monospace";
                let y = 25;
                Object.keys(stats).forEach(key => {
                    const stat = stats[key];
                    ctx.fillText(`${key}: ${stat.status}`, 20, y);
                    y += 15;
                });
            }
        }
    }
    createPlayer(x, y) {
        // Manifold-based player creation
        const playerId = `player_${Date.now()}`;
        // Create physics body
        this.physicsEngine.addBody(playerId, {
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            mass: 1,
            isStatic: false
        });
        // Create game entity
        this.gameEngine.createEntity(playerId, "player", {
            position: { x: x, y: y },
            velocity: { vx: 0, vy: 0 },
            health: 100
        });
        // Create renderable
        this.rendererEngine.createRenderable(playerId, "circle", {
            x: x,
            y: y,
            radius: 15,
            color: "#00ff00",
            zIndex: 1
        });
        // Create AI agent
        this.aiEngine.createAgent(`ai_${playerId}`, {
            type: "player",
            controlledEntityId: playerId,
            state: { position: { x, y } }
        });
        return playerId;
    }
    createEnemy(x, y) {
        // Manifold-based enemy creation
        const enemyId = `enemy_${Date.now()}`;
        // Create physics body
        this.physicsEngine.addBody(enemyId, {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 50,
            vy: (Math.random() - 0.5) * 50,
            mass: 1,
            isStatic: false
        });
        // Create game entity
        this.gameEngine.createEntity(enemyId, "enemy", {
            position: { x: x, y: y },
            velocity: { vx: 0, vy: 0 },
            health: 50
        });
        // Create renderable
        this.rendererEngine.createRenderable(enemyId, "circle", {
            x: x,
            y: y,
            radius: 10,
            color: "#ff0000",
            zIndex: 1
        });
        return enemyId;
    }
    getStats() {
        return {
            running: this.isRunning,
            engines: {
                main: this.mainEngine.getStats(),
                physics: this.physicsEngine.getStats(),
                audio: this.audioEngine.getStats(),
                game: this.gameEngine.getStats(),
                ai: this.aiEngine.getStats(),
                renderer: this.rendererEngine.getStats()
            }
        };
    }
    getCanvas() {
        return this.rendererEngine.getCanvas();
    }
}
exports.MainApp = MainApp;
