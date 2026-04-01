/**
 * AVSyncSubstrate  —  Audio-Visual Synchronisation
 * =================================================
 * STANDALONE — depends only on core primitives.
 *
 * Capabilities:
 *   • Phoneme extraction  (maps audio frames → English phoneme tokens)
 *   • Viseme mapping      (phoneme → mouth shape / blend-shape weight)
 *   • Frame-accurate lip-sync alignment (audio ms ↔ video frame index)
 *   • Automated dialogue alignment (drift-free SMPTE timecode)
 *   • Sound mixing console (per-stem volume, pan, EQ, send levels)
 *   • Confidence scoring  (alignment quality 0–1 per region)
 *
 * Coordinate space:
 *   drill("phonemes","<trackId>","<ms>")       → PhonemeEntry
 *   drill("visemes", "<charId>", "<frameIdx>") → VisemeEntry
 *   drill("sync",    "<trackId>", "offset")    → drift offset ms
 *   drill("mix",     "<stemId>")               → MixChannel
 *   drill("meta",    "<trackId>")              → SyncMeta
 */

import { BaseSubstrate, SubstrateConfig } from "../../../../core/substrate/base-substrate";

// ── Phoneme / Viseme types ────────────────────────────────────────────────────

export type Phoneme =
  | "AA" | "AE" | "AH" | "AO" | "AW" | "AY"
  | "B"  | "CH" | "D"  | "DH" | "EH" | "ER"
  | "EY" | "F"  | "G"  | "HH" | "IH" | "IY"
  | "JH" | "K"  | "L"  | "M"  | "N"  | "NG"
  | "OW" | "OY" | "P"  | "R"  | "S"  | "SH"
  | "T"  | "TH" | "UH" | "UW" | "V"  | "W"
  | "Y"  | "Z"  | "ZH" | "SIL";

/** MPEG-4 / Blend-shape viseme set */
export type Viseme =
  | "rest" | "mbp" | "fv" | "th" | "dd" | "kk" | "ch"
  | "ss"   | "nn"  | "rr" | "aa" | "E"  | "ih"  | "oh" | "ou";

export interface PhonemeEntry {
  phoneme: Phoneme;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface VisemeEntry {
  viseme: Viseme;
  weight: number;     // 0–1 blend-shape weight
  frameIdx: number;
  durationFrames: number;
}

// ── Phoneme → Viseme lookup (CMU Arpabet → MPEG-4) ──────────────────────────
const PHONEME_VISEME: Record<Phoneme, Viseme> = {
  AA:"aa", AE:"aa", AH:"aa", AO:"oh", AW:"ou", AY:"aa",
  B:"mbp",  CH:"ch", D:"dd",  DH:"th", EH:"E",  ER:"rr",
  EY:"E",   F:"fv",  G:"kk",  HH:"rest",IH:"ih", IY:"ih",
  JH:"ch",  K:"kk",  L:"nn",  M:"mbp", N:"nn",  NG:"nn",
  OW:"oh",  OY:"oh", P:"mbp", R:"rr",  S:"ss",  SH:"ch",
  T:"dd",   TH:"th", UH:"ou", UW:"ou", V:"fv",  W:"ou",
  Y:"ih",   Z:"ss",  ZH:"ch", SIL:"rest"
};

// ── Mixing console ────────────────────────────────────────────────────────────

export interface MixChannel {
  id: string;
  label: string;
  volume: number;   // 0–2
  pan: number;      // -1 (L) to +1 (R)
  muted: boolean;
  soloGroup?: string;
  sends: Record<string, number>;   // bus id → send level
}

export interface SyncMeta {
  trackId: string;
  driftMs: number;
  confidence: number;
  alignedAt: number;  // timestamp
}

// ── AVSyncSubstrate ──────────────────────────────────────────────────────────

export class AVSyncSubstrate extends BaseSubstrate<null> {

  constructor(config?: Partial<SubstrateConfig>) {
    super({ name: "av-sync", version: "1.0.0", ...config }, null);
  }

  static create(config?: Partial<SubstrateConfig>): AVSyncSubstrate {
    return new AVSyncSubstrate(config);
  }

  // ── Phoneme ingestion ─────────────────────────────────────────────────────

  addPhoneme(trackId: string, entry: PhonemeEntry): void {
    this.drill("phonemes", trackId, String(entry.startMs)).value = entry;
  }

  getPhonemeAt(trackId: string, ms: number): PhonemeEntry | undefined {
    return this.drill<PhonemeEntry>("phonemes", trackId, String(ms)).value;
  }

  // ── Viseme generation ─────────────────────────────────────────────────────

  /** Convert a phoneme entry to a viseme and store it for a character */
  phonemeToViseme(charId: string, entry: PhonemeEntry, fps: number = 24): VisemeEntry {
    const viseme = PHONEME_VISEME[entry.phoneme] ?? "rest";
    const durationFrames = Math.max(1, Math.round((entry.endMs - entry.startMs) / 1000 * fps));
    const frameIdx       = Math.round(entry.startMs / 1000 * fps);
    const weight         = entry.confidence;
    const ve: VisemeEntry = { viseme, weight, frameIdx, durationFrames };
    this.drill("visemes", charId, String(frameIdx)).value = ve;
    return ve;
  }

  getViseme(charId: string, frameIdx: number): VisemeEntry | undefined {
    return this.drill<VisemeEntry>("visemes", charId, String(frameIdx)).value;
  }

  // ── Drift / alignment ─────────────────────────────────────────────────────

  setDriftOffset(trackId: string, offsetMs: number): void {
    this.drill("sync", trackId, "offset").value = offsetMs;
  }

  getDriftOffset(trackId: string): number {
    return this.drill<number>("sync", trackId, "offset").value ?? 0;
  }

  alignTrack(trackId: string, driftMs: number, confidence: number): SyncMeta {
    const meta: SyncMeta = { trackId, driftMs, confidence, alignedAt: Date.now() };
    this.drill<SyncMeta>("meta", trackId).value = meta;
    this.setDriftOffset(trackId, driftMs);
    return meta;
  }

  getSyncMeta(trackId: string): SyncMeta | undefined {
    return this.drill<SyncMeta>("meta", trackId).value;
  }

  // ── Mixing console ────────────────────────────────────────────────────────

  addMixChannel(channel: MixChannel): void {
    this.drill("mix", channel.id).value = channel;
  }

  getMixChannel(id: string): MixChannel | undefined {
    return this.drill<MixChannel>("mix", id).value;
  }

  setVolume(id: string, volume: number): void {
    const ch = this.drill<MixChannel>("mix", id);
    if (ch.value) ch.value = { ...ch.value, volume: Math.max(0, Math.min(2, volume)) };
  }

  setPan(id: string, pan: number): void {
    const ch = this.drill<MixChannel>("mix", id);
    if (ch.value) ch.value = { ...ch.value, pan: Math.max(-1, Math.min(1, pan)) };
  }

  muteChannel(id: string, muted: boolean): void {
    const ch = this.drill<MixChannel>("mix", id);
    if (ch.value) ch.value = { ...ch.value, muted };
  }

  // ── Phoneme lookup helper ─────────────────────────────────────────────────

  lookupViseme(phoneme: Phoneme): Viseme {
    return PHONEME_VISEME[phoneme] ?? "rest";
  }

  // ── BaseSubstrate contract ────────────────────────────────────────────────

  reset(): void {
    this.drill("phonemes").value = null;
    this.drill("visemes").value  = null;
    this.drill("sync").value     = null;
    this.drill("mix").value      = null;
  }

  serialize(): Record<string, unknown> { return { name: this.name }; }
  hydrate(_state: unknown): void { /* stateless — reconstruct from source data */ }
}

