// FastTrack 3D - Three.js Board Rendering
// ═══════════════════════════════════════════════════════════════════════════
// Ported from legacy/junkyard/universe/games/fasttrack/board_3d.html
// Hexagonal board with golden ratio proportions, Light Bright pegs
// ═══════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// GOLDEN RATIO PROPORTIONS (φ = 1.618033988749895)
// ════════════════════════════════════════════════════════════════
const PHI = 1.618033988749895;
const BOARD_RADIUS = 280;
const BOARD_THICKNESS = 20;
const BOARD_BEVEL = 12;
const HOLE_RADIUS = 7;
const TRACK_HOLE_RADIUS = 5;
const PEG_HEIGHT = 40;
const PEG_TOP_RADIUS = 7;
const PEG_BOTTOM_RADIUS = 5;
const PEG_DOME_RADIUS = 6;
const LINE_HEIGHT = 3;
const BORDER_HEIGHT = 15;
const BORDER_WIDTH = 18;

// Billiard table dimensions
const TABLE_HEIGHT = 90;              // Height of table from floor
const TABLE_LEG_WIDTH = 25;
const RAIL_HEIGHT = 12;
const RAIL_WIDTH = 35;

// Room dimensions
const ROOM_WIDTH = 1200;
const ROOM_DEPTH = 1000;
const ROOM_HEIGHT = 400;

// Rainbow colors for 6 players (billiard ball inspired)
const RAINBOW_COLORS = [0xff3333, 0x3399ff, 0x33cc33, 0xffcc00, 0xcc33cc, 0xff6633];
const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];

// Art placeholder positions (for your custom art)
const ART_PLACEHOLDERS = [
  { wall: 'back', x: -300, y: 220, width: 200, height: 150, label: 'Art 1' },
  { wall: 'back', x: 100, y: 220, width: 250, height: 180, label: 'Art 2' },
  { wall: 'left', x: -200, y: 200, width: 180, height: 120, label: 'Art 3' },
  { wall: 'right', x: 200, y: 200, width: 180, height: 120, label: 'Art 4' },
];

// ════════════════════════════════════════════════════════════════
// THREE.JS SCENE GLOBALS
// ════════════════════════════════════════════════════════════════
let scene, camera, renderer, controls;
let boardGroup, pegGroup;
const holeRegistry = new Map();
const pegRegistry = new Map();
let boardMesh = null;

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
// MANIFOLD AUDIO - Procedural sound generation from substrate
// ════════════════════════════════════════════════════════════════
const ManifoldAudio = {
  ctx: null,
  musicOsc: null,
  musicGain: null,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🎵 ManifoldAudio initialized');
    } catch (e) {
      console.warn('Audio not available');
    }
  },

  // Generate tone from manifold coordinates (z = xy saddle surface)
  toneFromManifold(x, y, duration = 0.15) {
    if (!this.ctx || !GameSettings.soundEnabled) return;

    const z = x * y;  // Saddle surface
    const freq = 220 + Math.abs(z) * 440;  // Map to audible range

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },

  // Peg hop sound - frequency rises with arc
  playHop(progress = 0.5) {
    if (!this.ctx || !GameSettings.soundEnabled) return;
    const freq = 300 + Math.sin(progress * Math.PI) * 400;
    this.toneFromManifold(progress, Math.sin(progress * Math.PI), 0.08);
  },

  // Card draw sound - quick ascending arpeggio
  playCardDraw() {
    if (!this.ctx || !GameSettings.soundEnabled) return;
    [0, 0.05, 0.1].forEach((delay, i) => {
      setTimeout(() => this.toneFromManifold(0.3 + i * 0.2, 0.5, 0.1), delay * 1000);
    });
  },

  // Victory fanfare - manifold spiral
  playVictory() {
    if (!this.ctx || !GameSettings.soundEnabled) return;
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      setTimeout(() => {
        this.toneFromManifold(Math.cos(angle), Math.sin(angle) + 0.5, 0.2);
      }, i * 100);
    }
  },

  // Procedural background music from manifold substrate
  startMusic() {
    if (!this.ctx || !GameSettings.musicEnabled || this.musicOsc) return;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    this.musicGain.connect(this.ctx.destination);

    // Drone oscillator based on golden ratio
    this.musicOsc = this.ctx.createOscillator();
    this.musicOsc.type = 'triangle';
    this.musicOsc.frequency.setValueAtTime(55 * PHI, this.ctx.currentTime);  // ~89 Hz
    this.musicOsc.connect(this.musicGain);
    this.musicOsc.start();

    console.log('🎶 Manifold music started');
  },

  stopMusic() {
    if (this.musicOsc) {
      this.musicOsc.stop();
      this.musicOsc = null;
    }
  }
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
  _damping: 0.04,
  _minHeight: 150,
  _maxHeight: 800,

  init() {
    this._pos = new THREE.Vector3(0, 250, 400);
    this._look = new THREE.Vector3(0, 0, 0);
    this._tPos = this._pos.clone();

    // Load camera mode from settings
    this.mode = GameSettings.cameraMode;
    this._tLook = this._look.clone();
  },
  
  update(dt) {
    if (this.mode === 'manual' || !camera) return;
    
    if (this.mode === 'auto') {
      this._computeAutoTarget();
    }
    
    const f = 1 - Math.pow(1 - this._damping, (dt || 16) / 16);
    this._pos.lerp(this._tPos, f);
    this._look.lerp(this._tLook, f);
    
    camera.position.copy(this._pos);
    controls.target.copy(this._look);
    camera.lookAt(this._look);
  },
  
  _computeAutoTarget() {
    // Frame all pegs on board
    const positions = [];
    pegRegistry.forEach(peg => {
      if (peg.mesh && peg.mesh.visible) {
        positions.push(peg.mesh.position.clone());
      }
    });
    
    if (positions.length === 0) {
      this._tLook.set(0, 0, 0);
      this._tPos.set(0, 300, 450);
      return;
    }
    
    // Calculate bounding box center
    const center = new THREE.Vector3();
    positions.forEach(p => center.add(p));
    center.divideScalar(positions.length);
    
    this._tLook.copy(center);
    this._tPos.set(center.x * 0.3, 280, center.z * 0.3 + 380);
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
// INITIALIZATION
// ════════════════════════════════════════════════════════════════
function init3D() {
  const container = document.getElementById('container');

  // Load settings from lobby config
  GameSettings.load();

  // Initialize manifold audio system
  ManifoldAudio.init();

  // Scene - warm billiard room ambiance
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1510);
  scene.fog = new THREE.Fog(0x1a1510, 800, 2000);

  // Camera
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 3000);
  camera.position.set(0, 350, 500);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

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

  // Create billiard room environment first
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

  // Window resize
  window.addEventListener('resize', onWindowResize);

  // Start music if enabled
  if (GameSettings.musicEnabled) {
    document.addEventListener('click', () => ManifoldAudio.startMusic(), { once: true });
  }

  // Start animation
  animate3D();

  console.log('✅ FastTrack 3D Billiard Room initialized');
}

// ════════════════════════════════════════════════════════════════
// LIGHTING SETUP
// ════════════════════════════════════════════════════════════════
function setupLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
  mainLight.position.set(200, 500, 200);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-200, 300, -200);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(0, 100, -400);
  scene.add(rimLight);

  // Center bullseye glow
  const centerLight = new THREE.PointLight(0xff2d95, 0.5, 200);
  centerLight.position.set(0, 50, 0);
  scene.add(centerLight);
}

// ════════════════════════════════════════════════════════════════
// HEXAGON BOARD - Thick beveled base with dark playing surface
// ════════════════════════════════════════════════════════════════
function createHexagonBoard() {
  // --- BOARD BASE (tan/cream beveled box) ---
  const baseShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI / 3) - Math.PI / 6;
    const x = Math.cos(angle) * (BOARD_RADIUS + BOARD_BEVEL);
    const y = Math.sin(angle) * (BOARD_RADIUS + BOARD_BEVEL);
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

  // Tan/cream material for base
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4b896,  // Tan/cream
    roughness: 0.6,
    metalness: 0.05
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

  const surfaceMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0a0f,  // Very dark (almost black)
    roughness: 0.9,
    metalness: 0.0
  });
  boardMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  boardMesh.receiveShadow = true;
  boardGroup.add(boardMesh);

  // --- DECORATIVE STARS ---
  createDecorativeStars();

  // --- BULLSEYE CENTER (moved here) ---
  createBullseyeCenter();
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

    // Thick raised border segment with rounded edges
    const geometry = new THREE.BoxGeometry(length * 0.92, BORDER_HEIGHT, BORDER_WIDTH, 1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: RAINBOW_COLORS[i],
      roughness: 0.2,
      metalness: 0.6,
      emissive: new THREE.Color(RAINBOW_COLORS[i]),
      emissiveIntensity: 0.25
    });

    const segment = new THREE.Mesh(geometry, material);
    segment.position.set(midX, BORDER_HEIGHT / 2 + 3, midZ);
    segment.rotation.y = -edgeAngle;
    segment.castShadow = true;
    boardGroup.add(segment);
  }
}

// ════════════════════════════════════════════════════════════════
// DECORATIVE STARS - Scattered on board surface
// ════════════════════════════════════════════════════════════════
function createDecorativeStars() {
  const starPositions = [];
  // Generate random star positions avoiding center and holes
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * (BOARD_RADIUS - 120);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    starPositions.push({ x, z, size: 2 + Math.random() * 3 });
  }

  starPositions.forEach(star => {
    const starShape = new THREE.Shape();
    const spikes = 5;
    const outerR = star.size;
    const innerR = star.size * 0.4;

    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) starShape.moveTo(x, y);
      else starShape.lineTo(x, y);
    }
    starShape.closePath();

    const starGeom = new THREE.ShapeGeometry(starShape);
    starGeom.rotateX(-Math.PI / 2);
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3 + Math.random() * 0.3
    });
    const starMesh = new THREE.Mesh(starGeom, starMat);
    starMesh.position.set(star.x, 4, star.z);
    boardGroup.add(starMesh);
  });
}

// ════════════════════════════════════════════════════════════════
// BULLSEYE CENTER - Concentric rings with "Fasttrack!" branding
// ════════════════════════════════════════════════════════════════
function createBullseyeCenter() {
  const ringColors = [0xff3333, 0xff6633, 0xffcc00, 0x33cc33, 0x3399ff, 0x6633ff];
  const ringRadii = [45, 38, 31, 24, 17, 10];

  ringRadii.forEach((r, i) => {
    const ringGeom = new THREE.CircleGeometry(r, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: ringColors[i],
      emissive: new THREE.Color(ringColors[i]),
      emissiveIntensity: 0.3,
      roughness: 0.4,
      metalness: 0.3
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.y = 4 + i * 0.3;  // Slight elevation for each ring
    boardGroup.add(ring);
  });

  // "Fasttrack!" text ring around bullseye (simplified as circle with text texture)
  const textRingGeom = new THREE.RingGeometry(48, 58, 64);
  textRingGeom.rotateX(-Math.PI / 2);

  // Create canvas texture for text
  const textCanvas = document.createElement('canvas');
  textCanvas.width = 512;
  textCanvas.height = 64;
  const ctx = textCanvas.getContext('2d');
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 512, 64);
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#ffcc00';
  ctx.textAlign = 'center';
  ctx.fillText('★ FASTTRACK! ★ FASTTRACK! ★', 256, 42);

  const textTexture = new THREE.CanvasTexture(textCanvas);
  textTexture.wrapS = THREE.RepeatWrapping;
  textTexture.repeat.set(1, 1);

  const textRingMat = new THREE.MeshBasicMaterial({
    map: textTexture,
    transparent: true,
    side: THREE.DoubleSide
  });
  const textRing = new THREE.Mesh(textRingGeom, textRingMat);
  textRing.position.y = 4.5;
  boardGroup.add(textRing);
}

// ════════════════════════════════════════════════════════════════
// GAME ELEMENTS - 15 holes per player (including FastTrack)
// Layout: 5 down from FT → 5 across outer (incl. home) → 5 up to next FT
// ════════════════════════════════════════════════════════════════
function createGameElements() {
  const FT_RADIUS = BOARD_RADIUS * 0.52;      // FastTrack pentagon distance from center
  const OUTER_RADIUS = BOARD_RADIUS * 0.88;   // Outer track distance
  const HOLE_SPACING = 22;                     // Space between holes

  // For each of 6 players
  for (let p = 0; p < 6; p++) {
    const cornerAngle = (p / 6) * Math.PI * 2 - Math.PI / 6;  // Player's corner angle
    const nextCornerAngle = ((p + 1) / 6) * Math.PI * 2 - Math.PI / 6;

    // FastTrack hole position (pentagon at inner corner)
    const ftX = Math.cos(cornerAngle) * FT_RADIUS;
    const ftZ = Math.sin(cornerAngle) * FT_RADIUS;
    createFastTrackHole(`ft-${p}`, p, ftX, LINE_HEIGHT - 2, ftZ);

    // Direction vectors
    const radialX = Math.cos(cornerAngle);
    const radialZ = Math.sin(cornerAngle);
    const nextRadialX = Math.cos(nextCornerAngle);
    const nextRadialZ = Math.sin(nextCornerAngle);

    // Outer corner positions (left = this player's home, right = toward next player)
    const leftCornerX = Math.cos(cornerAngle) * OUTER_RADIUS;
    const leftCornerZ = Math.sin(cornerAngle) * OUTER_RADIUS;
    const rightCornerX = Math.cos(nextCornerAngle) * OUTER_RADIUS;
    const rightCornerZ = Math.sin(nextCornerAngle) * OUTER_RADIUS;

    // ── SIDE-LEFT: 5 holes from FT down to left corner ──
    for (let h = 0; h < 5; h++) {
      const t = (h + 1) / 6;  // Interpolate from FT toward corner
      const x = ftX + (leftCornerX - ftX) * t;
      const z = ftZ + (leftCornerZ - ftZ) * t;
      const isEntry = h === 0;  // First hole is FT entry point
      createHole(`side-left-${p}-${h}`, 'side-left', p, x, LINE_HEIGHT - 2, z, null, {
        isOuterTrack: true,
        isFastTrackEntry: isEntry
      });
    }

    // ── OUTER: 5 holes across the edge (including HOME at position 2) ──
    for (let h = 0; h < 5; h++) {
      const t = h / 4;  // Interpolate along outer edge
      const x = leftCornerX + (rightCornerX - leftCornerX) * t;
      const z = leftCornerZ + (rightCornerZ - leftCornerZ) * t;
      const isHome = h === 2;  // Middle hole is HOME/winner
      const isSafeEntry = h === 2;  // Also safe zone entry
      createHole(`outer-${p}-${h}`, isHome ? 'home' : 'outer', p, x, LINE_HEIGHT - 2, z,
        isHome ? 'diamond' : null, {
          isOuterTrack: true,
          isHome: isHome,
          isSafeZoneEntry: isSafeEntry
        });
    }

    // ── SIDE-RIGHT: 5 holes from right corner up to next player's FT ──
    const nextFtX = Math.cos(nextCornerAngle) * FT_RADIUS;
    const nextFtZ = Math.sin(nextCornerAngle) * FT_RADIUS;
    for (let h = 0; h < 5; h++) {
      const t = (h + 1) / 6;
      const x = rightCornerX + (nextFtX - rightCornerX) * t;
      const z = rightCornerZ + (nextFtZ - rightCornerZ) * t;
      createHole(`side-right-${p}-${h}`, 'side-right', p, x, LINE_HEIGHT - 2, z, null, {
        isOuterTrack: true
      });
    }

    // ── SAFE ZONE: 4 holes from outer-2 (home entry) toward center ──
    const safeStartX = leftCornerX + (rightCornerX - leftCornerX) * 0.5;
    const safeStartZ = leftCornerZ + (rightCornerZ - leftCornerZ) * 0.5;

    // Create safe zone enclosure (colored rounded rectangle)
    createSafeZoneEnclosure(p, safeStartX, safeStartZ, cornerAngle + Math.PI / 6);

    for (let s = 0; s < 4; s++) {
      const t = (s + 1) / 5;
      const x = safeStartX + (0 - safeStartX) * t * 0.6;  // Toward center but not all the way
      const z = safeStartZ + (0 - safeStartZ) * t * 0.6;
      createHole(`safe-${p}-${s}`, 'safezone', p, x, LINE_HEIGHT - 2, z, null, { isSafeZone: true });
    }

    // Create holding area enclosure (colored circle)
    createHoldingAreaEnclosure(p, holdAngle, holdRadius);

    // ── HOLDING AREA: 4 holes between safe zone and FT (starting pegs) ──
    const holdAngle = cornerAngle + Math.PI / 12;  // Offset between FT and safe
    const holdRadius = BOARD_RADIUS * 0.32;
    const holdX = Math.cos(holdAngle) * holdRadius;
    const holdZ = Math.sin(holdAngle) * holdRadius;
    for (let h = 0; h < 4; h++) {
      const offsetX = (h % 2 - 0.5) * 18;
      const offsetZ = (Math.floor(h / 2) - 0.5) * 18;
      // Rotate offsets to align with player section
      const rotX = offsetX * Math.cos(holdAngle) - offsetZ * Math.sin(holdAngle);
      const rotZ = offsetX * Math.sin(holdAngle) + offsetZ * Math.cos(holdAngle);
      createHole(`hold-${p}-${h}`, 'holding', p, holdX + rotX, LINE_HEIGHT - 2, holdZ + rotZ, null, { isHolding: true });
    }
  }

  // Create bullseye (center) - 6 rings for 6 players
  createBullseye();

  console.log(`✅ Created ${holeRegistry.size} holes for 6 players`);
}

// ════════════════════════════════════════════════════════════════
// SAFE ZONE ENCLOSURE - Colored rounded rectangle
// ════════════════════════════════════════════════════════════════
function createSafeZoneEnclosure(playerIdx, startX, startZ, angle) {
  const color = RAINBOW_COLORS[playerIdx];
  const length = 85;
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
    roughness: 0.3,
    metalness: 0.5,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.15,
    transparent: true,
    opacity: 0.8
  });

  const mesh = new THREE.Mesh(geometry, material);

  // Position at center of safe zone and rotate to point toward center
  const centerDist = Math.sqrt(startX * startX + startZ * startZ) * 0.7;
  const centerX = startX * 0.7;
  const centerZ = startZ * 0.7;

  mesh.position.set(centerX, 2, centerZ);
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
  outer.position.set(holdX, 3, holdZ);
  boardGroup.add(outer);

  // Inner dark circle
  const innerGeo = new THREE.CircleGeometry(22, 32);
  innerGeo.rotateX(-Math.PI / 2);
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0f,
    roughness: 0.9
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.position.set(holdX, 3.5, holdZ);
  boardGroup.add(inner);
}

function createHole(id, type, playerIdx, x, y, z, shape, props = {}) {
  const radius = type === 'outer' ? TRACK_HOLE_RADIUS : HOLE_RADIUS;
  const geometry = new THREE.CylinderGeometry(radius, radius, 5, 16);
  const material = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  boardGroup.add(mesh);

  // Add diamond marker for HOME holes
  if (shape === 'diamond') {
    const diamondShape = new THREE.Shape();
    const dSize = 14;
    diamondShape.moveTo(0, dSize);
    diamondShape.lineTo(dSize * 0.7, 0);
    diamondShape.lineTo(0, -dSize);
    diamondShape.lineTo(-dSize * 0.7, 0);
    diamondShape.closePath();

    const diamondGeo = new THREE.ShapeGeometry(diamondShape);
    diamondGeo.rotateX(-Math.PI / 2);
    const diamondMat = new THREE.MeshStandardMaterial({
      color: RAINBOW_COLORS[playerIdx],
      roughness: 0.2,
      metalness: 0.6,
      emissive: new THREE.Color(RAINBOW_COLORS[playerIdx]),
      emissiveIntensity: 0.3
    });
    const diamond = new THREE.Mesh(diamondGeo, diamondMat);
    diamond.position.set(x, y + 3, z);
    boardGroup.add(diamond);
  }

  holeRegistry.set(id, { id, type, playerIdx, position: { x, y, z }, mesh, ...props });
  return holeRegistry.get(id);
}

function createFastTrackHole(id, playerIdx, x, y, z) {
  // Pentagon shape
  const PENTAGON_SIZE = 18;
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
  const pentMat = new THREE.MeshStandardMaterial({
    color: RAINBOW_COLORS[playerIdx],
    roughness: 0.2,
    metalness: 0.7,
    emissive: new THREE.Color(RAINBOW_COLORS[playerIdx]),
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide
  });

  const pentagon = new THREE.Mesh(pentGeo, pentMat);
  pentagon.rotation.x = -Math.PI / 2;
  pentagon.position.set(x, LINE_HEIGHT, z);
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
  const CENTER_HOLE_RADIUS = 15;
  const RING_WIDTH = 8;

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
    const ringMat = new THREE.MeshStandardMaterial({
      color: RAINBOW_COLORS[r],
      roughness: 0.3,
      metalness: 0.5,
      emissive: new THREE.Color(RAINBOW_COLORS[r]),
      emissiveIntensity: 0.15
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

  holeRegistry.set('center', { id: 'center', type: 'bullseye', playerIdx: -1, position: { x: 0, y: LINE_HEIGHT - 2, z: 0 }, mesh: centerHoleMesh });
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

  // Tall tapered cylinder body (Light Bright style - very prominent)
  const bodyGeo = new THREE.CylinderGeometry(PEG_TOP_RADIUS, PEG_BOTTOM_RADIUS, PEG_HEIGHT, 24);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.15,
    metalness: 0.4,
    emissive: new THREE.Color(color),
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0.9
  });

  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  bodyMesh.position.y = PEG_HEIGHT / 2;
  pegGroup.add(bodyMesh);

  // Bright glowing dome top
  const domeGeo = new THREE.SphereGeometry(PEG_DOME_RADIUS, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.2,
    emissive: new THREE.Color(color),
    emissiveIntensity: 1.0,
    transparent: true,
    opacity: 0.95
  });

  const domeMesh = new THREE.Mesh(domeGeo, domeMat);
  domeMesh.position.y = PEG_HEIGHT;
  domeMesh.castShadow = true;
  pegGroup.add(domeMesh);

  // Inner glow core
  const coreGeo = new THREE.CylinderGeometry(PEG_BOTTOM_RADIUS * 0.6, PEG_BOTTOM_RADIUS * 0.4, PEG_HEIGHT * 0.9, 16);
  const coreMat = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.6
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.position.y = PEG_HEIGHT / 2;
  pegGroup.add(coreMesh);

  // Position on top of hole
  pegGroup.position.set(hole.position.x, hole.position.y + 8, hole.position.z);
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
    domeMesh
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

function movePeg(id, toHoleId, onComplete) {
  const peg = pegRegistry.get(id);
  const toHole = holeRegistry.get(toHoleId);

  if (!peg || !toHole) {
    if (onComplete) onComplete();
    return;
  }

  const startPos = peg.mesh.position.clone();
  const endPos = new THREE.Vector3(toHole.position.x, toHole.position.y + 5, toHole.position.z);
  const distance = startPos.distanceTo(endPos);
  const arcHeight = Math.min(80, distance * 0.4);
  const duration = Math.min(1500, 400 + distance * 2);

  const startTime = performance.now();

  function animateHop() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(1, elapsed / duration);

    // Easing
    const eased = 1 - Math.pow(1 - progress, 3);

    // Position with arc
    const x = startPos.x + (endPos.x - startPos.x) * eased;
    const z = startPos.z + (endPos.z - startPos.z) * eased;
    const arcY = Math.sin(progress * Math.PI) * arcHeight;
    const y = startPos.y + (endPos.y - startPos.y) * eased + arcY;

    peg.mesh.position.set(x, y, z);

    if (progress < 1) {
      requestAnimationFrame(animateHop);
    } else {
      peg.mesh.position.copy(endPos);
      peg.holeId = toHoleId;
      if (onComplete) onComplete();
    }
  }

  animateHop();
}

// ════════════════════════════════════════════════════════════════
// ANIMATION LOOP & UTILITIES
// ════════════════════════════════════════════════════════════════
function animate3D() {
  requestAnimationFrame(animate3D);

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
// EXPOSE GLOBALS
// ════════════════════════════════════════════════════════════════
window.init3D = init3D;
window.createPeg = createPeg;
window.removePeg = removePeg;
window.movePeg = movePeg;
window.holeRegistry = holeRegistry;
window.pegRegistry = pegRegistry;
window.setCameraView = setCameraView;
window.CameraDirector = CameraDirector;

// Auto-initialize when DOM ready
document.addEventListener('DOMContentLoaded', init3D);

