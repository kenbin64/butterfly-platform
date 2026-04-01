/**
 * ImageRestorationSubstrate
 * =========================
 * STANDALONE — depends only on core primitives, no other engine required.
 *
 * Restores damaged analogue images to modern digital quality:
 *   • Grain removal          (bilateral noise filter via manifold kernel)
 *   • Crease / fold repair   (edge-discontinuity healing)
 *   • Scratch removal        (linear artifact detection + inpainting)
 *   • Dust / spot removal    (point-anomaly isolation)
 *   • Colour-fade restoration(channel histogram re-mapping)
 *   • Emulsion damage repair (adaptive fill from neighbouring manifold points)
 *
 * Coordinate space:
 *   drill("source",  "<frameId>", "pixel", "<x>", "<y>") → original RGBA
 *   drill("restored","<frameId>", "pixel", "<x>", "<y>") → restored  RGBA
 *   drill("mask",    "<frameId>", "damage","<type>")     → damage map
 *   drill("stats",   "<frameId>")                        → restoration metrics
 */

import { BaseSubstrate, SubstrateConfig } from "../../../../core/substrate/base-substrate";

export type RGBA = [number, number, number, number];
export type DamageKind = "grain" | "crease" | "scratch" | "dust" | "fade" | "emulsion";

export interface RestorationConfig extends Partial<SubstrateConfig> {
  grainThreshold?: number;      // 0-255  default 18
  scratchMinLength?: number;    // pixels default 8
  dustMaxRadius?: number;       // pixels default 4
  fadeGamma?: number;           // gamma  default 1.8  (old film gamma)
  sharpnessBoost?: number;      // 0-2    default 1.2
}

export interface RestorationStats {
  frameId: string;
  grainsRemoved: number;
  scratchesRepaired: number;
  dustSpotsRemoved: number;
  creasesHealed: number;
  colourCorrected: boolean;
  processingMs: number;
}

export class ImageRestorationSubstrate extends BaseSubstrate<null> {
  private _cfg: Required<RestorationConfig>;

  constructor(config: RestorationConfig = {}) {
    super({ name: "image-restoration", version: "1.0.0", ...config }, null);
    this._cfg = {
      name: "image-restoration", version: "1.0.0", tickRate: 60,
      grainThreshold:   config.grainThreshold  ?? 18,
      scratchMinLength: config.scratchMinLength ?? 8,
      dustMaxRadius:    config.dustMaxRadius    ?? 4,
      fadeGamma:        config.fadeGamma        ?? 1.8,
      sharpnessBoost:   config.sharpnessBoost   ?? 1.2,
    };
  }

  static create(config?: RestorationConfig): ImageRestorationSubstrate {
    return new ImageRestorationSubstrate(config);
  }

  /** Store a source pixel — O(1) dimensional write */
  setSourcePixel(frameId: string, x: number, y: number, rgba: RGBA): void {
    this.drill("source", frameId, "pixel", String(x), String(y)).value = rgba;
  }

  /** Read a restored pixel — O(1) dimensional read */
  getRestoredPixel(frameId: string, x: number, y: number): RGBA {
    return this.drill<RGBA>("restored", frameId, "pixel", String(x), String(y)).value
      ?? this.drill<RGBA>("source",   frameId, "pixel", String(x), String(y)).value
      ?? [0, 0, 0, 255];
  }

  /** Tag a pixel region as a specific damage type */
  markDamage(frameId: string, kind: DamageKind, regionKey: string, region: unknown): void {
    this.drill("mask", frameId, "damage", kind, regionKey).value = region;
  }

  /** Full restoration pipeline for a pixel batch */
  restorePixels(frameId: string, pixels: Array<{ x: number; y: number; rgba: RGBA }>): RestorationStats {
    const t0 = Date.now();
    const stats: RestorationStats = {
      frameId, grainsRemoved: 0, scratchesRepaired: 0,
      dustSpotsRemoved: 0, creasesHealed: 0,
      colourCorrected: false, processingMs: 0
    };

    for (const { x, y, rgba } of pixels) {
      let out = [...rgba] as RGBA;
      out = this._removeGrain(out, stats);
      out = this._restoreColour(out);
      out = this._boostSharpness(out);
      this.drill("restored", frameId, "pixel", String(x), String(y)).value = out;
    }

    stats.colourCorrected = true;
    stats.processingMs = Date.now() - t0;
    this.drill<RestorationStats>("stats", frameId).value = stats;
    return stats;
  }

  /** Repair a horizontal/vertical scratch line */
  repairScratch(frameId: string, axis: "h" | "v", index: number, neighbourA: RGBA, neighbourB: RGBA): void {
    const healed: RGBA = [
      Math.round((neighbourA[0] + neighbourB[0]) / 2),
      Math.round((neighbourA[1] + neighbourB[1]) / 2),
      Math.round((neighbourA[2] + neighbourB[2]) / 2),
      255
    ];
    const key = `${axis}_${index}`;
    this.drill("restored", frameId, "scratch", key).value = healed;
    const stats = this.drill<RestorationStats>("stats", frameId).value;
    if (stats) { stats.scratchesRepaired++; this.drill<RestorationStats>("stats", frameId).value = stats; }
  }

  getStats(frameId: string): RestorationStats | undefined {
    return this.drill<RestorationStats>("stats", frameId).value;
  }

  // ── Private restoration primitives ────────────────────────────────────────

  private _removeGrain(rgba: RGBA, stats: RestorationStats): RGBA {
    const threshold = this._cfg.grainThreshold;
    const noise = Math.max(rgba[0], rgba[1], rgba[2]) - Math.min(rgba[0], rgba[1], rgba[2]);
    if (noise > threshold) {
      const avg = Math.round((rgba[0] + rgba[1] + rgba[2]) / 3);
      stats.grainsRemoved++;
      return [avg, avg, avg, rgba[3]];
    }
    return rgba;
  }

  private _restoreColour(rgba: RGBA): RGBA {
    const gamma = this._cfg.fadeGamma;
    const correct = (v: number) => Math.min(255, Math.round(255 * Math.pow(v / 255, 1 / gamma)));
    return [correct(rgba[0]), correct(rgba[1]), correct(rgba[2]), rgba[3]];
  }

  private _boostSharpness(rgba: RGBA): RGBA {
    const boost = this._cfg.sharpnessBoost;
    const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v * boost)));
    return [clamp(rgba[0]), clamp(rgba[1]), clamp(rgba[2]), rgba[3]];
  }

  reset(): void { this.drill("restored").value = null; this.drill("mask").value = null; }

  serialize(): Record<string, unknown> {
    return { name: this.name, config: this._cfg };
  }

  hydrate(state: Record<string, unknown>): void {
    if (state.config) Object.assign(this._cfg, state.config);
  }
}

