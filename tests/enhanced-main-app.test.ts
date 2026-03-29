import { EnhancedMainApp } from "../app/src/enhanced-main-app";
import { EnhancedMainEngine } from "../app/src/engine/enhanced-main-engine";
import { RendererEngine } from "../app/src/engine/renderer-engine";
import { PhysicsEngine } from "../app/src/engine/physics-engine";
import { AudioEngine } from "../app/src/engine/audio-engine";
import { GameEngine } from "../app/src/engine/game-engine";
import { AIEngine } from "../app/src/engine/ai-engine";

describe("Enhanced Main App", () => {
  let app: EnhancedMainApp;

  beforeEach(() => {
    app = new EnhancedMainApp();
  });

  test("should initialize with default optimization level", () => {
    expect(app.getEnhancedStats().optimizationLevel).toBe(3);
  });

  test("should create enhanced engines", () => {
    const stats = app.getEnhancedStats();
    expect(stats.engines).toBeDefined();
    expect(stats.engines.enhancedMain).toBeDefined();
  });

  test("should start and stop app", () => {
    app.start();
    expect(app.getEnhancedStats().running).toBe(true);
    
    app.stop();
    expect(app.getEnhancedStats().running).toBe(false);
  });

  test("should create enhanced entities", () => {
    app.start();
    
    // Wait a moment for app to run
    return new Promise(resolve => setTimeout(resolve, 100))
      .then(() => {
        const stats = app.getEnhancedStats();
        expect(stats.engines.enhancedMain.frame).toBeGreaterThan(0);
        expect(stats.engines.renderer.frameTime).toBeGreaterThan(0);
      });
  });

  test("should set optimization level between 1 and 5", () => {
    app.setOptimizationLevel(1);
    expect(app.getEnhancedStats().optimizationLevel).toBe(1);
    
    app.setOptimizationLevel(5);
    expect(app.getEnhancedStats().optimizationLevel).toBe(5);
  });

  test("should provide enhanced stats", () => {
    const stats = app.getEnhancedStats();
    expect(stats).toBeDefined();
    expect(stats.running).toBeDefined();
    expect(stats.optimizationLevel).toBeDefined();
    expect(stats.engines).toBeDefined();
  });
});
