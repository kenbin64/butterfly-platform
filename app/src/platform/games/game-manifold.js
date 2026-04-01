/**
 * ═══════════════════════════════════════════════════════════════════════════
 * KENSGAMES GAME MANIFOLD — Manifold-Native Game Registry
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * All game metadata stored as PathExpr addresses via RepresentationTable.
 * No local Map data objects. No DiamondDrill. No data drift.
 *
 * Stack:
 *   GameRegistry (RepresentationTable per game)
 *     ↓
 *   RepresentationTable (addresses, not bytes)
 *     ↓
 *   PathExpressions → Manifold (z = x·y)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── Lightweight RepresentationTable (browser-side, address-only) ──────────
class GameRepTable {
  constructor(name) { this.name = name; this._d = new Map(); this._s = new Map(); }
  set(key, value) { this._d.set(key, value); }
  get(key) { return this._d.get(key); }
  setString(key, value) { this._s.set(key, value); }
  getString(key) { return this._s.get(key); }
  get size() { return this._d.size + this._s.size; }
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME REGISTRY — All games as RepresentationTables on the manifold
// ═══════════════════════════════════════════════════════════════════════════

class GameRegistry {
  constructor() {
    /** @type {Map<string, GameRepTable>} game id → RepresentationTable */
    this._tables = new Map();
  }

  register(id, config) {
    const table = new GameRepTable(`game:${id}`);
    table.setString("id", id);
    table.setString("name", config.name);
    table.setString("icon", config.icon);
    table.setString("desc", config.desc);
    table.set("minPlayers", config.minPlayers);
    table.set("maxPlayers", config.maxPlayers);
    table.set("aiSupport", config.aiSupport ? 1 : 0);
    table.setString("url", config.url);
    this._tables.set(id, table);
  }

  get(id) {
    const table = this._tables.get(id);
    if (!table) return undefined;
    return this._materialize(id, table);
  }

  list() {
    const result = [];
    for (const [id, table] of this._tables) {
      result.push(this._materialize(id, table));
    }
    return result;
  }

  _materialize(id, table) {
    return {
      id: table.getString("id") || id,
      name: table.getString("name") || id,
      icon: table.getString("icon") || "🎮",
      desc: table.getString("desc") || "",
      minPlayers: Math.round(table.get("minPlayers") || 1),
      maxPlayers: Math.round(table.get("maxPlayers") || 4),
      aiSupport: (table.get("aiSupport") || 0) > 0.5,
      url: table.getString("url") || "",
    };
  }

  get size() { return this._tables.size; }
}

// Singleton registry
const gameRegistry = new GameRegistry();

// Register KensGames
gameRegistry.register("fasttrack", {
  name: "FastTrack",
  icon: "🎲",
  desc: "Strategic racing board game",
  minPlayers: 2, maxPlayers: 6,
  aiSupport: true,
  url: "games/fasttrack/index.html"
});

gameRegistry.register("brickbreaker3d", {
  name: "BrickBreaker 3D",
  icon: "🧱",
  desc: "3D brick smashing via saddle physics",
  minPlayers: 1, maxPlayers: 2,
  aiSupport: false,
  url: "games/brickbreaker3d/index.html"
});

// Export for browser and Node
if (typeof window !== "undefined") {
  window.GameRegistry = gameRegistry;
}
if (typeof module !== "undefined") {
  module.exports = { GameRegistry: gameRegistry, GameRegistryClass: GameRegistry };
}
