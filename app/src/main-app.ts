import { MainEngine } from "./engine/main-engine";
import { PhysicsEngine } from "./engine/physics-engine";
import { AudioEngine } from "./engine/audio-engine";
import { GameEngine } from "./engine/game-engine";
import { AIEngine } from "./engine/ai-engine";
import { RendererEngine } from "./engine/renderer-engine";

// Main application that coordinates all manifold-based engines
export class MainApp {
  private mainEngine: MainEngine;
  private physicsEngine: PhysicsEngine;
  private audioEngine: AudioEngine;
  private gameEngine: GameEngine;
  private aiEngine: AIEngine;
  private rendererEngine: RendererEngine;
  private isRunning: boolean = false;

  constructor() {
    this.initializeEngines();
    this.setupEventListeners();
  }

  private initializeEngines(): void {
    // Manifold-based engine initialization
    this.mainEngine = new MainEngine();
    this.physicsEngine = new PhysicsEngine();
    this.audioEngine = new AudioEngine();
    this.gameEngine = new GameEngine();
    this.aiEngine = new AIEngine();
    this.rendererEngine = new RendererEngine();
  }

  private setupEventListeners(): void {
    // Manifold-based event coordination
    this.gameEngine.start();
    this.physicsEngine.start();
    this.audioEngine.start();
    this.aiEngine.start();
    this.rendererEngine.start();
    this.mainEngine.start();
    
    console.log("MainApp initialized - all engines manifold-based");
  }

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log("MainApp started - manifold-based application");
    
    this.runMainLoop();
  }

  public stop(): void {
    this.isRunning = false;
    this.mainEngine.stop();
    this.physicsEngine.stop();
    this.audioEngine.stop();
    this.gameEngine.stop();
    this.aiEngine.stop();
    this.rendererEngine.stop();
    console.log("MainApp stopped");
  }

  private async runMainLoop(): Promise<void> {
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

  private update(deltaTime: number): void {
    // Manifold-based update coordination
    this.updatePhysics(deltaTime);
    this.updateAI(deltaTime);
    this.updateGame(deltaTime);
    this.updateAudio(deltaTime);
  }

  private updatePhysics(deltaTime: number): void {
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

  private updateAI(deltaTime: number): void {
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

  private executeAIDecision(agentId: string, decision: any): void {
    // Manifold-based action execution
    const agent = this.aiEngine.getAgent(agentId);
    if (!agent || !decision) return;
    
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

  private updateGame(deltaTime: number): void {
    // Manifold-based game update
    this.gameEngine.update(deltaTime);
  }

  private updateAudio(deltaTime: number): void {
    // Manifold-based audio update
    // (Audio updates are handled within the audio engine)
  }

  private render(): void {
    // Manifold-based rendering
    const entities = this.gameEngine.getAllEntities();
    this.rendererEngine.render(entities);
    
    // Manifold-based UI updates
    this.updateUI();
  }

  private updateUI(): void {
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

  private displayDebugInfo(stats: any): void {
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

  public createPlayer(x: number, y: number): string {
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

  public createEnemy(x: number, y: number): string {
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

  public getStats(): any {
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

  public getCanvas(): HTMLCanvasElement | null {
    return this.rendererEngine.getCanvas();
  }
}