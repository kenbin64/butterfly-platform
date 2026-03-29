"use strict";
// core/dimensional/point.ts
// A Point is an addressed location that IS ALSO a Dimension.
// Points can be numeric (coordinates) or symbolic (names).
Object.defineProperty(exports, "__esModule", { value: true });
exports.addressFrom = exports.address = exports.Address = exports.pointFromPath = exports.point = exports.Point = void 0;
const dimension_1 = require("./dimension");
/**
 * Point
 * -----
 * An addressed location in dimensional space.
 * A point in N-space contains (N-1)-space.
 *
 * The key insight: coordinates ARE dimensions.
 * point(1, 2, 3) is not "a location" — it IS dimensions [1][2][3].
 */
class Point extends dimension_1.Dimension {
    constructor(coords = []) {
        super(coords);
        // Each coordinate becomes a drillable dimension
        coords.forEach((c, i) => {
            this.at(String(i)).value = c;
        });
    }
    /** Get coordinate at index */
    coord(i) {
        return this.value[i] ?? 0;
    }
    /** Dimensionality of this point */
    get dim() {
        return this.value.length;
    }
    /** Drill down one dimension - returns the point in (N-1) space */
    lower() {
        return new Point(this.value.slice(1));
    }
    /** Project onto a specific dimension index */
    project(dimIndex) {
        return this.coord(dimIndex);
    }
    /** Extend into higher dimension */
    extend(coord) {
        return new Point([...this.value, coord]);
    }
    /** The "tip" - the lowest dimension (scalar) */
    get scalar() {
        return this.value[this.value.length - 1] ?? 0;
    }
    /** Navigate directly to a sub-point */
    sub(...indices) {
        const coords = indices.map(i => this.coord(i));
        return new Point(coords);
    }
}
exports.Point = Point;
/** Create a point from coordinates */
const point = (...coords) => new Point(coords);
exports.point = point;
/** Create a point from a dimension path */
const pointFromPath = (d, ...keys) => {
    const coords = keys.map(k => {
        const val = d.drill(k).value;
        return typeof val === "number" ? val : 0;
    });
    return new Point(coords);
};
exports.pointFromPath = pointFromPath;
/**
 * Address
 * -------
 * Symbolic addressing for dimensions.
 * Instead of numeric coordinates, use names.
 */
class Address {
    constructor(...parts) {
        this.parts = parts;
    }
    /** Resolve this address against a dimension */
    resolve(root) {
        return root.drill(...this.parts);
    }
    /** Extend address with more parts */
    extend(...more) {
        return new Address(...this.parts, ...more);
    }
    /** Parent address (one level up) */
    parent() {
        return new Address(...this.parts.slice(0, -1));
    }
    /** The leaf key */
    get leaf() {
        return this.parts[this.parts.length - 1] ?? "";
    }
    /** Depth of address */
    get depth() {
        return this.parts.length;
    }
    toString() {
        return this.parts.join(".");
    }
}
exports.Address = Address;
/** Create an address from parts */
const address = (...parts) => new Address(...parts);
exports.address = address;
/** Create an address from a dot-separated string */
const addressFrom = (path) => new Address(...path.split(".").filter(s => s.length > 0));
exports.addressFrom = addressFrom;
