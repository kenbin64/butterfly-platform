/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KENSGAMES LOBBY MANIFOLD
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Player lobby with AI players, private games, and matchmaking.
 * All state encoded in Diamond Drill manifold.
 *
 * MATCHMAKING MODES:
 *   SOLO     - 1 human + 2-3 AI players
 *   RANDOM   - 3-4 players, quick match
 *   PRIVATE  - 2-6 players, invite code
 *   AI_ONLY  - Practice with all AI
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

const LobbyManifold = {
  manifold: null,  // GameManifold instance
  players: new Map(),
  rooms: new Map(),
  aiPool: [],
  
  MODES: {
    SOLO:    { min: 1, max: 4, ai: true, aiRequired: true },
    RANDOM:  { min: 3, max: 4, ai: false },
    PRIVATE: { min: 2, max: 6, ai: true },
    AI_ONLY: { min: 1, max: 1, ai: true, aiRequired: true }
  },

  MATCHMAKER_TIMEOUT: 30000,  // 30s to find players

  init(manifold) {
    this.manifold = manifold || new GameManifold();
    this.initAIPool();
    return this;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PLAYER IDENTITY (Section 1)
  // ═══════════════════════════════════════════════════════════════════════
  createPlayer(username, avatarId = '👤') {
    const id = `player_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
    const player = {
      id, username, avatarId,
      isAI: false,
      status: 'online',  // online, searching, in_game
      currentRoom: null,
      stats: { wins: 0, losses: 0, games: 0 },
      createdAt: Date.now()
    };
    
    this.players.set(id, player);
    this.manifold?.carve(1, `player.${id}`, player);
    
    // Save to localStorage
    this.saveProfile(player);
    
    return player;
  },

  // Save/load profile locally
  saveProfile(player) {
    try {
      localStorage.setItem('kensgames_profile', JSON.stringify(player));
    } catch(e) { console.warn('Could not save profile', e); }
  },

  loadProfile() {
    try {
      const data = localStorage.getItem('kensgames_profile');
      if (data) {
        const player = JSON.parse(data);
        this.players.set(player.id, player);
        this.manifold?.carve(1, `player.${player.id}`, player);
        return player;
      }
    } catch(e) { console.warn('Could not load profile', e); }
    return null;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AI PLAYERS
  // ═══════════════════════════════════════════════════════════════════════
  AI_NAMES: ['Bot Alpha', 'Bot Beta', 'Bot Gamma', 'Bot Delta', 'Robo', 'Chip', 'Byte', 'HAL', 'GLaDOS'],
  AI_DIFFICULTIES: { easy: 0.2, medium: 0.5, hard: 0.8, expert: 0.95 },

  initAIPool() {
    this.aiPool = this.AI_NAMES.map((name, i) => ({
      id: `ai_${i}`,
      username: name,
      avatarId: '🤖',
      isAI: true,
      difficulty: i < 3 ? 'easy' : i < 6 ? 'medium' : 'hard',
      status: 'available'
    }));
  },

  getAvailableAI(count = 1, difficulty = 'medium') {
    const available = this.aiPool.filter(ai => ai.status === 'available');
    return available.slice(0, count).map(ai => {
      ai.status = 'in_game';
      ai.difficulty = difficulty;
      return ai;
    });
  },

  releaseAI(aiIds) {
    aiIds.forEach(id => {
      const ai = this.aiPool.find(a => a.id === id);
      if (ai) ai.status = 'available';
    });
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ROOM MANAGEMENT (Section 3)
  // ═══════════════════════════════════════════════════════════════════════
  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  },

  createRoom(hostId, gameId, mode = 'RANDOM', options = {}) {
    const modeConfig = this.MODES[mode] || this.MODES.RANDOM;
    const host = this.players.get(hostId);
    if (!host) return { success: false, error: 'Player not found' };

    const code = this.generateCode();
    const room = {
      id: `room_${Date.now()}`,
      code,
      hostId,
      gameId,
      mode,
      players: [host],
      aiPlayers: [],
      maxPlayers: options.maxPlayers || modeConfig.max,
      minPlayers: options.minPlayers || modeConfig.min,
      status: 'waiting',  // waiting, starting, playing, ended
      createdAt: Date.now(),
      settings: { aiDifficulty: options.aiDifficulty || 'medium' }
    };

    // Add AI if solo mode
    if (modeConfig.aiRequired) {
      const aiCount = room.maxPlayers - 1;
      room.aiPlayers = this.getAvailableAI(aiCount, room.settings.aiDifficulty);
    }

    this.rooms.set(code, room);
    host.currentRoom = code;
    host.status = 'searching';
    
    this.manifold?.carve(3, `room.${code}`, room);
    
    return { success: true, room, code };
  },

  joinRoom(playerId, code) {
    const room = this.rooms.get(code);
    const player = this.players.get(playerId);
    
    if (!room) return { success: false, error: 'Room not found' };
    if (!player) return { success: false, error: 'Player not found' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already started' };
    if (room.players.length >= room.maxPlayers) return { success: false, error: 'Room is full' };
    
    room.players.push(player);
    player.currentRoom = code;
    player.status = 'searching';
    
    this.manifold?.carve(3, `room.${code}`, room);
    
    this.checkAutoStart(code);
    
    return { success: true, room };
  },

  checkAutoStart(code) {
    const room = this.rooms.get(code);
    if (!room) return;
    
    const totalPlayers = room.players.length + room.aiPlayers.length;
    if (totalPlayers >= room.minPlayers && room.status === 'waiting') {
      // Start after brief delay
      setTimeout(() => this.startGame(code), 1000);
    }
  },

  startGame(code) {
    const room = this.rooms.get(code);
    if (!room || room.status !== 'waiting') return { success: false };
    
    room.status = 'playing';
    room.players.forEach(p => p.status = 'in_game');
    this.manifold?.carve(3, `room.${code}`, room);
    
    return { success: true, room };
  },

  // ═══════════════════════════════════════════════════════════════════════
  // QUICK ACTIONS
  // ═══════════════════════════════════════════════════════════════════════
  quickMatch(playerId, gameId) {
    // Find existing room or create new
    for (const [code, room] of this.rooms) {
      if (room.gameId === gameId && room.status === 'waiting' && 
          room.mode === 'RANDOM' && room.players.length < room.maxPlayers) {
        return this.joinRoom(playerId, code);
      }
    }
    return this.createRoom(playerId, gameId, 'RANDOM');
  },

  vsAI(playerId, gameId, difficulty = 'medium') {
    return this.createRoom(playerId, gameId, 'SOLO', { aiDifficulty: difficulty });
  },

  practiceMode(playerId, gameId) {
    return this.createRoom(playerId, gameId, 'AI_ONLY', { maxPlayers: 4 });
  },

  leaveRoom(playerId, code) {
    const room = this.rooms.get(code);
    const player = this.players.get(playerId);
    if (!room || !player) return;
    
    room.players = room.players.filter(p => p.id !== playerId);
    player.currentRoom = null;
    player.status = 'online';
    
    // Release AI if room empty
    if (room.players.length === 0) {
      this.releaseAI(room.aiPlayers.map(a => a.id));
      this.rooms.delete(code);
    } else {
      // Transfer host
      if (room.hostId === playerId && room.players.length > 0) {
        room.hostId = room.players[0].id;
      }
      this.manifold?.carve(3, `room.${code}`, room);
    }
  }
};

// Export
if (typeof window !== 'undefined') {
  window.LobbyManifold = LobbyManifold;
}

