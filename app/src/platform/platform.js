// Manifold Gaming Platform - Client
// Uses Diamond Drill geometry for all state management

// ═══════════════════════════════════════════════════════════════════════════
// MANIFOLD BACKGROUND ANIMATION (z=xy waveform)
// ═══════════════════════════════════════════════════════════════════════════
const canvas = document.getElementById('manifold-bg');
const ctx = canvas.getContext('2d');
let t = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function drawManifold() {
  ctx.fillStyle = 'rgba(10, 10, 16, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 7-section diamond drill visualization
  for (let section = 0; section < 7; section++) {
    const offset = section * (Math.PI * 2 / 7);
    for (let i = 0; i < 30; i++) {
      const theta = t + i * 0.2 + offset;
      const x = canvas.width / 2 + Math.cos(theta) * (100 + section * 60 + Math.sin(t + section) * 30);
      const y = canvas.height / 2 + Math.sin(theta) * (100 + section * 60 + Math.cos(t + section) * 30);
      const z = Math.sin(theta) * Math.cos(theta + section); // z=xy approximation
      const r = Math.abs(z) * 3 + 1;
      const hue = 180 + section * 20 + z * 30;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${0.2 + Math.abs(z) * 0.4})`;
      ctx.fill();
    }
  }
  t += 0.003;
  requestAnimationFrame(drawManifold);
}
drawManifold();

// ═══════════════════════════════════════════════════════════════════════════
// STATE (simulated platform substrate)
// ═══════════════════════════════════════════════════════════════════════════
const state = {
  user: null,
  sessionSeed: null,
  currentScreen: 'auth',
  currentPanel: 'games',
  rooms: new Map()
};

// Zenxy apps data - each app links to its implementation
const zenxyApps = [
  {name:"BrickBreaker 3D",desc:"Smash bricks via saddle surface physics on twisted ribbon",icon:"🧱",tags:["3D","Physics","Game"],url:"games/brickbreaker3d/index.html"},
  {name:"FastTrack",desc:"Strategic racing board game with Diamond Drill state",icon:"🎲",tags:["Board","Strategy"],url:"games/fasttrack/index.html"},
  {name:"Zenxy Calculator",desc:"Every operation via saddle math",icon:"🔢",tags:["Math","Tool"],url:"games/zenxy/calculator/index.html"},
  {name:"Saddle Synth",desc:"Audio synthesizer driven by saddle oscillations",icon:"🎹",tags:["Audio","Music"],url:"games/zenxy/synth/index.html"},
  {name:"Cipher Engine",desc:"2^2058 possible keys — unbreakable encryption",icon:"🔐",tags:["Crypto","Security"],url:"games/zenxy/cipher/index.html"},
  {name:"Neural Playground",desc:"Train neural networks by flipping cube faces",icon:"🧠",tags:["AI","Neural"],url:"games/zenxy/neural/index.html"},
  {name:"Fractal Dive",desc:"Infinite recursive exploration",icon:"🌀",tags:["Fractal","Visual"],url:"games/zenxy/fractal/index.html"},
  {name:"Particle Flow",desc:"Millions of particles follow saddle surface",icon:"✨",tags:["Particles","Visual"],url:"games/zenxy/particles/index.html"},
  {name:"Terrain Generator",desc:"3D landscapes from saddle evaluations",icon:"🏔️",tags:["Terrain","3D"],url:"games/zenxy/terrain/index.html"},
  {name:"Logic Lab",desc:"Build digital circuits from saddle gates",icon:"⚡",tags:["Logic","Circuit"],url:"games/zenxy/logic/index.html"}
];

const arcadeGames = [
  {name:"Void Breaker",desc:"3D Breakout with curved manifold paddle",icon:"💥",tags:["3D","Arcade"]},
  {name:"Wave Defense",desc:"360° arena space invaders",icon:"👾",tags:["3D","Shooter"]},
  {name:"Asteroid Field",desc:"6DOF flight through fractal asteroids",icon:"🚀",tags:["3D","Flight"]}
];

// ═══════════════════════════════════════════════════════════════════════════
// UI FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId)?.classList.add('active');
  state.currentScreen = screenId;
}

function showPanel(panelId) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`${panelId}-panel`)?.classList.add('active');
  document.querySelector(`[data-app="${panelId}"]`)?.classList.add('active');
  state.currentPanel = panelId;
}

// Auth tab switching
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tab.dataset.tab}-form`)?.classList.add('active');
  });
});

// Nav buttons
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => showPanel(btn.dataset.app));
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
document.getElementById('login-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  authenticate(username);
});

document.getElementById('register-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value;
  authenticate(username);
});

function authenticate(username) {
  // Simulated authentication with geometric seed
  state.user = {
    id: crypto.randomUUID(),
    username,
    avatar: '👤',
    prestige: 'BRONZE',
    points: 0
  };
  state.sessionSeed = Math.floor(Math.random() * 0xFFFFFFFF);
  
  // Update UI
  document.querySelector('.username').textContent = username;
  showScreen('lobby-screen');
  loadApps();
}

window.guestMode = () => authenticate('Guest_' + Math.random().toString(36).substr(2, 4));
window.joinByCode = () => {
  const code = prompt('Enter game code:');
  if (code) { authenticate('Guest'); joinRoom(code.toUpperCase()); }
};

// ═══════════════════════════════════════════════════════════════════════════
// LOAD APPS INTO GRIDS
// ═══════════════════════════════════════════════════════════════════════════
function loadApps() {
  // Zenxy grid
  const zenxyGrid = document.getElementById('zenxy-grid');
  zenxyGrid.innerHTML = zenxyApps.map(app => `
    <a href="${app.url || '#'}" class="app-card" ${!app.url ? `onclick="launchApp('${app.name}')"` : ''}>
      <div class="app-card-icon">${app.icon}</div>
      <div class="app-card-body">
        <div class="app-card-title">${app.name}</div>
        <div class="app-card-desc">${app.desc}</div>
        <div class="app-card-tags">${app.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
    </a>
  `).join('');

  // Arcade grid
  const arcadeGrid = document.getElementById('arcade-grid');
  arcadeGrid.innerHTML = arcadeGames.map(app => `
    <div class="app-card" onclick="launchApp('${app.name}')">
      <div class="app-card-icon">${app.icon}</div>
      <div class="app-card-body">
        <div class="app-card-title">${app.name}</div>
        <div class="app-card-desc">${app.desc}</div>
        <div class="app-card-tags">${app.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME ROOM FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    // Use seed + section for deterministic but unique codes
    const idx = Math.floor(Math.random() * chars.length);
    code += chars[idx];
  }
  return code;
}

window.createGame = (gameType) => {
  const code = generateCode();
  const room = {
    id: crypto.randomUUID(),
    code,
    host: state.user.id,
    hostName: state.user.username,
    players: [state.user],
    maxPlayers: 4,
    game: gameType,
    status: 'waiting'
  };
  state.rooms.set(code, room);
  enterRoom(code);
};

window.createPrivate = () => window.createGame('fasttrack');
window.quickMatch = () => {
  // Find existing room or create new
  for (const [code, room] of state.rooms) {
    if (room.status === 'waiting' && room.players.length < room.maxPlayers) {
      joinRoom(code);
      return;
    }
  }
  window.createGame('fasttrack');
};

window.vsAI = () => {
  const code = generateCode();
  const room = {
    id: crypto.randomUUID(),
    code,
    host: state.user.id,
    hostName: state.user.username,
    players: [state.user, { username: '🤖 Bot-Easy', isBot: true }, { username: '🤖 Bot-Medium', isBot: true }],
    maxPlayers: 4,
    game: 'fasttrack',
    status: 'waiting',
    isOffline: true
  };
  state.rooms.set(code, room);
  enterRoom(code);
};

function joinRoom(code) {
  const room = state.rooms.get(code);
  if (room && room.status === 'waiting' && room.players.length < room.maxPlayers) {
    room.players.push(state.user);
    enterRoom(code);
  } else {
    alert('Room not found or full!');
  }
}

function enterRoom(code) {
  const room = state.rooms.get(code);
  if (!room) return;

  document.getElementById('room-code').textContent = code;
  document.getElementById('room-content').innerHTML = `
    <div class="glass-panel" style="max-width: 600px; margin: 0 auto;">
      <h2 style="margin-bottom: 20px;">🎲 ${room.game.toUpperCase()}</h2>

      <div style="margin-bottom: 20px;">
        <h3>Players (${room.players.length}/${room.maxPlayers})</h3>
        <div id="player-list" style="margin-top: 10px;">
          ${room.players.map((p, i) => `
            <div style="padding: 10px; background: rgba(0,212,255,0.1); border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.5rem;">${p.isBot ? '🤖' : '👤'}</span>
              <span>${p.username}${p.id === room.host ? ' 👑' : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="color: var(--text-secondary);">Share this code with friends:</p>
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <input type="text" value="${window.location.origin}?join=${code}" readonly
                 style="flex: 1; padding: 12px; background: rgba(0,0,0,0.4); border: 1px solid var(--border-glow);
                        border-radius: 8px; color: var(--text-primary);">
          <button class="btn btn-secondary" onclick="navigator.clipboard.writeText('${code}')">📋 Copy</button>
        </div>
      </div>

      ${room.host === state.user.id ? `
        <button class="btn btn-primary" onclick="startGame('${code}')" ${room.players.length < 2 ? 'disabled' : ''}>
          ⚡ Start Game ${room.players.length < 2 ? '(Need 2+ players)' : ''}
        </button>
      ` : `
        <p style="text-align: center; color: var(--text-secondary);">Waiting for host to start...</p>
      `}
    </div>
  `;
  showScreen('game-room-screen');
}

window.leaveRoom = () => showScreen('lobby-screen');
window.copyRoomLink = () => {
  const code = document.getElementById('room-code').textContent;
  navigator.clipboard.writeText(`${window.location.origin}?join=${code}`);
};

window.startGame = (code) => {
  const room = state.rooms.get(code);
  if (room) {
    room.status = 'playing';
    // Launch actual game - would redirect to FastTrack game page
    document.getElementById('room-content').innerHTML = `
      <div class="glass-panel" style="text-align: center; max-width: 600px; margin: 0 auto;">
        <h2>🎮 Game Starting...</h2>
        <p style="margin-top: 20px; color: var(--text-secondary);">Loading ${room.game} with ${room.players.length} players</p>
        <div style="margin-top: 30px; font-size: 4rem;">🎲</div>
        <p style="margin-top: 20px;">
          <a href="games/fasttrack/index.html" class="btn btn-primary" style="display: inline-block; width: auto;">
            Launch FastTrack
          </a>
        </p>
      </div>
    `;
  }
};

window.launchApp = (appName) => {
  alert(`Launching ${appName}...\n\nThis app will be ported to the Manifold paradigm.`);
};

window.showGuildBrowser = () => {
  showPanel('games');
  alert('Guild browser coming soon!');
};

// Check for join code in URL
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('join')) {
  const code = urlParams.get('join');
  // Auto-authenticate as guest and join
  window.guestMode();
  setTimeout(() => joinRoom(code), 100);
}

