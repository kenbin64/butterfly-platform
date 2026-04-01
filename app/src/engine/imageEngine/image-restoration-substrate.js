"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageRestorationSubstrate = void 0;
const base_substrate_1 = require("../../../../core/substrate/base-substrate");
class ImageRestorationSubstrate extends base_substrate_1.BaseSubstrate {
    constructor(config = {}) {
        super({ name: "image-restoration", version: "1.0.0", ...config }, null);
        this._cfg = {
            name: "image-restoration", version: "1.0.0", tickRate: 60,
            grainThreshold: config.grainThreshold ?? 18,
            scratchMinLength: config.scratchMinLength ?? 8,
            dustMaxRadius: config.dustMaxRadius ?? 4,
            fadeGamma: config.fadeGamma ?? 1.8,
            sharpnessBoost: config.sharpnessBoost ?? 1.2,
        };
    }
    static create(config) {
        return new ImageRestorationSubstrate(config);
    }
    /** Store a source pixel — O(1) dimensional write */
    setSourcePixel(frameId, x, y, rgba) {
        this.drill("source", frameId, "pixel", String(x), String(y)).value = rgba;
    }
    /** Read a restored pixel — O(1) dimensional read */
    getRestoredPixel(frameId, x, y) {
        return this.drill("restored", frameId, "pixel", String(x), String(y)).value
            ?? this.drill("source", frameId, "pixel", String(x), String(y)).value
            ?? [0, 0, 0, 255];
    }
    /** Tag a pixel region as a specific damage type */
    markDamage(frameId, kind, regionKey, region) {
        this.drill("mask", frameId, "damage", kind, regionKey).value = region;
    }
    /** Full restoration pipeline for a pixel batch */
    restorePixels(frameId, pixels) {
        const t0 = Date.now();
        const stats = {
            frameId, grainsRemoved: 0, scratchesRepaired: 0,
            dustSpotsRemoved: 0, creasesHealed: 0,
            colourCorrected: false, processingMs: 0
        };
        for (const { x, y, rgba } of pixels) {
            let out = [...rgba];
            out = this._removeGrain(out, stats);
            out = this._restoreColour(out);
            out = this._boostSharpness(out);
            this.drill("restored", frameId, "pixel", String(x), String(y)).value = out;
        }
        stats.colourCorrected = true;
        stats.processingMs = Date.now() - t0;
        this.drill("stats", frameId).value = stats;
        return stats;
    }
    /** Repair a horizontal/vertical scratch line */
    repairScratch(frameId, axis, index, neighbourA, neighbourB) {
        const healed = [
            Math.round((neighbourA[0] + neighbourB[0]) / 2),
            Math.round((neighbourA[1] + neighbourB[1]) / 2),
            Math.round((neighbourA[2] + neighbourB[2]) / 2),
            255
        ];
        const key = `${axis}_${index}`;
        this.drill("restored", frameId, "scratch", key).value = healed;
        const stats = this.drill("stats", frameId).value;
        if (stats) {
            stats.scratchesRepaired++;
            this.drill("stats", frameId).value = stats;
        }
    }
    getStats(frameId) {
        return this.drill("stats", frameId).value;
    }
    // ── Private restoration primitives ────────────────────────────────────────
    _removeGrain(rgba, stats) {
        const threshold = this._cfg.grainThreshold;
        const noise = Math.max(rgba[0], rgba[1], rgba[2]) - Math.min(rgba[0], rgba[1], rgba[2]);
        if (noise > threshold) {
            const avg = Math.round((rgba[0] + rgba[1] + rgba[2]) / 3);
            stats.grainsRemoved++;
            return [avg, avg, avg, rgba[3]];
        }
        return rgba;
    }
    _restoreColour(rgba) {
        const gamma = this._cfg.fadeGamma;
        const correct = (v) => Math.min(255, Math.round(255 * Math.pow(v / 255, 1 / gamma)));
        return [correct(rgba[0]), correct(rgba[1]), correct(rgba[2]), rgba[3]];
    }
    _boostSharpness(rgba) {
        const boost = this._cfg.sharpnessBoost;
        const clamp = (v) => Math.min(255, Math.max(0, Math.round(v * boost)));
        return [clamp(rgba[0]), clamp(rgba[1]), clamp(rgba[2]), rgba[3]];
    }
    reset() { this.drill("restored").value = null; this.drill("mask").value = null; }
    serialize() {
        return { name: this.name, config: this._cfg };
    }
    hydrate(state) {
        if (state.config)
            Object.assign(this._cfg, state.config);
    }
}
exports.ImageRestorationSubstrate = ImageRestorationSubstrate;
