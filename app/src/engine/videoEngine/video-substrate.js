"use strict";
// app/src/engine/videoEngine/video-substrate.ts
// Manifold-based video/image processing substrate
// Drill to pixels, colors, frames - no iteration over pixel arrays
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoSubstrate = void 0;
const base_substrate_1 = require("../../../../core/substrate/base-substrate");
const DEFAULT_CONFIG = {
    name: "video",
    version: "1.0.0"
};
/**
 * VideoSubstrate
 * --------------
 * Manifold-based image/video processing.
 *
 * Coordinates:
 *   drill("meta", "width")                    → number
 *   drill("frame", "0", "x", "100", "y", "50") → pixel dimension
 *   drill("frame", "0", "x", "100", "y", "50", "rgba") → [r, g, b, a]
 *   drill("frame", "0", "region", "face_0")   → detected region
 *
 * NEVER iterate over all pixels - drill to coordinates.
 * Use pattern matching for regions: match(/^face_/)
 */
class VideoSubstrate extends base_substrate_1.BaseSubstrate {
    constructor(config) {
        super({ ...DEFAULT_CONFIG, ...config }, {
            width: 0,
            height: 0,
            frameCount: 0,
            currentFrame: 0,
            format: "unknown"
        });
    }
    /** Create video substrate */
    static create(config) {
        return new VideoSubstrate(config);
    }
    /** Load image/video metadata */
    loadMeta(width, height, frameCount = 1, format = "rgb") {
        this.drill("meta", "width").value = width;
        this.drill("meta", "height").value = height;
        this.drill("meta", "frameCount").value = frameCount;
        this.drill("meta", "format").value = format;
    }
    /** Get pixel at coordinate - O(1) */
    pixel(frame, x, y) {
        return this.drill("frame", String(frame), "x", String(x), "y", String(y));
    }
    /** Set pixel color */
    setPixel(frame, x, y, color) {
        const p = this.pixel(frame, x, y);
        if (color.length === 4) {
            p.drill("rgba").value = color;
        }
        else {
            p.drill("rgb").value = color;
            p.drill("rgba").value = [...color, 255];
        }
    }
    /** Get pixel color */
    getPixel(frame, x, y) {
        return this.pixel(frame, x, y).drill("rgba").value || [0, 0, 0, 0];
    }
    /** Sample region (e.g., for detected face, object) */
    region(frame, regionId) {
        return this.drill("frame", String(frame), "region", regionId);
    }
    /** Find all regions matching pattern */
    findRegions(frame, pattern) {
        return this.drill("frame", String(frame), "region").match(pattern);
    }
    /** Color operations - drill to color space coordinates */
    toHSL(rgba) {
        const r = rgba[0] / 255;
        const g = rgba[1] / 255;
        const b = rgba[2] / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        if (max === min)
            return [0, 0, l];
        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        let h = 0;
        if (max === r)
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g)
            h = ((b - r) / d + 2) / 6;
        else
            h = ((r - g) / d + 4) / 6;
        return [h, s, l];
    }
    /** Reset substrate */
    reset() {
        // Clear all frames (discrete points only, not infinite dimension)
        const meta = this.drill("meta");
        meta.drill("width").value = 0;
        meta.drill("height").value = 0;
        meta.drill("frameCount").value = 0;
    }
    /** Serialize current state */
    serialize() {
        return {
            width: this.drill("meta", "width").value || 0,
            height: this.drill("meta", "height").value || 0,
            frameCount: this.drill("meta", "frameCount").value || 0,
            currentFrame: this.drill("meta", "currentFrame").value || 0,
            format: this.drill("meta", "format").value || "unknown"
        };
    }
    /** Hydrate from state */
    hydrate(state) {
        this.loadMeta(state.width, state.height, state.frameCount, state.format);
        this.drill("meta", "currentFrame").value = state.currentFrame;
    }
}
exports.VideoSubstrate = VideoSubstrate;
