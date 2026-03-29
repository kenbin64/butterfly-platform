import { EnhancedMainEngine } from "../app/src/engine/enhanced-main-engine";
import { EntityStoreRegistry } from "../core/substrate/entity-store";
import { Dimension } from "../core/dimensional";

describe("Enhanced Main Engine", () => {
  let engine: EnhancedMainEngine;

  beforeEach(() => {
    engine = new EnhancedMainEngine();
  });

  test("should initialize with default optimization level", () => {
    expect(engine.getEnhancedStats().optimizationLevel).toBe(3);
  });

  test("should create enhanced entity stores", () => {
    const stats = engine.getEnhancedStats();
    expect(stats.engines).toBeDefined();
    expect(stats.engines.enhancedMain).toBeDefined();
  });

  test("should start and stop engine", () => {
    engine.start();
    expect(engine.getEnhancedStats().status).toBe("running");
    
    engine.stop();
    expect(engine.getEnhancedStats().status).toBe("stopped");
  });

  test("should update enhanced entities", () => {
    engine.start();
    
    // Wait a moment for engine to run
    return new Promise(resolve => setTimeout(resolve, 100))
      .then(() => {
        const stats = engine.getEnhancedStats();
        expect(stats.frame).toBeGreaterThan(0);
        expect(stats.frameTime).toBeGreaterThan(0);
      });
  });

  test("should optimize level between 1 and 5", () => {
    engine.setOptimizationLevel(1);
    expect(engine.getEnhancedStats().optimizationLevel).toBe(1);
    
    engine.setOptimizationLevel(5);
    expect(engine.getEnhancedStats().optimizationLevel).toBe(5);
  });

  test("should provide enhanced stats", () => {
    const stats = engine.getEnhancedStats();
    expect(stats).toBeDefined();
    expect(stats.frame).toBeDefined();
    expect(stats.status).toBeDefined();
    expect(stats.optimizationLevel).toBeDefined();
  });
});