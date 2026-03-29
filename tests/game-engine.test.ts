import { GameEngine } from "../app/src/engine/game-engine";

describe("GameEngine", () => {
  let gameEngine: GameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine();
  });

  afterEach(() => {
    gameEngine.stop();
  });

  test("should initialize with default settings", () => {
    const stats = gameEngine.getStats();
    expect(stats).toBeDefined();
    expect(stats.status).toBe("initialized");
    expect(stats.entities).toBeDefined();
    expect(stats.entities).toBe(0);
  });

  test("should start and stop engine", () => {
    gameEngine.start();
    expect(gameEngine.getStats().status).toBe("running");
    
    gameEngine.stop();
    expect(gameEngine.getStats().status).toBe("stopped");
  });

  test("should create and manage entities", () => {
    const entityId = "test-entity";
    const entityData = {
      position: { x: 100, y: 200 },
      velocity: { vx: 5, vy: 10 },
      health: 100
    };

    gameEngine.createEntity(entityId, "player", entityData);
    expect(gameEngine.getAllEntities()).toHaveLength(1);
    
    const entity = gameEngine.getEntity(entityId);
    expect(entity).toBeDefined();
    expect(entity.id).toBe(entityId);
    expect(entity.type).toBe("player");
    expect(entity.position.x).toBe(100);
    expect(entity.position.y).toBe(200);

    gameEngine.removeEntity(entityId);
    expect(gameEngine.getAllEntities()).toHaveLength(0);
  });

  test("should update entity properties", () => {
    const entityId = "update-entity";
    gameEngine.createEntity(entityId, "enemy", {
      position: { x: 0, y: 0 },
      velocity: { vx: 0, vy: 0 },
      health: 100
    });

    const newPosition = { x: 50, y: 75 };
    const newVelocity = { vx: 10, vy: 5 };
    
    gameEngine.updateEntity(entityId, {
      position: newPosition,
      velocity: newVelocity
    });

    const entity = gameEngine.getEntity(entityId);
    expect(entity.position.x).toBe(50);
    expect(entity.position.y).toBe(75);
    expect(entity.velocity.vx).toBe(10);
    expect(entity.velocity.vy).toBe(5);
  });

  test("should handle entity types correctly", () => {
    gameEngine.createEntity("player1", "player", { position: { x: 0, y: 0 }, health: 100 });
    gameEngine.createEntity("enemy1", "enemy", { position: { x: 100, y: 100 }, health: 50 });
    gameEngine.createEntity("item1", "item", { position: { x: 50, y: 50 }, value: 10 });

    const allEntities = gameEngine.getAllEntities();
    expect(allEntities).toHaveLength(3);
    
    const player = allEntities.find(e => e.type === "player");
    const enemy = allEntities.find(e => e.type === "enemy");
    const item = allEntities.find(e => e.type === "item");

    expect(player).toBeDefined();
    expect(enemy).toBeDefined();
    expect(item).toBeDefined();
    expect(player?.id).toBe("player1");
    expect(enemy?.id).toBe("enemy1");
    expect(item?.id).toBe("item1");
  });

  test("should update entities over time", async () => {
    const entityId = "moving-entity";
    gameEngine.createEntity(entityId, "player", {
      position: { x: 0, y: 0 },
      velocity: { vx: 10, vy: 5 },
      health: 100
    });

    gameEngine.start();
    
    // Wait for a few game updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const entity = gameEngine.getEntity(entityId);
    expect(entity.position.x).toBeGreaterThan(0);
    expect(entity.position.y).toBeGreaterThan(0);
    
    gameEngine.stop();
  });

  test("should handle entity removal gracefully", () => {
    const entityId = "test-entity";
    gameEngine.createEntity(entityId, "player", { position: { x: 0, y: 0 }, health: 100 });
    
    expect(gameEngine.getEntity(entityId)).toBeDefined();
    
    gameEngine.removeEntity(entityId);
    expect(gameEngine.getEntity(entityId)).toBeUndefined();
    
    // Removing non-existent entity should not throw
    expect(() => gameEngine.removeEntity("non-existent")).not.toThrow();
  });

  test("should return undefined for non-existent entity", () => {
    const entity = gameEngine.getEntity("non-existent");
    expect(entity).toBeUndefined();
  });

  test("should handle multiple entities", () => {
    const entities = [
      { id: "entity1", type: "player", x: 0, y: 0 },
      { id: "entity2", type: "enemy", x: 10, y: 10 },
      { id: "entity3", type: "item", x: 20, y: 20 }
    ];

    entities.forEach(entity => {
      gameEngine.createEntity(entity.id, entity.type, {
        position: { x: entity.x, y: entity.y },
        velocity: { vx: 0, vy: 0 },
        health: 100
      });
    });

    expect(gameEngine.getAllEntities()).toHaveLength(3);
    
    const allEntities = gameEngine.getAllEntities();
    expect(allEntities.some(e => e.id === "entity1")).toBe(true);
    expect(allEntities.some(e => e.id === "entity2")).toBe(true);
    expect(allEntities.some(e => e.id === "entity3")).toBe(true);
  });

  test("should handle entity updates with partial data", () => {
    const entityId = "partial-update-entity";
    gameEngine.createEntity(entityId, "player", {
      position: { x: 100, y: 200 },
      velocity: { vx: 5, vy: 10 },
      health: 100,
      score: 0
    });

    // Update only position and score
    gameEngine.updateEntity(entityId, {
      position: { x: 150, y: 250 },
      score: 50
    });

    const entity = gameEngine.getEntity(entityId);
    expect(entity.position.x).toBe(150);
    expect(entity.position.y).toBe(250);
    expect(entity.score).toBe(50);
    // Other properties should remain unchanged
    expect(entity.velocity.vx).toBe(5);
    expect(entity.velocity.vy).toBe(10);
    expect(entity.health).toBe(100);
  });

  test("should handle entity collision detection", () => {
    const entity1Id = "entity1";
    const entity2Id = "entity2";
    
    gameEngine.createEntity(entity1Id, "player", {
      position: { x: 0, y: 0 },
      velocity: { vx: 0, vy: 0 },
      health: 100
    });
    
    gameEngine.createEntity(entity2Id, "enemy", {
      position: { x: 10, y: 10 },
      velocity: { vx: 0, vy: 0 },
      health: 50
    });

    const entity1 = gameEngine.getEntity(entity1Id);
    const entity2 = gameEngine.getEntity(entity2Id);

    // Simple distance check for collision
    const distance = Math.sqrt(
      Math.pow(entity2.position.x - entity1.position.x, 2) +
      Math.pow(entity2.position.y - entity1.position.y, 2)
    );

    expect(distance).toBeLessThan(20); // Should be close enough to consider collision
  });

  test("should provide comprehensive stats", () => {
    gameEngine.createEntity("player1", "player", { position: { x: 0, y: 0 }, health: 100 });
    gameEngine.createEntity("enemy1", "enemy", { position: { x: 100, y: 100 }, health: 50 });

    const stats = gameEngine.getStats();
    expect(stats).toBeDefined();
    expect(stats.status).toBe("initialized");
    expect(stats.entities).toBe(2);
    expect(stats.memoryUsage).toBeDefined();
  });
});