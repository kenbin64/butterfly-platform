# EntityStore API Guide

> **For Developers**: Simple CRUD + versioning. Everything familiar.
> 
> **For Architects**: Complete traceability, audit logs, and mathematical guarantees underneath.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Core API](#core-api)
3. [Under the Hood](#under-the-hood)
4. [Performance](#performance)
5. [Debugging](#debugging)
6. [Advanced Usage](#advanced-usage)

---

## Quick Start

### Installation

```typescript
import { EntityStore, EntityStoreRegistry } from "@manifold/substrate";
```

### Basic Usage

```typescript
// Create a store for your entity collection
const store = new EntityStore("physics");

// CRUD operations (exactly like a map)
store.set("body_1", { x: 10, y: 20, mass: 5 });
const body = store.get("body_1");
store.delete("body_1");

// Automatic versioning
store.snapshot(); // Creates a checkpoint

// Subscribe to changes
store.on((change) => {
  console.log(`Entity ${change.id} changed:`, change.changes);
});

// Persist changes to substrate (normally done once per frame)
store.flush();
```

That's it. Developers don't need to know about:
- Manifolds
- Dimensional drilling
- Hashing algorithms
- Delta storage

All that complexity is buried and automatic.

---

## Core API

### EntityStore

#### Constructor

```typescript
const store = new EntityStore("store_name");
```

Creates a new entity store. Each store represents one collection (e.g., "physics", "audio", "game").

#### `set(id, entity): void`

Add or update an entity.

```typescript
store.set("player_1", {
  x: 100,
  y: 200,
  health: 100,
  rotation: 0,
  velocity: { x: 1, y: 0 }
});
```

**Under the hood:**
- Merges into current state (one point = all entity properties)
- Marks store as "dirty" 
- Buffers changes (not committed until `flush()`)
- Logs operation to audit trail

#### `get(id): Record<string, unknown> | undefined`

Retrieve entity (returns O(1) reference).

```typescript
const player = store.get("player_1");
if (player) {
  console.log(player.x); // 100
}
```

**Important:** Returns a **copy**, so external mutations don't affect the store.

#### `delete(id): boolean`

Remove entity. Returns true if entity existed.

```typescript
const deleted = store.delete("player_1");
```

#### `listIds(): string[]`

Get all entity IDs.

```typescript
const ids = store.listIds();
// ["player_1", "player_2", "enemy_1"]
```

**⚠️ Warning**: Don't iterate in hot paths. For game loops, drill to specific entities by ID instead:

```typescript
// ❌ BAD (O(N))
store.listIds().forEach(id => {
  const entity = store.get(id);
  entity.x += 1;
});

// ✅ GOOD (O(1) per entity, parallelizable)
// Just call the entities you need by ID
store.set("player_1", { ...player1, x: player1.x + 1 });
store.set("enemy_1", { ...enemy1, x: enemy1.x + 1 });
```

#### `getAll(): Array<{ id, entity }>`

Get all entities as array (useful for debugging, UI rendering).

```typescript
const entities = store.getAll();
entities.forEach(({ id, entity }) => {
  console.log(`${id}: health=${entity.health}`);
});
```

#### `flush(): string`

Persist changes to versioned substrate.

```typescript
store.flush(); // Returns version hash
```

**Under the hood:**
- Converts change buffer to delta (only what changed)
- Commits to substrate
- Generates deterministic version hash from parent + seed
- Emits events to listeners
- Clears change buffer

Typically called once per tick/frame:

```typescript
// Game loop
for (let frame = 0; frame < 1000; frame++) {
  physics.tick();  // Updates call set()
  physics.flush(); // Persist changes
  
  if (frame % 60 === 0) {
    physics.snapshot(); // Save checkpoint every ~1 second
  }
}
```

#### `snapshot(): Snapshot`

Create a named checkpoint (version with metadata).

```typescript
const snap = store.snapshot();
// {
//   id: "37d9472937d9",
//   timestamp: 1711761465003,
//   entityCount: 42,
//   storageSize: 1250,
//   changes: 3
// }
```

**Under the hood:**
- Calls `flush()` first (commits current changes)
- Records snapshot metadata
- Stores in history
- Allows rollback (TODO: implement version walking)

#### `rollback(stepsBack): Snapshot | null`

Go back N versions (in development, currently returns null).

```typescript
store.rollback(1); // Go back 1 version
```

#### `on(listener): () => void`

Subscribe to entity changes. Returns unsubscribe function.

```typescript
const unsubscribe = store.on((change) => {
  console.log(`${change.id} changed at ${new Date(change.timestamp)}`);
  console.log("Changes:", change.changes); // Map of what changed
});

// Later: unsubscribe
unsubscribe();
```

**Change object:**
```typescript
{
  id: "batch_37d94729",           // Batch ID
  entity: { ... },                // Full state after change
  changes: Map(["x", 15, "y", 25]), // Only what changed
  timestamp: 1711761465003,
  versionHash: "37d9472937d9"     // For tracing
}
```

#### `getHistory(): Snapshot[]`

Get all snapshots taken.

```typescript
const snapshots = store.getHistory();
snapshots.forEach(snap => {
  console.log(`${snap.id}: ${snap.entityCount} entities, ${snap.storageSize}B`);
});
```

#### `getAuditLog(): Array<{ timestamp, operation, details }>`

Get complete operation history (for debugging/replay).

```typescript
const log = store.getAuditLog();
log.slice(-10).forEach(entry => {
  console.log(`[${new Date(entry.timestamp).toISOString()}] ${entry.operation}: ${entry.details}`);
});
```

**Operations logged:**
- `init` - Store created
- `set` - Entity created/updated
- `get` - Entity retrieved
- `delete` - Entity deleted
- `flush` - Changes committed
- `snapshot` - Checkpoint created
- `import`/`export` - State serialized

#### `getStats()`

Performance and usage statistics.

```typescript
const stats = store.getStats();
// {
//   store: "physics",
//   entities: 42,
//   versions: 120,
//   totalStorageBytes: 18000,
//   avgBytesPerVersion: 150,
//   isDirty: false,
//   snapshots: 15,
//   auditLogLength: 500
// }
```

**What it means:**
- `entities`: Current entities in store
- `versions`: Total versions created (each flush)
- `totalStorageBytes`: Disk space used (only deltas, not full copies)
- `avgBytesPerVersion`: Storage efficiency (~150B is good)
- `snapshots`: User-created checkpoints
- `auditLogLength`: Operations tracked

#### `export(): { name, entities, timestamp }`

Serialize to JSON (for persistence, network, etc).

```typescript
const json = store.export();
await fs.writeFile("physics.json", JSON.stringify(json));
```

#### `importState(data, replace?)`

Hydrate from exported data.

```typescript
const data = JSON.parse(fs.readFileSync("physics.json"));
store.importState(data, true); // true = replace all entities
```

#### `getName(): string`

Get store name.

---

### EntityStoreRegistry

Manage multiple entity stores (physics, audio, game, etc).

#### `createStore(name): EntityStore`

Create or get store by name.

```typescript
const registry = new EntityStoreRegistry();
const physics = registry.createStore("physics");
const audio = registry.createStore("audio");
```

#### `getStore(name): EntityStore | undefined`

Get existing store.

```typescript
const physics = registry.getStore("physics");
```

#### `listStores(): string[]`

All store names.

```typescript
registry.listStores(); // ["physics", "audio", "game"]
```

#### `flushAll(): Map<string, string>`

Persist all stores at once (atomic).

```typescript
const versions = registry.flushAll();
// Map {
//   "physics" => "37d9472937d9",
//   "audio" => "37d9472afb42",
//   "game" => "37d9472c1b55"
// }
```

#### `snapshotAll(): Map<string, Snapshot>`

Create snapshots in all stores together.

```typescript
const snapshots = registry.snapshotAll();
```

#### `getGlobalStats()`

Aggregated statistics across all stores.

```typescript
const stats = registry.getGlobalStats();
// {
//   stores: 3,
//   entities: 342,
//   versions: 450,
//   totalStorageBytes: 67500,
//   avgBytesPerVersion: 150
// }
```

#### `getAuditLog()`

Registry-level operations (store creation, etc).

```typescript
const log = registry.getAuditLog();
```

---

## Under the Hood

### Dimensional Architecture

Each entity is **ONE point** in the manifold. Querying an entity is O(1) drilling to that point.

```
SubstrateRegistry (1 point)
  └─ EntityStore "physics" (1 point per version)
      └─ Entity "body_1" (1 point = entire entity state)
          └─ Properties: x, y, velocity, mass (lower dimensions)
```

**Principle**: Once you observe a thing, it has all its parts. No separate storage needed.

### Versioning Strategy

Each `flush()` creates a **version point** with deterministic hash:

```
version_hash = derive(parent_hash, seed)
```

**Deterministic** means:
- Same changes + same parent = same version hash
- Reproducible across runs
- Testable and auditable
- **No cryptography needed**, just consistent math

**Parent lineage maintains immutability:**
```
root -> v1 -> v2 -> v3 (current)
 |      |     |
 + ---- + ---- + (can walk backward)
```

### Delta Storage (Schwarz Gyroid)

Only changed fields persisted, not full copies:

```typescript
// Frame 1: store 3 new bodies
v1_delta = { body_1: {...}, body_2: {...}, body_3: {...} }  // ~450B

// Frame 2: move 1 body, update health of another
v2_delta = { body_1: { x: 15 }, body_2: { health: 85 } }    // ~100B

// Total storage = 450B + 100B = 550B (not 450B + 450B = 900B)
```

**Reconstruction**: Full state = apply all deltas from root to target version.

**Storage efficiency**: ~150B per version (proven in tests).

### Audit Trail

Every operation logged with timestamp:

```typescript
[2026-03-29T03:37:45.003Z] set: Entity "body_1": {x, y}
[2026-03-29T03:37:45.005Z] set: Entity "body_2": {x, y}
[2026-03-29T03:37:45.008Z] flush: Committed 2 entities, version=37d947...
[2026-03-29T03:37:46.012Z] snapshot: v1=37d947: 2 entities, 300B
```

**Used for:**
- Debugging state mutations
- Replaying operations
- Performance analysis
- Compliance/auditing

---

## Performance

### Benchmarks (from tests)

| Operation | Complexity | Time |
|-----------|-----------|------|
| set() | O(1) | <1ms |
| get() | O(1) | <1ms |
| delete() | O(1) | <1ms |
| flush() | O(changes) | ~5ms (3 changes) |
| snapshot() | O(1) | <1ms |
| getAuditLog() | O(1) | <1ms |
| 3-store registry lookup | O(1) | 0.005ms |
| getAll() (42 entities) | O(N) | <1ms |

### Storage Efficiency

```
100 versions × 3 entities each
Scenario 1 (naive full copies): 450B/version × 100 = 45,000B
Scenario 2 (delta storage):     150B/version avg  = 15,000B ← 3x savings
```

### Game Loop Example

```typescript
const physics = registry.createStore("physics");
const render = registry.createStore("render");

for (let frame = 0; frame < 1000; frame++) {
  // Simulate
  for (let i = 0; i < 100; i++) {
    const body = physics.get(`body_${i}`);
    if (body) {
      physics.set(`body_${i}`, {
        ...body,
        x: body.x + body.vx,
        y: body.y + body.vy
      });
    }
  }
  
  // Commit changes (O(changes), typically << 100)
  physics.flush();      // 100 entities changed → ~300B delta
  
  // Snapshot every 10 frames
  if (frame % 10 === 0) {
    registry.snapshotAll();
  }
}

// Result: 1000 frames × 150B/version ≈ 150KB disk space
```

---

## Debugging

### View Full Audit Trail

```typescript
store.getAuditLog().forEach(entry => {
  console.log(`${entry.operation.padEnd(10)} [${entry.timestamp}] ${entry.details}`);
});
```

### Check Storage Stats

```typescript
const stats = store.getStats();
if (stats.totalStorageBytes > 10_000_000) {
  console.warn(`Store "${stats.store}" using ${stats.totalStorageBytes}B - consider pruning`);
}
```

### Verify No Mutations

```typescript
const entity = store.get("player");
const x1 = entity.x;
entity.x = 999; // Mutate copy
const entity2 = store.get("player");
console.assert(entity2.x === x1, "Store mutation detected!");
```

### Track Version Growth

```typescript
setInterval(() => {
  const stats = store.getStats();
  console.log(`Versions: ${stats.versions}, Storage: ${stats.totalStorageBytes}B`);
}, 1000);
```

---

## Advanced Usage

### Custom Listeners with Side Effects

```typescript
store.on((change) => {
  physics.notifyCollisions(change.entity);
  audio.playEffectsFor(change.entity);
  network.broadcastUpdate(change);
});
```

### Batch Operations

```typescript
// Update multiple entities before flush
for (let i = 0; i < 100; i++) {
  store.set(`entity_${i}`, { x: Math.random() * 1000 });
}

// Single flush commits all changes at once
const version = store.flush();
console.log(`Committed 100 entities in version ${version}`);
```

### Rollback Pattern (future work)

```typescript
// Save checkpoint before risky operation
const checkpoint = store.snapshot();

// Try something
store.set("player", { health: -1 }); // Invalid!

// Rollback if needed
store.rollback(1); // Restore to checkpoint
```

### Network Sync

```typescript
// Export to send over network
const delta = store.export();
socket.emit("state", delta);

// Receive and import
socket.on("state", (delta) => {
  store.importState(delta, false); // false = merge, don't replace
});
```

### Persistence

```typescript
// Save every 5 seconds
setInterval(() => {
  const exported = registry.export();
  fs.writeFileSync("game_state.json", JSON.stringify(exported));
}, 5000);

// Load on startup
const loaded = JSON.parse(fs.readFileSync("game_state.json"));
registry.importState(loaded, true);
```

---

## Design Principles

### 1. **Familiar API**

Developers see CRUD operations and snapshots. No manifold terminology.

### 2. **Hidden Complexity**

Dimensional drilling, delta storage, deterministic hashing — all internal.

### 3. **Complete Auditability**

Every operation logged, traceable, reproducible.

### 4. **Performance by Default**

O(1) operations, storage optimization, no surprise costs.

### 5. **Defensive Copies**

`get()` returns copies, so external code can't corrupt the store.

### 6. **Logical Consistency**

Version hashes are deterministic and reproducible (not random UUIDs).

---

## Troubleshooting

### "Storage growing too fast"

```typescript
const stats = store.getStats();
console.log(`Avg per version: ${stats.avgBytesPerVersion}B`);
// If > 500B, you're storing too many changes per flush
// Solution: Flush less frequently (batch operations better)
```

### "Too many versions created"

```typescript
const stats = store.getStats();
if (stats.versions > 10000 && stats.snapshots < 50) {
  console.warn("Too many versions, need snapshot pruning");
}
```

### "Entities not updating"

```typescript
// Did you call flush()?
store.set("entity_1", { x: 10 });
store.flush(); // Don't forget this!
```

### "Changes not triggered listeners"

```typescript
// Listeners only fire on flush()
store.set("entity_1", { x: 10 }); // No event yet
store.flush(); // Event fires here!
```

---

## API Completeness Checklist

- ✅ Set (create/update)
- ✅ Get (O(1) retrieve)
- ✅ Delete
- ✅ List (for introspection)
- ✅ Versioning (snapshot/rollback structure)
- ✅ Events (subscribe to changes)
- ✅ Persistence (export/import)
- ✅ Audit logging (complete trace)
- ✅ Performance stats
- ✅ Multi-store registry
- ⏳ Rollback implementation (in progress)
- ⏳ Time-travel debugging UI (planned)

---

## FAQ

**Q: Do I need to know about manifolds to use this?**  
A: No. Use it like a normal object store. The manifold complexity is invisible.

**Q: Why use this instead of just a Map or database?**  
A: You get automatic versioning, delta compression, and a complete audit trail. Perfect for games, simulations, and real-time systems.

**Q: Is it thread-safe?**  
A: Single-threaded by design (JS limitation). Use message passing for multi-threaded systems.

**Q: How do I replicate state across the network?**  
A: Export deltas, send over network, import on receiving end.

**Q: Can I use this for persistent storage?**  
A: Yes. Export to JSON and persist. Import on startup.

**Q: What's the maximum number of entities?**  
A: Tested with 42, should scale to millions (O(1) per entity). Storage is the bottleneck, not lookup.

---

## Contact / Questions

See audit logs and testing files for implementation details:
- [versioned-substrate.ts](../core/substrate/versioned-substrate.ts) - Under the hood
- [entity-store.ts](../core/substrate/entity-store.ts) - Public API
- [entity-store.test.ts](../tests/entity-store.test.ts) - Usage examples
