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

import { VideoProductionSubstrate, Clip, Track, Transition }
  from "./videoEditorEngine/video-production-substrate";
import { AVSyncSubstrate, PhonemeEntry, MixChannel }
  from "./videoEditorEngine/av-sync-substrate";
import { ScoreSubstrate }
  from "./videoEditorEngine/score-substrate";
import { StorySubstrate, ScriptBeat, Shot, StoryPanel, SceneMeta }
  from "./videoEditorEngine/story-substrate";

// Optional registry — import type only so the engine stays standalone
import type { MediaSubstrate, SceneMood } from "../../../core/substrate/media-substrate";

export interface VideoEditorConfig {
  fps?: number;                   // default 24
  registry?: MediaSubstrate;      // optional MIA connector
}

export class VideoEditorEngine {
  readonly timeline:  VideoProductionSubstrate;
  readonly avSync:    AVSyncSubstrate;
  readonly score:     ScoreSubstrate;
  readonly story:     StorySubstrate;

  private _fps: number;
  private _registry?: MediaSubstrate;

  constructor(config: VideoEditorConfig = {}) {
    this._fps      = config.fps ?? 24;
    this._registry = config.registry;

    this.timeline = VideoProductionSubstrate.create();
    this.avSync   = AVSyncSubstrate.create();
    this.score    = ScoreSubstrate.create();
    this.story    = StorySubstrate.create();

    // Optionally self-register — no throw if registry absent
    if (this._registry) {
      this._registry.registerEngine("videoEditor", this);
    }
  }

  static create(config?: VideoEditorConfig): VideoEditorEngine {
    return new VideoEditorEngine(config);
  }

  // ── Timeline ──────────────────────────────────────────────────────────────

  addTrack(track: Track): void { this.timeline.addTrack(track); }

  addClip(clip: Clip): void {
    this.timeline.addClip(clip);
    if (this._registry) {
      this._registry.emit("video:clipAdded", { clipId: clip.id, trackId: clip.trackId });
    }
  }

  cut(trackId: string, clipId: string, atMs: number): void {
    const clip = this.timeline.getClip(trackId, clipId);
    if (!clip) return;
    // Non-destructive: trim in-point of existing clip, create new clip for tail
    const tailClip: Clip = {
      ...clip,
      id: `${clipId}_tail`,
      inMs: clip.inMs + (atMs - clip.timelineMs),
      timelineMs: atMs,
    };
    this.timeline.trimClip(trackId, clipId, clip.inMs, clip.inMs + (atMs - clip.timelineMs));
    this.timeline.addClip(tailClip);
  }

  setTransition(trackId: string, clipId: string, t: Transition): void {
    this.timeline.setTransition(trackId, clipId, t);
  }

  // ── Audio-Visual Sync ────────────────────────────────────────────────────

  addPhoneme(trackId: string, entry: PhonemeEntry): void {
    this.avSync.addPhoneme(trackId, entry);
  }

  alignDialogue(trackId: string, audioOffsetMs: number): void {
    this.avSync.setDriftOffset(trackId, audioOffsetMs);
  }

  addMixChannel(channel: MixChannel): void {
    this.avSync.addMixChannel(channel);
  }

  // ── Score ─────────────────────────────────────────────────────────────────

  setSceneMood(sceneId: string, mood: SceneMood): void {
    // generateTheme materialises the theme dimension for this scene + mood
    this.score.generateTheme(sceneId, mood);
    if (this._registry) {
      this._registry.emit("score:moodSet", { sceneId, mood });
    }
  }

  /** Attach a character leitmotif by theme id — seeded into the score substrate */
  assignTheme(characterId: string, themeId: string): void {
    this.score.setLeitmotif({
      charId: characterId,
      name: themeId,
      intervals: [0, 4, 7],   // minor triad seed — drill to override any interval
      rhythm: [1],
      instrument: "strings",
      key: "C",
    });
  }

  // ── Story ──────────────────────────────────────────────────────────────────

  addBeat(beat: ScriptBeat): void       { this.story.addBeat(beat); }
  addShot(shot: Shot): void             { this.story.addShot(shot); }
  addPanel(panel: StoryPanel): void     { this.story.addPanel(panel); }
  setSceneMeta(meta: SceneMeta): void   { this.story.setSceneMeta(meta); }

  // ── SMPTE helper (delegated) ───────────────────────────────────────────────

  toSMPTE(ms: number): string { return this.timeline.toSMPTE(ms, this._fps); }

  // ── Non-destructive history ────────────────────────────────────────────────

  undo(): void { this.timeline.undo(); }

  get versionCount(): number { return this.timeline.getVersionCount(); }

  // ── Diagnostics ───────────────────────────────────────────────────────────

  diagnostics(): Record<string, unknown> {
    return {
      fps: this._fps,
      playhead: this.timeline.getPlayhead(),
      smpte: this.toSMPTE(this.timeline.getPlayhead()),
      versions: this.versionCount,
      hasMIA: !!this._registry,
    };
  }

  reset(): void {
    this.timeline.reset();
    this.avSync.reset();
    this.score.reset();
    this.story.reset();
  }
}

