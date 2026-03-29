"use strict";
// core/factory/substrate-factory.ts
// SubstrateFactory - Middleware between development and core
// Builds substrates from declarative parameters
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubstrateFactory = void 0;
const dimension_1 = require("../dimensional/dimension");
const flow_1 = require("../substrate/flow");
const saddle_1 = require("../geometry/saddle");
const saddlefield_1 = require("../substrate/saddlefield");
const saddlenetwork_1 = require("../substrate/saddlenetwork");
/**
 * SubstrateFactory
 * ----------------
 * Middleware that builds substrates from configuration.
 * Developers describe WHAT they want, factory handles HOW.
 *
 * Usage:
 *   const substrate = SubstrateFactory.create({ dimensions: 2, helixPairs: 7 });
 *   substrate.turnKey(2);
 *   const value = substrate.sample([1, 2]);
 */
class SubstrateFactory {
    /** Create a substrate from configuration */
    static create(config = {}) {
        const cfg = {
            dimensions: config.dimensions ?? 2,
            helixPairs: Math.min(7, Math.max(1, config.helixPairs ?? 7)),
            saddles: config.saddles ?? [],
            nodes: config.nodes ?? [],
            edges: config.edges ?? [],
            observable: config.observable ?? false,
        };
        // Build components
        const helix = new flow_1.HelicalCascade();
        let field = new saddlefield_1.SaddleField();
        const network = new saddlenetwork_1.SaddleNetwork();
        // Place saddles
        for (const s of cfg.saddles) {
            const form = new saddle_1.SaddleForm((s.orientation ?? 0) * Math.PI / 180);
            field = field.place(s.position, form);
        }
        // Build network
        for (const node of cfg.nodes) {
            network.addNode(node);
        }
        for (const [from, to] of cfg.edges) {
            network.connect(from, to);
        }
        // Create dimensional wrapper
        const dimension = (0, dimension_1.dim)({
            helixRotations: helix.state(),
            networkValues: network.readAll(),
            saddleCount: cfg.saddles.length,
        });
        // Sync function
        const sync = (event) => {
            dimension.value = {
                helixRotations: helix.state(),
                networkValues: network.readAll(),
                saddleCount: field.cellCount,
            };
            if (cfg.observable) {
                SubstrateFactory._notify(dimension.value, event);
            }
        };
        // Build the substrate interface
        const substrate = {
            field,
            helix,
            network,
            dimension,
            config: cfg,
            turnKey(key) {
                helix.turnKey(key);
                sync(`turnKey:${key}`);
            },
            cascade() {
                helix.fullCascade();
                sync("cascade");
            },
            sample(p) {
                return field.scalarAt(p);
            },
            flow(from, to, magnitude) {
                const dir = to.map((t, i) => t - from[i]);
                return new flow_1.StaticFlow(from, dir, magnitude);
            },
            step() {
                network.step();
                sync("step");
            },
            reset() {
                helix.reset();
                sync("reset");
            },
        };
        sync("created");
        return substrate;
    }
    /** Observe all substrate events */
    static observe(fn) {
        this._observers.add(fn);
        return () => this._observers.delete(fn);
    }
    static _notify(state, event) {
        this._observers.forEach(fn => fn(state, event));
    }
}
exports.SubstrateFactory = SubstrateFactory;
SubstrateFactory._observers = new Set();
