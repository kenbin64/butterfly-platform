/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KENSGAMES - Diamond Drill Gaming Platform
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * All state managed via GameManifold and LobbyManifold.
 * Substrate-as-seed: ~500 bytes stores infinite game state.
 *
 * DIAMOND DRILL GEOMETRY:
 *   7 sections, TurnKeys at 2,4,6
 *   z=xy saddle surface for deterministic extraction
 *   Dining Philosophers for thread-safe access
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const KensGames = {
  manifold: null,
  player: null,
  selectedGame: null,
  currentRoom: null,

  AVATARS: ['👤', '😎', '🎮', '🎲', '🚀', '⚡', '🔥', '💎', '🌟', '🎯', '👾', '🤖'],

  // ═══════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════
  init() {
    this.manifold = new GameManifold();
    LobbyManifold.init(this.manifold);
    
    this.initBackground();
    this.initAvatarPicker();
    this.loadGames();
    
    // Try to load saved profile
    const saved = LobbyManifold.loadProfile();
    if (saved) {
      this.player = saved;
      document.getElementById('username-input').value = saved.username;
      this.selectAvatar(saved.avatarId);
    }
    
    console.log('KensGames initialized. Manifold seed:', this.manifold.seed.toString(16));
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MANIFOLD BACKGROUND ANIMATION
  // ═══════════════════════════════════════════════════════════════════════
  initBackground() {
    const canvas = document.getElementById('manifold-bg');
    const ctx = canvas.getContext('2d');
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 10, 16, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 7-section diamond drill visualization
      for (let section = 0; section < 7; section++) {
        const offset = section * (Math.PI * 2 / 7);
        const isTurnKey = section === 1 || section === 3 || section === 5;
        
        for (let i = 0; i < 25; i++) {
          const theta = t + i * 0.25 + offset;
          const radius = 80 + section * 50 + Math.sin(t * 0.5 + section) * 20;
          const x = canvas.width / 2 + Math.cos(theta) * radius;
          const y = canvas.height / 2 + Math.sin(theta) * radius;
          
          // z = xy on twisted ribbon
          const z = Math.sin(theta) * Math.cos(theta + section * 0.5);
          const r = Math.abs(z) * 3 + 1;
          
          const hue = isTurnKey ? 320 : 180 + section * 20;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${0.15 + Math.abs(z) * 0.3})`;
          ctx.fill();
        }
      }
      t += 0.004;
      requestAnimationFrame(draw);
    };
    draw();
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AUTH / PROFILE
  // ═══════════════════════════════════════════════════════════════════════
  initAvatarPicker() {
    const grid = document.getElementById('avatar-grid');
    grid.innerHTML = this.AVATARS.map((av, i) => 
      `<div class="avatar-option${i===0?' selected':''}" data-avatar="${av}" onclick="KensGames.selectAvatar('${av}')">${av}</div>`
    ).join('');
  },

  selectAvatar(avatar) {
    document.querySelectorAll('.avatar-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.avatar === avatar);
    });
  },

  getSelectedAvatar() {
    return document.querySelector('.avatar-option.selected')?.dataset.avatar || '👤';
  },

  enterPlatform() {
    const username = document.getElementById('username-input').value.trim();
    if (!username) { alert('Please enter a username'); return; }
    
    const avatar = this.getSelectedAvatar();
    this.player = LobbyManifold.createPlayer(username, avatar);
    
    this.showLobby();
  },

  guestMode() {
    const guestName = 'Guest_' + Math.random().toString(36).substr(2, 4);
    this.player = LobbyManifold.createPlayer(guestName, '👤');
    this.showLobby();
  },

  joinByCode() {
    const code = prompt('Enter 6-character room code:');
    if (!code) return;
    
    if (!this.player) this.guestMode();
    
    const result = LobbyManifold.joinRoom(this.player.id, code.toUpperCase());
    if (result.success) {
      this.currentRoom = result.room;
      this.showRoom();
    } else {
      alert(result.error || 'Could not join room');
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SCREENS
  // ═══════════════════════════════════════════════════════════════════════
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
  },

  showLobby() {
    document.getElementById('display-name').textContent = this.player.username;
    document.getElementById('display-avatar').textContent = this.player.avatarId;
    this.showScreen('lobby-screen');
    this.updateRoomList();
  },

  showRoom() {
    document.getElementById('room-code').textContent = this.currentRoom.code;
    this.updateRoomPlayers();
    this.showScreen('room-screen');
  },

  // ═══════════════════════════════════════════════════════════════════════
  // GAME SELECTION
  // ═══════════════════════════════════════════════════════════════════════
  loadGames() {
    const container = document.getElementById('game-cards');
    const games = GameRegistry.list();
    
    container.innerHTML = games.map(g => `
      <div class="game-card" data-game="${g.id}" onclick="KensGames.selectGame('${g.id}')">
        <div class="game-icon">${g.icon}</div>
        <div class="game-title">${g.name}</div>
        <div class="game-desc">${g.desc}</div>
        <div class="game-players">${g.minPlayers}-${g.maxPlayers} players${g.aiSupport ? ' • AI Support' : ''}</div>
      </div>
    `).join('');
  },

  selectGame(gameId) {
    this.selectedGame = GameRegistry.get(gameId);

    document.querySelectorAll('.game-card').forEach(el => {
      el.classList.toggle('selected', el.dataset.game === gameId);
    });

    document.getElementById('selected-game-title').textContent = this.selectedGame.name;
    document.getElementById('matchmaking-panel').style.display = 'block';
    document.getElementById('ai-settings').style.display = this.selectedGame.aiSupport ? 'block' : 'none';
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MATCHMAKING
  // ═══════════════════════════════════════════════════════════════════════
  vsAI() {
    if (!this.selectedGame) { alert('Select a game first'); return; }

    const difficulty = document.getElementById('ai-difficulty').value;
    const result = LobbyManifold.vsAI(this.player.id, this.selectedGame.id, difficulty);

    if (result.success) {
      this.currentRoom = result.room;
      this.showRoom();
    } else {
      alert(result.error || 'Could not create game');
    }
  },

  quickMatch() {
    if (!this.selectedGame) { alert('Select a game first'); return; }

    const result = LobbyManifold.quickMatch(this.player.id, this.selectedGame.id);
    if (result.success) {
      this.currentRoom = result.room;
      this.showRoom();
    } else {
      alert(result.error || 'Could not find/create game');
    }
  },

  createPrivate() {
    if (!this.selectedGame) { alert('Select a game first'); return; }

    const result = LobbyManifold.createRoom(this.player.id, this.selectedGame.id, 'PRIVATE');
    if (result.success) {
      this.currentRoom = result.room;
      this.showRoom();
    } else {
      alert(result.error || 'Could not create room');
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ROOM MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════
  updateRoomPlayers() {
    const container = document.getElementById('room-players');
    if (!this.currentRoom) return;

    const allPlayers = [...this.currentRoom.players, ...this.currentRoom.aiPlayers];

    container.innerHTML = allPlayers.map(p => `
      <div class="player-item">
        <span class="player-avatar">${p.avatarId}</span>
        <span class="player-name">${p.username}</span>
        ${p.id === this.currentRoom.hostId ? '<span class="player-badge badge-host">HOST</span>' : ''}
        ${p.isAI ? '<span class="player-badge badge-ai">AI</span>' : ''}
      </div>
    `).join('');

    // Enable start if host and enough players
    const isHost = this.currentRoom.hostId === this.player.id;
    const hasEnough = allPlayers.length >= this.currentRoom.minPlayers;
    document.getElementById('start-btn').disabled = !(isHost && hasEnough);
  },

  updateRoomList() {
    const container = document.getElementById('room-list');
    const rooms = Array.from(LobbyManifold.rooms.values()).filter(r => r.status === 'waiting');

    if (rooms.length === 0) {
      container.innerHTML = '<p class="empty-state">No active rooms. Create one above!</p>';
      return;
    }

    container.innerHTML = rooms.map(r => {
      const game = GameRegistry.get(r.gameId);
      const total = r.players.length + r.aiPlayers.length;
      return `
        <div class="room-item">
          <div class="room-info">
            <div class="room-game">${game?.icon || '🎮'} ${game?.name || r.gameId}</div>
            <div class="room-status">${total}/${r.maxPlayers} players • ${r.code}</div>
          </div>
          <button class="btn btn-secondary room-join" onclick="KensGames.joinRoomByCode('${r.code}')">Join</button>
        </div>
      `;
    }).join('');
  },

  joinRoomByCode(code) {
    const result = LobbyManifold.joinRoom(this.player.id, code);
    if (result.success) {
      this.currentRoom = result.room;
      this.showRoom();
    } else {
      alert(result.error || 'Could not join room');
    }
  },

  leaveRoom() {
    if (this.currentRoom) {
      LobbyManifold.leaveRoom(this.player.id, this.currentRoom.code);
      this.currentRoom = null;
    }
    this.showLobby();
  },

  copyCode() {
    if (this.currentRoom) {
      navigator.clipboard.writeText(this.currentRoom.code);
      alert('Code copied: ' + this.currentRoom.code);
    }
  },

  startGame() {
    if (!this.currentRoom) return;

    const result = LobbyManifold.startGame(this.currentRoom.code);
    if (result.success) {
      // Launch the actual game
      const game = GameRegistry.get(this.currentRoom.gameId);
      if (game?.url) {
        window.location.href = game.url;
      }
    }
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => KensGames.init());

