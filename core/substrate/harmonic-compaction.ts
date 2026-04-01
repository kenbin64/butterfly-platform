// core/substrate/harmonic-compaction.ts
// Harmonic compaction: store K dominant harmonics per block instead of all N samples.
// Uses a pure-TypeScript radix-2 Cooley-Tukey FFT — no external dependencies.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Harmonic {
  k: number;         // harmonic index (frequency bin)
  amplitude: number; // magnitude of the frequency component
  phase: number;     // phase angle (radians)
}

export interface HarmonicBlock {
  blockIndex: number;
  blockLength: number;
  dcComponent: number;  // DC offset (bin 0 real / blockLength)
  harmonics: Harmonic[];
}

export interface HarmonicManifold {
  length: number;         // total samples in the original waveform
  blockSize: number;
  maxHarmonics: number;   // K — harmonics kept per block
  blocks: HarmonicBlock[];
}

// ─── Radix-2 Cooley-Tukey FFT ────────────────────────────────────────────────
// In-place, iterative, O(N log N).  N must be a power of 2.

function bitReverse(n: number, bits: number): number {
  let reversed = 0;
  for (let i = 0; i < bits; i++) {
    reversed = (reversed << 1) | (n & 1);
    n >>= 1;
  }
  return reversed;
}

/**
 * In-place radix-2 FFT.  Operates on interleaved re/im Float64Arrays.
 * @param re  Real parts (length N, power of 2)
 * @param im  Imaginary parts (length N)
 * @param inverse  If true, computes the inverse FFT (scales by 1/N)
 */
function fftInPlace(re: Float64Array, im: Float64Array, inverse: boolean = false): void {
  const N = re.length;
  const bits = Math.log2(N) | 0;

  // ── Bit-reversal permutation ──
  for (let i = 0; i < N; i++) {
    const j = bitReverse(i, bits);
    if (j > i) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
  }

  // ── Butterfly stages ──
  const dir = inverse ? 1 : -1;
  for (let size = 2; size <= N; size *= 2) {
    const halfSize = size / 2;
    const angle = dir * (2 * Math.PI) / size;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);

    for (let i = 0; i < N; i += size) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < halfSize; j++) {
        const a = i + j;
        const b = a + halfSize;
        const tRe = curRe * re[b] - curIm * im[b];
        const tIm = curRe * im[b] + curIm * re[b];
        re[b] = re[a] - tRe;
        im[b] = im[a] - tIm;
        re[a] += tRe;
        im[a] += tIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < N; i++) {
      re[i] /= N;
      im[i] /= N;
    }
  }
}

/**
 * Forward real FFT on a block of samples.
 * Pads to the next power of 2 if necessary.
 * Returns complex spectrum {re, im} of length paddedN.
 */
function fftReal(block: Float64Array | { subarray(a: number, b: number): Float64Array }, blockLen: number): { re: Float64Array; im: Float64Array; paddedN: number } {
  // Next power of 2
  let paddedN = 1;
  while (paddedN < blockLen) paddedN <<= 1;

  const re = new Float64Array(paddedN);
  const im = new Float64Array(paddedN);

  // Copy samples into re (zero-padded)
  for (let i = 0; i < blockLen; i++) {
    re[i] = (block as Float64Array)[i];
  }

  fftInPlace(re, im, false);
  return { re, im, paddedN };
}

// ─── Compaction ───────────────────────────────────────────────────────────────

/**
 * Compact a waveform (Float64Array of y-coordinates) into a HarmonicManifold.
 * Splits into fixed-size blocks, FFTs each, keeps the top K harmonics.
 *
 * @param yValues          Full y-coordinate array from WaveformEncoding
 * @param blockSize        Samples per block (default 4096)
 * @param maxHarmonics     K — harmonics to keep per block (default 64)
 */
export function compactHarmonics(
  yValues: Float64Array,
  blockSize: number = 4096,
  maxHarmonics: number = 64
): HarmonicManifold {
  const totalLength = yValues.length;
  const numBlocks = Math.ceil(totalLength / blockSize);
  const blocks: HarmonicBlock[] = new Array(numBlocks);

  for (let b = 0; b < numBlocks; b++) {
    const start = b * blockSize;
    const end = Math.min(start + blockSize, totalLength);
    const blockLen = end - start;

    const block = yValues.subarray(start, end);
    const { re, im, paddedN } = fftReal(block, blockLen);

    // DC component (average value of the block)
    const dc = re[0] / paddedN;

    // Build harmonic list from bins 1..paddedN/2
    const half = paddedN >>> 1;
    const harmonics: Harmonic[] = new Array(half);
    for (let k = 0; k < half; k++) {
      const kIdx = k + 1;
      const amplitude = Math.hypot(re[kIdx], im[kIdx]) / (paddedN / 2);
      const phase = Math.atan2(im[kIdx], re[kIdx]);
      harmonics[k] = { k: kIdx, amplitude, phase };
    }

    // Sort by amplitude descending, keep top K
    harmonics.sort((a, b) => b.amplitude - a.amplitude);
    const top = harmonics.slice(0, Math.min(maxHarmonics, harmonics.length));

    blocks[b] = { blockIndex: b, blockLength: blockLen, dcComponent: dc, harmonics: top };
  }

  return { length: totalLength, blockSize, maxHarmonics, blocks };
}

// ─── Expansion (Reconstruction) ──────────────────────────────────────────────

/**
 * Rebuild a waveform from a HarmonicManifold.
 * Uses IFFT for reconstruction — O(N log N) per block instead of O(N × K) naive synthesis.
 * Reconstructs the sparse frequency spectrum from kept harmonics, then inverse-transforms.
 */
export function expandHarmonics(manifold: HarmonicManifold): Float64Array {
  const { length, blockSize, blocks } = manifold;
  const out = new Float64Array(length);

  for (const block of blocks) {
    const { blockIndex, blockLength, dcComponent, harmonics } = block;
    const start = blockIndex * blockSize;

    // Pad to next power of 2 (must match what compactHarmonics used)
    let paddedN = 1;
    while (paddedN < blockLength) paddedN <<= 1;

    const halfN = paddedN / 2;

    // Build sparse spectrum — only populate bins that were kept
    const re = new Float64Array(paddedN);
    const im = new Float64Array(paddedN);

    // DC bin
    re[0] = dcComponent * paddedN;

    // Populate kept harmonic bins (and their conjugate mirrors)
    for (const h of harmonics) {
      const mag = h.amplitude * halfN;
      re[h.k] = mag * Math.cos(h.phase);
      im[h.k] = mag * Math.sin(h.phase);
      // Conjugate symmetry for real signal
      const mirror = paddedN - h.k;
      if (mirror !== h.k && mirror < paddedN) {
        re[mirror] = re[h.k];
        im[mirror] = -im[h.k];
      }
    }

    // Inverse FFT
    fftInPlace(re, im, true);

    // Copy real part to output (truncate to original block length)
    for (let n = 0; n < blockLength; n++) {
      out[start + n] = re[n];
    }
  }

  return out;
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

/** Compute storage size of a HarmonicManifold in bytes. */
export function harmonicStorageBytes(manifold: HarmonicManifold): number {
  // Per block: blockIndex(4) + blockLength(4) + dcComponent(8) + harmonics
  // Per harmonic: k(4) + amplitude(8) + phase(8) = 20 bytes
  // Header: length(4) + blockSize(4) + maxHarmonics(4) = 12 bytes
  let total = 12;
  for (const block of manifold.blocks) {
    total += 16 + block.harmonics.length * 20;
  }
  return total;
}

/** Mean Squared Error between original and reconstructed waveforms. */
export function computeMSE(original: Float64Array, reconstructed: Float64Array): number {
  const N = Math.min(original.length, reconstructed.length);
  let sum = 0;
  for (let i = 0; i < N; i++) {
    const d = original[i] - reconstructed[i];
    sum += d * d;
  }
  return sum / N;
}

/** Peak Signal-to-Noise Ratio (dB). Higher = better. */
export function computePSNR(original: Float64Array, reconstructed: Float64Array): number {
  const mse = computeMSE(original, reconstructed);
  if (mse === 0) return Infinity;
  // yValues are in [0, 1], so peak = 1.0
  return 10 * Math.log10(1 / mse);
}

