"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaddleNetwork = void 0;
const saddle_1 = require("../geometry/saddle");
const saddlefield_1 = require("./saddlefield");
// A SaddleNetwork is a directed graph of SaddleNodes.
// Computation is propagation: each node reads its inputs and
// updates its output (the coupling of its two SaddleForms).
// The topology and orientations define the program.
// The propagated values are the data.
class SaddleNetwork {
    constructor() {
        this.nodes = new Map();
        this.edges = [];
    }
    // Add a computational node.
    addNode(id, orientation = 0) {
        this.nodes.set(id, {
            id,
            pair: new saddle_1.SaddlePair(orientation),
            output: 0,
        });
        return this;
    }
    // Connect two nodes. Mode determines whether the output of `from`
    // enters `to` as a point address or a broadcast.
    connect(from, to, mode = "point") {
        this.edges.push({ from, to, mode });
        return this;
    }
    // Read a node's current output.
    read(id) {
        return this.nodes.get(id)?.output ?? 0;
    }
    // Write a value directly into a node (inject an input signal).
    write(id, value) {
        const node = this.nodes.get(id);
        if (node)
            node.output = value;
        return this;
    }
    // Propagate one step through the network.
    // Each node collects incoming signals from its edges,
    // accumulates them as inputs, and recomputes its coupling.
    step(domain = linspace(-2, 2, 20)) {
        const next = new Map([...this.nodes.entries()].map(([id, n]) => [id, { ...n, output: n.output }]));
        for (const [id, node] of this.nodes) {
            // Collect all incoming edge values.
            const incoming = this.edges
                .filter(e => e.to === id)
                .map(e => ({ value: this.read(e.from), mode: e.mode }));
            if (incoming.length === 0)
                continue;
            // Accumulate input: sum incoming values as a y0 input.
            const y0 = incoming.reduce((sum, i) => sum + i.value, 0);
            // Recompute node output as coupling of primary and secondary.
            const c = node.pair.coupling(domain, y0);
            next.get(id).output = c;
        }
        this.nodes = next;
        return this;
    }
    // Run n propagation steps.
    run(steps, domain) {
        for (let i = 0; i < steps; i++)
            this.step(domain);
        return this;
    }
    // Read all node outputs as a plain record.
    readAll() {
        const out = {};
        for (const [id, node] of this.nodes)
            out[id] = node.output;
        return out;
    }
    // Expose nodes as a SaddleField for use in the substrate.
    asField() {
        let field = new saddlefield_1.SaddleField();
        let i = 0;
        for (const node of this.nodes.values()) {
            field = field.place([i * 2, 0], node.pair.primary);
            i++;
        }
        return field;
    }
}
exports.SaddleNetwork = SaddleNetwork;
const linspace = (start, end, n) => {
    const out = [];
    for (let i = 0; i < n; i++)
        out.push(start + (end - start) * i / (n - 1));
    return out;
};
