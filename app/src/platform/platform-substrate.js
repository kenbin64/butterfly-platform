"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformSubstrate = exports.PlatformSection = void 0;
const base_substrate_1 = require("../../../core/substrate/base-substrate");
const flow_1 = require("../../../core/substrate/flow");
/** Platform section IDs mapped to Diamond Drill geometry */
var PlatformSection;
(function (PlatformSection) {
    PlatformSection[PlatformSection["AUTH"] = 1] = "AUTH";
    PlatformSection[PlatformSection["LOBBY"] = 2] = "LOBBY";
    PlatformSection[PlatformSection["MATCH"] = 3] = "MATCH";
    PlatformSection[PlatformSection["GAME"] = 4] = "GAME";
    PlatformSection[PlatformSection["REALTIME"] = 5] = "REALTIME";
    PlatformSection[PlatformSection["COMMERCE"] = 6] = "COMMERCE";
    PlatformSection[PlatformSection["CONTENT"] = 7] = "CONTENT";
})(PlatformSection || (exports.PlatformSection = PlatformSection = {}));
const DEFAULT_CONFIG = {
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
class PlatformSubstrate extends base_substrate_1.SimulationSubstrate {
    constructor(config) {
        super({ ...DEFAULT_CONFIG, ...config }, {
            users: {},
            rooms: {},
            online: [],
            activeGames: []
        });
        this._diamond = new flow_1.DiamondDrill();
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
    get diamond() { return this._diamond; }
    /** Get section amplitude (activity level) */
    getSectionActivity(section) {
        return this._diamond.sections[section - 1].amplitude;
    }
    /** Create or authenticate user - returns geometric session seed */
    authenticate(username, passwordHash) {
        const userDim = this.drill("auth", "users", username);
        const existing = userDim.value;
        if (existing) {
            // Verify - in real system would check hash
            const sessionSeed = this._diamond.rotateSeed();
            this.drill("auth", "sessions", username).value = { seed: sessionSeed, at: Date.now() };
            return { user: existing, sessionSeed };
        }
        // Create new user
        const user = {
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
    createRoom(hostId, game, isPrivate, maxPlayers = 4) {
        const code = this.generateRoomCode();
        const room = {
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
    generateRoomCode() {
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
    joinRoom(code, userId) {
        const room = this.drill("lobby", "rooms", code).value;
        if (!room || room.status !== "waiting" || room.players.length >= room.maxPlayers) {
            return null;
        }
        room.players.push(userId);
        this.drill("lobby", "rooms", code).value = room;
        return room;
    }
    reset() {
        this.drill("auth", "sessions").value = {};
        this.drill("lobby", "rooms").value = {};
        this.drill("match", "queues").value = {};
        this.drill("game", "active").value = {};
    }
    serialize() {
        return {
            users: this.drill("auth", "users").value || {},
            rooms: this.drill("lobby", "rooms").value || {},
            online: this.drill("realtime", "online").value || [],
            activeGames: Object.keys(this.drill("game", "active").value || {})
        };
    }
    hydrate(state) {
        this.drill("auth", "users").value = state.users;
        this.drill("lobby", "rooms").value = state.rooms;
    }
    static create(config) {
        return new PlatformSubstrate(config);
    }
}
exports.PlatformSubstrate = PlatformSubstrate;
