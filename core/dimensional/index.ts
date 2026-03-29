// core/dimensional/index.ts
// Dimensional Programming API
// 
// PHILOSOPHY:
// - Objects ARE dimensions
// - Parts ARE points  
// - Points ARE dimensions (in lower space)
// - No tree traversal - direct drilling
// - Observe, don't iterate

export { Dimension, dim, dimFrom, DimensionObserver } from "./dimension";
export { Point, point, pointFromPath, Address, address, addressFrom } from "./point";
export { 
  ManifoldDimension, 
  manifold, 
  data, 
  list, 
  matrix, 
  watch 
} from "./manifold-bridge";

// Re-export substrate types for convenience
export { SaddlePair, HelicalCascade, StaticFlow } from "../substrate/flow";

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

