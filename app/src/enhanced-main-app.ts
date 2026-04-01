import { EnhancedMainEngine } from "./engine/enhanced-main-engine";
import { RendererEngine } from "./engine/renderer-engine";
import { PhysicsEngine } from "./engine/physics-engine";
import { AudioEngine } from "./engine/audio-engine";
import { GameEngine } from "./engine/game-engine";
import { AIEngine } from "./engine/ai-engine";
// MIA — Media Intelligence Architecture (loosely coupled — optional)
import { ImageEngine }       from "./engine/image-engine";
import { VideoEditorEngine } from "./engine/video-editor-engine";
import type { MediaSubstrate } from "../../core/substrate/media-substrate";

// Enhanced main application with supercharged manifold capabilities
export class EnhancedMainApp {
  private enhancedMainEngine: EnhancedMainEngine;
  private rendererEngine: RendererEngine;
  private physicsEngine: PhysicsEngine;
  private audioEngine: AudioEngine;
  private gameEngine: GameEngine;
  private aiEngine: AIEngine;
  // MIA engines — loosely coupled, standalone by default
  imageEngine: ImageEngine;
  videoEditor: VideoEditorEngine;
  private isRunning: boolean = false;
  private optimizationLevel: number = 3;

  /**
   * @param miaRegistry  Optional MediaSubstrate registry.
   *                     When supplied, ImageEngine and VideoEditorEngine
   *                     self-register and can communicate through events.
   *                     When omitted, they operate in full standalone mode.
   */
  constructor(miaRegistry?: MediaSubstrate) {
    this.initializeEnhancedEngines();
    this.initializeMIAEngines(miaRegistry);
    this.setupEnhancedEventListeners();
  }

  private initializeEnhancedEngines(): void {
    // Enhanced engine initialization with supercharged manifold
    this.enhancedMainEngine = new EnhancedMainEngine();
    this.rendererEngine = new RendererEngine();
    this.physicsEngine = new PhysicsEngine();
    this.audioEngine = new AudioEngine();
    this.gameEngine = new GameEngine();
    this.aiEngine = new AIEngine();
  }

  /** Loosely coupled — MIA engines are optional. */
  private initializeMIAEngines(registry?: MediaSubstrate): void {
    this.imageEngine  = new ImageEngine({ registry });
    this.videoEditor  = new VideoEditorEngine({ registry });
  }

  private setupEnhancedEventListeners(): void {
    // Enhanced event coordination with supercharged manifold
    this.gameEngine.start();
    this.physicsEngine.start();
    this.audioEngine.start();
    this.aiEngine.start();
    this.rendererEngine.start();
    this.enhancedMainEngine.start();

    console.log("EnhancedMainApp initialized - supercharged manifold-based");
  }

  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log("EnhancedMainApp started - supercharged manifold-based application");

    this.runEnhancedMainLoop();
  }

  public stop(): void {
    this.isRunning = false;
    this.enhancedMainEngine.stop();
    this.physicsEngine.stop();
    this.audioEngine.stop();
    this.gameEngine.stop();
    this.aiEngine.stop();
    this.rendererEngine.stop();
    console.log("EnhancedMainApp stopped");
  }

  private async runEnhancedMainLoop(): Promise<void> {
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

  private updateEnhanced(deltaTime: number): void {
    // Enhanced manifold-based update coordination
    this.updateEnhancedPhysics(deltaTime);
    this.updateEnhancedAI(deltaTime);
    this.updateEnhancedGame(deltaTime);
    this.updateEnhancedAudio(deltaTime);
    this.updateEnhancedOptimization();
  }

  private updateEnhancedPhysics(deltaTime: number): void {
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

  private updateEnhancedAI(deltaTime: number): void {
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

  private executeEnhancedAIDecision(agentId: string, decision: any): void {
    // Enhanced manifold-based action execution
    const agent = this.aiEngine.getAgent(agentId);
    if (!agent || !decision) return;

    switch (decision.type) {
      case "predicted":
        // Enhanced manifold-based movement
        const controlledEntity = this.gameEngine.getEntity(agent.controlledEntityId);
        if (controlledEntity) {
          const enhancedPosition = this.enhancePositionWithSupercharger(
            controlledEntity.position,
            { x: (decision.action - 1) * 5, y: 0 }
          );
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

  private updateEnhancedGame(deltaTime: number): void {
    // Enhanced manifold-based game update
    this.gameEngine.update(deltaTime);
  }

  private updateEnhancedAudio(deltaTime: number): void {
    // Enhanced manifold-based audio update
    // (Audio updates are handled within the audio engine)
  }

  private updateEnhancedOptimization(): void {
    // Enhanced manifold-based optimization application
    const currentOptimization = this.enhancedMainEngine.getEnhancedStats().optimizationLevel;
    if (currentOptimization !== this.optimizationLevel) {
      this.optimizationLevel = currentOptimization;
      this.applyEnhancedOptimizationStrategies();
    }
  }

  private applyEnhancedOptimizationStrategies(): void {
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

  private applyBasicEnhancedOptimization(): void {
    // Basic enhanced manifold-based optimization
    this.audioEngine.setMasterVolume(0.8);
  }

  private applyIntermediateEnhancedOptimization(): void {
    // Intermediate enhanced manifold-based optimization
    this.audioEngine.setMasterVolume(0.9);
  }

  private applyAdvancedEnhancedOptimization(): void {
    // Advanced enhanced manifold-based optimization
    this.audioEngine.setMasterVolume(1.0);
  }

  private applyExpertEnhancedOptimization(): void {
    // Expert enhanced manifold-based optimization
    this.audioEngine.setMasterVolume(1.0);
  }

  private applyMasterEnhancedOptimization(): void {
    // Master enhanced manifold-based optimization
    this.audioEngine.setMasterVolume(1.0);
  }

  private renderEnhanced(): void {
    // Enhanced manifold-based rendering
    const entities = this.gameEngine.getAllEntities();
    this.rendererEngine.render(entities);

    // Enhanced manifold-based UI updates
    this.updateEnhancedUI();
  }

  private updateEnhancedUI(): void {
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

  private displayEnhancedDebugInfo(stats: any): void {
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
    } catch (error) {
      // Enhanced manifold-based error handling for test environments
      console.log("Enhanced debug info:", JSON.stringify(stats, null, 2));
    }
  }

  public createEnhancedPlayer(x: number, y: number): string {
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

  public createEnhancedEnemy(x: number, y: number): string {
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

  public setOptimizationLevel(level: number): void {
    this.optimizationLevel = Math.max(1, Math.min(5, level));
    this.enhancedMainEngine.setOptimizationLevel(this.optimizationLevel);
  }

  public getEnhancedStats(): any {
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
        imageEngine:  this.imageEngine.diagnostics(),
        videoEditor:  this.videoEditor.diagnostics(),
      }
    };
  }

  public getCanvas(): HTMLCanvasElement | null {
    return this.rendererEngine.getCanvas();
  }

  // Enhanced manifold-based helper methods
  private enhancePositionWithSupercharger(position: any, velocity: any): any {
    // Enhanced manifold-based position enhancement
    const enhancementFactor = this.optimizationLevel / 4;
    return {
      x: position.x + velocity.x * enhancementFactor,
      y: position.y + velocity.y * enhancementFactor
    };
  }

  private enhanceStateWithSupercharger(state: any): any {
    // Enhanced manifold-based state enhancement
    return {
      ...state,
      enhanced: true,
      optimizationLevel: this.optimizationLevel
    };
  }
}
