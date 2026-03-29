"use strict";
// tests/manifold-compliance.test.ts
// Manifold Compliance Tests - Verifies dimensional programming patterns
// These tests catch hard-coding and ensure manifold-based access
Object.defineProperty(exports, "__esModule", { value: true });
const physicsengine_1 = require("../app/src/engine/physicsengine");
const videoEngine_1 = require("../app/src/engine/videoEngine");
const audeoEngine_1 = require("../app/src/engine/audeoEngine");
const gameengine_1 = require("../app/src/engine/gameengine");
/**
 * MANIFOLD COMPLIANCE RULES:
 * 1. All access must be through drill() - O(1) coordinate access
 * 2. Pattern matching via match()/search()/find() - no iteration
 * 3. Mutations create versions via withValue() - history preserved
 * 4. No external caching - manifold IS the index
 * 5. Deterministic - same drill = same result
 */
describe("Manifold Compliance: PhysicsSubstrate", () => {
    let physics;
    beforeEach(() => {
        physics = physicsengine_1.PhysicsSubstrate.create();
    });
    test("drill() provides O(1) body access", () => {
        physics.addBody("player", { position: [1, 2, 3] });
        physics.addBody("enemy", { position: [4, 5, 6] });
        // Direct coordinate access - not iteration
        const player = physics.body("player");
        const pos = player.drill("position").value;
        expect(pos).toEqual([1, 2, 3]);
    });
    test("manifold is deterministic - same drill = same result", () => {
        physics.addBody("test", { mass: 5 });
        const mass1 = physics.body("test").drill("mass").value;
        const mass2 = physics.body("test").drill("mass").value;
        expect(mass1).toBe(mass2);
        expect(mass1).toBe(5);
    });
    test("nested coordinates are drillable", () => {
        physics.drill("world", "gravity").value = [0, -10, 0];
        const gravity = physics.drill("world", "gravity").value;
        expect(gravity).toEqual([0, -10, 0]);
    });
    test("version increments on mutation", () => {
        const v1 = physics.version.id;
        physics.addBody("new", {});
        const v2 = physics.version.id;
        expect(v2).toBeGreaterThan(v1);
    });
});
describe("Manifold Compliance: VideoSubstrate", () => {
    let video;
    beforeEach(() => {
        video = videoEngine_1.VideoSubstrate.create();
        video.loadMeta(100, 100, 1, "rgba");
    });
    test("pixel access is O(1) via coordinates", () => {
        video.setPixel(0, 50, 50, [255, 0, 0, 255]);
        // Direct coordinate access - drill to [frame, x, y]
        const color = video.getPixel(0, 50, 50);
        expect(color).toEqual([255, 0, 0, 255]);
    });
    test("pixel coordinates are independent", () => {
        video.setPixel(0, 10, 10, [100, 100, 100, 255]);
        video.setPixel(0, 20, 20, [200, 200, 200, 255]);
        // Each pixel is its own coordinate
        expect(video.getPixel(0, 10, 10)).toEqual([100, 100, 100, 255]);
        expect(video.getPixel(0, 20, 20)).toEqual([200, 200, 200, 255]);
    });
    test("region pattern matching works", () => {
        video.region(0, "face_1").drill("bounds").value = [0, 0, 50, 50];
        video.region(0, "face_2").drill("bounds").value = [50, 0, 100, 50];
        video.region(0, "hand_1").drill("bounds").value = [0, 50, 50, 100];
        const faces = video.findRegions(0, /^face_/);
        expect(faces.length).toBe(2);
    });
    test("metadata is drillable", () => {
        expect(video.drill("meta", "width").value).toBe(100);
        expect(video.drill("meta", "height").value).toBe(100);
    });
});
describe("Manifold Compliance: AudioSubstrate", () => {
    let audio;
    beforeEach(() => {
        audio = audeoEngine_1.AudioSubstrate.create();
    });
    test("track access is O(1)", () => {
        audio.addTrack("drums", { volume: 0.8 });
        audio.addTrack("bass", { volume: 0.6 });
        const drumsVol = audio.track("drums").drill("volume").value;
        expect(drumsVol).toBe(0.8);
    });
    test("sample pattern matching works", () => {
        audio.addSample("drums", { id: "kick_01", duration: 0.5, sampleRate: 44100, channels: 2, gain: 1, pan: 0, startTime: 0 });
        audio.addSample("drums", { id: "kick_02", duration: 0.5, sampleRate: 44100, channels: 2, gain: 1, pan: 0, startTime: 1 });
        audio.addSample("drums", { id: "snare_01", duration: 0.3, sampleRate: 44100, channels: 2, gain: 1, pan: 0, startTime: 0.5 });
        const kicks = audio.findSamples("drums", /^kick_/);
        expect(kicks.length).toBe(2);
    });
    test("BPM is a drillable coordinate", () => {
        audio.setBpm(140);
        expect(audio.bpm).toBe(140);
        expect(audio.drill("master", "bpm").value).toBe(140);
    });
    test("effects are drillable", () => {
        audio.addEffect("reverb_1", "reverb", { wet: 0.5, decay: 2.0 });
        const wet = audio.drill("effects", "reverb_1", "params", "wet").value;
        expect(wet).toBe(0.5);
    });
});
describe("Manifold Compliance: GameSubstrate", () => {
    let game;
    beforeEach(() => {
        game = gameengine_1.GameSubstrate.create();
    });
    test("entity access is O(1)", () => {
        game.createEntity("player", ["controllable"]);
        game.createEntity("enemy_1", ["hostile"]);
        const player = game.entity("player");
        expect(player.drill("active").value).toBe(true);
    });
    test("component drilling works", () => {
        game.createEntity("player");
        game.addComponent("player", "transform", { x: 10, y: 20, z: 30 });
        const x = game.component("player", "transform").drill("x").value;
        expect(x).toBe(10);
    });
    test("entity pattern matching works", () => {
        game.createEntity("enemy_1");
        game.createEntity("enemy_2");
        game.createEntity("enemy_3");
        game.createEntity("player");
        const enemies = game.findEntities(/^enemy_/);
        expect(enemies.length).toBe(3);
    });
    test("game state is drillable", () => {
        game.setState("score", 100);
        game.setState("level", 5);
        expect(game.getState("score")).toBe(100);
        expect(game.drill("state", "level").value).toBe(5);
    });
});
describe("Dining Philosophers Synchronization", () => {
    let game;
    beforeEach(() => {
        game = gameengine_1.GameSubstrate.create();
        game.initPhilosophers(5); // Classic 5 philosophers
    });
    test("philosophers are drillable coordinates", () => {
        // Each philosopher is a coordinate - O(1) access
        const p0 = game.philosopher(0);
        const p4 = game.philosopher(4);
        expect(p0.drill("thinking").value).toBe(true);
        expect(p4.drill("eating").value).toBe(false);
    });
    test("philosopher state is navigated, not computed", () => {
        // Drill directly to state - no lock computation
        expect(game.drill("sync", "philosophers", "p_2", "eating").value).toBe(false);
        expect(game.drill("sync", "philosophers", "p_2", "fork_left").value).toBe(true);
    });
    test("tryEat acquires forks and sets eating state", () => {
        // Philosopher 0 tries to eat
        const canEat = game.tryEat(0);
        expect(canEat).toBe(true);
        expect(game.isEating(0)).toBe(true);
        expect(game.philosopher(0).drill("thinking").value).toBe(false);
    });
    test("adjacent philosophers cannot eat simultaneously", () => {
        // P0 eats first
        game.tryEat(0);
        expect(game.isEating(0)).toBe(true);
        // P1 cannot eat - shares fork with P0
        const p1CanEat = game.tryEat(1);
        expect(p1CanEat).toBe(false);
        expect(game.isEating(1)).toBe(false);
        // P4 cannot eat - shares fork with P0 (circular)
        const p4CanEat = game.tryEat(4);
        expect(p4CanEat).toBe(false);
    });
    test("non-adjacent philosophers can eat simultaneously", () => {
        // P0 and P2 are not adjacent - both can eat
        game.tryEat(0);
        const p2CanEat = game.tryEat(2);
        expect(game.isEating(0)).toBe(true);
        expect(p2CanEat).toBe(true);
        expect(game.isEating(2)).toBe(true);
    });
    test("finishEating releases forks", () => {
        game.tryEat(0);
        expect(game.isEating(0)).toBe(true);
        game.finishEating(0);
        expect(game.isEating(0)).toBe(false);
        expect(game.philosopher(0).drill("thinking").value).toBe(true);
        // Now P1 can eat
        const p1CanEat = game.tryEat(1);
        expect(p1CanEat).toBe(true);
    });
    test("fork state is drillable - O(1) check", () => {
        // Forks are coordinates, not computed locks
        const fork = game.philosopher(0).drill("fork_right");
        expect(fork.value).toBe(true); // available
        game.tryEat(0);
        expect(fork.value).toBe(false); // acquired
        game.finishEating(0);
        expect(fork.value).toBe(true); // released
    });
    test("synchronization state persists in manifold", () => {
        game.tryEat(0);
        game.tryEat(2);
        // State is the manifold - drill to verify
        const eating0 = game.drill("sync", "philosophers", "p_0", "eating").value;
        const eating1 = game.drill("sync", "philosophers", "p_1", "eating").value;
        const eating2 = game.drill("sync", "philosophers", "p_2", "eating").value;
        expect(eating0).toBe(true);
        expect(eating1).toBe(false);
        expect(eating2).toBe(true);
    });
    test("process waits for philosopher - async coordination", async () => {
        // Simulate process waiting for P0 to eat
        let proceeded = false;
        // Start waiting (will resolve when P0 eats)
        const waitPromise = game.waitForPhilosopher(0).then(() => {
            proceeded = true;
        });
        // P0 is not eating yet
        expect(proceeded).toBe(false);
        // P0 starts eating
        game.tryEat(0);
        // Wait for promise to resolve
        await waitPromise;
        expect(proceeded).toBe(true);
    });
    test("multiple rounds of eating - no deadlock", () => {
        // Round 1: P0, P2 eat
        game.tryEat(0);
        game.tryEat(2);
        game.finishEating(0);
        game.finishEating(2);
        // Round 2: P1, P3 eat
        expect(game.tryEat(1)).toBe(true);
        expect(game.tryEat(3)).toBe(true);
        game.finishEating(1);
        game.finishEating(3);
        // Round 3: P4 eats alone
        expect(game.tryEat(4)).toBe(true);
        // All philosophers can eventually eat - no starvation in manifold
        expect(game.isEating(4)).toBe(true);
    });
});
