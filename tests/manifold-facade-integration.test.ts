import { ManifoldFacade } from "../core/facade/manifold-facade";
import { ManifoldMathConverter } from "../core/manifold/math-converter";
import { ManifoldState, createManifoldState } from "../core/manifold/7-segment-state";

describe("Manifold Facade Integration", () => {
  let facade: ManifoldFacade;
  let converter: ManifoldMathConverter;

  beforeEach(() => {
    facade = new ManifoldFacade("test-store");
    converter = new ManifoldMathConverter();
  });

  test("should create and manage entities through facade", () => {
    // Create entities
    facade.createEntity("player1", "player", {
      position: { x: 100, y: 200 },
      velocity: { x: 5, y: 10 },
      health: 100
    });

    facade.createEntity("enemy1", "enemy", {
      position: { x: 300, y: 400 },
      velocity: { x: -3, y: -2 },
      health: 75
    });

    // Get entities
    const player = facade.getEntity("player1");
    const enemy = facade.getEntity("enemy1");

    expect(player).toBeDefined();
    expect(enemy).toBeDefined();
    expect(player.position.x).toBe(100);
    expect(player.position.y).toBe(200);
    expect(enemy.position.x).toBe(300);
    expect(enemy.position.y).toBe(400);

    // Update entity
    facade.updateEntity("player1", {
      position: { x: 150, y: 250 },
      health: 90
    });

    const updatedPlayer = facade.getEntity("player1");
    expect(updatedPlayer.position.x).toBe(150);
    expect(updatedPlayer.position.y).toBe(250);
    expect(updatedPlayer.health).toBe(90);

    // Get all entities using public API
    const stats = facade.getStats();
    expect(stats.entities).toBe(2);
  });

  test("should handle physics simulation through facade", async () => {
    // Create moving entities
    facade.createEntity("moving1", "object", {
      position: { x: 0, y: 0 },
      velocity: { x: 10, y: 5 },
      mass: 1
    });

    facade.createEntity("moving2", "object", {
      position: { x: 50, y: 50 },
      velocity: { x: -5, y: 10 },
      mass: 2
    });

    // Simulate physics
    const entities = [
      { id: "moving1", position: { x: 10, y: 5 }, velocity: { x: 10, y: 5 } },
      { id: "moving2", position: { x: 45, y: 60 }, velocity: { x: -5, y: 10 } }
    ];

    facade.simulatePhysics(entities, 1.0);

    // Verify entities were updated
    const entity1 = facade.getEntity("moving1");
    const entity2 = facade.getEntity("moving2");

    expect(entity1.position.x).toBe(10);
    expect(entity1.position.y).toBe(5);
    expect(entity2.position.x).toBe(45);
    expect(entity2.position.y).toBe(60);
  });

  test("should handle state management through facade", () => {
    // Set and get state
    facade.setState("gameLevel", 3);
    facade.setState("score", 1000);
    facade.setState("playerName", "TestPlayer");

    expect(facade.getState("gameLevel")).toBe(3);
    expect(facade.getState("score")).toBe(1000);
    expect(facade.getState("playerName")).toBe("TestPlayer");

    // Update state
    facade.setState("score", 1500);
    expect(facade.getState("score")).toBe(1500);
  });

  test("should handle AI decision making through facade", () => {
    // Create an AI entity
    facade.createEntity("ai1", "ai", {
      position: { x: 100, y: 100 },
      energy: 100,
      intelligence: 0.8
    });

    // Make a decision
    const context = {
      threats: [{ x: 200, y: 200, type: "enemy" }],
      resources: [{ x: 50, y: 50, type: "food" }],
      timeOfDay: "day"
    };

    const decision = facade.makeDecision("ai1", context);
    expect(decision).toBeDefined();
    expect(decision.optimized).toBe(true);
  });

  test("should handle optimization levels through facade", () => {
    // Test different optimization levels
    facade.optimizeLevel(1);
    const stats1 = facade.getStats();
    expect(stats1.optimization).toBe(1);

    facade.optimizeLevel(3);
    const stats3 = facade.getStats();
    expect(stats3.optimization).toBe(3);

    facade.optimizeLevel(5);
    const stats5 = facade.getStats();
    expect(stats5.optimization).toBe(5);
  });

  test("should handle transactions through facade", () => {
    // Create a transaction
    const transaction = facade.beginTransaction();

    // Add operations to transaction
    transaction
      .createEntity("trans1", "test", { value: 1 })
      .createEntity("trans2", "test", { value: 2 })
      .updateEntity("trans1", { value: 10 });

    // Commit transaction
    const success = transaction.commit();
    expect(success).toBe(true);

    // Verify entities were created and updated
    const entity1 = facade.getEntity("trans1");
    const entity2 = facade.getEntity("trans2");

    expect(entity1.value).toBe(10);
    expect(entity2.value).toBe(2);
  });

  test("should provide comprehensive stats", () => {
    // Create some entities
    facade.createEntity("stat1", "test", { data: "value1" });
    facade.createEntity("stat2", "test", { data: "value2" });

    // Set some state
    facade.setState("testKey", "testValue");

    // Get stats
    const stats = facade.getStats();
    expect(stats).toBeDefined();
    expect(stats.entities).toBe(2);
    expect(stats.dimensionalState).toBeDefined();
    expect(stats.optimization).toBe(1);
    expect(stats.memoryUsage).toBeDefined();
  });
});

describe("Manifold Math Converter Integration", () => {
  let converter: ManifoldMathConverter;

  beforeEach(() => {
    converter = new ManifoldMathConverter();
  });

  test("should convert entity creation to manifold operations", () => {
    const initialState = converter.getCurrentState();

    const resultState = converter.convertEntityCreation("test1", "player", {
      position: { x: 100, y: 200 },
      velocity: { x: 5, y: 10 }
    });

    expect(resultState.id).toBeGreaterThan(initialState.id);
    expect(resultState.creation).toBeGreaterThan(initialState.creation);
    expect(resultState.geometry).toBeGreaterThan(initialState.geometry);

    // Verify entity was stored
    const entity = converter.getEntity("test1");
    expect(entity).toBeDefined();
    expect(entity.type).toBe("player");
    expect(entity.properties.position.x).toBe(100);
  });

  test("should convert entity updates to manifold operations", () => {
    // Create entity first
    converter.convertEntityCreation("update1", "test", {
      position: { x: 0, y: 0 },
      value: 10
    });

    const initialState = converter.getCurrentState();

    // Update entity
    const resultState = converter.convertEntityUpdate("update1", {
      position: { x: 50, y: 75 },
      value: 20,
      newProperty: "added"
    });

    expect(resultState.expression).toBeGreaterThan(initialState.expression);
    expect(resultState.geometry).toBeGreaterThan(initialState.geometry);

    // Verify entity was updated
    const entity = converter.getEntity("update1");
    expect(entity.properties.position.x).toBe(50);
    expect(entity.properties.position.y).toBe(75);
    expect(entity.properties.value).toBe(20);
    expect(entity.properties.newProperty).toBe("added");
  });

  test("should convert physics simulation to manifold operations", () => {
    // Create entities
    converter.convertEntityCreation("phys1", "body", {
      position: { x: 0, y: 0 },
      velocity: { x: 10, y: 5 }
    });

    const initialState = converter.getCurrentState();

    // Simulate physics
    const entities = [
      { id: "phys1", position: { x: 10, y: 5 }, velocity: { x: 10, y: 5 } }
    ];

    const resultState = converter.convertPhysicsSimulation(entities, 1.0);

    expect(resultState.geometry).toBeGreaterThan(initialState.geometry);
    expect(resultState.expression).toBeGreaterThan(initialState.expression);

    // Verify entity position was updated
    const entity = converter.getEntity("phys1");
    expect(entity.properties.position.x).toBe(10);
    expect(entity.properties.position.y).toBe(5);
  });

  test("should convert AI decisions to manifold operations", () => {
    // Create AI entity
    converter.convertEntityCreation("ai1", "ai", {
      position: { x: 100, y: 100 },
      energy: 100
    });

    const initialState = converter.getCurrentState();

    // Make decision
    const context = { threatLevel: "high", resources: 5 };
    const resultState = converter.convertDecisionMaking("ai1", context);

    expect(resultState.expression).toBeGreaterThan(initialState.expression);
    expect(resultState.relation).toBeGreaterThan(initialState.relation);

    // Verify decision context was stored
    const entity = converter.getEntity("ai1");
    expect(entity.decisionContext).toEqual(context);
    expect(entity.lastDecision).toBeDefined();
  });

  test("should convert optimization level changes to manifold operations", () => {
    const initialState = converter.getCurrentState();

    // Change optimization level
    const resultState = converter.convertOptimizationLevel(3);

    expect(resultState.governance).toBeGreaterThan(initialState.governance);
    expect(resultState.collapse).toBeGreaterThan(initialState.collapse);
  });

  test("should handle multiple entities and operations", () => {
    // Create multiple entities
    converter.convertEntityCreation("multi1", "type1", { x: 10, y: 20 });
    converter.convertEntityCreation("multi2", "type2", { x: 30, y: 40 });
    converter.convertEntityCreation("multi3", "type3", { x: 50, y: 60 });

    // Update one entity
    converter.convertEntityUpdate("multi1", { x: 15, y: 25 });

    // Get all entities
    const allEntities = converter.getAllEntities();
    expect(allEntities).toHaveLength(3);

    const entity1 = allEntities.find(e => e.id === "multi1");
    const entity2 = allEntities.find(e => e.id === "multi2");
    const entity3 = allEntities.find(e => e.id === "multi3");

    expect(entity1.properties.x).toBe(15);
    expect(entity1.properties.y).toBe(25);
    expect(entity2.properties.x).toBe(30);
    expect(entity2.properties.y).toBe(40);
    expect(entity3.properties.x).toBe(50);
    expect(entity3.properties.y).toBe(60);
  });

  test("should maintain manifold state consistency", () => {
    const initial = converter.getCurrentState();

    // Perform multiple operations
    converter.convertEntityCreation("consistency1", "test", { value: 1 });
    converter.convertEntityCreation("consistency2", "test", { value: 2 });
    converter.convertEntityUpdate("consistency1", { value: 10 });
    converter.convertPhysicsSimulation([], 1.0);
    converter.convertDecisionMaking("consistency2", { choice: "A" });

    const final = converter.getCurrentState();

    // Verify state evolved correctly
    expect(final.id).toBeGreaterThan(initial.id);
    expect(final.creation).toBeGreaterThan(initial.creation);
    expect(final.expression).toBeGreaterThan(initial.expression);
    expect(final.geometry).toBeGreaterThan(initial.geometry);
    expect(final.relation).toBeGreaterThan(initial.relation);

    // Verify entities exist
    const entity1 = converter.getEntity("consistency1");
    const entity2 = converter.getEntity("consistency2");

    expect(entity1.properties.value).toBe(10);
    expect(entity2.decisionContext.choice).toBe("A");
  });
});

describe("7-Segment Manifold State Integration", () => {
  test("should create and evolve manifold states correctly", () => {
    const initialState = createManifoldState();
    expect(initialState.id).toBe(0);
    expect(initialState.relation).toBe(0);
    expect(initialState.geometry).toBe(0);
    expect(initialState.expression).toBe(0);
    expect(initialState.collapse).toBe(0);
    expect(initialState.creation).toBe(0);
    expect(initialState.governance).toBe(0);

    // Test evolution with default segments
    const evolvedState = require("../core/manifold/7-segment-state").evolveManifold(
      initialState,
      require("../core/manifold/7-segment-state").defaultSegments
    );

    expect(evolvedState.id).toBeGreaterThan(0);
    expect(evolvedState.creation).toBeGreaterThan(0);
    expect(evolvedState.expression).toBeGreaterThan(0);
  });

  test("should normalize manifold states correctly", () => {
    const unnormalized = {
      id: 2.5,
      relation: -0.5,
      geometry: 1.2,
      expression: 0.8,
      collapse: 0.3,
      creation: 1.1,
      governance: -0.2
    };

    const normalized = require("../core/manifold/7-segment-state").normalizeManifoldState(unnormalized);

    expect(normalized.id).toBe(1);
    expect(normalized.relation).toBe(0);
    expect(normalized.geometry).toBe(1);
    expect(normalized.expression).toBe(0.8);
    expect(normalized.collapse).toBe(0.3);
    expect(normalized.creation).toBe(1);
    expect(normalized.governance).toBe(0);
  });

  test("should combine manifold states correctly", () => {
    const state1 = createManifoldState({ id: 0.1, expression: 0.2 });
    const state2 = createManifoldState({ id: 0.3, expression: 0.4 });
    const state3 = createManifoldState({ id: 0.2, expression: 0.1 });

    const combined = require("../core/manifold/7-segment-state").combineManifoldStates([state1, state2, state3]);

    expect(combined.id).toBe(0.6);
    expect(combined.expression).toBe(0.7);
  });

  test("should calculate manifold state distances correctly", () => {
    const state1 = createManifoldState({ id: 0.1, expression: 0.2 });
    const state2 = createManifoldState({ id: 0.4, expression: 0.6 });

    const distance = require("../core/manifold/7-segment-state").manifoldStateDistance(state1, state2);

    // Distance should be positive and reasonable
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(10);
  });
});