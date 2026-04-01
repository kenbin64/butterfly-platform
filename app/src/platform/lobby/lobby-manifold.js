/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KENSGAMES LOBBY MANIFOLD — Manifold-Native Player Lobby
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Player lobby with AI players, private games, and matchmaking.
 * All state stored as PathExpr addresses via RepresentationTable.
 * No local Map data objects. No GameManifold.carve(). No data drift.
 *
 * MATCHMAKING MODES:
 *   SOLO     — 1 human + 2-3 AI players
 *   RANDOM   — 3-4 players, quick match
 *   PRIVATE  — 2-6 players, invite code
 *   AI_ONLY  — Practice with all AI
 *
 * Stack:
 *   LobbyManifold (player/room RepresentationTables)
 *     ↓
 *   RepresentationTable (addresses, not bytes)
 *     ↓
 *   PathExpressions → Manifold (z = x·y)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Lightweight RepresentationTable (browser-side, address-only) ──────────
class LobbyRepTable {
  constructor(name) { this.name = name; this._d = new Map(); this._s = new Map(); }
  set(key, value) { this._d.set(key, value); }
  get(key) { return this._d.get(key); }
  setString(key, value) { this._s.set(key, value); }
  getString(key) { return this._s.get(key); }
  has(key) { return this._d.has(key) || this._s.has(key); }
  get size() { return this._d.size + this._s.size; }
}

// ─── Path expressions (z = x·y manifold discovery) ───────────────────────
function discoverPath(seed, section) {
  const x = ((seed * 2654435761) >>> 0) / 4294967296;
  const y = ((seed * 340573321 + section * 1337) >>> 0) / 4294967296;
  return { x, y, section };
}
function evaluatePath(path) {
  return path.x * path.y;  // z = x·y
}

const LobbyManifold = {
  /** @type {Map<string, RepresentationTable>} player id → RepresentationTable */
  _playerTables: new Map(),
  /** @type {Map<string, RepresentationTable>} room code → RepresentationTable */
  _roomTables: new Map(),
  /** @type {RepresentationTable[]} AI player tables */
  _aiTables: [],

  MODES: {
    SOLO:    { min: 1, max: 4, ai: true, aiRequired: true },
    RANDOM:  { min: 3, max: 4, ai: false },
    PRIVATE: { min: 2, max: 6, ai: true },
    AI_ONLY: { min: 1, max: 1, ai: true, aiRequired: true }
  },

  MATCHMAKER_TIMEOUT: 30000,

  AI_NAMES: ["Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta", "Robo", "Chip", "Byte", "HAL", "GLaDOS"],

  init() {
    this._playerTables.clear();
    this._roomTables.clear();
    this._initAIPool();
    return this;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PLAYER IDENTITY — RepresentationTable per player
  // ═══════════════════════════════════════════════════════════════════════
  createPlayer(username, avatarId = "👤") {
    const id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const table = new LobbyRepTable(`player:${id}`);

    table.setString("id", id);
    table.setString("username", username);
    table.setString("avatarId", avatarId);
    table.set("isAI", 0, 0);             // section 0 = AUTH
    table.set("status", 0, 0);           // 0=online, 1=searching, 2=in_game
    table.set("wins", 0, 0);
    table.set("losses", 0, 0);
    table.set("games", 0, 0);
    table.set("createdAt", Date.now(), 0);

    this._playerTables.set(id, table);

    const player = this._materializePlayer(id, table);
    this._saveProfile(player);
    return player;
  },

  _materializePlayer(id, table) {
    const statusMap = { 0: "online", 1: "searching", 2: "in_game" };
    return {
      id: table.getString("id") || id,
      username: table.getString("username") || "",
      avatarId: table.getString("avatarId") || "👤",
      isAI: (table.get("isAI") || 0) > 0.5,
      status: statusMap[Math.round(table.get("status") || 0)] || "online",
      currentRoom: table.getString("currentRoom") || null,
      stats: {
        wins: Math.round(table.get("wins") || 0),
        losses: Math.round(table.get("losses") || 0),
        games: Math.round(table.get("games") || 0),
      },
      createdAt: Math.round(table.get("createdAt") || 0),
      difficulty: table.getString("difficulty") || undefined,
    };
  },

  _saveProfile(player) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("kensgames_profile", JSON.stringify(player));
      }
    } catch (e) { /* silent */ }
  },

  loadProfile() {
    try {
      if (typeof localStorage === "undefined") return null;
      const data = localStorage.getItem("kensgames_profile");
      if (data) {
        const player = JSON.parse(data);
        // Re-register as RepresentationTable
        const table = new LobbyRepTable(`player:${player.id}`);
        table.setString("id", player.id);
        table.setString("username", player.username);
        table.setString("avatarId", player.avatarId || "👤");
        table.set("isAI", 0, 0);
        table.set("status", 0, 0);
        table.set("wins", player.stats?.wins || 0, 0);
        table.set("losses", player.stats?.losses || 0, 0);
        table.set("games", player.stats?.games || 0, 0);
        this._playerTables.set(player.id, table);
        return player;
      }
    } catch (e) { /* silent */ }
    return null;
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AI PLAYERS — RepresentationTable per AI
  // ═══════════════════════════════════════════════════════════════════════
  _initAIPool() {
    this._aiTables = this.AI_NAMES.map((name, i) => {
      const table = new LobbyRepTable(`ai:${i}`);
      table.setString("id", `ai_${i}`);
      table.setString("username", name);
      table.setString("avatarId", "🤖");
      table.set("isAI", 1, 0);
      table.setString("difficulty", i < 3 ? "easy" : i < 6 ? "medium" : "hard");
      table.set("status", 0, 0);  // 0=available, 2=in_game
      return table;
    });
  },

  getAvailableAI(count = 1, difficulty = "medium") {
    const result = [];
    for (const table of this._aiTables) {
      if (result.length >= count) break;
      if (Math.round(table.get("status") || 0) === 0) {
        table.set("status", 2, 0);  // in_game
        table.setString("difficulty", difficulty);
        result.push(this._materializePlayer(table.getString("id"), table));
      }
    }
    return result;
  },

  releaseAI(aiIds) {
    for (const id of aiIds) {
      const table = this._aiTables.find(t => t.getString("id") === id);
      if (table) table.set("status", 0, 0);  // available
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ROOM MANAGEMENT — RepresentationTable per room
  // ═══════════════════════════════════════════════════════════════════════
  _generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      const path = discoverPath(Date.now() + i * 1337, i % 7);
      const z = Math.abs(evaluatePath(path));
      code += chars[Math.floor(z * 1000) % chars.length];
    }
    return code;
  },

  createRoom(hostId, gameId, mode = "RANDOM", options = {}) {
    const modeConfig = this.MODES[mode] || this.MODES.RANDOM;
    const hostTable = this._playerTables.get(hostId);
    if (!hostTable) return { success: false, error: "Player not found" };

    const code = this._generateCode();
    const table = new LobbyRepTable(`room:${code}`);

    table.setString("id", `room_${Date.now()}`);
    table.setString("code", code);
    table.setString("hostId", hostId);
    table.setString("gameId", gameId);
    table.setString("mode", mode);
    table.set("maxPlayers", options.maxPlayers || modeConfig.max, 2);
    table.set("minPlayers", options.minPlayers || modeConfig.min, 2);
    table.set("status", 0, 2);        // 0=waiting, 1=starting, 2=playing, 3=ended
    table.set("playerCount", 1, 2);
    table.set("aiPlayerCount", 0, 2);
    table.setString("player:0", hostId);
    table.setString("aiDifficulty", options.aiDifficulty || "medium");

    // Update host status
    hostTable.setString("currentRoom", code);
    hostTable.set("status", 1, 0);  // searching

    // Add AI if required
    let aiPlayers = [];
    if (modeConfig.aiRequired) {
      const aiCount = (options.maxPlayers || modeConfig.max) - 1;
      aiPlayers = this.getAvailableAI(aiCount, options.aiDifficulty || "medium");
      table.set("aiPlayerCount", aiPlayers.length, 2);
      aiPlayers.forEach((ai, i) => table.setString(`ai:${i}`, ai.id));
    }

    this._roomTables.set(code, table);

    const room = this._materializeRoom(code, table);
    return { success: true, room, code };
  },

  _materializeRoom(code, table) {
    const playerCount = Math.round(table.get("playerCount") || 0);
    const aiPlayerCount = Math.round(table.get("aiPlayerCount") || 0);
    const players = [];
    for (let i = 0; i < playerCount; i++) {
      const pid = table.getString(`player:${i}`);
      if (pid) {
        const pt = this._playerTables.get(pid);
        players.push(pt ? this._materializePlayer(pid, pt) : { id: pid, username: pid, avatarId: "👤", isAI: false });
      }
    }
    const aiPlayers = [];
    for (let i = 0; i < aiPlayerCount; i++) {
      const aid = table.getString(`ai:${i}`);
      if (aid) {
        const at = this._aiTables.find(t => t.getString("id") === aid);
        aiPlayers.push(at ? this._materializePlayer(aid, at) : { id: aid, username: aid, avatarId: "🤖", isAI: true });
      }
    }

    const statusMap = { 0: "waiting", 1: "starting", 2: "playing", 3: "ended" };
    return {
      id: table.getString("id") || "",
      code: table.getString("code") || code,
      hostId: table.getString("hostId") || "",
      gameId: table.getString("gameId") || "",
      mode: table.getString("mode") || "RANDOM",
      players,
      aiPlayers,
      maxPlayers: Math.round(table.get("maxPlayers") || 4),
      minPlayers: Math.round(table.get("minPlayers") || 2),
      status: statusMap[Math.round(table.get("status") || 0)] || "waiting",
      settings: { aiDifficulty: table.getString("aiDifficulty") || "medium" },
    };
  },

  joinRoom(playerId, code) {
    const table = this._roomTables.get(code);
    const playerTable = this._playerTables.get(playerId);

    if (!table) return { success: false, error: "Room not found" };
    if (!playerTable) return { success: false, error: "Player not found" };

    const status = Math.round(table.get("status") || -1);
    if (status !== 0) return { success: false, error: "Game already started" };

    const playerCount = Math.round(table.get("playerCount") || 0);
    const maxPlayers = Math.round(table.get("maxPlayers") || 0);
    if (playerCount >= maxPlayers) return { success: false, error: "Room is full" };

    table.setString(`player:${playerCount}`, playerId);
    table.set("playerCount", playerCount + 1, 2);

    playerTable.setString("currentRoom", code);
    playerTable.set("status", 1, 0);

    this._checkAutoStart(code);

    const room = this._materializeRoom(code, table);
    return { success: true, room };
  },

  _checkAutoStart(code) {
    const table = this._roomTables.get(code);
    if (!table) return;
    const playerCount = Math.round(table.get("playerCount") || 0);
    const aiCount = Math.round(table.get("aiPlayerCount") || 0);
    const minPlayers = Math.round(table.get("minPlayers") || 2);
    const status = Math.round(table.get("status") || 0);
    if ((playerCount + aiCount) >= minPlayers && status === 0) {
      setTimeout(() => this.startGame(code), 1000);
    }
  },

  startGame(code) {
    const table = this._roomTables.get(code);
    if (!table || Math.round(table.get("status") || -1) !== 0) return { success: false };

    table.set("status", 2, 2);  // playing

    // Update player statuses
    const playerCount = Math.round(table.get("playerCount") || 0);
    for (let i = 0; i < playerCount; i++) {
      const pid = table.getString(`player:${i}`);
      const pt = this._playerTables.get(pid);
      if (pt) pt.set("status", 2, 0);  // in_game
    }

    const room = this._materializeRoom(code, table);
    return { success: true, room };
  },

  // ═══════════════════════════════════════════════════════════════════════
  // QUICK ACTIONS
  // ═══════════════════════════════════════════════════════════════════════
  quickMatch(playerId, gameId) {
    for (const [code, table] of this._roomTables) {
      const status = Math.round(table.get("status") || -1);
      const mode = table.getString("mode");
      const gid = table.getString("gameId");
      const playerCount = Math.round(table.get("playerCount") || 0);
      const maxPlayers = Math.round(table.get("maxPlayers") || 0);
      if (gid === gameId && status === 0 && mode === "RANDOM" && playerCount < maxPlayers) {
        return this.joinRoom(playerId, code);
      }
    }
    return this.createRoom(playerId, gameId, "RANDOM");
  },

  vsAI(playerId, gameId, difficulty = "medium") {
    return this.createRoom(playerId, gameId, "SOLO", { aiDifficulty: difficulty });
  },

  practiceMode(playerId, gameId) {
    return this.createRoom(playerId, gameId, "AI_ONLY", { maxPlayers: 4 });
  },

  leaveRoom(playerId, code) {
    const table = this._roomTables.get(code);
    const playerTable = this._playerTables.get(playerId);
    if (!table || !playerTable) return;

    // Remove player from room
    const playerCount = Math.round(table.get("playerCount") || 0);
    const remaining = [];
    for (let i = 0; i < playerCount; i++) {
      const pid = table.getString(`player:${i}`);
      if (pid && pid !== playerId) remaining.push(pid);
    }

    playerTable.setString("currentRoom", "");
    playerTable.set("status", 0, 0);  // online

    if (remaining.length === 0) {
      // Release AI and delete room
      const aiCount = Math.round(table.get("aiPlayerCount") || 0);
      const aiIds = [];
      for (let i = 0; i < aiCount; i++) {
        const aid = table.getString(`ai:${i}`);
        if (aid) aiIds.push(aid);
      }
      this.releaseAI(aiIds);
      this._roomTables.delete(code);
    } else {
      // Update remaining players
      remaining.forEach((pid, i) => table.setString(`player:${i}`, pid));
      table.set("playerCount", remaining.length, 2);
      // Transfer host if needed
      const hostId = table.getString("hostId");
      if (hostId === playerId) {
        table.setString("hostId", remaining[0]);
      }
    }
  },

  /** Expose rooms for UI iteration (finite set of addresses) */
  get rooms() {
    const result = new Map();
    for (const [code, table] of this._roomTables) {
      result.set(code, this._materializeRoom(code, table));
    }
    return result;
  },

  /** Expose players for UI (finite set) */
  get players() {
    return this._playerTables;
  }
};

// Export
if (typeof window !== "undefined") {
  window.LobbyManifold = LobbyManifold;
}
if (typeof module !== "undefined") {
  module.exports = { LobbyManifold };
}

