"use strict";
/**
 * ImageEngine  —  High-level Image Editor
 * ========================================
 * STANDALONE — works with zero external engines.
 * OPTIONAL integration: pass a MediaSubstrate registry to share assets
 *                       across the engine suite.
 *
 * Capabilities:
 *   • Full photo restoration (grain, scratches, folds, dust, fade)
 *   • AI enhancement pipeline (upscale, HDR, face restore, colour science)
 *   • Non-destructive editing (every op stored as manifold dimension)
 *   • Batch processing
 *   • Auto-enhance: single call, magazine-quality output
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageEngine = void 0;
const image_restoration_substrate_1 = require("./imageEngine/image-restoration-substrate");
const image_enhancement_substrate_1 = require("./imageEngine/image-enhancement-substrate");
class ImageEngine {
    constructor(config = {}) {
        this._frames = new Map();
        this._restoration = image_restoration_substrate_1.ImageRestorationSubstrate.create(config.restoration);
        this._enhancement = image_enhancement_substrate_1.ImageEnhancementSubstrate.create(config.enhancement);
        this._registry = config.registry;
        // Optionally self-register with MIA — does NOT throw if absent
        if (this._registry) {
            this._registry.registerEngine("image", this);
        }
    }
    static create(config) {
        return new ImageEngine(config);
    }
    // ── Frame management ──────────────────────────────────────────────────────
    loadFrame(frame) {
        this._frames.set(frame.id, frame);
        // Seed source pixels into the restoration substrate
        for (let i = 0; i < frame.pixels.length; i++) {
            const x = i % frame.width;
            const y = Math.floor(i / frame.width);
            this._restoration.setSourcePixel(frame.id, x, y, frame.pixels[i]);
        }
        if (this._registry) {
            this._registry.emit("image:loaded", { frameId: frame.id });
        }
    }
    getFrame(id) {
        return this._frames.get(id);
    }
    // ── Core pipelines ────────────────────────────────────────────────────────
    /**
     * restore() — Remove all damage artefacts from an old photo.
     * Returns per-frame stats. Non-destructive: source pixels untouched.
     */
    restore(frameId) {
        const frame = this._frames.get(frameId);
        if (!frame)
            throw new Error(`ImageEngine: frame "${frameId}" not loaded`);
        const pixels = frame.pixels.map((px, i) => ({
            x: i % frame.width,
            y: Math.floor(i / frame.width),
            rgba: px
        }));
        const stats = this._restoration.restorePixels(frameId, pixels);
        if (this._registry) {
            this._registry.emit("image:restored", { frameId, stats });
        }
        return stats;
    }
    /**
     * enhance() — Apply full AI enhancement after restoration.
     * Uses ACES tone-mapping, 4× upscale, face restoration, colour science.
     */
    enhance(frameId) {
        const frame = this._frames.get(frameId);
        if (!frame)
            throw new Error(`ImageEngine: frame "${frameId}" not loaded`);
        const t0 = Date.now();
        const output = [];
        for (let i = 0; i < frame.pixels.length; i++) {
            const x = i % frame.width;
            const y = Math.floor(i / frame.width);
            const src = this._restoration.getRestoredPixel(frameId, x, y);
            output.push(this._enhancement.enhancePixel(frameId, x, y, src));
        }
        const meta = {
            frameId,
            upscaleMode: this._enhancement["_cfg"].upscaleMode,
            toneMap: this._enhancement["_cfg"].toneMap,
            facesDetected: this._enhancement.getFaces(frameId).length,
            processingMs: Date.now() - t0
        };
        this._enhancement.writeMeta(frameId, meta);
        if (this._registry) {
            this._registry.emit("image:enhanced", { frameId, meta });
        }
        return { output, meta };
    }
    /**
     * autoEnhance() — One-shot: restore + enhance in a single call.
     * Turns a scanned 1940s photograph into a crisp modern digital image.
     */
    autoEnhance(frameId) {
        const restoreStats = this.restore(frameId);
        const { output, meta } = this.enhance(frameId);
        return { restoreStats, output, meta };
    }
    /** Register a detected face for face-aware enhancement */
    registerFace(frameId, face) {
        this._enhancement.registerFace(frameId, face);
    }
    /** Direct access to the restoration substrate (for custom pipelines) */
    get restoration() { return this._restoration; }
    /** Direct access to the enhancement substrate (for custom pipelines) */
    get enhancement() { return this._enhancement; }
    /** Diagnostics — dimensionally addresses current engine state */
    diagnostics() {
        return {
            hasMIA: !!this._registry,
            substrates: {
                restoration: this._restoration.constructor.name,
                enhancement: this._enhancement.constructor.name,
            },
        };
    }
}
exports.ImageEngine = ImageEngine;
