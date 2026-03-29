// app/src/platform/platform-substrate.ts
// 7-Section Platform Substrate using Diamond Drill architecture
//
// The platform maps to the 7 diamond sections:
//   1. AUTH     - Identity, login, profiles, seed-based security
//   2. LOBBY    - Lounges, guilds, player lists, presence
//   3. MATCH    - Game creation, matchmaking, private codes
//   4. GAME     - Active game state, rules engine, variations
//   5. REALTIME - WebSocket connections, events, synchronization
//   6. COMMERCE - Marketplace, prices, payments, subscriptions
//   7. CONTENT  - Uploads, assets, media, user-generated content

import { SimulationSubstrate, SubstrateConfig } from "../../../core/substrate/base-substrate";
import { DiamondDrill } from "../../../core/substrate/flow";
import { Dimension } from "../../../core/dimensional/dimension";

/** Platform section IDs mapped to Diamond Drill geometry */
export enum PlatformSection {
  AUTH = 1,
  LOBBY = 2,
  MATCH = 3,
  GAME = 4,
  REALTIME = 5,
  COMMERCE = 6,
  CONTENT = 7
}

/** User profile stored in AUTH section */
export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  prestige: "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" | "PLATINUM";
  points: number;
  gamesPlayed: number;
  wins: number;
  guildId?: string;
  seed: number;  // Geometric security seed
}

/** Game room stored in LOBBY section */
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

/** Platform state */
export interface PlatformState {
  users: Record<string, UserProfile>;
  rooms: Record<string, GameRoom>;
  online: string[];
  activeGames: string[];
}

const DEFAULT_CONFIG: SubstrateConfig = {
  name: "platform",
  version: "1.0.0",
  tickRate: 10
};

/**
 * PlatformSubstrate
 * -----------------
 * Unified gaming platform built on the Diamond Drill geometry.
 * 
 * Coordinates:
 *   drill("auth", "users", {userId})          → user profile
 *   drill("lobby", "rooms", {roomCode})       → game room
 *   drill("match", "queue", {gameType})       → matchmaking queue
 *   drill("game", "active", {gameId})         → live game state
 *   drill("realtime", "connections", {connId})→ WebSocket state
 *   drill("commerce", "products", {sku})      → marketplace item
 *   drill("content", "assets", {assetId})     → uploaded content
 */
export class PlatformSubstrate extends SimulationSubstrate<PlatformState> {
  private _diamond: DiamondDrill;

  constructor(config?: Partial<SubstrateConfig>) {
    super({ ...DEFAULT_CONFIG, ...config }, {
      users: {},
      rooms: {},
      online: [],
      activeGames: []
    });

    this._diamond = new DiamondDrill();

    // Initialize sections as coordinates
    this.drill("auth", "users").value = {};
    this.drill("auth", "sessions").value = {};
    this.drill("lobby", "rooms").value = {};
    this.drill("lobby", "guilds").value = {};
    this.drill("match", "queues").value = {};
    this.drill("game", "active").value = {};
    this.drill("realtime", "connections").value = {};
    this.drill("commerce", "products").value = {};
    this.drill("content", "assets").value = {};

    // Store security seed
    this.drill("auth", "platformSeed").value = this._diamond.seed;
  }

  get diamond(): DiamondDrill { return this._diamond; }

  /** Get section amplitude (activity level) */
  getSectionActivity(section: PlatformSection): number {
    return this._diamond.sections[section - 1].amplitude;
  }

  /** Create or authenticate user - returns geometric session seed */
  authenticate(username: string, passwordHash: string): { user: UserProfile; sessionSeed: number } | null {
    const userDim = this.drill("auth", "users", username);
    const existing = userDim.value as UserProfile | undefined;

    if (existing) {
      // Verify - in real system would check hash
      const sessionSeed = this._diamond.rotateSeed();
      this.drill("auth", "sessions", username).value = { seed: sessionSeed, at: Date.now() };
      return { user: existing, sessionSeed };
    }

    // Create new user
    const user: UserProfile = {
      id: crypto.randomUUID(),
      username,
      avatar: "👤",
      prestige: "BRONZE",
      points: 0,
      gamesPlayed: 0,
      wins: 0,
      seed: this._diamond.rotateSeed()
    };
    userDim.value = user;

    const sessionSeed = this._diamond.rotateSeed();
    this.drill("auth", "sessions", username).value = { seed: sessionSeed, at: Date.now() };
    return { user, sessionSeed };
  }

  /** Create a game room */
  createRoom(hostId: string, game: string, isPrivate: boolean, maxPlayers: number = 4): GameRoom {
    const code = this.generateRoomCode();
    const room: GameRoom = {
      id: crypto.randomUUID(),
      code,
      host: hostId,
      players: [hostId],
      maxPlayers,
      isPrivate,
      game,
      status: "waiting"
    };
    this.drill("lobby", "rooms", code).value = room;
    return room;
  }

  /** Generate 6-character room code using diamond geometry */
  private generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      const section = this._diamond.sections[i % 7];
      const idx = Math.floor(Math.abs(section.sampleAt(Date.now() + i) * 1000)) % chars.length;
      code += chars[idx];
    }
    return code;
  }

  /** Join room by code */
  joinRoom(code: string, userId: string): GameRoom | null {
    const room = this.drill<GameRoom>("lobby", "rooms", code).value;
    if (!room || room.status !== "waiting" || room.players.length >= room.maxPlayers) {
      return null;
    }
    room.players.push(userId);
    this.drill("lobby", "rooms", code).value = room;
    return room;
  }

  reset(): void {
    this.drill("auth", "sessions").value = {};
    this.drill("lobby", "rooms").value = {};
    this.drill("match", "queues").value = {};
    this.drill("game", "active").value = {};
  }

  serialize(): PlatformState {
    return {
      users: this.drill<Record<string, UserProfile>>("auth", "users").value || {},
      rooms: this.drill<Record<string, GameRoom>>("lobby", "rooms").value || {},
      online: this.drill<string[]>("realtime", "online").value || [],
      activeGames: Object.keys(this.drill<Record<string, unknown>>("game", "active").value || {})
    };
  }

  hydrate(state: PlatformState): void {
    this.drill("auth", "users").value = state.users;
    this.drill("lobby", "rooms").value = state.rooms;
  }

  static create(config?: Partial<SubstrateConfig>): PlatformSubstrate {
    return new PlatformSubstrate(config);
  }
}

