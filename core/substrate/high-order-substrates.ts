// core/substrate/high-order-substrates.ts
// ================================================================
//  HIGH-ORDER SUBSTRATES — Composed Systems
// ================================================================
//
// These substrates combine primitives + path expressions +
// representation tables. They sit ABOVE primitive substrates
// and BELOW engines in the stack.
//
// Rules enforced:
//   • None touch the manifold directly — they use primitive substrates.
//   • All state lives in RepresentationTables (addresses, not bytes).
//   • Loops only on finite sets of path expressions.
//   • No duplication of primitive substrate logic.
//
// Stack position:
//   ENGINES → HIGH-ORDER SUBSTRATES → PRIMITIVE SUBSTRATES → PATH EXPRESSIONS → MANIFOLD

import { type PathExpr } from "./path-expressions";
import { RepresentationTable } from "./representation-table";
import {
  PointSubstrate,
  LinearSubstrate,
  PlanarSubstrate,
  VolumeSubstrate,
  ObjectSubstrate,
} from "./dimensional-substrate";

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATION SUBSTRATE — Linear + Object
// ═══════════════════════════════════════════════════════════════════════════
//
// An animation is a set of keyframes (Linear) applied to a target (Object).
// Each keyframe is a point on a timeline (1D).
// The target's properties are updated by interpolating between keyframes.

export interface Keyframe {
  time: number;      // seconds into the animation
  property: string;  // which property to animate (path into the target's table)
  value: number;     // target value at this keyframe
}

export class AnimationSubstrate {
  readonly name: string;

  // Timeline: a linear of keyframe timestamps
  private _timeline: LinearSubstrate;
  // Keyframe data: representation table (addresses, not bytes)
  private _keyframes: RepresentationTable;
  // Current playback state
  private _playhead: PointSubstrate;
  private _duration: PointSubstrate;
  private _speed: PointSubstrate;
  private _looping: boolean = false;

  // Keyframe registry (finite set)
  private _keyframeList: Keyframe[] = [];

  constructor(name: string, duration: number = 1.0) {
    this.name = name;
    this._timeline = new LinearSubstrate(`${name}:timeline`);
    this._keyframes = new RepresentationTable(`${name}:keyframes`);
    this._playhead = new PointSubstrate(`${name}:playhead`, 0);
    this._duration = new PointSubstrate(`${name}:duration`, duration);
    this._speed = new PointSubstrate(`${name}:speed`, 1.0);
  }

  /** Current playhead position (seconds). */
  get playhead(): number { return this._playhead.value; }

  /** Animation duration (seconds). */
  get duration(): number { return this._duration.value; }

  /** Playback speed multiplier. */
  get speed(): number { return this._speed.value; }
  set speed(v: number) { this._speed.setPath("value", v); }

  /** Whether the animation loops. */
  get looping(): boolean { return this._looping; }
  set looping(v: boolean) { this._looping = v; }

  /** Number of keyframes (finite set). */
  get keyframeCount(): number { return this._keyframeList.length; }

  /** The timeline (linear substrate). */
  get timeline(): LinearSubstrate { return this._timeline; }

  /** The keyframe data (representation table). */
  get keyframeTable(): RepresentationTable { return this._keyframes; }

  /**
   * Add a keyframe.
   * The time is stored as a point on the timeline (Linear).
   * The property+value are stored in the representation table.
   */
  addKeyframe(time: number, property: string, value: number): void {
    const idx = this._keyframeList.length;
    this._keyframeList.push({ time, property, value });
    // Timeline gets the timestamp as a point
    this._timeline.addPoint(time);
    // Table gets the value, keyed by index+property
    this._keyframes.set(`${idx}:${property}`, value);
  }

  /**
   * Advance the animation by dt seconds.
   * Returns a map of property → interpolated value at the current playhead.
   * Uses primitive substrates only — no direct manifold access.
   */
  advance(dt: number): Map<string, number> {
    const result = new Map<string, number>();
    let t = this._playhead.value + dt * this._speed.value;
    const dur = this._duration.value;

    // Handle looping / clamping
    if (this._looping && dur > 0) {
      t = t % dur;
      if (t < 0) t += dur;
    } else {
      t = Math.max(0, Math.min(t, dur));
    }
    this._playhead.setPath("value", t);

    // Collect unique properties from the finite set of keyframes
    const properties = new Set<string>();
    for (const kf of this._keyframeList) properties.add(kf.property);

    // For each property, find surrounding keyframes and interpolate
    for (const prop of properties) {
      const relevant = this._keyframeList
        .filter(kf => kf.property === prop)
        .sort((a, b) => a.time - b.time);

      if (relevant.length === 0) continue;

      // Find the two keyframes surrounding the current time
      let before = relevant[0];
      let after = relevant[relevant.length - 1];

      for (const kf of relevant) {
        if (kf.time <= t) before = kf;
        if (kf.time >= t && kf === relevant.find(k => k.time >= t)) after = kf;
      }

      // Linear interpolation between before and after
      if (before.time === after.time) {
        result.set(prop, before.value);
      } else {
        const frac = (t - before.time) / (after.time - before.time);
        result.set(prop, before.value + (after.value - before.value) * frac);
      }
    }

    return result;
  }

  /** Reset animation to start. */
  reset(): void {
    this._playhead.setPath("value", 0);
    this._keyframeList = [];
    this._timeline.reset();
    this._keyframes.reset();
  }

  /** Serialize animation state. */
  serialize(): unknown {
    return {
      keyframes: this._keyframeList,
      playhead: this._playhead.value,
      duration: this._duration.value,
      speed: this._speed.value,
      looping: this._looping,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  MATERIAL SUBSTRATE — Planar + PathExprs
// ═══════════════════════════════════════════════════════════════════════════
//
// A material is a surface description: textures (Planar) + scalar
// properties (color, roughness, metallic, opacity) stored as PathExprs
// in a RepresentationTable. No pixel data — only addresses.

export class MaterialSubstrate {
  readonly name: string;

  // Surface properties as addresses
  private _properties: RepresentationTable;
  // Texture layers: each is a planar substrate (2D grid of addresses)
  private _textures: Map<string, PlanarSubstrate> = new Map();

  constructor(name: string) {
    this.name = name;
    this._properties = new RepresentationTable(`${name}:props`);
    // Default material properties
    this._properties.set("roughness", 0.5);
    this._properties.set("metallic", 0.0);
    this._properties.set("opacity", 1.0);
    this._properties.set("color", 0xFFFFFF);
  }

  /** The material properties table. */
  get properties(): RepresentationTable { return this._properties; }

  /** Set a scalar material property. */
  setProperty(key: string, value: number): void {
    this._properties.set(key, value);
  }

  /** Get a scalar material property via z-invocation. */
  getProperty(key: string): number | undefined {
    return this._properties.get(key);
  }

  /** Add a texture layer (a planar substrate). */
  addTexture(name: string, plane: PlanarSubstrate): void {
    this._textures.set(name, plane);
  }

  /** Get a texture layer by name. */
  getTexture(name: string): PlanarSubstrate | undefined {
    return this._textures.get(name);
  }

  /** Remove a texture layer. */
  removeTexture(name: string): boolean {
    return this._textures.delete(name);
  }

  /** All texture names (finite set). */
  textureNames(): string[] {
    return Array.from(this._textures.keys());
  }

  /** Number of texture layers. */
  get textureCount(): number { return this._textures.size; }

  /** Sample a texture at (row, col) via z-invocation on the planar substrate. */
  sampleTexture(name: string, row: number, col: number): number {
    const tex = this._textures.get(name);
    return tex ? tex.evaluateAt(row, col) : 0;
  }

  /** Reset material to defaults. */
  reset(): void {
    this._properties.reset();
    this._properties.set("roughness", 0.5);
    this._properties.set("metallic", 0.0);
    this._properties.set("opacity", 1.0);
    this._properties.set("color", 0xFFFFFF);
    this._textures.clear();
  }

  /** Serialize material state. */
  serialize(): unknown {
    const textures: Record<string, unknown> = {};
    for (const [name, plane] of this._textures) {
      textures[name] = plane.serialize();
    }
    return { properties: this._properties.serialize(), textures };
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  SPATIAL AUDIO SUBSTRATE — Linear + Volume
// ═══════════════════════════════════════════════════════════════════════════
//
// Spatial audio = waveform (Linear, 1D) + position in 3D space (Volume).
// The waveform is a set of sample addresses. The position is a coordinate
// in the volume. Attenuation, panning, and Doppler are derived from the
// listener and source positions — no direct manifold access.

export class SpatialAudioSubstrate {
  readonly name: string;

  // Waveform: a linear of sample addresses
  private _waveform: LinearSubstrate;
  // 3D position of this audio source (representation table)
  private _source: RepresentationTable;
  // Audio properties
  private _properties: RepresentationTable;

  constructor(name: string) {
    this.name = name;
    this._waveform = new LinearSubstrate(`${name}:waveform`);
    this._source = new RepresentationTable(`${name}:source`);
    this._properties = new RepresentationTable(`${name}:props`);

    // Default source position (origin)
    this._source.set("x", 0);
    this._source.set("y", 0);
    this._source.set("z", 0);

    // Default audio properties
    this._properties.set("volume", 1.0);
    this._properties.set("pitch", 1.0);
    this._properties.set("maxDistance", 100);
    this._properties.set("rolloff", 1.0);
  }

  /** The waveform (linear substrate). */
  get waveform(): LinearSubstrate { return this._waveform; }

  /** Source position table. */
  get source(): RepresentationTable { return this._source; }

  /** Audio properties table. */
  get properties(): RepresentationTable { return this._properties; }

  /** Set source position in 3D space. */
  setPosition(x: number, y: number, z: number): void {
    this._source.set("x", x);
    this._source.set("y", y);
    this._source.set("z", z);
  }

  /** Get source position via z-invocation. */
  getPosition(): { x: number; y: number; z: number } {
    return {
      x: this._source.get("x") ?? 0,
      y: this._source.get("y") ?? 0,
      z: this._source.get("z") ?? 0,
    };
  }

  /**
   * Compute attenuation based on distance from a listener position.
   * Uses primitive substrates only — no direct manifold access.
   * Returns a gain multiplier [0..1].
   */
  computeAttenuation(listenerX: number, listenerY: number, listenerZ: number): number {
    const pos = this.getPosition();
    const dx = pos.x - listenerX;
    const dy = pos.y - listenerY;
    const dz = pos.z - listenerZ;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const maxDist = this._properties.get("maxDistance") ?? 100;
    const rolloff = this._properties.get("rolloff") ?? 1.0;

    if (distance <= 0) return 1.0;
    if (distance >= maxDist) return 0.0;

    // Inverse distance with rolloff
    return Math.max(0, 1.0 - (distance / maxDist) * rolloff);
  }

  /** Sample the waveform at an index, with volume and attenuation applied. */
  sampleAt(index: number, listenerX = 0, listenerY = 0, listenerZ = 0): number {
    const raw = this._waveform.evaluateAt(index);
    const vol = this._properties.get("volume") ?? 1.0;
    const att = this.computeAttenuation(listenerX, listenerY, listenerZ);
    return raw * vol * att;
  }

  /** Reset to defaults. */
  reset(): void {
    this._waveform.reset();
    this._source.reset();
    this._source.set("x", 0);
    this._source.set("y", 0);
    this._source.set("z", 0);
    this._properties.reset();
    this._properties.set("volume", 1.0);
    this._properties.set("pitch", 1.0);
    this._properties.set("maxDistance", 100);
    this._properties.set("rolloff", 1.0);
  }

  /** Serialize state. */
  serialize(): unknown {
    return {
      waveform: this._waveform.serialize(),
      source: this._source.serialize(),
      properties: this._properties.serialize(),
    };
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  SCENE SUBSTRATE — Volume + Object + Camera
// ═══════════════════════════════════════════════════════════════════════════
//
// A scene is a composed 3D world:
//   • World space (Volume) — the 3D region
//   • Entities (Object substrates) — things in the world
//   • Camera (RepresentationTable) — viewpoint into the world
//
// The scene does not touch the manifold — it orchestrates primitives
// and representation tables.

export class SceneSubstrate {
  readonly name: string;

  // World space
  private _world: VolumeSubstrate;
  // Named entities in the scene (finite set)
  private _entities: Map<string, ObjectSubstrate> = new Map();
  // Camera state
  private _camera: RepresentationTable;
  // Scene-level properties
  private _properties: RepresentationTable;

  constructor(name: string, world?: VolumeSubstrate) {
    this.name = name;
    this._world = world ?? new VolumeSubstrate(`${name}:world`);
    this._camera = new RepresentationTable(`${name}:camera`);
    this._properties = new RepresentationTable(`${name}:props`);

    // Default camera at origin, looking forward, 60° FOV
    this._camera.set("x", 0);
    this._camera.set("y", 0);
    this._camera.set("z", 0);
    this._camera.set("pitch", 0);
    this._camera.set("yaw", 0);
    this._camera.set("roll", 0);
    this._camera.set("fov", 60);
    this._camera.set("near", 0.1);
    this._camera.set("far", 1000);

    // Default scene properties
    this._properties.set("ambientLight", 0.3);
    this._properties.set("gravity", 9.81);
  }

  /** The world volume. */
  get world(): VolumeSubstrate { return this._world; }

  /** Camera state table. */
  get camera(): RepresentationTable { return this._camera; }

  /** Scene properties table. */
  get properties(): RepresentationTable { return this._properties; }

  /** Number of entities in the scene (finite set). */
  get entityCount(): number { return this._entities.size; }

  /** Add an entity to the scene. */
  addEntity(name: string, entity: ObjectSubstrate): void {
    this._entities.set(name, entity);
  }

  /** Remove an entity from the scene. */
  removeEntity(name: string): boolean {
    return this._entities.delete(name);
  }

  /** Get an entity by name. */
  getEntity(name: string): ObjectSubstrate | undefined {
    return this._entities.get(name);
  }

  /** All entity names (finite set). */
  entityNames(): string[] {
    return Array.from(this._entities.keys());
  }

  /** Set camera position. */
  setCameraPosition(x: number, y: number, z: number): void {
    this._camera.set("x", x);
    this._camera.set("y", y);
    this._camera.set("z", z);
  }

  /** Get camera position via z-invocation. */
  getCameraPosition(): { x: number; y: number; z: number } {
    return {
      x: this._camera.get("x") ?? 0,
      y: this._camera.get("y") ?? 0,
      z: this._camera.get("z") ?? 0,
    };
  }

  /** Set camera orientation. */
  setCameraOrientation(pitch: number, yaw: number, roll: number): void {
    this._camera.set("pitch", pitch);
    this._camera.set("yaw", yaw);
    this._camera.set("roll", roll);
  }

  /** Reset scene to defaults. */
  reset(): void {
    this._world.reset();
    this._entities.clear();
    this._camera.reset();
    this._camera.set("x", 0);
    this._camera.set("y", 0);
    this._camera.set("z", 0);
    this._camera.set("pitch", 0);
    this._camera.set("yaw", 0);
    this._camera.set("roll", 0);
    this._camera.set("fov", 60);
    this._camera.set("near", 0.1);
    this._camera.set("far", 1000);
    this._properties.reset();
    this._properties.set("ambientLight", 0.3);
    this._properties.set("gravity", 9.81);
  }

  /** Serialize scene state. */
  serialize(): unknown {
    const entities: Record<string, unknown> = {};
    for (const [name, entity] of this._entities) {
      entities[name] = entity.serialize();
    }
    return {
      world: this._world.serialize(),
      camera: this._camera.serialize(),
      properties: this._properties.serialize(),
      entities,
    };
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//  MESH SUBSTRATE — Geometry + Transform + Material
// ═══════════════════════════════════════════════════════════════════════════
//
// A mesh is a 3D renderable entity:
//   • Geometry type (box, sphere, plane, cylinder, custom)
//   • Transform (position, rotation, scale) as RepresentationTable addresses
//   • MaterialSubstrate reference for surface properties
//   • Geometry parameters (width, height, depth, radius, segments)
//
// The mesh does not touch the manifold — it orchestrates
// representation tables and references a MaterialSubstrate.

/** Known geometry types. Extensible — "custom" for user-defined. */
export type GeometryType = "box" | "sphere" | "plane" | "cylinder" | "cone" | "torus" | "custom";

export class MeshSubstrate {
  readonly name: string;

  // Transform: position, rotation, scale
  private _transform: RepresentationTable;
  // Geometry parameters (dimensions, segments, etc.)
  private _geometry: RepresentationTable;
  // Geometry type
  private _geometryType: GeometryType;
  // Material reference (optional — can be shared across meshes)
  private _material: MaterialSubstrate | null;
  // Mesh-level properties (castShadow, receiveShadow, visible, etc.)
  private _properties: RepresentationTable;

  constructor(name: string, geometryType: GeometryType = "box", material?: MaterialSubstrate) {
    this.name = name;
    this._geometryType = geometryType;
    this._material = material ?? null;
    this._transform = new RepresentationTable(`${name}:transform`);
    this._geometry = new RepresentationTable(`${name}:geometry`);
    this._properties = new RepresentationTable(`${name}:props`);

    // Default transform: origin, no rotation, unit scale
    this._transform.set("px", 0);
    this._transform.set("py", 0);
    this._transform.set("pz", 0);
    this._transform.set("rx", 0);
    this._transform.set("ry", 0);
    this._transform.set("rz", 0);
    this._transform.set("sx", 1);
    this._transform.set("sy", 1);
    this._transform.set("sz", 1);

    // Default geometry parameters per type
    this._initGeometryDefaults(geometryType);

    // Default mesh properties
    this._properties.set("visible", 1);
    this._properties.set("castShadow", 1);
    this._properties.set("receiveShadow", 1);
  }

  private _initGeometryDefaults(type: GeometryType): void {
    switch (type) {
      case "box":
        this._geometry.set("width", 1);
        this._geometry.set("height", 1);
        this._geometry.set("depth", 1);
        break;
      case "sphere":
        this._geometry.set("radius", 0.5);
        this._geometry.set("widthSegments", 32);
        this._geometry.set("heightSegments", 16);
        break;
      case "plane":
        this._geometry.set("width", 1);
        this._geometry.set("height", 1);
        break;
      case "cylinder":
        this._geometry.set("radiusTop", 0.5);
        this._geometry.set("radiusBottom", 0.5);
        this._geometry.set("height", 1);
        this._geometry.set("radialSegments", 32);
        break;
      case "cone":
        this._geometry.set("radius", 0.5);
        this._geometry.set("height", 1);
        this._geometry.set("radialSegments", 32);
        break;
      case "torus":
        this._geometry.set("radius", 1);
        this._geometry.set("tube", 0.4);
        this._geometry.set("radialSegments", 16);
        this._geometry.set("tubularSegments", 48);
        break;
      case "custom":
        // No defaults — user provides geometry parameters
        break;
    }
  }

  /** Geometry type. */
  get geometryType(): GeometryType { return this._geometryType; }

  /** Transform table (position, rotation, scale). */
  get transform(): RepresentationTable { return this._transform; }

  /** Geometry parameters table. */
  get geometry(): RepresentationTable { return this._geometry; }

  /** Mesh properties table. */
  get properties(): RepresentationTable { return this._properties; }

  /** Material reference (may be null). */
  get material(): MaterialSubstrate | null { return this._material; }

  /** Set or change the material. */
  set material(mat: MaterialSubstrate | null) { this._material = mat; }

  /** Set position in 3D space. */
  setPosition(x: number, y: number, z: number): void {
    this._transform.set("px", x);
    this._transform.set("py", y);
    this._transform.set("pz", z);
  }

  /** Get position via z-invocation. */
  getPosition(): { x: number; y: number; z: number } {
    return {
      x: this._transform.get("px") ?? 0,
      y: this._transform.get("py") ?? 0,
      z: this._transform.get("pz") ?? 0,
    };
  }

  /** Set rotation (Euler angles in radians). */
  setRotation(x: number, y: number, z: number): void {
    this._transform.set("rx", x);
    this._transform.set("ry", y);
    this._transform.set("rz", z);
  }

  /** Get rotation via z-invocation. */
  getRotation(): { x: number; y: number; z: number } {
    return {
      x: this._transform.get("rx") ?? 0,
      y: this._transform.get("ry") ?? 0,
      z: this._transform.get("rz") ?? 0,
    };
  }

  /** Set scale. */
  setScale(x: number, y: number, z: number): void {
    this._transform.set("sx", x);
    this._transform.set("sy", y);
    this._transform.set("sz", z);
  }

  /** Get scale via z-invocation. */
  getScale(): { x: number; y: number; z: number } {
    return {
      x: this._transform.get("sx") ?? 1,
      y: this._transform.get("sy") ?? 1,
      z: this._transform.get("sz") ?? 1,
    };
  }

  /** Set a geometry parameter. */
  setGeometryParam(key: string, value: number): void {
    this._geometry.set(key, value);
  }

  /** Get a geometry parameter via z-invocation. */
  getGeometryParam(key: string): number | undefined {
    return this._geometry.get(key);
  }

  /** Whether this mesh is visible. */
  get visible(): boolean { return (this._properties.get("visible") ?? 1) >= 0.5; }
  set visible(v: boolean) { this._properties.set("visible", v ? 1 : 0); }

  /** Whether this mesh casts shadows. */
  get castShadow(): boolean { return (this._properties.get("castShadow") ?? 1) >= 0.5; }
  set castShadow(v: boolean) { this._properties.set("castShadow", v ? 1 : 0); }

  /** Whether this mesh receives shadows. */
  get receiveShadow(): boolean { return (this._properties.get("receiveShadow") ?? 1) >= 0.5; }
  set receiveShadow(v: boolean) { this._properties.set("receiveShadow", v ? 1 : 0); }

  /** Reset to defaults. */
  reset(): void {
    this._transform.reset();
    this._transform.set("px", 0);
    this._transform.set("py", 0);
    this._transform.set("pz", 0);
    this._transform.set("rx", 0);
    this._transform.set("ry", 0);
    this._transform.set("rz", 0);
    this._transform.set("sx", 1);
    this._transform.set("sy", 1);
    this._transform.set("sz", 1);
    this._geometry.reset();
    this._initGeometryDefaults(this._geometryType);
    this._properties.reset();
    this._properties.set("visible", 1);
    this._properties.set("castShadow", 1);
    this._properties.set("receiveShadow", 1);
  }

  /** Serialize mesh state. */
  serialize(): unknown {
    return {
      geometryType: this._geometryType,
      transform: this._transform.serialize(),
      geometry: this._geometry.serialize(),
      properties: this._properties.serialize(),
      material: this._material?.serialize() ?? null,
    };
  }
}
