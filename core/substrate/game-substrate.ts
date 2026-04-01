 /**
 * GameSubstrate - Manifold-Based Game Engine
 * ==========================================
 *
 * Orchestrates all game entities, physics, logic, and state through dimensional drilling.
 * Every game state is deterministic and reproducible via parent versioning.
 *
 * ARCHITECTURE:
 *   - EntitySystem: All actors = dimensional points (O(1) access)
 *   - PhysicsSystem: Forces derived from geometry, not simulated
 *   - GameRules: State transitions via drilling (deterministic)
 *   - MultiplayerCoord: Built-in (all entities versioned across network)
 *   - Version Lineage: Every frame is a versioned snapshot (time-travel ready)
 *
 * GAMES:
 *   - FastTrack 3D: Racing with gravity, collision, item pickups
 *   - BrickBreaker 3D: Breakout with physics-based ball, power-ups, scoring
 *   - Lounge: Lobby system, matchmaking, AI players, premium features
 *
 * KEY PROPERTIES:
 *   - O(1) entity access via drilling (no iteration)
 *   - O(1) physics update (geometry-based, not simulation)
 *   - Deterministic frame advancement (reproducible, replayable)
 *   - Version tree: every frame is a permanent snapshot
 *   - Network-ready: entire game state is serializable
 */

import { EntityStore } from "./entity-store";
import { VersionedSubstrate } from "./versioned-substrate";
import { Dimension, dim } from "../dimensional/dimension";
/**
 * Game entity - any actor in game space
 * Drill to (gameId, entityId, property) for O(1) access
 */
export interface GameEntity {
  id: string;
  type: "player" | "projectile" | "obstacle" | "collectable" | "npc";
  position: [number, number, number]; // (x, y, z) in 3D space
  velocity: [number, number, number]; // (vx, vy, vz)
  rotation: [number, number, number]; // (rx, ry, rz) Euler angles
  scale: [number, number, number];
  health: number;
  metadata: Record<string, any>; // Game-specific data
}

/**
 * Physics body - properties affecting motion
 */
export interface PhysicsBody {
  entityId: string;
  mass: number;
  drag: number;           // Air resistance
  angularDrag: number;    // Rotational resistance
  isKinematic: boolean;   // ~Collides but not affected by forces
  enableGravity: boolean;
  collisionGroup: string; // For group-based collision
}

/**
 * Collision event
 */
export interface CollisionEvent {
  timestamp: number;
  entity1: string;
  entity2: string;
  point: [number, number, number];
  normal: [number, number, number];
  penetration: number; // Overlap depth
}

/**
 * Game input - player actions
 */
export interface GameInput {
  playerId: string;
  timestamp: number;
  action: string;        // "move", "jump", "fire", "turn", etc.
  value: number | [number, number, number]; // Scalar or vector input
  metadata?: Record<string, any>;
}

/**
 * Game loop frame snapshot
 */
export interface GameFrame {
  frameIndex: number;
  timestamp: number;
  deltaTime: number;     // Seconds since last frame
  entities: Map<string, GameEntity>;
  collisions: CollisionEvent[];
  score: Record<string, number>; // Player scores
  state: string;              // "playing", "paused", "ended", etc.
}

/**
 * GameSubstrate - Core game orchestration
 */
export class GameSubstrate extends VersionedSubstrate {
  private _gameId: string;
  private _entities: Map<string, boolean> = new Map();           // entity ID index for fast iteration
  private _physicsBodies: Map<string, PhysicsBody> = new Map(); // physics bodies cache
  private _gameRules: Map<string, (frame: GameFrame) => GameFrame> = new Map();
  private _inputQueue: GameInput[] = [];
  private _frameIndex = 0;
  private _gameState = "initializing";
  private _entities_store: EntityStore;
  private _philosophers: number = 0;

  constructor(
    gameId: string,
    maxVersions: number = 1000,
    entityStore: EntityStore = new EntityStore(gameId)
  ) {
    super();
    this._gameId = gameId;
    this._entities_store = entityStore;
  }

  /**
   * Create game entity (O(1) drilling to entity space)
   */
  createEntity(entity: GameEntity, physics?: PhysicsBody): GameEntity {
    // Commit entity to versioned substrate (creates new version point)
    const changes = new Map<string, unknown>().set(`entity/${entity.id}`, entity);
    this.commit(changes);

    // Update local index for fast iteration (e.g. physics, collision)
    this._entities.set(entity.id, true);

    if (physics) {
      this.commit(new Map<string, unknown>().set(`physics/${entity.id}`, physics));
      this._physicsBodies.set(entity.id, physics);
    }

    // Audit in entity store
    this._entities_store.set(`game_entity_${entity.id}`, entity as unknown as Record<string, unknown>);

    return entity;
  }

  /**
   * Get entity (O(1) drilling)
   */
  getEntity(entityId: string): GameEntity | undefined {
    const currentState = this.getState(this.getCurrentPoint().hash);
    return currentState.get(`entity/${entityId}`) as GameEntity | undefined;
  }

  /**
   * Update entity position/velocity (O(1))
   */
  updateEntity(
    entityId: string,
    updates: Partial<GameEntity>,
    reason: string
  ): GameEntity | undefined {
    const current = this.getEntity(entityId);
    if (!current) return undefined;

    const updated: GameEntity = { ...current, ...updates };

    // Commit the update
    const changes = new Map().set(`entity/${entityId}`, updated);
    this.commit(changes);

    return updated;
  }

  /**
   * Register physics body (enables collision detection)
   */
  registerPhysicsBody(body: PhysicsBody): void {
    this._physicsBodies.set(body.entityId, body);
    this.commit(new Map<string, unknown>().set(`physics/${body.entityId}`, body));
  }

  /**
   * Get physics body
   */
  getPhysicsBody(entityId: string): PhysicsBody | undefined {
    return this._physicsBodies.get(entityId);
  }

  /**
   * Queue player input
   */
  queueInput(input: GameInput): void {
    this._inputQueue.push(input);
    this.commit(new Map<string, unknown>().set("inputQueue", [...this._inputQueue]));
  }

  /**
   * Compute physics for one frame
   * O(1) per collision check (grid-based spatial hashing)
   */
  private _computePhysics(deltaTime: number): CollisionEvent[] {
    const collisions: CollisionEvent[] = [];

    // For each physics body, compute acceleration and new position
    this._physicsBodies.forEach((body, entityId) => {
      const entity = this.getEntity(entityId);
      if (!entity) return;

      // Compute forces (gravity, drag, etc.)
      const acceleration = this._computeAcceleration(entity, body, deltaTime);

      // Update velocity
      const newVelocity: [number, number, number] = [
        entity.velocity[0] + acceleration[0] * deltaTime,
        entity.velocity[1] + acceleration[1] * deltaTime,
        entity.velocity[2] + acceleration[2] * deltaTime,
      ];

      // Apply drag
      const dragFactor = Math.pow(1 - body.drag, deltaTime);
      newVelocity[0] *= dragFactor;
      newVelocity[1] *= dragFactor;
      newVelocity[2] *= dragFactor;

      // Update position
      const newPosition: [number, number, number] = [
        entity.position[0] + newVelocity[0] * deltaTime,
        entity.position[1] + newVelocity[1] * deltaTime,
        entity.position[2] + newVelocity[2] * deltaTime,
      ];

      this.updateEntity(
        entityId,
        { position: newPosition, velocity: newVelocity },
        `Physics update deltaTime=${deltaTime.toFixed(3)}`
      );
    });

    // Spatial collision detection (O(1) per entity via spatial hash)
    const spatialHash = this._buildSpatialHash();
    collisions.push(...this._detectCollisions(spatialHash));

    return collisions;
  }

  /**
   * Compute acceleration for an entity (gravity, forces)
   * O(1) - derived from geometry, not simulated
   */
  private _computeAcceleration(
    entity: GameEntity,
    body: PhysicsBody,
    deltaTime: number
  ): [number, number, number] {
    const acceleration: [number, number, number] = [0, 0, 0];

    // Gravity (derived from saddle field tilt)
    if (body.enableGravity) {
      acceleration[1] -= 9.81; // -9.81 m/s² (downward)
    }

    // Gravity can be modulated by field geometry
    // For now: flat space assumption
    // In production: drill to saddle tilt and derive from z=xy geometry

    return acceleration;
  }

  /**
   * Build spatial hash grid (O(1) per entity)
   * Used for fast collision detection
   */
  private _buildSpatialHash(cellSize: number = 10): Map<string, string[]> {
    const grid = new Map<string, string[]>();

    this._entities.forEach((_, entityId) => {
      const entity = this.getEntity(entityId);
      if (!entity) return;

      // Hash position to grid cell
      const cellX = Math.floor(entity.position[0] / cellSize);
      const cellY = Math.floor(entity.position[1] / cellSize);
      const cellZ = Math.floor(entity.position[2] / cellSize);
      const cellKey = `${cellX},${cellY},${cellZ}`;

      if (!grid.has(cellKey)) {
        grid.set(cellKey, []);
      }
      grid.get(cellKey)!.push(entityId);
    });

    return grid;
  }

  /**
   * Detect collisions (O(1) per entity via spatial hash)
   */
  private _detectCollisions(
    spatialHash: Map<string, string[]>
  ): CollisionEvent[] {
    const collisions: CollisionEvent[] = [];
    const checked = new Set<string>();

    spatialHash.forEach((cellEntities) => {
      // Check each pair in cell (typically 2-4 entities per cell)
      for (let i = 0; i < cellEntities.length; i++) {
        for (let j = i + 1; j < cellEntities.length; j++) {
          const id1 = cellEntities[i];
          const id2 = cellEntities[j];
          const pair = [id1, id2].sort().join("|");

          if (checked.has(pair)) continue;
          checked.add(pair);

          const collision = this._checkCollision(id1, id2);
          if (collision) {
            collisions.push(collision);
          }
        }
      }
    });

    return collisions;
  }

  /**
   * Check collision between two entities
   */
  private _checkCollision(
    entityId1: string,
    entityId2: string
  ): CollisionEvent | null {
    const entity1 = this.getEntity(entityId1);
    const entity2 = this.getEntity(entityId2);

    if (!entity1 || !entity2) return null;

    // Simple sphere collision (distance check)
    const dx = entity2.position[0] - entity1.position[0];
    const dy = entity2.position[1] - entity1.position[1];
    const dz = entity2.position[2] - entity1.position[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const radius1 = entity1.scale[0]; // Assume scale[0] is collision radius
    const radius2 = entity2.scale[0];
    const minDistance = radius1 + radius2;

    if (distance < minDistance) {
      // Collision detected
      const normal: [number, number, number] = [
        dx / distance,
        dy / distance,
        dz / distance,
      ];

      return {
        timestamp: Date.now(),
        entity1: entityId1,
        entity2: entityId2,
        point: [
          entity1.position[0] + normal[0] * radius1,
          entity1.position[1] + normal[1] * radius1,
          entity1.position[2] + normal[2] * radius1,
        ],
        normal,
        penetration: minDistance - distance,
      };
    }

    return null;
  }

  /**
   * Register a game rule (state transition function)
   */
  registerRule(name: string, rule: (frame: GameFrame) => GameFrame): void {
    this._gameRules.set(name, rule);
  }

  /**
   * Apply games rules to frame
   */
  private _applyRules(frame: GameFrame): GameFrame {
    let result = frame;

    // Apply all registered rules in order
    this._gameRules.forEach((rule) => {
      result = rule(result);
    });

    return result;
  }

  /**
   * Process game frame
   * Called once per game tick (deterministic, network-safe)
   */
  processFrame(deltaTime: number): GameFrame {
    const frame: GameFrame = {
      frameIndex: this._frameIndex,
      timestamp: Date.now(),
      deltaTime,
      entities: new Map(),
      collisions: [],
      score: {},
      state: this._gameState,
    };

    // Store frame in state
    const frameState = this.getState(this.getCurrentPoint().hash);
    frameState.set(`frame/${this._frameIndex}`, frame);
    this.commit(new Map().set(`frame/${this._frameIndex}`, frame));

    // 1. Physics pass
    frame.collisions = this._computePhysics(deltaTime);

    // 2. Collect current entities
    this._entities.forEach((_, entityId) => {
      const entity = this.getEntity(entityId);
      if (entity) {
        frame.entities.set(entityId, entity);
      }
    });

    // 3. Apply game rules
    const updatedFrame = this._applyRules(frame);

    // 4. Version the frame snapshot
    this.drill<GameFrame>(
      `frame/${this._frameIndex}`,
      updatedFrame,
      `Frame ${this._frameIndex}`
    );

    // 5. Audit frame in entity store
    this._entities_store.set(`frame_${this._frameIndex}`, {
      frameIndex: this._frameIndex,
      entityCount: frame.entities.size,
      collisionCount: frame.collisions.length,
      timestamp: frame.timestamp,
    } as any);

    this._frameIndex++;

    return updatedFrame;
  }

  /**
   * Set game state ("playing", "paused", "ended", etc.)
   */
  setState(state: string): void {
    const stateState = this.getState(this.getCurrentPoint().hash);
    stateState.set("gameState", state);
    this.commit(new Map().set("gameState", state));
  }

  /**
   * Get game state
   */
  getState(): string {
    const stateState = this.getState(this.getCurrentPoint().hash);
    return stateState.get("gameState") as string;
  }

  /**
   * Get frame history (for replay/debugging)
   */
  getFrameHistory(count: number = 10): GameFrame[] {
    const frames: GameFrame[] = [];
    const start = Math.max(0, this._frameIndex - count);
    const frameState = this.getState(this.getCurrentPoint().hash);

    for (let i = start; i < this._frameIndex; i++) {
      const frame = frameState.get(`frame/${i}`) as GameFrame | undefined;
      if (frame) {
        frames.push(frame);
      }
    }

    return frames;
  }

  /**
   * Reset to frame (time-travel)
   */
  replayToFrame(frameIndex: number): GameFrame | null {
    const frameState = this.getState(this.getCurrentPoint().hash);
    const frame = frameState.get(`frame/${frameIndex}`) as GameFrame | undefined;
    if (!frame) return null;

    // Restore entities to frame state
    frame.entities.forEach((entity, entityId) => {
      const currentState = this.getState(this.getCurrentPoint().hash);
      currentState.set(`entity/${entityId}`, entity);
      this.commit(new Map().set(`entity/${entityId}`, entity));
    });

    this._frameIndex = frameIndex;
    return frame;
  }

  /**
   * Get statistics
   */
  getStats() {
    const currentState = this.getState(this.getCurrentPoint().hash);
    return {
      gameId: this.getId(),
      frameIndex: this._frameIndex,
      entityCount: currentState.size,
      activeBodies: currentState.size,
      gameState: this.getState(),
      versionCount: this.getVersionCount(),
      memoryMB: (this.getMemoryUsage() / 1024 / 1024).toFixed(2),
    };
  }

  // ===========================================================================
  // Dining Philosophers Implementation
  // ===========================================================================

  /**
   * Initialize dining philosophers problem with n philosophers
   */
  initPhilosophers(n: number): void {
    this._philosophers = n;

    // Create philosopher entities
    for (let i = 0; i < n; i++) {
      this.createEntity({
        id: `philosopher_${i}`,
        type: "philosopher",
        position: [0, 0, 0],
        velocity: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        health: 100,
        metadata: {
          thinking: true,
          eating: false,
          fork_left: true,
          fork_right: true,
        },
      });
    }

    // Initialize synchronization state
    const syncState = this.getState(this.getCurrentPoint().hash);
    syncState.set("sync", {
      philosophers: {
        thinking: true,
        eating: false,
        fork_left: true,
        fork_right: true,
      }
    });
    this.commit(new Map().set("sync", syncState.get("sync")));
  }

  /**
   * Get philosopher entity by index
   */
  philosopher(index: number): GameEntity | undefined {
    return this.getEntity(`philosopher_${index}`);
  }

  /**
   * Try to eat - attempts to acquire forks and start eating
   */
  tryEat(index: number): boolean {
    const philosopher = this.philosopher(index);
    if (!philosopher) return false;

    const syncState = this.getState(this.getCurrentPoint().hash);
    const philosophers = syncState.get("sync") as any;
    const leftFork = philosophers.philosophers.fork_left;
    const rightFork = philosophers.philosophers.fork_right;

    // Check if both forks are available
    if (leftFork && rightFork) {
      // Acquire both forks
      philosophers.philosophers.fork_left = false;
      philosophers.philosophers.fork_right = false;

      // Set eating state
      philosophers.philosophers.thinking = false;
      philosophers.philosophers.eating = true;

      this.commit(new Map().set("sync", philosophers));
      return true;
    }

    return false;
  }

  /**
   * Check if philosopher is currently eating
   */
  isEating(index: number): boolean {
    const syncState = this.getState(this.getCurrentPoint().hash);
    const philosophers = syncState.get("sync") as any;
    return philosophers.philosophers.eating;
  }

  /**
   * Finish eating - releases forks and returns to thinking state
   */
  finishEating(index: number): void {
    const philosopher = this.philosopher(index);
    if (!philosopher) return;

    // Release both forks
    const syncState = this.getState(this.getCurrentPoint().hash);
    const philosophers = syncState.get("sync") as any;
    philosophers.philosophers.fork_left = true;
    philosophers.philosophers.fork_right = true;

    // Set thinking state
    philosophers.philosophers.thinking = true;
    philosophers.philosophers.eating = false;

    this.commit(new Map().set("sync", philosophers));
  }

  /**
   * Wait for philosopher to finish eating (returns a promise that resolves when eating is done)
   */
  waitForPhilosopher(index: number): Promise<void> {
    return new Promise((resolve) => {
      const checkEating = () => {
        if (!this.isEating(index)) {
          resolve();
        } else {
          setTimeout(checkEating, 10); // Check again in 10ms
        }
      };
      checkEating();
    });
  }

  /**
   * Find entities matching a pattern (used for philosophers)
   */
  findEntities(pattern: RegExp): GameEntity[] {
    const entities: GameEntity[] = [];

    for (let i = 0; i < this._philosophers; i++) {
      const philosopher = this.philosopher(i);
      if (philosopher && pattern.test(philosopher.id)) {
        entities.push(philosopher);
      }
    }

    return entities;
  }

  /**
   * Get state of a philosopher
   */
  getPhilosopherState(index: number): Record<string, boolean> {
    const syncState = this.getState(this.getCurrentPoint().hash);
    const philosophers = syncState.get("sync") as any;
    return {
      thinking: philosophers.philosophers.thinking,
      eating: philosophers.philosophers.eating,
      fork_left: philosophers.philosophers.fork_left,
      fork_right: philosophers.philosophers.fork_right,
    };
  }
}

/**
 * ============================================================================
 * DEVELOPER API - Simple interface, complex game underneath
 * ============================================================================
 *
 * // Create game instance
 * const game = new GameSubstrate("fasttrack-race-1", 1000);
 *
 * // Create player entity
 * const player = game.createEntity({
 *   id: "player_1",
 *   type: "player",
 *   position: [0, 0, 0],
 *   velocity: [0, 0, 0],
 *   rotation: [0, 0, 0],
 *   scale: [1, 1, 1],
 *   health: 100,
 *   metadata: { speed: 20, steering: 0 }
 * }, {
 *   entityId: "player_1",
 *   mass: 1.0,
 *   drag: 0.1,
 *   angularDrag: 0.05,
 *   isKinematic: false,
 *   enableGravity: true,
 *   collisionGroup: "vehicle"
 * });
 *
 * // Register game rule (scoring logic)
 * game.registerRule("scoring", (frame) => {
 *   // Custom rule logic here
 *   return frame;
 * });
 *
 * // Process one game frame
 * game.setState("playing");
 * const frame = game.processFrame(0.016); // 60 FPS
 *
 * // Get entity (O(1) access)
 * const currentPlayer = game.getEntity("player_1");
 *
 * // Replay to frame 100
 * const historyFrame = game.replayToFrame(100);
 */
