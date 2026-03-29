// BrickBreaker 3D - Diamond Drill Manifold Implementation
// ═══════════════════════════════════════════════════════════════════════════
//
// TWISTED RIBBON GEOMETRY:
// Ball physics on a saddle surface (z = xy). The paddle IS a saddle surface,
// so ball reflection naturally follows hyperbolic paraboloid geometry.
//
// DINING PHILOSOPHERS SYNCHRONIZATION:
// Each section is a "philosopher" - access to game data requires holding
// both adjacent forks (coupling points).
//
// 7 SECTIONS (fat→pinch→fat geometry):
//   1: Ball       (position, velocity, radius)
//   2: Paddle     (TurnKey - couples ball to bricks)
//   3: Bricks     (grid, active states)
//   4: Physics    (TurnKey - couples bricks to scoring)
//   5: Collision  (detection, response)
//   6: Score      (TurnKey - couples collision to game state)
//   7: Meta       (level, lives, seed)
//
// ═══════════════════════════════════════════════════════════════════════════

class GameDrill {
  constructor(seed) {
    this.seed = seed ?? Math.floor(Math.random() * 0xFFFFFFFF);
    this.rotation = 0;

    // 7 sections with twisted ribbon geometry
    this.sections = [
      { name: 'Ball',      amplitude: 0, wavelength: 1, frequency: 1, angle: 0 * Math.PI/7, phase: 0, data: {} },
      { name: 'Paddle',    amplitude: 0, wavelength: 1, frequency: 1, angle: 1 * Math.PI/7, phase: 0, data: {} },
      { name: 'Bricks',    amplitude: 0, wavelength: 1, frequency: 1, angle: 2 * Math.PI/7, phase: 0, data: {} },
      { name: 'Physics',   amplitude: 0, wavelength: 1, frequency: 1, angle: 3 * Math.PI/7, phase: 0, data: {} },
      { name: 'Collision', amplitude: 0, wavelength: 1, frequency: 1, angle: 4 * Math.PI/7, phase: 0, data: {} },
      { name: 'Score',     amplitude: 0, wavelength: 1, frequency: 1, angle: 5 * Math.PI/7, phase: 0, data: {} },
      { name: 'Meta',      amplitude: 0, wavelength: 1, frequency: 1, angle: 6 * Math.PI/7, phase: 0, data: {} }
    ];

    // Dining Philosophers forks
    this.forks = [false, false, false, false, false, false, false];
    this.eating = [false, false, false, false, false, false, false];
  }

  tryAcquire(section) {
    const idx = section - 1;
    const leftFork = idx, rightFork = (idx + 1) % 7;
    if (!this.forks[leftFork] && !this.forks[rightFork]) {
      this.forks[leftFork] = this.forks[rightFork] = true;
      this.eating[idx] = true;
      return true;
    }
    return false;
  }

  release(section) {
    const idx = section - 1;
    this.forks[idx] = this.forks[(idx + 1) % 7] = false;
    this.eating[idx] = false;
  }

  // O(1) drill and carve
  drill(section, key) { return this.sections[section - 1].data[key]; }
  carve(section, key, value) {
    const sec = this.sections[section - 1];
    sec.data[key] = value;
    sec.amplitude = Object.keys(sec.data).length;
  }

  isTurnKey(section) { return section === 2 || section === 4 || section === 6; }

  // SADDLE SURFACE SAMPLING: z = xy on twisted ribbon
  sampleSaddle(section, x, y) {
    const sec = this.sections[section - 1];
    const sx = (x - 0.5) * 2 * sec.wavelength;
    const sy = (y - 0.5) * 2;
    const angle = sec.angle;
    const tx = sx * Math.cos(angle) - sy * Math.sin(angle);
    const ty = sx * Math.sin(angle) + sy * Math.cos(angle);
    const z = sec.amplitude * tx * ty;
    return this.isTurnKey(section) ? z * 1.2 : z;
  }

  // SADDLE GRADIENT for ball reflection (∇z = [y, x] rotated)
  saddleGradient(section, x, y) {
    const sec = this.sections[section - 1];
    const angle = sec.angle;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    // Gradient of z = xy is [y, x], then rotate by angle
    const gx = y * cos - x * sin;
    const gy = y * sin + x * cos;
    return { x: gx, y: 1, z: gy };  // Normal points "up" from saddle
  }

  rotate(delta) {
    this.rotation = (this.rotation + delta) % 360;
    const deltaRad = delta * Math.PI / 180;
    for (const sec of this.sections) {
      sec.phase = (sec.phase + deltaRad * 0.1) % (Math.PI * 2);
      sec.angle = (sec.angle + deltaRad * 0.05) % (Math.PI * 2);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// THREE.JS SETUP
// ═══════════════════════════════════════════════════════════════════════════
let scene, camera, renderer, drill;
let paddle, ball, bricks = [];
let ballVel = new THREE.Vector3(0, 0, 0);
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

  // Arena (saddle surface visualization)
  createArena();
  createPaddle();
  createBall();
  createBricks();

  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
}

function createArena() {
  // Walls (transparent glass effect)
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

  // Floor (saddle surface grid visualization)
  const gridHelper = new THREE.GridHelper(ARENA * 2, 20, 0x333366, 0x222244);
  gridHelper.position.y = -4;
  scene.add(gridHelper);
}

function createPaddle() {
  // Paddle is a SADDLE SURFACE - hyperbolic paraboloid
  const geo = new THREE.ParametricGeometry((u, v, target) => {
    const x = (u - 0.5) * 4;
    const z = (v - 0.5) * 4;
    const y = x * z * 0.15;  // z = xy saddle
    target.set(x, y, z);
  }, 20, 20);

  const mat = new THREE.MeshPhongMaterial({
    color: 0xffaa00,
    emissive: 0xff6600,
    emissiveIntensity: 0.3,
    side: THREE.DoubleSide,
    flatShading: true
  });

  paddle = new THREE.Mesh(geo, mat);
  paddle.position.set(0, -3, 8);
  paddle.rotation.x = -0.3;
  scene.add(paddle);

  // Store in drill Section 2 (Paddle - TurnKey)
  drill.carve(2, 'position', paddle.position.clone());
  drill.carve(2, 'radius', PADDLE_R);
}

function createBall() {
  const geo = new THREE.SphereGeometry(BALL_R, 16, 16);
  const mat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.2
  });

  ball = new THREE.Mesh(geo, mat);
  ball.position.copy(paddle.position);
  ball.position.y += 1;
  ball.position.z -= 1;
  scene.add(ball);

  // Store in drill Section 1 (Ball)
  drill.carve(1, 'position', ball.position.clone());
  drill.carve(1, 'velocity', new THREE.Vector3(0, 0, 0));
  drill.carve(1, 'radius', BALL_R);
}

function createBricks() {
  const brickGeo = new THREE.BoxGeometry(1.8, 0.6, 0.8);
  const colors = [0xff4444, 0xffaa00, 0x44cc44, 0x4488ff, 0xcc44cc];

  bricks = [];
  let brickCount = 0;

  for (let row = 0; row < 5; row++) {
    const mat = new THREE.MeshPhongMaterial({
      color: colors[row],
      emissive: colors[row],
      emissiveIntensity: 0.2
    });

    for (let col = 0; col < 10; col++) {
      const brick = new THREE.Mesh(brickGeo, mat);
      brick.position.set((col - 4.5) * 2.2, 2 - row * 0.9, -5 + row * 0.5);
      brick.userData = { active: true, row, col, points: (5 - row) * 10 };
      scene.add(brick);
      bricks.push(brick);
      brickCount++;
    }
  }

  // Store in drill Section 3 (Bricks)
  drill.carve(3, 'grid', bricks.map(b => b.userData));
  drill.carve(3, 'total', brickCount);
  drill.carve(3, 'remaining', brickCount);

  // Update HUD
  document.getElementById('bricks').textContent = brickCount;
}

// ═══════════════════════════════════════════════════════════════════════════
// SADDLE SURFACE PHYSICS - Ball reflection on z = xy
// ═══════════════════════════════════════════════════════════════════════════
function reflectOnSaddle(ballPos, paddlePos, ballVel) {
  // Map ball position to paddle's local saddle coordinates
  const localX = (ballPos.x - paddlePos.x) / PADDLE_R;
  const localZ = (ballPos.z - paddlePos.z) / PADDLE_R;

  // Sample the saddle gradient at this point
  // For z = xy, gradient is [y, x] which gives the surface normal
  const gradient = drill.saddleGradient(2, localX, localZ);

  // Normalize to get reflection normal
  const normal = new THREE.Vector3(gradient.x, gradient.y, gradient.z).normalize();

  // Reflect: v' = v - 2(v·n)n
  const dot = ballVel.dot(normal);
  const reflected = ballVel.clone().sub(normal.multiplyScalar(2 * dot));

  // Add some angle variation based on where ball hit (saddle curvature)
  reflected.x += localX * 0.3;
  reflected.z += localZ * 0.1;

  return reflected.normalize().multiplyScalar(SPEED);
}


// ═══════════════════════════════════════════════════════════════════════════
// GAME LOOP - Physics step via drill
// ═══════════════════════════════════════════════════════════════════════════
function updatePhysics() {
  if (!launched) {
    // Ball follows paddle
    ball.position.x = paddle.position.x;
    ball.position.z = paddle.position.z - 1;
    ball.position.y = paddle.position.y + 1;
    drill.carve(1, 'position', ball.position.clone());
    return;
  }

  // Move ball
  ball.position.add(ballVel);
  drill.carve(1, 'position', ball.position.clone());

  // Wall collisions
  if (ball.position.x < -ARENA + BALL_R || ball.position.x > ARENA - BALL_R) {
    ballVel.x *= -1;
    ball.position.x = THREE.MathUtils.clamp(ball.position.x, -ARENA + BALL_R, ARENA - BALL_R);
  }
  if (ball.position.z < -10) {
    ballVel.z *= -1;
    ball.position.z = -10 + BALL_R;
  }

  // Paddle collision (SADDLE SURFACE PHYSICS)
  const padPos = paddle.position;
  const dist = Math.sqrt(
    Math.pow(ball.position.x - padPos.x, 2) +
    Math.pow(ball.position.z - padPos.z, 2)
  );

  if (dist < PADDLE_R + BALL_R && ball.position.y < padPos.y + 1.5 && ballVel.y < 0) {
    // Use saddle surface for reflection
    ballVel = reflectOnSaddle(ball.position, padPos, ballVel);
    ball.position.y = padPos.y + 1.5;

    // Rotate drill (phase propagation through twisted ribbon)
    drill.rotate(15);
    updateDrillViz();
  }

  // Floor (miss)
  if (ball.position.y < -5) {
    let lives = drill.drill(7, 'lives') || 3;
    lives--;
    drill.carve(7, 'lives', lives);
    document.getElementById('lives').textContent = lives;

    if (lives <= 0) {
      gameOver();
    } else {
      resetBall();
    }
  }

  // Brick collisions
  checkBrickCollisions();
}

function checkBrickCollisions() {
  for (let i = bricks.length - 1; i >= 0; i--) {
    const brick = bricks[i];
    if (!brick.userData.active) continue;

    // Simple sphere-box collision
    const brickPos = brick.position;
    const dx = Math.abs(ball.position.x - brickPos.x);
    const dy = Math.abs(ball.position.y - brickPos.y);
    const dz = Math.abs(ball.position.z - brickPos.z);

    if (dx < 1.1 && dy < 0.5 && dz < 0.6) {
      // Hit! Determine reflection direction
      if (dx > dz) {
        ballVel.x *= -1;
      } else {
        ballVel.z *= -1;
      }

      // Deactivate brick
      brick.userData.active = false;
      scene.remove(brick);

      // Update score (via drill Section 6 - TurnKey)
      let score = drill.drill(6, 'score') || 0;
      score += brick.userData.points;
      drill.carve(6, 'score', score);
      document.getElementById('score').textContent = score;

      // Update remaining bricks
      let remaining = drill.drill(3, 'remaining') || 0;
      remaining--;
      drill.carve(3, 'remaining', remaining);
      document.getElementById('bricks').textContent = remaining;

      // Rotate drill (collision energy)
      drill.rotate(5);
      updateDrillViz();

      // Check win
      if (remaining <= 0) {
        levelComplete();
      }

      break;  // One collision per frame
    }
  }
}

function resetBall() {
  launched = false;
  ball.position.copy(paddle.position);
  ball.position.y += 1;
  ball.position.z -= 1;
  ballVel.set(0, 0, 0);
  drill.carve(1, 'velocity', ballVel.clone());
}

function levelComplete() {
  let level = drill.drill(7, 'level') || 1;
  level++;
  drill.carve(7, 'level', level);
  document.getElementById('level').textContent = level;

  // Recreate bricks
  for (const brick of bricks) {
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
    `Final Score: ${drill.drill(6, 'score') || 0}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
function onMouseMove(e) {
  const x = (e.clientX / window.innerWidth - 0.5) * ARENA * 2;
  paddle.position.x = THREE.MathUtils.clamp(x, -ARENA + PADDLE_R, ARENA - PADDLE_R);
  drill.carve(2, 'position', paddle.position.clone());
}

function onKeyDown(e) {
  if (e.code === 'Space' && !launched) {
    launched = true;
    // Launch at angle based on paddle twist
    const angle = drill.sections[1].angle;  // Section 2 (Paddle) angle
    ballVel.set(
      Math.sin(angle) * SPEED * 0.5,
      SPEED * 0.3,
      -SPEED
    );
    drill.carve(1, 'velocity', ballVel.clone());
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
// DRILL VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════
function updateDrillViz() {
  const sections = document.querySelectorAll('.drill-section');
  sections.forEach((el, i) => {
    const sec = drill.sections[i];
    const brightness = Math.min(50 + sec.amplitude * 20, 100);
    el.style.filter = `brightness(${brightness}%)`;
    el.classList.toggle('active', drill.eating[i]);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME INIT
// ═══════════════════════════════════════════════════════════════════════════
function resetGame() {
  // Clear bricks
  for (const brick of bricks) {
    if (brick.parent) scene.remove(brick);
  }

  // Reset drill state
  drill = new GameDrill();
  drill.carve(7, 'lives', 3);
  drill.carve(7, 'level', 1);
  drill.carve(6, 'score', 0);

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

// Initialize
drill = new GameDrill();
drill.carve(7, 'lives', 3);
drill.carve(7, 'level', 1);
drill.carve(6, 'score', 0);
initThree();
animate();

// Expose startGame globally
window.startGame = startGame;
