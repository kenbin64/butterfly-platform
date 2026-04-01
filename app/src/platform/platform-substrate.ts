// app/src/platform/platform-substrate.ts
// ================================================================
//  PLATFORM SUBSTRATE — Manifold-Native Gaming Platform
// ================================================================
//
// The platform maps to the 7-section helix manifold:
//   Section 0: AUTH     — Identity, login, profiles, session seeds
//   Section 1: LOBBY    — Lounges, guilds, player lists, presence
//   Section 2: MATCH    — Game creation, matchmaking, private codes
//   Section 3: GAME     — Active game state, rules engine, variations
//   Section 4: REALTIME — WebSocket connections, events, sync
//   Section 5: COMMERCE — Marketplace, prices, payments, subscriptions
//   Section 6: CONTENT  — Uploads, assets, media, UGC
//
// All state is stored as PathExpr addresses on the manifold.
// No local objects, no data drift. Values are discovered by z-invocation.

import { RepresentationTable } from "../../../core/substrate/representation-table";
import { PointSubstrate } from "../../../core/substrate/dimensional-substrate";
import { type PathExpr, evaluatePath, discoverPath } from "../../../core/substrate/path-expressions";

/** Platform section IDs mapped to helix sections (0-based) */
export enum PlatformSection {
  AUTH = 0,
  LOBBY = 1,
  MATCH = 2,
  GAME = 3,
  REALTIME = 4,
  COMMERCE = 5,
  CONTENT = 6
}

/** User profile — reconstructed from RepresentationTable addresses */
export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  prestige: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" | "PLATINUM";
  points: number;
  gamesPlayed: number;
  wins: number;
  guildId?: string;
  seed: number;
}

/** Game room — reconstructed from RepresentationTable addresses */
export interface GameRoom {
  id: string;
  code: string;
  host: string;
  players: string[];
  maxPlayers: number;
  isPrivate: boolean;
  game: string;
  variation?: string;
  status: "waiting" | "playing" | "finished";
}

/** Serialized platform state (for hydrate/serialize round-trip) */
export interface PlatformState {
  users: Record<string, UserProfile>;
  rooms: Record<string, GameRoom>;
  online: string[];
  activeGames: string[];
}

// Prestige tiers mapped to manifold values
const PRESTIGE_MAP: Record<string, number> = {
  BRONZE: 1, SILVER: 2, GOLD: 3, DIAMOND: 4, PLATINUM: 5
};
const PRESTIGE_REVERSE: Record<number, UserProfile["prestige"]> = {
  1: "BRONZE", 2: "SILVER", 3: "GOLD", 4: "DIAMOND", 5: "PLATINUM"
};

/**
 * PlatformSubstrate
 * -----------------
 * Unified gaming platform built on RepresentationTable + PointSubstrate.
 *
 * Each platform section is a RepresentationTable on the manifold.
 * User profiles and game rooms are individual RepresentationTables.
 * All state is PathExpr addresses — values discovered via z-invocation.
 *
 * No SimulationSubstrate, no DiamondDrill, no Dimension objects.
 */
export class PlatformSubstrate {
  readonly name: string;

  /** The 7 section tables — one per helix section */
  private _sections: RepresentationTable[];

  /** User profile tables: username → RepresentationTable */
  private _userTables: Map<string, RepresentationTable> = new Map();

  /** Room tables: code → RepresentationTable */
  private _roomTables: Map<string, RepresentationTable> = new Map();

  /** Platform-level scalars */
  private _platformSeed: PointSubstrate;
  private _onlineCount: PointSubstrate;

  constructor(name: string = "platform") {
    this.name = name;

    // Create 7 section tables (one per helix section)
    this._sections = [
      new RepresentationTable("auth"),
      new RepresentationTable("lobby"),
      new RepresentationTable("match"),
      new RepresentationTable("game"),
      new RepresentationTable("realtime"),
      new RepresentationTable("commerce"),
      new RepresentationTable("content"),
    ];

    // Platform-level scalars as PointSubstrates
    this._platformSeed = new PointSubstrate("platformSeed", Date.now() % 0xFFFFFFFF);
    this._onlineCount = new PointSubstrate("onlineCount", 0);
  }

  /** Get a section's RepresentationTable by enum */
  getSection(section: PlatformSection): RepresentationTable {
    return this._sections[section];
  }

  /** Get section activity level (number of entries) */
  getSectionActivity(section: PlatformSection): number {
    return this._sections[section].size;
  }

  /** Platform seed (PointSubstrate scalar) */
  get platformSeed(): number {
    return this._platformSeed.value;
  }

  // ─── AUTH (Section 0) ───────────────────────────────────────────────────

  /** Create or authenticate user — all state as PathExpr addresses */
  authenticate(username: string, _passwordHash: string): { user: UserProfile; sessionSeed: number } | null {
    const existing = this._userTables.get(username);

    if (existing) {
      // Rotate seed for new session
      const sessionSeed = this._rotateSeed();
      this._sections[PlatformSection.AUTH].set(`session:${username}`, sessionSeed);
      return { user: this._materializeUser(username, existing), sessionSeed };
    }

    // Create new user as a RepresentationTable
    const table = new RepresentationTable(`user:${username}`);
    const userId = `u_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    table.setString("id", userId);
    table.setString("username", username);
    table.setString("avatar", "👤");
    table.set("prestige", PRESTIGE_MAP.BRONZE, PlatformSection.AUTH);
    table.set("points", 0, PlatformSection.AUTH);
    table.set("gamesPlayed", 0, PlatformSection.AUTH);
    table.set("wins", 0, PlatformSection.AUTH);
    table.set("seed", this._rotateSeed(), PlatformSection.AUTH);

    this._userTables.set(username, table);
    this._sections[PlatformSection.AUTH].set(`user:${username}`, 1);

    const sessionSeed = this._rotateSeed();
    this._sections[PlatformSection.AUTH].set(`session:${username}`, sessionSeed);

    return { user: this._materializeUser(username, table), sessionSeed };
  }

  /** Materialize a UserProfile from its RepresentationTable (engine's job) */
  private _materializeUser(username: string, table: RepresentationTable): UserProfile {
    const prestigeVal = Math.round(table.get("prestige") ?? 1);
    return {
      id: table.getString("id") ?? "",
      username: table.getString("username") ?? username,
      avatar: table.getString("avatar") ?? "👤",
      prestige: PRESTIGE_REVERSE[prestigeVal] ?? "BRONZE",
      points: Math.round(table.get("points") ?? 0),
      gamesPlayed: Math.round(table.get("gamesPlayed") ?? 0),
      wins: Math.round(table.get("wins") ?? 0),
      seed: Math.round(table.get("seed") ?? 0),
    };
  }

  /** Get user profile by username */
  getUser(username: string): UserProfile | undefined {
    const table = this._userTables.get(username);
    return table ? this._materializeUser(username, table) : undefined;
  }

  // ─── LOBBY / ROOMS (Section 1-2) ───────────────────────────────────────

  /** Create a game room — all state as PathExpr addresses */
  createRoom(hostId: string, game: string, isPrivate: boolean, maxPlayers: number = 4): GameRoom {
    const code = this._generateRoomCode();
    const roomId = `r_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const table = new RepresentationTable(`room:${code}`);
    table.setString("id", roomId);
    table.setString("code", code);
    table.setString("host", hostId);
    table.setString("game", game);
    table.set("maxPlayers", maxPlayers, PlatformSection.MATCH);
    table.set("isPrivate", isPrivate ? 1 : 0, PlatformSection.MATCH);
    table.set("status", 0, PlatformSection.MATCH); // 0=waiting, 1=playing, 2=finished
    table.set("playerCount", 1, PlatformSection.MATCH);
    table.setString("player:0", hostId);

    this._roomTables.set(code, table);
    this._sections[PlatformSection.LOBBY].set(`room:${code}`, 1);

    return this._materializeRoom(code, table);
  }

  /** Generate 6-character room code using manifold geometry */
  private _generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      // Use z-invocation: discover a path at the current time+offset, evaluate it
      const path = discoverPath(Date.now() + i * 1337, i % 7);
      const z = Math.abs(evaluatePath(path));
      const idx = Math.floor(z * 1000) % chars.length;
      code += chars[idx];
    }
    return code;
  }

  /** Join room by code */
  joinRoom(code: string, userId: string): GameRoom | null {
    const table = this._roomTables.get(code);
    if (!table) return null;

    const status = Math.round(table.get("status") ?? -1);
    const playerCount = Math.round(table.get("playerCount") ?? 0);
    const maxPlayers = Math.round(table.get("maxPlayers") ?? 0);

    if (status !== 0 || playerCount >= maxPlayers) return null;

    table.setString(`player:${playerCount}`, userId);
    table.set("playerCount", playerCount + 1, PlatformSection.MATCH);

    return this._materializeRoom(code, table);
  }

  /** Materialize a GameRoom from its RepresentationTable (engine's job) */
  private _materializeRoom(code: string, table: RepresentationTable): GameRoom {
    const playerCount = Math.round(table.get("playerCount") ?? 0);
    const players: string[] = [];
    for (let i = 0; i < playerCount; i++) {
      const pid = table.getString(`player:${i}`);
      if (pid) players.push(pid);
    }

    const statusVal = Math.round(table.get("status") ?? 0);
    const statusMap: Record<number, GameRoom["status"]> = { 0: "waiting", 1: "playing", 2: "finished" };

    return {
      id: table.getString("id") ?? "",
      code: table.getString("code") ?? code,
      host: table.getString("host") ?? "",
      players,
      maxPlayers: Math.round(table.get("maxPlayers") ?? 4),
      isPrivate: (table.get("isPrivate") ?? 0) > 0.5,
      game: table.getString("game") ?? "",
      status: statusMap[statusVal] ?? "waiting",
    };
  }

  /** Get room by code */
  getRoom(code: string): GameRoom | undefined {
    const table = this._roomTables.get(code);
    return table ? this._materializeRoom(code, table) : undefined;
  }

  /** List all room codes (finite set of discovered addresses) */
  listRoomCodes(): string[] {
    return Array.from(this._roomTables.keys());
  }

  // ─── SEED ROTATION ─────────────────────────────────────────────────────

  /** Rotate the platform seed via z-invocation (not random) */
  private _rotateSeed(): number {
    const current = this._platformSeed.value;
    const path = discoverPath(current + Date.now(), PlatformSection.AUTH);
    const newSeed = Math.abs(Math.round(evaluatePath(path))) % 0xFFFFFFFF;
    this._platformSeed.setPath("value", newSeed);
    return newSeed;
  }

  // ─── LIFECYCLE ──────────────────────────────────────────────────────────

  reset(): void {
    // Clear session and room entries — user tables persist
    for (const key of this._sections[PlatformSection.AUTH].scalarKeys()) {
      if (key.startsWith("session:")) this._sections[PlatformSection.AUTH].delete(key);
    }
    this._roomTables.clear();
    this._sections[PlatformSection.LOBBY].reset();
    this._sections[PlatformSection.MATCH].reset();
    this._sections[PlatformSection.GAME].reset();
  }

  /** Serialize: materialize all users and rooms for external consumption */
  serialize(): PlatformState {
    const users: Record<string, UserProfile> = {};
    for (const [name, table] of this._userTables) {
      users[name] = this._materializeUser(name, table);
    }

    const rooms: Record<string, GameRoom> = {};
    for (const [code, table] of this._roomTables) {
      rooms[code] = this._materializeRoom(code, table);
    }

    return {
      users,
      rooms,
      online: [],
      activeGames: this._sections[PlatformSection.GAME].scalarKeys(),
    };
  }

  /** Hydrate: rebuild RepresentationTables from external state */
  hydrate(state: PlatformState): void {
    this._userTables.clear();
    for (const [name, user] of Object.entries(state.users)) {
      const table = new RepresentationTable(`user:${name}`);
      table.setString("id", user.id);
      table.setString("username", user.username);
      table.setString("avatar", user.avatar);
      table.set("prestige", PRESTIGE_MAP[user.prestige] ?? 1, PlatformSection.AUTH);
      table.set("points", user.points, PlatformSection.AUTH);
      table.set("gamesPlayed", user.gamesPlayed, PlatformSection.AUTH);
      table.set("wins", user.wins, PlatformSection.AUTH);
      table.set("seed", user.seed, PlatformSection.AUTH);
      this._userTables.set(name, table);
    }

    this._roomTables.clear();
    for (const [code, room] of Object.entries(state.rooms)) {
      const table = new RepresentationTable(`room:${code}`);
      table.setString("id", room.id);
      table.setString("code", room.code);
      table.setString("host", room.host);
      table.setString("game", room.game);
      table.set("maxPlayers", room.maxPlayers, PlatformSection.MATCH);
      table.set("isPrivate", room.isPrivate ? 1 : 0, PlatformSection.MATCH);
      const statusVal = room.status === "playing" ? 1 : room.status === "finished" ? 2 : 0;
      table.set("status", statusVal, PlatformSection.MATCH);
      table.set("playerCount", room.players.length, PlatformSection.MATCH);
      room.players.forEach((pid, i) => table.setString(`player:${i}`, pid));
      this._roomTables.set(code, table);
    }
  }

  static create(name?: string): PlatformSubstrate {
    return new PlatformSubstrate(name);
  }
}
