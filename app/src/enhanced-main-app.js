"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedMainApp = void 0;
const enhanced_main_engine_1 = require("./engine/enhanced-main-engine");
const renderer_engine_1 = require("./engine/renderer-engine");
const physics_engine_1 = require("./engine/physics-engine");
const audio_engine_1 = require("./engine/audio-engine");
const game_engine_1 = require("./engine/game-engine");
const ai_engine_1 = require("./engine/ai-engine");
// MIA — Media Intelligence Architecture (loosely coupled — optional)
const image_engine_1 = require("./engine/image-engine");
const video_editor_engine_1 = require("./engine/video-editor-engine");
// Enhanced main application with supercharged manifold capabilities
class EnhancedMainApp {
    /**
     * @param miaRegistry  Optional MediaSubstrate registry.
     *                     When supplied, ImageEngine and VideoEditorEngine
     *                     self-register and can communicate through events.
     *                     When omitted, they operate in full standalone mode.
     */
    constructor(miaRegistry) {
        this.isRunning = false;
        this.optimizationLevel = 3;
        this.initializeEnhancedEngines();
        this.initializeMIAEngines(miaRegistry);
        this.setupEnhancedEventListeners();
    }
    initializeEnhancedEngines() {
        // Enhanced engine initialization with supercharged manifold
        this.enhancedMainEngine = new enhanced_main_engine_1.EnhancedMainEngine();
        this.rendererEngine = new renderer_engine_1.RendererEngine();
        this.physicsEngine = new physics_engine_1.PhysicsEngine();
        this.audioEngine = new audio_engine_1.AudioEngine();
        this.gameEngine = new game_engine_1.GameEngine();
        this.aiEngine = new ai_engine_1.AIEngine();
    }
    /** Loosely coupled — MIA engines are optional. */
    initializeMIAEngines(registry) {
        this.imageEngine = new image_engine_1.ImageEngine({ registry });
        this.videoEditor = new video_editor_engine_1.VideoEditorEngine({ registry });
    }
    setupEnhancedEventListeners() {
        // Enhanced event coordination with supercharged manifold
        this.gameEngine.start();
        this.physicsEngine.start();
        this.audioEngine.start();
        this.aiEngine.start();
        this.rendererEngine.start();
        this.enhancedMainEngine.start();
        console.log("EnhancedMainApp initialized - supercharged manifold-based");
    }
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        console.log("EnhancedMainApp started - supercharged manifold-based application");
        this.runEnhancedMainLoop();
    }
    stop() {
        this.isRunning = false;
        this.enhancedMainEngine.stop();
        this.physicsEngine.stop();
        this.audioEngine.stop();
        this.gameEngine.stop();
        this.aiEngine.stop();
        this.rendererEngine.stop();
        console.log("EnhancedMainApp stopped");
    }
    async runEnhancedMainLoop() {
        const frameDuration = 1000 / 60; // 60 FPS
        let lastTime = performance.now();
        while (this.isRunning) {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;
            // Enhanced manifold-based frame update
            this.updateEnhanced(deltaTime);
            this.renderEnhanced();
            // Enhanced manifold-based timing
            const frameTime = performance.now() - currentTime;
            const sleepTime = Math.max(0, frameDuration - frameTime);
            await new Promise(resolve => setTimeout(resolve, sleepTime));
        }
    }
    updateEnhanced(deltaTime) {
        // Enhanced manifold-based update coordination
        this.updateEnhancedPhysics(deltaTime);
        this.updateEnhancedAI(deltaTime);
        this.updateEnhancedGame(deltaTime);
        this.updateEnhancedAudio(deltaTime);
        this.updateEnhancedOptimization();
    }
    updateEnhancedPhysics(deltaTime) {
        // Enhanced manifold-based physics update
        this.physicsEngine.update(deltaTime);
        // Enhanced manifold-based entity synchronization
        const bodies = this.physicsEngine.getAllBodies();
        bodies.forEach(body => {
            // Enhanced manifold-based position updates
            const enhancedPosition = this.enhancePositionWithSupercharger(body.position, body.velocity);
            this.gameEngine.updateEntity(body.id, {
                position: enhancedPosition,
                velocity: body.velocity
            });
        });
    }
    updateEnhancedAI(deltaTime) {
        // Enhanced manifold-based AI update
        const agents = this.aiEngine.getAllAgents();
        agents.forEach(agent => {
            if (agent.isActive && agent.type === "player") {
                // Enhanced manifold-based decision making
                const state = this.gameEngine.getEntity(agent.controlledEntityId);
                if (state) {
                    const enhancedState = this.enhanceStateWithSupercharger(state);
                    const decision = this.aiEngine.makeDecision(agent.id, enhancedState);
                    // Enhanced manifold-based action execution
                    this.executeEnhancedAIDecision(agent.id, decision);
                }
            }
        });
    }
    executeEnhancedAIDecision(agentId, decision) {
        // Enhanced manifold-based action execution
        const agent = this.aiEngine.getAgent(agentId);
        if (!agent || !decision)
            return;
        switch (decision.type) {
            case "predicted":
                // Enhanced manifold-based movement
                const controlledEntity = this.gameEngine.getEntity(agent.controlledEntityId);
                if (controlledEntity) {
                    const enhancedPosition = this.enhancePositionWithSupercharger(controlledEntity.position, { x: (decision.action - 1) * 5, y: 0 });
                    this.gameEngine.updateEntity(agent.controlledEntityId, {
                        position: enhancedPosition
                    });
                }
                break;
            case "random":
                // Enhanced manifold-based random action
                break;
        }
    }
    updateEnhancedGame(deltaTime) {
        // Enhanced manifold-based game update
        this.gameEngine.update(deltaTime);
    }
    updateEnhancedAudio(deltaTime) {
        // Enhanced manifold-based audio update
        // (Audio updates are handled within the audio engine)
    }
    updateEnhancedOptimization() {
        // Enhanced manifold-based optimization application
        const currentOptimization = this.enhancedMainEngine.getEnhancedStats().optimizationLevel;
        if (currentOptimization !== this.optimizationLevel) {
            this.optimizationLevel = currentOptimization;
            this.applyEnhancedOptimizationStrategies();
        }
    }
    applyEnhancedOptimizationStrategies() {
        // Enhanced manifold-based optimization strategies
        switch (this.optimizationLevel) {
            case 1:
                this.applyBasicEnhancedOptimization();
                break;
            case 2:
                this.applyIntermediateEnhancedOptimization();
                break;
            case 3:
                this.applyAdvancedEnhancedOptimization();
                break;
            case 4:
                this.applyExpertEnhancedOptimization();
                break;
            case 5:
                this.applyMasterEnhancedOptimization();
                break;
        }
    }
    applyBasicEnhancedOptimization() {
        // Basic enhanced manifold-based optimization
        this.audioEngine.setMasterVolume(0.8);
    }
    applyIntermediateEnhancedOptimization() {
        // Intermediate enhanced manifold-based optimization
        this.audioEngine.setMasterVolume(0.9);
    }
    applyAdvancedEnhancedOptimization() {
        // Advanced enhanced manifold-based optimization
        this.audioEngine.setMasterVolume(1.0);
    }
    applyExpertEnhancedOptimization() {
        // Expert enhanced manifold-based optimization
        this.audioEngine.setMasterVolume(1.0);
    }
    applyMasterEnhancedOptimization() {
        // Master enhanced manifold-based optimization
        this.audioEngine.setMasterVolume(1.0);
    }
    renderEnhanced() {
        // Enhanced manifold-based rendering
        const entities = this.gameEngine.getAllEntities();
        this.rendererEngine.render(entities);
        // Enhanced manifold-based UI updates
        this.updateEnhancedUI();
    }
    updateEnhancedUI() {
        // Enhanced manifold-based UI updates
        const stats = {
            enhancedMain: this.enhancedMainEngine.getEnhancedStats(),
            renderer: this.rendererEngine.getStats(),
            physics: this.physicsEngine.getStats(),
            audio: this.audioEngine.getStats(),
            game: this.gameEngine.getStats(),
            ai: this.aiEngine.getStats()
        };
        // Enhanced manifold-based debug display
        this.displayEnhancedDebugInfo(stats);
    }
    displayEnhancedDebugInfo(stats) {
        // Enhanced manifold-based debug display
        try {
            if (this.rendererEngine.getCanvas()) {
                const ctx = this.rendererEngine.getCanvas().getContext("2d");
                if (ctx) {
                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                    ctx.fillRect(10, 10, 250, 200);
                    ctx.fillStyle = "#ffffff";
                    ctx.font = "12px monospace";
                    let y = 25;
                    Object.keys(stats).forEach(key => {
                        const stat = stats[key];
                        ctx.fillText(`${key}: ${stat.status}`, 20, y);
                        y += 15;
                        if (stat.optimizationLevel) {
                            ctx.fillText(`  Optimization: ${stat.optimizationLevel}`, 20, y);
                            y += 15;
                        }
                    });
                }
            }
        }
        catch (error) {
            // Enhanced manifold-based error handling for test environments
            console.log("Enhanced debug info:", JSON.stringify(stats, null, 2));
        }
    }
    createEnhancedPlayer(x, y) {
        // Enhanced manifold-based player creation
        const playerId = `player_${Date.now()}`;
        // Enhanced manifold-based physics body creation
        this.physicsEngine.addBody(playerId, {
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            mass: 1,
            isStatic: false
        });
        // Enhanced manifold-based game entity creation
        this.gameEngine.createEntity(playerId, "player", {
            position: { x: x, y: y },
            velocity: { vx: 0, vy: 0 },
            health: 100
        });
        // Enhanced manifold-based renderable creation
        this.rendererEngine.createRenderable(playerId, "circle", {
            x: x,
            y: y,
            radius: 15,
            color: "#00ff00",
            zIndex: 1
        });
        // Enhanced manifold-based AI agent creation
        this.aiEngine.createAgent(`ai_${playerId}`, {
            type: "player",
            controlledEntityId: playerId,
            state: { position: { x, y } }
        });
        return playerId;
    }
    createEnhancedEnemy(x, y) {
        // Enhanced manifold-based enemy creation
        const enemyId = `enemy_${Date.now()}`;
        // Enhanced manifold-based physics body creation
        this.physicsEngine.addBody(enemyId, {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 50,
            vy: (Math.random() - 0.5) * 50,
            mass: 1,
            isStatic: false
        });
        // Enhanced manifold-based game entity creation
        this.gameEngine.createEntity(enemyId, "enemy", {
            position: { x: x, y: y },
            velocity: { vx: 0, vy: 0 },
            health: 50
        });
        // Enhanced manifold-based renderable creation
        this.rendererEngine.createRenderable(enemyId, "circle", {
            x: x,
            y: y,
            radius: 10,
            color: "#ff0000",
            zIndex: 1
        });
        return enemyId;
    }
    setOptimizationLevel(level) {
        this.optimizationLevel = Math.max(1, Math.min(5, level));
        this.enhancedMainEngine.setOptimizationLevel(this.optimizationLevel);
    }
    getEnhancedStats() {
        return {
            running: this.isRunning,
            optimizationLevel: this.optimizationLevel,
            engines: {
                enhancedMain: this.enhancedMainEngine.getEnhancedStats(),
                renderer: this.rendererEngine.getStats(),
                physics: this.physicsEngine.getStats(),
                audio: this.audioEngine.getStats(),
                game: this.gameEngine.getStats(),
                ai: this.aiEngine.getStats(),
                // MIA engines — included when present
                imageEngine: this.imageEngine.diagnostics(),
                videoEditor: this.videoEditor.diagnostics(),
            }
        };
    }
    getCanvas() {
        return this.rendererEngine.getCanvas();
    }
    // Enhanced manifold-based helper methods
    enhancePositionWithSupercharger(position, velocity) {
        // Enhanced manifold-based position enhancement
        const enhancementFactor = this.optimizationLevel / 4;
        return {
            x: position.x + velocity.x * enhancementFactor,
            y: position.y + velocity.y * enhancementFactor
        };
    }
    enhanceStateWithSupercharger(state) {
        // Enhanced manifold-based state enhancement
        return {
            ...state,
            enhanced: true,
            optimizationLevel: this.optimizationLevel
        };
    }
}
exports.EnhancedMainApp = EnhancedMainApp;
