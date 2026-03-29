// app/src/engine/audeoEngine/audio-substrate.ts
// Manifold-based audio/DAW substrate
// Drill to tracks, samples, effects - integrate with DAW

import { SimulationSubstrate, SubstrateConfig } from "../../../../core/substrate/base-substrate";
import { Dimension } from "../../../../core/dimensional/dimension";

/** Audio sample data */
export interface AudioSample {
  id: string;
  duration: number;      // seconds
  sampleRate: number;
  channels: number;
  gain: number;          // 0-1
  pan: number;           // -1 (left) to 1 (right)
  startTime: number;     // position in track
}

/** Track configuration */
export interface TrackConfig {
  name: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  effects: string[];
}

/** Audio state shape */
interface AudioState {
  bpm: number;
  timeSignature: [number, number];
  currentTime: number;
  playing: boolean;
  tracks: Record<string, TrackConfig>;
}

const DEFAULT_CONFIG: SubstrateConfig = {
  name: "audio",
  version: "1.0.0",
  tickRate: 44100  // Sample rate as tick rate for audio
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
export class AudioSubstrate extends SimulationSubstrate<AudioState> {
  
  constructor(config?: Partial<SubstrateConfig>) {
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
  static create(config?: Partial<SubstrateConfig>): AudioSubstrate {
    return new AudioSubstrate(config);
  }

  /** Add a track */
  addTrack(id: string, config?: Partial<TrackConfig>): Dimension {
    const track = this.drill("tracks", id);
    track.drill("name").value = config?.name ?? id;
    track.drill("volume").value = config?.volume ?? 1;
    track.drill("muted").value = config?.muted ?? false;
    track.drill("solo").value = config?.solo ?? false;
    track.drill("effects").value = config?.effects ?? [];
    return track;
  }

  /** Get track by ID - O(1) */
  track(id: string): Dimension {
    return this.drill("tracks", id);
  }

  /** Add sample to track */
  addSample(trackId: string, sample: AudioSample): Dimension {
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
  findSamples(trackId: string, pattern: RegExp): Dimension[] {
    return this.drill("tracks", trackId, "samples").match(pattern);
  }

  /** Set BPM */
  setBpm(bpm: number): void {
    this.drill("master", "bpm").value = bpm;
  }

  /** Get current BPM */
  get bpm(): number {
    return this.drill<number>("master", "bpm").value || 120;
  }

  /** Add effect to chain */
  addEffect(id: string, type: string, params: Record<string, number>): Dimension {
    const fx = this.drill("effects", id);
    fx.drill("type").value = type;
    for (const [key, value] of Object.entries(params)) {
      fx.drill("params", key).value = value;
    }
    return fx;
  }

  /** Connect effect to track */
  connectEffect(trackId: string, effectId: string): void {
    const effects = this.track(trackId).drill<string[]>("effects").value || [];
    this.track(trackId).drill("effects").value = [...effects, effectId];
  }

  /** Tick - advance playhead */
  tick(dt: number): void {
    if (!this._running) return;
    
    const current = this.drill<number>("master", "currentTime").value || 0;
    this.drill("master", "currentTime").value = current + dt;
  }

  /** Reset to start */
  reset(): void {
    this.drill("master", "currentTime").value = 0;
    this.stop();
  }

  /** Serialize state */
  serialize(): AudioState {
    return {
      bpm: this.bpm,
      timeSignature: this.drill<[number, number]>("master", "timeSignature").value || [4, 4],
      currentTime: this.drill<number>("master", "currentTime").value || 0,
      playing: this._running,
      tracks: {}  // Would need to serialize all tracks
    };
  }

  /** Hydrate from state */
  hydrate(state: AudioState): void {
    this.setBpm(state.bpm);
    this.drill("master", "timeSignature").value = state.timeSignature;
    this.drill("master", "currentTime").value = state.currentTime;
  }
}

