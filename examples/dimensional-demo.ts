// examples/dimensional-demo.ts
// Demonstrates Dimensional Programming + Substrate Factory

import {
  dim,
  point,
  address,
  manifold,
  data,
  list,
  watch,
  HelicalCascade
} from "../core/dimensional";

import { substrate, Presets, SubstrateFactory } from "../core/factory";

console.log("=== DIMENSIONAL PROGRAMMING + FACTORY DEMO ===\n");

// 1. Basic Dimension - direct drilling
console.log("1. DIRECT DRILLING (no traversal)");
const particle = dim({ x: 0, y: 0, velocity: { x: 1, y: 2 } });
particle.drill("x").value = 10;
particle.drill("velocity", "x").value = 5;
console.log("   particle.drill('x').value =", particle.at("x").value);
console.log("   particle.drill('velocity', 'x').value =", particle.drill("velocity", "x").value);

// 2. Points ARE dimensions
console.log("\n2. POINTS ARE DIMENSIONS");
const p = point(1, 2, 3);
console.log("   point(1, 2, 3).dim =", p.dim);
console.log("   p.lower() =", p.lower().value, "(dimension reduced)");
console.log("   p.scalar =", p.scalar, "(lowest dimension)");
console.log("   p.coord(0) =", p.coord(0), "(direct access)");

// 3. Observer pattern
console.log("\n3. OBSERVER PATTERN");
const observed = dim(0);
const unsubscribe = watch(observed, (val, path) => {
  console.log(`   OBSERVED: value=${val} at path=[${path.join(".")}]`);
});
observed.value = 42;  // Triggers observer
observed.value = 100; // Triggers observer
unsubscribe();
observed.value = 999; // No output (unsubscribed)
console.log("   (unsubscribed - no output for value=999)");

// 4. Helical Cascade with turn keys
console.log("\n4. HELICAL CASCADE (7 pairs, keys 2/4/6)");
const helix = new HelicalCascade();
console.log("   Initial state:", helix.state());

helix.observe((state, changed) => {
  console.log(`   CASCADE: pairs [${changed.join(",")}] changed → state=${state}`);
});

console.log("   Turning key 2...");
helix.turnKey(2);

console.log("   Turning key 4...");
helix.turnKey(4);

console.log("   Turning key 6...");
helix.turnKey(6);

console.log("   Final state:", helix.state());
console.log("   Pair 3 (coupling):", helix.getPair(3)?.rotation, "° (driven by keys 2 AND 4)");
console.log("   Pair 5 (coupling):", helix.getPair(5)?.rotation, "° (driven by keys 4 AND 6)");

// 5. Manifold dimension
console.log("\n5. MANIFOLD DIMENSION");
const m = manifold();
m.place(point(0, 0), 0);
console.log("   Placed saddle at origin");
console.log("   Helix state as point:", m.stateAsPoint().value);

m.turnKey(2);
console.log("   After turnKey(2):", m.stateAsPoint().value);

// 6. Data structures as dimensions
console.log("\n6. DATA AS DIMENSIONS");
const arr = list(10, 20, 30);
console.log("   list(10, 20, 30).at('1').value =", arr.at("1").value, "(direct index access)");

const matrix = data([[1, 2], [3, 4]]);
console.log("   matrix.drill('0', '1').value =", matrix.drill("0", "1").value, "(direct [0][1] access)");

// 7. Address resolution
console.log("\n7. SYMBOLIC ADDRESSING");
const root = dim<Record<string, unknown>>({});
root.drill("users", "alice", "age").value = 30;
root.drill("users", "bob", "age").value = 25;

const aliceAge = address("users", "alice", "age").resolve<number>(root as any);
const bobAge = address("users", "bob", "age").resolve<number>(root as any);
console.log("   address('users', 'alice', 'age').resolve() =", aliceAge.value);
console.log("   address('users', 'bob', 'age').resolve() =", bobAge.value);

// 8. Substrate Factory
console.log("\n8. SUBSTRATE FACTORY (middleware)");

// Using presets
const simple = Presets.singleSaddle();
console.log("   Presets.singleSaddle() - cells:", simple.field.cellCount);

const grid = Presets.grid(2);
console.log("   Presets.grid(2) - cells:", grid.field.cellCount);

// Using builder
const custom = substrate()
  .dimensions(2)
  .withHelix(7)
  .placeSaddle([0, 0], 0)
  .placeSaddle([2, 0], 90)
  .addNode("input")
  .addNode("output")
  .connect("input", "output")
  .observable()
  .build();

console.log("   Builder pattern - cells:", custom.field.cellCount);
console.log("   Helix state:", custom.helix.state());

// Observe changes
SubstrateFactory.observe((state, event) => {
  console.log(`   FACTORY EVENT: ${event} → helix=${state.helixRotations}`);
});

custom.turnKey(2);
custom.turnKey(4);

// 9. Network computation
console.log("\n9. NETWORK COMPUTATION");
custom.network.write("input", 10);
custom.step();
console.log("   Wrote 10 to 'input', stepped network");
console.log("   Output:", custom.network.read("output"));

console.log("\n=== DEMO COMPLETE ===");
console.log("\nARCHITECTURE:");
console.log("  Developer Code → Factory (middleware) → Core (manifolds/substrates)");
console.log("\nKEY INSIGHT: Drilling is O(1), traversal is O(depth).");
console.log("Each dimension CONTAINS all lower dimensions - they exist already.");
console.log("You're not 'finding' them, you're 'invoking' them.");

