"use strict";
// core/factory/builder.ts
// Fluent builder for substrates - developer-friendly API
Object.defineProperty(exports, "__esModule", { value: true });
exports.Presets = exports.substrate = exports.SubstrateBuilder = void 0;
const substrate_factory_1 = require("./substrate-factory");
/**
 * SubstrateBuilder
 * ----------------
 * Fluent API for building substrates step by step.
 *
 * Usage:
 *   const substrate = new SubstrateBuilder()
 *     .dimensions(2)
 *     .withHelix(7)
 *     .placeSaddle([0, 0], 0)
 *     .placeSaddle([1, 0], 90)
 *     .addNode("input")
 *     .addNode("output")
 *     .connect("input", "output")
 *     .observable()
 *     .build();
 */
class SubstrateBuilder {
    constructor() {
        this._config = {};
        this._saddles = [];
        this._nodes = [];
        this._edges = [];
    }
    /** Set number of dimensions */
    dimensions(n) {
        this._config.dimensions = n;
        return this;
    }
    /** Set number of helix pairs (1-7) */
    withHelix(pairs) {
        this._config.helixPairs = pairs;
        return this;
    }
    /** Place a saddle at position with orientation (degrees) */
    placeSaddle(position, orientation = 0) {
        this._saddles.push({ position, orientation });
        return this;
    }
    /** Add a network node */
    addNode(name) {
        this._nodes.push(name);
        return this;
    }
    /** Connect two nodes */
    connect(from, to) {
        this._edges.push([from, to]);
        return this;
    }
    /** Enable observation/logging */
    observable() {
        this._config.observable = true;
        return this;
    }
    /** Build the substrate */
    build() {
        return substrate_factory_1.SubstrateFactory.create({
            ...this._config,
            saddles: this._saddles,
            nodes: this._nodes,
            edges: this._edges,
        });
    }
}
exports.SubstrateBuilder = SubstrateBuilder;
/** Start building a substrate */
const substrate = () => new SubstrateBuilder();
exports.substrate = substrate;
/**
 * PRESETS
 * -------
 * Common substrate configurations for quick setup.
 */
exports.Presets = {
    /** Empty 2D substrate */
    empty2D() {
        return (0, exports.substrate)().dimensions(2).build();
    },
    /** Single saddle at origin */
    singleSaddle() {
        return (0, exports.substrate)()
            .dimensions(2)
            .placeSaddle([0, 0], 0)
            .build();
    },
    /** Two saddles at 90° (lock-and-key pair) */
    lockAndKey() {
        return (0, exports.substrate)()
            .dimensions(2)
            .placeSaddle([0, 0], 0)
            .placeSaddle([2, 0], 90)
            .build();
    },
    /** Full helix with 7 pairs */
    fullHelix() {
        return (0, exports.substrate)()
            .dimensions(2)
            .withHelix(7)
            .observable()
            .build();
    },
    /** Simple computation network */
    computeNetwork() {
        return (0, exports.substrate)()
            .dimensions(2)
            .addNode("input")
            .addNode("hidden")
            .addNode("output")
            .connect("input", "hidden")
            .connect("hidden", "output")
            .placeSaddle([0, 0], 0)
            .build();
    },
    /** Grid of saddles (n x n) */
    grid(n, spacing = 2) {
        const builder = (0, exports.substrate)().dimensions(2);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                // Alternate orientations for coupling
                const orientation = ((i + j) % 2) * 90;
                builder.placeSaddle([i * spacing, j * spacing], orientation);
            }
        }
        return builder.build();
    },
    /** Linear chain of saddles */
    chain(length, spacing = 2) {
        const builder = (0, exports.substrate)().dimensions(2).withHelix(7);
        for (let i = 0; i < length; i++) {
            builder.placeSaddle([i * spacing, 0], i * 90);
        }
        return builder.build();
    },
};
