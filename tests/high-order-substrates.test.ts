import { RepresentationTable } from "../core/substrate/representation-table";
import {
  AnimationSubstrate,
  MaterialSubstrate,
  SpatialAudioSubstrate,
  SceneSubstrate,
} from "../core/substrate/high-order-substrates";
import {
  PlanarSubstrate,
  VolumeSubstrate,
  ObjectSubstrate,
} from "../core/substrate/dimensional-substrate";

// ═══════════════════════════════════════════════════════════════════════════
//  REPRESENTATION TABLE
// ═══════════════════════════════════════════════════════════════════════════

describe("RepresentationTable — Data Model (Addresses, Not Bytes)", () => {
  test("should store and retrieve scalar values via z-invocation", () => {
    const table = new RepresentationTable("car");
    table.set("wheels", 4);
    table.set("color", 0xFF0000);
    expect(table.get("wheels")).toBeCloseTo(4, 5);
    expect(table.get("color")).toBeCloseTo(0xFF0000, 0);
  });

  test("should return undefined for missing keys", () => {
    const table = new RepresentationTable("empty");
    expect(table.get("missing")).toBeUndefined();
    expect(table.getString("missing")).toBeUndefined();
    expect(table.getArray("missing")).toBeUndefined();
  });

  test("should store and retrieve strings as path expression sequences", () => {
    const table = new RepresentationTable("entity");
    table.setString("name", "Mustang");
    expect(table.getString("name")).toBe("Mustang");
  });

  test("should store and retrieve arrays as path expression sequences", () => {
    const table = new RepresentationTable("mesh");
    table.setArray("vertices", [10, 20, 30]);
    const result = table.getArray("vertices")!;
    expect(result.length).toBe(3);
    expect(result[0]).toBeCloseTo(10, 5);
    expect(result[1]).toBeCloseTo(20, 5);
    expect(result[2]).toBeCloseTo(30, 5);
  });

  test("should report correct size and keys", () => {
    const table = new RepresentationTable("test");
    table.set("a", 1);
    table.set("b", 2);
    table.setString("name", "hello");
    expect(table.size).toBe(3);
    expect(table.scalarKeys()).toEqual(["a", "b"]);
    expect(table.compoundKeys()).toEqual(["name"]);
    expect(table.allKeys().length).toBe(3);
  });

  test("should delete scalar and compound entries", () => {
    const table = new RepresentationTable("test");
    table.set("x", 10);
    table.setString("s", "hi");
    expect(table.has("x")).toBe(true);
    expect(table.hasCompound("s")).toBe(true);
    table.delete("x");
    table.deleteCompound("s");
    expect(table.has("x")).toBe(false);
    expect(table.hasCompound("s")).toBe(false);
    expect(table.size).toBe(0);
  });

  test("should merge tables without destroying source", () => {
    const a = new RepresentationTable("a");
    a.set("x", 1);
    a.setString("name", "alpha");
    const b = new RepresentationTable("b");
    b.set("y", 2);
    b.merge(a);
    expect(b.get("x")).toBeCloseTo(1, 5);
    expect(b.get("y")).toBeCloseTo(2, 5);
    expect(b.getString("name")).toBe("alpha");
    // Source unchanged
    expect(a.get("x")).toBeCloseTo(1, 5);
  });

  test("should clone to a new independent table", () => {
    const original = new RepresentationTable("orig");
    original.set("val", 42);
    const copy = original.clone("copy");
    expect(copy.name).toBe("copy");
    expect(copy.get("val")).toBeCloseTo(42, 5);
    // Mutating copy doesn't affect original
    copy.set("val", 99);
    expect(original.get("val")).toBeCloseTo(42, 5);
  });

  test("should serialize and hydrate round-trip", () => {
    const table = new RepresentationTable("test");
    table.set("speed", 100);
    table.setString("label", "fast");
    const state = table.serialize();
    const restored = new RepresentationTable("restored");
    restored.hydrate(state);
    expect(restored.get("speed")).toBeCloseTo(100, 5);
    expect(restored.getString("label")).toBe("fast");
  });

  test("should reset to empty", () => {
    const table = new RepresentationTable("test");
    table.set("a", 1);
    table.setString("b", "hi");
    table.reset();
    expect(table.size).toBe(0);
  });

  test("should expose raw PathExpr for composition", () => {
    const table = new RepresentationTable("test");
    table.set("val", 50);
    const expr = table.getExpr("val");
    expect(expr).toBeDefined();
    expect(expr!.section).toBeDefined();
    expect(expr!.angle).toBeDefined();
    expect(expr!.radius).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATION SUBSTRATE
// ═══════════════════════════════════════════════════════════════════════════

describe("AnimationSubstrate — Linear + Object", () => {
  test("should initialize with defaults", () => {
    const anim = new AnimationSubstrate("walk", 2.0);
    expect(anim.name).toBe("walk");
    expect(anim.playhead).toBeCloseTo(0, 5);
    expect(anim.duration).toBeCloseTo(2.0, 5);
    expect(anim.speed).toBeCloseTo(1.0, 5);
    expect(anim.looping).toBe(false);
    expect(anim.keyframeCount).toBe(0);
  });

  test("should add keyframes and count them", () => {
    const anim = new AnimationSubstrate("run", 1.0);
    anim.addKeyframe(0, "x", 0);
    anim.addKeyframe(0.5, "x", 50);
    anim.addKeyframe(1.0, "x", 100);
    expect(anim.keyframeCount).toBe(3);
  });

  test("should advance playhead and interpolate values", () => {
    const anim = new AnimationSubstrate("slide", 1.0);
    anim.addKeyframe(0, "x", 0);
    anim.addKeyframe(1.0, "x", 100);
    // Advance to t=0.5
    const result = anim.advance(0.5);
    expect(result.get("x")).toBeCloseTo(50, 0);
    expect(anim.playhead).toBeCloseTo(0.5, 5);
  });

  test("should handle looping", () => {
    const anim = new AnimationSubstrate("loop", 1.0);
    anim.looping = true;
    anim.addKeyframe(0, "y", 0);
    anim.addKeyframe(1.0, "y", 10);
    // Advance past duration
    anim.advance(1.5);
    // Should wrap to t=0.5
    expect(anim.playhead).toBeCloseTo(0.5, 5);
  });

  test("should clamp when not looping", () => {
    const anim = new AnimationSubstrate("clamp", 1.0);
    anim.addKeyframe(0, "z", 0);
    anim.addKeyframe(1.0, "z", 100);
    const result = anim.advance(2.0); // past end
    expect(anim.playhead).toBeCloseTo(1.0, 5);
    expect(result.get("z")).toBeCloseTo(100, 0);
  });

  test("should respect speed multiplier", () => {
    const anim = new AnimationSubstrate("fast", 2.0);
    anim.speed = 2.0;
    anim.addKeyframe(0, "x", 0);
    anim.addKeyframe(2.0, "x", 200);
    const result = anim.advance(0.5); // effective dt = 1.0
    expect(anim.playhead).toBeCloseTo(1.0, 5);
    expect(result.get("x")).toBeCloseTo(100, 0);
  });

  test("should reset to start", () => {
    const anim = new AnimationSubstrate("reset", 1.0);
    anim.addKeyframe(0, "x", 0);
    anim.advance(0.5);
    anim.reset();
    expect(anim.playhead).toBeCloseTo(0, 5);
    expect(anim.keyframeCount).toBe(0);
  });

  test("should serialize state", () => {
    const anim = new AnimationSubstrate("ser", 1.0);
    anim.addKeyframe(0, "x", 0);
    const state = anim.serialize() as any;
    expect(state.keyframes.length).toBe(1);
    expect(state.duration).toBeCloseTo(1.0, 5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  MATERIAL SUBSTRATE
// ═══════════════════════════════════════════════════════════════════════════

describe("MaterialSubstrate — Planar + PathExprs", () => {
  test("should initialize with default properties", () => {
    const mat = new MaterialSubstrate("metal");
    expect(mat.getProperty("roughness")).toBeCloseTo(0.5, 5);
    expect(mat.getProperty("metallic")).toBeCloseTo(0, 5);
    expect(mat.getProperty("opacity")).toBeCloseTo(1.0, 5);
    expect(mat.getProperty("color")).toBeCloseTo(0xFFFFFF, 0);
  });

  test("should set and get custom properties", () => {
    const mat = new MaterialSubstrate("glass");
    mat.setProperty("opacity", 0.3);
    mat.setProperty("ior", 1.5);
    expect(mat.getProperty("opacity")).toBeCloseTo(0.3, 5);
    expect(mat.getProperty("ior")).toBeCloseTo(1.5, 5);
  });

  test("should add and sample texture layers", () => {
    const mat = new MaterialSubstrate("brick");
    const diffuse = new PlanarSubstrate("diffuse", [[100, 150], [200, 250]]);
    mat.addTexture("diffuse", diffuse);
    expect(mat.textureCount).toBe(1);
    expect(mat.textureNames()).toEqual(["diffuse"]);
    expect(mat.sampleTexture("diffuse", 0, 0)).toBeCloseTo(100, 0);
  });

  test("should remove textures", () => {
    const mat = new MaterialSubstrate("test");
    mat.addTexture("normal", new PlanarSubstrate("normal"));
    expect(mat.removeTexture("normal")).toBe(true);
    expect(mat.textureCount).toBe(0);
  });

  test("should return 0 for missing texture sample", () => {
    const mat = new MaterialSubstrate("test");
    expect(mat.sampleTexture("missing", 0, 0)).toBe(0);
  });

  test("should reset to defaults", () => {
    const mat = new MaterialSubstrate("test");
    mat.setProperty("roughness", 0.9);
    mat.addTexture("t", new PlanarSubstrate("t"));
    mat.reset();
    expect(mat.getProperty("roughness")).toBeCloseTo(0.5, 5);
    expect(mat.textureCount).toBe(0);
  });

  test("should serialize state", () => {
    const mat = new MaterialSubstrate("ser");
    mat.addTexture("diffuse", new PlanarSubstrate("d", [[1, 2]]));
    const state = mat.serialize() as any;
    expect(state.properties).toBeDefined();
    expect(state.textures.diffuse).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
//  SPATIAL AUDIO SUBSTRATE
// ═══════════════════════════════════════════════════════════════════════════

describe("SpatialAudioSubstrate — Linear + Volume", () => {
  test("should initialize with defaults at origin", () => {
    const audio = new SpatialAudioSubstrate("footstep");
    const pos = audio.getPosition();
    expect(pos.x).toBeCloseTo(0, 5);
    expect(pos.y).toBeCloseTo(0, 5);
    expect(pos.z).toBeCloseTo(0, 5);
  });

  test("should set and get 3D position", () => {
    const audio = new SpatialAudioSubstrate("explosion");
    audio.setPosition(10, 20, 30);
    const pos = audio.getPosition();
    expect(pos.x).toBeCloseTo(10, 5);
    expect(pos.y).toBeCloseTo(20, 5);
    expect(pos.z).toBeCloseTo(30, 5);
  });

  test("should compute full attenuation at source", () => {
    const audio = new SpatialAudioSubstrate("beep");
    audio.setPosition(5, 0, 0);
    expect(audio.computeAttenuation(5, 0, 0)).toBeCloseTo(1.0, 5);
  });

  test("should compute zero attenuation at max distance", () => {
    const audio = new SpatialAudioSubstrate("far");
    audio.setPosition(0, 0, 0);
    expect(audio.computeAttenuation(100, 0, 0)).toBeCloseTo(0, 5);
    expect(audio.computeAttenuation(200, 0, 0)).toBe(0);
  });

  test("should compute partial attenuation at mid distance", () => {
    const audio = new SpatialAudioSubstrate("mid");
    audio.setPosition(0, 0, 0);
    const att = audio.computeAttenuation(50, 0, 0);
    expect(att).toBeCloseTo(0.5, 5);
  });

  test("should sample waveform with attenuation", () => {
    const audio = new SpatialAudioSubstrate("tone");
    audio.waveform.addPoint(100);
    audio.setPosition(0, 0, 0);
    const sample = audio.sampleAt(0, 0, 0, 0);
    expect(sample).toBeCloseTo(100, 0);
  });

  test("should reset to defaults", () => {
    const audio = new SpatialAudioSubstrate("test");
    audio.setPosition(50, 50, 50);
    audio.waveform.addPoint(42);
    audio.reset();
    const pos = audio.getPosition();
    expect(pos.x).toBeCloseTo(0, 5);
    expect(audio.waveform.count).toBe(0);
  });

  test("should serialize state", () => {
    const audio = new SpatialAudioSubstrate("ser");
    audio.setPosition(1, 2, 3);
    const state = audio.serialize() as any;
    expect(state.source).toBeDefined();
    expect(state.waveform).toBeDefined();
    expect(state.properties).toBeDefined();
  });
});


// ═══════════════════════════════════════════════════════════════════════════
//  SCENE SUBSTRATE
// ═══════════════════════════════════════════════════════════════════════════

describe("SceneSubstrate — Volume + Object + Camera", () => {
  test("should initialize with defaults", () => {
    const scene = new SceneSubstrate("level1");
    expect(scene.entityCount).toBe(0);
    const cam = scene.getCameraPosition();
    expect(cam.x).toBeCloseTo(0, 5);
    expect(cam.y).toBeCloseTo(0, 5);
    expect(cam.z).toBeCloseTo(0, 5);
  });

  test("should set and get camera position", () => {
    const scene = new SceneSubstrate("test");
    scene.setCameraPosition(10, 20, 30);
    const cam = scene.getCameraPosition();
    expect(cam.x).toBeCloseTo(10, 5);
    expect(cam.y).toBeCloseTo(20, 5);
    expect(cam.z).toBeCloseTo(30, 5);
  });

  test("should set camera orientation", () => {
    const scene = new SceneSubstrate("test");
    scene.setCameraOrientation(45, 90, 0);
    expect(scene.camera.get("pitch")).toBeCloseTo(45, 5);
    expect(scene.camera.get("yaw")).toBeCloseTo(90, 5);
  });

  test("should add and get entities", () => {
    const scene = new SceneSubstrate("world");
    const vol = new VolumeSubstrate("cube", [[[1, 2], [3, 4]]]);
    const obj = new ObjectSubstrate("cube", vol);
    scene.addEntity("cube", obj);
    expect(scene.entityCount).toBe(1);
    expect(scene.entityNames()).toEqual(["cube"]);
    expect(scene.getEntity("cube")).toBe(obj);
  });

  test("should remove entities", () => {
    const scene = new SceneSubstrate("test");
    const vol = new VolumeSubstrate("v");
    scene.addEntity("e", new ObjectSubstrate("e", vol));
    expect(scene.removeEntity("e")).toBe(true);
    expect(scene.entityCount).toBe(0);
  });

  test("should expose scene properties", () => {
    const scene = new SceneSubstrate("test");
    expect(scene.properties.get("ambientLight")).toBeCloseTo(0.3, 5);
    expect(scene.properties.get("gravity")).toBeCloseTo(9.81, 2);
  });

  test("should reset to defaults", () => {
    const scene = new SceneSubstrate("test");
    scene.setCameraPosition(99, 99, 99);
    const vol = new VolumeSubstrate("v");
    scene.addEntity("e", new ObjectSubstrate("e", vol));
    scene.reset();
    expect(scene.entityCount).toBe(0);
    expect(scene.getCameraPosition().x).toBeCloseTo(0, 5);
  });

  test("should serialize state", () => {
    const scene = new SceneSubstrate("ser");
    const vol = new VolumeSubstrate("v", [[[5]]]);
    scene.addEntity("obj", new ObjectSubstrate("obj", vol));
    const state = scene.serialize() as any;
    expect(state.world).toBeDefined();
    expect(state.camera).toBeDefined();
    expect(state.entities.obj).toBeDefined();
  });
});


// ═══════════════════════════════════════════════════════════════════════════
//  MESH SUBSTRATE
// ═══════════════════════════════════════════════════════════════════════════

import { MeshSubstrate } from "../core/substrate/high-order-substrates";

describe("MeshSubstrate — 3D Renderable Entity", () => {
  test("should default to box geometry at origin with unit scale", () => {
    const mesh = new MeshSubstrate("cube");
    expect(mesh.geometryType).toBe("box");
    const pos = mesh.getPosition();
    expect(pos.x).toBeCloseTo(0, 5);
    expect(pos.y).toBeCloseTo(0, 5);
    expect(pos.z).toBeCloseTo(0, 5);
    const scl = mesh.getScale();
    expect(scl.x).toBeCloseTo(1, 5);
    expect(scl.y).toBeCloseTo(1, 5);
    expect(scl.z).toBeCloseTo(1, 5);
  });

  test("should set and get position via RepresentationTable", () => {
    const mesh = new MeshSubstrate("m");
    mesh.setPosition(3, 5, 7);
    const pos = mesh.getPosition();
    expect(pos.x).toBeCloseTo(3, 5);
    expect(pos.y).toBeCloseTo(5, 5);
    expect(pos.z).toBeCloseTo(7, 5);
  });

  test("should set and get rotation", () => {
    const mesh = new MeshSubstrate("m");
    mesh.setRotation(Math.PI / 4, Math.PI / 2, 0);
    const rot = mesh.getRotation();
    expect(rot.x).toBeCloseTo(Math.PI / 4, 5);
    expect(rot.y).toBeCloseTo(Math.PI / 2, 5);
    expect(rot.z).toBeCloseTo(0, 5);
  });

  test("should set and get scale", () => {
    const mesh = new MeshSubstrate("m");
    mesh.setScale(2, 3, 4);
    const scl = mesh.getScale();
    expect(scl.x).toBeCloseTo(2, 5);
    expect(scl.y).toBeCloseTo(3, 5);
    expect(scl.z).toBeCloseTo(4, 5);
  });

  test("should initialize geometry defaults per type", () => {
    const sphere = new MeshSubstrate("s", "sphere");
    expect(sphere.getGeometryParam("radius")).toBeCloseTo(0.5, 5);
    expect(sphere.getGeometryParam("widthSegments")).toBeCloseTo(32, 0);

    const cyl = new MeshSubstrate("c", "cylinder");
    expect(cyl.getGeometryParam("radiusTop")).toBeCloseTo(0.5, 5);
    expect(cyl.getGeometryParam("height")).toBeCloseTo(1, 5);

    const torus = new MeshSubstrate("t", "torus");
    expect(torus.getGeometryParam("tube")).toBeCloseTo(0.4, 5);
  });

  test("should accept and reference a MaterialSubstrate", () => {
    const mat = new MaterialSubstrate("metal");
    mat.setProperty("roughness", 0.1);
    const mesh = new MeshSubstrate("m", "box", mat);
    expect(mesh.material).toBe(mat);
    expect(mesh.material!.getProperty("roughness")).toBeCloseTo(0.1, 5);
  });

  test("should allow changing material after creation", () => {
    const mesh = new MeshSubstrate("m");
    expect(mesh.material).toBeNull();
    const mat = new MaterialSubstrate("wood");
    mesh.material = mat;
    expect(mesh.material).toBe(mat);
  });

  test("should support visibility / castShadow / receiveShadow toggles", () => {
    const mesh = new MeshSubstrate("m");
    expect(mesh.visible).toBe(true);
    expect(mesh.castShadow).toBe(true);
    mesh.visible = false;
    mesh.castShadow = false;
    expect(mesh.visible).toBe(false);
    expect(mesh.castShadow).toBe(false);
  });

  test("should reset to defaults", () => {
    const mesh = new MeshSubstrate("m", "sphere");
    mesh.setPosition(10, 20, 30);
    mesh.setScale(5, 5, 5);
    mesh.visible = false;
    mesh.reset();
    expect(mesh.getPosition().x).toBeCloseTo(0, 5);
    expect(mesh.getScale().x).toBeCloseTo(1, 5);
    expect(mesh.visible).toBe(true);
    expect(mesh.getGeometryParam("radius")).toBeCloseTo(0.5, 5);
  });

  test("should serialize state", () => {
    const mat = new MaterialSubstrate("m");
    const mesh = new MeshSubstrate("box1", "box", mat);
    mesh.setPosition(1, 2, 3);
    const state = mesh.serialize() as any;
    expect(state.geometryType).toBe("box");
    expect(state.transform).toBeDefined();
    expect(state.geometry).toBeDefined();
    expect(state.material).toBeDefined();
  });
});
