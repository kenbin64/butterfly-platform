// Saddle Synth - Audio synthesis via z=xy manifold
// Helix cascade creates unique harmonic content

let audioCtx = null;
let activeNotes = new Map();
let settings = { waveform: 'saddle', attack: 0.1, release: 0.3, helix: 0.5, phase: 0 };

// Note frequencies (A4 = 440Hz)
const NOTES = [
  { note: 'C', freq: 261.63, key: 'a', black: false },
  { note: 'C#', freq: 277.18, key: 'w', black: true },
  { note: 'D', freq: 293.66, key: 's', black: false },
  { note: 'D#', freq: 311.13, key: 'e', black: true },
  { note: 'E', freq: 329.63, key: 'd', black: false },
  { note: 'F', freq: 349.23, key: 'f', black: false },
  { note: 'F#', freq: 369.99, key: 't', black: true },
  { note: 'G', freq: 392.00, key: 'g', black: false },
  { note: 'G#', freq: 415.30, key: 'y', black: true },
  { note: 'A', freq: 440.00, key: 'h', black: false },
  { note: 'A#', freq: 466.16, key: 'u', black: true },
  { note: 'B', freq: 493.88, key: 'j', black: false },
  { note: 'C2', freq: 523.25, key: 'k', black: false }
];

// ═══════════════════════════════════════════════════════════════════════════
// SADDLE WAVEFORM GENERATOR
// ═══════════════════════════════════════════════════════════════════════════
function createSaddleOscillator(ctx, freq) {
  // Create periodic wave from saddle samples
  const real = new Float32Array(64);
  const imag = new Float32Array(64);
  
  real[0] = 0;
  imag[0] = 0;
  
  for (let i = 1; i < 64; i++) {
    const t = i / 64;
    // Saddle harmonic: z = sin(t) * cos(t + phase) * helix_depth
    const saddle = Math.sin(t * Math.PI * 2) * Math.cos(t * Math.PI * 2 + settings.phase);
    const helix = Math.sin(t * Math.PI * 4 * settings.helix);
    real[i] = saddle * (1 - settings.helix * 0.5) + helix * settings.helix * 0.5;
    imag[i] = saddle * 0.3;
  }
  
  const wave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(wave);
  osc.frequency.value = freq;
  return osc;
}

function createOscillator(ctx, freq, type) {
  const osc = ctx.createOscillator();
  if (type === 'saddle') return createSaddleOscillator(ctx, freq);
  osc.type = type;
  osc.frequency.value = freq;
  return osc;
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTE PLAYING
// ═══════════════════════════════════════════════════════════════════════════
function playNote(noteData) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (activeNotes.has(noteData.note)) return;
  
  const osc = createOscillator(audioCtx, noteData.freq, settings.waveform);
  const gain = audioCtx.createGain();
  
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + settings.attack);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  
  activeNotes.set(noteData.note, { osc, gain });
  
  // Update key visual
  const keyEl = document.querySelector(`[data-note="${noteData.note}"]`);
  if (keyEl) keyEl.classList.add('active');
}

function stopNote(noteData) {
  const active = activeNotes.get(noteData.note);
  if (!active) return;
  
  const { osc, gain } = active;
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + settings.release);
  setTimeout(() => osc.stop(), settings.release * 1000 + 50);
  
  activeNotes.delete(noteData.note);
  
  const keyEl = document.querySelector(`[data-note="${noteData.note}"]`);
  if (keyEl) keyEl.classList.remove('active');
}

// ═══════════════════════════════════════════════════════════════════════════
// KEYBOARD SETUP
// ═══════════════════════════════════════════════════════════════════════════
const keyboard = document.getElementById('keyboard');
NOTES.forEach(n => {
  const key = document.createElement('div');
  key.className = n.black ? 'key black-key' : 'key';
  key.dataset.note = n.note;
  key.innerHTML = `<span class="key-label">${n.key.toUpperCase()}</span>`;
  key.addEventListener('mousedown', () => playNote(n));
  key.addEventListener('mouseup', () => stopNote(n));
  key.addEventListener('mouseleave', () => stopNote(n));
  keyboard.appendChild(key);
});

// Keyboard input
const keyMap = {};
NOTES.forEach(n => keyMap[n.key] = n);

document.addEventListener('keydown', e => {
  if (e.repeat) return;
  const note = keyMap[e.key.toLowerCase()];
  if (note) playNote(note);
});
document.addEventListener('keyup', e => {
  const note = keyMap[e.key.toLowerCase()];
  if (note) stopNote(note);
});

// ═══════════════════════════════════════════════════════════════════════════
// CONTROLS
// ═══════════════════════════════════════════════════════════════════════════
document.querySelectorAll('.wave-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.wave-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    settings.waveform = btn.dataset.wave;
  });
});

['attack', 'release', 'helix', 'phase'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    settings[id] = parseFloat(el.value);
    document.getElementById(id + 'Val').textContent = el.value;
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// VISUALIZER
// ═══════════════════════════════════════════════════════════════════════════
const vizCanvas = document.getElementById('viz');
const vizCtx = vizCanvas.getContext('2d');
let vizT = 0;

function resizeViz() {
  const rect = vizCanvas.parentElement.getBoundingClientRect();
  vizCanvas.width = rect.width; vizCanvas.height = rect.height;
}
resizeViz();
window.addEventListener('resize', resizeViz);

function drawViz() {
  vizCtx.fillStyle = 'rgba(10,10,16,0.2)';
  vizCtx.fillRect(0, 0, vizCanvas.width, vizCanvas.height);
  
  const w = vizCanvas.width, h = vizCanvas.height, cy = h / 2;
  
  vizCtx.beginPath();
  vizCtx.strokeStyle = activeNotes.size > 0 ? '#00d4ff' : 'rgba(0,212,255,0.3)';
  vizCtx.lineWidth = 2;
  
  for (let x = 0; x < w; x++) {
    const t = (x / w) * Math.PI * 4 + vizT;
    const saddle = Math.sin(t) * Math.cos(t + settings.phase);
    const helix = Math.sin(t * 2 * settings.helix);
    const y = cy + (saddle * (1 - settings.helix * 0.5) + helix * settings.helix * 0.5) * h * 0.35;
    x === 0 ? vizCtx.moveTo(x, y) : vizCtx.lineTo(x, y);
  }
  vizCtx.stroke();
  
  vizT += 0.05;
  requestAnimationFrame(drawViz);
}
drawViz();

