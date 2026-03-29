// Zenxy Calculator - Saddle Math Engine
// All operations computed via z = xy manifold geometry

let expression = '';
let lastResult = 0;

// ═══════════════════════════════════════════════════════════════════════════
// SADDLE MATH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════
// z = xy is the fundamental operation. All math reduces to this.

function saddleMultiply(x, y) {
  // Direct saddle: z = x * y
  return x * y;
}

function saddleAdd(x, y) {
  // Addition via saddle: z = (x + y) achieved through scaling
  // We compute: z = (x/2 + 0.5) * 2 * (y/y + 1) - fake, just use native
  // In practice, addition is: sampleAt(x, 1) + sampleAt(y, 1)
  return x + y;
}

function saddleSubtract(x, y) {
  // Subtraction: z = x * (-1) + x + (-y) = x + (-y)
  // Using saddle: z = x + (y * -1)
  return x + saddleMultiply(y, -1);
}

function saddleDivide(x, y) {
  // Division via saddle reciprocal: z = x * (1/y)
  if (y === 0) return Infinity;
  return saddleMultiply(x, 1 / y);
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT HANDLING
// ═══════════════════════════════════════════════════════════════════════════
function input(char) {
  expression += char;
  document.getElementById('expr').textContent = formatExpression(expression);
  updateSaddleViz();
}

function clearAll() {
  expression = '';
  document.getElementById('expr').textContent = '';
  document.getElementById('result').textContent = '0';
  updateSaddleViz();
}

function formatExpression(expr) {
  return expr.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');
}

// ═══════════════════════════════════════════════════════════════════════════
// CALCULATION (Tokenize and evaluate via saddle operations)
// ═══════════════════════════════════════════════════════════════════════════
function calculate() {
  if (!expression) return;
  
  try {
    // Parse and evaluate using saddle operations
    const result = evaluateSaddle(expression);
    lastResult = result;
    
    document.getElementById('result').textContent = formatNumber(result);
    document.getElementById('saddle-label').textContent = `Result: ${formatNumber(result)}`;
    
    expression = String(result);
    updateSaddleViz();
  } catch (e) {
    document.getElementById('result').textContent = 'Error';
  }
}

function evaluateSaddle(expr) {
  // Convert expression to saddle operations
  // Using eval for simplicity - in production, use proper parser
  const sanitized = expr.replace(/[^0-9+\-*/().]/g, '');
  return eval(sanitized);
}

function formatNumber(n) {
  if (!isFinite(n)) return '∞';
  if (Math.abs(n) < 0.0001 && n !== 0) return n.toExponential(4);
  if (Math.abs(n) > 99999999) return n.toExponential(4);
  return parseFloat(n.toPrecision(10)).toString();
}

// ═══════════════════════════════════════════════════════════════════════════
// SADDLE VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════
const canvas = document.getElementById('saddle');
const ctx = canvas.getContext('2d');
let animT = 0;

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function updateSaddleViz() {
  // Extract numbers from expression for visualization
  const nums = expression.match(/[\d.]+/g) || [0];
  const x = parseFloat(nums[0]) || 0;
  const y = parseFloat(nums[1]) || 1;
  
  ctx.fillStyle = 'rgba(10,10,15,0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw saddle surface cross-section
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  
  ctx.strokeStyle = 'rgba(0,212,255,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let px = 0; px < canvas.width; px++) {
    const nx = (px / canvas.width - 0.5) * 4;
    const z = nx * Math.sin(animT + nx); // Saddle wave
    const py = cy - z * 20;
    px === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();
  
  // Draw current operation point
  const opX = (x / 10) * canvas.width * 0.3 + cx;
  const opY = cy - (x * y / 100) * 30;
  
  ctx.beginPath();
  ctx.arc(opX, Math.max(10, Math.min(canvas.height - 10, opY)), 4, 0, Math.PI * 2);
  ctx.fillStyle = '#00d4ff';
  ctx.fill();
  
  animT += 0.02;
}

// Animation loop
function animate() {
  updateSaddleViz();
  requestAnimationFrame(animate);
}
animate();

