"use strict";
// app/src/engine/audeoEngine/audio-substrate.ts
// Manifold-based audio/DAW substrate
// Drill to tracks, samples, effects - integrate with DAW
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioSubstrate = void 0;
const base_substrate_1 = require("../../../../core/substrate/base-substrate");
const DEFAULT_CONFIG = {
    name: "audio",
    version: "1.0.0",
    tickRate: 44100 // Sample rate as tick rate for audio
};
/**
 * AudioSubstrate
 * --------------
 * Manifold-based DAW/audio engine.
 *
 * Coordinates:
 *   drill("master", "bpm")                → number
 *   drill("tracks", "drums", "volume")    → number (0-1)
 *   drill("tracks", "drums", "samples")   → samples dimension
 *   drill("tracks", "drums", "samples", "kick_01", "gain") → number
 *   drill("effects", "reverb_1", "wet")   → number
 *
 * Pattern matching for samples:
 *   drill("tracks", "drums", "samples").match(/^kick_/)
 */
class AudioSubstrate extends base_substrate_1.SimulationSubstrate {
    constructor(config) {
        super({ ...DEFAULT_CONFIG, ...config }, {
            bpm: 120,
            timeSignature: [4, 4],
            currentTime: 0,
            playing: false,
            tracks: {}
        });
        // Initialize master coordinates
        this.drill("master", "bpm").value = 120;
        this.drill("master", "timeSignature").value = [4, 4];
        this.drill("master", "volume").value = 1;
    }
    /** Create audio substrate */
    static create(config) {
        return new AudioSubstrate(config);
    }
    /** Add a track */
    addTrack(id, config) {
        const track = this.drill("tracks", id);
        track.drill("name").value = config?.name ?? id;
        track.drill("volume").value = config?.volume ?? 1;
        track.drill("muted").value = config?.muted ?? false;
        track.drill("solo").value = config?.solo ?? false;
        track.drill("effects").value = config?.effects ?? [];
        return track;
    }
    /** Get track by ID - O(1) */
    track(id) {
        return this.drill("tracks", id);
    }
    /** Add sample to track */
    addSample(trackId, sample) {
        const s = this.drill("tracks", trackId, "samples", sample.id);
        s.drill("duration").value = sample.duration;
        s.drill("sampleRate").value = sample.sampleRate;
        s.drill("channels").value = sample.channels;
        s.drill("gain").value = sample.gain;
        s.drill("pan").value = sample.pan;
        s.drill("startTime").value = sample.startTime;
        return s;
    }
    /** Find samples matching pattern */
    findSamples(trackId, pattern) {
        return this.drill("tracks", trackId, "samples").match(pattern);
    }
    /** Set BPM */
    setBpm(bpm) {
        this.drill("master", "bpm").value = bpm;
    }
    /** Get current BPM */
    get bpm() {
        return this.drill("master", "bpm").value || 120;
    }
    /** Add effect to chain */
    addEffect(id, type, params) {
        const fx = this.drill("effects", id);
        fx.drill("type").value = type;
        for (const [key, value] of Object.entries(params)) {
            fx.drill("params", key).value = value;
        }
        return fx;
    }
    /** Connect effect to track */
    connectEffect(trackId, effectId) {
        const effects = this.track(trackId).drill("effects").value || [];
        this.track(trackId).drill("effects").value = [...effects, effectId];
    }
    /** Tick - advance playhead */
    tick(dt) {
        if (!this._running)
            return;
        const current = this.drill("master", "currentTime").value || 0;
        this.drill("master", "currentTime").value = current + dt;
    }
    /** Reset to start */
    reset() {
        this.drill("master", "currentTime").value = 0;
        this.stop();
    }
    /** Serialize state */
    serialize() {
        return {
            bpm: this.bpm,
            timeSignature: this.drill("master", "timeSignature").value || [4, 4],
            currentTime: this.drill("master", "currentTime").value || 0,
            playing: this._running,
            tracks: {} // Would need to serialize all tracks
        };
    }
    /** Hydrate from state */
    hydrate(state) {
        this.setBpm(state.bpm);
        this.drill("master", "timeSignature").value = state.timeSignature;
        this.drill("master", "currentTime").value = state.currentTime;
    }
}
exports.AudioSubstrate = AudioSubstrate;
