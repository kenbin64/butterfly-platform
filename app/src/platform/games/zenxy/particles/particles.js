// Particle Flow - Saddle Surface Dynamics
// Particles follow the gradient of z = xy

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let W, H, CX, CY;
let particles = [];
let settings = { count: 10000, speed: 1.0, intensity: 1.0, colorMode: 'gradient' };
let t = 0, lastTime = 0, fps = 0;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  CX = W / 2; CY = H / 2;
}
resize();
window.addEventListener('resize', () => { resize(); initParticles(); });

// ═══════════════════════════════════════════════════════════════════════════
// SADDLE SURFACE: z = xy
// Gradient: ∇z = (y, x) - particles flow along this gradient
// ═══════════════════════════════════════════════════════════════════════════
function saddleZ(x, y) {
  return x * y * settings.intensity;
}

function saddleGradient(x, y) {
  // Gradient of z = xy is (∂z/∂x, ∂z/∂y) = (y, x)
  // Add rotation for visual interest
  const rotatedX = y * Math.cos(t * 0.5) - x * Math.sin(t * 0.5);
  const rotatedY = y * Math.sin(t * 0.5) + x * Math.cos(t * 0.5);
  return { dx: rotatedX * settings.intensity, dy: rotatedY * settings.intensity };
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTICLE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
class Particle {
  constructor() { this.reset(); }
  
  reset() {
    this.x = (Math.random() - 0.5) * W * 1.5;
    this.y = (Math.random() - 0.5) * H * 1.5;
    this.vx = 0; this.vy = 0;
    this.life = Math.random() * 200 + 100;
    this.maxLife = this.life;
  }
  
  update() {
    // Normalize position to [-1, 1]
    const nx = this.x / (W / 2);
    const ny = this.y / (H / 2);
    
    // Get saddle gradient
    const grad = saddleGradient(nx, ny);
    
    // Apply gradient as acceleration
    this.vx += grad.dx * 0.02 * settings.speed;
    this.vy += grad.dy * 0.02 * settings.speed;
    
    // Damping
    this.vx *= 0.98;
    this.vy *= 0.98;
    
    // Update position
    this.x += this.vx;
    this.y += this.vy;
    
    this.life--;
    
    // Reset if out of bounds or dead
    if (this.life <= 0 || Math.abs(this.x) > W || Math.abs(this.y) > H) {
      this.reset();
    }
  }
  
  draw() {
    const alpha = Math.min(1, this.life / 50);
    const screenX = this.x + CX;
    const screenY = this.y + CY;
    
    let color;
    switch (settings.colorMode) {
      case 'velocity':
        const vel = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const hue = 200 + vel * 100;
        color = `hsla(${hue}, 80%, 60%, ${alpha})`;
        break;
      case 'position':
        const posHue = ((this.x / W + 0.5) * 180 + (this.y / H + 0.5) * 180) % 360;
        color = `hsla(${posHue}, 70%, 55%, ${alpha})`;
        break;
      case 'rainbow':
        const rainbowHue = (t * 50 + this.life) % 360;
        color = `hsla(${rainbowHue}, 80%, 60%, ${alpha})`;
        break;
      default: // gradient
        const z = saddleZ(this.x / CX, this.y / CY);
        const gradHue = 200 + z * 30;
        color = `hsla(${gradHue}, 75%, 60%, ${alpha})`;
    }
    
    ctx.fillStyle = color;
    ctx.fillRect(screenX, screenY, 2, 2);
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < settings.count; i++) {
    particles.push(new Particle());
  }
  document.getElementById('particleCount').textContent = settings.count;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════════════════════════════════════
function animate(timestamp) {
  // FPS calculation
  fps = 1000 / (timestamp - lastTime);
  lastTime = timestamp;
  if (Math.random() < 0.1) document.getElementById('fps').textContent = Math.round(fps);
  
  // Clear with trail effect
  ctx.fillStyle = 'rgba(10, 10, 16, 0.15)';
  ctx.fillRect(0, 0, W, H);
  
  // Update and draw particles
  for (const p of particles) {
    p.update();
    p.draw();
  }
  
  t += 0.01;
  requestAnimationFrame(animate);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTROLS
// ═══════════════════════════════════════════════════════════════════════════
function updateCount() {
  settings.count = parseInt(document.getElementById('count').value);
  document.getElementById('countVal').textContent = settings.count;
  initParticles();
}
function updateSpeed() {
  settings.speed = parseFloat(document.getElementById('speed').value);
  document.getElementById('speedVal').textContent = settings.speed.toFixed(1);
}
function updateIntensity() {
  settings.intensity = parseFloat(document.getElementById('intensity').value);
  document.getElementById('intensityVal').textContent = settings.intensity.toFixed(1);
}
function updateColorMode() {
  settings.colorMode = document.getElementById('colorMode').value;
}

// Initialize
initParticles();
animate(0);

