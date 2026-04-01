"use strict";
/**
 * VideoEditorEngine  —  Hollywood-grade Video Editor
 * ====================================================
 * STANDALONE — works with zero external engines.
 * OPTIONAL integration: pass a MediaSubstrate registry for cross-engine
 *                       coordination (scene mood → score, etc.)
 *
 * Orchestrates all video substrates:
 *   • VideoProductionSubstrate  — timeline, clips, cuts, versioned edits
 *   • AVSyncSubstrate           — lip-sync, sound mixing, dialogue alignment
 *   • ScoreSubstrate            — original score, mood-driven orchestration
 *   • StorySubstrate            — script, shot list, storyboard
 *
 * All substrates remain independently accessible for custom pipelines.
 * No substrate requires any other substrate — all wiring is here only.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoEditorEngine = void 0;
const video_production_substrate_1 = require("./videoEditorEngine/video-production-substrate");
const av_sync_substrate_1 = require("./videoEditorEngine/av-sync-substrate");
const score_substrate_1 = require("./videoEditorEngine/score-substrate");
const story_substrate_1 = require("./videoEditorEngine/story-substrate");
class VideoEditorEngine {
    constructor(config = {}) {
        this._fps = config.fps ?? 24;
        this._registry = config.registry;
        this.timeline = video_production_substrate_1.VideoProductionSubstrate.create();
        this.avSync = av_sync_substrate_1.AVSyncSubstrate.create();
        this.score = score_substrate_1.ScoreSubstrate.create();
        this.story = story_substrate_1.StorySubstrate.create();
        // Optionally self-register — no throw if registry absent
        if (this._registry) {
            this._registry.registerEngine("videoEditor", this);
        }
    }
    static create(config) {
        return new VideoEditorEngine(config);
    }
    // ── Timeline ──────────────────────────────────────────────────────────────
    addTrack(track) { this.timeline.addTrack(track); }
    addClip(clip) {
        this.timeline.addClip(clip);
        if (this._registry) {
            this._registry.emit("video:clipAdded", { clipId: clip.id, trackId: clip.trackId });
        }
    }
    cut(trackId, clipId, atMs) {
        const clip = this.timeline.getClip(trackId, clipId);
        if (!clip)
            return;
        // Non-destructive: trim in-point of existing clip, create new clip for tail
        const tailClip = {
            ...clip,
            id: `${clipId}_tail`,
            inMs: clip.inMs + (atMs - clip.timelineMs),
            timelineMs: atMs,
        };
        this.timeline.trimClip(trackId, clipId, clip.inMs, clip.inMs + (atMs - clip.timelineMs));
        this.timeline.addClip(tailClip);
    }
    setTransition(trackId, clipId, t) {
        this.timeline.setTransition(trackId, clipId, t);
    }
    // ── Audio-Visual Sync ────────────────────────────────────────────────────
    addPhoneme(trackId, entry) {
        this.avSync.addPhoneme(trackId, entry);
    }
    alignDialogue(trackId, audioOffsetMs) {
        this.avSync.setDriftOffset(trackId, audioOffsetMs);
    }
    addMixChannel(channel) {
        this.avSync.addMixChannel(channel);
    }
    // ── Score ─────────────────────────────────────────────────────────────────
    setSceneMood(sceneId, mood) {
        // generateTheme materialises the theme dimension for this scene + mood
        this.score.generateTheme(sceneId, mood);
        if (this._registry) {
            this._registry.emit("score:moodSet", { sceneId, mood });
        }
    }
    /** Attach a character leitmotif by theme id — seeded into the score substrate */
    assignTheme(characterId, themeId) {
        this.score.setLeitmotif({
            charId: characterId,
            name: themeId,
            intervals: [0, 4, 7], // minor triad seed — drill to override any interval
            rhythm: [1],
            instrument: "strings",
            key: "C",
        });
    }
    // ── Story ──────────────────────────────────────────────────────────────────
    addBeat(beat) { this.story.addBeat(beat); }
    addShot(shot) { this.story.addShot(shot); }
    addPanel(panel) { this.story.addPanel(panel); }
    setSceneMeta(meta) { this.story.setSceneMeta(meta); }
    // ── SMPTE helper (delegated) ───────────────────────────────────────────────
    toSMPTE(ms) { return this.timeline.toSMPTE(ms, this._fps); }
    // ── Non-destructive history ────────────────────────────────────────────────
    undo() { this.timeline.undo(); }
    get versionCount() { return this.timeline.getVersionCount(); }
    // ── Diagnostics ───────────────────────────────────────────────────────────
    diagnostics() {
        return {
            fps: this._fps,
            playhead: this.timeline.getPlayhead(),
            smpte: this.toSMPTE(this.timeline.getPlayhead()),
            versions: this.versionCount,
            hasMIA: !!this._registry,
        };
    }
    reset() {
        this.timeline.reset();
        this.avSync.reset();
        this.score.reset();
        this.story.reset();
    }
}
exports.VideoEditorEngine = VideoEditorEngine;
