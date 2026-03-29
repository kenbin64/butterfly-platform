"use strict";
// core/dimensional/index.ts
// Dimensional Programming API
// 
// PHILOSOPHY:
// - Objects ARE dimensions
// - Parts ARE points  
// - Points ARE dimensions (in lower space)
// - No tree traversal - direct drilling
// - Observe, don't iterate
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticFlow = exports.HelicalCascade = exports.SaddlePair = exports.watch = exports.matrix = exports.list = exports.data = exports.manifold = exports.ManifoldDimension = exports.addressFrom = exports.address = exports.Address = exports.pointFromPath = exports.point = exports.Point = exports.dimFrom = exports.dim = exports.Dimension = void 0;
var dimension_1 = require("./dimension");
Object.defineProperty(exports, "Dimension", { enumerable: true, get: function () { return dimension_1.Dimension; } });
Object.defineProperty(exports, "dim", { enumerable: true, get: function () { return dimension_1.dim; } });
Object.defineProperty(exports, "dimFrom", { enumerable: true, get: function () { return dimension_1.dimFrom; } });
var point_1 = require("./point");
Object.defineProperty(exports, "Point", { enumerable: true, get: function () { return point_1.Point; } });
Object.defineProperty(exports, "point", { enumerable: true, get: function () { return point_1.point; } });
Object.defineProperty(exports, "pointFromPath", { enumerable: true, get: function () { return point_1.pointFromPath; } });
Object.defineProperty(exports, "Address", { enumerable: true, get: function () { return point_1.Address; } });
Object.defineProperty(exports, "address", { enumerable: true, get: function () { return point_1.address; } });
Object.defineProperty(exports, "addressFrom", { enumerable: true, get: function () { return point_1.addressFrom; } });
var manifold_bridge_1 = require("./manifold-bridge");
Object.defineProperty(exports, "ManifoldDimension", { enumerable: true, get: function () { return manifold_bridge_1.ManifoldDimension; } });
Object.defineProperty(exports, "manifold", { enumerable: true, get: function () { return manifold_bridge_1.manifold; } });
Object.defineProperty(exports, "data", { enumerable: true, get: function () { return manifold_bridge_1.data; } });
Object.defineProperty(exports, "list", { enumerable: true, get: function () { return manifold_bridge_1.list; } });
Object.defineProperty(exports, "matrix", { enumerable: true, get: function () { return manifold_bridge_1.matrix; } });
Object.defineProperty(exports, "watch", { enumerable: true, get: function () { return manifold_bridge_1.watch; } });
// Re-export substrate types for convenience
var flow_1 = require("../substrate/flow");
Object.defineProperty(exports, "SaddlePair", { enumerable: true, get: function () { return flow_1.SaddlePair; } });
Object.defineProperty(exports, "HelicalCascade", { enumerable: true, get: function () { return flow_1.HelicalCascade; } });
Object.defineProperty(exports, "StaticFlow", { enumerable: true, get: function () { return flow_1.StaticFlow; } });
/**
 * DIMENSIONAL PROGRAMMING QUICK START
 * ====================================
 *
 * 1. Create a dimension:
 *    const d = dim({ name: "particle", x: 0, y: 0 });
 *
 * 2. Drill directly (no traversal):
 *    d.drill("x").value = 10;  // Direct access
 *    d.at("velocity").at("x").value = 5;  // Chain drilling
 *
 * 3. Observe changes:
 *    watch(d.at("x"), (val, path) => console.log(`${path}: ${val}`));
 *
 * 4. Use manifold geometry:
 *    const m = manifold();
 *    m.place(point(0, 0), 0);           // Place saddle at origin
 *    m.turnKey(2);                       // Rotate key pair
 *    const state = m.stateAsPoint();     // Get helix state as point
 *
 * 5. Points ARE dimensions:
 *    const p = point(1, 2, 3);
 *    p.lower();          // Returns point(2, 3) - one dimension down
 *    p.scalar;           // Returns 3 - the lowest dimension
 *    p.coord(0);         // Returns 1 - direct coordinate access
 *
 * 6. Addresses for symbolic access:
 *    const addr = address("particles", "0", "position", "x");
 *    addr.resolve(rootDimension).value;  // Direct resolution
 *
 * THE KEY INSIGHT:
 * ----------------
 * In traditional programming: object.property.subproperty (traversal)
 * In dimensional programming: object → point → point (drilling)
 *
 * The difference: drilling is O(1), traversal is O(depth).
 * Each dimension CONTAINS all lower dimensions - they exist already.
 * You're not "finding" them, you're "invoking" them.
 */
