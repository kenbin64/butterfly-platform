/**
 * ScoreSubstrate  —  Original Score & Theme Generation
 * =====================================================
 * STANDALONE — depends only on core primitives.
 *
 * Capabilities:
 *   • Mood-driven theme generation (maps scene mood → musical parameters)
 *   • Character leitmotifs        (unique melodic motif per character)
 *   • Orchestration profiles      (strings, brass, electronics, hybrid)
 *   • Tempo sync to edit rhythm   (BPM locks to cut density)
 *   • Music ducking               (auto-lower score under dialogue)
 *   • Stem export structure       (melody, harmony, rhythm, bass, fx)
 *
 * Coordinate space:
 *   drill("themes",   "<sceneId>")          → SceneTheme
 *   drill("leitmotif","<charId>")           → CharacterMotif
 *   drill("stems",    "<sceneId>","<stem>") → StemData
 *   drill("tempo",    "<sceneId>")          → TempoMap
 *   drill("duck",     "<sceneId>","<ms>")   → DuckEvent
 */

import { BaseSubstrate, SubstrateConfig } from "../../../../core/substrate/base-substrate";
import type { SceneMood } from "../../../../core/substrate/media-substrate";

// ── Music types ──────────────────────────────────────────────────────────────

export type MusicalKey  = "C"|"G"|"D"|"A"|"E"|"B"|"F#"|"Db"|"Ab"|"Eb"|"Bb"|"F";
export type Mode        = "major"|"minor"|"dorian"|"phrygian"|"lydian"|"mixolydian"|"locrian";
export type Stem        = "melody"|"harmony"|"rhythm"|"bass"|"fx"|"ambient";
export type Instrument  =
  | "strings"|"brass"|"woodwind"|"piano"|"guitar"|"synth"
  | "choir"|"percussion"|"bass"|"pad"|"arp"|"fx";

export interface SceneTheme {
  sceneId: string;
  mood: SceneMood;
  key: MusicalKey;
  mode: Mode;
  bpm: number;
  timeSignature: [number, number];
  orchestration: Instrument[];
  dynamicLevel: number;  // 0-1  (ppp→fff)
  notes: string;
}

export interface CharacterMotif {
  charId: string;
  name: string;
  intervals: number[];   // semitone intervals from root, e.g. [0,3,7] = minor triad
  rhythm: number[];      // note durations in beats, e.g. [0.5, 0.5, 1]
  instrument: Instrument;
  key: MusicalKey;
}

export interface StemData {
  stem: Stem;
  volumeDb: number;
  panned: number;     // -1 to +1
  events: Array<{ startBeat: number; durationBeats: number; noteHz: number; velocity: number }>;
}

export interface TempoMap {
  sceneId: string;
  bpm: number;
  cutDensity: number;   // cuts per minute
  syncedToCuts: boolean;
}

export interface DuckEvent {
  startMs: number;
  endMs: number;
  duckDb: number;     // negative dB reduction, e.g. -12
  fadeInMs: number;
  fadeOutMs: number;
}

// ── Mood → musical parameter presets ────────────────────────────────────────

const MOOD_PRESETS: Record<SceneMood, Partial<SceneTheme>> = {
  neutral:    { key:"C",  mode:"major",      bpm:88,  orchestration:["strings","piano"],         dynamicLevel:0.4 },
  tense:      { key:"Eb", mode:"phrygian",   bpm:132, orchestration:["strings","brass","percussion"], dynamicLevel:0.8 },
  joyful:     { key:"G",  mode:"major",      bpm:120, orchestration:["strings","woodwind","piano"],   dynamicLevel:0.7 },
  melancholy: { key:"D",  mode:"minor",      bpm:60,  orchestration:["strings","piano","pad"],    dynamicLevel:0.35 },
  action:     { key:"A",  mode:"dorian",     bpm:160, orchestration:["brass","percussion","synth"],   dynamicLevel:1.0 },
  romantic:   { key:"F",  mode:"lydian",     bpm:72,  orchestration:["strings","piano","choir"],  dynamicLevel:0.55 },
  horror:     { key:"Ab", mode:"locrian",    bpm:50,  orchestration:["strings","synth","pad","fx"],  dynamicLevel:0.65 },
  comedic:    { key:"C",  mode:"mixolydian", bpm:140, orchestration:["woodwind","guitar","piano"],dynamicLevel:0.6 },
  epic:       { key:"E",  mode:"minor",      bpm:104, orchestration:["strings","brass","choir","percussion"], dynamicLevel:0.95 },
};

// ── ScoreSubstrate ────────────────────────────────────────────────────────────

export class ScoreSubstrate extends BaseSubstrate<null> {

  constructor(config?: Partial<SubstrateConfig>) {
    super({ name: "score", version: "1.0.0", ...config }, null);
  }

  static create(config?: Partial<SubstrateConfig>): ScoreSubstrate {
    return new ScoreSubstrate(config);
  }

  // ── Theme generation ──────────────────────────────────────────────────────

  generateTheme(sceneId: string, mood: SceneMood, overrides: Partial<SceneTheme> = {}): SceneTheme {
    const preset = MOOD_PRESETS[mood] ?? MOOD_PRESETS.neutral;
    const theme: SceneTheme = {
      sceneId,
      mood,
      key:            (overrides.key            ?? preset.key            ?? "C") as MusicalKey,
      mode:           (overrides.mode           ?? preset.mode           ?? "major") as Mode,
      bpm:             overrides.bpm            ?? preset.bpm            ?? 100,
      timeSignature:   overrides.timeSignature  ?? [4, 4],
      orchestration:   overrides.orchestration  ?? preset.orchestration  ?? ["strings"],
      dynamicLevel:    overrides.dynamicLevel   ?? preset.dynamicLevel   ?? 0.5,
      notes:           overrides.notes          ?? "",
    };
    this.drill<SceneTheme>("themes", sceneId).value = theme;
    return theme;
  }

  getTheme(sceneId: string): SceneTheme | undefined {
    return this.drill<SceneTheme>("themes", sceneId).value;
  }

  // ── Character leitmotifs ──────────────────────────────────────────────────

  setLeitmotif(motif: CharacterMotif): void {
    this.drill<CharacterMotif>("leitmotif", motif.charId).value = motif;
  }

  getLeitmotif(charId: string): CharacterMotif | undefined {
    return this.drill<CharacterMotif>("leitmotif", charId).value;
  }

  // ── Stems ─────────────────────────────────────────────────────────────────

  setStem(sceneId: string, stemData: StemData): void {
    this.drill<StemData>("stems", sceneId, stemData.stem).value = stemData;
  }

  getStem(sceneId: string, stem: Stem): StemData | undefined {
    return this.drill<StemData>("stems", sceneId, stem).value;
  }

  // ── Tempo mapping ─────────────────────────────────────────────────────────

  syncTempToCuts(sceneId: string, cutsPerMinute: number, bpmOverride?: number): TempoMap {
    // Lock BPM to cut rhythm: 1 cut = 1 bar → BPM = cuts/min × 4 (4/4 time)
    const bpm = bpmOverride ?? Math.max(40, Math.min(200, cutsPerMinute * 4));
    const tempoMap: TempoMap = {
      sceneId, bpm, cutDensity: cutsPerMinute, syncedToCuts: !bpmOverride
    };
    this.drill<TempoMap>("tempo", sceneId).value = tempoMap;
    return tempoMap;
  }

  // ── Music ducking ─────────────────────────────────────────────────────────

  addDuckEvent(sceneId: string, event: DuckEvent): void {
    this.drill<DuckEvent>("duck", sceneId, String(event.startMs)).value = event;
  }

  getDuckEvents(sceneId: string): DuckEvent[] {
    return this.drill("duck", sceneId).match(/.*/).map(d => d.value as DuckEvent).filter(Boolean);
  }

  // ── BaseSubstrate contract ────────────────────────────────────────────────

  reset(): void {
    this.drill("themes").value   = null;
    this.drill("leitmotif").value = null;
    this.drill("stems").value    = null;
    this.drill("tempo").value    = null;
    this.drill("duck").value     = null;
  }

  serialize(): Record<string, unknown> { return { name: this.name }; }
  hydrate(_state: unknown): void { /* reconstruct from scene data */ }
}

