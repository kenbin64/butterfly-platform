"use strict";
// examples/benchmark.ts
// Performance benchmarks for Dimensional Programming and Substrate
Object.defineProperty(exports, "__esModule", { value: true });
const dimension_1 = require("../core/dimensional/dimension");
const flow_1 = require("../core/substrate/flow");
const saddlefield_1 = require("../core/substrate/saddlefield");
const saddle_1 = require("../core/geometry/saddle");
const substrate_factory_1 = require("../core/factory/substrate-factory");
// ============== Benchmark Utilities ==============
function benchmark(name, fn, iterations = 10000) {
    // Warmup
    for (let i = 0; i < 100; i++)
        fn();
    const start = performance.now();
    for (let i = 0; i < iterations; i++)
        fn();
    const end = performance.now();
    const totalMs = end - start;
    const perOpNs = (totalMs / iterations) * 1000000;
    console.log(`  ${name}: ${perOpNs.toFixed(2)} ns/op (${iterations} ops in ${totalMs.toFixed(2)}ms)`);
    return perOpNs;
}
function header(name) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`  ${name}`);
    console.log(`${"=".repeat(50)}`);
}
// ============== 1. Dimensional Drilling Benchmarks ==============
header("DIMENSIONAL DRILLING");
// Setup
const root = (0, dimension_1.dim)({});
root.drill("a", "b", "c", "d", "e").value = 42;
root.drill("users", "alice", "profile", "settings", "theme").value = "dark";
// Benchmark: Shallow drill (1 level)
benchmark("Shallow drill (1 level)", () => {
    root.at("a");
}, 100000);
// Benchmark: Medium drill (3 levels)
benchmark("Medium drill (3 levels)", () => {
    root.drill("a", "b", "c");
}, 100000);
// Benchmark: Deep drill (5 levels)
benchmark("Deep drill (5 levels)", () => {
    root.drill("a", "b", "c", "d", "e");
}, 100000);
// Benchmark: drillPath vs drill (array vs rest)
const pathArray = ["users", "alice", "profile", "settings", "theme"];
benchmark("drillPath with array", () => {
    root.drillPath(pathArray);
}, 100000);
benchmark("drill with rest params", () => {
    root.drill("users", "alice", "profile", "settings", "theme");
}, 100000);
// Benchmark: Path access (deterministic - manifold IS the path)
const deep = root.drill("a", "b", "c", "d", "e");
benchmark("Path getter (deterministic)", () => {
    void deep.path;
}, 100000);
// Benchmark: Versioned mutations
benchmark("withValue() - versioned update", () => {
    void deep.withValue(99);
}, 100000);
// ============== 2. Helical Cascade Benchmarks ==============
header("HELICAL CASCADE");
const helix = new flow_1.HelicalCascade();
benchmark("turnKey(2) - single key", () => {
    helix.turnKey(2);
}, 10000);
benchmark("fullCascade - all keys", () => {
    helix.fullCascade();
}, 10000);
benchmark("state() - get rotations", () => {
    void helix.state();
}, 100000);
benchmark("stateTyped() - typed array", () => {
    void helix.stateTyped();
}, 100000);
benchmark("getPair(4)", () => {
    void helix.getPair(4);
}, 100000);
// ============== 3. Saddle Field Benchmarks ==============
header("SADDLE FIELD");
let field = new saddlefield_1.SaddleField();
field = field.place([0, 0], new saddle_1.SaddleForm(0));
field = field.place([2, 0], new saddle_1.SaddleForm(Math.PI / 2));
field = field.place([0, 2], new saddle_1.SaddleForm(Math.PI));
benchmark("scalarAt([1, 1])", () => {
    void field.scalarAt([1, 1]);
}, 100000);
benchmark("gradientAt([1, 1])", () => {
    void field.gradientAt([1, 1]);
}, 100000);
// ============== 4. Factory Benchmarks ==============
header("SUBSTRATE FACTORY");
benchmark("Factory.create() - minimal", () => {
    void substrate_factory_1.SubstrateFactory.create({ dimensions: 2 });
}, 1000);
benchmark("Factory.create() - full helix", () => {
    void substrate_factory_1.SubstrateFactory.create({ helixPairs: 7, observable: false });
}, 1000);
const substrate = substrate_factory_1.SubstrateFactory.create({ helixPairs: 7 });
benchmark("substrate.sample([1, 1])", () => {
    void substrate.sample([1, 1]);
}, 100000);
benchmark("substrate.turnKey(4)", () => {
    substrate.turnKey(4);
}, 10000);
// ============== 5. Comparison: Drilling vs Object Access ==============
header("DRILLING vs TRADITIONAL OBJECT ACCESS");
const traditionalObj = { a: { b: { c: { d: { e: 42 } } } } };
const dimObj = (0, dimension_1.dimFrom)(traditionalObj);
benchmark("Traditional: obj.a.b.c.d.e", () => {
    void traditionalObj.a.b.c.d.e;
}, 100000);
benchmark("Dimension: drill('a','b','c','d','e').value", () => {
    void dimObj.drill("a", "b", "c", "d", "e").value;
}, 100000);
// ============== Summary ==============
header("BENCHMARK COMPLETE");
console.log("\nKey takeaways:");
console.log("• Manifolds ARE deterministic - same drill = same result");
console.log("• Substrates ARE versioned - withValue() preserves history");
console.log("• No caching needed - manifold structure IS the data");
console.log("• Typed arrays (stateTyped) enable zero-allocation state access");
console.log("• Factory creation is one-time cost, operations are fast");
