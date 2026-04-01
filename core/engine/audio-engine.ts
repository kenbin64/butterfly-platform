// core/engine/audio-engine.ts
// ================================================================
//  AUDIO ENGINE — 1D Linear
// ================================================================
//
// Operates on ILinearSubstrate instances (waveforms/tracks).
// Each track is a linear — a finite set of point addresses (samples).
// Playhead advances through the set. BPM, volume, mixing via z-invocation.
//
// Loose coupling: receives tracks via add/remove. No cross-engine deps.

import {
  type IEngine, type EngineStats,
  EngineState,
} from "./engine-interface";

import { type ILinearSubstrate } from "../substrate/substrate-interface";
import { LinearSubstrate, PointSubstrate } from "../substrate/dimensional-substrate";

// ─── Audio Config ───────────────────────────────────────────────────────────

export interface AudioConfig {
  bpm: number;
  sampleRate: number;
  masterVolume: number;
}

const DEFAULT_CONFIG: AudioConfig = {
  bpm: 120,
  sampleRate: 44100,
  masterVolume: 1.0,
};

// ─── Track ──────────────────────────────────────────────────────────────────

interface Track {
  name: string;
  waveform: ILinearSubstrate;
  volume: PointSubstrate;
  pan: PointSubstrate;
  muted: boolean;
}

// ─── AudioEngine ────────────────────────────────────────────────────────────

export class AudioEngine implements IEngine {
  readonly name = "audio";
  private _state: EngineState = EngineState.Idle;
  private _config: AudioConfig;
  private _tracks: Map<string, Track> = new Map();
  private _playhead: PointSubstrate;
  private _masterVolume: PointSubstrate;
  private _tickCount = 0;
  private _totalTime = 0;
  private _lastTickDuration = 0;

  constructor(config?: Partial<AudioConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._playhead = new PointSubstrate("playhead", 0);
    this._masterVolume = new PointSubstrate("masterVolume", this._config.masterVolume);
  }

  get state(): EngineState { return this._state; }

  /** Current playhead position (seconds). */
  get playhead(): number { return this._playhead.value; }

  /** Master volume [0..1]. */
  get masterVolume(): number { return this._masterVolume.value; }
  set masterVolume(v: number) { this._masterVolume.setPath("value", Math.max(0, Math.min(1, v))); }

  /** BPM. */
  get bpm(): number { return this._config.bpm; }
  set bpm(b: number) { this._config.bpm = b; }

  /** Number of tracks. */
  get trackCount(): number { return this._tracks.size; }

  /**
   * Add a track (a linear waveform).
   * If no waveform is provided, creates an empty one.
   */
  addTrack(name: string, waveform?: LinearSubstrate, volume = 1.0, pan = 0): void {
    this._tracks.set(name, {
      name,
      waveform: waveform ?? new LinearSubstrate(`track:${name}`),
      volume: new PointSubstrate(`${name}:vol`, volume),
      pan: new PointSubstrate(`${name}:pan`, pan),
      muted: false,
    });
  }

  /** Remove a track by name. */
  removeTrack(name: string): boolean {
    return this._tracks.delete(name);
  }

  /** Get track names (finite set). */
  trackNames(): string[] {
    return Array.from(this._tracks.keys());
  }

  /** Evaluate a sample from a track at a given index. */
  sample(trackName: string, index: number): number {
    const track = this._tracks.get(trackName);
    if (!track) return 0;
    const raw = track.waveform.evaluateAt(index);
    const vol = track.volume.value;
    const master = this._masterVolume.value;
    return raw * vol * master;
  }

  /** Mix all tracks at the current playhead sample index. */
  mix(sampleIndex: number): number {
    let sum = 0;
    // Loop over finite set of tracks — not a dimension.
    for (const [, track] of this._tracks) {
      if (track.muted) continue;
      const raw = track.waveform.evaluateAt(sampleIndex);
      sum += raw * track.volume.value;
    }
    return sum * this._masterVolume.value;
  }

  /** Mute/unmute a track. */
  setMuted(name: string, muted: boolean): void {
    const track = this._tracks.get(name);
    if (track) track.muted = muted;
  }

  /**
   * Tick — advance playhead by dt seconds.
   * Playhead is a point on the manifold.
   */
  tick(dt: number): void {
    if (this._state !== EngineState.Running) return;
    const t0 = performance.now();

    // Advance playhead (z-invocation: discover new path for updated time)
    const current = this._playhead.value;
    this._playhead.setPath("value", current + dt);

    this._lastTickDuration = performance.now() - t0;
    this._tickCount++;
    this._totalTime += dt;
  }

  start(): void { this._state = EngineState.Running; }
  stop(): void { this._state = EngineState.Stopped; }
  pause(): void { this._state = EngineState.Paused; }
  resume(): void { this._state = EngineState.Running; }

  reset(): void {
    this._state = EngineState.Idle;
    this._playhead.setPath("value", 0);
    this._tickCount = 0;
    this._totalTime = 0;
    this._lastTickDuration = 0;
  }

  serialize(): unknown {
    const tracks: Record<string, unknown> = {};
    for (const [name, track] of this._tracks) {
      tracks[name] = {
        waveform: track.waveform.serialize(),
        volume: track.volume.value,
        pan: track.pan.value,
        muted: track.muted,
      };
    }
    return { config: this._config, playhead: this._playhead.value, tracks };
  }

  hydrate(state: any): void {
    if (state.config) this._config = { ...DEFAULT_CONFIG, ...state.config };
    if (state.playhead != null) this._playhead.setPath("value", state.playhead);
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
}

