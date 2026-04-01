// FastTrack 3D - Three.js Board Rendering
// ═══════════════════════════════════════════════════════════════════════════
// Ported from legacy/junkyard/universe/games/fasttrack/board_3d.html
// Hexagonal board with golden ratio proportions, Light Bright pegs
// ═══════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// GOLDEN RATIO PROPORTIONS (φ = 1.618033988749895)
// ════════════════════════════════════════════════════════════════
const PHI = 1.618033988749895;
const BOARD_RADIUS = 300;
const BOARD_THICKNESS = 21;
const BOARD_BEVEL = 12;
const HOLE_RADIUS = 8;
const TRACK_HOLE_RADIUS = 8;
// Flat-top pegs — shorter, wider, with a disc cap
const PEG_BOTTOM_RADIUS = 9;
const PEG_HEIGHT = 28;           // shorter, less phallic
const PEG_TOP_RADIUS = 6;        // less tapered
const PEG_DOME_RADIUS = 6;       // flat cap matches top
const LINE_HEIGHT = 13;
const BORDER_HEIGHT = 15;
const BORDER_WIDTH = 13;

// Billiard table dimensions
const TABLE_HEIGHT = 90;              // Height of table from floor
const TABLE_LEG_WIDTH = 25;
const RAIL_HEIGHT = 12;
const RAIL_WIDTH = 35;

// Room dimensions
const ROOM_WIDTH = 1200;
const ROOM_DEPTH = 1000;
const ROOM_HEIGHT = 400;

// Player colors (Board Inventory v2.0.0)
// Billiard ball colors (solids 1–6): Yellow, Blue, Red, Purple, Orange, Green
const RAINBOW_COLORS = [0xFFC000, 0x0050B5, 0xCC0000, 0x4B0082, 0xFF6600, 0x006400];
const COLOR_NAMES = ['Yellow', 'Blue', 'Red', 'Purple', 'Orange', 'Green'];

// Art pieces — ingested onto the manifold via ft:art RepresentationTable
const ART_PLACEHOLDERS = [
  { wall: 'back',  x: -280, y: 240, width: 220, height: 165, file: 'bridge.png' },
  { wall: 'back',  x: 140,  y: 240, width: 220, height: 165, file: 'chess.png' },
  { wall: 'left',  x: -200, y: 220, width: 200, height: 150, file: 'DrivingTheHerd.png' },
  { wall: 'left',  x: 100,  y: 220, width: 200, height: 150, file: 'lighthouse.png' },
  { wall: 'right', x: -100, y: 220, width: 200, height: 150, file: 'parot.png' },
  { wall: 'right', x: 200,  y: 220, width: 200, height: 150, file: 'pigs.png' },
];

/**
 * Ingest art images onto the manifold (ft:art RepresentationTable).
 * Reads base64 data URLs from the pre-generated ART_DATA global (art-data.js),
 * creates Image elements, and stores them on the manifold.
 * Data URLs are same-origin by definition — no file:// taint.
 * Returns a Promise that resolves when all images are ingested.
 */
function ingestArt() {
  const table = state.art;
  const promises = ART_PLACEHOLDERS.map(art => new Promise((resolve) => {
    const key = art.file;
    // Skip if already ingested (delta cache — O(1) check)
    if (table.has(`${key}|img`)) {
      console.log(`🎨 Manifold cache hit: ${key}`);
      return resolve();
    }
    const dataUrl = typeof ART_DATA !== 'undefined' && ART_DATA[key];
    if (!dataUrl) {
      console.warn(`🎨 No base64 data for: ${key} (run generate-art-data.ps1)`);
      return resolve();
    }
    const img = new Image();
    img.onload = () => {
      table.set(`${key}|img`, img);
      table.set(`${key}|width`, img.naturalWidth);
      table.set(`${key}|height`, img.naturalHeight);
      console.log(`🎨 Ingested onto manifold: ${key} (${img.naturalWidth}×${img.naturalHeight})`);
      resolve();
    };
    img.onerror = () => {
      console.warn(`🎨 Failed to decode: ${key}`);
      resolve();
    };
    img.src = dataUrl;
  }));
  return Promise.all(promises);
}

/**
 * Materialise a THREE.Texture from manifold-ingested art.
 * Uses the stored HTMLImageElement (created from data URL — untainted).
 * Returns null if the art is not yet ingested.
 */
function materialiseArtTexture(artName) {
  const table = state.art;
  const img = table.get(`${artName}|img`);
  if (!img) return null;
  const tex = new THREE.Texture(img);
  tex.needsUpdate = true;
  if (THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
  return tex;
}

// ════════════════════════════════════════════════════════════════
// THREE.JS SCENE GLOBALS
// ════════════════════════════════════════════════════════════════
let scene, camera, renderer, controls;
let boardGroup, pegGroup;
const holeRegistry = new Map();
const pegRegistry = new Map();
let boardMesh = null;
let dustMotes = null;  // atmospheric dust particle system

// ════════════════════════════════════════════════════════════════
// GAME SETTINGS - Configured from lobby
// ════════════════════════════════════════════════════════════════
const GameSettings = {
  cameraMode: 'manual',  // 'manual' (default) or 'auto'
  musicEnabled: false,
  soundEnabled: true,

  load() {
    try {
      const saved = localStorage.getItem('fasttrack-settings');
      if (saved) {
        const s = JSON.parse(saved);
        this.cameraMode = s.cameraMode || 'manual';
        this.musicEnabled = s.musicEnabled ?? false;
        this.soundEnabled = s.soundEnabled ?? true;
      }
    } catch (e) {}
  },

  save() {
    localStorage.setItem('fasttrack-settings', JSON.stringify({
      cameraMode: this.cameraMode,
      musicEnabled: this.musicEnabled,
      soundEnabled: this.soundEnabled
    }));
  }
};

// ════════════════════════════════════════════════════════════════
// MANIFOLD AUDIO ENGINE — Procedural sound & music from z = x·y helix
// ════════════════════════════════════════════════════════════════
// The 7-section helix maps to a heptatonic scale. Each section angle
// produces a frequency via z = x·y where x = cos(θ), y = sin(θ).
// Color ↔ frequency ↔ position are projections of the same manifold.
// ════════════════════════════════════════════════════════════════
const ManifoldAudio = {
  ctx: null,
  masterGain: null,
  musicPlaying: false,
  _musicTimer: null,
  _beat: 0,
  _bar: 0,
  _phrase: 0,
  _chordIdx: 0,
  _melodyAngle: 0,

  // 7-section helix → heptatonic scale (Mixolydian for lively feel)
  // Semitone offsets: 0, 2, 4, 5, 7, 9, 10 (Mixolydian)
  SCALE: [0, 2, 4, 5, 7, 9, 10],
  BASE_FREQ: 130.81,  // C3
  BPM: 138,

  // Chord progressions (scale degrees) — cycle to avoid repetition
  PROGRESSIONS: [
    [[0,2,4], [3,5,0], [4,6,1], [2,4,6]],    // I  IV  V  iii
    [[0,2,4], [5,0,2], [3,5,0], [4,6,1]],    // I  vi  IV  V
    [[2,4,6], [5,0,2], [0,2,4], [4,6,1]],    // iii vi  I  V
    [[3,5,0], [0,2,4], [5,0,2], [4,6,1]],    // IV  I  vi  V
    [[0,2,4], [2,4,6], [3,5,0], [5,0,2]],    // I  iii IV  vi
  ],

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
      // Compressor to prevent clipping
      this._comp = this.ctx.createDynamicsCompressor();
      this._comp.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this._comp.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.masterGain.connect(this._comp);
      this._comp.connect(this.ctx.destination);
      console.log('🎵 ManifoldAudio engine initialized');
    } catch (e) { console.warn('Audio not available:', e); }
  },

  // ── Core: manifold coordinate → frequency ──
  freqFromHelix(section, octave = 0) {
    const semi = this.SCALE[((section % 7) + 7) % 7];
    return this.BASE_FREQ * Math.pow(2, (semi + octave * 12) / 12);
  },

  // z = x·y saddle → frequency with harmonic richness
  zFreq(x, y) {
    const z = x * y;
    return this.BASE_FREQ * Math.pow(2, (Math.abs(z) * 12) / 12);
  },

  // ── Envelope helper ──
  _env(param, t, a, d, s, r, peak = 0.3) {
    param.setValueAtTime(0.001, t);
    param.linearRampToValueAtTime(peak, t + a);
    param.linearRampToValueAtTime(peak * s, t + a + d);
    param.linearRampToValueAtTime(0.001, t + a + d + r);
  },

  // ── Play a tone with overtones (metallic mallet on manifold surface) ──
  playTone(freq, t, dur, vol = 0.15, type = 'triangle', detune = 0) {
    if (!this.ctx) return;
    const now = t || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (detune) osc.detune.setValueAtTime(detune, now);
    this._env(g.gain, now, 0.005, dur * 0.3, 0.4, dur * 0.7, vol);
    osc.connect(g); g.connect(this.masterGain);
    osc.start(now); osc.stop(now + dur + 0.05);
  },

  // Metallic impact — sum of inharmonic partials (like a mallet on metal)
  playImpact(freq, t, dur, vol = 0.12) {
    if (!this.ctx) return;
    const now = t || this.ctx.currentTime;
    const ratios = [1, PHI, PHI * PHI, 2.756, 3.51]; // inharmonic metal partials
    ratios.forEach((r, i) => {
      const v = vol / (1 + i * 0.8);
      this.playTone(freq * r, now, dur * (1 - i * 0.15), v, 'sine', (i - 2) * 7);
    });
  },

  // Noise burst (percussion)
  _noise(t, dur, vol = 0.1, filter = 8000) {
    if (!this.ctx) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = filter < 2000 ? 'lowpass' : 'highpass';
    filt.frequency.setValueAtTime(filter, t);
    const g = this.ctx.createGain();
    this._env(g.gain, t, 0.002, dur * 0.2, 0.1, dur * 0.8, vol);
    src.connect(filt); filt.connect(g); g.connect(this.masterGain);
    src.start(t); src.stop(t + dur + 0.01);
  },

  // ══════════════════════════════════════════════════════════════
  // SOUND EFFECTS — each derives pitch from manifold coordinates
  // ══════════════════════════════════════════════════════════════

  // Peg hop — metallic tap, pitch from hole section
  playHop(section = 0, progress = 0.5) {
    if (!this.ctx || !GameSettings.soundEnabled) return;
    const freq = this.freqFromHelix(section, 2) * (0.8 + progress * 0.4);
    this.playImpact(freq, null, 0.12, 0.08);
  },

  // Peg enters the board — rising chime
  playEnter() {
    if (!this.ctx || !GameSettings.soundEnabled) return;
    const t = this.ctx.currentTime;
    [0, 2, 4].forEach((s, i) => {
      this.playTone(this.freqFromHelix(s, 2), t + i * 0.06, 0.15, 0.12, 'sine');
    });
  },

  // Card draw — paper shuffle + bright tap
  playCardDraw() {
    if (!this.ctx || !GameSettings.soundEnabled) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.04, 0.06, 6000);
    this.playTone(this.freqFromHelix(0, 3), t + 0.03, 0.1, 0.08, 'sine');
  },

  // Cut opponent — dissonant crash resolving to consonance
  playCut() {
    if (!this.ctx || !GameSettings.soundEnabled) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.08, 0.15, 1200);  // crash
    this.playTone(this.freqFromHelix(1, 2), t, 0.15, 0.1, 'sawtooth');
    this.playTone(this.freqFromHelix(6, 2), t, 0.15, 0.1, 'sawtooth'); // dissonant
    // resolve
    this.playTone(this.freqFromHelix(0, 2), t + 0.2, 0.3, 0.12, 'triangle');
    this.playTone(this.freqFromHelix(4, 2), t + 0.2, 0.3, 0.08, 'triangle');
  },

  // FastTrack entry — whoosh + ascending scale
  playFastTrack() {
    if (!this.ctx || !GameSettings.soundEnabled) return;
    const t = this.ctx.currentTime;
    this._noise(t, 0.15, 0.08, 3000);  // whoosh
    for (let i = 0; i < 7; i++) {
      this.playTone(this.freqFromHelix(i, 2), t + i * 0.04, 0.08, 0.06, 'sine');
    }
  },

  // Bullseye — triumphant major chord + sparkle
  playBullseye() {
    if (!this.ctx || !GameSettings.soundEnabled) return;
    const t = this.ctx.currentTime;
    [0, 2, 4, 0].forEach((s, i) => {
      const oct = i === 3 ? 3 : 2;
      this.playTone(this.freqFromHelix(s, oct), t + i * 0.08, 0.4, 0.1, 'sine');
    });
    this._noise(t + 0.1, 0.05, 0.04, 10000); // sparkle
  },

  // Safe zone — gentle resolution
  playSafeZone() {
    if (!this.ctx || !GameSettings.soundEnabled) return;
    const t = this.ctx.currentTime;
    this.playTone(this.freqFromHelix(4, 1), t, 0.5, 0.08, 'sine');
    this.playTone(this.freqFromHelix(0, 2), t + 0.15, 0.5, 0.08, 'sine');
  },

  // Victory fanfare — full spiral arpeggio
  playVictory() {
    if (!this.ctx || !GameSettings.soundEnabled) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 14; i++) {
      const s = i % 7;
      const oct = Math.floor(i / 7) + 1;
      this.playTone(this.freqFromHelix(s, oct), t + i * 0.07, 0.3, 0.1, 'sine');
    }
    // Final chord
    [0, 2, 4].forEach(s => {
      this.playTone(this.freqFromHelix(s, 3), t + 1.1, 0.8, 0.12, 'triangle');
    });
  },

  // Cutscene fanfare — bold brass-like stab
  playFanfare(type = 'generic') {
    if (!this.ctx || !GameSettings.soundEnabled) return;
    const t = this.ctx.currentTime;
    const chords = {
      fasttrack: [0, 2, 4, 6],
      bullseye:  [0, 2, 4, 0],  // octave doubling
      cut:       [0, 3, 4, 6],
      safeZone:  [0, 2, 5],
      crown:     [0, 4, 2, 6, 4],  // regal ascending fanfare
      win:       [0, 2, 4, 0],
      generic:   [0, 2, 4],
    };
    const notes = chords[type] || chords.generic;
    notes.forEach((s, i) => {
      const oct = (type === 'win' && i === notes.length - 1) ? 3 : 2;
      this.playTone(this.freqFromHelix(s, oct), t + i * 0.05, 0.6, 0.15, 'sawtooth');
      this.playTone(this.freqFromHelix(s, oct), t + i * 0.05, 0.6, 0.08, 'triangle');
    });
    this._noise(t, 0.03, 0.12, 1500); // impact
  },

  // ══════════════════════════════════════════════════════════════
  // MUSIC ENGINE — 4/4 time, lively tempo, non-repetitive
  // ══════════════════════════════════════════════════════════════
  // Percussion + bass + melody + chords + harmonics + resolution
  // Coordinates rotate through the helix so patterns never repeat.

  startMusic() {
    if (!this.ctx || !GameSettings.musicEnabled || this.musicPlaying) return;
    this.musicPlaying = true;
    this._beat = 0; this._bar = 0; this._phrase = 0;
    this._chordIdx = 0; this._melodyAngle = Math.random() * Math.PI * 2;
    this._scheduleNextBeat();
    console.log('🎶 Manifold music started (BPM:', this.BPM, ')');
  },

  stopMusic() {
    this.musicPlaying = false;
    if (this._musicTimer) { clearTimeout(this._musicTimer); this._musicTimer = null; }
  },

  _scheduleNextBeat() {
    if (!this.musicPlaying || !this.ctx) return;
    const beatDur = 60 / this.BPM;
    const t = this.ctx.currentTime + 0.05; // slight lookahead

    this._playBeat(t, beatDur);

    this._beat++;
    if (this._beat >= 4) { this._beat = 0; this._bar++; }
    if (this._bar >= 4) { this._bar = 0; this._phrase++; this._chordIdx = (this._chordIdx + 1) % this.PROGRESSIONS.length; }
    this._melodyAngle += PHI * 0.3 + Math.random() * 0.2; // golden ratio drift

    this._musicTimer = setTimeout(() => this._scheduleNextBeat(), beatDur * 1000);
  },

  _playBeat(t, beatDur) {
    const prog = this.PROGRESSIONS[this._chordIdx % this.PROGRESSIONS.length];
    const chord = prog[this._bar % prog.length]; // [root, third, fifth] as scale degrees

    // ── Percussion ──
    this._playPercussion(t, beatDur);

    // ── Bass (root of chord, octave 0) ──
    this._playBass(t, beatDur, chord);

    // ── Chords (beats 0 and 2 — half notes) ──
    if (this._beat === 0 || this._beat === 2) {
      this._playChord(t, beatDur * 2, chord);
    }

    // ── Melody (every beat, with rests) ──
    this._playMelody(t, beatDur, chord);

    // ── Harmonics / overtones (sparse, on beat 3 of certain bars) ──
    if (this._beat === 3 && this._bar % 2 === 0) {
      this._playHarmonics(t, beatDur * 2, chord);
    }

    // ── Resolution (last beat of phrase) ──
    if (this._beat === 3 && this._bar === 3) {
      this._playResolution(t + beatDur * 0.5, beatDur);
    }
  },

  _playPercussion(t, dur) {
    const b = this._beat;
    // Kick on 0 and 2
    if (b === 0 || b === 2) {
      this._noise(t, 0.06, 0.09, 120); // deep kick
      this.playTone(50, t, 0.06, 0.1, 'sine'); // kick body
    }
    // Snare on 1 and 3
    if (b === 1 || b === 3) {
      this._noise(t, 0.05, 0.06, 3500); // snare
      this.playTone(180, t, 0.03, 0.04, 'triangle'); // snare body
    }
    // Hi-hat on every beat + off-beat
    this._noise(t, 0.02, 0.03, 9000);
    // Off-beat hi-hat (eighth note)
    this._noise(t + dur * 0.5, 0.015, 0.02, 11000);
    // Ghost note 16th on random beats
    if (Math.random() > 0.6) {
      this._noise(t + dur * 0.25, 0.01, 0.015, 10000);
    }
  },

  _playBass(t, dur, chord) {
    const root = chord[0];
    const freq = this.freqFromHelix(root, 0); // octave 0 = bass
    // Eighth note pattern with slight variation
    this.playTone(freq, t, dur * 0.4, 0.11, 'triangle');
    if (this._beat % 2 === 0 || Math.random() > 0.5) {
      const walkNote = chord[Math.random() > 0.5 ? 1 : 2];
      this.playTone(this.freqFromHelix(walkNote, 0), t + dur * 0.5, dur * 0.35, 0.07, 'triangle');
    }
  },

  _playChord(t, dur, chord) {
    chord.forEach((deg, i) => {
      const freq = this.freqFromHelix(deg, 1);
      this.playTone(freq, t + i * 0.01, dur * 0.8, 0.04, 'triangle', (i - 1) * 5);
    });
  },

  _playMelody(t, dur, chord) {
    // Use the rotating helix angle to pick melody notes (non-repetitive)
    if (Math.random() < 0.2) return; // occasional rests
    const angle = this._melodyAngle + this._beat * PHI;
    const section = Math.floor(((Math.sin(angle) + 1) / 2) * 7);
    const freq = this.freqFromHelix(section, 2);
    const articulation = Math.random() > 0.7 ? dur * 0.8 : dur * 0.4; // long vs staccato
    this.playTone(freq, t, articulation, 0.06, 'sine');
    // Occasional grace note
    if (Math.random() > 0.8) {
      const graceSection = (section + (Math.random() > 0.5 ? 1 : -1) + 7) % 7;
      this.playTone(this.freqFromHelix(graceSection, 2), t - 0.03, 0.04, 0.03, 'sine');
    }
  },

  _playHarmonics(t, dur, chord) {
    // Ethereal overtone — high register, quiet
    const deg = chord[Math.floor(Math.random() * chord.length)];
    const freq = this.freqFromHelix(deg, 3);
    this.playTone(freq, t, dur, 0.025, 'sine');
    this.playTone(freq * PHI, t + 0.02, dur * 0.8, 0.015, 'sine'); // golden ratio harmonic
  },

  _playResolution(t, dur) {
    // Resolve to tonic chord at phrase end
    [0, 2, 4].forEach((s, i) => {
      this.playTone(this.freqFromHelix(s, 1), t + i * 0.02, dur * 1.5, 0.05, 'sine');
    });
  },
};

// ════════════════════════════════════════════════════════════════
// CAMERA DIRECTOR - Auto-framing camera system (default: MANUAL)
// ════════════════════════════════════════════════════════════════
const CameraDirector = {
  mode: 'manual',  // Default to manual - user has full control
  _pos: null,
  _look: null,
  _tPos: null,
  _tLook: null,
  _damping: 0.035,         // base damping — smooth, never jerky
  _minHeight: 150,
  _maxHeight: 800,
  _followPegId: null,       // Currently followed peg
  _followMode: null,        // 'peg' | 'split' | 'cut-victim' | 'cut-victor' | null
  _cutsceneLock: false,     // True while cutscene is active — never relinquish
  _splitPegIds: null,       // [peg1Id, peg2Id] for split camera
  _settledCallback: null,   // Called once when camera reaches target
  _activePlayerIdx: -1,     // Current player index for auto-focus

  init() {
    this._pos = new THREE.Vector3(0, 250, 400);
    this._look = new THREE.Vector3(0, 0, 0);
    this._tPos = this._pos.clone();
    this.mode = GameSettings.cameraMode;
    this._tLook = this._look.clone();
  },

  // Set which player is active (called from game-core)
  setActivePlayer(playerIdx) {
    this._activePlayerIdx = playerIdx;
  },

  // Follow a specific peg during its move
  followPeg(pegId) {
    if (this.mode === 'manual') return;
    this._followPegId = pegId;
    this._followMode = 'peg';
    this._damping = 0.10; // tight follow — peg must never leave viewport
  },

  // Pan out to frame both pegs during a split
  followSplit(pegId1, pegId2) {
    if (this.mode === 'manual') return;
    this._followMode = 'split';
    this._splitPegIds = [pegId1, pegId2];
    this._damping = 0.035;
  },

  // Cut scene camera: first follow victim, then cut to victor
  followCutVictim(victimPegId, victorPegId, onVictimDone) {
    if (this.mode === 'manual') return;
    this._followMode = 'cut-victim';
    this._followPegId = victimPegId;
    this._cutsceneLock = true;
    this._damping = 0.06; // tighter follow on victim
    // After 1.5s, switch to victor
    setTimeout(() => {
      this._followMode = 'cut-victor';
      this._followPegId = victorPegId;
      this._damping = 0.05;
      if (onVictimDone) onVictimDone();
    }, 1500);
  },

  // Lock camera during cutscenes
  lockForCutscene() { this._cutsceneLock = true; },
  unlockCutscene() {
    this._cutsceneLock = false;
    this._followMode = null;
    this._followPegId = null;
    this._splitPegIds = null;
    this._damping = 0.035;
  },

  // Check if camera has settled near its target (within threshold)
  isSettled(threshold) {
    const t = threshold || 5;
    if (!this._pos || !this._tPos) return true;
    return this._pos.distanceTo(this._tPos) < t && this._look.distanceTo(this._tLook) < t;
  },

  // Wait for camera to settle, then call callback
  whenSettled(callback) {
    if (this.mode === 'manual' || this.isSettled()) {
      callback();
      return;
    }
    this._settledCallback = callback;
  },

  update(dt) {
    if (this.mode === 'manual' || !camera) return;

    if (this._followMode === 'peg' || this._followMode === 'cut-victim' || this._followMode === 'cut-victor') {
      this._computeFollowTarget();
    } else if (this._followMode === 'split') {
      this._computeSplitTarget();
    } else if (this.mode === 'auto') {
      this._computeAutoTarget();
    }

    // Smooth interpolation — never jerky
    const f = 1 - Math.pow(1 - this._damping, (dt || 16) / 16);
    this._pos.lerp(this._tPos, f);
    this._look.lerp(this._tLook, f);

    camera.position.copy(this._pos);
    controls.target.copy(this._look);
    camera.lookAt(this._look);

    // Check settled callback
    if (this._settledCallback && this.isSettled()) {
      const cb = this._settledCallback;
      this._settledCallback = null;
      cb();
    }
  },

  _computeFollowTarget() {
    const peg = pegRegistry.get(this._followPegId);
    if (!peg || !peg.mesh) { this._computeAutoTarget(); return; }
    const pos = peg.mesh.position;
    // Look directly at the peg — always centered
    this._tLook.set(pos.x, pos.y, pos.z);
    // Position camera above and slightly behind — close enough to never lose the peg
    const height = this._followMode === 'cut-victim' ? 140 : 170;
    const dist = this._followMode === 'cut-victim' ? 120 : 180;
    // Offset camera toward board center so we see what's ahead of the peg
    const angle = Math.atan2(pos.z, pos.x);
    this._tPos.set(
      pos.x - Math.cos(angle) * dist * 0.3,
      pos.y + height,
      pos.z - Math.sin(angle) * dist * 0.3 + dist * 0.7
    );
  },

  _computeSplitTarget() {
    if (!this._splitPegIds) { this._computeAutoTarget(); return; }
    const p1 = pegRegistry.get(this._splitPegIds[0]);
    const p2 = pegRegistry.get(this._splitPegIds[1]);
    if (!p1?.mesh || !p2?.mesh) { this._computeAutoTarget(); return; }
    const center = p1.mesh.position.clone().add(p2.mesh.position).multiplyScalar(0.5);
    const spread = p1.mesh.position.distanceTo(p2.mesh.position);
    this._tLook.copy(center);
    // Pan outward proportional to spread between pegs
    const height = Math.max(250, 180 + spread * 0.8);
    const dist = Math.max(350, 250 + spread * 0.5);
    this._tPos.set(center.x * 0.2, center.y + height, center.z * 0.2 + dist);
  },

  // Auto target: angle shot with active player's section on the far LEFT
  _computeAutoTarget() {
    const positions = [];
    const activeIdx = this._activePlayerIdx;
    let boardPosition = 0;

    // Collect only active player's on-board pegs
    if (activeIdx >= 0 && window.FastTrackCore) {
      const players = window.FastTrackCore.state.players.get('list') || [];
      const player = players[activeIdx];
      if (player) {
        boardPosition = player.boardPosition || 0;
        for (const peg of player.pegs) {
          if (peg.holeId !== 'holding') {
            const regPeg = pegRegistry.get(peg.id);
            if (regPeg && regPeg.mesh && regPeg.mesh.visible) {
              positions.push(regPeg.mesh.position.clone());
            }
          }
        }
      }
    }

    // Fallback: if no active pegs found, use all visible pegs
    if (positions.length === 0) {
      pegRegistry.forEach(peg => {
        if (peg.mesh && peg.mesh.visible) {
          positions.push(peg.mesh.position.clone());
        }
      });
    }

    // Look at board center (slight bias toward peg cluster)
    this._tLook.set(0, TABLE_HEIGHT, 0);

    // Orbit camera so active player's section is on the far LEFT.
    // Player's section is at angle θ = (bp/6)*2π - π/6.
    // To put it on the left of viewport, camera sits at θ - π/2.
    const playerAngle = (boardPosition / 6) * Math.PI * 2 - Math.PI / 6;
    const camAngle = playerAngle - Math.PI / 2;

    // Height and distance — pan out if pegs are spread
    let height = 280;
    let dist = 380;
    if (positions.length > 1) {
      const center = new THREE.Vector3();
      positions.forEach(p => center.add(p));
      center.divideScalar(positions.length);
      let maxSpread = 0;
      for (const p of positions) {
        const d = p.distanceTo(center);
        if (d > maxSpread) maxSpread = d;
      }
      height = Math.max(280, 220 + maxSpread * 0.5);
      dist = Math.max(380, 300 + maxSpread * 0.35);
    }

    this._tPos.set(
      Math.cos(camAngle) * dist,
      height,
      Math.sin(camAngle) * dist
    );
  },

  setMode(mode) {
    this.mode = mode;
    if (mode === 'top') {
      camera.up.set(0, 0, -1);
      this._tPos.set(0, 600, 0);
      this._tLook.set(0, 0, 0);
    } else if (mode === 'angle') {
      camera.up.set(0, 1, 0);
      this._tPos.set(350, 350, 350);
      this._tLook.set(0, 0, 0);
    } else {
      camera.up.set(0, 1, 0);
    }
  }
};

// ════════════════════════════════════════════════════════════════
// BILLIARD ROOM ENVIRONMENT
// ════════════════════════════════════════════════════════════════
function createBilliardRoom() {
  // ── FLOOR — rich herringbone-style hardwood ──
  const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH * 1.5, ROOM_DEPTH * 1.5, 1, 1);
  floorGeo.rotateX(-Math.PI / 2);
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 512; floorCanvas.height = 512;
  const fctx = floorCanvas.getContext('2d');
  // Procedural herringbone wood grain
  fctx.fillStyle = '#3a2410';
  fctx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      const shade = 35 + Math.random() * 25;
      fctx.fillStyle = `rgb(${shade + 20}, ${shade + 5}, ${shade - 10})`;
      const x = col * 32, y = row * 32;
      if ((row + col) % 2 === 0) {
        fctx.fillRect(x + 1, y + 1, 30, 14);
        fctx.fillRect(x + 1, y + 17, 30, 14);
      } else {
        fctx.fillRect(x + 1, y + 1, 14, 30);
        fctx.fillRect(x + 17, y + 1, 14, 30);
      }
      // Grain lines
      fctx.strokeStyle = `rgba(0,0,0,0.08)`;
      fctx.lineWidth = 0.5;
      for (let g = 0; g < 3; g++) {
        fctx.beginPath();
        fctx.moveTo(x, y + g * 11 + Math.random() * 5);
        fctx.lineTo(x + 32, y + g * 11 + Math.random() * 5);
        fctx.stroke();
      }
    }
  }
  const floorTex = new THREE.CanvasTexture(floorCanvas);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(6, 5);
  // Normal map for wood plank depth
  const floorNorm = generateNormalMap(floorCanvas, 3.0);
  floorNorm.repeat.copy(floorTex.repeat);
  // Roughness variation map — lighter planks = smoother (worn paths)
  const floorRoughCanvas = document.createElement('canvas');
  floorRoughCanvas.width = 512; floorRoughCanvas.height = 512;
  const frctx = floorRoughCanvas.getContext('2d');
  frctx.fillStyle = '#888';
  frctx.fillRect(0, 0, 512, 512);
  for (let ry = 0; ry < 512; ry += 2) {
    for (let rx = 0; rx < 512; rx += 2) {
      const v = 100 + Math.random() * 80;
      frctx.fillStyle = `rgb(${v},${v},${v})`;
      frctx.fillRect(rx, ry, 2, 2);
    }
  }
  const floorRoughTex = new THREE.CanvasTexture(floorRoughCanvas);
  floorRoughTex.wrapS = floorRoughTex.wrapT = THREE.RepeatWrapping;
  floorRoughTex.repeat.copy(floorTex.repeat);

  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex, normalMap: floorNorm, normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: floorRoughTex, roughness: 0.45, metalness: 0.05, color: 0x4a3020,
    envMapIntensity: 0.4
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = -1;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── CEILING — warm plaster with subtle texture ──
  const ceilGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
  ceilGeo.rotateX(Math.PI / 2);
  // Procedural ceiling texture (subtle stucco)
  const ceilCanvas = document.createElement('canvas');
  ceilCanvas.width = 256; ceilCanvas.height = 256;
  const cctx = ceilCanvas.getContext('2d');
  cctx.fillStyle = '#1e1a12';
  cctx.fillRect(0, 0, 256, 256);
  for (let cy = 0; cy < 256; cy += 2) {
    for (let cx = 0; cx < 256; cx += 2) {
      const n = Math.random() * 8;
      cctx.fillStyle = `rgb(${30 + n}, ${26 + n}, ${18 + n})`;
      cctx.fillRect(cx, cy, 2, 2);
    }
  }
  const ceilTex = new THREE.CanvasTexture(ceilCanvas);
  ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping;
  ceilTex.repeat.set(4, 3);
  const ceilNorm = generateNormalMap(ceilCanvas, 1.0);
  ceilNorm.repeat.copy(ceilTex.repeat);
  const ceilMat = new THREE.MeshStandardMaterial({
    map: ceilTex, normalMap: ceilNorm, normalScale: new THREE.Vector2(0.3, 0.3),
    color: 0x221e14, roughness: 0.92, metalness: 0.0
  });
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.position.y = ROOM_HEIGHT;
  scene.add(ceiling);

  // ── WALLS — rich dark wood panelling with procedural texture ──
  const wallColor = 0x1c1408;
  const wallPanelColor = 0x251a0c;
  // Procedural wall texture
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = 512; wallCanvas.height = 512;
  const wctx2 = wallCanvas.getContext('2d');
  wctx2.fillStyle = '#1c1408';
  wctx2.fillRect(0, 0, 512, 512);
  // Vertical wood grain pattern
  for (let wx = 0; wx < 512; wx++) {
    const grain = Math.sin(wx * 0.15 + Math.random()) * 4;
    wctx2.fillStyle = `rgb(${28 + grain}, ${20 + grain * 0.7}, ${8 + grain * 0.3})`;
    wctx2.fillRect(wx, 0, 1, 512);
  }
  // Subtle horizontal variation
  for (let wy = 0; wy < 512; wy += 4) {
    const n = Math.random() * 6 - 3;
    wctx2.fillStyle = `rgba(${n > 0 ? 255 : 0}, ${n > 0 ? 255 : 0}, ${n > 0 ? 255 : 0}, 0.02)`;
    wctx2.fillRect(0, wy, 512, 4);
  }
  const wallTex = new THREE.CanvasTexture(wallCanvas);
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(3, 2);
  const wallNorm = generateNormalMap(wallCanvas, 2.0);
  wallNorm.repeat.copy(wallTex.repeat);

  const makeWall = (w, h, pos, rotY) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.MeshStandardMaterial({
      map: wallTex, normalMap: wallNorm, normalScale: new THREE.Vector2(0.5, 0.5),
      color: wallColor, roughness: 0.75, metalness: 0.04, side: THREE.DoubleSide,
      envMapIntensity: 0.2
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.rotation.y = rotY || 0;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };

  makeWall(ROOM_WIDTH, ROOM_HEIGHT, new THREE.Vector3(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2), 0);
  makeWall(ROOM_DEPTH, ROOM_HEIGHT, new THREE.Vector3(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0), Math.PI / 2);
  makeWall(ROOM_DEPTH, ROOM_HEIGHT, new THREE.Vector3(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0), -Math.PI / 2);

  // ── WAINSCOTING — lower wall panels with chair rail ──
  const WAINSCOT_H = 100;
  const addWainscoting = (w, pos, rotY) => {
    // Panel
    const pGeo = new THREE.PlaneGeometry(w - 20, WAINSCOT_H - 10);
    const pMat = new THREE.MeshStandardMaterial({
      color: wallPanelColor, roughness: 0.5, metalness: 0.08,
      normalMap: wallNorm, normalScale: new THREE.Vector2(0.4, 0.4),
      envMapIntensity: 0.3
    });
    const panel = new THREE.Mesh(pGeo, pMat);
    panel.position.copy(pos);
    panel.position.y = WAINSCOT_H / 2;
    panel.rotation.y = rotY || 0;
    scene.add(panel);

    // Chair rail (thin horizontal bar)
    const rGeo = new THREE.BoxGeometry(w, 4, 3);
    const rMat = new THREE.MeshStandardMaterial({ color: 0x3a2510, roughness: 0.3, metalness: 0.15, envMapIntensity: 0.5 });
    const rail = new THREE.Mesh(rGeo, rMat);
    const offset = new THREE.Vector3(0, WAINSCOT_H, 0);
    if (rotY) {
      const dir = new THREE.Vector3(0, 0, -1.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      offset.add(dir);
    } else {
      offset.z = pos.z + 1.5;
    }
    rail.position.set(pos.x, offset.y, pos.z);
    rail.rotation.y = rotY || 0;
    scene.add(rail);
  };

  addWainscoting(ROOM_WIDTH, new THREE.Vector3(0, 0, -ROOM_DEPTH / 2 + 1), 0);
  addWainscoting(ROOM_DEPTH, new THREE.Vector3(-ROOM_WIDTH / 2 + 1, 0, 0), Math.PI / 2);
  addWainscoting(ROOM_DEPTH, new THREE.Vector3(ROOM_WIDTH / 2 - 1, 0, 0), -Math.PI / 2);

  // ── CROWN MOLDING — decorative ceiling trim ──
  const moldingMat = new THREE.MeshStandardMaterial({ color: 0x2a1c0e, roughness: 0.35, metalness: 0.12, envMapIntensity: 0.5 });
  const addMolding = (w, pos, rotY) => {
    const geo = new THREE.BoxGeometry(w, 8, 8);
    const mesh = new THREE.Mesh(geo, moldingMat);
    mesh.position.copy(pos);
    mesh.rotation.y = rotY || 0;
    scene.add(mesh);
  };
  addMolding(ROOM_WIDTH, new THREE.Vector3(0, ROOM_HEIGHT - 4, -ROOM_DEPTH / 2 + 4), 0);
  addMolding(ROOM_DEPTH, new THREE.Vector3(-ROOM_WIDTH / 2 + 4, ROOM_HEIGHT - 4, 0), Math.PI / 2);
  addMolding(ROOM_DEPTH, new THREE.Vector3(ROOM_WIDTH / 2 - 4, ROOM_HEIGHT - 4, 0), -Math.PI / 2);

  // ── BASEBOARDS ──
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a0f05, roughness: 0.4, metalness: 0.1, envMapIntensity: 0.4 });
  const addBaseboard = (w, pos, rotY) => {
    const geo = new THREE.BoxGeometry(w, 10, 4);
    const mesh = new THREE.Mesh(geo, baseMat);
    mesh.position.copy(pos);
    mesh.rotation.y = rotY || 0;
    scene.add(mesh);
  };
  addBaseboard(ROOM_WIDTH, new THREE.Vector3(0, 5, -ROOM_DEPTH / 2 + 2), 0);
  addBaseboard(ROOM_DEPTH, new THREE.Vector3(-ROOM_WIDTH / 2 + 2, 5, 0), Math.PI / 2);
  addBaseboard(ROOM_DEPTH, new THREE.Vector3(ROOM_WIDTH / 2 - 2, 5, 0), -Math.PI / 2);

  // ── FRAMED ART — real paintings with thin redwood picture frames ──
  const frameBorder = 10;  // frame width around the image
  const frameThick = 3;    // how far frame sticks out from wall

  // Redwood material — rich reddish-brown wood
  const redwoodMat = new THREE.MeshStandardMaterial({
    color: 0x6B1C0A, roughness: 0.3, metalness: 0.12,
    emissive: new THREE.Color(0x1a0500), emissiveIntensity: 0.1,
    envMapIntensity: 0.6
  });
  // Inner edge — slightly lighter for depth illusion
  const redwoodInnerMat = new THREE.MeshStandardMaterial({
    color: 0x8B3A1A, roughness: 0.4, metalness: 0.08, envMapIntensity: 0.4
  });

  ART_PLACEHOLDERS.forEach(art => {
    const hw = art.width / 2, hh = art.height / 2;
    const artGroup = new THREE.Group();

    // Frame border — 4 thin box pieces (top, bottom, left, right)
    const topBot = new THREE.BoxGeometry(art.width + frameBorder * 2, frameBorder, frameThick);
    const leftRight = new THREE.BoxGeometry(frameBorder, art.height, frameThick);

    const top = new THREE.Mesh(topBot, redwoodMat);
    top.position.set(0, hh + frameBorder / 2, 0);
    const bot = new THREE.Mesh(topBot, redwoodMat);
    bot.position.set(0, -hh - frameBorder / 2, 0);
    const left = new THREE.Mesh(leftRight, redwoodMat);
    left.position.set(-hw - frameBorder / 2, 0, 0);
    const right = new THREE.Mesh(leftRight, redwoodMat);
    right.position.set(hw + frameBorder / 2, 0, 0);

    artGroup.add(top, bot, left, right);

    // Inner lip — thin strip at the inner edge of the frame
    const lipW = 3;
    const lipTopBot = new THREE.BoxGeometry(art.width + lipW, lipW, frameThick + 0.5);
    const lipLR = new THREE.BoxGeometry(lipW, art.height + lipW, frameThick + 0.5);

    const lt = new THREE.Mesh(lipTopBot, redwoodInnerMat);
    lt.position.set(0, hh - lipW / 2, 0.25);
    const lb = new THREE.Mesh(lipTopBot, redwoodInnerMat);
    lb.position.set(0, -hh + lipW / 2, 0.25);
    const ll = new THREE.Mesh(lipLR, redwoodInnerMat);
    ll.position.set(-hw + lipW / 2, 0, 0.25);
    const lr = new THREE.Mesh(lipLR, redwoodInnerMat);
    lr.position.set(hw - lipW / 2, 0, 0.25);

    artGroup.add(lt, lb, ll, lr);

    // Image canvas — MeshStandardMaterial with emissive boost so paintings
    // punch through the ACES tone mapping with vivid, saturated colors.
    const canvasGeo = new THREE.PlaneGeometry(art.width, art.height);
    const canvasMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a0e, roughness: 0.85, metalness: 0.0,
      envMapIntensity: 0.0  // no reflections on canvas
    });
    const canvasMesh = new THREE.Mesh(canvasGeo, canvasMat);
    canvasMesh.position.z = frameThick / 2 + 0.1; // just in front of the frame
    artGroup.add(canvasMesh);

    // Materialise texture from manifold-ingested pixel data (ft:art)
    const tex = materialiseArtTexture(art.file);
    if (tex) {
      canvasMat.map = tex;
      canvasMat.color.set(0xffffff);
      canvasMat.emissive = new THREE.Color(0xffffff);
      canvasMat.emissiveMap = tex;
      canvasMat.emissiveIntensity = 0.35;
      canvasMat.needsUpdate = true;
      console.log('🖼️ Materialised from manifold:', art.file);
    } else {
      console.warn('🖼️ Art not on manifold:', art.file);
    }

    // Place flush against wall (offset by half frame thickness)
    const wallOffset = frameThick / 2 + 1;
    if (art.wall === 'back') {
      artGroup.position.set(art.x, art.y, -ROOM_DEPTH / 2 + wallOffset);
    } else if (art.wall === 'left') {
      artGroup.position.set(-ROOM_WIDTH / 2 + wallOffset, art.y, art.x);
      artGroup.rotation.y = Math.PI / 2;
    } else {
      artGroup.position.set(ROOM_WIDTH / 2 - wallOffset, art.y, art.x);
      artGroup.rotation.y = -Math.PI / 2;
    }
    scene.add(artGroup);
  });

  // ── WALL SCONCES — warm accent lights ──
  const sconceMat = new THREE.MeshStandardMaterial({ color: 0x8B7535, roughness: 0.3, metalness: 0.8 });
  const sconcePositions = [
    { x: -400, z: -ROOM_DEPTH / 2 + 5, ry: 0 },
    { x: 400, z: -ROOM_DEPTH / 2 + 5, ry: 0 },
    { x: -ROOM_WIDTH / 2 + 5, z: -200, ry: Math.PI / 2 },
    { x: -ROOM_WIDTH / 2 + 5, z: 200, ry: Math.PI / 2 },
    { x: ROOM_WIDTH / 2 - 5, z: -200, ry: -Math.PI / 2 },
    { x: ROOM_WIDTH / 2 - 5, z: 200, ry: -Math.PI / 2 },
  ];
  sconcePositions.forEach(sp => {
    // Bracket
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(10, 18, 8), sconceMat);
    bracket.position.set(sp.x, 180, sp.z);
    bracket.rotation.y = sp.ry;
    scene.add(bracket);
    // Shade — ornate wall sconce shade
    const shadeGeo = new THREE.CylinderGeometry(6, 10, 14, 8, 1, true);
    const shadeMat = new THREE.MeshStandardMaterial({
      color: 0xffeedd, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide,
      emissive: new THREE.Color(0xffcc88), emissiveIntensity: 0.15, transparent: true, opacity: 0.6
    });
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.set(sp.x, 192, sp.z);
    shade.rotation.y = sp.ry;
    scene.add(shade);
    // Warm glow light
    const sconceLight = new THREE.PointLight(0xffcc88, 120, 350, 2);
    sconceLight.position.set(sp.x, 190, sp.z);
    scene.add(sconceLight);
  });

  // ── POOL CUE RACK — wall-mounted on left wall ──
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x2a1508, roughness: 0.35, metalness: 0.1 });
  const rackGroup = new THREE.Group();
  // Back plate
  const rackPlate = new THREE.Mesh(new THREE.BoxGeometry(6, 140, 60), darkWood);
  rackGroup.add(rackPlate);
  // Upper holder bar
  const upperBar = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 60), darkWood);
  upperBar.position.set(3, 50, 0);
  rackGroup.add(upperBar);
  // Lower holder bar
  const lowerBar = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 60), darkWood);
  lowerBar.position.set(3, -40, 0);
  rackGroup.add(lowerBar);
  // Cue sticks — 4 cues resting in the rack
  const cueMat = new THREE.MeshStandardMaterial({ color: 0xc8a050, roughness: 0.4, metalness: 0.05 });
  const cueTipMat = new THREE.MeshStandardMaterial({ color: 0x1a1a3a, roughness: 0.5 });
  for (let ci = 0; ci < 4; ci++) {
    const cueGroup = new THREE.Group();
    // Shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2, 120, 8), cueMat);
    cueGroup.add(shaft);
    // Tip
    const tip = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), cueTipMat);
    tip.position.y = 60;
    cueGroup.add(tip);
    // Butt cap
    const butt = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0x1a0a00, roughness: 0.3, metalness: 0.3 }));
    butt.position.y = -60;
    cueGroup.add(butt);
    cueGroup.position.set(8, 0, -22 + ci * 14);
    cueGroup.rotation.z = -0.05 + ci * 0.02;
    rackGroup.add(cueGroup);
  }
  rackGroup.position.set(-ROOM_WIDTH / 2 + 8, 150, -300);
  rackGroup.rotation.y = 0;
  scene.add(rackGroup);

  // ── BALL TRIANGLE — decorative racked balls on a side table ──
  const sideTableGroup = new THREE.Group();
  // Small side table
  const stTop = new THREE.Mesh(new THREE.CylinderGeometry(35, 35, 4, 16), darkWood);
  stTop.position.y = 70;
  sideTableGroup.add(stTop);
  for (let l = 0; l < 3; l++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 70, 8), darkWood);
    const la = (l / 3) * Math.PI * 2;
    leg.position.set(Math.cos(la) * 25, 35, Math.sin(la) * 25);
    sideTableGroup.add(leg);
  }
  // Triangle rack
  const triMat = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.3, metalness: 0.1 });
  const triShape = new THREE.Shape();
  triShape.moveTo(0, 18); triShape.lineTo(-16, -10); triShape.lineTo(16, -10); triShape.closePath();
  const triHole = new THREE.Path();
  triHole.moveTo(0, 14); triHole.lineTo(-12, -7); triHole.lineTo(12, -7); triHole.closePath();
  triShape.holes.push(triHole);
  const triGeo = new THREE.ExtrudeGeometry(triShape, { depth: 3, bevelEnabled: false });
  const triMesh = new THREE.Mesh(triGeo, triMat);
  triMesh.rotation.x = -Math.PI / 2;
  triMesh.position.y = 73;
  sideTableGroup.add(triMesh);
  // Pool balls inside triangle
  const ballColors = [0xff0000, 0xffff00, 0x0000ff, 0x00aa00, 0xff6600, 0x8800aa, 0xcc0000, 0x000000, 0xffcc00, 0x0088ff];
  let bIdx = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col <= row; col++) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(3.5, 12, 10),
        new THREE.MeshStandardMaterial({ color: ballColors[bIdx % ballColors.length], roughness: 0.2, metalness: 0.05 }));
      ball.position.set(-row * 3.5 + col * 7, 76, -6 + row * 6);
      ball.castShadow = true;
      sideTableGroup.add(ball);
      bIdx++;
    }
  }
  sideTableGroup.position.set(ROOM_WIDTH / 2 - 80, 0, -350);
  scene.add(sideTableGroup);

  // ── CHANDELIER — ornate ceiling fixture, auto-hides when camera looks straight down ──
  const chandelierGroup = new THREE.Group();
  chandelierGroup.name = 'chandelier';
  const brassFixture = new THREE.MeshStandardMaterial({ color: 0x8B7535, roughness: 0.25, metalness: 0.85 });
  // Central rod
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 60, 8), brassFixture);
  rod.position.y = 30;
  chandelierGroup.add(rod);
  // Ceiling plate
  const cPlate = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 3, 16), brassFixture);
  cPlate.position.y = 60;
  chandelierGroup.add(cPlate);
  // Hub
  const hub = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 10), brassFixture);
  chandelierGroup.add(hub);
  // Arms with glass shades and lights
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffeedd, roughness: 0.3, metalness: 0.0, transparent: true, opacity: 0.4,
    emissive: new THREE.Color(0xffcc88), emissiveIntensity: 0.3, side: THREE.DoubleSide
  });
  for (let a = 0; a < 6; a++) {
    const armAngle = (a / 6) * Math.PI * 2;
    const armR = 50;
    // Arm
    const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, armR, 6), brassFixture);
    armMesh.rotation.z = Math.PI / 2;
    armMesh.position.set(Math.cos(armAngle) * armR / 2, -5, Math.sin(armAngle) * armR / 2);
    armMesh.rotation.y = -armAngle;
    chandelierGroup.add(armMesh);
    // Glass shade
    const shadeG = new THREE.Mesh(new THREE.CylinderGeometry(5, 10, 14, 8, 1, true), glassMat);
    shadeG.position.set(Math.cos(armAngle) * armR, -8, Math.sin(armAngle) * armR);
    chandelierGroup.add(shadeG);
    // Light
    const armLight = new THREE.PointLight(0xffeedd, 40, 250, 2);
    armLight.position.set(Math.cos(armAngle) * armR, -4, Math.sin(armAngle) * armR);
    chandelierGroup.add(armLight);
  }
  // Crystal drops
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.6
  });
  for (let c = 0; c < 12; c++) {
    const cAngle = (c / 12) * Math.PI * 2;
    const cr = 30 + (c % 2) * 18;
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(2.5, 0), crystalMat);
    crystal.position.set(Math.cos(cAngle) * cr, -15 - Math.random() * 8, Math.sin(cAngle) * cr);
    chandelierGroup.add(crystal);
  }
  chandelierGroup.position.set(0, ROOM_HEIGHT - 5, 0);
  scene.add(chandelierGroup);
}

function createHexBilliardTable() {
  // ── SLATE BED — solid base beneath the felt ──
  const slateShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI / 3) - Math.PI / 6;
    const x = Math.cos(angle) * (BOARD_RADIUS + RAIL_WIDTH + 5);
    const y = Math.sin(angle) * (BOARD_RADIUS + RAIL_WIDTH + 5);
    if (i === 0) slateShape.moveTo(x, y); else slateShape.lineTo(x, y);
  }
  slateShape.closePath();
  const slateGeo = new THREE.ExtrudeGeometry(slateShape, { depth: 12, bevelEnabled: false });
  slateGeo.rotateX(-Math.PI / 2);
  const slateMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7, metalness: 0.05 });
  const slate = new THREE.Mesh(slateGeo, slateMat);
  slate.position.y = TABLE_HEIGHT - 12;
  slate.receiveShadow = true;
  scene.add(slate);

  // ── GREEN BAIZE FELT — procedural woven texture ──
  const feltShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI / 3) - Math.PI / 6;
    const x = Math.cos(angle) * (BOARD_RADIUS + RAIL_WIDTH);
    const y = Math.sin(angle) * (BOARD_RADIUS + RAIL_WIDTH);
    if (i === 0) feltShape.moveTo(x, y); else feltShape.lineTo(x, y);
  }
  feltShape.closePath();

  // Procedural felt texture
  const feltCanvas = document.createElement('canvas');
  feltCanvas.width = 256; feltCanvas.height = 256;
  const fctx = feltCanvas.getContext('2d');
  fctx.fillStyle = '#0a6e1e';
  fctx.fillRect(0, 0, 256, 256);
  // Woven fiber noise
  for (let fy = 0; fy < 256; fy++) {
    for (let fx = 0; fx < 256; fx += 2) {
      const noise = Math.random() * 12 - 6;
      const g = 58 + noise;
      fctx.fillStyle = `rgb(${26 + noise * 0.3}, ${g}, ${26 + noise * 0.3})`;
      fctx.fillRect(fx, fy, 2, 1);
    }
  }
  const feltTex = new THREE.CanvasTexture(feltCanvas);
  feltTex.wrapS = feltTex.wrapT = THREE.RepeatWrapping;
  feltTex.repeat.set(4, 4);
  // Felt normal map — gives the woven fiber texture real depth
  const feltNorm = generateNormalMap(feltCanvas, 1.5);
  feltNorm.repeat.copy(feltTex.repeat);

  const tableTopGeo = new THREE.ExtrudeGeometry(feltShape, { depth: 4, bevelEnabled: false });
  tableTopGeo.rotateX(-Math.PI / 2);
  const tableTopMat = new THREE.MeshStandardMaterial({
    map: feltTex, normalMap: feltNorm, normalScale: new THREE.Vector2(0.6, 0.6),
    color: 0x0e7a24, roughness: 0.95, metalness: 0.0, envMapIntensity: 0.05
  });
  const tableTop = new THREE.Mesh(tableTopGeo, tableTopMat);
  tableTop.position.y = TABLE_HEIGHT - 4;
  tableTop.receiveShadow = true;
  scene.add(tableTop);

  // ── CUSHION RAILS — rich mahogany with beveled profile ──
  const railShape = new THREE.Shape();
  const outerR = BOARD_RADIUS + RAIL_WIDTH + 25;
  const innerR = BOARD_RADIUS + RAIL_WIDTH;
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI / 3) - Math.PI / 6;
    if (i === 0) railShape.moveTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
    else railShape.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
  }
  railShape.closePath();
  const railHole = new THREE.Path();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI / 3) - Math.PI / 6;
    if (i === 0) railHole.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    else railHole.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
  }
  railHole.closePath();
  railShape.holes.push(railHole);

  // Procedural wood grain for rails
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 512; woodCanvas.height = 64;
  const wctx = woodCanvas.getContext('2d');
  wctx.fillStyle = '#5a2a0a';
  wctx.fillRect(0, 0, 512, 64);
  for (let wy = 0; wy < 64; wy++) {
    const grain = Math.sin(wy * 0.8 + Math.random() * 2) * 8;
    wctx.fillStyle = `rgb(${90 + grain}, ${42 + grain * 0.5}, ${10 + grain * 0.2})`;
    wctx.fillRect(0, wy, 512, 1);
  }
  const woodTex = new THREE.CanvasTexture(woodCanvas);
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(3, 1);
  // Wood grain normal map for lacquered rail depth
  const woodNorm = generateNormalMap(woodCanvas, 2.5);
  woodNorm.repeat.copy(woodTex.repeat);

  const railGeo = new THREE.ExtrudeGeometry(railShape, {
    depth: RAIL_HEIGHT + 4, bevelEnabled: true, bevelSize: 3, bevelThickness: 2, bevelSegments: 3
  });
  railGeo.rotateX(-Math.PI / 2);
  const railMat = new THREE.MeshStandardMaterial({
    map: woodTex, normalMap: woodNorm, normalScale: new THREE.Vector2(0.7, 0.7),
    color: 0x6a3a10, roughness: 0.25, metalness: 0.2, envMapIntensity: 0.6
  });
  const rail = new THREE.Mesh(railGeo, railMat);
  rail.position.y = TABLE_HEIGHT;
  rail.castShadow = true;
  rail.receiveShadow = true;
  scene.add(rail);

  // ── PLAYER MARKERS — avatar + name sprites on rails (replacing diamond sights) ──
  // These are created as placeholders; updatePlayerMarkers() populates them once game starts
  _playerMarkerSprites = [];
  for (let i = 0; i < 6; i++) {
    const a1 = (i * Math.PI / 3) - Math.PI / 6;
    const a2 = ((i + 1) * Math.PI / 3) - Math.PI / 6;
    const midA = (a1 + a2) / 2;
    const sightR = outerR - 5;
    // Create a blank sprite placeholder at each panel midpoint
    const sprite = createPlayerMarkerSprite('', '#888888', '⬡');
    sprite.position.set(Math.cos(midA) * sightR, TABLE_HEIGHT + RAIL_HEIGHT + 12, Math.sin(midA) * sightR);
    sprite.visible = false; // hidden until a player occupies this panel
    sprite.userData.boardPosition = i;
    scene.add(sprite);
    _playerMarkerSprites.push(sprite);
  }

  // ── APRON SKIRT — beneath the rail, visible from low angles ──
  const apronShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI / 3) - Math.PI / 6;
    if (i === 0) apronShape.moveTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
    else apronShape.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
  }
  apronShape.closePath();
  const apronInner = new THREE.Path();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI / 3) - Math.PI / 6;
    if (i === 0) apronInner.moveTo(Math.cos(a) * (outerR - 6), Math.sin(a) * (outerR - 6));
    else apronInner.lineTo(Math.cos(a) * (outerR - 6), Math.sin(a) * (outerR - 6));
  }
  apronInner.closePath();
  apronShape.holes.push(apronInner);
  const apronGeo = new THREE.ExtrudeGeometry(apronShape, { depth: 25, bevelEnabled: false });
  apronGeo.rotateX(-Math.PI / 2);
  const apronMat = new THREE.MeshStandardMaterial({
    map: woodTex, normalMap: woodNorm, normalScale: new THREE.Vector2(0.5, 0.5),
    color: 0x5a2a08, roughness: 0.3, metalness: 0.12, envMapIntensity: 0.5
  });
  const apron = new THREE.Mesh(apronGeo, apronMat);
  apron.position.y = TABLE_HEIGHT - 25;
  apron.castShadow = true;
  scene.add(apron);

  // ── TURNED LEGS — lathe-style with carved profiles ──
  const legMat = new THREE.MeshStandardMaterial({
    map: woodTex, normalMap: woodNorm, normalScale: new THREE.Vector2(0.6, 0.6),
    color: 0x4a1a05, roughness: 0.28, metalness: 0.15, envMapIntensity: 0.5
  });
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI / 3) - Math.PI / 6;
    const legX = Math.cos(angle) * (BOARD_RADIUS * 0.78);
    const legZ = Math.sin(angle) * (BOARD_RADIUS * 0.78);
    const legGroup = new THREE.Group();

    // Main shaft — tapered
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(TABLE_LEG_WIDTH / 2 - 2, TABLE_LEG_WIDTH / 2, TABLE_HEIGHT * 0.7, 12),
      legMat
    );
    shaft.position.y = TABLE_HEIGHT * 0.35;
    legGroup.add(shaft);

    // Decorative bulge (turned detail)
    const bulge = new THREE.Mesh(
      new THREE.SphereGeometry(TABLE_LEG_WIDTH / 2 + 2, 12, 8),
      legMat
    );
    bulge.position.y = TABLE_HEIGHT * 0.55;
    bulge.scale.y = 0.6;
    legGroup.add(bulge);

    // Foot cap — polished brass with reflections
    const footMat = new THREE.MeshStandardMaterial({
      color: 0xb8960c, roughness: 0.15, metalness: 0.9, envMapIntensity: 1.2
    });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(TABLE_LEG_WIDTH / 2 + 1, TABLE_LEG_WIDTH / 2 - 1, 8, 12), footMat);
    foot.position.y = 4;
    legGroup.add(foot);

    legGroup.position.set(legX, 0, legZ);
    legGroup.castShadow = true;
    scene.add(legGroup);
  }
}

// ════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════
async function init3D() {
  const container = document.getElementById('container');

  // Load settings from lobby config
  GameSettings.load();

  // Initialize manifold audio system
  ManifoldAudio.init();

  // Scene - rich warm billiard room
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0a07);
  scene.fog = new THREE.FogExp2(0x0d0a07, 0.0006);

  // Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
  camera.position.set(0, 380, 520);
  camera.lookAt(0, 0, 0);

  // Renderer — photo-realistic PBR
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
    stencil: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.physicallyCorrectLights = true;
  container.appendChild(renderer.domElement);

  // ── ENVIRONMENT MAP — warm room reflections for PBR materials ──
  createEnvironmentMap();

  // Controls - always enabled for manual camera (default)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.minDistance = 200;
  controls.maxDistance = 1200;
  controls.maxPolarAngle = Math.PI / 2.1;  // Don't go below floor

  // Initialize CameraDirector with mode from settings
  CameraDirector.init();
  console.log(`📷 Camera mode: ${CameraDirector.mode}`);

  // Ingest art images onto the manifold, then create the room
  try { await ingestArt(); } catch (e) { console.warn('🎨 Art ingestion error:', e); }
  createBilliardRoom();

  // Lighting (billiard table lamp style)
  setupLighting();

  // Board group (sits on table)
  boardGroup = new THREE.Group();
  boardGroup.name = 'boardGroup';
  boardGroup.position.y = 90;  // Table height
  scene.add(boardGroup);

  // Peg group
  pegGroup = new THREE.Group();
  pegGroup.name = 'pegGroup';
  scene.add(pegGroup);

  // Create hexagonal billiard table
  createHexBilliardTable();

  // Create FastTrack board on table
  createHexagonBoard();
  createRainbowBorder();
  createGameElements();

  // Atmospheric dust motes
  createDustMotes();

  // Window resize
  window.addEventListener('resize', onWindowResize);

  // Expose systems globally so game-core can access them
  window.ManifoldAudio = ManifoldAudio;
  window.CameraDirector = CameraDirector;
  window.triggerPegPose = triggerPegPose;
  window.triggerWinCrown = triggerWinCrown;
  window.showGoldenCrown = showGoldenCrown;

  // Resume AudioContext on first user interaction (browser autoplay policy)
  const resumeAudio = () => {
    if (ManifoldAudio.ctx && ManifoldAudio.ctx.state === 'suspended') {
      ManifoldAudio.ctx.resume();
    }
    if (GameSettings.musicEnabled) ManifoldAudio.startMusic();
  };
  document.addEventListener('click', resumeAudio, { once: true });

  // Wire game logic → 3D renderer
  if (window.FastTrackCore) {
    window.FastTrackCore.setRenderer(renderBoard3D);

    // Get player count from lobby config or default to 2
    const cfg = JSON.parse(localStorage.getItem('fasttrack-lobby') || '{}');
    const playerCount = cfg.playerCount || 2;
    window.FastTrackCore.initGame(playerCount);
    window.FastTrackCore.updateUI();
    renderBoard3D();
    console.log(`🎮 Game initialized with ${playerCount} players`);
  }

  // Start animation
  animate3D();

  console.log('✅ FastTrack 3D Billiard Room initialized');
}

// ════════════════════════════════════════════════════════════════
// ENVIRONMENT MAP — warm room reflections via PMREMGenerator
// ════════════════════════════════════════════════════════════════
function createEnvironmentMap() {
  // Build a small procedural "room" scene for reflection capture
  const envScene = new THREE.Scene();

  // Warm ceiling light (dominant reflection source)
  const ceilPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshBasicMaterial({ color: 0xffeedd, side: THREE.DoubleSide })
  );
  ceilPlane.position.y = 100;
  ceilPlane.rotation.x = Math.PI / 2;
  envScene.add(ceilPlane);

  // Dark warm walls
  const wallMat = new THREE.MeshBasicMaterial({ color: 0x1a110a, side: THREE.DoubleSide });
  const addEnvWall = (px, py, pz, rx, ry) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(200, 100), wallMat);
    w.position.set(px, py, pz);
    w.rotation.set(rx || 0, ry || 0, 0);
    envScene.add(w);
  };
  addEnvWall(0, 50, -100, 0, 0);
  addEnvWall(0, 50, 100, 0, Math.PI);
  addEnvWall(-100, 50, 0, 0, Math.PI / 2);
  addEnvWall(100, 50, 0, 0, -Math.PI / 2);

  // Dark floor with slight warmth
  const floorPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshBasicMaterial({ color: 0x0a0705, side: THREE.DoubleSide })
  );
  floorPlane.rotation.x = -Math.PI / 2;
  envScene.add(floorPlane);

  // Warm accent lights in the env scene
  const envLight1 = new THREE.PointLight(0xffcc88, 1.5, 300);
  envLight1.position.set(0, 80, 0);
  envScene.add(envLight1);
  const envLight2 = new THREE.PointLight(0xff9944, 0.5, 200);
  envLight2.position.set(40, 60, 40);
  envScene.add(envLight2);

  // Generate PMREM environment map
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileCubemapShader();
  const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
  scene.environment = envMap;  // all PBR materials will pick this up
  pmremGenerator.dispose();
  console.log('🌍 Environment map generated');
}

// ════════════════════════════════════════════════════════════════
// PROCEDURAL NORMAL MAP GENERATOR — creates bump detail from canvas
// ════════════════════════════════════════════════════════════════
function generateNormalMap(canvas, strength) {
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');
  const src = ctx.getImageData(0, 0, w, h).data;
  const nCanvas = document.createElement('canvas');
  nCanvas.width = w; nCanvas.height = h;
  const nCtx = nCanvas.getContext('2d');
  const dst = nCtx.createImageData(w, h);
  const s = strength || 2.0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      // Sample neighbors for height gradient
      const getH = (cx, cy) => {
        const ci = (((cy + h) % h) * w + ((cx + w) % w)) * 4;
        return (src[ci] + src[ci + 1] + src[ci + 2]) / 765.0;
      };
      const dX = (getH(x + 1, y) - getH(x - 1, y)) * s;
      const dY = (getH(x, y + 1) - getH(x, y - 1)) * s;
      // Normal = normalize(-dX, -dY, 1)
      const len = Math.sqrt(dX * dX + dY * dY + 1);
      dst.data[idx]     = ((-dX / len) * 0.5 + 0.5) * 255;
      dst.data[idx + 1] = ((-dY / len) * 0.5 + 0.5) * 255;
      dst.data[idx + 2] = ((1.0 / len) * 0.5 + 0.5) * 255;
      dst.data[idx + 3] = 255;
    }
  }
  nCtx.putImageData(dst, 0, 0);
  const tex = new THREE.CanvasTexture(nCanvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ════════════════════════════════════════════════════════════════
// LIGHTING SETUP
// ════════════════════════════════════════════════════════════════
function setupLighting() {
  // ── AMBIENT — low base fill so shadows stay deep and contrasty ──
  const ambient = new THREE.AmbientLight(0xffd4a0, 0.15);
  scene.add(ambient);

  // ── HEMISPHERE — sky/ground color gradient, kept low for shadow depth ──
  const hemi = new THREE.HemisphereLight(0x8090b0, 0x1a1208, 0.18);
  scene.add(hemi);

  // ── KEY LIGHT — warm overhead directional (simulates billiard lamp) ──
  const keyLight = new THREE.DirectionalLight(0xffe8cc, 1.6);
  keyLight.position.set(0, ROOM_HEIGHT - 50, 0);
  keyLight.target.position.set(0, TABLE_HEIGHT, 0);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 4096;
  keyLight.shadow.mapSize.height = 4096;
  keyLight.shadow.camera.left = -400;
  keyLight.shadow.camera.right = 400;
  keyLight.shadow.camera.top = 400;
  keyLight.shadow.camera.bottom = -400;
  keyLight.shadow.camera.near = 50;
  keyLight.shadow.camera.far = 600;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);
  scene.add(keyLight.target);

  // ── SPOT LIGHTS — focused warm pools on the table (like recessed ceiling cans) ──
  const spotPositions = [
    { x: -120, z: -80 },
    { x: 120, z: -80 },
    { x: 0, z: 120 },
  ];
  spotPositions.forEach(sp => {
    const spot = new THREE.SpotLight(0xffeedd, 150, 500, Math.PI / 5, 0.6, 1.5);
    spot.position.set(sp.x, ROOM_HEIGHT - 20, sp.z);
    spot.target.position.set(sp.x * 0.3, TABLE_HEIGHT, sp.z * 0.3);
    spot.castShadow = true;
    spot.shadow.mapSize.width = 1024;
    spot.shadow.mapSize.height = 1024;
    scene.add(spot);
    scene.add(spot.target);
  });

  // ── FILL LIGHT — cool fill from camera direction (reduced for contrast) ──
  const fillLight = new THREE.DirectionalLight(0xc0d0e8, 0.2);
  fillLight.position.set(0, 200, 500);
  scene.add(fillLight);

  // ── RIM LIGHT — back-light for depth separation ──
  const rimLight = new THREE.DirectionalLight(0xffd0a0, 0.15);
  rimLight.position.set(0, 150, -400);
  scene.add(rimLight);

  // ── WALL WASH — subtle uplights to brighten the room walls ──
  const wallWashPositions = [
    { x: 0, z: -ROOM_DEPTH / 2 + 60 },    // back wall
    { x: -ROOM_WIDTH / 2 + 60, z: 0 },     // left wall
    { x: ROOM_WIDTH / 2 - 60, z: 0 },      // right wall
  ];
  wallWashPositions.forEach(wp => {
    const wash = new THREE.PointLight(0xffe0b0, 60, 400, 2);
    wash.position.set(wp.x, ROOM_HEIGHT - 30, wp.z);
    scene.add(wash);
  });

  // ── PICTURE DISPLAY LIGHTS — warm spotlights above each painting ──
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0x8B7535, roughness: 0.3, metalness: 0.8
  });

  ART_PLACEHOLDERS.forEach(art => {
    // Compute world position of this painting's top-center
    let lx, ly, lz, tx, ty, tz;
    const lightOffset = 40;  // how far in front of wall the light sits
    ly = art.y + art.height / 2 + 30; // above the painting
    ty = art.y;                        // aim at painting center

    if (art.wall === 'back') {
      lx = art.x; lz = -ROOM_DEPTH / 2 + lightOffset;
      tx = art.x; tz = -ROOM_DEPTH / 2 + 5;
    } else if (art.wall === 'left') {
      lx = -ROOM_WIDTH / 2 + lightOffset; lz = art.x;
      tx = -ROOM_WIDTH / 2 + 5; tz = art.x;
    } else {
      lx = ROOM_WIDTH / 2 - lightOffset; lz = art.x;
      tx = ROOM_WIDTH / 2 - 5; tz = art.x;
    }

    // Spotlight aimed at painting
    const picLight = new THREE.SpotLight(0xfff0d4, 120, 300, Math.PI / 6, 0.7, 1.5);
    picLight.position.set(lx, ly, lz);
    picLight.target.position.set(tx, ty, tz);
    scene.add(picLight);
    scene.add(picLight.target);

    // Display light fixture — small brass arm + shade
    const armGeo = new THREE.BoxGeometry(art.width * 0.5, 3, 4);
    const arm = new THREE.Mesh(armGeo, brassMat);
    const shadeGeo = new THREE.CylinderGeometry(3, 5, 6, 8);
    const shade = new THREE.Mesh(shadeGeo, brassMat);

    const fixtureGroup = new THREE.Group();
    fixtureGroup.add(arm);
    shade.position.set(0, -4, 2);
    shade.rotation.x = Math.PI / 6;
    fixtureGroup.add(shade);

    // Position fixture above painting on the wall
    if (art.wall === 'back') {
      fixtureGroup.position.set(art.x, art.y + art.height / 2 + 15, -ROOM_DEPTH / 2 + 6);
    } else if (art.wall === 'left') {
      fixtureGroup.position.set(-ROOM_WIDTH / 2 + 6, art.y + art.height / 2 + 15, art.x);
      fixtureGroup.rotation.y = Math.PI / 2;
    } else {
      fixtureGroup.position.set(ROOM_WIDTH / 2 - 6, art.y + art.height / 2 + 15, art.x);
      fixtureGroup.rotation.y = -Math.PI / 2;
    }
    scene.add(fixtureGroup);
  });

  // ── BULLSEYE GLOW — warm billiard-lamp amber accent over the center ──
  const centerLight = new THREE.PointLight(0xffcc44, 80, 220, 2);
  centerLight.position.set(0, TABLE_HEIGHT + 40, 0);
  scene.add(centerLight);
}

// ════════════════════════════════════════════════════════════════
// HEXAGON BOARD - Thick beveled base with dark playing surface
// ════════════════════════════════════════════════════════════════
function createHexagonBoard() {
  // --- BOARD BASE (tan/cream beveled box) --- flush against rail inner wall
  const baseShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI / 3) - Math.PI / 6;
    const x = Math.cos(angle) * (BOARD_RADIUS + RAIL_WIDTH);
    const y = Math.sin(angle) * (BOARD_RADIUS + RAIL_WIDTH);
    if (i === 0) baseShape.moveTo(x, y);
    else baseShape.lineTo(x, y);
  }
  baseShape.closePath();

  const baseSettings = {
    depth: BOARD_THICKNESS,
    bevelEnabled: true,
    bevelSize: BOARD_BEVEL,
    bevelThickness: BOARD_BEVEL * 0.6,
    bevelSegments: 4
  };
  const baseGeometry = new THREE.ExtrudeGeometry(baseShape, baseSettings);
  baseGeometry.rotateX(-Math.PI / 2);
  baseGeometry.translate(0, -BOARD_THICKNESS, 0);

  // Dark mahogany base matching billiard table rails
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a2a08,
    roughness: 0.35,
    metalness: 0.12
  });
  const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
  baseMesh.receiveShadow = true;
  baseMesh.castShadow = true;
  boardGroup.add(baseMesh);

  // --- PLAYING SURFACE (dark black) ---
  const surfaceShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI / 3) - Math.PI / 6;
    const x = Math.cos(angle) * (BOARD_RADIUS - 5);
    const y = Math.sin(angle) * (BOARD_RADIUS - 5);
    if (i === 0) surfaceShape.moveTo(x, y);
    else surfaceShape.lineTo(x, y);
  }
  surfaceShape.closePath();

  const surfaceGeometry = new THREE.ExtrudeGeometry(surfaceShape, { depth: 3, bevelEnabled: false });
  surfaceGeometry.rotateX(-Math.PI / 2);
  surfaceGeometry.translate(0, 0, 0);

  // ── BILLIARD FELT surface — procedural woven green baize (matches table) ──
  const boardFeltCanvas = document.createElement('canvas');
  boardFeltCanvas.width = 256; boardFeltCanvas.height = 256;
  const bfc = boardFeltCanvas.getContext('2d');
  bfc.fillStyle = '#0a6e1e';
  bfc.fillRect(0, 0, 256, 256);
  for (let fy = 0; fy < 256; fy++) {
    for (let fx = 0; fx < 256; fx += 2) {
      const noise = Math.random() * 10 - 5;
      const g = 42 + noise;
      bfc.fillStyle = `rgb(${18 + noise * 0.2}, ${g}, ${18 + noise * 0.2})`;
      bfc.fillRect(fx, fy, 2, 1);
    }
  }
  const boardFeltTex = new THREE.CanvasTexture(boardFeltCanvas);
  boardFeltTex.wrapS = boardFeltTex.wrapT = THREE.RepeatWrapping;
  boardFeltTex.repeat.set(5, 5);
  const surfaceMaterial = new THREE.MeshStandardMaterial({
    map: boardFeltTex,
    color: 0x0e7a24,
    roughness: 0.92,
    metalness: 0.0
  });
  boardMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  boardMesh.receiveShadow = true;
  boardGroup.add(boardMesh);

  // --- DECORATIVE STARS (gold stars at FT positions + scattered accents) ---
  createDecorativeStars();
  // Bullseye is created later in createGameElements() via createBullseye()
}

// ════════════════════════════════════════════════════════════════
// RAINBOW BORDER - Thick raised 3D segments
// ════════════════════════════════════════════════════════════════
function createRainbowBorder() {
  for (let i = 0; i < 6; i++) {
    const angle1 = (i * Math.PI / 3) - Math.PI / 6;
    const angle2 = ((i + 1) * Math.PI / 3) - Math.PI / 6;

    const x1 = Math.cos(angle1) * (BOARD_RADIUS + 8);
    const z1 = Math.sin(angle1) * (BOARD_RADIUS + 8);
    const x2 = Math.cos(angle2) * (BOARD_RADIUS + 8);
    const z2 = Math.sin(angle2) * (BOARD_RADIUS + 8);

    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const length = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
    const edgeAngle = Math.atan2(z2 - z1, x2 - x1);

    // Lacquered rail segment — deep billiard-room polish, subtle color glow
    const geometry = new THREE.BoxGeometry(length * 0.92, BORDER_HEIGHT, BORDER_WIDTH, 1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: RAINBOW_COLORS[i],
      roughness: 0.22,
      metalness: 0.30,
      emissive: new THREE.Color(RAINBOW_COLORS[i]),
      emissiveIntensity: 0.05,
      envMapIntensity: 0.8
    });

    const segment = new THREE.Mesh(geometry, material);
    segment.position.set(midX, BORDER_HEIGHT / 2 + 3, midZ);
    segment.rotation.y = -edgeAngle;
    segment.castShadow = true;
    boardGroup.add(segment);
  }
}

// ════════════════════════════════════════════════════════════════
// DECORATIVE STARS - Gold stars at FT inner-hex vertices + small
//                   accent stars at outer-edge midpoints
// ════════════════════════════════════════════════════════════════
function makeStarShape(outerR, innerR, spikes = 5) {
  const shape = new THREE.Shape();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const sx = Math.cos(a) * r;
    const sy = Math.sin(a) * r;
    if (i === 0) shape.moveTo(sx, sy); else shape.lineTo(sx, sy);
  }
  shape.closePath();
  return shape;
}

function createDecorativeStars() {
  const FT_RADIUS = BOARD_RADIUS * 0.42;
  const OUTER_RADIUS = BOARD_RADIUS * 0.88;

  // ── LARGE GOLD STARS at each of the 6 FT inner-hex vertex positions ──
  const ftStarMat = new THREE.MeshBasicMaterial({
    color: 0xffdd00,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  for (let p = 0; p < 6; p++) {
    const angle = (p / 6) * Math.PI * 2 - Math.PI / 6;
    const fx = Math.cos(angle) * FT_RADIUS;
    const fz = Math.sin(angle) * FT_RADIUS;

    const starGeo = new THREE.ShapeGeometry(makeStarShape(18, 7, 5));
    starGeo.rotateX(-Math.PI / 2);
    const star = new THREE.Mesh(starGeo, ftStarMat);
    star.position.set(fx, LINE_HEIGHT - 5, fz);
    star.renderOrder = 2;
    boardGroup.add(star);
  }

  // ── SMALL WHITE ACCENT STARS at each outer-edge midpoint ──
  const accentMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.55,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  for (let p = 0; p < 6; p++) {
    const a1 = (p / 6) * Math.PI * 2 - Math.PI / 6;
    const a2 = ((p + 1) / 6) * Math.PI * 2 - Math.PI / 6;
    const mx = (Math.cos(a1) + Math.cos(a2)) / 2 * OUTER_RADIUS;
    const mz = (Math.sin(a1) + Math.sin(a2)) / 2 * OUTER_RADIUS;

    const aGeo = new THREE.ShapeGeometry(makeStarShape(7, 3, 4));
    aGeo.rotateX(-Math.PI / 2);
    const aStar = new THREE.Mesh(aGeo, accentMat);
    aStar.position.set(mx * 0.55, LINE_HEIGHT - 5, mz * 0.55);
    aStar.renderOrder = 2;
    boardGroup.add(aStar);
  }
}


// ════════════════════════════════════════════════════════════════
// GAME ELEMENTS - 14 holes per player section (84 track + 49 off-track = 133 total)
// Core IDs: ft-{p}, side-left-{p}-{4..1}, outer-{p}-{0..3}, home-{p},
//           side-right-{p}-{1..4}, safe-{p}-{1..4}, hold-{p}-{0..3}
// ════════════════════════════════════════════════════════════════
function createGameElements() {
  const FT_RADIUS = BOARD_RADIUS * 0.42;
  const OUTER_RADIUS = BOARD_RADIUS * 0.88;
  const OUTER_INSET = 15; // inset from outer edge so holes sit on felt
  const SIDE_GAP = 20;    // gap near FT hole so sides don't overlap it
  const sideTrackLength = OUTER_RADIUS - FT_RADIUS - SIDE_GAP;
  const holeSpacing = sideTrackLength / 5; // consistent spacing (~21 units)

  for (let p = 0; p < 6; p++) {
    const cornerAngle = (p / 6) * Math.PI * 2 - Math.PI / 6;
    const nextCornerAngle = ((p + 1) / 6) * Math.PI * 2 - Math.PI / 6;

    // Direction vectors for this wedge
    const wedgeMidAngle = (cornerAngle + nextCornerAngle) / 2;
    const radialDirX = Math.cos(wedgeMidAngle);   // points outward from center
    const radialDirZ = Math.sin(wedgeMidAngle);
    const tangentDirX = -radialDirZ;              // along outer edge (left→right)
    const tangentDirZ = radialDirX;
    const inwardDirX = -radialDirX;               // points toward center
    const inwardDirZ = -radialDirZ;

    // Outer edge center point
    const outerCenterX = radialDirX * (OUTER_RADIUS - OUTER_INSET);
    const outerCenterZ = radialDirZ * (OUTER_RADIUS - OUTER_INSET);

    // FastTrack hole (inner hex vertex)
    const ftX = Math.cos(cornerAngle) * FT_RADIUS;
    const ftZ = Math.sin(cornerAngle) * FT_RADIUS;
    createFastTrackHole(`ft-${p}`, p, ftX, LINE_HEIGHT - 2, ftZ);

    // ── OUTER EDGE: 5 holes centered on outer edge along tangent ──
    // Positions: indices 0..4 → offsets (-2,-1,0,1,2) × holeSpacing
    const outerPositions = [];
    for (let h = 0; h < 5; h++) {
      const offset = (h - 2) * holeSpacing;
      const x = outerCenterX + tangentDirX * offset;
      const z = outerCenterZ + tangentDirZ * offset;
      outerPositions.push({ x, z });

      if (h < 4) {
        // outer-0..3
        createHole(`outer-${p}-${h}`, 'outer', p, x, LINE_HEIGHT - 2, z, null, {
          isOuterTrack: true,
          isSafeZoneEntry: h === 2
        });
      } else {
        // h === 4 → home hole
        createHole(`home-${p}`, 'home', p, x, LINE_HEIGHT - 2, z, 'diamond', {
          isOuterTrack: true, isHome: true
        });
      }
    }

    // Left/right corner positions (outermost outer holes)
    const leftCornerX = outerPositions[0].x;
    const leftCornerZ = outerPositions[0].z;
    const rightCornerX = outerPositions[4].x;
    const rightCornerZ = outerPositions[4].z;

    // ── SIDE-LEFT: 4 holes from left corner TOWARD ft-{p} (contiguous path) ──
    const leftToFtX = ftX - leftCornerX;
    const leftToFtZ = ftZ - leftCornerZ;
    const leftToFtLen = Math.sqrt(leftToFtX * leftToFtX + leftToFtZ * leftToFtZ);
    const leftDirX = leftToFtX / leftToFtLen;
    const leftDirZ = leftToFtZ / leftToFtLen;
    // Space 4 holes evenly, leaving a gap near FT hole
    const leftStep = (leftToFtLen - SIDE_GAP) / 4;
    for (let h = 1; h <= 4; h++) {
      const x = leftCornerX + leftDirX * (h * leftStep);
      const z = leftCornerZ + leftDirZ * (h * leftStep);
      createHole(`side-left-${p}-${h}`, 'side-left', p, x, LINE_HEIGHT - 2, z, null, {
        isOuterTrack: true,
        isFastTrackEntry: h === 4
      });
    }

    // ── SIDE-RIGHT: 4 holes from right corner TOWARD ft-{(p+1)%6} (contiguous path) ──
    const nextFtX = Math.cos(nextCornerAngle) * FT_RADIUS;
    const nextFtZ = Math.sin(nextCornerAngle) * FT_RADIUS;
    const rightToFtX = nextFtX - rightCornerX;
    const rightToFtZ = nextFtZ - rightCornerZ;
    const rightToFtLen = Math.sqrt(rightToFtX * rightToFtX + rightToFtZ * rightToFtZ);
    const rightDirX = rightToFtX / rightToFtLen;
    const rightDirZ = rightToFtZ / rightToFtLen;
    const rightStep = (rightToFtLen - SIDE_GAP) / 4;
    for (let h = 1; h <= 4; h++) {
      const x = rightCornerX + rightDirX * (h * rightStep);
      const z = rightCornerZ + rightDirZ * (h * rightStep);
      createHole(`side-right-${p}-${h}`, 'side-right', p, x, LINE_HEIGHT - 2, z, null, {
        isOuterTrack: true
      });
    }

    // ── SAFE ZONE: 4 holes inward from outer-2 (center of edge) along radial ──
    const safeCenterX = outerPositions[2].x;
    const safeCenterZ = outerPositions[2].z;
    createSafeZoneEnclosure(p, safeCenterX, safeCenterZ, wedgeMidAngle);

    for (let s = 1; s <= 4; s++) {
      const x = safeCenterX + inwardDirX * (s * holeSpacing);
      const z = safeCenterZ + inwardDirZ * (s * holeSpacing);
      createHole(`safe-${p}-${s}`, 'safezone', p, x, LINE_HEIGHT - 2, z, null, { isSafeZone: true });
    }

    // ── HOLDING AREA: 4 holes in 2×2 grid, to the left of home hole ──
    // Sits in the empty space between home hole and next section's side-right,
    // shifted along tangent (away from outer track) and slightly inward.
    const homeX = rightCornerX;
    const homeZ = rightCornerZ;
    // Shift left along tangent (into gap between sections) and slightly inward
    const holdCenterX = homeX + tangentDirX * holeSpacing * 1.5 + inwardDirX * holeSpacing * 0.6;
    const holdCenterZ = homeZ + tangentDirZ * holeSpacing * 1.5 + inwardDirZ * holeSpacing * 0.6;
    const holdAngle = Math.atan2(holdCenterZ, holdCenterX);
    const holdRadius = Math.sqrt(holdCenterX * holdCenterX + holdCenterZ * holdCenterZ);
    createHoldingAreaEnclosure(p, holdAngle, holdRadius);

    const holdSpacing = 14;
    const holdOffsets = [
      [-holdSpacing / 2, -holdSpacing / 2],
      [ holdSpacing / 2, -holdSpacing / 2],
      [-holdSpacing / 2,  holdSpacing / 2],
      [ holdSpacing / 2,  holdSpacing / 2]
    ];
    for (let h = 0; h < 4; h++) {
      const [localX, localZ] = holdOffsets[h];
      // Rotate grid to align with wedge
      const rotX = localX * tangentDirX + localZ * inwardDirX;
      const rotZ = localX * tangentDirZ + localZ * inwardDirZ;
      createHole(`hold-${p}-${h}`, 'holding', p, holdCenterX + rotX, LINE_HEIGHT - 2, holdCenterZ + rotZ, null, { isHolding: true });
    }
  }

  // Create bullseye (center)
  createBullseye();

  console.log(`✅ Created ${holeRegistry.size} holes (expected 133) for 6 players`);
}

// ════════════════════════════════════════════════════════════════
// SAFE ZONE ENCLOSURE - Colored rounded rectangle
// ════════════════════════════════════════════════════════════════
function createSafeZoneEnclosure(playerIdx, startX, startZ, angle) {
  const color = RAINBOW_COLORS[playerIdx];
  const length = 105;
  const width = 22;
  const radius = 8;

  // Create rounded rectangle shape
  const shape = new THREE.Shape();
  const hw = width / 2 - radius;
  const hl = length / 2 - radius;

  shape.moveTo(-hw, -hl - radius);
  shape.lineTo(hw, -hl - radius);
  shape.quadraticCurveTo(hw + radius, -hl - radius, hw + radius, -hl);
  shape.lineTo(hw + radius, hl);
  shape.quadraticCurveTo(hw + radius, hl + radius, hw, hl + radius);
  shape.lineTo(-hw, hl + radius);
  shape.quadraticCurveTo(-hw - radius, hl + radius, -hw - radius, hl);
  shape.lineTo(-hw - radius, -hl);
  shape.quadraticCurveTo(-hw - radius, -hl - radius, -hw, -hl - radius);

  const extrudeSettings = { depth: 6, bevelEnabled: true, bevelSize: 2, bevelThickness: 1 };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.45,
    metalness: 0.25,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.10,
    transparent: true,
    opacity: 0.92
  });

  const mesh = new THREE.Mesh(geometry, material);

  // Position at center of the 4 safe zone holes
  // Safe zone holes are at s=1..4 inward from startX/startZ
  // Center is at s=2.5 offset along the inward direction
  const inwardDirX = -Math.cos(angle);
  const inwardDirZ = -Math.sin(angle);
  const holeSpacing = 20;
  const centerX = startX + inwardDirX * (2.8 * holeSpacing);
  const centerZ = startZ + inwardDirZ * (2.8 * holeSpacing);

  mesh.position.set(centerX, 5, centerZ);
  mesh.rotation.y = -angle + Math.PI / 2;
  mesh.castShadow = true;
  boardGroup.add(mesh);
}

// ════════════════════════════════════════════════════════════════
// HOLDING AREA ENCLOSURE - Colored circle
// ════════════════════════════════════════════════════════════════
function createHoldingAreaEnclosure(playerIdx, holdAngle, holdRadius) {
  const color = RAINBOW_COLORS[playerIdx];
  const holdX = Math.cos(holdAngle) * holdRadius;
  const holdZ = Math.sin(holdAngle) * holdRadius;

  // Outer circle
  const outerGeo = new THREE.CircleGeometry(28, 32);
  outerGeo.rotateX(-Math.PI / 2);
  const outerMat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.3,
    metalness: 0.5,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.15
  });
  const outer = new THREE.Mesh(outerGeo, outerMat);
  outer.position.set(holdX, 7, holdZ);
  boardGroup.add(outer);

  // Inner dark circle (dark green felt pocket look)
  const innerGeo = new THREE.CircleGeometry(22, 32);
  innerGeo.rotateX(-Math.PI / 2);
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x071007,
    roughness: 0.9
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.position.set(holdX, 7.5, holdZ);
  boardGroup.add(inner);
}

function createHole(id, type, playerIdx, x, y, z, shape, props = {}) {
  const radius = type === 'outer' ? TRACK_HOLE_RADIUS : HOLE_RADIUS;

  // ── DARK HOLE — sunken-looking depression ──
  const geometry = new THREE.CylinderGeometry(radius, radius, 6, 20);
  const material = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.95 });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y - 1, z);
  boardGroup.add(mesh);

  // Add diamond marker for HOME holes — extruded to match hole depth, with center cutout
  if (shape === 'diamond') {
    const dSize = 17;
    const diamondShape = new THREE.Shape();
    diamondShape.moveTo(0, dSize);
    diamondShape.lineTo(dSize * 0.7, 0);
    diamondShape.lineTo(0, -dSize);
    diamondShape.lineTo(-dSize * 0.7, 0);
    diamondShape.closePath();

    // Cut out center circle so the hole remains visible
    const holeCutout = new THREE.Path();
    const cutRadius = HOLE_RADIUS + 0.5;
    for (let a = 0; a <= 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      const cx = Math.cos(ang) * cutRadius;
      const cz = Math.sin(ang) * cutRadius;
      if (a === 0) holeCutout.moveTo(cx, cz);
      else holeCutout.lineTo(cx, cz);
    }
    holeCutout.closePath();
    diamondShape.holes.push(holeCutout);

    const diamondGeo = new THREE.ExtrudeGeometry(diamondShape, { depth: 5, bevelEnabled: false });
    diamondGeo.rotateX(-Math.PI / 2);
    const diamondMat = new THREE.MeshStandardMaterial({
      color: RAINBOW_COLORS[playerIdx],
      roughness: 0.2,
      metalness: 0.6,
      emissive: new THREE.Color(RAINBOW_COLORS[playerIdx]),
      emissiveIntensity: 0.3
    });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.set(x, y - 2.5, z);
    boardGroup.add(diamond);
  }

  holeRegistry.set(id, { id, type, playerIdx, position: { x, y, z }, mesh, ...props });
  return holeRegistry.get(id);
}

function createFastTrackHole(id, playerIdx, x, y, z) {
  // Pentagon shape (LEVEL_3 = 21)
  const PENTAGON_SIZE = 21;
  const pentShape = new THREE.Shape();
  for (let p = 0; p < 5; p++) {
    const pentAngle = (p * 2 * Math.PI / 5) - Math.PI / 2;
    const px = Math.cos(pentAngle) * PENTAGON_SIZE;
    const pz = Math.sin(pentAngle) * PENTAGON_SIZE;
    if (p === 0) pentShape.moveTo(px, pz);
    else pentShape.lineTo(px, pz);
  }
  pentShape.closePath();

  // Cut hole in center
  const holePath = new THREE.Path();
  for (let h = 0; h < 32; h++) {
    const hAngle = (h * 2 * Math.PI / 32);
    const hx = Math.cos(hAngle) * HOLE_RADIUS;
    const hz = Math.sin(hAngle) * HOLE_RADIUS;
    if (h === 0) holePath.moveTo(hx, hz);
    else holePath.lineTo(hx, hz);
  }
  holePath.closePath();
  pentShape.holes.push(holePath);

  const pentGeo = new THREE.ShapeGeometry(pentShape);
  // FT pentagon: bright lacquer so it reads against green felt
  const pentMat = new THREE.MeshStandardMaterial({
    color: RAINBOW_COLORS[playerIdx],
    roughness: 0.18,
    metalness: 0.55,
    emissive: new THREE.Color(RAINBOW_COLORS[playerIdx]),
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3
  });

  const pentagon = new THREE.Mesh(pentGeo, pentMat);
  pentagon.rotation.x = -Math.PI / 2;
  pentagon.position.set(x, 7, z);
  pentagon.renderOrder = 1;
  boardGroup.add(pentagon);

  // Create the actual hole
  const holeGeo = new THREE.CylinderGeometry(HOLE_RADIUS, HOLE_RADIUS, 5, 16);
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
  const holeMesh = new THREE.Mesh(holeGeo, holeMat);
  holeMesh.position.set(x, y, z);
  boardGroup.add(holeMesh);

  holeRegistry.set(id, { id, type: 'fasttrack', playerIdx, position: { x, y, z }, mesh: holeMesh, isFastTrack: true });
}

function createBullseye() {
  const CENTER_HOLE_RADIUS = 8;
  const RING_WIDTH = 13;

  // Concentric colored rings
  for (let r = 5; r >= 0; r--) {
    const outerR = CENTER_HOLE_RADIUS + RING_WIDTH * (r + 1);
    const innerR = CENTER_HOLE_RADIUS + RING_WIDTH * r;

    const ringShape = new THREE.Shape();
    for (let a = 0; a <= 64; a++) {
      const angle = (a / 64) * Math.PI * 2;
      const x = Math.cos(angle) * outerR;
      const z = Math.sin(angle) * outerR;
      if (a === 0) ringShape.moveTo(x, z);
      else ringShape.lineTo(x, z);
    }
    ringShape.closePath();

    const innerHole = new THREE.Path();
    for (let a = 0; a <= 64; a++) {
      const angle = (a / 64) * Math.PI * 2;
      const x = Math.cos(angle) * innerR;
      const z = Math.sin(angle) * innerR;
      if (a === 0) innerHole.moveTo(x, z);
      else innerHole.lineTo(x, z);
    }
    innerHole.closePath();
    ringShape.holes.push(innerHole);

    const ringGeo = new THREE.ShapeGeometry(ringShape);
    // Increase emissive so rings pop against new green felt surface
    const ringMat = new THREE.MeshStandardMaterial({
      color: RAINBOW_COLORS[r],
      roughness: 0.25,
      metalness: 0.45,
      emissive: new THREE.Color(RAINBOW_COLORS[r]),
      emissiveIntensity: 0.55
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = LINE_HEIGHT + 1;
    boardGroup.add(ring);
  }

  // Center hole
  const centerHoleGeo = new THREE.CylinderGeometry(CENTER_HOLE_RADIUS, CENTER_HOLE_RADIUS, 5, 32);
  const centerHoleMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const centerHoleMesh = new THREE.Mesh(centerHoleGeo, centerHoleMat);
  centerHoleMesh.position.set(0, LINE_HEIGHT - 2, 0);
  boardGroup.add(centerHoleMesh);

  holeRegistry.set('bullseye', { id: 'bullseye', type: 'bullseye', playerIdx: -1, position: { x: 0, y: LINE_HEIGHT - 2, z: 0 }, mesh: centerHoleMesh });

  // ── FAST TRACK LOGO — procedural text ring around bullseye ──
  const logoRadius = CENTER_HOLE_RADIUS + RING_WIDTH * 6 + 12; // just outside colored rings
  const logoCanvas = document.createElement('canvas');
  logoCanvas.width = 512; logoCanvas.height = 512;
  const lctx = logoCanvas.getContext('2d');

  // Transparent background
  lctx.clearRect(0, 0, 512, 512);
  const cx = 256, cy = 256, r = 220;

  // Outer gold trim ring
  lctx.beginPath();
  lctx.arc(cx, cy, r + 14, 0, Math.PI * 2);
  lctx.arc(cx, cy, r + 6, 0, Math.PI * 2, true);
  lctx.fillStyle = 'rgba(255, 200, 40, 0.7)';
  lctx.fill();

  // Inner gold trim ring
  lctx.beginPath();
  lctx.arc(cx, cy, r - 18, 0, Math.PI * 2);
  lctx.arc(cx, cy, r - 26, 0, Math.PI * 2, true);
  lctx.fillStyle = 'rgba(255, 200, 40, 0.7)';
  lctx.fill();

  // Draw text normally on canvas — the 3D mesh rotation handles orientation

  // Helper: draw text along a circular arc
  function drawArcText(ctx, text, ctrX, ctrY, radius, centerAngle, charSpacing, topSide) {
    ctx.save();
    ctx.font = 'bold 36px "Georgia", serif';
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const totalSpan = (text.length - 1) * charSpacing;
    const startAngle = centerAngle - totalSpan / 2;
    for (let i = 0; i < text.length; i++) {
      const angle = startAngle + i * charSpacing;
      const tx = ctrX + Math.cos(angle) * radius;
      const ty = ctrY + Math.sin(angle) * radius;
      ctx.save();
      ctx.translate(tx, ty);
      // topSide: letters face outward from top; bottom: letters face outward from bottom
      ctx.rotate(angle + (topSide ? Math.PI / 2 : -Math.PI / 2));
      ctx.strokeText(text[i], 0, 0);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  // Top arc: "✦ FAST TRACK ✦" — centered at -PI/2 (top of circle)
  const topText = '\u2726 F A S T   T R A C K \u2726';
  drawArcText(lctx, topText, cx, cy, r - 8, -Math.PI / 2, 0.085, true);

  // Bottom arc: "★ CHAMPION ★" — centered at PI/2 (bottom of circle)
  const botText = '\u2605 C H A M P I O N \u2605';
  drawArcText(lctx, botText, cx, cy, r - 8, Math.PI / 2, -0.085, false);



  // Small decorative speed lines between text arcs
  lctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
  lctx.lineWidth = 2;
  for (let side = 0; side < 2; side++) {
    const baseAngle = side === 0 ? -Math.PI * 0.22 : Math.PI * 0.78;
    for (let ln = 0; ln < 3; ln++) {
      const a = baseAngle + ln * 0.06;
      lctx.beginPath();
      lctx.moveTo(Math.cos(a) * (r - 20), Math.sin(a) * (r - 20));
      lctx.lineTo(Math.cos(a) * (r + 8), Math.sin(a) * (r + 8));
      lctx.stroke();
    }
  }

  lctx.restore();

  // Create circular plane mesh for the logo
  const logoTex = new THREE.CanvasTexture(logoCanvas);
  const logoGeo = new THREE.CircleGeometry(logoRadius + 16, 64);
  logoGeo.rotateX(-Math.PI / 2);
  const logoMat = new THREE.MeshStandardMaterial({
    map: logoTex,
    transparent: true,
    roughness: 0.3,
    metalness: 0.4,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3
  });
  const logoMesh = new THREE.Mesh(logoGeo, logoMat);
  logoMesh.position.set(0, LINE_HEIGHT + 0.5, 0);
  // no extra rotation — geometry already has rotateX(-PI/2) baked in
  logoMesh.renderOrder = 3;
  boardGroup.add(logoMesh);
}

// ════════════════════════════════════════════════════════════════
// PLAYER MARKER SPRITES — avatar + name on rails
// ════════════════════════════════════════════════════════════════
let _playerMarkerSprites = [];

function createPlayerMarkerSprite(name, color, avatar) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');

  // Measure text to size the pill
  const displayText = `${avatar || '🎮'} ${name}`;
  ctx.font = 'bold 20px Arial';
  const tw = ctx.measureText(displayText).width;
  const pillW = Math.min(tw + 28, 248);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = 18;

  // Rounded-rect pill background with player color border
  ctx.beginPath();
  ctx.moveTo(cx - pillW / 2 + r, cy - r);
  ctx.lineTo(cx + pillW / 2 - r, cy - r);
  ctx.arcTo(cx + pillW / 2, cy - r, cx + pillW / 2, cy, r);
  ctx.arcTo(cx + pillW / 2, cy + r, cx + pillW / 2 - r, cy + r, r);
  ctx.lineTo(cx - pillW / 2 + r, cy + r);
  ctx.arcTo(cx - pillW / 2, cy + r, cx - pillW / 2, cy, r);
  ctx.arcTo(cx - pillW / 2, cy - r, cx - pillW / 2 + r, cy - r, r);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fill();
  ctx.strokeStyle = color || '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Text
  ctx.fillStyle = color || '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayText, cx, cy + 1);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(50, 16, 1);
  sprite.renderOrder = 100;
  return sprite;
}

function updatePlayerMarkers() {
  if (!window.FastTrackCore) return;
  const players = window.FastTrackCore.state.players.get('list') || [];

  // Hide all first
  _playerMarkerSprites.forEach(s => { s.visible = false; });

  // For each player, show their marker at their board position
  players.forEach(p => {
    const bp = p.boardPosition;
    if (bp >= 0 && bp < _playerMarkerSprites.length) {
      const oldSprite = _playerMarkerSprites[bp];
      const pos = oldSprite.position.clone();
      const avatar = p.isBot ? '🤖' : '🎮';

      // Remove old sprite, create new one with player info
      scene.remove(oldSprite);
      if (oldSprite.material) { oldSprite.material.map?.dispose(); oldSprite.material.dispose(); }

      const newSprite = createPlayerMarkerSprite(p.name, p.color, avatar);
      newSprite.position.copy(pos);
      newSprite.visible = true;
      newSprite.userData.boardPosition = bp;
      scene.add(newSprite);
      _playerMarkerSprites[bp] = newSprite;
    }
  });
}

function blinkPlayerMarker(playerIdx, onDone) {
  if (!window.FastTrackCore) { if (onDone) onDone(); return; }
  const players = window.FastTrackCore.state.players.get('list') || [];
  if (playerIdx < 0 || playerIdx >= players.length) { if (onDone) onDone(); return; }
  const bp = players[playerIdx].boardPosition;
  const sprite = _playerMarkerSprites[bp];
  if (!sprite) { if (onDone) onDone(); return; }

  let count = 0;
  const totalBlinks = 3;
  const interval = setInterval(() => {
    sprite.visible = !sprite.visible;
    count++;
    if (count >= totalBlinks * 2) {
      clearInterval(interval);
      sprite.visible = true; // ensure visible at end
      if (onDone) onDone();
    }
  }, 180);
}

// ════════════════════════════════════════════════════════════════
// PEG NAME TOOLTIPS — floating name labels above pegs
// ════════════════════════════════════════════════════════════════
function createPegNameSprite(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Measure text to size the pill
  ctx.font = 'bold 24px Arial';
  const tw = ctx.measureText(name).width;
  const pillW = Math.min(tw + 24, 250);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = 16;

  // Rounded-rect pill background
  ctx.beginPath();
  ctx.moveTo(cx - pillW / 2 + r, cy - r);
  ctx.lineTo(cx + pillW / 2 - r, cy - r);
  ctx.arcTo(cx + pillW / 2, cy - r, cx + pillW / 2, cy, r);
  ctx.arcTo(cx + pillW / 2, cy + r, cx + pillW / 2 - r, cy + r, r);
  ctx.lineTo(cx - pillW / 2 + r, cy + r);
  ctx.arcTo(cx - pillW / 2, cy + r, cx - pillW / 2, cy, r);
  ctx.arcTo(cx - pillW / 2, cy - r, cx - pillW / 2 + r, cy - r, r);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Name text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, cx, cy + 1);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(spriteMat);
  // Wider than tall to match pill shape (256:64 = 4:1 canvas, scale accordingly)
  sprite.scale.set(40, 10, 1);
  sprite.renderOrder = 100;
  return sprite;
}

function showPegNames(pegNameMap) {
  // pegNameMap: { pegId: nickname, ... }
  // First, hide names for pegs NOT in the map (e.g. bumped back to holding)
  pegRegistry.forEach((peg, id) => {
    if (!pegNameMap[id] && peg.nameSprite) {
      peg.nameSprite.visible = false;
    }
  });
  // Then show/create names for pegs IN the map
  for (const [pegId, name] of Object.entries(pegNameMap)) {
    const peg = pegRegistry.get(pegId);
    if (!peg) continue;
    // Remove old sprite if it exists
    if (peg.nameSprite) {
      peg.mesh.remove(peg.nameSprite);
      if (peg.nameSprite.material.map) peg.nameSprite.material.map.dispose();
      peg.nameSprite.material.dispose();
    }
    const sprite = createPegNameSprite(name);
    sprite.position.y = PEG_HEIGHT + 20;
    sprite.visible = true;
    peg.mesh.add(sprite);
    peg.nameSprite = sprite;
  }
}

function hidePegNames() {
  pegRegistry.forEach(peg => {
    if (peg.nameSprite) {
      peg.nameSprite.visible = false;
    }
  });
}

// ════════════════════════════════════════════════════════════════
// PEG CREATION - Tall Light Bright style with intense glow
// ════════════════════════════════════════════════════════════════
function createPeg(id, playerIndex, holeId, colorIndex = null) {
  const colorIdx = colorIndex !== null ? colorIndex : playerIndex;
  const color = RAINBOW_COLORS[colorIdx];
  const hole = holeRegistry.get(holeId);

  if (!hole) {
    console.warn(`[createPeg] Hole ${holeId} not found`);
    return null;
  }

  const pegGroup = new THREE.Group();

  // ── OUTER SHELL — translucent colored glass ──
  const bodyGeo = new THREE.CylinderGeometry(PEG_TOP_RADIUS, PEG_BOTTOM_RADIUS, PEG_HEIGHT, 32);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.08,
    metalness: 0.15,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.75,
    envMapIntensity: 1.5
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  bodyMesh.position.y = PEG_HEIGHT / 2;
  pegGroup.add(bodyMesh);

  // ── FLAT TOP CAP — disc with slight bevel ──
  const capGeo = new THREE.CylinderGeometry(PEG_TOP_RADIUS, PEG_TOP_RADIUS, 2.5, 32);
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0.1,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.88,
    envMapIntensity: 2.0
  });

  const domeMesh = new THREE.Mesh(capGeo, domeMat);
  domeMesh.position.y = PEG_HEIGHT + 1.25;
  domeMesh.castShadow = true;
  pegGroup.add(domeMesh);

  // ── INNER CORE — bright saturated glow filament ──
  const coreGeo = new THREE.CylinderGeometry(PEG_BOTTOM_RADIUS * 0.5, PEG_BOTTOM_RADIUS * 0.35, PEG_HEIGHT * 0.85, 16);
  const coreMat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.5
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.position.y = PEG_HEIGHT / 2;
  pegGroup.add(coreMesh);

  // ── NAME SPRITE — created on demand by showPegNames ──

  // Position on top of hole (holes are in boardGroup at y=90, pegs in scene)
  const boardY = boardGroup ? boardGroup.position.y : 90;
  pegGroup.position.set(hole.position.x, boardY + hole.position.y + 8, hole.position.z);
  pegGroup.name = id;
  pegGroup.userData.pegId = id;
  pegGroup.userData.playerIndex = playerIndex;
  pegGroup.userData.holeId = holeId;

  // Add to scene (pegs render above board)
  scene.add(pegGroup);

  const pegData = {
    id,
    playerIndex,
    holeId,
    color,
    mesh: pegGroup,
    bodyMesh,
    domeMesh,
    nameSprite: null
  };

  pegRegistry.set(id, pegData);
  console.log(`🎯 Created peg ${id} for player ${playerIndex} at ${holeId}`);
  return pegData;
}

function removePeg(id) {
  const peg = pegRegistry.get(id);
  if (peg && peg.mesh) {
    scene.remove(peg.mesh);  // Remove from scene, not pegGroup
    pegRegistry.delete(id);
    console.log(`🗑️ Removed peg ${id}`);
  }
}

// Personality → hop style mapping
const HOP_STYLES = {
  AGGRESSIVE:  { arcMult: 0.6, speedMult: 0.7, spinSpeed: 8, bounces: 0, wobble: 0,    squash: 0.05 },
  APOLOGETIC:  { arcMult: 0.3, speedMult: 1.3, spinSpeed: 0, bounces: 0, wobble: 0.08, squash: 0.1  },
  SMUG:        { arcMult: 0.5, speedMult: 1.0, spinSpeed: 2, bounces: 0, wobble: 0,    squash: 0.02 },
  TIMID:       { arcMult: 0.2, speedMult: 1.5, spinSpeed: 0, bounces: 2, wobble: 0.15, squash: 0.15 },
  CHEERFUL:    { arcMult: 0.5, speedMult: 0.9, spinSpeed: 4, bounces: 1, wobble: 0.05, squash: 0.08 },
  DRAMATIC:    { arcMult: 0.8, speedMult: 0.8, spinSpeed: 6, bounces: 0, wobble: 0,    squash: 0.03 },
};

function movePeg(id, toHoleId, onComplete) {
  const peg = pegRegistry.get(id);
  const toHole = holeRegistry.get(toHoleId);

  if (!peg || !toHole) {
    if (onComplete) onComplete();
    return;
  }

  // Look up personality from game state
  let style = HOP_STYLES.CHEERFUL; // default
  if (window.FastTrackCore) {
    const players = window.FastTrackCore.state.players.get('list') || [];
    for (const pl of players) {
      const found = pl.pegs.find(p => `peg-${pl.color}-${pl.pegs.indexOf(p)}` === id);
      if (found && found.personality && HOP_STYLES[found.personality]) {
        style = HOP_STYLES[found.personality];
        break;
      }
    }
  }

  const startPos = peg.mesh.position.clone();
  const boardY = boardGroup ? boardGroup.position.y : 90;
  const endPos = new THREE.Vector3(toHole.position.x, boardY + toHole.position.y + 8, toHole.position.z);
  const distance = startPos.distanceTo(endPos);
  const arcHeight = Math.min(80, distance * style.arcMult);
  const duration = Math.min(1500, (400 + distance * 2) * style.speedMult);
  const startScale = peg.mesh.scale.clone();

  const startTime = performance.now();
  let hopSoundPlayed = false;

  function animateHop() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(1, elapsed / duration);

    // Easing — personality-dependent
    const eased = 1 - Math.pow(1 - progress, 3);

    // Position with arc
    const x = startPos.x + (endPos.x - startPos.x) * eased;
    const z = startPos.z + (endPos.z - startPos.z) * eased;
    let arcY = Math.sin(progress * Math.PI) * arcHeight;

    // Wobble (lateral sway) for nervous personalities
    const wobbleX = style.wobble * Math.sin(progress * Math.PI * 6) * (1 - progress);
    const wobbleZ = style.wobble * Math.cos(progress * Math.PI * 4) * (1 - progress);

    const y = startPos.y + (endPos.y - startPos.y) * eased + arcY;
    peg.mesh.position.set(x + wobbleX * 10, y, z + wobbleZ * 10);

    // Spin (rotation around Y)
    if (style.spinSpeed > 0) {
      peg.mesh.rotation.y = progress * Math.PI * style.spinSpeed;
    }

    // Squash & stretch
    const stretch = 1 + Math.sin(progress * Math.PI) * style.squash;
    const squash = 1 - Math.sin(progress * Math.PI) * style.squash * 0.5;
    peg.mesh.scale.set(startScale.x * squash, startScale.y * stretch, startScale.z * squash);

    // Play hop sound at apex
    if (!hopSoundPlayed && progress >= 0.45) {
      hopSoundPlayed = true;
      const section = toHoleId ? (toHoleId.charCodeAt(0) + (toHoleId.length > 2 ? toHoleId.charCodeAt(toHoleId.length - 1) : 0)) % 7 : 0;
      ManifoldAudio.playHop(section, progress);
    }

    if (progress < 1) {
      requestAnimationFrame(animateHop);
    } else {
      peg.mesh.position.copy(endPos);
      peg.mesh.scale.copy(startScale);
      peg.mesh.rotation.y = 0;
      peg.holeId = toHoleId;

      // Landing bounce for TIMID / CHEERFUL
      if (style.bounces > 0) {
        let b = 0;
        const bounceInterval = setInterval(() => {
          b++;
          const bh = arcHeight * 0.15 * (1 - b / (style.bounces + 1));
          const bDur = 80;
          const bStart = performance.now();
          function bounce() {
            const bp = Math.min(1, (performance.now() - bStart) / bDur);
            peg.mesh.position.y = endPos.y + Math.sin(bp * Math.PI) * bh;
            if (bp < 1) requestAnimationFrame(bounce);
            else peg.mesh.position.y = endPos.y;
          }
          bounce();
          if (b >= style.bounces) { clearInterval(bounceInterval); if (onComplete) onComplete(); }
        }, 100);
      } else {
        if (onComplete) onComplete();
      }
    }
  }

  animateHop();
}

// ════════════════════════════════════════════════════════════════
// SEQUENTIAL HOP — chain movePeg through each hole in the path
// ════════════════════════════════════════════════════════════════
function movePegAlongPath(pegId, path, onComplete) {
  if (!path || path.length === 0) {
    if (onComplete) onComplete();
    return;
  }
  let idx = 0;
  function hopNext() {
    if (idx >= path.length) {
      if (onComplete) onComplete();
      return;
    }
    const nextHole = path[idx];
    idx++;
    movePeg(pegId, nextHole, hopNext);
  }
  hopNext();
}

// Track which pegs are currently animating (skip teleport for them)
const _animatingPegs = new Set();
let _onAnimsDone = null;
let _moveBarrier = false; // Set true before renderBoard, cleared when all anims done

function _checkAnimsDone() {
  if (_animatingPegs.size === 0 && !_moveBarrier) {
    if (_onAnimsDone) { const cb = _onAnimsDone; _onAnimsDone = null; cb(); }
  }
}

// Game-core calls this BEFORE renderBoard to raise the barrier
window.raiseAnimationBarrier = function() {
  _moveBarrier = true;
};

// Called by renderBoard3D after it finishes processing pending anims
function _lowerBarrier() {
  _moveBarrier = false;
  // If no animations were started, fire the callback now
  _checkAnimsDone();
}

// Expose a way for game-core to wait until all hop animations finish
window.waitForAnimations = function(callback) {
  if (_animatingPegs.size === 0 && !_moveBarrier) { callback(); return; }
  _onAnimsDone = callback;
};

// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// PEG POSES — triggered during cutscenes
// ════════════════════════════════════════════════════════════════
function triggerPegPose(pegId, poseType) {
  const peg = pegRegistry.get(pegId);
  if (!peg || !peg.mesh) return;

  const mesh = peg.mesh;
  const startTime = performance.now();

  if (poseType === 'protest') {
    // Shake side to side angrily
    const duration = 1200;
    function animateProtest() {
      const t = (performance.now() - startTime) / duration;
      if (t > 1) { mesh.rotation.z = 0; mesh.rotation.x = 0; return; }
      const shake = Math.sin(t * Math.PI * 8) * 0.15 * (1 - t);
      mesh.rotation.z = shake;
      mesh.rotation.x = Math.sin(t * Math.PI * 6) * 0.08 * (1 - t);
      requestAnimationFrame(animateProtest);
    }
    animateProtest();
  } else if (poseType === 'victory') {
    // Triumphant bounce + spin
    const duration = 1500;
    const baseY = mesh.position.y;
    function animateVictory() {
      const t = (performance.now() - startTime) / duration;
      if (t > 1) {
        mesh.position.y = baseY;
        mesh.rotation.y = 0;
        mesh.scale.set(1, 1, 1);
        return;
      }
      // Bounce up
      const bounce = Math.sin(t * Math.PI * 3) * 15 * (1 - t * 0.5);
      mesh.position.y = baseY + Math.max(0, bounce);
      // Slow spin
      mesh.rotation.y = t * Math.PI * 2;
      // Slight scale pulse
      const pulse = 1 + Math.sin(t * Math.PI * 4) * 0.1;
      mesh.scale.set(pulse, pulse, pulse);
      requestAnimationFrame(animateVictory);
    }
    animateVictory();
  }
}

// ════════════════════════════════════════════════════════════════
// GOLDEN CROWN — appears on home hole when safe zone is filled
// ════════════════════════════════════════════════════════════════
const _crownMeshes = new Map(); // boardPosition → crown mesh

function showGoldenCrown(boardPosition, playerColor) {
  if (_crownMeshes.has(boardPosition)) return; // Already showing

  const homeHoleId = `home-${boardPosition}`;
  const hole = holeRegistry.get(homeHoleId);
  if (!hole) return;

  const crownGroup = new THREE.Group();
  crownGroup.name = `crown-${boardPosition}`;

  // Crown base ring
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xFFD700, roughness: 0.15, metalness: 0.9,
    emissive: new THREE.Color(0xFFAA00), emissiveIntensity: 0.4
  });
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(8, 1.5, 8, 16), baseMat);
  baseRing.rotation.x = Math.PI / 2;
  crownGroup.add(baseRing);

  // Crown points (5 prongs)
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const prong = new THREE.Mesh(
      new THREE.ConeGeometry(2, 8, 6),
      baseMat
    );
    prong.position.set(Math.cos(angle) * 7, 5, Math.sin(angle) * 7);
    crownGroup.add(prong);

    // Jewel on each prong
    const jewel = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 8, 6),
      new THREE.MeshStandardMaterial({
        color: playerColor || 0xff0000, roughness: 0.1, metalness: 0.3,
        emissive: new THREE.Color(playerColor || 0xff0000), emissiveIntensity: 0.5
      })
    );
    jewel.position.set(Math.cos(angle) * 7, 9.5, Math.sin(angle) * 7);
    crownGroup.add(jewel);
  }

  // Position above the home hole
  const boardY = boardGroup ? boardGroup.position.y : 90;
  crownGroup.position.set(hole.position.x, boardY + hole.position.y + 25, hole.position.z);

  // Animate in — scale from 0
  crownGroup.scale.set(0, 0, 0);
  scene.add(crownGroup);
  _crownMeshes.set(boardPosition, crownGroup);

  const startTime = performance.now();
  function animateCrownIn() {
    const t = Math.min(1, (performance.now() - startTime) / 800);
    const ease = 1 - Math.pow(1 - t, 3); // ease out cubic
    crownGroup.scale.set(ease, ease, ease);
    crownGroup.rotation.y += 0.02;
    if (t < 1) requestAnimationFrame(animateCrownIn);
  }
  animateCrownIn();

  // Continuous gentle rotation in animate loop
  crownGroup.userData.rotate = true;
  console.log(`👑 Golden crown placed on home-${boardPosition}`);
}

function triggerWinCrown(pegId) {
  // Add a small floating crown above the winning peg
  const peg = pegRegistry.get(pegId);
  if (!peg || !peg.mesh) return;

  const crownMat = new THREE.MeshStandardMaterial({
    color: 0xFFD700, roughness: 0.1, metalness: 0.9,
    emissive: new THREE.Color(0xFFAA00), emissiveIntensity: 0.6
  });
  const crownGroup = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 1, 6, 12), crownMat);
  ring.rotation.x = Math.PI / 2;
  crownGroup.add(ring);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const prong = new THREE.Mesh(new THREE.ConeGeometry(1.5, 5, 5), crownMat);
    prong.position.set(Math.cos(a) * 4.5, 3.5, Math.sin(a) * 4.5);
    crownGroup.add(prong);
  }
  crownGroup.position.set(0, 22, 0);
  peg.mesh.add(crownGroup);

  // Float & spin animation
  const startTime = performance.now();
  function floatCrown() {
    const t = (performance.now() - startTime) / 1000;
    crownGroup.position.y = 22 + Math.sin(t * 2) * 3;
    crownGroup.rotation.y = t * 1.5;
    requestAnimationFrame(floatCrown);
  }
  floatCrown();
}

// RENDER BRIDGE — sync peg meshes with RepresentationTable state
// ════════════════════════════════════════════════════════════════
function renderBoard3D() {
  if (!window.FastTrackCore) return;
  const core = window.FastTrackCore;
  const players = core.state.players.get('list') || [];
  const boardY = boardGroup ? boardGroup.position.y : 90;

  // Consume pending hop animation if any
  const pendingAnim = window._pendingHopAnim;
  const pendingAnim2 = window._pendingHopAnim2; // split move second peg
  window._pendingHopAnim = null;
  window._pendingHopAnim2 = null;

  // Tell CameraDirector which player is active
  const currentPlayer = core.state.players.get('current');
  if (currentPlayer != null) CameraDirector.setActivePlayer(currentPlayer);

  // Camera: if this is a split move, pan out to frame both pegs
  if (pendingAnim && pendingAnim2) {
    CameraDirector.followSplit(pendingAnim.pegId, pendingAnim2.pegId);
  }

  // Collect deferred animation starts — we'll fire them after camera settles
  const _deferredAnims = [];

  // Track which peg IDs we've seen (to remove stale ones)
  const activePegIds = new Set();

  players.forEach((player, pi) => {
    // Count holding slot index separately so pegs map to hold-{bp}-0..3
    let holdSlot = 0;
    player.pegs.forEach((peg, pegIdx) => {
      const pegId = peg.id;
      activePegIds.add(pegId);

      const existing = pegRegistry.get(pegId);
      const holeId = peg.holeId;

      if (holeId === 'holding') {
        // Peg in holding — show on holding area holes (4 slots: 0-3)
        const slot = Math.min(holdSlot, 3);
        holdSlot++;
        const holdHoleId = `hold-${player.boardPosition}-${slot}`;
        if (existing) {
          const hole = holeRegistry.get(holdHoleId);
          if (hole) {
            existing.mesh.position.set(hole.position.x, boardY + hole.position.y + 8, hole.position.z);
            existing.mesh.visible = true;
          }
        } else {
          createPeg(pegId, pi, holdHoleId, player.boardPosition);
        }
      } else {
        // Peg on board
        const hole = holeRegistry.get(holeId);
        if (!hole) return;

        if (existing) {
          if (existing.holeId !== holeId) {
            // Check if this peg has a pending hop animation
            const anim = (pendingAnim && pendingAnim.pegId === pegId) ? pendingAnim
                       : (pendingAnim2 && pendingAnim2.pegId === pegId) ? pendingAnim2
                       : null;
            if (anim && anim.path && anim.path.length > 0) {
              // Defer animation start until camera is in place
              _animatingPegs.add(pegId);
              CameraDirector.followPeg(pegId);
              _deferredAnims.push({ pegId, path: anim.path, existing, holeId });
            } else if (!_animatingPegs.has(pegId)) {
              // No path — single hop to destination (also deferred)
              _animatingPegs.add(pegId);
              CameraDirector.followPeg(pegId);
              _deferredAnims.push({ pegId, path: null, existing, holeId });
            }
          }
          existing.mesh.visible = true;
        } else {
          createPeg(pegId, pi, holeId, player.boardPosition);
        }
      }
    });
  });

  // ── Start animations only after camera has settled into position ──
  if (_deferredAnims.length > 0) {
    const startAllAnims = () => {
      for (const da of _deferredAnims) {
        const onDone = () => {
          _animatingPegs.delete(da.pegId);
          da.existing.holeId = da.holeId;
          if (_animatingPegs.size === 0) {
            CameraDirector.unlockCutscene();
            if (_onAnimsDone) { const cb = _onAnimsDone; _onAnimsDone = null; cb(); }
          }
        };
        if (da.path) {
          movePegAlongPath(da.pegId, da.path, onDone);
        } else {
          movePeg(da.pegId, da.holeId, onDone);
        }
      }
    };
    // Wait for camera to smoothly arrive, then start hopping
    CameraDirector.whenSettled(startAllAnims);
  }

  // Remove pegs that no longer exist
  pegRegistry.forEach((peg, id) => {
    if (!activePegIds.has(id)) {
      removePeg(id);
    }
  });

  // ── Always show peg name sprites for all on-board pegs ──
  const pegNameMap = {};
  players.forEach(player => {
    for (const peg of player.pegs) {
      if (peg.holeId !== 'holding') {
        pegNameMap[peg.id] = peg.nickname || `Peg ${peg.id}`;
      }
    }
  });
  showPegNames(pegNameMap);

  // Lower animation barrier — if no anims were started, this fires _onAnimsDone immediately
  _lowerBarrier();
}

// ════════════════════════════════════════════════════════════════
// ATMOSPHERIC DUST MOTES — floating particles in light beams
// ════════════════════════════════════════════════════════════════
function createDustMotes() {
  const MOTE_COUNT = 400;
  const positions = new Float32Array(MOTE_COUNT * 3);
  const velocities = new Float32Array(MOTE_COUNT * 3);
  const sizes = new Float32Array(MOTE_COUNT);
  const opacities = new Float32Array(MOTE_COUNT);
  const phases = new Float32Array(MOTE_COUNT);  // for drift variation

  // Distribute motes in the room volume, concentrated near the table
  for (let i = 0; i < MOTE_COUNT; i++) {
    const i3 = i * 3;
    positions[i3]     = (Math.random() - 0.5) * ROOM_WIDTH * 0.7;     // x
    positions[i3 + 1] = TABLE_HEIGHT + Math.random() * (ROOM_HEIGHT - TABLE_HEIGHT) * 0.8; // y: above table
    positions[i3 + 2] = (Math.random() - 0.5) * ROOM_DEPTH * 0.7;     // z

    // Slow random drift
    velocities[i3]     = (Math.random() - 0.5) * 0.15;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.08;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.15;

    sizes[i] = 1.0 + Math.random() * 2.5;
    opacities[i] = 0.15 + Math.random() * 0.35;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

  // Soft circular sprite texture
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = 32; spriteCanvas.height = 32;
  const sctx = spriteCanvas.getContext('2d');
  const grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255, 240, 210, 1.0)');
  grad.addColorStop(0.3, 'rgba(255, 235, 200, 0.5)');
  grad.addColorStop(1, 'rgba(255, 230, 190, 0.0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 32, 32);
  const spriteTex = new THREE.CanvasTexture(spriteCanvas);

  const material = new THREE.PointsMaterial({
    map: spriteTex,
    size: 3,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0xffeedd
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'dustMotes';
  scene.add(points);

  dustMotes = { points, positions, velocities, sizes, opacities, phases, count: MOTE_COUNT };
  console.log(`✨ ${MOTE_COUNT} atmospheric dust motes created`);
}

function updateDustMotes(time) {
  if (!dustMotes) return;
  const { positions, velocities, phases, count } = dustMotes;
  const posAttr = dustMotes.points.geometry.getAttribute('position');

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const phase = phases[i];

    // Gentle sinusoidal drift (Brownian-like)
    positions[i3]     += velocities[i3]     + Math.sin(time * 0.3 + phase) * 0.04;
    positions[i3 + 1] += velocities[i3 + 1] + Math.sin(time * 0.2 + phase * 1.5) * 0.02;
    positions[i3 + 2] += velocities[i3 + 2] + Math.cos(time * 0.25 + phase * 0.7) * 0.04;

    // Soft thermal updraft near center (above table lamp)
    const dx = positions[i3];
    const dz = positions[i3 + 2];
    const distFromCenter = Math.sqrt(dx * dx + dz * dz);
    if (distFromCenter < 200) {
      positions[i3 + 1] += 0.03 * (1 - distFromCenter / 200);  // gentle rise
    }

    // Wrap around room bounds
    const hw = ROOM_WIDTH * 0.35, hd = ROOM_DEPTH * 0.35;
    if (positions[i3] > hw) positions[i3] = -hw;
    if (positions[i3] < -hw) positions[i3] = hw;
    if (positions[i3 + 2] > hd) positions[i3 + 2] = -hd;
    if (positions[i3 + 2] < -hd) positions[i3 + 2] = hd;
    // Vertical wrap
    if (positions[i3 + 1] > ROOM_HEIGHT * 0.9) positions[i3 + 1] = TABLE_HEIGHT + 10;
    if (positions[i3 + 1] < TABLE_HEIGHT) positions[i3 + 1] = ROOM_HEIGHT * 0.8;
  }

  posAttr.needsUpdate = true;
}

// ════════════════════════════════════════════════════════════════
// ANIMATION LOOP & UTILITIES
// ════════════════════════════════════════════════════════════════
let _animTime = 0;
function animate3D() {
  requestAnimationFrame(animate3D);
  _animTime += 0.016;

  // Update atmospheric particles
  updateDustMotes(_animTime);

  // Chandelier auto-hide: fade out when camera is high overhead (would block board view)
  const chandelier = scene.getObjectByName('chandelier');
  if (chandelier && camera) {
    // Calculate angle between camera direction and vertical
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const downAngle = Math.acos(Math.max(-1, Math.min(1, -camDir.y))); // 0 = looking straight down
    const fadeStart = 0.4; // radians — start fading
    const fadeEnd = 0.15;  // radians — fully hidden
    if (downAngle < fadeStart) {
      const t = Math.max(0, (downAngle - fadeEnd) / (fadeStart - fadeEnd));
      chandelier.visible = t > 0.01;
      chandelier.traverse(child => {
        if (child.material && child.material.opacity !== undefined) {
          child.material.transparent = true;
          child.material._baseOpacity = child.material._baseOpacity ?? child.material.opacity;
          child.material.opacity = child.material._baseOpacity * t;
        }
      });
    } else {
      chandelier.visible = true;
      chandelier.traverse(child => {
        if (child.material && child.material._baseOpacity !== undefined) {
          child.material.opacity = child.material._baseOpacity;
        }
      });
    }
  }

  // Rotate golden crowns
  _crownMeshes.forEach(crown => {
    if (crown.userData.rotate) crown.rotation.y += 0.01;
  });

  CameraDirector.update(16);
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setCameraView(mode) {
  CameraDirector.setMode(mode);

  // Update button states
  document.querySelectorAll('.cam-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.cam-btn[onclick*="${mode}"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

// ════════════════════════════════════════════════════════════════
// PATH HIGHLIGHTING — glow destination holes when choices shown
// ════════════════════════════════════════════════════════════════
const highlightMeshes = [];  // track glow rings for cleanup
let highlightAnimFrame = null;

function clearHighlights() {
  for (const mesh of highlightMeshes) {
    if (mesh.parent) mesh.parent.remove(mesh);
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) mesh.material.dispose();
  }
  highlightMeshes.length = 0;
  if (highlightAnimFrame) {
    cancelAnimationFrame(highlightAnimFrame);
    highlightAnimFrame = null;
  }
}

function createGlowRing(holeId, color, isDestination) {
  const hole = holeRegistry.get(holeId);
  if (!hole) return null;
  const radius = isDestination ? 14 : 10;
  const ringGeo = new THREE.RingGeometry(radius - 3, radius, 24);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: isDestination ? 0.8 : 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(hole.position.x, hole.position.y + 4, hole.position.z);
  ring.renderOrder = 10;
  ring.userData.isDestination = isDestination;
  ring.userData.baseMat = ringMat;
  boardGroup.add(ring);
  highlightMeshes.push(ring);
  return ring;
}

function highlightMovePaths(moves) {
  clearHighlights();
  const vm = moves || (window.FastTrackCore && window.FastTrackCore.state
    ? window.FastTrackCore.state.turn.get('validMoves') || [] : []);
  if (vm.length === 0) return;

  for (const m of vm) {
    // Color based on move type
    let color = 0x00ff88;  // green default
    if (m.type === 'enter')          color = 0xffd700;  // gold
    if (m.type === 'enterFastTrack') color = 0xff44ff;  // magenta
    if (m.type === 'enterBullseye')  color = 0xff4444;  // red
    if (m.type === 'exitBullseye')   color = 0x44aaff;  // blue

    // Highlight intermediate path holes (dimmer)
    if (m.path) {
      for (let i = 0; i < m.path.length - 1; i++) {
        createGlowRing(m.path[i], color, false);
      }
    }
    // Highlight destination (brighter)
    createGlowRing(m.dest, color, true);

    // Split moves — also highlight the second peg's path
    if (m.type === 'split' && m.path2) {
      const color2 = 0xffaa00; // orange for second path
      for (let i = 0; i < m.path2.length - 1; i++) {
        createGlowRing(m.path2[i], color2, false);
      }
      createGlowRing(m.dest2, color2, true);
    }
  }

  // Pulsing animation
  function pulseHighlights() {
    const t = performance.now() * 0.003;
    for (const mesh of highlightMeshes) {
      const base = mesh.userData.isDestination ? 0.8 : 0.35;
      const pulse = Math.sin(t * 2) * 0.25;
      mesh.material.opacity = base + pulse;
      if (mesh.userData.isDestination) {
        const scale = 1 + Math.sin(t * 1.5) * 0.08;
        mesh.scale.set(scale, 1, scale);
      }
    }
    highlightAnimFrame = requestAnimationFrame(pulseHighlights);
  }
  pulseHighlights();
}

function highlightSinglePath(moveIdx) {
  const vm = window.FastTrackCore && window.FastTrackCore.state
    ? window.FastTrackCore.state.turn.get('validMoves') || [] : [];
  if (moveIdx >= 0 && moveIdx < vm.length) {
    highlightMovePaths([vm[moveIdx]]);
  }
}

// ════════════════════════════════════════════════════════════════
// EXPOSE GLOBALS
// ════════════════════════════════════════════════════════════════
window.init3D = init3D;
window.createPeg = createPeg;
window.removePeg = removePeg;
window.movePeg = movePeg;
window.renderBoard3D = renderBoard3D;
window.holeRegistry = holeRegistry;
window.pegRegistry = pegRegistry;
window.setCameraView = setCameraView;
window.CameraDirector = CameraDirector;
window.highlightMovePaths = highlightMovePaths;
window.highlightSinglePath = highlightSinglePath;
window.clearHighlights = clearHighlights;
window.showPegNames = showPegNames;
window.hidePegNames = hidePegNames;
window.updatePlayerMarkers = updatePlayerMarkers;
window.blinkPlayerMarker = blinkPlayerMarker;

// Auto-initialize when DOM ready
document.addEventListener('DOMContentLoaded', init3D);

