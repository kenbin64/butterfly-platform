// app/src/engine/videoEngine/video-substrate.ts
// Manifold-based video/image processing substrate
// Drill to pixels, colors, frames - no iteration over pixel arrays

import { BaseSubstrate, SubstrateConfig } from "../../../../core/substrate/base-substrate";
import { Dimension } from "../../../../core/dimensional/dimension";

/** RGBA color */
export type RGBA = [number, number, number, number];

/** RGB color */
export type RGB = [number, number, number];

/** Video/Image frame state */
interface VideoState {
  width: number;
  height: number;
  frameCount: number;
  currentFrame: number;
  format: string;
}

const DEFAULT_CONFIG: SubstrateConfig = {
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
export class VideoSubstrate extends BaseSubstrate<VideoState> {
  
  constructor(config?: Partial<SubstrateConfig>) {
    super({ ...DEFAULT_CONFIG, ...config }, {
      width: 0,
      height: 0,
      frameCount: 0,
      currentFrame: 0,
      format: "unknown"
    });
  }

  /** Create video substrate */
  static create(config?: Partial<SubstrateConfig>): VideoSubstrate {
    return new VideoSubstrate(config);
  }

  /** Load image/video metadata */
  loadMeta(width: number, height: number, frameCount: number = 1, format: string = "rgb"): void {
    this.drill("meta", "width").value = width;
    this.drill("meta", "height").value = height;
    this.drill("meta", "frameCount").value = frameCount;
    this.drill("meta", "format").value = format;
  }

  /** Get pixel at coordinate - O(1) */
  pixel(frame: number, x: number, y: number): Dimension {
    return this.drill("frame", String(frame), "x", String(x), "y", String(y));
  }

  /** Set pixel color */
  setPixel(frame: number, x: number, y: number, color: RGBA | RGB): void {
    const p = this.pixel(frame, x, y);
    if (color.length === 4) {
      p.drill("rgba").value = color as RGBA;
    } else {
      p.drill("rgb").value = color as RGB;
      p.drill("rgba").value = [...color, 255] as RGBA;
    }
  }

  /** Get pixel color */
  getPixel(frame: number, x: number, y: number): RGBA {
    return this.pixel(frame, x, y).drill<RGBA>("rgba").value || [0, 0, 0, 0];
  }

  /** Sample region (e.g., for detected face, object) */
  region(frame: number, regionId: string): Dimension {
    return this.drill("frame", String(frame), "region", regionId);
  }

  /** Find all regions matching pattern */
  findRegions(frame: number, pattern: RegExp): Dimension[] {
    return this.drill("frame", String(frame), "region").match(pattern);
  }

  /** Color operations - drill to color space coordinates */
  toHSL(rgba: RGBA): [number, number, number] {
    const r = rgba[0] / 255;
    const g = rgba[1] / 255;
    const b = rgba[2] / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    
    if (max === min) return [0, 0, l];
    
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    
    return [h, s, l];
  }

  /** Reset substrate */
  reset(): void {
    // Clear all frames (discrete points only, not infinite dimension)
    const meta = this.drill("meta");
    meta.drill("width").value = 0;
    meta.drill("height").value = 0;
    meta.drill("frameCount").value = 0;
  }

  /** Serialize current state */
  serialize(): VideoState {
    return {
      width: this.drill<number>("meta", "width").value || 0,
      height: this.drill<number>("meta", "height").value || 0,
      frameCount: this.drill<number>("meta", "frameCount").value || 0,
      currentFrame: this.drill<number>("meta", "currentFrame").value || 0,
      format: this.drill<string>("meta", "format").value || "unknown"
    };
  }

  /** Hydrate from state */
  hydrate(state: VideoState): void {
    this.loadMeta(state.width, state.height, state.frameCount, state.format);
    this.drill("meta", "currentFrame").value = state.currentFrame;
  }
}

