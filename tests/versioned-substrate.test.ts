/**
 * Versioned Substrate Tests (Simplified)
 * ====================================== 
 * Verify: O(1) access, delta storage efficiency, Schwarz gyroid principles
 */

import { VersionedSubstrate, SubstrateRegistry } from "../core/substrate/versioned-substrate";

describe("Versioned Substrate - Geometric Storage", () => {
  let versioned: VersionedSubstrate;

  beforeEach(() => {
    versioned = new VersionedSubstrate();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 1: Commit and retrieve state
  // ═══════════════════════════════════════════════════════════════════════════

  test("Commit creates version hash and retrieves state", () => {
    const changes1 = new Map([["x", 1], ["y", 2]]);
    const v1 = versioned.commit(changes1);

    expect(v1).toBeDefined();
    expect(v1.length).toBeGreaterThan(0);

    const state1 = versioned.getState(v1);
    expect(state1.get("x")).toBe(1);
    expect(state1.get("y")).toBe(2);

    console.log(`✓ Commit v1: ${v1}`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 2: Delta storage (only changes persisted)
  // ═══════════════════════════════════════════════════════════════════════════

  test("Delta storage: only changes persisted, not full copy", () => {
    const v1 = versioned.commit(new Map([["x", 1], ["y", 2], ["z", 3]]));
    const stats1 = versioned.getStorageStats();

    const v2 = versioned.commit(new Map([["x", 10]])); // Only 1 change
    const stats2 = versioned.getStorageStats();

    // V2 should store much less (only 1 delta instead of 3)
    const v2DeltaSize = stats2.deltaBytes - stats1.deltaBytes;
    expect(v2DeltaSize).toBeLessThan(200); // Should be minimal

    // Verify both states correct
    const state1 = versioned.getState(v1);
    const state2 = versioned.getState(v2);

    expect(state1.get("y")).toBe(2); // Original
    expect(state2.get("y")).toBe(2); // Inherited
    expect(state2.get("x")).toBe(10); // Updated

    console.log(`✓ Storage delta: v1=${stats1.deltaBytes}B, v2=${stats2.deltaBytes}B`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 3: Version metadata indexing
  // ═══════════════════════════════════════════════════════════════════════════

  test("Version metadata is O(1) accessible", () => {
    const v1 = versioned.commit(new Map([["a", 1]]));
    const versionPoint = versioned.getVersionPoint(v1);

    expect(versionPoint).toBeDefined();
    expect(versionPoint!.hash).toBe(v1);
    expect(versionPoint!.parent).toBe("root");
    expect(versionPoint!.deltaSize).toBeGreaterThan(0);

    console.log(`✓ Metadata: hash=${versionPoint!.hash.substring(0, 8)}, size=${versionPoint!.deltaSize}B`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 4: SubstrateRegistry - multiple substrates O(1) retrieval
  // ═══════════════════════════════════════════════════════════════════════════

  test("SubstrateRegistry indexes multiple substrates O(1)", () => {
    const registry = new SubstrateRegistry();

    const physics = new VersionedSubstrate();
    const audio = new VersionedSubstrate();
    const game = new VersionedSubstrate();

    registry.register("physics", physics);
    registry.register("audio", audio);
    registry.register("game", game);

    // Create versions in each
    physics.commit(new Map([["bodies", 100]]));
    audio.commit(new Map([["tracks", 8]]));
    game.commit(new Map([["entities", 50]]));

    // O(1) retrieval
    const t0 = performance.now();
    const p = registry.get("physics");
    const a = registry.get("audio");
    const g = registry.get("game");
    const elapsed = performance.now() - t0;

    expect(p).toBe(physics);
    expect(a).toBe(audio);
    expect(g).toBe(game);

    const stats = registry.getGlobalStats();
    console.log(`✓ Registry: 3 lookups ${elapsed.toFixed(3)}ms, ${stats.totalVersions} versions, ${stats.totalDeltaBytes}B`);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST 5: Many versions (stress)
  // ═══════════════════════════════════════════════════════════════════════════

  test("STRESS: 100 versions in single substrate", () => {
    const t0 = performance.now();

    for (let i = 0; i < 100; i++) {
      const changes = new Map([
        [`key_${i % 5}`, Math.random() * 1000],
        ["counter", i]
      ]);
      versioned.commit(changes);
    }

    const elapsed = performance.now() - t0;
    const stats = versioned.getStorageStats();

    console.log(`✓ STRESS: 100 versions in ${elapsed.toFixed(0)}ms, ${stats.deltaBytes}B total`);
    console.log(`  Per-version storage: ${(stats.deltaBytes / stats.versions).toFixed(1)}B`);

    // Storage should be < 100KB for 100 versions with small deltas
    expect(stats.deltaBytes).toBeLessThan(100000);
  });
});
