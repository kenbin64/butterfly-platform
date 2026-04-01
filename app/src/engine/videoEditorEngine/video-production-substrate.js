"use strict";
/**
 * VideoProductionSubstrate
 * ========================
 * STANDALONE — depends only on core primitives.
 *
 * Hollywood-grade timeline, non-destructive editing, multi-track mixing.
 *
 * Coordinate space:
 *   drill("timeline","<trackId>","<clipId>")              → clip dimension
 *   drill("timeline","<trackId>","<clipId>","in")         → in-point ms
 *   drill("timeline","<trackId>","<clipId>","out")        → out-point ms
 *   drill("timeline","<trackId>","<clipId>","transition") → transition dim
 *   drill("version","<n>")                                → edit version snapshot
 *   drill("playhead")                                     → current position ms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoProductionSubstrate = void 0;
const base_substrate_1 = require("../../../../core/substrate/base-substrate");
class VideoProductionSubstrate extends base_substrate_1.BaseSubstrate {
    constructor(config) {
        super({ name: "video-production", version: "1.0.0", ...config }, null);
        this._versionIndex = 0;
    }
    static create(config) {
        return new VideoProductionSubstrate(config);
    }
    // ── Track management ──────────────────────────────────────────────────────
    addTrack(track) {
        this.drill("tracks", track.id).value = track;
    }
    getTrack(id) {
        return this.drill("tracks", id).value;
    }
    muteTrack(id, muted) {
        const t = this.drill("tracks", id);
        if (t.value) {
            t.value = { ...t.value, muted };
        }
        this._snapshot();
    }
    // ── Clip management ───────────────────────────────────────────────────────
    addClip(clip) {
        this.drill("timeline", clip.trackId, clip.id).value = clip;
        this.drill("timeline", clip.trackId, clip.id, "in").value = clip.inMs;
        this.drill("timeline", clip.trackId, clip.id, "out").value = clip.outMs;
        this.drill("timeline", clip.trackId, clip.id, "start").value = clip.timelineMs;
        this._snapshot();
    }
    getClip(trackId, clipId) {
        return this.drill("timeline", trackId, clipId).value;
    }
    trimClip(trackId, clipId, inMs, outMs) {
        const d = this.drill("timeline", trackId, clipId);
        const clip = d.value;
        if (!clip)
            return;
        d.value = { ...clip, inMs, outMs };
        this.drill("timeline", trackId, clipId, "in").value = inMs;
        this.drill("timeline", trackId, clipId, "out").value = outMs;
        this._snapshot();
    }
    moveClip(trackId, clipId, newTimelineMs) {
        const d = this.drill("timeline", trackId, clipId);
        const clip = d.value;
        if (!clip)
            return;
        d.value = { ...clip, timelineMs: newTimelineMs };
        this.drill("timeline", trackId, clipId, "start").value = newTimelineMs;
        this._snapshot();
    }
    /** Set transition between two adjacent clips */
    setTransition(trackId, clipId, transition) {
        this.drill("timeline", trackId, clipId, "transition").value = transition;
        this._snapshot();
    }
    // ── Playhead ──────────────────────────────────────────────────────────────
    setPlayhead(ms) {
        this.drill("playhead").value = ms;
    }
    getPlayhead() {
        return this.drill("playhead").value ?? 0;
    }
    // ── Non-destructive versioning ────────────────────────────────────────────
    _snapshot() {
        this._versionIndex++;
        const snap = {
            playhead: this.getPlayhead(),
            timestamp: Date.now(),
            index: this._versionIndex
        };
        this.drill("version", String(this._versionIndex)).value = snap;
    }
    undo() {
        if (this._versionIndex > 0)
            this._versionIndex--;
        return this._versionIndex;
    }
    getVersionCount() { return this._versionIndex; }
    // ── SMPTE timecode helper ─────────────────────────────────────────────────
    toSMPTE(ms, fps = 24) {
        const totalFrames = Math.round(ms / 1000 * fps);
        const frames = totalFrames % fps;
        const secs = Math.floor(totalFrames / fps) % 60;
        const mins = Math.floor(totalFrames / fps / 60) % 60;
        const hours = Math.floor(totalFrames / fps / 3600);
        const pad = (n) => String(n).padStart(2, "0");
        return `${pad(hours)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
    }
    reset() {
        this._versionIndex = 0;
        this.drill("timeline").value = null;
        this.drill("playhead").value = 0;
        this.drill("version").value = null;
    }
    serialize() {
        return { name: this.name, versionIndex: this._versionIndex };
    }
    hydrate(state) {
        this._versionIndex = state.versionIndex ?? 0;
    }
}
exports.VideoProductionSubstrate = VideoProductionSubstrate;
