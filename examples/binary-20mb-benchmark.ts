// examples/binary-20mb-benchmark.ts
// Real-world PNG binary benchmark — uses actual specimen image data
// Demonstrates: cold encode, hot encode, cold materialise, hot materialise,
// integrity verification, harmonic compaction with real structured data.

import { GameSubstrate } from "../app/src/engine/gameengine";
import * as fs from "fs";
import * as path from "path";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function bench(name: string, iters: number, fn: () => void) {
  for (let i = 0; i < 3; i++) fn(); // warm
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) fn();
  const ms = performance.now() - t0;
  const ns = (ms * 1e6) / iters;
  const ops = Math.round(iters / (ms / 1000));
  return { name, iters, ms, ns, ops };
}

function print(r: ReturnType<typeof bench>) {
  console.log(`  ${r.name}`);
  console.log(`    ${r.iters.toLocaleString()} iters in ${r.ms.toFixed(2)} ms`);
  console.log(`    ${r.ns.toFixed(2)} ns/op | ${r.ops.toLocaleString()} ops/sec`);
}

function fmt(bytes: number): string {
  if (bytes >= 1e6) return (bytes / 1e6).toFixed(2) + " MB";
  if (bytes >= 1e3) return (bytes / 1e3).toFixed(2) + " KB";
  return bytes + " B";
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAD REAL PNG SPECIMEN
// ═══════════════════════════════════════════════════════════════════════════

const pngPath = path.resolve(__dirname, "../.augment/examples/specimin.png");
const pixelData = new Uint8Array(fs.readFileSync(pngPath));
const SIZE = pixelData.length;

console.log("\n╔═══════════════════════════════════════════════════════════════╗");
console.log("║  REAL PNG BENCHMARK — Manifold vs Traditional                ║");
console.log("╚═══════════════════════════════════════════════════════════════╝\n");
console.log(`  Specimen: ${path.basename(pngPath)}`);
console.log(`  Payload:  ${fmt(SIZE)} of real PNG binary data\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 1. COLD ENCODE — First encode (O(N) coordinate mapping)
// ═══════════════════════════════════════════════════════════════════════════

console.log("─── 1. COLD ENCODE (first touch — O(N) coordinate map) ────────\n");

const sub = GameSubstrate.create();

const coldStart = performance.now();
const enc = sub.encodeToWaveform(pixelData);
const coldMs = performance.now() - coldStart;

console.log(`  encodeToWaveform (cold): ${coldMs.toFixed(2)} ms`);
console.log(`  Throughput: ${(SIZE / coldMs / 1e3).toFixed(2)} MB/s`);
console.log(`  Activations: ${enc.yValues.length.toLocaleString()} (x, y) surface points`);
console.log(`  Checksum: ${enc.checksum.toFixed(6)}\n`);

// Traditional comparison: Buffer.from copy
const tradColdStart = performance.now();
const tradCopy = Buffer.from(pixelData);
const tradColdMs = performance.now() - tradColdStart;
console.log(`  Buffer.from (cold copy): ${tradColdMs.toFixed(2)} ms`);
console.log(`  → Manifold cold encode: ${(coldMs / tradColdMs).toFixed(2)}× vs Buffer.from\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 2. HOT ENCODE — Delta cache fires (O(1) ref equality)
// ═══════════════════════════════════════════════════════════════════════════

console.log("─── 2. HOT ENCODE (delta cache — O(1) ref equality) ──────────\n");

const hotEnc = bench("encodeToWaveform (hot, same ref)", 100_000, () => {
  sub.encodeToWaveform(pixelData);
});
print(hotEnc);

const hotBuf = bench("Buffer.from (always copies)", 100, () => {
  Buffer.from(pixelData);
});
print(hotBuf);

console.log(`  → Hot encode: ${(hotBuf.ns / hotEnc.ns).toFixed(0)}× faster than Buffer.from\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 3. COLD MATERIALISE — First materialiseBuffer (O(N) coord read)
// ═══════════════════════════════════════════════════════════════════════════

console.log("─── 3. COLD MATERIALISE (O(N) coordinate read) ───────────────\n");

const matColdStart = performance.now();
const matBytes = sub.materialiseBuffer();
const matColdMs = performance.now() - matColdStart;

console.log(`  materialiseBuffer (cold): ${matColdMs.toFixed(2)} ms`);
console.log(`  Throughput: ${(SIZE / matColdMs / 1e3).toFixed(2)} MB/s`);
console.log(`  Output size: ${fmt(matBytes.length)}\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 4. HOT MATERIALISE — Decode delta cache (O(1))
// ═══════════════════════════════════════════════════════════════════════════

console.log("─── 4. HOT MATERIALISE (decode delta cache — O(1)) ───────────\n");

const hotMat = bench("materialiseBuffer (hot)", 100_000, () => {
  sub.materialiseBuffer();
});
print(hotMat);
console.log();

// ═══════════════════════════════════════════════════════════════════════════
// 5. INTEGRITY CHECK — Byte-for-byte comparison
// ═══════════════════════════════════════════════════════════════════════════

console.log("─── 5. INTEGRITY CHECK ─────────────────────────────────────────\n");

let mismatches = 0;
let firstMismatchIdx = -1;
for (let i = 0; i < SIZE; i++) {
  if (matBytes[i] !== pixelData[i]) {
    mismatches++;
    if (firstMismatchIdx === -1) firstMismatchIdx = i;
  }
}

console.log(`  Payload size:  ${fmt(SIZE)}`);
console.log(`  Output size:   ${fmt(matBytes.length)}`);
console.log(`  Mismatches:    ${mismatches}`);
console.log(`  Integrity:     ${mismatches === 0 ? "✅ PERFECT — byte-for-byte identical" : `❌ FAILED at index ${firstMismatchIdx}`}`);

// Verify checksum
const verified = sub.verifyWaveform();
console.log(`  Checksum:      ${verified ? "✅ VALID" : "❌ INVALID"}\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 6. STORAGE COMPARISON
// ═══════════════════════════════════════════════════════════════════════════

console.log("─── 6. STORAGE FOOTPRINT ───────────────────────────────────────\n");

const rawBytes = SIZE;
const manifoldBytes = enc.xValues.byteLength + enc.yValues.byteLength; // x + y activations
console.log(`  Raw binary:     ${fmt(rawBytes)}`);
console.log(`  Manifold (f64): ${fmt(manifoldBytes)} (${(manifoldBytes / rawBytes).toFixed(1)}× — lossless surface activations)`);
console.log(`  Note: x + y activations; z is derived by evaluating the surface equation.\n`);

// ═══════════════════════════════════════════════════════════════════════════
// 7. SUMMARY TABLE
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// 8. HARMONIC COMPACTION
// ═══════════════════════════════════════════════════════════════════════════

console.log("─── 8. HARMONIC COMPACTION ─────────────────────────────────────\n");

const BLOCK_SIZE = 4096;
const K_VALUES = [16, 32, 64, 128];

for (const K of K_VALUES) {
  const compactStart = performance.now();
  const hm = sub.compactWaveform(BLOCK_SIZE, K)!;
  const compactMs = performance.now() - compactStart;

  const expandStart = performance.now();
  const reconstructed = sub.expandFromHarmonics(hm);
  const expandMs = performance.now() - expandStart;

  const storageBytes = sub.harmonicStorageBytes(hm);
  const mse = sub.harmonicMSE(enc.yValues, reconstructed);
  const psnr = sub.harmonicPSNR(enc.yValues, reconstructed);
  const ratio = SIZE / storageBytes;

  // Byte-level accuracy: evaluate surface z = _helixZ(s, x, y_recon) → byte
  let byteMatches = 0;
  for (let i = 0; i < SIZE; i++) {
    const orig = pixelData[i];
    // Use surface evaluation via readManifold — the manifold derives the value
    const z = sub.readManifold(enc.xValues[i], reconstructed[i], i % 7);
    const recon = Math.min(255, Math.max(0, Math.round(z * 255)));
    if (orig === recon) byteMatches++;
  }
  const byteAccuracy = (byteMatches / SIZE * 100).toFixed(2);

  console.log(`  K=${K} harmonics/block (block=${BLOCK_SIZE}):`);
  console.log(`    Compact:    ${compactMs.toFixed(2)} ms  (${(SIZE / compactMs / 1e3).toFixed(0)} MB/s)`);
  console.log(`    Expand:     ${expandMs.toFixed(2)} ms  (${(SIZE / expandMs / 1e3).toFixed(0)} MB/s)`);
  console.log(`    Storage:    ${fmt(storageBytes)}  (${ratio.toFixed(1)}× compression)`);
  console.log(`    MSE:        ${mse.toExponential(4)}`);
  console.log(`    PSNR:       ${psnr.toFixed(2)} dB`);
  console.log(`    Byte match: ${byteAccuracy}% (${byteMatches.toLocaleString()} / ${SIZE.toLocaleString()})\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log("═══════════════════════════════════════════════════════════════");
console.log("  SUMMARY — 20 MB Binary Round-Trip");
console.log("═══════════════════════════════════════════════════════════════");
console.log(`  Cold encode:       ${coldMs.toFixed(2)} ms  (${(SIZE / coldMs / 1e3).toFixed(0)} MB/s)`);
console.log(`  Hot encode:        ${hotEnc.ns.toFixed(2)} ns  (delta cache → O(1))`);
console.log(`  Cold materialise:  ${matColdMs.toFixed(2)} ms  (${(SIZE / matColdMs / 1e3).toFixed(0)} MB/s)`);
console.log(`  Hot materialise:   ${hotMat.ns.toFixed(2)} ns  (decode cache → O(1))`);
console.log(`  Integrity:         ${mismatches === 0 ? "PERFECT" : "FAILED"}`);
console.log(`  Checksum:          ${verified ? "VALID" : "INVALID"}`);
console.log("═══════════════════════════════════════════════════════════════\n");
