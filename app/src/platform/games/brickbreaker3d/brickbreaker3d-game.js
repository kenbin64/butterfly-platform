// BrickBreaker 3D — Multiplayer Manifold Substrate Implementation
// ═══════════════════════════════════════════════════════════════════════════
//
// ARCHITECTURE (Address-Only):
//   All game state lives in RepresentationTables — addresses, not bytes.
//   Supports 1-4 players with N paddles and N balls.
//   Physics uses saddle surface z = x·y for ball reflection geometry.
//   Points go to the player whose paddle last hit the ball.
//
// SUBSTRATE LAYOUT (7-section helix):
//   0: Balls      — per-ball position, velocity, lastHitBy (RepresentationTable)
//   1: Paddles    — per-paddle position, playerId, isBot (RepresentationTable)
//   2: Bricks     — grid state, remaining count (RepresentationTable)
//   3: Physics    — saddle angle, coupling strength (RepresentationTable)
//   4: Collision  — detection scratch (RepresentationTable)
//   5: Score      — per-player score (RepresentationTable)
//   6: Meta       — level, lives, playerCount, mode, seed (RepresentationTable)
//
// ═══════════════════════════════════════════════════════════════════════════

// ─── Lightweight RepresentationTable (browser-side, mirrors core API) ────
class RepresentationTable {
  constructor(name) {
    this.name = name;
    this._data = new Map();
  }
  set(key, value) { this._data.set(key, value); }
  get(key) { return this._data.get(key); }
  has(key) { return this._data.has(key); }
  delete(key) { return this._data.delete(key); }
  keys() { return Array.from(this._data.keys()); }
  get size() { return this._data.size; }
}

// ─── Game State — 7 RepresentationTables on the helix ────────────────────
const state = {
  balls:     new RepresentationTable('bb3d:balls'),      // section 0
  paddles:   new RepresentationTable('bb3d:paddles'),    // section 1
  bricks:    new RepresentationTable('bb3d:bricks'),     // section 2
  physics:   new RepresentationTable('bb3d:physics'),    // section 3
  collision: new RepresentationTable('bb3d:collision'),  // section 4
  score:     new RepresentationTable('bb3d:score'),      // section 5
  meta:      new RepresentationTable('bb3d:meta'),       // section 6
};

// ─── Player colors & names ────────────────────────────────────────────────
const PLAYER_COLORS = [0xff2d95, 0x00d4ff, 0x39ff14, 0xb24dff];
const PLAYER_HEX    = ['#ff2d95', '#00d4ff', '#39ff14', '#b24dff'];
const PLAYER_NAMES  = ['Player 1', 'Bot Alpha', 'Bot Beta', 'Bot Gamma'];

// ─── Saddle surface z = x·y — manifold geometry for ball reflection ──────
function saddleGradient(localX, localZ, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return { x: localZ * cos - localX * sin, y: 1, z: localZ * sin + localX * cos };
}

// ═══════════════════════════════════════════════════════════════════════════
// THREE.JS SETUP — one-way bridge from substrates to WebGL
// ═══════════════════════════════════════════════════════════════════════════
let scene, camera, renderer;
let paddleMeshes = [], ballMeshes = [], brickMeshes = [];
let wallMeshes = [];
let launched = false;
let particles = [];
const BALL_R = 0.4, SPEED = 0.25, GRAVITY = -0.003, PADDLE_R = 2;

// Arena & paddle sizing — scale with player count
let ARENA_W = 12;     // half-width
let ARENA_D = 10;     // depth (back wall z)
let playerCount = 1;
let gameMode = 'single';  // 'single' | 'bots' | 'matchmaker' | 'invite'

function getArenaWidth(n) { return 8 + n * 5; }  // wider with more players
function getPaddleWidth(n) { return Math.max(3, 16 / n); }  // narrower with more players

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030008);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 120);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('container').appendChild(renderer.domElement);

  // Neon lighting
  scene.add(new THREE.AmbientLight(0x1a0033, 0.6));
  const pinkL = new THREE.PointLight(0xff2d95, 1.2, 60);
  pinkL.position.set(-10, 12, 8);
  scene.add(pinkL);
  const cyanL = new THREE.PointLight(0x00d4ff, 1.2, 60);
  cyanL.position.set(10, 12, -8);
  scene.add(cyanL);
  const topL = new THREE.DirectionalLight(0xffffff, 0.6);
  topL.position.set(0, 20, 5);
  scene.add(topL);

  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
}

function createArena() {
  // Remove old walls
  wallMeshes.forEach(w => scene.remove(w));
  wallMeshes = [];

  const wallMat = new THREE.MeshPhongMaterial({
    color: 0xb24dff, transparent: true, opacity: 0.18,
    emissive: 0x1a0033, emissiveIntensity: 0.3,
  });

  const sideGeo = new THREE.BoxGeometry(0.3, 8, ARENA_D * 2 + 1);
  const lw = new THREE.Mesh(sideGeo, wallMat);
  lw.position.set(-ARENA_W, 0, 0);
  scene.add(lw); wallMeshes.push(lw);

  const rw = new THREE.Mesh(sideGeo, wallMat);
  rw.position.set(ARENA_W, 0, 0);
  scene.add(rw); wallMeshes.push(rw);

  const backGeo = new THREE.BoxGeometry(ARENA_W * 2 + 0.6, 8, 0.3);
  const bw = new THREE.Mesh(backGeo, wallMat);
  bw.position.set(0, 0, -ARENA_D);
  scene.add(bw); wallMeshes.push(bw);

  // Neon grid floor
  const grid = new THREE.GridHelper(ARENA_W * 2, Math.floor(ARENA_W * 2), 0x1a0a2a, 0x0a0515);
  grid.position.y = -4;
  scene.add(grid); wallMeshes.push(grid);
}

function createSaddleGeometry(width, depth, segments, curvature) {
  const geo = new THREE.BufferGeometry();
  const s = segments;
  const verts = [], normals = [], uvs = [], indices = [];
  for (let j = 0; j <= s; j++) {
    for (let i = 0; i <= s; i++) {
      const u = i / s, v = j / s;
      const x = (u - 0.5) * width;
      const z = (v - 0.5) * depth;
      const y = x * z * curvature;
      verts.push(x, y, z);
      const nx = -z * curvature, ny = 1, nz = -x * curvature;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
      normals.push(nx/len, ny/len, nz/len);
      uvs.push(u, v);
    }
  }
  for (let j = 0; j < s; j++) {
    for (let i = 0; i < s; i++) {
      const a = j * (s+1) + i, b = a + 1, c = a + s + 1, d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function createPaddles() {
  // Remove old
  paddleMeshes.forEach(m => scene.remove(m));
  paddleMeshes = [];

  const pw = getPaddleWidth(playerCount);
  const totalSlots = ARENA_W * 2 - pw;
  const spacing = totalSlots / playerCount;

  for (let i = 0; i < playerCount; i++) {
    const geo = createSaddleGeometry(pw, pw, 16, 0.15);
    const mat = new THREE.MeshPhongMaterial({
      color: PLAYER_COLORS[i],
      emissive: PLAYER_COLORS[i], emissiveIntensity: 0.25,
      side: THREE.DoubleSide, flatShading: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const startX = -ARENA_W + pw / 2 + spacing * i + spacing / 2;
    mesh.position.set(startX, -3, 8);
    mesh.rotation.x = -0.3;
    scene.add(mesh);
    paddleMeshes.push(mesh);

    state.paddles.set(`p${i}_px`, startX);
    state.paddles.set(`p${i}_py`, -3);
    state.paddles.set(`p${i}_pz`, 8);
    state.paddles.set(`p${i}_hw`, pw / 2);
    state.paddles.set(`p${i}_isBot`, i > 0 && gameMode === 'bots');
    state.paddles.set(`p${i}_playerId`, i);
  }
}

function createBalls() {
  ballMeshes.forEach(m => scene.remove(m));
  ballMeshes = [];

  for (let i = 0; i < playerCount; i++) {
    const geo = new THREE.SphereGeometry(BALL_R, 16, 16);
    const mat = new THREE.MeshPhongMaterial({
      color: PLAYER_COLORS[i], emissive: PLAYER_COLORS[i], emissiveIntensity: 0.35,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const px = state.paddles.get(`p${i}_px`) || 0;
    mesh.position.set(px, -2, 7);
    scene.add(mesh);
    ballMeshes.push(mesh);

    state.balls.set(`b${i}_px`, px);
    state.balls.set(`b${i}_py`, -2);
    state.balls.set(`b${i}_pz`, 7);
    state.balls.set(`b${i}_vx`, 0);
    state.balls.set(`b${i}_vy`, 0);
    state.balls.set(`b${i}_vz`, 0);
    state.balls.set(`b${i}_lastHitBy`, i);
    state.balls.set(`b${i}_launched`, false);
  }
}

function createBricks() {
  brickMeshes.forEach(b => { if (b.parent) scene.remove(b); });
  brickMeshes = [];
  const brickGeo = new THREE.BoxGeometry(1.8, 0.6, 0.8);
  const colors = [0xff2d95, 0xb24dff, 0x00d4ff, 0x39ff14, 0xffaa00];
  const colCount = Math.max(8, Math.floor(ARENA_W * 2 / 2.2));
  let brickCount = 0;

  for (let row = 0; row < 5; row++) {
    const mat = new THREE.MeshPhongMaterial({
      color: colors[row], emissive: colors[row], emissiveIntensity: 0.15,
    });
    for (let col = 0; col < colCount; col++) {
      const brick = new THREE.Mesh(brickGeo, mat);
      const xOff = (col - (colCount - 1) / 2) * 2.2;
      brick.position.set(xOff, 2 - row * 0.9, -5 + row * 0.5);
      brick.userData = { active: true, row, col, points: (5 - row) * 10 };
      scene.add(brick);
      brickMeshes.push(brick);
      state.bricks.set(`b${row}_${col}`, 1);
      brickCount++;
    }
  }
  state.bricks.set('total', brickCount);
  state.bricks.set('remaining', brickCount);
  document.getElementById('bricks').textContent = brickCount;
}

// ═══════════════════════════════════════════════════════════════════════════
// SADDLE SURFACE PHYSICS — Ball reflection via z = x·y geometry
// ═══════════════════════════════════════════════════════════════════════════
function reflectOnSaddle(ballPos, paddlePos, vel, hw) {
  const localX = (ballPos.x - paddlePos.x) / hw;
  const localZ = (ballPos.z - paddlePos.z) / hw;
  const angle = state.physics.get('saddleAngle') || 0;
  const gradient = saddleGradient(localX, localZ, angle);
  const normal = new THREE.Vector3(gradient.x, gradient.y, gradient.z).normalize();
  const dot = vel.dot(normal);
  const reflected = vel.clone().sub(normal.multiplyScalar(2 * dot));
  reflected.x += localX * 0.3;
  reflected.z += localZ * 0.1;
  return reflected.normalize().multiplyScalar(SPEED);
}

// ═══════════════════════════════════════════════════════════════════════════
// BOT AI — each bot paddle tracks the nearest ball
// ═══════════════════════════════════════════════════════════════════════════
function updateBots() {
  for (let p = 0; p < playerCount; p++) {
    if (!state.paddles.get(`p${p}_isBot`)) continue;
    // Find nearest ball
    let bestDist = Infinity, bestBX = paddleMeshes[p].position.x;
    for (let b = 0; b < ballMeshes.length; b++) {
      if (!state.balls.get(`b${b}_launched`)) continue;
      const bx = ballMeshes[b].position.x;
      const d = Math.abs(bx - paddleMeshes[p].position.x);
      if (d < bestDist) { bestDist = d; bestBX = bx; }
    }
    // Move toward ball with some lag
    const padX = paddleMeshes[p].position.x;
    const hw = state.paddles.get(`p${p}_hw`) || 2;
    const target = THREE.MathUtils.clamp(bestBX, -ARENA_W + hw, ARENA_W - hw);
    paddleMeshes[p].position.x += (target - padX) * 0.06;
    state.paddles.set(`p${p}_px`, paddleMeshes[p].position.x);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME LOOP — physics for ALL balls, ALL paddles
// ═══════════════════════════════════════════════════════════════════════════
function updatePhysics() {
  updateBots();
  enforcePaddleNoOverlap();

  for (let bi = 0; bi < ballMeshes.length; bi++) {
    const bm = ballMeshes[bi];
    const pre = `b${bi}_`;

    if (!state.balls.get(pre + 'launched')) {
      // Ball sits on its paddle
      const ownPad = paddleMeshes[bi];
      if (ownPad) {
        bm.position.x = ownPad.position.x;
        bm.position.y = ownPad.position.y + 1;
        bm.position.z = ownPad.position.z - 1;
      }
      continue;
    }

    let vx = state.balls.get(pre + 'vx') || 0;
    let vy = state.balls.get(pre + 'vy') || 0;
    let vz = state.balls.get(pre + 'vz') || 0;
    vy += GRAVITY;

    bm.position.x += vx;
    bm.position.y += vy;
    bm.position.z += vz;

    spawnTrailParticle(bm.position, bi);

    // Wall collisions
    if (bm.position.x < -ARENA_W + BALL_R || bm.position.x > ARENA_W - BALL_R) {
      vx = -vx;
      bm.position.x = THREE.MathUtils.clamp(bm.position.x, -ARENA_W + BALL_R, ARENA_W - BALL_R);
    }
    if (bm.position.z < -ARENA_D + BALL_R) {
      vz = -vz;
      bm.position.z = -ARENA_D + BALL_R;
    }

    // Check paddle collisions (any paddle can hit any ball)
    for (let pi = 0; pi < paddleMeshes.length; pi++) {
      const pm = paddleMeshes[pi];
      const hw = state.paddles.get(`p${pi}_hw`) || 2;
      const dx = Math.abs(bm.position.x - pm.position.x);
      const dz = Math.abs(bm.position.z - pm.position.z);
      if (dx < hw + BALL_R && dz < hw + BALL_R && bm.position.y < pm.position.y + 1.5 && vy < 0) {
        const ballVel = new THREE.Vector3(vx, vy, vz);
        const reflected = reflectOnSaddle(bm.position, pm.position, ballVel, hw);
        vx = reflected.x; vy = reflected.y; vz = reflected.z;
        bm.position.y = pm.position.y + 1.5;
        state.balls.set(pre + 'lastHitBy', pi);
        const ang = (state.physics.get('saddleAngle') || 0) + 0.013;
        state.physics.set('saddleAngle', ang % (Math.PI * 2));
        break;
      }
    }

    // Floor miss — respawn ball on its owner paddle
    if (bm.position.y < -6) {
      let lives = (state.meta.get('lives') || 3) - 1;
      state.meta.set('lives', lives);
      if (lives <= 0) { gameOver(); return; }
      resetBallIndex(bi);
      continue;
    }

    state.balls.set(pre + 'vx', vx);
    state.balls.set(pre + 'vy', vy);
    state.balls.set(pre + 'vz', vz);

    // Brick collisions — attribute points to lastHitBy
    checkBrickCollisionForBall(bi);
  }
}

function enforcePaddleNoOverlap() {
  for (let i = 0; i < paddleMeshes.length; i++) {
    const hwI = state.paddles.get(`p${i}_hw`) || 2;
    for (let j = i + 1; j < paddleMeshes.length; j++) {
      const hwJ = state.paddles.get(`p${j}_hw`) || 2;
      const minDist = hwI + hwJ + 0.2;
      const dx = paddleMeshes[j].position.x - paddleMeshes[i].position.x;
      if (Math.abs(dx) < minDist) {
        const push = (minDist - Math.abs(dx)) / 2 * Math.sign(dx || 1);
        paddleMeshes[i].position.x -= push;
        paddleMeshes[j].position.x += push;
        state.paddles.set(`p${i}_px`, paddleMeshes[i].position.x);
        state.paddles.set(`p${j}_px`, paddleMeshes[j].position.x);
      }
    }
  }
}

function checkBrickCollisionForBall(bi) {
  const bm = ballMeshes[bi];
  const pre = `b${bi}_`;
  for (let i = brickMeshes.length - 1; i >= 0; i--) {
    const brick = brickMeshes[i];
    if (!brick.userData.active) continue;
    const dx = Math.abs(bm.position.x - brick.position.x);
    const dy = Math.abs(bm.position.y - brick.position.y);
    const dz = Math.abs(bm.position.z - brick.position.z);
    if (dx < 1.1 && dy < 0.5 && dz < 0.6) {
      if (dx > dz) { state.balls.set(pre + 'vx', -(state.balls.get(pre + 'vx') || 0)); }
      else { state.balls.set(pre + 'vz', -(state.balls.get(pre + 'vz') || 0)); }
      brick.userData.active = false;
      state.bricks.set(`b${brick.userData.row}_${brick.userData.col}`, 0);
      spawnBrickExplosion(brick.position, brick.material.color);
      scene.remove(brick);
      // Points to last-hitter
      const hitter = state.balls.get(pre + 'lastHitBy') || 0;
      const cur = (state.score.get(`p${hitter}`) || 0) + brick.userData.points;
      state.score.set(`p${hitter}`, cur);
      updateHUD();
      let remaining = (state.bricks.get('remaining') || 0) - 1;
      state.bricks.set('remaining', remaining);
      document.getElementById('bricks').textContent = remaining;
      updateSubstrateViz();
      if (remaining <= 0) { levelComplete(); }
      break;
    }
  }
}

function resetBallIndex(bi) {
  const bm = ballMeshes[bi];
  const pm = paddleMeshes[bi] || paddleMeshes[0];
  bm.position.set(pm.position.x, pm.position.y + 1, pm.position.z - 1);
  const pre = `b${bi}_`;
  state.balls.set(pre + 'vx', 0);
  state.balls.set(pre + 'vy', 0);
  state.balls.set(pre + 'vz', 0);
  state.balls.set(pre + 'launched', false);
}


// ═══════════════════════════════════════════════════════════════════════════
// INPUT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
function onMouseMove(e) {
  if (!paddleMeshes.length) return;
  const pm = paddleMeshes[0]; // player 0 is human
  if (state.paddles.get('p0_isBot')) return;
  const hw = state.paddles.get('p0_hw') || 2;
  const x = (e.clientX / window.innerWidth - 0.5) * ARENA_W * 2;
  pm.position.x = THREE.MathUtils.clamp(x, -ARENA_W + hw, ARENA_W - hw);
  state.paddles.set('p0_px', pm.position.x);
}

function onKeyDown(e) {
  if (e.code === 'Space') {
    // Launch all unlaunched balls
    for (let i = 0; i < ballMeshes.length; i++) {
      if (!state.balls.get(`b${i}_launched`)) {
        state.balls.set(`b${i}_launched`, true);
        const angle = state.physics.get('saddleAngle') || 0;
        const spread = (i - (playerCount - 1) / 2) * 0.15;
        state.balls.set(`b${i}_vx`, Math.sin(angle + spread) * SPEED * 0.5);
        state.balls.set(`b${i}_vy`, SPEED * 0.3);
        state.balls.set(`b${i}_vz`, -SPEED);
      }
    }
    launched = true;
  }
  if (e.code === 'KeyR') { resetGame(); }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ═══════════════════════════════════════════════════════════════════════════
// HUD — per-player scores
// ═══════════════════════════════════════════════════════════════════════════
function buildHUD() {
  const container = document.getElementById('player-scores');
  container.innerHTML = '';
  for (let i = 0; i < playerCount; i++) {
    const name = state.paddles.get(`p${i}_isBot`) ? PLAYER_NAMES[i] : (i === 0 ? 'You' : `Player ${i + 1}`);
    const row = document.createElement('div');
    row.className = 'player-score-row';
    row.innerHTML = `<span class="pname" style="color:${PLAYER_HEX[i]}">${name}</span><span class="pscore" id="pscore-${i}" style="color:${PLAYER_HEX[i]}">0</span>`;
    container.appendChild(row);
  }
}

function updateHUD() {
  for (let i = 0; i < playerCount; i++) {
    const el = document.getElementById(`pscore-${i}`);
    if (el) el.textContent = state.score.get(`p${i}`) || 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBSTRATE VIZ
// ═══════════════════════════════════════════════════════════════════════════
function updateSubstrateViz() {
  const tables = [state.balls, state.paddles, state.bricks, state.physics,
                  state.collision, state.score, state.meta];
  const sections = document.querySelectorAll('.drill-section');
  sections.forEach((el, i) => {
    if (tables[i]) {
      el.style.filter = `brightness(${Math.min(50 + tables[i].size * 5, 100)}%)`;
      el.classList.toggle('active', tables[i].size > 0);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME FLOW — level, game over, reset
// ═══════════════════════════════════════════════════════════════════════════
function levelComplete() {
  const level = (state.meta.get('level') || 1) + 1;
  state.meta.set('level', level);
  document.getElementById('level').textContent = level;
  brickMeshes.forEach(b => { if (b.parent) scene.remove(b); });
  createBricks();
  for (let i = 0; i < playerCount; i++) resetBallIndex(i);
  launched = false;
}

function gameOver() {
  launched = false;
  const ss = document.getElementById('start-screen');
  ss.style.display = 'flex';
  ss.querySelector('h1').textContent = '💀 GAME OVER';
  // Build final scores string
  let scoreStr = '';
  for (let i = 0; i < playerCount; i++) {
    const name = state.paddles.get(`p${i}_isBot`) ? PLAYER_NAMES[i] : (i === 0 ? 'You' : `Player ${i+1}`);
    scoreStr += `${name}: ${state.score.get(`p${i}`) || 0}  `;
  }
  ss.querySelector('.subtitle').textContent = scoreStr;
}

function resetGame() {
  brickMeshes.forEach(b => { if (b.parent) scene.remove(b); });
  state.meta.set('lives', 3);
  state.meta.set('level', 1);
  state.physics.set('saddleAngle', 0);
  for (let i = 0; i < playerCount; i++) state.score.set(`p${i}`, 0);
  document.getElementById('level').textContent = 1;

  ARENA_W = getArenaWidth(playerCount);
  camera.position.set(0, 14 + playerCount * 2, 22 + playerCount * 3);
  camera.lookAt(0, 0, 0);

  createArena();
  createPaddles();
  createBalls();
  createBricks();
  buildHUD();
  launched = false;
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTICLE EFFECTS
// ═══════════════════════════════════════════════════════════════════════════
const _particleGeo = new THREE.SphereGeometry(0.08, 4, 4);

function spawnBrickExplosion(pos, color) {
  const count = 12 + Math.floor(Math.random() * 8);
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const p = new THREE.Mesh(_particleGeo, mat);
    p.position.copy(pos);
    p.userData = {
      vx: (Math.random() - 0.5) * 0.3, vy: Math.random() * 0.2 + 0.05,
      vz: (Math.random() - 0.5) * 0.3, life: 1.0, decay: 0.015 + Math.random() * 0.01,
    };
    scene.add(p); particles.push(p);
  }
}

function spawnTrailParticle(pos, ballIdx) {
  if (Math.random() > 0.35) return;
  const c = PLAYER_COLORS[ballIdx % PLAYER_COLORS.length];
  const mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5 });
  const p = new THREE.Mesh(_particleGeo, mat);
  p.position.copy(pos); p.scale.setScalar(0.5);
  p.userData = { vx: 0, vy: 0, vz: 0, life: 1.0, decay: 0.06 };
  scene.add(p); particles.push(p);
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i], d = p.userData;
    p.position.x += d.vx; p.position.y += d.vy; p.position.z += d.vz;
    d.vy -= 0.004; d.life -= d.decay;
    p.material.opacity = Math.max(0, d.life);
    p.scale.setScalar(d.life * 0.8);
    if (d.life <= 0) { scene.remove(p); p.material.dispose(); particles.splice(i, 1); }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODE SELECTION — exposed as BB3D global
// ═══════════════════════════════════════════════════════════════════════════
const BB3D = {
  selectMode(mode) {
    gameMode = mode;
    if (mode === 'single') {
      playerCount = 1;
      document.getElementById('start-screen').style.display = 'none';
      resetGame();
    } else if (mode === 'bots') {
      document.getElementById('start-screen').style.display = 'none';
      document.getElementById('player-select').style.display = 'flex';
    } else if (mode === 'invite') {
      document.getElementById('start-screen').style.display = 'none';
      document.getElementById('invite-screen').style.display = 'flex';
      document.getElementById('generated-code').textContent =
        Math.random().toString(36).substring(2, 8).toUpperCase();
    } else {
      // matchmaker — placeholder, start solo for now
      playerCount = 1;
      document.getElementById('start-screen').style.display = 'none';
      resetGame();
    }
  },
  startWithBots(n) {
    playerCount = n;
    document.getElementById('player-select').style.display = 'none';
    resetGame();
  },
  backToModes() {
    document.getElementById('player-select').style.display = 'none';
    document.getElementById('invite-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';
    const ss = document.getElementById('start-screen');
    ss.querySelector('h1').textContent = '🧱 BrickBreaker 3D';
    ss.querySelector('.subtitle').textContent = 'Saddle Surface Physics — z = x · y';
  },
  joinByInvite() {
    const code = document.getElementById('invite-input').value.trim();
    if (!code) return;
    // Placeholder — start 2-player bots for now
    playerCount = 2;
    document.getElementById('invite-screen').style.display = 'none';
    resetGame();
  },
};
window.BB3D = BB3D;

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATE
// ═══════════════════════════════════════════════════════════════════════════
function animate() {
  requestAnimationFrame(animate);
  updatePhysics();
  updateParticles();
  renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════
state.meta.set('lives', 3);
state.meta.set('level', 1);
state.physics.set('saddleAngle', 0);
initThree();
animate();
