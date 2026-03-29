import { SaddlePair, SaddleForm } from "../geometry/saddle";
import { SaddleField } from "./saddlefield";

// A SaddleNode is a SaddlePair with an identity and a computed output value.
// It is the fundamental computational unit.
//   orientation = 0°  → point connection  (selective, conditional)
//   orientation = 90° → broadcast         (unconditional, all-to-all)
export interface SaddleNode {
    readonly id: string;
    readonly pair: SaddlePair;
    output: number; // current computed value — coupling of primary+secondary
}

// An edge carries a value from one node's output to another node's input.
export type ConnectionMode = "point" | "broadcast";
export interface SaddleEdge {
    readonly from: string;  // node id
    readonly to: string;    // node id
    readonly mode: ConnectionMode;
}

// A SaddleNetwork is a directed graph of SaddleNodes.
// Computation is propagation: each node reads its inputs and
// updates its output (the coupling of its two SaddleForms).
// The topology and orientations define the program.
// The propagated values are the data.
export class SaddleNetwork {
    private nodes: Map<string, SaddleNode>;
    private edges: SaddleEdge[];

    constructor() {
        this.nodes = new Map();
        this.edges = [];
    }

    // Add a computational node.
    addNode(id: string, orientation: number = 0): SaddleNetwork {
        this.nodes.set(id, {
            id,
            pair: new SaddlePair(orientation),
            output: 0,
        });
        return this;
    }

    // Connect two nodes. Mode determines whether the output of `from`
    // enters `to` as a point address or a broadcast.
    connect(from: string, to: string, mode: ConnectionMode = "point"): SaddleNetwork {
        this.edges.push({ from, to, mode });
        return this;
    }

    // Read a node's current output.
    read(id: string): number {
        return this.nodes.get(id)?.output ?? 0;
    }

    // Write a value directly into a node (inject an input signal).
    write(id: string, value: number): SaddleNetwork {
        const node = this.nodes.get(id);
        if (node) node.output = value;
        return this;
    }

    // Propagate one step through the network.
    // Each node collects incoming signals from its edges,
    // accumulates them as inputs, and recomputes its coupling.
    step(domain: number[] = linspace(-2, 2, 20)): SaddleNetwork {
        const next = new Map(
            [...this.nodes.entries()].map(([id, n]) => [id, { ...n, output: n.output }])
        );

        for (const [id, node] of this.nodes) {
            // Collect all incoming edge values.
            const incoming = this.edges
                .filter(e => e.to === id)
                .map(e => ({ value: this.read(e.from), mode: e.mode }));

            if (incoming.length === 0) continue;

            // Accumulate input: sum incoming values as a y0 input.
            const y0 = incoming.reduce((sum, i) => sum + i.value, 0);

            // Recompute node output as coupling of primary and secondary.
            const c = node.pair.coupling(domain, y0);
            next.get(id)!.output = c;
        }

        this.nodes = next;
        return this;
    }

    // Run n propagation steps.
    run(steps: number, domain?: number[]): SaddleNetwork {
        for (let i = 0; i < steps; i++) this.step(domain);
        return this;
    }

    // Read all node outputs as a plain record.
    readAll(): Record<string, number> {
        const out: Record<string, number> = {};
        for (const [id, node] of this.nodes) out[id] = node.output;
        return out;
    }

    // Expose nodes as a SaddleField for use in the substrate.
    asField(): SaddleField {
        let field = new SaddleField();
        let i = 0;
        for (const node of this.nodes.values()) {
            field = field.place([i * 2, 0], node.pair.primary);
            i++;
        }
        return field;
    }
}

const linspace = (start: number, end: number, n: number): number[] => {
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(start + (end - start) * i / (n - 1));
    return out;
};

