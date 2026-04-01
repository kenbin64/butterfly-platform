// core/engine/rules-engine.ts
// ================================================================
//  RULES ENGINE — Generic Game Rules Definition & Enforcement
// ================================================================
//
// Defines and enforces game rules without being game-specific.
// A Rule is a named condition→action pair: when the condition
// evaluates true against the current context, the action fires.
//
// Rules have priority (higher fires first), active/inactive state,
// and optional cooldown. The engine evaluates all active rules each
// tick against a generic context object.
//
// Loose coupling: no cross-engine deps. Context is injected per tick.

import {
  type IEngine, type EngineStats,
  EngineState,
} from "./engine-interface";

import { PointSubstrate } from "../substrate/dimensional-substrate";

// ─── Rule Types ──────────────────────────────────────────────────────────────

/**
 * RuleContext — a generic state bag passed to conditions and actions.
 * Games populate this with whatever state their rules need to inspect.
 * The rules engine never assumes what's in the context.
 */
export type RuleContext = Record<string, unknown>;

/**
 * RulePredicate — returns true if the rule's condition is met.
 * Receives the current context and the rule's own metadata.
 */
export type RulePredicate = (ctx: RuleContext) => boolean;

/**
 * RuleAction — fires when the predicate is satisfied.
 * Can mutate the context (e.g., deduct health, award points).
 * Returns void — side effects happen inside the action.
 */
export type RuleAction = (ctx: RuleContext) => void;

/**
 * RuleDefinition — the recipe for a rule. Not game-specific.
 */
export interface RuleDefinition {
  name: string;
  description: string;
  priority: number;        // higher = evaluated first
  condition: RulePredicate;
  action: RuleAction;
  cooldown?: number;       // seconds between firings (0 = every tick)
}

// ─── Internal rule state ─────────────────────────────────────────────────────

interface RuleState {
  definition: RuleDefinition;
  active: boolean;
  fireCount: PointSubstrate;   // manifold point — how many times fired
  lastFiredAt: number;         // elapsed time of last firing
}

// ─── Rules Config ────────────────────────────────────────────────────────────

export interface RulesConfig {
  maxRules: number;
  evaluationOrder: "priority" | "insertion"; // default: priority
}

const DEFAULT_CONFIG: RulesConfig = {
  maxRules: 1000,
  evaluationOrder: "priority",
};

// ─── RulesEngine ─────────────────────────────────────────────────────────────

export class RulesEngine implements IEngine {
  readonly name = "rules";
  private _state: EngineState = EngineState.Idle;
  private _config: RulesConfig;
  private _rules: Map<string, RuleState> = new Map();
  private _context: RuleContext = {};
  private _tickCount = 0;
  private _totalTime = 0;
  private _lastTickDuration = 0;
  private _totalFired: PointSubstrate;

  constructor(config?: Partial<RulesConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._totalFired = new PointSubstrate("totalFired", 0);
  }

  get state(): EngineState { return this._state; }

  /** Number of registered rules. */
  get ruleCount(): number { return this._rules.size; }

  /** Total rules fired across all ticks (manifold point). */
  get totalFired(): number { return this._totalFired.value; }

  /** Get/set the context that rules evaluate against. */
  get context(): RuleContext { return this._context; }
  set context(ctx: RuleContext) { this._context = ctx; }

  // ─── Rule Management ────────────────────────────────────────────────────

  /** Define a new rule. Overwrites if name exists. */
  defineRule(def: RuleDefinition): void {
    this._rules.set(def.name, {
      definition: def,
      active: true,
      fireCount: new PointSubstrate(`rule:${def.name}:fires`, 0),
      lastFiredAt: -Infinity,
    });
  }

  /** Remove a rule by name. */
  removeRule(name: string): boolean {
    return this._rules.delete(name);
  }

  /** Enable a rule. */
  enableRule(name: string): void {
    const r = this._rules.get(name);
    if (r) r.active = true;
  }

  /** Disable a rule (skipped during evaluation). */
  disableRule(name: string): void {
    const r = this._rules.get(name);
    if (r) r.active = false;
  }

  /** Check if a rule is active. */
  isRuleActive(name: string): boolean {
    return this._rules.get(name)?.active ?? false;
  }

  /** Get how many times a rule has fired (manifold point). */
  getRuleFireCount(name: string): number {
    return this._rules.get(name)?.fireCount.value ?? 0;
  }

  /** List all rule names (finite set). */
  ruleNames(): string[] {
    return Array.from(this._rules.keys());
  }

  // ─── Evaluation ─────────────────────────────────────────────────────────

  /**
   * Evaluate all active rules against the current context.
   * Returns the names of rules that fired this evaluation.
   * Iterates the finite set of rules — not a dimension.
   */
  evaluate(): string[] {
    const fired: string[] = [];

    // Build sorted list by priority (descending) or insertion order.
    const rules = Array.from(this._rules.values())
      .filter(r => r.active);

    if (this._config.evaluationOrder === "priority") {
      rules.sort((a, b) => b.definition.priority - a.definition.priority);
    }

    // Loop over finite set of active rules.
    for (const rule of rules) {
      // Cooldown check
      const cd = rule.definition.cooldown ?? 0;
      if (cd > 0 && (this._totalTime - rule.lastFiredAt) < cd) continue;

      // Condition check — z-invocation equivalent: evaluate the predicate
      if (rule.definition.condition(this._context)) {
        rule.definition.action(this._context);
        rule.lastFiredAt = this._totalTime;

        // Increment fire count (manifold point)
        const count = rule.fireCount.value;
        rule.fireCount.setPath("value", count + 1);

        // Increment total fired
        const total = this._totalFired.value;
        this._totalFired.setPath("value", total + 1);

        fired.push(rule.definition.name);
      }
    }

    return fired;
  }

  // ─── IEngine lifecycle ──────────────────────────────────────────────────

  /**
   * Tick — evaluate all rules against the current context.
   * The context must be set externally before each tick.
   */
  tick(dt: number): void {
    if (this._state !== EngineState.Running) return;
    const t0 = performance.now();

    this.evaluate();

    this._lastTickDuration = performance.now() - t0;
    this._tickCount++;
    this._totalTime += dt;
  }

  start(): void { this._state = EngineState.Running; }
  stop(): void { this._state = EngineState.Stopped; }
  pause(): void { this._state = EngineState.Paused; }
  resume(): void { this._state = EngineState.Running; }

  reset(): void {
    this._state = EngineState.Idle;
    this._tickCount = 0;
    this._totalTime = 0;
    this._lastTickDuration = 0;
    this._totalFired.setPath("value", 0);
    // Reset fire counts but keep rules defined.
    for (const [, rule] of this._rules) {
      rule.fireCount.setPath("value", 0);
      rule.lastFiredAt = -Infinity;
    }
  }

  serialize(): unknown {
    const rules: Record<string, { active: boolean; fireCount: number; lastFiredAt: number }> = {};
    for (const [name, rule] of this._rules) {
      rules[name] = {
        active: rule.active,
        fireCount: rule.fireCount.value,
        lastFiredAt: rule.lastFiredAt,
      };
    }
    return {
      config: { ...this._config },
      rules,
      totalFired: this._totalFired.value,
      tickCount: this._tickCount,
      totalTime: this._totalTime,
    };
  }

  hydrate(state: any): void {
    if (state.config) this._config = { ...DEFAULT_CONFIG, ...state.config };
    if (state.totalFired != null) this._totalFired.setPath("value", state.totalFired);
    this._tickCount = state.tickCount ?? 0;
    this._totalTime = state.totalTime ?? 0;
    // Hydrate per-rule state (rules must already be defined).
    if (state.rules) {
      for (const [name, rs] of Object.entries(state.rules) as [string, any][]) {
        const rule = this._rules.get(name);
        if (rule) {
          rule.active = rs.active;
          rule.fireCount.setPath("value", rs.fireCount);
          rule.lastFiredAt = rs.lastFiredAt;
        }
      }
    }
  }

  getStats(): EngineStats {
    return {
      name: this.name,
      state: this._state,
      tickCount: this._tickCount,
      totalTime: this._totalTime,
      lastTickDuration: this._lastTickDuration,
    };
  }
}


