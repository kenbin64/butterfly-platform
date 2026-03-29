// core/factory/substrate-factory.ts
// SubstrateFactory - Middleware between development and core
// Builds substrates from declarative parameters

import { Dimension, dim } from "../dimensional/dimension";
import { Point, point } from "../dimensional/point";
import { HelicalCascade, SaddlePair, StaticFlow } from "../substrate/flow";
import { SaddleForm } from "../geometry/saddle";
import { SaddleField } from "../substrate/saddlefield";
import { SaddleNetwork } from "../substrate/saddlenetwork";
import { VecN } from "../geometry/vector";

/** Configuration for building a substrate */
export interface SubstrateConfig {
  /** Number of dimensions (default: 2) */
  dimensions?: number;
  /** Number of helix pairs (1-7, default: 7) */
  helixPairs?: number;
  /** Initial saddle placements */
  saddles?: Array<{ position: number[]; orientation?: number }>;
  /** Network nodes to create */
  nodes?: string[];
  /** Network edges [from, to] */
  edges?: Array<[string, string]>;
  /** Enable observation/logging */
  observable?: boolean;
}

/** Built substrate with all components */
export interface BuiltSubstrate {
  readonly field: SaddleField;
  readonly helix: HelicalCascade;
  readonly network: SaddleNetwork;
  readonly dimension: Dimension<SubstrateState>;
  readonly config: SubstrateConfig;
  
  // Actions
  turnKey(key: 2 | 4 | 6): void;
  cascade(): void;
  sample(p: number[]): number;
  flow(from: number[], to: number[], magnitude: number): StaticFlow;
  step(): void;
  reset(): void;
}

/** Observable substrate state */
export interface SubstrateState {
  helixRotations: number[];
  networkValues: Record<string, number>;
  saddleCount: number;
}

type SubstrateObserver = (state: SubstrateState, event: string) => void;

/**
 * SubstrateFactory
 * ----------------
 * Middleware that builds substrates from configuration.
 * Developers describe WHAT they want, factory handles HOW.
 * 
 * Usage:
 *   const substrate = SubstrateFactory.create({ dimensions: 2, helixPairs: 7 });
 *   substrate.turnKey(2);
 *   const value = substrate.sample([1, 2]);
 */
export class SubstrateFactory {
  private static _observers: Set<SubstrateObserver> = new Set();

  /** Create a substrate from configuration */
  static create(config: SubstrateConfig = {}): BuiltSubstrate {
    const cfg: Required<SubstrateConfig> = {
      dimensions: config.dimensions ?? 2,
      helixPairs: Math.min(7, Math.max(1, config.helixPairs ?? 7)),
      saddles: config.saddles ?? [],
      nodes: config.nodes ?? [],
      edges: config.edges ?? [],
      observable: config.observable ?? false,
    };

    // Build components
    const helix = new HelicalCascade();
    let field = new SaddleField();
    const network = new SaddleNetwork();

    // Place saddles
    for (const s of cfg.saddles) {
      const form = new SaddleForm((s.orientation ?? 0) * Math.PI / 180);
      field = field.place(s.position as [number, number], form);
    }

    // Build network
    for (const node of cfg.nodes) {
      network.addNode(node);
    }
    for (const [from, to] of cfg.edges) {
      network.connect(from, to);
    }

    // Create dimensional wrapper
    const dimension = dim<SubstrateState>({
      helixRotations: helix.state(),
      networkValues: network.readAll(),
      saddleCount: cfg.saddles.length,
    });

    // Sync function
    const sync = (event: string) => {
      dimension.value = {
        helixRotations: helix.state(),
        networkValues: network.readAll(),
        saddleCount: field.cellCount,
      };
      if (cfg.observable) {
        SubstrateFactory._notify(dimension.value, event);
      }
    };

    // Build the substrate interface
    const substrate: BuiltSubstrate = {
      field,
      helix,
      network,
      dimension,
      config: cfg,

      turnKey(key: 2 | 4 | 6) {
        helix.turnKey(key);
        sync(`turnKey:${key}`);
      },

      cascade() {
        helix.fullCascade();
        sync("cascade");
      },

      sample(p: number[]) {
        return field.scalarAt(p);
      },

      flow(from: number[], to: number[], magnitude: number) {
        const dir = to.map((t, i) => t - from[i]);
        return new StaticFlow(from, dir, magnitude);
      },

      step() {
        network.step();
        sync("step");
      },

      reset() {
        helix.reset();
        sync("reset");
      },
    };

    sync("created");
    return substrate;
  }

  /** Observe all substrate events */
  static observe(fn: SubstrateObserver): () => void {
    this._observers.add(fn);
    return () => this._observers.delete(fn);
  }

  private static _notify(state: SubstrateState, event: string): void {
    this._observers.forEach(fn => fn(state, event));
  }
}

