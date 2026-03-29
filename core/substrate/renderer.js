"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderAsData = exports.renderAsAscii = exports.sampleNetwork = exports.sampleField = void 0;
// Sample a SaddleField over a regular grid.
const sampleField = (field, xs, ys, overlays = []) => {
    const raw = ys.map(y => xs.map(x => field.scalarAt([x, y])));
    const allZ = raw.flat();
    const min = Math.min(...allZ);
    const max = Math.max(...allZ);
    const range = max - min || 1;
    const samples = ys.map((y, row) => xs.map((x, col) => {
        const z = raw[row][col];
        const g = field.gradientAt([x, y]);
        return {
            x, y, z,
            normalised: (z - min) / range,
            gradient: [g[0], g[1]],
        };
    }));
    return { width: xs.length, height: ys.length, samples, min, max, overlays };
};
exports.sampleField = sampleField;
// Sample a SaddleNetwork by reading node outputs and their field.
const sampleNetwork = (network, xs, ys) => {
    return (0, exports.sampleField)(network.asField(), xs, ys);
};
exports.sampleNetwork = sampleNetwork;
// ASCII renderer: maps z values to a gradient of characters.
// Produces a text snapshot of the substrate — useful for debugging
// and for the text-based programming environment.
const renderAsAscii = (frame) => {
    const CHARS = " ·:;+x%#@";
    const rows = frame.samples.map(row => row.map(s => {
        const i = Math.floor(s.normalised * (CHARS.length - 1));
        return CHARS[Math.max(0, Math.min(CHARS.length - 1, i))];
    }).join(""));
    // Overlay interpreted features as markers.
    // Convert feature world positions to grid positions and mark them.
    const grid = rows.map(r => r.split(""));
    for (const v of frame.overlays) {
        const col = Math.round((v.position[0] - frame.samples[0][0].x) /
            (frame.samples[0][frame.width - 1].x - frame.samples[0][0].x) * (frame.width - 1));
        const row = Math.round((v.position[1] - frame.samples[0][0].y) /
            (frame.samples[frame.height - 1][0].y - frame.samples[0][0].y) * (frame.height - 1));
        if (row >= 0 && row < frame.height && col >= 0 && col < frame.width) {
            const marker = v.kind === "boundary" ? "0" :
                v.kind === "scalar" ? "^" :
                    v.kind === "origin" ? "+" : "~";
            grid[row][col] = marker;
        }
    }
    return grid.map(r => r.join("")).join("\n");
};
exports.renderAsAscii = renderAsAscii;
// Structured data renderer: returns the frame as a flat array of records.
// Feed this into any downstream consumer (WebGL, chart libraries, etc.).
const renderAsData = (frame) => {
    return frame.samples.flat().map(s => ({
        x: s.x, y: s.y, z: s.z,
        n: s.normalised,
        gx: s.gradient[0],
        gy: s.gradient[1],
    }));
};
exports.renderAsData = renderAsData;
