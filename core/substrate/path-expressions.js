"use strict";
// core/substrate/path-expressions.ts
// Path expressions: the substrate's way of pointing into the manifold.
//
// The manifold (z = x·y, 7-section helix) already contains every possible value.
// A PathExpr is a coordinate — it says WHERE in the manifold a datum lives.
// The datum is not stored; it is discovered by evaluating the manifold at the path.
//
// Circle → Pi.  Triangle → Trigonometry.  Square → Calculus.
// Data has always lived in shapes.
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluatePath = evaluatePath;
exports.discoverPath = discoverPath;
exports.stringToPathExprs = stringToPathExprs;
exports.pathExprsToString = pathExprsToString;
// ─── Helix constants (duplicated intentionally — no cross-import) ────────────
const HALF_PI = Math.PI / 2;
const _HC = new Float64Array(7);
const _HS = new Float64Array(7);
for (let i = 0; i < 7; i++) {
    const theta = i * HALF_PI;
    _HC[i] = Math.cos(theta);
    _HS[i] = Math.sin(theta);
}
/** Evaluate z = x·y on helix section s (precomputed cos/sin). */
function helixZ(s, x, y) {
    const c = _HC[s], sv = _HS[s];
    return (c * x + sv * y) * (-sv * x + c * y);
}
// ─── Path → Cartesian mapping ────────────────────────────────────────────────
/**
 * Convert a path expression's polar-like coordinates to cartesian (x, y)
 * on the saddle surface, then evaluate z.
 *
 *   x = radius · cos(angle)
 *   y = radius · sin(angle)
 *   z = helixZ(section, x, y)
 */
function pathToCartesian(expr) {
    return {
        x: expr.radius * Math.cos(expr.angle),
        y: expr.radius * Math.sin(expr.angle),
    };
}
// ─── Evaluate ────────────────────────────────────────────────────────────────
/**
 * Evaluate a path expression on the manifold.
 *
 * Returns the raw numeric value at that point on the z = x·y surface.
 * For compound paths (modifiers), recursively evaluates sub-paths and
 * combines them — each modifier's z feeds as x into the next level,
 * producing fractal depth.
 */
function evaluatePath(expr) {
    const s = ((expr.section % 7) + 7) % 7;
    const { x, y } = pathToCartesian(expr);
    let z = helixZ(s, x, y);
    // Depth recursion: if modifiers exist, compose them.
    // Each modifier's evaluation becomes a scaling factor on z.
    if (expr.modifiers && expr.modifiers.length > 0) {
        for (const mod of expr.modifiers) {
            z *= evaluatePath(mod);
        }
    }
    return z;
}
// ─── Inverse: value → path discovery ─────────────────────────────────────────
/**
 * Discover a path expression that yields the given numeric value.
 *
 * For z = x·y at section s with angle θ:
 *   x = r·cos(θ),  y = r·sin(θ)
 *   z = helixZ(s, x, y) = C2·r²·cos(θ)·sin(θ) = C2·r²·sin(2θ)/2
 *
 * Given target z, section, and angle, solve for radius:
 *   r = sqrt(|z| / |C2 · sin(2θ)/2|)
 *
 * Returns the path expression that evaluates back to z.
 */
function discoverPath(value, section = 0, angle = Math.PI / 4, // default: 45 degrees, both axes active
depth = 0) {
    const s = ((section % 7) + 7) % 7;
    // Strategy: compute z at the given angle and solve for radius.
    // helixZ(s, r*cos(a), r*sin(a)) is proportional to r^2.
    // So we evaluate at r=1 to get the proportionality constant,
    // then solve r = sqrt(|value| / |z_unit|).
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const z_unit = helixZ(s, ca, sa); // z at r=1
    if (Math.abs(z_unit) < 1e-15) {
        // Degenerate angle for this section; shift slightly
        return discoverPath(value, section, angle + 0.1, depth);
    }
    // z = z_unit * r^2, so r = sqrt(|value / z_unit|)
    const radius = Math.sqrt(Math.abs(value / z_unit));
    // Check sign: if value and z_unit have opposite signs, rotate by pi/2
    // (rotating by pi doesn't help because z is quadratic in both x,y;
    //  rotating by pi/2 swaps axes and flips the sign of the product)
    if ((value < 0 && z_unit > 0) || (value > 0 && z_unit < 0)) {
        const angle2 = angle + Math.PI / 2;
        return discoverPath(value, section, angle2, depth);
    }
    return { section: s, angle, radius, depth };
}
// ─── String encoding: string → path expression array ─────────────────────────
/**
 * Encode a string as a sequence of path expressions.
 * Each character's code point becomes a path on the manifold.
 */
function stringToPathExprs(str) {
    const exprs = new Array(str.length);
    for (let i = 0; i < str.length; i++) {
        exprs[i] = discoverPath(str.charCodeAt(i), i % 7, Math.PI / 4, 0);
    }
    return exprs;
}
/** Reconstruct a string from path expressions. */
function pathExprsToString(exprs) {
    const codes = new Array(exprs.length);
    for (let i = 0; i < exprs.length; i++) {
        codes[i] = String.fromCharCode(Math.round(evaluatePath(exprs[i])));
    }
    return codes.join("");
}
