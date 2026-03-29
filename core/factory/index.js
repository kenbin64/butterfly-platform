"use strict";
// core/factory/index.ts
// Substrate Factory - Middleware between development and core
//
// This is the DEVELOPER API. Use this, not the core directly.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Presets = exports.substrate = exports.SubstrateBuilder = exports.SubstrateFactory = void 0;
var substrate_factory_1 = require("./substrate-factory");
Object.defineProperty(exports, "SubstrateFactory", { enumerable: true, get: function () { return substrate_factory_1.SubstrateFactory; } });
var builder_1 = require("./builder");
Object.defineProperty(exports, "SubstrateBuilder", { enumerable: true, get: function () { return builder_1.SubstrateBuilder; } });
Object.defineProperty(exports, "substrate", { enumerable: true, get: function () { return builder_1.substrate; } });
Object.defineProperty(exports, "Presets", { enumerable: true, get: function () { return builder_1.Presets; } });
/**
 * SUBSTRATE FACTORY - QUICK START
 * ================================
 *
 * The factory is middleware between your code and the core manifold system.
 * You describe WHAT you want, the factory handles HOW.
 *
 * THREE WAYS TO CREATE SUBSTRATES:
 *
 * 1. PRESETS (fastest)
 * --------------------
 *    import { Presets } from "./core/factory";
 *
 *    const s = Presets.singleSaddle();    // One saddle at origin
 *    const s = Presets.lockAndKey();       // Two saddles at 90°
 *    const s = Presets.fullHelix();        // 7-pair helix cascade
 *    const s = Presets.grid(4);            // 4x4 saddle grid
 *    const s = Presets.chain(5);           // Linear chain of 5
 *
 * 2. BUILDER (fluent API)
 * -----------------------
 *    import { substrate } from "./core/factory";
 *
 *    const s = substrate()
 *      .dimensions(2)
 *      .withHelix(7)
 *      .placeSaddle([0, 0], 0)
 *      .placeSaddle([2, 0], 90)
 *      .addNode("A")
 *      .addNode("B")
 *      .connect("A", "B")
 *      .observable()
 *      .build();
 *
 * 3. FACTORY (direct config)
 * --------------------------
 *    import { SubstrateFactory } from "./core/factory";
 *
 *    const s = SubstrateFactory.create({
 *      dimensions: 2,
 *      helixPairs: 7,
 *      saddles: [{ position: [0, 0], orientation: 0 }],
 *      nodes: ["A", "B"],
 *      edges: [["A", "B"]],
 *      observable: true,
 *    });
 *
 * USING THE SUBSTRATE:
 * --------------------
 *    s.turnKey(2);                  // Turn helix key 2
 *    s.turnKey(4);                  // Turn helix key 4
 *    s.cascade();                   // Full cascade (all keys)
 *
 *    const val = s.sample([1, 2]);  // Sample field at point
 *    const f = s.flow([0,0], [1,1], 1.0);  // Create a flow
 *
 *    s.network.write("A", 42);      // Write to network node
 *    s.step();                      // Step the network
 *    const out = s.network.read("B"); // Read from node
 *
 *    s.reset();                     // Reset helix to initial state
 *
 * OBSERVING CHANGES:
 * ------------------
 *    import { SubstrateFactory } from "./core/factory";
 *
 *    SubstrateFactory.observe((state, event) => {
 *      console.log(`Event: ${event}`);
 *      console.log(`Helix: ${state.helixRotations}`);
 *      console.log(`Network: ${JSON.stringify(state.networkValues)}`);
 *    });
 *
 * DIMENSIONAL ACCESS:
 * -------------------
 *    // Every substrate has a dimensional wrapper
 *    s.dimension.value;                    // Current state
 *    s.dimension.at("helixRotations");     // Drill to helix
 *    s.dimension.observe((state, path) => ...);  // Observe
 */
