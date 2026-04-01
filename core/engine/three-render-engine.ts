// core/engine/three-render-engine.ts
// ================================================================
//  THREE.JS RENDER ENGINE — 3D Bridge
// ================================================================
//
// One-way bridge: reads SceneSubstrate → syncs Three.js scene graph.
// Three.js never touches the manifold — it only receives data.
//
// Headless mode: when no canvas/renderer is provided, the engine
// still tracks the scene graph internally for testing/simulation.
//
// Stack position:
//   APPLICATION → ThreeRenderEngine → SceneSubstrate/MeshSubstrate → MANIFOLD

import * as THREE from "three";
import {
  type IEngine, type EngineStats,
  EngineState,
} from "./engine-interface";
import { SceneSubstrate, MeshSubstrate, MaterialSubstrate } from "../substrate/high-order-substrates";
import type { GeometryType } from "../substrate/high-order-substrates";

// ─── Config ──────────────────────────────────────────────────────────────────

export interface ThreeRenderConfig {
  width: number;
  height: number;
  antialias: boolean;
  /** If null, runs headless (no WebGL rendering). */
  canvas: HTMLCanvasElement | null;
  pixelRatio: number;
  shadowMap: boolean;
}

const DEFAULT_CONFIG: ThreeRenderConfig = {
  width: 800,
  height: 600,
  antialias: true,
  canvas: null,
  pixelRatio: 1,
  shadowMap: true,
};

// ─── ThreeRenderEngine ──────────────────────────────────────────────────────

export class ThreeRenderEngine implements IEngine {
  readonly name = "three-render";
  private _state: EngineState = EngineState.Idle;
  private _config: ThreeRenderConfig;

  // Three.js objects
  private _scene: THREE.Scene;
  private _camera: THREE.PerspectiveCamera;
  private _renderer: THREE.WebGLRenderer | null = null;

  // SceneSubstrate reference (the manifold source of truth)
  private _sceneSubstrate: SceneSubstrate | null = null;

  // Mesh tracking: meshName → Three.js Mesh
  private _meshMap: Map<string, THREE.Mesh> = new Map();
  // MeshSubstrate registry: meshName → MeshSubstrate
  private _meshSubstrates: Map<string, MeshSubstrate> = new Map();

  // Stats
  private _tickCount = 0;
  private _totalTime = 0;
  private _lastTickDuration = 0;
  private _frameCount = 0;

  constructor(config?: Partial<ThreeRenderConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };

    // Create Three.js scene
    this._scene = new THREE.Scene();

    // Create perspective camera with defaults
    this._camera = new THREE.PerspectiveCamera(
      60, // fov
      this._config.width / this._config.height, // aspect
      0.1, // near
      1000, // far
    );

    // Create renderer only if canvas is available (not headless)
    if (this._config.canvas) {
      this._renderer = new THREE.WebGLRenderer({
        canvas: this._config.canvas,
        antialias: this._config.antialias,
      });
      this._renderer.setSize(this._config.width, this._config.height);
      this._renderer.setPixelRatio(this._config.pixelRatio);
      if (this._config.shadowMap) {
        this._renderer.shadowMap.enabled = true;
        this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
    }
  }

  /** Whether we have a real WebGL renderer. */
  get isHeadless(): boolean { return this._renderer === null; }

  /** The Three.js scene object. */
  get threeScene(): THREE.Scene { return this._scene; }

  /** The Three.js camera. */
  get threeCamera(): THREE.PerspectiveCamera { return this._camera; }

  /** The Three.js renderer (null in headless mode). */
  get threeRenderer(): THREE.WebGLRenderer | null { return this._renderer; }

  /** Number of frames rendered. */
  get frameCount(): number { return this._frameCount; }

  /** Number of tracked meshes. */
  get meshCount(): number { return this._meshMap.size; }

  get state(): EngineState { return this._state; }

  // ─── Scene Substrate binding ─────────────────────────────────────────────

  /** Bind a SceneSubstrate as the source of truth. */
  bindScene(scene: SceneSubstrate): void {
    this._sceneSubstrate = scene;
  }

  /** Unbind the current scene. */
  unbindScene(): void {
    this._sceneSubstrate = null;
  }

  /** Get the bound scene substrate. */
  get sceneSubstrate(): SceneSubstrate | null { return this._sceneSubstrate; }

  // ─── Mesh management ────────────────────────────────────────────────────

  /**
   * Register a MeshSubstrate. The engine will create a Three.js Mesh
   * and sync it each tick.
   */
  addMesh(mesh: MeshSubstrate): void {
    if (this._meshSubstrates.has(mesh.name)) return;
    this._meshSubstrates.set(mesh.name, mesh);

    // Create Three.js geometry + material + mesh
    const geom = this._createGeometry(mesh);
    const mat = this._createMaterial(mesh.material);
    const threeMesh = new THREE.Mesh(geom, mat);
    threeMesh.name = mesh.name;

    // Sync initial transform
    this._syncTransform(mesh, threeMesh);
    // Sync properties
    this._syncProperties(mesh, threeMesh);

    this._meshMap.set(mesh.name, threeMesh);
    this._scene.add(threeMesh);
  }

  /** Remove a mesh by name. */
  removeMesh(name: string): boolean {
    const threeMesh = this._meshMap.get(name);
    if (!threeMesh) return false;

    this._scene.remove(threeMesh);
    threeMesh.geometry.dispose();
    if (threeMesh.material instanceof THREE.Material) {
      threeMesh.material.dispose();
    }
    this._meshMap.delete(name);
    this._meshSubstrates.delete(name);
    return true;
  }

  /** Get the Three.js mesh by name. */
  getThreeMesh(name: string): THREE.Mesh | undefined {
    return this._meshMap.get(name);
  }

  // ─── Geometry factory ───────────────────────────────────────────────────

  private _createGeometry(mesh: MeshSubstrate): THREE.BufferGeometry {
    const g = mesh.geometry;
    switch (mesh.geometryType) {
      case "box":
        return new THREE.BoxGeometry(
          g.get("width") ?? 1,
          g.get("height") ?? 1,
          g.get("depth") ?? 1,
        );
      case "sphere":
        return new THREE.SphereGeometry(
          g.get("radius") ?? 0.5,
          g.get("widthSegments") ?? 32,
          g.get("heightSegments") ?? 16,
        );
      case "plane":
        return new THREE.PlaneGeometry(
          g.get("width") ?? 1,
          g.get("height") ?? 1,
        );
      case "cylinder":
        return new THREE.CylinderGeometry(
          g.get("radiusTop") ?? 0.5,
          g.get("radiusBottom") ?? 0.5,
          g.get("height") ?? 1,
          g.get("radialSegments") ?? 32,
        );
      case "cone":
        return new THREE.ConeGeometry(
          g.get("radius") ?? 0.5,
          g.get("height") ?? 1,
          g.get("radialSegments") ?? 32,
        );
      case "torus":
        return new THREE.TorusGeometry(
          g.get("radius") ?? 1,
          g.get("tube") ?? 0.4,
          g.get("radialSegments") ?? 16,
          g.get("tubularSegments") ?? 48,
        );
      default:
        // custom or unknown — unit box fallback
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }

  // ─── Material factory ──────────────────────────────────────────────────

  private _createMaterial(mat: MaterialSubstrate | null): THREE.Material {
    if (!mat) {
      return new THREE.MeshStandardMaterial({ color: 0xcccccc });
    }
    const color = mat.getProperty("color") ?? 0xFFFFFF;
    const roughness = mat.getProperty("roughness") ?? 0.5;
    const metalness = mat.getProperty("metallic") ?? 0.0;
    const opacity = mat.getProperty("opacity") ?? 1.0;
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      opacity,
      transparent: opacity < 1.0,
    });
  }

  // ─── Sync helpers ──────────────────────────────────────────────────────

  private _syncTransform(mesh: MeshSubstrate, obj: THREE.Object3D): void {
    const pos = mesh.getPosition();
    obj.position.set(pos.x, pos.y, pos.z);
    const rot = mesh.getRotation();
    obj.rotation.set(rot.x, rot.y, rot.z);
    const scl = mesh.getScale();
    obj.scale.set(scl.x, scl.y, scl.z);
  }

  private _syncProperties(mesh: MeshSubstrate, threeMesh: THREE.Mesh): void {
    threeMesh.visible = mesh.visible;
    threeMesh.castShadow = mesh.castShadow;
    threeMesh.receiveShadow = mesh.receiveShadow;
  }

  private _syncCamera(): void {
    if (!this._sceneSubstrate) return;
    const cam = this._sceneSubstrate.camera;
    this._camera.position.set(
      cam.get("x") ?? 0,
      cam.get("y") ?? 0,
      cam.get("z") ?? 0,
    );
    this._camera.rotation.set(
      cam.get("pitch") ?? 0,
      cam.get("yaw") ?? 0,
      cam.get("roll") ?? 0,
    );
    const fov = cam.get("fov") ?? 60;
    if (this._camera.fov !== fov) {
      this._camera.fov = fov;
      this._camera.updateProjectionMatrix();
    }
    const near = cam.get("near") ?? 0.1;
    const far = cam.get("far") ?? 1000;
    if (this._camera.near !== near || this._camera.far !== far) {
      this._camera.near = near;
      this._camera.far = far;
      this._camera.updateProjectionMatrix();
    }
  }

  // ─── Tick — sync manifold → Three.js each frame ────────────────────────

  tick(dt: number): void {
    if (this._state !== EngineState.Running) return;
    const t0 = performance.now();

    // Sync camera from scene substrate
    this._syncCamera();

    // Sync all mesh transforms + properties (finite set of registered meshes)
    for (const [name, meshSub] of this._meshSubstrates) {
      const threeMesh = this._meshMap.get(name);
      if (!threeMesh) continue;
      this._syncTransform(meshSub, threeMesh);
      this._syncProperties(meshSub, threeMesh);
    }

    // Render if not headless
    if (this._renderer) {
      this._renderer.render(this._scene, this._camera);
    }

    this._frameCount++;
    this._lastTickDuration = performance.now() - t0;
    this._tickCount++;
    this._totalTime += dt;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────

  start(): void { this._state = EngineState.Running; }
  stop(): void { this._state = EngineState.Stopped; }
  pause(): void { this._state = EngineState.Paused; }
  resume(): void { this._state = EngineState.Running; }

  reset(): void {
    this._state = EngineState.Idle;
    // Dispose all meshes (finite set)
    for (const [name] of this._meshMap) {
      this.removeMesh(name);
    }
    this._meshMap.clear();
    this._meshSubstrates.clear();
    this._sceneSubstrate = null;
    this._frameCount = 0;
    this._tickCount = 0;
    this._totalTime = 0;
    this._lastTickDuration = 0;
  }

  serialize(): unknown {
    return {
      config: this._config,
      frameCount: this._frameCount,
      meshNames: Array.from(this._meshSubstrates.keys()),
    };
  }

  hydrate(state: any): void {
    if (state.frameCount !== undefined) this._frameCount = state.frameCount;
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

  /** Dispose all Three.js resources. */
  dispose(): void {
    this.reset();
    if (this._renderer) {
      this._renderer.dispose();
      this._renderer = null;
    }
  }
}
