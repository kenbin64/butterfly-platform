import { GameEngine } from "../engine/game-engine";
import { RulesEngine } from "../engine/rules-engine";
import { CharacterEngine } from "../engine/character-engine";
import { EngineSuite } from "../engine/engine-interface";
import { PointSubstrate } from "../substrate/dimensional-substrate";
import { VolumeSubstrate } from "../substrate/dimensional-substrate";

/**
 * Manifold Facade Pattern
 *
 * High-level developer-friendly API that delegates to the substrate library
 * and engine stack. Instead of duplicating physics/entity/character logic,
 * this facade references the existing engines (GameEngine, RulesEngine,
 * CharacterEngine) and substrates (PointSubstrate, VolumeSubstrate).
 *
 * Internal architecture:
 *   • EngineSuite — orchestrates all engines
 *   • GameEngine — entity lifecycle (create, query, activate)
 *   • RulesEngine — game rule evaluation and enforcement
 *   • CharacterEngine — character spawning and autonomous behavior
 *   • PointSubstrate instances — scalar state values (optimization, score)
 *   • Map<string, any> — entity property bridge (rich objects ↔ manifold)
 */
export class ManifoldFacade {
  // ── Engine stack ─────────────────────────────────────────────────────
  private _suite: EngineSuite;
  private _gameEngine: GameEngine;
  private _rulesEngine: RulesEngine;
  private _characterEngine: CharacterEngine;

  // ── Entity data bridge ───────────────────────────────────────────────
  // Rich entity properties (the developer-facing view).
  // GameEngine tracks lifecycle; this map stores the arbitrary properties.
  private _entityData: Map<string, any> = new Map();

  // ── Manifold state (PointSubstrate replaces Dimension for scalars) ──
  private _statePoints: Map<string, PointSubstrate> = new Map();
  private _optimizationLevel: PointSubstrate;
  private _optimizationStrategy: PointSubstrate;
  private _rawOptLevel: number = 1;  // exact integer for getStats()

  // ── History (finite set of events) ──────────────────────────────────
  private _history: Array<{ ts: number; category: string; action: string; target: any }> = [];

  constructor(name: string) {
    // Build engine suite
    this._gameEngine = new GameEngine();
    this._rulesEngine = new RulesEngine();
    this._characterEngine = new CharacterEngine();

    this._suite = new EngineSuite(name);
    this._suite.add(this._gameEngine);
    this._suite.add(this._rulesEngine);
    this._suite.add(this._characterEngine);

    // Manifold points for state
    this._optimizationLevel = new PointSubstrate("optimization-level", 1);
    this._optimizationStrategy = new PointSubstrate("optimization-strategy", 0);
  }

  // ── Entity management (delegates to GameEngine) ─────────────────────

  public createEntity(id: string, type: string, properties: any): void {
    // Store rich properties in the entity data bridge
    this._entityData.set(id, { id, type, ...properties });

    // Register in GameEngine with a VolumeSubstrate for manifold tracking
    const volume = new VolumeSubstrate(id);
    this._gameEngine.createEntity(id, volume, [type]);

    this._recordEvent("entities", "created", id);
  }

  public updateEntity(id: string, updates: any): void {
    const current = this._entityData.get(id);
    if (!current) return;

    // Merge updates into the entity data bridge
    const updated = { ...current, ...updates };
    this._entityData.set(id, updated);

    this._recordEvent("entities", "updated", id);
  }

  public getEntity(id: string): any {
    const data = this._entityData.get(id);
    if (!data) return null;
    // Return a copy (safe from external mutation)
    return { ...data };
  }

  // ── Physics (persists caller-computed positions) ─────────────────────

  public simulatePhysics(entities: any[], _deltaTime: number): void {
    // Entities arrive with positions already computed by the caller.
    // The facade persists those positions into the entity data bridge.
    for (const entity of entities) {
      this.updateEntity(entity.id, {
        position: entity.position,
        velocity: entity.velocity,
      });
    }
    this._recordEvent("physics", "simulated", entities.length);
  }

  // ── State management (PointSubstrate per key) ───────────────────────

  public setState(key: string, value: any): void {
    // For scalar state values we use a PointSubstrate.
    // For non-numeric values we still store them but the substrate
    // acts as a dimensional anchor (value stored via path).
    let pt = this._statePoints.get(key);
    if (!pt) {
      pt = new PointSubstrate(`state-${key}`, 0);
      this._statePoints.set(key, pt);
    }
    // Store the actual value on the substrate's path table
    pt.setPath("value", typeof value === "number" ? value : 0);
    // Keep the original value accessible via a parallel map entry
    (pt as any)._facadeValue = value;
  }

  public getState(key: string): any {
    const pt = this._statePoints.get(key);
    if (!pt) return undefined;
    return (pt as any)._facadeValue;
  }

  // ── Rendering ───────────────────────────────────────────────────────

  public render(entities: any[], _canvas: HTMLCanvasElement): void {
    this._recordEvent("rendering", "completed", entities.length);
  }

  // ── AI decisions (delegates to RulesEngine evaluation) ──────────────

  public makeDecision(entityId: string, context: any): any {
    const entity = this.getEntity(entityId);

    // Set context then evaluate — RulesEngine.evaluate() reads this._context
    this._rulesEngine.context = { entityId, entity, ...context };
    const fired = this._rulesEngine.evaluate();

    const optLevel = this._rawOptLevel;

    this._recordEvent("ai", "decision", entityId);

    return {
      entity,
      context,
      optimized: true,
      efficiency: optLevel * 0.2,
      firedRules: fired,
      manifold: { optimized: true },
    };
  }

  // ── Optimization ────────────────────────────────────────────────────

  public optimizeLevel(level: number): void {
    this._rawOptLevel = level;
    this._optimizationLevel.setPath("value", level);
    this._optimizationStrategy.setPath("value", level);
    this._recordEvent("optimization", "level", level);
  }

  // ── Transactions ────────────────────────────────────────────────────

  public beginTransaction(): ManifoldTransaction {
    return new ManifoldTransaction(this);
  }

  // ── Stats ───────────────────────────────────────────────────────────

  public getStats(): any {
    return {
      entities: this._entityData.size,
      dimensionalState: this._statePoints, // always defined (Map)
      optimization: this._rawOptLevel,
      memoryUsage: this._suite.getAllStats(),
    };
  }

  // ── Engine access (for advanced usage) ──────────────────────────────

  get suite(): EngineSuite { return this._suite; }
  get gameEngine(): GameEngine { return this._gameEngine; }
  get rulesEngine(): RulesEngine { return this._rulesEngine; }
  get characterEngine(): CharacterEngine { return this._characterEngine; }

  // ── Internal helpers ────────────────────────────────────────────────

  private _recordEvent(category: string, action: string, target: any): void {
    this._history.push({ ts: Date.now(), category, action, target });
  }
}

/**
 * Manifold Transaction - High-level transaction management
 */
export class ManifoldTransaction {
  private facade: ManifoldFacade;
  private operations: any[] = [];
  private committed: boolean = false;

  constructor(facade: ManifoldFacade) {
    this.facade = facade;
  }

  public createEntity(id: string, entityType: string, properties: any): ManifoldTransaction {
    // Use separate keys for operation type vs entity type to avoid shadowing
    this.operations.push({
      op: "create",
      id,
      entityType,
      properties
    });
    return this;
  }

  public updateEntity(id: string, updates: any): ManifoldTransaction {
    this.operations.push({
      op: "update",
      id,
      updates
    });
    return this;
  }

  public removeEntity(id: string): ManifoldTransaction {
    this.operations.push({
      op: "remove",
      id
    });
    return this;
  }

  public commit(): boolean {
    if (this.committed) return false;

    try {
      // Apply all operations in manifold-consistent order
      this.operations.forEach(op => {
        switch (op.op) {
          case "create":
            this.facade.createEntity(op.id, op.entityType, op.properties);
            break;
          case "update":
            this.facade.updateEntity(op.id, op.updates);
            break;
          case "remove":
            // Remove logic would go here
            break;
        }
      });

      this.committed = true;
      return true;
    } catch (error) {
      console.error("Manifold transaction failed:", error);
      return false;
    }
  }

  public rollback(): void {
    if (this.committed) return;

    // Rollback logic would go here
    this.operations = [];
  }
}
