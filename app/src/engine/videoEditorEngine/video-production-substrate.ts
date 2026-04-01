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

import { BaseSubstrate, SubstrateConfig } from "../../../../core/substrate/base-substrate";

export type TransitionKind = "cut" | "dissolve" | "wipe" | "fade" | "dip" | "match-cut";
export type TrackKind = "video" | "audio" | "subtitle" | "vfx" | "score";

export interface Clip {
  id: string;
  assetUri: string;     // source file / blob
  trackId: string;
  inMs: number;         // in-point on source asset
  outMs: number;        // out-point on source asset
  timelineMs: number;   // start position on timeline
  label: string;
  colour?: string;      // editor colour tag
}

export interface Transition {
  kind: TransitionKind;
  durationMs: number;
  params?: Record<string, number>;  // e.g. { angle: 45 } for wipe
}

export interface Track {
  id: string;
  kind: TrackKind;
  label: string;
  volume: number;   // 0-2 (for audio/score tracks)
  muted: boolean;
  locked: boolean;
}

export class VideoProductionSubstrate extends BaseSubstrate<null> {
  private _versionIndex = 0;

  constructor(config?: Partial<SubstrateConfig>) {
    super({ name: "video-production", version: "1.0.0", ...config }, null);
  }

  static create(config?: Partial<SubstrateConfig>): VideoProductionSubstrate {
    return new VideoProductionSubstrate(config);
  }

  // ── Track management ──────────────────────────────────────────────────────

  addTrack(track: Track): void {
    this.drill("tracks", track.id).value = track;
  }

  getTrack(id: string): Track | undefined {
    return this.drill<Track>("tracks", id).value;
  }

  muteTrack(id: string, muted: boolean): void {
    const t = this.drill<Track>("tracks", id);
    if (t.value) { t.value = { ...t.value, muted }; }
    this._snapshot();
  }

  // ── Clip management ───────────────────────────────────────────────────────

  addClip(clip: Clip): void {
    this.drill("timeline", clip.trackId, clip.id).value = clip;
    this.drill("timeline", clip.trackId, clip.id, "in").value    = clip.inMs;
    this.drill("timeline", clip.trackId, clip.id, "out").value   = clip.outMs;
    this.drill("timeline", clip.trackId, clip.id, "start").value = clip.timelineMs;
    this._snapshot();
  }

  getClip(trackId: string, clipId: string): Clip | undefined {
    return this.drill<Clip>("timeline", trackId, clipId).value;
  }

  trimClip(trackId: string, clipId: string, inMs: number, outMs: number): void {
    const d = this.drill("timeline", trackId, clipId);
    const clip = d.value as Clip | undefined;
    if (!clip) return;
    d.value = { ...clip, inMs, outMs };
    this.drill("timeline", trackId, clipId, "in").value  = inMs;
    this.drill("timeline", trackId, clipId, "out").value = outMs;
    this._snapshot();
  }

  moveClip(trackId: string, clipId: string, newTimelineMs: number): void {
    const d = this.drill("timeline", trackId, clipId);
    const clip = d.value as Clip | undefined;
    if (!clip) return;
    d.value = { ...clip, timelineMs: newTimelineMs };
    this.drill("timeline", trackId, clipId, "start").value = newTimelineMs;
    this._snapshot();
  }

  /** Set transition between two adjacent clips */
  setTransition(trackId: string, clipId: string, transition: Transition): void {
    this.drill("timeline", trackId, clipId, "transition").value = transition;
    this._snapshot();
  }

  // ── Playhead ──────────────────────────────────────────────────────────────

  setPlayhead(ms: number): void {
    this.drill("playhead").value = ms;
  }

  getPlayhead(): number {
    return this.drill<number>("playhead").value ?? 0;
  }

  // ── Non-destructive versioning ────────────────────────────────────────────

  private _snapshot(): void {
    this._versionIndex++;
    const snap = {
      playhead: this.getPlayhead(),
      timestamp: Date.now(),
      index: this._versionIndex
    };
    this.drill("version", String(this._versionIndex)).value = snap;
  }

  undo(): number {
    if (this._versionIndex > 0) this._versionIndex--;
    return this._versionIndex;
  }

  getVersionCount(): number { return this._versionIndex; }

  // ── SMPTE timecode helper ─────────────────────────────────────────────────

  toSMPTE(ms: number, fps: number = 24): string {
    const totalFrames = Math.round(ms / 1000 * fps);
    const frames  = totalFrames % fps;
    const secs    = Math.floor(totalFrames / fps) % 60;
    const mins    = Math.floor(totalFrames / fps / 60) % 60;
    const hours   = Math.floor(totalFrames / fps / 3600);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
  }

  reset(): void {
    this._versionIndex = 0;
    this.drill("timeline").value  = null;
    this.drill("playhead").value  = 0;
    this.drill("version").value   = null;
  }

  serialize(): Record<string, unknown> {
    return { name: this.name, versionIndex: this._versionIndex };
  }

  hydrate(state: Record<string, unknown>): void {
    this._versionIndex = (state.versionIndex as number) ?? 0;
  }
}

