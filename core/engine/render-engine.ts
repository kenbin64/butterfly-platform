// core/engine/render-engine.ts
// ================================================================
//  RENDER ENGINE — 2D Planar
// ================================================================
//
// Operates on IPlanarSubstrate. The screen is a plane of linears (scanlines).
// Each linear is a row of pixel values. Camera, viewport, z-ordering
// via z-invocation on the plane's finite set of linears.
//
// Loose coupling: receives framebuffer via constructor. No cross-engine deps.

import {
  type IEngine, type EngineStats,
  EngineState,
} from "./engine-interface";

import { type IPlanarSubstrate } from "../substrate/substrate-interface";
import { PlanarSubstrate, PointSubstrate } from "../substrate/dimensional-substrate";

// ─── Render Config ──────────────────────────────────────────────────────────

export interface RenderConfig {
  width: number;
  height: number;
}

const DEFAULT_CONFIG: RenderConfig = {
  width: 800,
  height: 600,
};

// ─── Renderable ─────────────────────────────────────────────────────────────
// A renderable is a named planar substrate (sprite, tile, UI element).
// The engine composites renderables onto the framebuffer each tick.

interface Renderable {
  name: string;
  plane: IPlanarSubstrate;
  x: PointSubstrate;
  y: PointSubstrate;
  zOrder: PointSubstrate;
  visible: boolean;
}

// ─── RenderEngine ───────────────────────────────────────────────────────────

export class RenderEngine implements IEngine {
  readonly name = "render";
  private _state: EngineState = EngineState.Idle;
  private _config: RenderConfig;
  private _framebuffer: PlanarSubstrate;
  private _renderables: Map<string, Renderable> = new Map();
  private _camera: { x: PointSubstrate; y: PointSubstrate; zoom: PointSubstrate };
  private _tickCount = 0;
  private _totalTime = 0;
  private _lastTickDuration = 0;
  private _frameCount = 0;

  constructor(config?: Partial<RenderConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._framebuffer = new PlanarSubstrate("framebuffer");
    this._camera = {
      x: new PointSubstrate("cam:x", 0),
      y: new PointSubstrate("cam:y", 0),
      zoom: new PointSubstrate("cam:zoom", 1),
    };
  }

  get state(): EngineState { return this._state; }

  /** The current framebuffer (2D plane). */
  get framebuffer(): PlanarSubstrate { return this._framebuffer; }

  /** Camera position X. */
  get cameraX(): number { return this._camera.x.value; }
  set cameraX(v: number) { this._camera.x.setPath("value", v); }

  /** Camera position Y. */
  get cameraY(): number { return this._camera.y.value; }
  set cameraY(v: number) { this._camera.y.setPath("value", v); }

  /** Camera zoom level. */
  get cameraZoom(): number { return this._camera.zoom.value; }
  set cameraZoom(v: number) { this._camera.zoom.setPath("value", v); }

  /** Number of frames rendered. */
  get frameCount(): number { return this._frameCount; }

  /** Number of renderables. */
  get renderableCount(): number { return this._renderables.size; }

  /**
   * Add a renderable (a named planar substrate).
   */
  addRenderable(name: string, plane: PlanarSubstrate,
                x = 0, y = 0, zOrder = 0): void {
    this._renderables.set(name, {
      name,
      plane,
      x: new PointSubstrate(`${name}:x`, x),
      y: new PointSubstrate(`${name}:y`, y),
      zOrder: new PointSubstrate(`${name}:z`, zOrder),
      visible: true,
    });
  }

  /** Remove a renderable. */
  removeRenderable(name: string): boolean {
    return this._renderables.delete(name);
  }

  /** Set visibility. */
  setVisible(name: string, visible: boolean): void {
    const r = this._renderables.get(name);
    if (r) r.visible = visible;
  }

  /** Get renderable names sorted by z-order. */
  getRenderOrder(): string[] {
    const entries = Array.from(this._renderables.values());
    // Sort finite set of renderables by z-order — not iterating a dimension.
    entries.sort((a, b) => a.zOrder.value - b.zOrder.value);
    return entries.filter(e => e.visible).map(e => e.name);
  }

  /**
   * Tick — composite renderables onto the framebuffer.
   * Iterates the finite set of renderables — not a dimension.
   */
  tick(dt: number): void {
    if (this._state !== EngineState.Running) return;
    const t0 = performance.now();

    // Clear framebuffer
    this._framebuffer.reset();

    // Composite each visible renderable (finite set).
    const order = this.getRenderOrder();
    for (const name of order) {
      const r = this._renderables.get(name)!;
      // Each renderable's plane is composited at (r.x, r.y)
      // relative to the camera. The actual pixel compositing
      // would happen here in a real renderer — we track the operation.
      // z-invocation: read the renderable's position from the manifold.
      const _rx = r.x.value;
      const _ry = r.y.value;
      // In a real engine: blit r.plane onto framebuffer at (rx - camX, ry - camY)
    }

    this._frameCount++;
    this._lastTickDuration = performance.now() - t0;
    this._tickCount++;
    this._totalTime += dt;
  }

  start(): void { this._state = EngineState.Running; }
  stop(): void { this._state = EngineState.Stopped; }
  pause(): void { this._state = EngineState.Paused; }
  resume(): void { this._state = EngineState.Running; }

  reset(): void {
    this._state = EngineState.Idle;
    this._framebuffer.reset();
    this._frameCount = 0;
    this._tickCount = 0;
    this._totalTime = 0;
    this._lastTickDuration = 0;
  }

  serialize(): unknown {
    return {
      config: this._config,
      camera: {
        x: this._camera.x.value,
        y: this._camera.y.value,
        zoom: this._camera.zoom.value,
      },
      frameCount: this._frameCount,
    };
  }

  hydrate(state: any): void {
    if (state.config) this._config = { ...DEFAULT_CONFIG, ...state.config };
    if (state.camera) {
      this._camera.x.setPath("value", state.camera.x ?? 0);
      this._camera.y.setPath("value", state.camera.y ?? 0);
      this._camera.zoom.setPath("value", state.camera.zoom ?? 1);
    }
    this._frameCount = state.frameCount ?? 0;
  }

  getStats(): EngineStats {
    return {
      name: this.name,
      state: this._state,
      tickCount: this._tickCount,
      totalTime: this._totalTime,
      lastTickDuration: this._lastTickDuration,
    };
  }
}

