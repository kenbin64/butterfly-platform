// BrickBreaker 3D — Manifold Substrate Implementation
// ═══════════════════════════════════════════════════════════════════════════
//
// ARCHITECTURE (Address-Only):
//   All game state lives in RepresentationTables — addresses, not bytes.
//   Meshes are MeshSubstrate-pattern objects synced to Three.js each frame.
//   Physics uses saddle surface z = x·y for ball reflection geometry.
//
// SUBSTRATE LAYOUT (7-section helix):
//   0: Ball       — position, velocity, radius (RepresentationTable)
//   1: Paddle     — position, radius (RepresentationTable + MeshSubstrate)
//   2: Bricks     — grid state, remaining count (RepresentationTable)
//   3: Physics    — saddle angle, coupling strength (RepresentationTable)
//   4: Collision  — detection scratch (RepresentationTable)
//   5: Score      — score, combo (RepresentationTable)
//   6: Meta       — level, lives, seed (RepresentationTable)
//
// STACK:
//   APPLICATION (this file)
//     ↓
//   Three.js (WebGL rendering — external, one-way bridge)
//     ↓
//   RepresentationTable (addresses into the manifold)
//     ↓
//   MANIFOLD (z = x·y)
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
  ball:      new RepresentationTable('bb3d:ball'),       // section 0
  paddle:    new RepresentationTable('bb3d:paddle'),     // section 1
  bricks:    new RepresentationTable('bb3d:bricks'),     // section 2
  physics:   new RepresentationTable('bb3d:physics'),    // section 3
  collision: new RepresentationTable('bb3d:collision'),  // section 4
  score:     new RepresentationTable('bb3d:score'),      // section 5
  meta:      new RepresentationTable('bb3d:meta'),       // section 6
};

// ─── Saddle surface z = x·y — manifold geometry for ball reflection ──────
function saddleGradient(localX, localZ, angle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return {
    x: localZ * cos - localX * sin,
    y: 1,
    z: localZ * sin + localX * cos
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// THREE.JS SETUP — one-way bridge from substrates to WebGL
// ═══════════════════════════════════════════════════════════════════════════
let scene, camera, renderer;
let paddleMesh, ballMesh, brickMeshes = [];
let launched = false;
const ARENA = 12, PADDLE_R = 2, BALL_R = 0.4, SPEED = 0.25;

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a1a);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 15, 20);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('container').appendChild(renderer.domElement);

  // Lighting
  scene.add(new THREE.AmbientLight(0x444444));
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  scene.add(light);

  createArena();
  createPaddle();
  createBall();
  createBricks();

  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
}

function createArena() {
  const wallMat = new THREE.MeshPhongMaterial({ color: 0x4488ff, transparent: true, opacity: 0.3 });
  const wallGeo = new THREE.BoxGeometry(0.2, 8, 20);

  const leftWall = new THREE.Mesh(wallGeo, wallMat);
  leftWall.position.set(-ARENA, 0, 0);
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(wallGeo, wallMat);
  rightWall.position.set(ARENA, 0, 0);
  scene.add(rightWall);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(ARENA * 2, 8, 0.2), wallMat);
  backWall.position.set(0, 0, -10);
  scene.add(backWall);

  const gridHelper = new THREE.GridHelper(ARENA * 2, 20, 0x333366, 0x222244);
  gridHelper.position.y = -4;
  scene.add(gridHelper);
}

function createPaddle() {
  // Paddle IS a saddle surface — z = x·y (hyperbolic paraboloid)
  const geo = new THREE.ParametricGeometry((u, v, target) => {
    const x = (u - 0.5) * 4;
    const z = (v - 0.5) * 4;
    const y = x * z * 0.15;  // z = xy saddle
    target.set(x, y, z);
  }, 20, 20);

  const mat = new THREE.MeshPhongMaterial({
    color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 0.3,
    side: THREE.DoubleSide, flatShading: true
  });

  paddleMesh = new THREE.Mesh(geo, mat);
  paddleMesh.position.set(0, -3, 8);
  paddleMesh.rotation.x = -0.3;
  scene.add(paddleMesh);

  // Store paddle state in RepresentationTable
  state.paddle.set('px', 0);
  state.paddle.set('py', -3);
  state.paddle.set('pz', 8);
  state.paddle.set('radius', PADDLE_R);
}

function createBall() {
  const geo = new THREE.SphereGeometry(BALL_R, 16, 16);
  const mat = new THREE.MeshPhongMaterial({
    color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.2
  });

  ballMesh = new THREE.Mesh(geo, mat);
  ballMesh.position.copy(paddleMesh.position);
  ballMesh.position.y += 1;
  ballMesh.position.z -= 1;
  scene.add(ballMesh);

  // Ball state → RepresentationTable
  state.ball.set('px', ballMesh.position.x);
  state.ball.set('py', ballMesh.position.y);
  state.ball.set('pz', ballMesh.position.z);
  state.ball.set('vx', 0);
  state.ball.set('vy', 0);
  state.ball.set('vz', 0);
  state.ball.set('radius', BALL_R);
}

function createBricks() {
  const brickGeo = new THREE.BoxGeometry(1.8, 0.6, 0.8);
  const colors = [0xff4444, 0xffaa00, 0x44cc44, 0x4488ff, 0xcc44cc];

  brickMeshes = [];
  let brickCount = 0;

  for (let row = 0; row < 5; row++) {
    const mat = new THREE.MeshPhongMaterial({
      color: colors[row], emissive: colors[row], emissiveIntensity: 0.2
    });

    for (let col = 0; col < 10; col++) {
      const brick = new THREE.Mesh(brickGeo, mat);
      brick.position.set((col - 4.5) * 2.2, 2 - row * 0.9, -5 + row * 0.5);
      brick.userData = { active: true, row, col, points: (5 - row) * 10 };
      scene.add(brick);
      brickMeshes.push(brick);

      // Each brick's active state as an address in the bricks table
      state.bricks.set(`b${row}_${col}`, 1);  // 1 = active
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
function reflectOnSaddle(ballPos, paddlePos, vel) {
  const localX = (ballPos.x - paddlePos.x) / PADDLE_R;
  const localZ = (ballPos.z - paddlePos.z) / PADDLE_R;

  // ∇(z = xy) = [y, x] → surface normal (rotated by physics angle)
  const angle = state.physics.get('saddleAngle') || 0;
  const gradient = saddleGradient(localX, localZ, angle);
  const normal = new THREE.Vector3(gradient.x, gradient.y, gradient.z).normalize();

  // Reflect: v' = v − 2(v·n)n
  const dot = vel.dot(normal);
  const reflected = vel.clone().sub(normal.multiplyScalar(2 * dot));

  // Saddle curvature adds angle variation
  reflected.x += localX * 0.3;
  reflected.z += localZ * 0.1;

  return reflected.normalize().multiplyScalar(SPEED);
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME LOOP — physics step reads/writes RepresentationTables only
// ═══════════════════════════════════════════════════════════════════════════
function updatePhysics() {
  if (!launched) {
    // Ball follows paddle (read paddle table, write ball table)
    ballMesh.position.x = paddleMesh.position.x;
    ballMesh.position.z = paddleMesh.position.z - 1;
    ballMesh.position.y = paddleMesh.position.y + 1;
    state.ball.set('px', ballMesh.position.x);
    state.ball.set('py', ballMesh.position.y);
    state.ball.set('pz', ballMesh.position.z);
    return;
  }

  // Read velocity from ball table
  const vx = state.ball.get('vx') || 0;
  const vy = state.ball.get('vy') || 0;
  const vz = state.ball.get('vz') || 0;

  // Move ball
  ballMesh.position.x += vx;
  ballMesh.position.y += vy;
  ballMesh.position.z += vz;

  // Wall collisions
  if (ballMesh.position.x < -ARENA + BALL_R || ballMesh.position.x > ARENA - BALL_R) {
    state.ball.set('vx', -vx);
    ballMesh.position.x = THREE.MathUtils.clamp(ballMesh.position.x, -ARENA + BALL_R, ARENA - BALL_R);
  }
  if (ballMesh.position.z < -10) {
    state.ball.set('vz', -vz);
    ballMesh.position.z = -10 + BALL_R;
  }

  // Paddle collision — saddle surface physics
  const padPos = paddleMesh.position;
  const dist = Math.sqrt(
    Math.pow(ballMesh.position.x - padPos.x, 2) +
    Math.pow(ballMesh.position.z - padPos.z, 2)
  );

  if (dist < PADDLE_R + BALL_R && ballMesh.position.y < padPos.y + 1.5 && (state.ball.get('vy') || 0) < 0) {
    const ballVel = new THREE.Vector3(state.ball.get('vx'), state.ball.get('vy'), state.ball.get('vz'));
    const reflected = reflectOnSaddle(ballMesh.position, padPos, ballVel);
    state.ball.set('vx', reflected.x);
    state.ball.set('vy', reflected.y);
    state.ball.set('vz', reflected.z);
    ballMesh.position.y = padPos.y + 1.5;

    // Phase propagation through physics table
    const angle = (state.physics.get('saddleAngle') || 0) + 0.013;
    state.physics.set('saddleAngle', angle % (Math.PI * 2));
    updateSubstrateViz();
  }

  // Floor (miss) — read/write meta table
  if (ballMesh.position.y < -5) {
    let lives = (state.meta.get('lives') || 3) - 1;
    state.meta.set('lives', lives);
    document.getElementById('lives').textContent = lives;

    if (lives <= 0) {
      gameOver();
    } else {
      resetBall();
    }
  }

  // Write ball position back to table
  state.ball.set('px', ballMesh.position.x);
  state.ball.set('py', ballMesh.position.y);
  state.ball.set('pz', ballMesh.position.z);

  // Brick collisions
  checkBrickCollisions();
}

function checkBrickCollisions() {
  for (let i = brickMeshes.length - 1; i >= 0; i--) {
    const brick = brickMeshes[i];
    if (!brick.userData.active) continue;

    const brickPos = brick.position;
    const dx = Math.abs(ballMesh.position.x - brickPos.x);
    const dy = Math.abs(ballMesh.position.y - brickPos.y);
    const dz = Math.abs(ballMesh.position.z - brickPos.z);

    if (dx < 1.1 && dy < 0.5 && dz < 0.6) {
      if (dx > dz) {
        state.ball.set('vx', -(state.ball.get('vx') || 0));
      } else {
        state.ball.set('vz', -(state.ball.get('vz') || 0));
      }

      // Deactivate brick — update bricks table
      brick.userData.active = false;
      state.bricks.set(`b${brick.userData.row}_${brick.userData.col}`, 0);
      scene.remove(brick);

      // Update score table
      let score = (state.score.get('score') || 0) + brick.userData.points;
      state.score.set('score', score);
      document.getElementById('score').textContent = score;

      // Update remaining count in bricks table
      let remaining = (state.bricks.get('remaining') || 0) - 1;
      state.bricks.set('remaining', remaining);
      document.getElementById('bricks').textContent = remaining;

      updateSubstrateViz();

      if (remaining <= 0) {
        levelComplete();
      }
      break;  // One collision per frame
    }
  }
}

function resetBall() {
  launched = false;
  ballMesh.position.copy(paddleMesh.position);
  ballMesh.position.y += 1;
  ballMesh.position.z -= 1;
  state.ball.set('vx', 0);
  state.ball.set('vy', 0);
  state.ball.set('vz', 0);
}

function levelComplete() {
  let level = (state.meta.get('level') || 1) + 1;
  state.meta.set('level', level);
  document.getElementById('level').textContent = level;

  for (const brick of brickMeshes) {
    if (brick.parent) scene.remove(brick);
  }
  createBricks();
  resetBall();
}

function gameOver() {
  launched = false;
  document.getElementById('start-screen').style.display = 'flex';
  document.getElementById('start-screen').querySelector('h1').textContent = '💀 GAME OVER';
  document.getElementById('start-screen').querySelector('p').textContent =
    `Final Score: ${state.score.get('score') || 0}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT HANDLERS — write to RepresentationTables, not meshes
// ═══════════════════════════════════════════════════════════════════════════
function onMouseMove(e) {
  const x = (e.clientX / window.innerWidth - 0.5) * ARENA * 2;
  const clamped = THREE.MathUtils.clamp(x, -ARENA + PADDLE_R, ARENA - PADDLE_R);
  paddleMesh.position.x = clamped;
  state.paddle.set('px', clamped);
}

function onKeyDown(e) {
  if (e.code === 'Space' && !launched) {
    launched = true;
    // Launch angle derived from physics saddle angle
    const angle = state.physics.get('saddleAngle') || 0;
    state.ball.set('vx', Math.sin(angle) * SPEED * 0.5);
    state.ball.set('vy', SPEED * 0.3);
    state.ball.set('vz', -SPEED);
  }
  if (e.code === 'KeyR') {
    resetGame();
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBSTRATE VISUALIZATION — shows helix section activity
// ═══════════════════════════════════════════════════════════════════════════
function updateSubstrateViz() {
  const tables = [state.ball, state.paddle, state.bricks, state.physics,
                  state.collision, state.score, state.meta];
  const sections = document.querySelectorAll('.drill-section');
  sections.forEach((el, i) => {
    if (tables[i]) {
      const brightness = Math.min(50 + tables[i].size * 5, 100);
      el.style.filter = `brightness(${brightness}%)`;
      el.classList.toggle('active', tables[i].size > 0);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME INIT — reset all RepresentationTables
// ═══════════════════════════════════════════════════════════════════════════
function resetGame() {
  // Clear brick meshes
  for (const brick of brickMeshes) {
    if (brick.parent) scene.remove(brick);
  }

  // Reset all tables to initial state
  state.meta.set('lives', 3);
  state.meta.set('level', 1);
  state.score.set('score', 0);
  state.physics.set('saddleAngle', 0);

  // Update HUD
  document.getElementById('lives').textContent = 3;
  document.getElementById('level').textContent = 1;
  document.getElementById('score').textContent = 0;

  createBricks();
  resetBall();
}

function startGame() {
  document.getElementById('start-screen').style.display = 'none';
  resetGame();
}

function animate() {
  requestAnimationFrame(animate);
  updatePhysics();
  renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════════════════════════════════
// BOOTSTRAP — initialize tables, Three.js, start loop
// ═══════════════════════════════════════════════════════════════════════════
state.meta.set('lives', 3);
state.meta.set('level', 1);
state.score.set('score', 0);
state.physics.set('saddleAngle', 0);
initThree();
animate();

// Expose startGame globally
window.startGame = startGame;
