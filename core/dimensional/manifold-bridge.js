"use strict";
// core/dimensional/manifold-bridge.ts
// Bridges dimensional programming to the substrate/manifold system.
// All functions point directly to manifolds and substrates.
Object.defineProperty(exports, "__esModule", { value: true });
exports.watch = exports.matrix = exports.list = exports.data = exports.manifold = exports.ManifoldDimension = void 0;
const dimension_1 = require("./dimension");
const point_1 = require("./point");
const flow_1 = require("../substrate/flow");
const saddle_1 = require("../geometry/saddle");
const saddlefield_1 = require("../substrate/saddlefield");
/**
 * ManifoldDimension
 * -----------------
 * A Dimension that wraps manifold/substrate structures.
 * Provides direct drilling into saddle geometry.
 */
class ManifoldDimension extends dimension_1.Dimension {
    constructor() {
        super(new saddlefield_1.SaddleField());
        this._helix = new flow_1.HelicalCascade();
        this._initPairs();
    }
    _initPairs() {
        // Each helix pair becomes a drillable dimension
        for (let i = 1; i <= 7; i++) {
            const pair = this._helix.getPair(i);
            const pairDim = this.at(`pair${i}`);
            pairDim.value = pair.rotation;
            // Mark turn keys
            if (pair.isTurnKey) {
                this.at(`pair${i}.turnKey`).value = true;
            }
        }
    }
    /** Get the helix cascade */
    get helix() { return this._helix; }
    /** Turn a key and update dimensions */
    turnKey(key) {
        this._helix.turnKey(key);
        this._syncPairs();
    }
    /** Full cascade through all keys */
    cascade() {
        this._helix.fullCascade();
        this._syncPairs();
    }
    /** Get state as a Point (rotation values as coordinates) */
    stateAsPoint() {
        return (0, point_1.point)(...this._helix.state());
    }
    /** Place a saddle form at a location */
    place(location, orientation = 0) {
        const form = new saddle_1.SaddleForm(orientation * Math.PI / 180);
        this.value = this.value.place(location.value, form);
        return this;
    }
    /** Sample the field at a point */
    sample(p) {
        return this.value.scalarAt(p.value);
    }
    /** Create a flow from origin in direction */
    flow(origin, direction, magnitude) {
        return new flow_1.StaticFlow(origin.value, direction.value, magnitude);
    }
    _syncPairs() {
        const state = this._helix.state();
        for (let i = 1; i <= 7; i++) {
            this.at(`pair${i}`).value = state[i - 1];
        }
    }
}
exports.ManifoldDimension = ManifoldDimension;
/** Create a manifold dimension */
const manifold = () => new ManifoldDimension();
exports.manifold = manifold;
/**
 * DataDimension
 * -------------
 * Create any data type as a dimensional structure.
 * Arrays become indexed dimensions. Objects become keyed dimensions.
 */
const data = (value) => {
    if (Array.isArray(value)) {
        const d = (0, dimension_1.dim)(value);
        value.forEach((item, i) => {
            const child = (0, exports.data)(item);
            d._parts.set(String(i), child);
            child._parent = d;
            child._key = String(i);
        });
        return d;
    }
    if (typeof value === "object" && value !== null) {
        return (0, dimension_1.dimFrom)(value);
    }
    return (0, dimension_1.dim)(value);
};
exports.data = data;
/**
 * List - A dimensional array
 * Direct access by index, no iteration needed.
 */
const list = (...items) => (0, exports.data)(items);
exports.list = list;
/**
 * Matrix - A 2D dimensional structure
 * Direct access by [row][col].
 */
const matrix = (rows) => (0, exports.data)(rows);
exports.matrix = matrix;
/**
 * Observe any dimension and react to changes
 */
const watch = (d, handler) => d.observe(handler);
exports.watch = watch;
