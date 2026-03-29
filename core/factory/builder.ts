// core/factory/builder.ts
// Fluent builder for substrates - developer-friendly API

import { SubstrateFactory, SubstrateConfig, BuiltSubstrate } from "./substrate-factory";

/**
 * SubstrateBuilder
 * ----------------
 * Fluent API for building substrates step by step.
 * 
 * Usage:
 *   const substrate = new SubstrateBuilder()
 *     .dimensions(2)
 *     .withHelix(7)
 *     .placeSaddle([0, 0], 0)
 *     .placeSaddle([1, 0], 90)
 *     .addNode("input")
 *     .addNode("output")
 *     .connect("input", "output")
 *     .observable()
 *     .build();
 */
export class SubstrateBuilder {
  private _config: SubstrateConfig = {};
  private _saddles: Array<{ position: number[]; orientation?: number }> = [];
  private _nodes: string[] = [];
  private _edges: Array<[string, string]> = [];

  /** Set number of dimensions */
  dimensions(n: number): this {
    this._config.dimensions = n;
    return this;
  }

  /** Set number of helix pairs (1-7) */
  withHelix(pairs: number): this {
    this._config.helixPairs = pairs;
    return this;
  }

  /** Place a saddle at position with orientation (degrees) */
  placeSaddle(position: number[], orientation: number = 0): this {
    this._saddles.push({ position, orientation });
    return this;
  }

  /** Add a network node */
  addNode(name: string): this {
    this._nodes.push(name);
    return this;
  }

  /** Connect two nodes */
  connect(from: string, to: string): this {
    this._edges.push([from, to]);
    return this;
  }

  /** Enable observation/logging */
  observable(): this {
    this._config.observable = true;
    return this;
  }

  /** Build the substrate */
  build(): BuiltSubstrate {
    return SubstrateFactory.create({
      ...this._config,
      saddles: this._saddles,
      nodes: this._nodes,
      edges: this._edges,
    });
  }
}

/** Start building a substrate */
export const substrate = (): SubstrateBuilder => new SubstrateBuilder();

/**
 * PRESETS
 * -------
 * Common substrate configurations for quick setup.
 */
export const Presets = {
  /** Empty 2D substrate */
  empty2D(): BuiltSubstrate {
    return substrate().dimensions(2).build();
  },

  /** Single saddle at origin */
  singleSaddle(): BuiltSubstrate {
    return substrate()
      .dimensions(2)
      .placeSaddle([0, 0], 0)
      .build();
  },

  /** Two saddles at 90° (lock-and-key pair) */
  lockAndKey(): BuiltSubstrate {
    return substrate()
      .dimensions(2)
      .placeSaddle([0, 0], 0)
      .placeSaddle([2, 0], 90)
      .build();
  },

  /** Full helix with 7 pairs */
  fullHelix(): BuiltSubstrate {
    return substrate()
      .dimensions(2)
      .withHelix(7)
      .observable()
      .build();
  },

  /** Simple computation network */
  computeNetwork(): BuiltSubstrate {
    return substrate()
      .dimensions(2)
      .addNode("input")
      .addNode("hidden")
      .addNode("output")
      .connect("input", "hidden")
      .connect("hidden", "output")
      .placeSaddle([0, 0], 0)
      .build();
  },

  /** Grid of saddles (n x n) */
  grid(n: number, spacing: number = 2): BuiltSubstrate {
    const builder = substrate().dimensions(2);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        // Alternate orientations for coupling
        const orientation = ((i + j) % 2) * 90;
        builder.placeSaddle([i * spacing, j * spacing], orientation);
      }
    }
    return builder.build();
  },

  /** Linear chain of saddles */
  chain(length: number, spacing: number = 2): BuiltSubstrate {
    const builder = substrate().dimensions(2).withHelix(7);
    for (let i = 0; i < length; i++) {
      builder.placeSaddle([i * spacing, 0], i * 90);
    }
    return builder.build();
  },
};

