// examples/path-expression-demo.ts
// Demonstrates: data lives in the manifold (z = x*y).
// The substrate stores only path expressions (addresses), not data.
// Evaluating the path on the manifold yields the original value.

import {
  evaluatePath, discoverPath,
  stringToPathExprs, pathExprsToString,
  PathExpr
} from "../core/substrate/path-expressions";

console.log("============================================================");
console.log("  MANIFOLD PATH EXPRESSION DEMO");
console.log("  Data lives in the manifold. The substrate stores the map.");
console.log("============================================================");
console.log();

// --- Define a "car" object via path expressions -------------------------

const car: Record<string, number | string> = {
  name: "car",
  wheels: 4,
  color: "#ff0000",
  speed: 120,
  weight: 1500,
  frequency: 440,
};

console.log("Original object:");
console.log(car);
console.log();

// --- Discover paths for each property -----------------------------------
// For each value, we find WHERE on the manifold that value already exists.
// The manifold is z = x*y on a 7-section helix. Every value is already there.
// We just need to record the address (section, angle, radius).

const pathTable: Record<string, PathExpr | PathExpr[]> = {};

for (const [key, value] of Object.entries(car)) {
  if (typeof value === "number") {
    pathTable[key] = discoverPath(value, key.length % 7);
  } else {
    pathTable[key] = stringToPathExprs(value);
  }
}

console.log("Path expressions (what the substrate stores):");
for (const [key, expr] of Object.entries(pathTable)) {
  if (Array.isArray(expr)) {
    console.log(`  ${key}: [${expr.length} path exprs] (string)`);
    for (const e of expr) {
      console.log(`    section=${e.section} angle=${e.angle.toFixed(4)} radius=${e.radius.toFixed(6)}`);
    }
  } else {
    console.log(`  ${key}: section=${expr.section} angle=${expr.angle.toFixed(4)} radius=${expr.radius.toFixed(6)}`);
  }
}
console.log();

// --- Reconstruct by evaluating the manifold -----------------------------
// No data is stored. We walk the path on z = x*y and read what's there.

console.log("Reconstructed from manifold (evaluatePath):");
const reconstructed: Record<string, number | string> = {};

for (const [key, expr] of Object.entries(pathTable)) {
  if (Array.isArray(expr)) {
    reconstructed[key] = pathExprsToString(expr);
  } else {
    reconstructed[key] = Math.round(evaluatePath(expr));
  }
}
console.log(reconstructed);
console.log();

// --- Verify round-trip --------------------------------------------------

console.log("Round-trip verification:");
let allMatch = true;
for (const key of Object.keys(car)) {
  const orig = car[key];
  const recon = reconstructed[key];
  const match = orig === recon;
  const mark = match ? "PASS" : "FAIL";
  console.log(`  ${key}: ${JSON.stringify(orig)} -> ${JSON.stringify(recon)}  [${mark}]`);
  if (!match) allMatch = false;
}
console.log();
if (allMatch) {
  console.log("ALL VALUES MATCH.");
  console.log("Data lives in the manifold. Substrate stores only paths.");
} else {
  console.log("SOME MISMATCHES - needs investigation.");
}

// --- Storage comparison -------------------------------------------------

const jsonStr = JSON.stringify(car);
const pathStr = JSON.stringify(pathTable);
console.log();
console.log("Storage comparison:");
console.log(`  JSON representation:  ${jsonStr.length} bytes`);
console.log(`  Path table (JSON):    ${pathStr.length} bytes`);
console.log();
console.log("  Note: The path table is the MAP into z=x*y.");
console.log("  It does not contain data. It contains addresses.");
console.log("  The manifold is the generator. The substrate is the map.");

