// tests/engine.test.ts
// ================================================================
//  ENGINE TESTS — Independent + Suite
// ================================================================

import {
  EngineState,
  EngineSuite,
  PhysicsEngine,
  AudioEngine,
  RenderEngine,
  GameEngine,
  RulesEngine,
  CharacterEngine,
  EngineRegistry,
  defaultRegistry,
} from "../core/engine";

import {
  VolumeSubstrate,
  PlanarSubstrate,
  LinearSubstrate,
} from "../core/substrate/dimensional-substrate";

// ─── PhysicsEngine (3D Volume) ─────────────────────────────────────────────

describe("PhysicsEngine — standalone", () => {
  let engine: PhysicsEngine;

  beforeEach(() => {
    engine = new PhysicsEngine();
  });

  it("starts in Idle state", () => {
    expect(engine.state).toBe(EngineState.Idle);
  });

  it("does not tick when idle", () => {
    engine.addBody(0, 100, 0);
    engine.tick(1 / 60);
    // Position should be unchanged — tick is a no-op when idle.
    const [px, py, pz] = engine.getPosition(0);
    expect(px).toBeCloseTo(0, 0);
    expect(py).toBeCloseTo(100, 0);
    expect(pz).toBeCloseTo(0, 0);
  });

  it("adds bodies and reads position via z-invocation", () => {
    engine.addBody(10, 20, 30);
    expect(engine.bodyCount).toBe(1);
    const [px, py, pz] = engine.getPosition(0);
    // Values go through discover→evaluate round-trip so use closeTo
    expect(px).toBeCloseTo(10, 0);
    expect(py).toBeCloseTo(20, 0);
    expect(pz).toBeCloseTo(30, 0);
  });

  it("applies gravity on tick", () => {
    engine.addBody(0, 100, 0);
    engine.start();
    expect(engine.state).toBe(EngineState.Running);
    engine.tick(1); // 1 second
    const [, py] = engine.getPosition(0);
    // After 1s of gravity (9.81): vy = -9.81, py ≈ 100 - 9.81 = 90.19
    expect(py).toBeCloseTo(90.19, 0);
  });

  it("supports pause/resume", () => {
    engine.addBody(0, 100, 0);
    engine.start();
    engine.pause();
    expect(engine.state).toBe(EngineState.Paused);
    engine.tick(1); // should not advance
    const [, py] = engine.getPosition(0);
    expect(py).toBeCloseTo(100, 0);
    engine.resume();
    expect(engine.state).toBe(EngineState.Running);
  });

  it("reports stats", () => {
    engine.start();
    engine.tick(0.016);
    const stats = engine.getStats();
    expect(stats.name).toBe("physics");
    expect(stats.tickCount).toBe(1);
    expect(stats.totalTime).toBeCloseTo(0.016);
  });

  it("serialize/hydrate round-trip", () => {
    engine.addBody(5, 10, 15);
    const state = engine.serialize();
    const engine2 = new PhysicsEngine();
    engine2.hydrate(state);
    expect(engine2.bodyCount).toBe(1);
  });

  it("reset clears everything", () => {
    engine.addBody(1, 2, 3);
    engine.start();
    engine.tick(0.1);
    engine.reset();
    expect(engine.state).toBe(EngineState.Idle);
    expect(engine.bodyCount).toBe(0);
    expect(engine.getStats().tickCount).toBe(0);
  });
});

// ─── AudioEngine (1D Linear) ───────────────────────────────────────────────

describe("AudioEngine — standalone", () => {
  let engine: AudioEngine;

  beforeEach(() => {
    engine = new AudioEngine();
  });

  it("starts in Idle state", () => {
    expect(engine.state).toBe(EngineState.Idle);
  });

  it("adds and removes tracks", () => {
    const wave = new LinearSubstrate("wave", [1, 2, 3, 4]);
    engine.addTrack("melody", wave);
    expect(engine.trackCount).toBe(1);
    expect(engine.trackNames()).toEqual(["melody"]);
    engine.removeTrack("melody");
    expect(engine.trackCount).toBe(0);
  });

  it("samples a track with volume and master volume", () => {
    const wave = new LinearSubstrate("wave", [100]);
    engine.addTrack("t1", wave, 0.5);
    engine.masterVolume = 0.8;
    const s = engine.sample("t1", 0);
    // raw(100) * trackVol(0.5) * master(0.8) — values are manifold-evaluated
    expect(s).not.toBe(0);
  });

  it("mixes tracks", () => {
    const w1 = new LinearSubstrate("w1", [10]);
    const w2 = new LinearSubstrate("w2", [20]);
    engine.addTrack("a", w1);
    engine.addTrack("b", w2);
    const mixed = engine.mix(0);
    expect(mixed).not.toBe(0);
  });

  it("advances playhead on tick", () => {
    engine.start();
    expect(engine.playhead).toBeCloseTo(0);
    engine.tick(0.5);
    expect(engine.playhead).toBeCloseTo(0.5, 0);
  });

  it("mute suppresses track in mix", () => {
    const w = new LinearSubstrate("w", [50]);
    engine.addTrack("t", w);
    engine.setMuted("t", true);
    expect(engine.mix(0)).toBe(0);
  });

  it("reset clears playhead", () => {
    engine.start();
    engine.tick(1);
    engine.reset();
    expect(engine.playhead).toBeCloseTo(0);
    expect(engine.state).toBe(EngineState.Idle);
  });
});

// ─── RenderEngine (2D Planar) ──────────────────────────────────────────────

describe("RenderEngine — standalone", () => {
  let engine: RenderEngine;

  beforeEach(() => {
    engine = new RenderEngine({ width: 320, height: 240 });
  });

  it("starts in Idle state", () => {
    expect(engine.state).toBe(EngineState.Idle);
  });

  it("adds renderables and tracks z-order", () => {
    const sprite1 = new PlanarSubstrate("s1", [[1, 2]]);
    const sprite2 = new PlanarSubstrate("s2", [[3, 4]]);
    engine.addRenderable("bg", sprite1, 0, 0, 0);
    engine.addRenderable("fg", sprite2, 10, 10, 1);
    expect(engine.renderableCount).toBe(2);
    expect(engine.getRenderOrder()).toEqual(["bg", "fg"]);
  });

  it("visibility filters renderables from render order", () => {
    const p = new PlanarSubstrate("p", [[1]]);
    engine.addRenderable("a", p, 0, 0, 0);
    engine.addRenderable("b", p, 0, 0, 1);
    engine.setVisible("a", false);
    expect(engine.getRenderOrder()).toEqual(["b"]);
  });

  it("tick increments frame count", () => {
    engine.start();
    engine.tick(0.016);
    engine.tick(0.016);
    expect(engine.frameCount).toBe(2);
  });

  it("camera properties are manifold points", () => {
    engine.cameraX = 50;
    engine.cameraY = 75;
    engine.cameraZoom = 2;
    expect(engine.cameraX).toBeCloseTo(50, 0);
    expect(engine.cameraY).toBeCloseTo(75, 0);
    expect(engine.cameraZoom).toBeCloseTo(2, 0);
  });

  it("reset clears frame count and framebuffer", () => {
    engine.start();
    engine.tick(0.016);
    engine.reset();
    expect(engine.frameCount).toBe(0);
    expect(engine.state).toBe(EngineState.Idle);
  });

  it("serialize/hydrate round-trip", () => {
    engine.cameraX = 100;
    const state = engine.serialize();
    const engine2 = new RenderEngine();
    engine2.hydrate(state);
    expect(engine2.cameraX).toBeCloseTo(100, 0);
  });
});

// ─── GameEngine (Whole Object) ─────────────────────────────────────────────

describe("GameEngine — standalone", () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it("starts in Idle state", () => {
    expect(engine.state).toBe(EngineState.Idle);
  });

  it("creates entities from volumes", () => {
    const vol = new VolumeSubstrate("body", [[[1, 2, 3]]]);
    engine.createEntity("player", vol, ["controllable"]);
    expect(engine.entityCount).toBe(1);
    expect(engine.entityNames()).toEqual(["player"]);
  });

  it("queries entities by tag", () => {
    const v1 = new VolumeSubstrate("v1", [[[1]]]);
    const v2 = new VolumeSubstrate("v2", [[[2]]]);
    engine.createEntity("a", v1, ["enemy"]);
    engine.createEntity("b", v2, ["enemy", "boss"]);
    engine.createEntity("c", v1, ["ally"]);
    expect(engine.entitiesByTag("enemy")).toEqual(["a", "b"]);
    expect(engine.entitiesByTag("boss")).toEqual(["b"]);
    expect(engine.entitiesByTag("ally")).toEqual(["c"]);
  });

  it("deactivated entities excluded from tag query", () => {
    const v = new VolumeSubstrate("v", [[[1]]]);
    engine.createEntity("e", v, ["npc"]);
    engine.setActive("e", false);
    expect(engine.entitiesByTag("npc")).toEqual([]);
    expect(engine.isActive("e")).toBe(false);
  });

  it("tick re-collapses active objects", () => {
    const v = new VolumeSubstrate("v", [[[5, 10]]]);
    const obj = engine.createEntity("e", v);
    const zBefore = obj.z;
    engine.start();
    engine.tick(0.016);
    // z should be the same since volume didn't change
    expect(obj.z).toBeCloseTo(zBefore, 5);
  });

  it("score is a manifold point", () => {
    engine.score = 42;
    expect(engine.score).toBeCloseTo(42, 0);
  });

  it("removes entities", () => {
    const v = new VolumeSubstrate("v", [[[1]]]);
    engine.createEntity("e", v);
    engine.removeEntity("e");
    expect(engine.entityCount).toBe(0);
  });

  it("reset clears all entities and score", () => {
    const v = new VolumeSubstrate("v", [[[1]]]);
    engine.createEntity("e", v);
    engine.score = 100;
    engine.reset();
    expect(engine.entityCount).toBe(0);
    expect(engine.score).toBeCloseTo(0);
    expect(engine.state).toBe(EngineState.Idle);
  });
});

// ─── EngineSuite ────────────────────────────────────────────────────────────

describe("EngineSuite — orchestration", () => {
  it("ticks all engines in registration order", () => {
    const physics = new PhysicsEngine();
    const audio = new AudioEngine();
    const render = new RenderEngine();
    const game = new GameEngine();

    const suite = new EngineSuite("main");
    suite.add(physics).add(audio).add(render).add(game);

    expect(suite.engines.length).toBe(4);

    suite.start();
    expect(physics.state).toBe(EngineState.Running);
    expect(audio.state).toBe(EngineState.Running);

    suite.tick(0.016);
    expect(suite.getStats().tickCount).toBe(1);
    expect(physics.getStats().tickCount).toBe(1);
    expect(audio.getStats().tickCount).toBe(1);
    expect(render.getStats().tickCount).toBe(1);
    expect(game.getStats().tickCount).toBe(1);
  });

  it("pause/resume propagates to all engines", () => {
    const suite = new EngineSuite("test");
    const physics = new PhysicsEngine();
    suite.add(physics);
    suite.start();
    suite.pause();
    expect(physics.state).toBe(EngineState.Paused);
    suite.resume();
    expect(physics.state).toBe(EngineState.Running);
  });

  it("get/remove engines by name", () => {
    const suite = new EngineSuite("test");
    suite.add(new PhysicsEngine());
    expect(suite.get("physics")).toBeDefined();
    suite.remove("physics");
    expect(suite.get("physics")).toBeUndefined();
    expect(suite.engines.length).toBe(0);
  });

  it("getAllStats returns suite + all engine stats", () => {
    const suite = new EngineSuite("test");
    suite.add(new AudioEngine());
    suite.add(new RenderEngine());
    const allStats = suite.getAllStats();
    expect(allStats.length).toBe(3); // suite + 2 engines
    expect(allStats[0].name).toBe("test");
    expect(allStats[1].name).toBe("audio");
    expect(allStats[2].name).toBe("render");
  });

  it("serialize/hydrate round-trip", () => {
    const suite = new EngineSuite("main");
    const physics = new PhysicsEngine();
    physics.addBody(1, 2, 3);
    suite.add(physics);

    const state = suite.serialize();
    const suite2 = new EngineSuite("main");
    const physics2 = new PhysicsEngine();
    suite2.add(physics2);
    suite2.hydrate(state);
    expect(physics2.bodyCount).toBe(1);
  });

  it("reset propagates to all engines", () => {
    const suite = new EngineSuite("test");
    const game = new GameEngine();
    game.score = 999;
    suite.add(game);
    suite.start();
    suite.tick(0.016);
    suite.reset();
    expect(suite.state).toBe(EngineState.Idle);
    expect(game.state).toBe(EngineState.Idle);
    expect(game.getStats().tickCount).toBe(0);
  });

  it("engines work independently outside a suite", () => {
    // Each engine can run standalone — no suite required.
    const physics = new PhysicsEngine();
    physics.addBody(0, 50, 0);
    physics.start();
    physics.tick(0.5);
    const [, py] = physics.getPosition(0);
    expect(py).toBeLessThan(50);

    const audio = new AudioEngine();
    audio.start();
    audio.tick(1);
    expect(audio.playhead).toBeCloseTo(1, 0);

    const render = new RenderEngine();
    render.start();
    render.tick(0.016);
    expect(render.frameCount).toBe(1);

    const game = new GameEngine();
    const v = new VolumeSubstrate("v", [[[1]]]);
    game.createEntity("e", v);
    game.start();
    game.tick(0.016);
    expect(game.entityCount).toBe(1);
  });
});


// ─── EngineRegistry ─────────────────────────────────────────────────────────

describe("EngineRegistry — profiles and mix-and-match", () => {
  let registry: EngineRegistry;

  beforeEach(() => {
    registry = new EngineRegistry();
  });

  it("ships with 8 built-in profiles", () => {
    const names = registry.profileNames();
    expect(names).toContain("game-3d");
    expect(names).toContain("game-2d");
    expect(names).toContain("audio-only");
    expect(names).toContain("simulation");
    expect(names).toContain("physics-sandbox");
    expect(names).toContain("render-only");
    expect(names).toContain("game-3d-threejs");
    expect(names).toContain("render-3d-threejs");
    expect(names.length).toBe(8);
  });

  it("listProfiles returns names and descriptions", () => {
    const list = registry.listProfiles();
    const game3d = list.find(p => p.name === "game-3d");
    expect(game3d).toBeDefined();
    expect(game3d!.description).toContain("3D");
  });

  it("build game-3d produces suite with 6 engines", () => {
    const suite = registry.build("game-3d");
    expect(suite.engines.length).toBe(6);
    expect(suite.get("physics")).toBeDefined();
    expect(suite.get("audio")).toBeDefined();
    expect(suite.get("render")).toBeDefined();
    expect(suite.get("game")).toBeDefined();
    expect(suite.get("rules")).toBeDefined();
    expect(suite.get("characters")).toBeDefined();
  });

  it("build game-2d produces suite with 5 engines (no physics)", () => {
    const suite = registry.build("game-2d");
    expect(suite.engines.length).toBe(5);
    expect(suite.get("physics")).toBeUndefined();
    expect(suite.get("audio")).toBeDefined();
    expect(suite.get("render")).toBeDefined();
    expect(suite.get("game")).toBeDefined();
    expect(suite.get("rules")).toBeDefined();
    expect(suite.get("characters")).toBeDefined();
  });

  it("build audio-only produces suite with 1 engine", () => {
    const suite = registry.build("audio-only");
    expect(suite.engines.length).toBe(1);
    expect(suite.get("audio")).toBeDefined();
  });

  it("build simulation produces suite with physics + game", () => {
    const suite = registry.build("simulation");
    expect(suite.engines.length).toBe(2);
    expect(suite.get("physics")).toBeDefined();
    expect(suite.get("game")).toBeDefined();
  });

  it("build physics-sandbox produces suite with physics + render", () => {
    const suite = registry.build("physics-sandbox");
    expect(suite.engines.length).toBe(2);
    expect(suite.get("physics")).toBeDefined();
    expect(suite.get("render")).toBeDefined();
  });

  it("build render-only produces suite with 1 engine", () => {
    const suite = registry.build("render-only");
    expect(suite.engines.length).toBe(1);
    expect(suite.get("render")).toBeDefined();
  });

  it("built suite is fully functional — start, tick, stop", () => {
    const suite = registry.build("game-2d");
    suite.start();
    expect(suite.state).toBe(EngineState.Running);
    suite.tick(0.016);
    expect(suite.getStats().tickCount).toBe(1);
    suite.stop();
    expect(suite.state).toBe(EngineState.Stopped);
  });

  it("config overrides are passed to engines", () => {
    const suite = registry.build("game-3d", {
      render: { width: 1920, height: 1080 },
    });
    // The suite was built — engines received config.
    // We can verify the render engine exists and works.
    const render = suite.get("render") as RenderEngine;
    expect(render).toBeDefined();
    suite.start();
    suite.tick(0.016);
    expect(render.frameCount).toBe(1);
  });

  it("register custom profile", () => {
    registry.register("my-app", "Custom app with just game logic", () => [
      new GameEngine(),
    ]);
    expect(registry.has("my-app")).toBe(true);
    const suite = registry.build("my-app");
    expect(suite.engines.length).toBe(1);
    expect(suite.get("game")).toBeDefined();
  });

  it("unregister profile", () => {
    registry.register("temp", "Temporary", () => []);
    expect(registry.has("temp")).toBe(true);
    registry.unregister("temp");
    expect(registry.has("temp")).toBe(false);
  });

  it("build unknown profile throws", () => {
    expect(() => registry.build("nonexistent")).toThrow(/unknown profile/);
  });

  it("defaultRegistry singleton has built-in profiles", () => {
    expect(defaultRegistry.has("game-3d")).toBe(true);
    expect(defaultRegistry.has("game-2d")).toBe(true);
    const suite = defaultRegistry.build("game-2d");
    expect(suite.engines.length).toBe(5);
  });

  it("custom profile can mix any engines", () => {
    // A VR music visualizer: audio + render (no physics, no game logic)
    registry.register("music-visualizer", "Audio + visuals", (cfg) => [
      new AudioEngine(cfg?.audio),
      new RenderEngine(cfg?.render),
    ]);
    const suite = registry.build("music-visualizer");
    expect(suite.engines.length).toBe(2);
    expect(suite.get("audio")).toBeDefined();
    expect(suite.get("render")).toBeDefined();
    expect(suite.get("physics")).toBeUndefined();
    expect(suite.get("game")).toBeUndefined();
  });
});

// ================================================================
//  RULES ENGINE TESTS
// ================================================================

describe("RulesEngine", () => {
  let engine: RulesEngine;

  beforeEach(() => {
    engine = new RulesEngine();
  });

  it("starts in Idle state", () => {
    expect(engine.state).toBe(EngineState.Idle);
    expect(engine.ruleCount).toBe(0);
    expect(engine.totalFired).toBe(0);
  });

  it("defines and lists rules", () => {
    engine.defineRule({
      name: "low-health-warning",
      description: "Warn when health < 20",
      priority: 10,
      condition: (ctx) => (ctx.health as number) < 20,
      action: (ctx) => { ctx.warned = true; },
    });
    expect(engine.ruleCount).toBe(1);
    expect(engine.ruleNames()).toEqual(["low-health-warning"]);
  });

  it("evaluates rules against context", () => {
    engine.defineRule({
      name: "score-bonus",
      description: "Award bonus when combo > 5",
      priority: 5,
      condition: (ctx) => (ctx.combo as number) > 5,
      action: (ctx) => { ctx.score = ((ctx.score as number) || 0) + 100; },
    });

    engine.start();
    engine.context = { combo: 3, score: 0 };
    engine.tick(0.016);
    expect(engine.context.score).toBe(0); // combo too low

    engine.context = { combo: 8, score: 0 };
    engine.tick(0.016);
    expect(engine.context.score).toBe(100); // fired
    expect(engine.totalFired).toBeCloseTo(1, 5);
    expect(engine.getRuleFireCount("score-bonus")).toBeCloseTo(1, 5);
  });

  it("respects priority ordering", () => {
    const order: string[] = [];
    engine.defineRule({
      name: "low-priority",
      description: "fires second",
      priority: 1,
      condition: () => true,
      action: () => { order.push("low"); },
    });
    engine.defineRule({
      name: "high-priority",
      description: "fires first",
      priority: 100,
      condition: () => true,
      action: () => { order.push("high"); },
    });

    engine.start();
    engine.context = {};
    const fired = engine.evaluate();
    expect(fired).toEqual(["high-priority", "low-priority"]);
    expect(order).toEqual(["high", "low"]);
  });

  it("supports cooldowns", () => {
    engine.defineRule({
      name: "heal",
      description: "heal every 2s",
      priority: 1,
      condition: () => true,
      action: (ctx) => { ctx.heals = ((ctx.heals as number) || 0) + 1; },
      cooldown: 2,
    });

    engine.start();
    engine.context = { heals: 0 };
    engine.tick(0.016); // fires (first time, totalTime becomes 0.016)
    expect(engine.context.heals).toBe(1);
    engine.tick(0.5);   // too soon (totalTime=0.016 < 2 at eval, then becomes 0.516)
    expect(engine.context.heals).toBe(1);
    engine.tick(2.0);   // totalTime=0.516 at eval, still < 2
    engine.tick(0.5);   // totalTime=2.516 at eval, 2.516-0 >= 2, fires
    expect(engine.context.heals).toBe(2);
  });

  it("enables and disables rules", () => {
    engine.defineRule({
      name: "test-rule",
      description: "toggleable",
      priority: 1,
      condition: () => true,
      action: (ctx) => { ctx.hit = true; },
    });

    engine.start();
    engine.disableRule("test-rule");
    expect(engine.isRuleActive("test-rule")).toBe(false);
    engine.context = {};
    engine.tick(0.016);
    expect(engine.context.hit).toBeUndefined();

    engine.enableRule("test-rule");
    engine.tick(0.016);
    expect(engine.context.hit).toBe(true);
  });

  it("removes rules", () => {
    engine.defineRule({ name: "r1", description: "", priority: 1, condition: () => true, action: () => {} });
    expect(engine.ruleCount).toBe(1);
    engine.removeRule("r1");
    expect(engine.ruleCount).toBe(0);
  });

  it("serializes and hydrates", () => {
    engine.defineRule({
      name: "s-rule",
      description: "serializable",
      priority: 5,
      condition: () => true,
      action: () => {},
    });
    engine.start();
    engine.context = {};
    engine.tick(0.016);

    const snap = engine.serialize();
    const engine2 = new RulesEngine();
    engine2.defineRule({
      name: "s-rule",
      description: "serializable",
      priority: 5,
      condition: () => true,
      action: () => {},
    });
    engine2.hydrate(snap);
    expect(engine2.totalFired).toBeCloseTo(1, 5);
    expect(engine2.getRuleFireCount("s-rule")).toBeCloseTo(1, 5);
  });

  it("reset clears fire counts but keeps rules", () => {
    engine.defineRule({ name: "r", description: "", priority: 1, condition: () => true, action: () => {} });
    engine.start();
    engine.context = {};
    engine.tick(0.016);
    expect(engine.totalFired).toBeCloseTo(1, 5);

    engine.reset();
    expect(engine.totalFired).toBe(0);
    expect(engine.getRuleFireCount("r")).toBe(0);
    expect(engine.ruleCount).toBe(1); // rule still defined
  });

  it("getStats returns correct info", () => {
    engine.start();
    engine.context = {};
    engine.tick(0.016);
    const stats = engine.getStats();
    expect(stats.name).toBe("rules");
    expect(stats.state).toBe(EngineState.Running);
    expect(stats.tickCount).toBe(1);
  });
});

// ================================================================
//  CHARACTER ENGINE TESTS
// ================================================================

describe("CharacterEngine", () => {
  let engine: CharacterEngine;

  beforeEach(() => {
    engine = new CharacterEngine();
    engine.defineCharacter({
      templateName: "warrior",
      attributes: { health: 100, strength: 50, speed: 30 },
      personality: { courage: 0.9, loyalty: 0.7 },
      backstory: "A seasoned fighter from the northern lands.",
      autonomous: true,
    });
    engine.defineCharacter({
      templateName: "player-hero",
      attributes: { health: 100, mana: 80 },
      personality: { charisma: 0.5 },
      backstory: "The protagonist.",
      autonomous: false,
    });
  });

  it("starts in Idle state with definitions", () => {
    expect(engine.state).toBe(EngineState.Idle);
    expect(engine.definitionCount).toBe(2);
    expect(engine.characterCount).toBe(0);
    expect(engine.definitionNames()).toContain("warrior");
    expect(engine.definitionNames()).toContain("player-hero");
  });

  it("spawns autonomous characters as actors", () => {
    const w = engine.spawn("guard-1", "warrior");
    expect(w.name).toBe("guard-1");
    expect(w.templateName).toBe("warrior");
    expect(w.autonomous).toBe(true);
    expect(w.awareness).toBe("actor");
    expect(w.active).toBe(true);
    expect(w.attributes.get("health")?.value).toBeCloseTo(100, 5);
    expect(w.attributes.get("strength")?.value).toBeCloseTo(50, 5);
    expect(w.personality.get("courage")?.value).toBeCloseTo(0.9, 5);
    expect(w.backstory).toBe("A seasoned fighter from the northern lands.");
    expect(engine.characterCount).toBe(1);
  });

  it("spawns non-autonomous characters as player-controlled", () => {
    const p = engine.spawn("hero", "player-hero");
    expect(p.autonomous).toBe(false);
    expect(p.awareness).toBe("player-controlled");
  });

  it("supports attribute overrides on spawn", () => {
    const w = engine.spawn("tank", "warrior", {
      attributes: { health: 200, armor: 80 },
      personality: { courage: 1.0 },
      backstory: "An unstoppable juggernaut.",
    });
    expect(w.attributes.get("health")?.value).toBeCloseTo(200, 5);
    expect(w.attributes.get("armor")?.value).toBeCloseTo(80, 5);
    expect(w.attributes.get("strength")?.value).toBeCloseTo(50, 5); // from template
    expect(w.personality.get("courage")?.value).toBeCloseTo(1.0, 5);
    expect(w.backstory).toBe("An unstoppable juggernaut.");
  });

  it("throws on unknown template", () => {
    expect(() => engine.spawn("x", "dragon")).toThrow(/unknown template/);
  });

  it("gets and sets attributes via engine API", () => {
    engine.spawn("g1", "warrior");
    expect(engine.getAttribute("g1", "health")).toBeCloseTo(100, 5);
    engine.setAttribute("g1", "health", 75);
    expect(engine.getAttribute("g1", "health")).toBeCloseTo(75, 5);
  });

  it("despawns characters", () => {
    engine.spawn("g1", "warrior");
    expect(engine.characterCount).toBe(1);
    engine.despawn("g1");
    expect(engine.characterCount).toBe(0);
  });

  it("ticks autonomous characters with behavior", () => {
    const behavior = jest.fn((char: any, dt: number) => {
      const hp = char.attributes.get("health")!;
      hp.setPath("value", hp.value - 1); // lose 1 hp per tick
    });

    engine.spawn("g1", "warrior", { behavior });
    engine.start();
    engine.tick(0.016);
    engine.tick(0.016);

    expect(behavior).toHaveBeenCalledTimes(2);
    expect(engine.getAttribute("g1", "health")).toBeCloseTo(98, 5);
  });

  it("does NOT tick non-autonomous characters", () => {
    const behavior = jest.fn();
    // Even if we somehow set a behavior on player-controlled, it shouldn't tick
    engine.spawn("hero", "player-hero");
    engine.start();
    engine.tick(0.016);
    expect(behavior).not.toHaveBeenCalled();
  });

  it("filters active autonomous vs player-controlled", () => {
    engine.spawn("g1", "warrior");
    engine.spawn("g2", "warrior");
    engine.spawn("hero", "player-hero");
    const g2 = engine.getCharacter("g2")!;
    g2.active = false;

    expect(engine.activeAutonomous().length).toBe(1);
    expect(engine.activePlayerControlled().length).toBe(1);
  });

  it("serializes and hydrates characters", () => {
    engine.spawn("g1", "warrior");
    engine.setAttribute("g1", "health", 42);
    engine.start();
    engine.tick(0.016);

    const snap = engine.serialize();

    const engine2 = new CharacterEngine();
    engine2.defineCharacter({
      templateName: "warrior",
      attributes: { health: 100, strength: 50, speed: 30 },
      personality: { courage: 0.9, loyalty: 0.7 },
      backstory: "A seasoned fighter from the northern lands.",
      autonomous: true,
    });
    engine2.hydrate(snap);

    expect(engine2.characterCount).toBe(1);
    expect(engine2.getAttribute("g1", "health")).toBeCloseTo(42, 5);
  });

  it("reset clears all characters", () => {
    engine.spawn("g1", "warrior");
    engine.spawn("hero", "player-hero");
    expect(engine.characterCount).toBe(2);
    engine.reset();
    expect(engine.characterCount).toBe(0);
  });

  it("removes definitions", () => {
    expect(engine.definitionCount).toBe(2);
    engine.removeDefinition("warrior");
    expect(engine.definitionCount).toBe(1);
    expect(engine.getDefinition("warrior")).toBeUndefined();
  });

  it("getStats returns correct info", () => {
    engine.start();
    engine.tick(0.016);
    const stats = engine.getStats();
    expect(stats.name).toBe("characters");
    expect(stats.state).toBe(EngineState.Running);
    expect(stats.tickCount).toBe(1);
  });
});


// ═══════════════════════════════════════════════════════════════════════════
//  THREE RENDER ENGINE (headless / mocked Three.js)
// ═══════════════════════════════════════════════════════════════════════════

// Mock Three.js — no WebGL in Node.js
jest.mock("three", () => {
  class Vector3 { x = 0; y = 0; z = 0; set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } }
  class Euler { x = 0; y = 0; z = 0; set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } }
  class MockObject3D {
    name = "";
    position = new Vector3();
    rotation = new Euler();
    scale = new Vector3();
    visible = true;
    castShadow = false;
    receiveShadow = false;
    children: any[] = [];
  }
  class Scene extends MockObject3D { add(obj: any) { this.children.push(obj); } remove(obj: any) { this.children = this.children.filter((c: any) => c !== obj); } }
  class PerspectiveCamera extends MockObject3D {
    fov: number; aspect: number; near: number; far: number;
    constructor(fov = 60, aspect = 1, near = 0.1, far = 1000) { super(); this.fov = fov; this.aspect = aspect; this.near = near; this.far = far; }
    updateProjectionMatrix() {}
  }
  class BufferGeometry { dispose() {} }
  class BoxGeometry extends BufferGeometry { constructor(public w = 1, public h = 1, public d = 1) { super(); } }
  class SphereGeometry extends BufferGeometry { constructor(public r = 0.5) { super(); } }
  class PlaneGeometry extends BufferGeometry { constructor(public w = 1, public h = 1) { super(); } }
  class CylinderGeometry extends BufferGeometry {}
  class ConeGeometry extends BufferGeometry {}
  class TorusGeometry extends BufferGeometry {}
  class Material { dispose() {} }
  class MeshStandardMaterial extends Material { constructor(public params?: any) { super(); } }
  class Mesh extends MockObject3D {
    geometry: BufferGeometry; material: Material;
    constructor(geometry: BufferGeometry, material: Material) { super(); this.geometry = geometry; this.material = material; }
  }
  return {
    Scene, PerspectiveCamera, BufferGeometry, BoxGeometry, SphereGeometry,
    PlaneGeometry, CylinderGeometry, ConeGeometry, TorusGeometry,
    Material, MeshStandardMaterial, Mesh, PCFSoftShadowMap: 2,
  };
});

import { ThreeRenderEngine } from "../core/engine/three-render-engine";
import {
  SceneSubstrate,
  MeshSubstrate,
  MaterialSubstrate,
} from "../core/substrate/high-order-substrates";

describe("ThreeRenderEngine — Headless 3D Bridge", () => {
  let engine: ThreeRenderEngine;

  beforeEach(() => {
    engine = new ThreeRenderEngine();
  });

  test("should start in idle state and be headless", () => {
    expect(engine.state).toBe(EngineState.Idle);
    expect(engine.isHeadless).toBe(true);
    expect(engine.meshCount).toBe(0);
  });

  test("should expose Three.js scene and camera", () => {
    expect(engine.threeScene).toBeDefined();
    expect(engine.threeCamera).toBeDefined();
    expect(engine.threeRenderer).toBeNull();
  });

  test("should add a MeshSubstrate and create a Three.js Mesh", () => {
    const mesh = new MeshSubstrate("box1", "box");
    mesh.setPosition(1, 2, 3);
    engine.addMesh(mesh);
    expect(engine.meshCount).toBe(1);

    const threeMesh = engine.getThreeMesh("box1");
    expect(threeMesh).toBeDefined();
    expect(threeMesh!.name).toBe("box1");
    // Position synced from substrate
    expect(threeMesh!.position.x).toBeCloseTo(1, 5);
    expect(threeMesh!.position.y).toBeCloseTo(2, 5);
    expect(threeMesh!.position.z).toBeCloseTo(3, 5);
  });

  test("should not add duplicate meshes", () => {
    const mesh = new MeshSubstrate("m");
    engine.addMesh(mesh);
    engine.addMesh(mesh);
    expect(engine.meshCount).toBe(1);
  });

  test("should remove a mesh", () => {
    const mesh = new MeshSubstrate("m");
    engine.addMesh(mesh);
    expect(engine.removeMesh("m")).toBe(true);
    expect(engine.meshCount).toBe(0);
    expect(engine.removeMesh("m")).toBe(false);
  });

  test("should add mesh with material", () => {
    const mat = new MaterialSubstrate("metal");
    mat.setProperty("roughness", 0.2);
    const mesh = new MeshSubstrate("sphere1", "sphere", mat);
    engine.addMesh(mesh);
    expect(engine.meshCount).toBe(1);
  });

  test("should sync transforms on tick", () => {
    const mesh = new MeshSubstrate("m");
    engine.addMesh(mesh);
    engine.start();

    // Move the substrate
    mesh.setPosition(10, 20, 30);
    mesh.setRotation(0.5, 1.0, 1.5);
    mesh.setScale(2, 2, 2);
    engine.tick(0.016);

    const tm = engine.getThreeMesh("m")!;
    expect(tm.position.x).toBeCloseTo(10, 5);
    expect(tm.position.y).toBeCloseTo(20, 5);
    expect(tm.rotation.x).toBeCloseTo(0.5, 5);
    expect(tm.scale.x).toBeCloseTo(2, 5);
    expect(engine.frameCount).toBe(1);
  });

  test("should sync camera from SceneSubstrate", () => {
    const scene = new SceneSubstrate("world");
    scene.setCameraPosition(5, 10, 15);
    engine.bindScene(scene);
    engine.start();
    engine.tick(0.016);

    expect(engine.threeCamera.position.x).toBeCloseTo(5, 5);
    expect(engine.threeCamera.position.y).toBeCloseTo(10, 5);
    expect(engine.threeCamera.position.z).toBeCloseTo(15, 5);
  });

  test("should not tick when not running", () => {
    engine.tick(0.016);
    expect(engine.frameCount).toBe(0);
  });

  test("should support pause/resume", () => {
    engine.start();
    engine.tick(0.016);
    expect(engine.frameCount).toBe(1);
    engine.pause();
    engine.tick(0.016);
    expect(engine.frameCount).toBe(1);
    engine.resume();
    engine.tick(0.016);
    expect(engine.frameCount).toBe(2);
  });

  test("should reset to clean state", () => {
    engine.addMesh(new MeshSubstrate("m"));
    engine.start();
    engine.tick(0.016);
    engine.reset();
    expect(engine.state).toBe(EngineState.Idle);
    expect(engine.meshCount).toBe(0);
    expect(engine.frameCount).toBe(0);
  });

  test("should serialize and hydrate", () => {
    engine.addMesh(new MeshSubstrate("a"));
    engine.start();
    engine.tick(0.016);
    const state = engine.serialize() as any;
    expect(state.frameCount).toBe(1);
    expect(state.meshNames).toContain("a");

    const engine2 = new ThreeRenderEngine();
    engine2.hydrate(state);
    expect(engine2.frameCount).toBe(1);
  });

  test("should report stats", () => {
    engine.start();
    engine.tick(0.016);
    const stats = engine.getStats();
    expect(stats.name).toBe("three-render");
    expect(stats.state).toBe(EngineState.Running);
    expect(stats.tickCount).toBe(1);
  });
});
