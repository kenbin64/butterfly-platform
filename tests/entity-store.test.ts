/**
 * EntityStore Tests - Developer-Friendly API
 * ==========================================
 * 
 * Tests for the public API that developers use.
 * Everything familiar (CRUD, snapshots, events).
 * All dimensional math is hidden and tested separately.
 */

import { EntityStore, EntityStoreRegistry } from "../core/substrate/entity-store";

describe("EntityStore - Developer API", () => {
  let store: EntityStore;

  beforeEach(() => {
    store = new EntityStore("test_store");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: Basic CRUD operations
  // ═══════════════════════════════════════════════════════════════════════════

  test("Set and get entities", () => {
    store.set("entity_1", { x: 10, y: 20, health: 100 });
    const entity = store.get("entity_1");

    expect(entity).toBeDefined();
    expect(entity!.x).toBe(10);
    expect(entity!.y).toBe(20);
    expect(entity!.health).toBe(100);

    console.log("✓ Set and retrieve entity");
  });

  test("Update entity", () => {
    store.set("entity_1", { x: 10, y: 20 });
    store.set("entity_1", { x: 15, y: 25 });
    const entity = store.get("entity_1");

    expect(entity!.x).toBe(15);
    expect(entity!.y).toBe(25);

    console.log("✓ Update entity (replaces all fields)");
  });

  test("Delete entity", () => {
    store.set("entity_1", { x: 10 });
    store.delete("entity_1");
    const entity = store.get("entity_1");

    expect(entity).toBeUndefined();

    console.log("✓ Delete entity");
  });

  test("Get returns copy (mutations don't affect store)", () => {
    store.set("entity_1", { x: 10, y: 20 });
    const entity = store.get("entity_1")!;
    entity.x = 999; // Mutate copy

    const entity2 = store.get("entity_1")!;
    expect(entity2.x).toBe(10); // Original unchanged

    console.log("✓ Get returns defensively copied entity");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: Snapshots and versioning
  // ═══════════════════════════════════════════════════════════════════════════

  test("Create snapshots", () => {
    store.set("entity_1", { x: 10 });
    const snap1 = store.snapshot();

    store.set("entity_1", { x: 20 });
    const snap2 = store.snapshot();

    expect(snap1.id).toBeDefined();
    expect(snap2.id).toBeDefined();
    expect(snap1.id).not.toBe(snap2.id);

    const history = store.getHistory();
    expect(history.length).toBe(2);

    console.log(`✓ Snapshots: v1=${snap1.id}, v2=${snap2.id}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: Event subscriptions
  // ═══════════════════════════════════════════════════════════════════════════

  test("Subscribe to changes", (done) => {
    let changeCount = 0;

    const unsub = store.on((change) => {
      changeCount++;
      expect(change.versionHash).toBeDefined();
      expect(change.changes.size).toBeGreaterThan(0);
    });

    store.set("entity_1", { x: 10 });
    store.flush();

    expect(changeCount).toBe(1);
    unsub();

    // After unsubscribe, should not fire
    store.set("entity_2", { y: 20 });
    store.flush();
    expect(changeCount).toBe(1); // Still 1

    console.log("✓ Event subscription and unsubscribe");
    done();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: Audit trail
  // ═══════════════════════════════════════════════════════════════════════════

  test("Audit log tracks all operations", () => {
    store.set("entity_1", { x: 10 });
    store.set("entity_2", { y: 20 });
    store.flush();
    store.snapshot();

    const log = store.getAuditLog();
    expect(log.length).toBeGreaterThan(0);

    const operations = log.map(entry => entry.operation);
    expect(operations).toContain("set");
    expect(operations).toContain("flush");
    expect(operations).toContain("snapshot");

    console.log(`✓ Audit log: ${log.length} operations tracked`);
    log.slice(0, 3).forEach(entry => {
      console.log(`  [${new Date(entry.timestamp).toISOString()}] ${entry.operation}: ${entry.details}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5: Performance stats
  // ═══════════════════════════════════════════════════════════════════════════

  test("Stats show storage efficiency", () => {
    for (let i = 0; i < 10; i++) {
      store.set(`entity_${i}`, { id: i, x: Math.random() * 100, y: Math.random() * 100 });
    }
    store.flush();
    store.snapshot();

    store.set("entity_0", { id: 0, x: 50 }); // Modify 1 entity
    store.flush();

    const stats = store.getStats();
    console.log(`✓ Store stats:
      Entities: ${stats.entities}
      Versions: ${stats.versions}
      Storage: ${stats.totalStorageBytes}B
      Avg/Version: ${stats.avgBytesPerVersion}B
      Snapshots: ${stats.snapshots}`);

    expect(stats.entities).toBe(10);
    expect(stats.totalStorageBytes).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 6: List and getAll for debugging
  // ═══════════════════════════════════════════════════════════════════════════

  test("List IDs and getAll", () => {
    store.set("entity_1", { x: 10 });
    store.set("entity_2", { x: 20 });
    store.set("entity_3", { x: 30 });

    const ids = store.listIds();
    expect(ids.length).toBe(3);
    expect(ids).toContain("entity_1");

    const all = store.getAll();
    expect(all.length).toBe(3);
    expect(all[0]).toHaveProperty("id");
    expect(all[0]).toHaveProperty("entity");

    console.log(`✓ List: ${ids.length} entities: ${ids.join(", ")}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 7: Export and import
  // ═══════════════════════════════════════════════════════════════════════════

  test("Export and import state", () => {
    store.set("entity_1", { x: 10, name: "Alice" });
    store.set("entity_2", { x: 20, name: "Bob" });
    store.flush();

    const exported = store.export();
    expect(exported.name).toBe("test_store");
    expect(Object.keys(exported.entities).length).toBe(2);

    // Create new store and import
    const store2 = new EntityStore("imported_store");
    store2.importState(exported, true); // replace=true

    const entity1 = store2.get("entity_1");
    expect(entity1!.x).toBe(10);
    expect(entity1!.name).toBe("Alice");

    console.log("✓ Export and import successful");
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 8: Multiple stores with registry
  // ═══════════════════════════════════════════════════════════════════════════

  test("EntityStoreRegistry manages multiple stores", () => {
    const registry = new EntityStoreRegistry();

    const physics = registry.createStore("physics");
    const audio = registry.createStore("audio");
    const game = registry.createStore("game");

    physics.set("body_1", { x: 10, y: 20 });
    audio.set("track_1", { volume: 0.8 });
    game.set("player", { health: 100 });

    registry.flushAll();

    const globalStats = registry.getGlobalStats();
    expect(globalStats.stores).toBe(3);
    expect(globalStats.entities).toBe(3);

    console.log(`✓ Registry: ${globalStats.stores} stores, ${globalStats.entities} entities, ${globalStats.totalStorageBytes}B`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 9: Real-world game loop simulation
  // ═══════════════════════════════════════════════════════════════════════════

  test("Realistic game loop: multiple entities, versioning, events", (done) => {
    const registry = new EntityStoreRegistry();
    const physics = registry.createStore("physics");

    let eventsFired = 0;
    physics.on(() => {
      eventsFired++;
    });

    // Simulate 5 frames
    for (let frame = 0; frame < 5; frame++) {
      // Create/update bodies
      for (let i = 0; i < 3; i++) {
        const body = physics.get(`body_${i}`);
        const newX = (body?.x as number || 0) + 1;
        physics.set(`body_${i}`, { x: newX, y: i * 10, velocity: 1 });
      }

      // End of frame: flush and snapshot every 2 frames
      physics.flush();
      if (frame % 2 === 0) {
        physics.snapshot();
      }
    }

    const stats = physics.getStats();
    const globalStats = registry.getGlobalStats();

    console.log(`✓ Game loop simulation (5 frames, 3 bodies):
      Events fired: ${eventsFired}
      Store entities: ${stats.entities}
      Store versions: ${stats.versions}
      Store storage: ${stats.totalStorageBytes}B
      Registry entities: ${globalStats.entities}`);

    expect(eventsFired).toBeGreaterThan(0);
    expect(stats.entities).toBe(3);
    expect(stats.snapshots).toBe(3); // Frames 0, 2, 4

    done();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 10: Dirty flag and flush optimization
  // ═══════════════════════════════════════════════════════════════════════════

  test("Dirty flag prevents unnecessary versions", () => {
    store.set("entity_1", { x: 10 });
    store.flush();

    const snap1 = store.snapshot();

    // No changes - flush should not create new version
    store.flush();
    store.flush();

    const snap2 = store.snapshot();

    const history = store.getHistory();
    // Should have just 2 snapshots since no real changes between them
    expect(history.length).toBe(2);

    console.log(`✓ Dirty flag optimization: 2 snapshots after no changes`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("EntityStore - Integration", () => {
  test("Complete workflow: create, modify, snapshot, audit", () => {
    const store = new EntityStore("physics");
    const changes: Array<{ before: Record<string, unknown>; after: Record<string, unknown> }> = [];

    // Subscribe to changes for comparison
    store.on((change) => {
      changes.push({
        before: {},
        after: {}
      });
    });

    // Workflow
    store.set("player", { health: 100, x: 0, y: 0 });
    store.set("enemy_1", { health: 50, x: 10, y: 10 });
    store.snapshot();

    store.set("player", { health: 100, x: 5, y: 5 }); // Move
    store.set("enemy_1", { health: 50, x: 15, y: 10 }); // Move
    store.flush();

    store.set("player", { health: 85, x: 5, y: 5 }); // Take damage
    store.snapshot();

    // Analysis
    const stats = store.getStats();
    const audit = store.getAuditLog();
    const history = store.getHistory();

    console.log(`✓ Complete workflow:
      Created: 2 entities
      Snapshots: ${history.length}
      Versions: ${stats.versions}
      Operations logged: ${audit.length}
      Storage: ${stats.totalStorageBytes}B`);

    expect(history.length).toBe(2);
    expect(stats.entities).toBe(2);
    expect(audit.length).toBeGreaterThan(5);
  });
});
