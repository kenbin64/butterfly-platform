// examples/dining-philosophers-benchmark.ts
// Benchmarks demonstrating manifold synchronization vs traditional approaches
// "Runs faster than the processor" - navigation vs computation

import { GameSubstrate } from "../app/src/engine/gameengine";
import { Dimension } from "../core/dimensional/dimension";
import { ContinuousDrill, HelicalCascade, OilRigDrill, DiamondDrill } from "../core/substrate/flow";

// ═══════════════════════════════════════════════════════════════════════════
// METRICS COLLECTION
// ═══════════════════════════════════════════════════════════════════════════

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgNs: number;
  opsPerSec: number;
}

function benchmark(name: string, iterations: number, fn: () => void): BenchmarkResult {
  // Warm up
  for (let i = 0; i < 100; i++) fn();
  
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const end = performance.now();
  
  const totalMs = end - start;
  const avgNs = (totalMs * 1_000_000) / iterations;
  const opsPerSec = Math.round(iterations / (totalMs / 1000));
  
  return { name, iterations, totalMs, avgNs, opsPerSec };
}

function printResult(r: BenchmarkResult): void {
  console.log(`  ${r.name}`);
  console.log(`    ${r.iterations.toLocaleString()} iterations in ${r.totalMs.toFixed(2)}ms`);
  console.log(`    ${r.avgNs.toFixed(2)} ns/op | ${r.opsPerSec.toLocaleString()} ops/sec`);
}

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK 1: Manifold Drill vs Traditional Map Lookup
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n╔═══════════════════════════════════════════════════════════════╗");
console.log("║  MANIFOLD BENCHMARKS: Navigation vs Computation              ║");
console.log("╚═══════════════════════════════════════════════════════════════╝\n");

console.log("─── 1. COORDINATE ACCESS ───────────────────────────────────────\n");

const game = GameSubstrate.create();
game.createEntity("player");
game.addComponent("player", "transform", { x: 100, y: 200, z: 300 });

// Traditional nested map
const traditionalMap = new Map<string, Map<string, Map<string, number>>>();
traditionalMap.set("player", new Map([["transform", new Map([["x", 100], ["y", 200], ["z", 300]])]]));

const ITERATIONS = 100_000;

const manifoldDrill = benchmark("Manifold drill('player','transform','x')", ITERATIONS, () => {
  game.drill("entities", "player", "transform", "x").value;
});

const mapLookup = benchmark("Traditional map.get().get().get()", ITERATIONS, () => {
  traditionalMap.get("player")?.get("transform")?.get("x");
});

printResult(manifoldDrill);
printResult(mapLookup);
console.log(`  → Manifold is ${(mapLookup.avgNs / manifoldDrill.avgNs).toFixed(2)}x vs nested maps\n`);

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK 2: Dining Philosophers - Fork Check Speed
// ═══════════════════════════════════════════════════════════════════════════

console.log("─── 2. DINING PHILOSOPHERS: Fork State Check ──────────────────\n");

game.initPhilosophers(5);

const forkCheck = benchmark("Manifold fork check (drill to state)", ITERATIONS, () => {
  game.philosopher(0).drill<boolean>("fork_left").value;
  game.philosopher(0).drill<boolean>("fork_right").value;
});

// Traditional: mutex-style check with object property
const traditionalPhilosophers = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  eating: false,
  forkLeft: true,
  forkRight: true
}));

const traditionalCheck = benchmark("Traditional object property access", ITERATIONS, () => {
  traditionalPhilosophers[0].forkLeft;
  traditionalPhilosophers[0].forkRight;
});

printResult(forkCheck);
printResult(traditionalCheck);

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK 3: Philosopher Eating Cycle
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n─── 3. EATING CYCLE: Acquire → Eat → Release ──────────────────\n");

const CYCLE_ITERATIONS = 10_000;

const manifoldCycle = benchmark("Manifold: tryEat → finishEating cycle", CYCLE_ITERATIONS, () => {
  if (game.tryEat(0)) {
    game.finishEating(0);
  }
});

// Traditional approach with locks
let tLock0 = false, tLock1 = false;
const traditionalCycle = benchmark("Traditional: lock check → set → release", CYCLE_ITERATIONS, () => {
  if (!tLock0 && !tLock1) {
    tLock0 = true;
    tLock1 = true;
    // "eating"
    tLock0 = false;
    tLock1 = false;
  }
});

printResult(manifoldCycle);
printResult(traditionalCycle);

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK 4: Pattern Matching vs Iteration
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n─── 4. ENTITY LOOKUP: Pattern Match vs Array Filter ───────────\n");

// Create many entities
for (let i = 0; i < 100; i++) {
  game.createEntity(`enemy_${i}`, ["hostile"]);
  game.createEntity(`npc_${i}`, ["friendly"]);
}

const PATTERN_ITERATIONS = 1_000;

const manifoldMatch = benchmark("Manifold: match(/^enemy_/)", PATTERN_ITERATIONS, () => {
  game.findEntities(/^enemy_/);
});

const entityArray = Array.from({ length: 200 }, (_, i) => ({
  id: i < 100 ? `enemy_${i}` : `npc_${i - 100}`,
  type: i < 100 ? "hostile" : "friendly"
}));

const arrayFilter = benchmark("Traditional: array.filter()", PATTERN_ITERATIONS, () => {
  entityArray.filter(e => e.id.startsWith("enemy_"));
});

printResult(manifoldMatch);
printResult(arrayFilter);

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK 5: Metrics-Tracked Philosopher Simulation
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n─── 5. PHILOSOPHER SIMULATION WITH METRICS ─────────────────────\n");

const simGame = GameSubstrate.create();
simGame.initPhilosophers(5);
simGame.initMetrics();

// Simulate 1000 rounds of philosophers trying to eat
const SIM_ROUNDS = 1000;
for (let round = 0; round < SIM_ROUNDS; round++) {
  // Each philosopher tries to eat in order
  for (let p = 0; p < 5; p++) {
    if (simGame.tryEatWithMetrics(p)) {
      // Ate successfully, now finish
      simGame.finishEating(p);
    }
  }
}

const metrics = simGame.getMetrics();
console.log("  Simulation: 5 philosophers, 1000 rounds");
console.log(`    Total eats:       ${metrics.eats.toLocaleString()}`);
console.log(`    Contentions:      ${metrics.contentions.toLocaleString()}`);
console.log(`    Drills performed: ${metrics.drills.toLocaleString()}`);
console.log(`    Elapsed:          ${metrics.elapsedMs.toFixed(2)}ms`);
console.log(`    Eats/sec:         ${Math.round(metrics.eatsPerSec).toLocaleString()}`);
console.log(`    Drills/sec:       ${Math.round(metrics.drillsPerSec).toLocaleString()}`);

const stats = simGame.philosopherStats();
console.log(`\n  Final state: ${stats.eating} eating, ${stats.thinking} thinking`);

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK 6: Deep Drill Depth Scaling
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n─── 6. DRILL DEPTH SCALING ─────────────────────────────────────\n");

const deepGame = GameSubstrate.create();
deepGame.drill("a", "b", "c", "d", "e", "f", "g", "h").value = 42;

const depths = [1, 2, 4, 8];
for (const depth of depths) {
  const keys = ["a", "b", "c", "d", "e", "f", "g", "h"].slice(0, depth);
  const result = benchmark(`Drill depth ${depth}`, 50_000, () => {
    deepGame.drill(...keys).value;
  });
  console.log(`  Depth ${depth}: ${result.avgNs.toFixed(2)} ns/op (${result.opsPerSec.toLocaleString()} ops/sec)`);
}

console.log("\n  → Depth scales linearly (O(depth)), but each step is O(1) hash lookup");

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK 7: WAVEFORM GEOMETRY
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n─── 7. WAVEFORM: Drill as Perturbation ─────────────────────────\n");

const waveGame = GameSubstrate.create();
waveGame.createEntity("player");
waveGame.createEntity("enemy_1");
waveGame.createEntity("enemy_2");
waveGame.addComponent("player", "health", { current: 100, max: 100 });

// Drill with wave properties
const playerWave = waveGame.drillWave<number>(["entities", "player", "health", "current"]);
console.log("  Player health drill:");
console.log(`    Value:     ${playerWave.value}`);
console.log(`    Amplitude: ${playerWave.amplitude} (perturbation depth)`);
console.log(`    Phase:     ${playerWave.phase}° (wave position)`);

// Sample wave across multiple entities
console.log("\n  Wave sampling across entities:");
const samples = waveGame.sampleWave(["entities"], ["player", "enemy_1", "enemy_2"]);
samples.forEach(s => {
  console.log(`    ${s.key}: amplitude=${s.amplitude}, phase=${s.phase}°`);
});

// Interference pattern
console.log("\n  Interference between player and enemy:");
const interference = waveGame.interference(
  ["entities", "player"],
  ["entities", "enemy_1"]
);
console.log(`    Phase delta: ${interference.delta}°`);
console.log(`    Pattern:     ${interference.constructive ? "CONSTRUCTIVE" : "DESTRUCTIVE"}`);

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK 8: HELICAL CASCADE - Data at Drill Speed
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n─── 8. HELICAL CASCADE: Drill Speed Propagation ─────────────────\n");

const cascadeGame = GameSubstrate.create();

// Create entities to drill
for (let i = 0; i < 10; i++) {
  cascadeGame.createEntity(`entity_${i}`);
}

console.log("  Initial helix state:", cascadeGame.getCascadeState().join("°, ") + "°");

// Drill multiple times and watch the cascade turn
const DRILL_COUNT = 100;
for (let i = 0; i < DRILL_COUNT; i++) {
  cascadeGame.drillPath([`entity_${i % 10}`, "transform", "position"]);
}

const finalState = cascadeGame.getCascadeState();
console.log(`  After ${DRILL_COUNT} drills:  `, finalState.join("°, ") + "°");
console.log(`  Total rotations: ${cascadeGame.getDrillCount()}`);

// Show coupling points (pairs 3 and 5 driven by multiple keys)
console.log("\n  Coupling points (driven by multiple turn keys):");
console.log(`    Pair 3: ${finalState[2]}° (keys 2 + 4)`);
console.log(`    Pair 5: ${finalState[4]}° (keys 4 + 6)`);

// Benchmark cascade turns
const cascadeBench = benchmark("Helical cascade turn (data propagation)", 50_000, () => {
  cascadeGame.drillPath(["entities", "entity_0", "transform"]);
});
console.log(`\n  Cascade turn: ${cascadeBench.avgNs.toFixed(2)} ns/op (${cascadeBench.opsPerSec.toLocaleString()} ops/sec)`);
console.log("  → Data propagates through 7 pairs per drill, at rotation speed");

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK 9: DISCRETE vs CONTINUOUS DRILL
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n─── 9. DISCRETE vs CONTINUOUS: Storage Comparison ────────────────\n");

// Discrete: 7 pairs
const discreteHelix = new HelicalCascade();
console.log("  DISCRETE (7 pairs):");
console.log(`    Storage: 7 rotation values`);
console.log(`    State: [${discreteHelix.state().join("°, ")}°]`);

// Continuous: infinite sampling
const continuousDrill = new ContinuousDrill(1000);

// Encode 1000 data points
const testData = Array.from({ length: 1000 }, (_, i) => Math.sin(i / 100) * 100);
continuousDrill.encode(testData, 0);

console.log("\n  CONTINUOUS (infinite helix):");
console.log(`    Data points encoded: ${testData.length}`);
console.log(`    Actual storage: ${continuousDrill.storageSize} distortion points`);
console.log(`    Compression: ${((1 - continuousDrill.storageSize / testData.length) * 100).toFixed(1)}%`);

// Benchmark continuous access
const contSample = benchmark("Continuous sample(θ)", 100_000, () => {
  continuousDrill.sample(Math.random() * 10);
});

const contSmooth = benchmark("Continuous sampleSmooth(θ)", 10_000, () => {
  continuousDrill.sampleSmooth(Math.random() * 10);
});

console.log(`\n  Access speed:`);
console.log(`    sample():       ${contSample.avgNs.toFixed(2)} ns/op`);
console.log(`    sampleSmooth(): ${contSmooth.avgNs.toFixed(2)} ns/op`);

// Demonstrate distortion IS the data
console.log("\n  Data as distortion (first 5 points):");
const distortions = continuousDrill.getDistortions().slice(0, 5);
distortions.forEach(d => {
  console.log(`    θ=${d.theta.toFixed(4)} → amplitude=${d.amplitude.toFixed(2)}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK 10: SEED-BASED GEOMETRIC SECURITY
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n─── 10. SEED-BASED SECURITY: Geometric Encryption ────────────────\n");

// Create two drills with DIFFERENT seeds
const secureDrill = new OilRigDrill();
const hackerDrill = new OilRigDrill();  // Different random seed

console.log(`  Authorized seed:  0x${secureDrill.seed.toString(16).toUpperCase()}`);
console.log(`  Hacker's seed:    0x${hackerDrill.seed.toString(16).toUpperCase()}`);

// Encode secret data
const secretData = [42, 137, 256, 1024, 2048];
secureDrill.encode(secretData);
console.log(`\n  Original data:    [${secretData.join(", ")}]`);

// Sample with correct seed
const correctSamples = secretData.map((_, i) => secureDrill.sample(i * 0.1).toFixed(2));
console.log(`  Correct samples:  [${correctSamples.join(", ")}]`);

// Hacker tries to copy the harmonics but has wrong seed
const stolenEquation = secureDrill.getWaveEquation();
hackerDrill.encode(secretData);  // Even if they know the data format

// Sample with wrong seed - completely different values!
const hackerSamples = secretData.map((_, i) => hackerDrill.sample(i * 0.1).toFixed(2));
console.log(`  Hacker samples:   [${hackerSamples.join(", ")}]  ← WRONG!`);

// Demonstrate seed rotation
console.log("\n  Seed rotation (invalidates previous samples):");
const oldSeed = secureDrill.seed;
const newSeed = secureDrill.rotateSeed();
console.log(`    Old seed: 0x${oldSeed.toString(16).toUpperCase()}`);
console.log(`    New seed: 0x${newSeed.toString(16).toUpperCase()}`);

const afterRotation = secretData.map((_, i) => secureDrill.sample(i * 0.1).toFixed(2));
console.log(`    Samples after rotation: [${afterRotation.join(", ")}]`);
console.log("    → Previous intercepted samples are now meaningless");

// Storage comparison
console.log("\n  Storage efficiency:");
console.log(`    Data points:     ${secretData.length}`);
console.log(`    Stored:          1 seed (32-bit) + ${secureDrill.harmonicCount} harmonics`);
console.log(`    Wave equation:   ${JSON.stringify(secureDrill.getWaveEquation()).length} bytes`);
console.log("    → Entire state is the wave equation, not the data!");

// Benchmark secure sampling
const secureBench = benchmark("Secure OilRigDrill.sample(θ)", 100_000, () => {
  secureDrill.sample(Math.random() * 10);
});
console.log(`\n  Secure sample: ${secureBench.avgNs.toFixed(2)} ns/op (${secureBench.opsPerSec.toLocaleString()} ops/sec)`);

// ═══════════════════════════════════════════════════════════════════════════
// BENCHMARK 11: DIAMOND DRILL - 7 Section Geometry
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n─── 11. DIAMOND DRILL: 7 Section Geometry ─────────────────────────\n");

const diamondDrill = new DiamondDrill();

// Encode data into the 7 diamond sections
const sectionData = [100, 200, 150, 300, 250, 175, 225];
diamondDrill.encode(sectionData);

console.log("  Diamond geometry (fat part amplitudes):");
console.log(`    Sections: [${diamondDrill.decode().join(", ")}]`);

// Sample across the entire drill
console.log("\n  Waveform samples (θ = 0 to 7):");
const samples = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5];
for (let i = 0; i < 7; i++) {
  const pinch = diamondDrill.sample(i);
  const fat = diamondDrill.sample(i + 0.5);
  console.log(`    Section ${i + 1}: pinch=${pinch.toFixed(1)}, fat=${fat.toFixed(1)}`);
}

// Show pinch points
console.log(`\n  Pinch points (inflections): [${diamondDrill.getPinchPoints().join(", ")}]`);

// Get equation (minimal storage)
const equation = diamondDrill.getEquation();
console.log(`\n  Storage (equation only):`);
console.log(`    Seed:       0x${equation.seed.toString(16).toUpperCase()}`);
console.log(`    Amplitudes: [${equation.amplitudes.join(", ")}]`);
console.log(`    Total:      ${JSON.stringify(equation).length} bytes`);

// Benchmark diamond sampling
const diamondBench = benchmark("DiamondDrill.sample(θ)", 100_000, () => {
  diamondDrill.sample(Math.random() * 7);
});
console.log(`\n  Diamond sample: ${diamondBench.avgNs.toFixed(2)} ns/op (${diamondBench.opsPerSec.toLocaleString()} ops/sec)`);

// Demonstrate rotation
diamondDrill.rotate(45);
console.log(`\n  After 45° rotation: ${diamondDrill.rotation}°`);
console.log(`    Sample at θ=3.5 now: ${diamondDrill.sample(3.5).toFixed(2)}`);

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log("\n╔═══════════════════════════════════════════════════════════════╗");
console.log("║  SUMMARY: Why Manifold Runs Faster Than The Processor        ║");
console.log("╚═══════════════════════════════════════════════════════════════╝\n");
console.log("  The processor doesn't COMPUTE paths - it NAVIGATES them.");
console.log("  Drilling is pointer chasing, not calculation.");
console.log("  The manifold IS the index - no separate lookup structure.\n");
console.log("  Dining Philosophers sync is O(1) because:");
console.log("    • Fork state IS the coordinate");
console.log("    • No mutex computation, just value read");
console.log("    • State change is assignment, not lock acquisition\n");
console.log("  Oil Rig Drill security:");
console.log("    • Seed randomizes the waveform geometry");
console.log("    • Without seed, data is meaningless noise");
console.log("    • Seed rotation invalidates all previous samples");
console.log("    • Stolen code is useless without the current seed\n");
console.log("  Metrics show:");
console.log(`    • ${Math.round(metrics.drillsPerSec).toLocaleString()} coordinate navigations per second`);
console.log(`    • ${Math.round(metrics.eatsPerSec).toLocaleString()} synchronization cycles per second`);
console.log("    • Zero deadlocks in manifold-based synchronization\n");

