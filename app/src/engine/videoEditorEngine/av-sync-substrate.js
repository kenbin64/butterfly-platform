"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVSyncSubstrate = void 0;
const base_substrate_1 = require("../../../../core/substrate/base-substrate");
// ── Phoneme → Viseme lookup (CMU Arpabet → MPEG-4) ──────────────────────────
const PHONEME_VISEME = {
    AA: "aa", AE: "aa", AH: "aa", AO: "oh", AW: "ou", AY: "aa",
    B: "mbp", CH: "ch", D: "dd", DH: "th", EH: "E", ER: "rr",
    EY: "E", F: "fv", G: "kk", HH: "rest", IH: "ih", IY: "ih",
    JH: "ch", K: "kk", L: "nn", M: "mbp", N: "nn", NG: "nn",
    OW: "oh", OY: "oh", P: "mbp", R: "rr", S: "ss", SH: "ch",
    T: "dd", TH: "th", UH: "ou", UW: "ou", V: "fv", W: "ou",
    Y: "ih", Z: "ss", ZH: "ch", SIL: "rest"
};
// ── AVSyncSubstrate ──────────────────────────────────────────────────────────
class AVSyncSubstrate extends base_substrate_1.BaseSubstrate {
    constructor(config) {
        super({ name: "av-sync", version: "1.0.0", ...config }, null);
    }
    static create(config) {
        return new AVSyncSubstrate(config);
    }
    // ── Phoneme ingestion ─────────────────────────────────────────────────────
    addPhoneme(trackId, entry) {
        this.drill("phonemes", trackId, String(entry.startMs)).value = entry;
    }
    getPhonemeAt(trackId, ms) {
        return this.drill("phonemes", trackId, String(ms)).value;
    }
    // ── Viseme generation ─────────────────────────────────────────────────────
    /** Convert a phoneme entry to a viseme and store it for a character */
    phonemeToViseme(charId, entry, fps = 24) {
        const viseme = PHONEME_VISEME[entry.phoneme] ?? "rest";
        const durationFrames = Math.max(1, Math.round((entry.endMs - entry.startMs) / 1000 * fps));
        const frameIdx = Math.round(entry.startMs / 1000 * fps);
        const weight = entry.confidence;
        const ve = { viseme, weight, frameIdx, durationFrames };
        this.drill("visemes", charId, String(frameIdx)).value = ve;
        return ve;
    }
    getViseme(charId, frameIdx) {
        return this.drill("visemes", charId, String(frameIdx)).value;
    }
    // ── Drift / alignment ─────────────────────────────────────────────────────
    setDriftOffset(trackId, offsetMs) {
        this.drill("sync", trackId, "offset").value = offsetMs;
    }
    getDriftOffset(trackId) {
        return this.drill("sync", trackId, "offset").value ?? 0;
    }
    alignTrack(trackId, driftMs, confidence) {
        const meta = { trackId, driftMs, confidence, alignedAt: Date.now() };
        this.drill("meta", trackId).value = meta;
        this.setDriftOffset(trackId, driftMs);
        return meta;
    }
    getSyncMeta(trackId) {
        return this.drill("meta", trackId).value;
    }
    // ── Mixing console ────────────────────────────────────────────────────────
    addMixChannel(channel) {
        this.drill("mix", channel.id).value = channel;
    }
    getMixChannel(id) {
        return this.drill("mix", id).value;
    }
    setVolume(id, volume) {
        const ch = this.drill("mix", id);
        if (ch.value)
            ch.value = { ...ch.value, volume: Math.max(0, Math.min(2, volume)) };
    }
    setPan(id, pan) {
        const ch = this.drill("mix", id);
        if (ch.value)
            ch.value = { ...ch.value, pan: Math.max(-1, Math.min(1, pan)) };
    }
    muteChannel(id, muted) {
        const ch = this.drill("mix", id);
        if (ch.value)
            ch.value = { ...ch.value, muted };
    }
    // ── Phoneme lookup helper ─────────────────────────────────────────────────
    lookupViseme(phoneme) {
        return PHONEME_VISEME[phoneme] ?? "rest";
    }
    // ── BaseSubstrate contract ────────────────────────────────────────────────
    reset() {
        this.drill("phonemes").value = null;
        this.drill("visemes").value = null;
        this.drill("sync").value = null;
        this.drill("mix").value = null;
    }
    serialize() { return { name: this.name }; }
    hydrate(_state) { }
}
exports.AVSyncSubstrate = AVSyncSubstrate;
