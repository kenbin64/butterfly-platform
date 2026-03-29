import { SaddleField } from "./saddlefield";
import { SaddleNetwork } from "./saddlenetwork";
import { InterpretedValue } from "./interpreter";

// A RenderSample is one evaluated point in the substrate.
// This is the common output format consumed by any renderer
// (ASCII, canvas, WebGL, SVG — any target plugs in here).
export interface RenderSample {
    readonly x: number;
    readonly y: number;
    readonly z: number;          // raw saddle value
    readonly normalised: number; // z mapped to [0, 1] across the sample grid
    readonly gradient: [number, number]; // direction of steepest ascent
}

// A RenderFrame is a complete sampled snapshot of a region.
export interface RenderFrame {
    readonly width: number;    // number of x samples
    readonly height: number;   // number of y samples
    readonly samples: RenderSample[][];  // [row][col]
    readonly min: number;
    readonly max: number;
    readonly overlays: InterpretedValue[]; // interpreted features to draw on top
}

// Sample a SaddleField over a regular grid.
export const sampleField = (
    field: SaddleField,
    xs: number[],
    ys: number[],
    overlays: InterpretedValue[] = []
): RenderFrame => {
    const raw: number[][] = ys.map(y => xs.map(x => field.scalarAt([x, y])));

    const allZ = raw.flat();
    const min = Math.min(...allZ);
    const max = Math.max(...allZ);
    const range = max - min || 1;

    const samples: RenderSample[][] = ys.map((y, row) =>
        xs.map((x, col) => {
            const z = raw[row][col];
            const g = field.gradientAt([x, y]);
            return {
                x, y, z,
                normalised: (z - min) / range,
                gradient: [g[0], g[1]],
            };
        })
    );

    return { width: xs.length, height: ys.length, samples, min, max, overlays };
};

// Sample a SaddleNetwork by reading node outputs and their field.
export const sampleNetwork = (
    network: SaddleNetwork,
    xs: number[],
    ys: number[]
): RenderFrame => {
    return sampleField(network.asField(), xs, ys);
};

// ASCII renderer: maps z values to a gradient of characters.
// Produces a text snapshot of the substrate — useful for debugging
// and for the text-based programming environment.
export const renderAsAscii = (frame: RenderFrame): string => {
    const CHARS = " ·:;+x%#@";
    const rows: string[] = frame.samples.map(row =>
        row.map(s => {
            const i = Math.floor(s.normalised * (CHARS.length - 1));
            return CHARS[Math.max(0, Math.min(CHARS.length - 1, i))];
        }).join("")
    );

    // Overlay interpreted features as markers.
    // Convert feature world positions to grid positions and mark them.
    const grid = rows.map(r => r.split(""));
    for (const v of frame.overlays) {
        const col = Math.round((v.position[0] - frame.samples[0][0].x) /
            (frame.samples[0][frame.width - 1].x - frame.samples[0][0].x) * (frame.width - 1));
        const row = Math.round((v.position[1] - frame.samples[0][0].y) /
            (frame.samples[frame.height - 1][0].y - frame.samples[0][0].y) * (frame.height - 1));
        if (row >= 0 && row < frame.height && col >= 0 && col < frame.width) {
            const marker = v.kind === "boundary"   ? "0" :
                           v.kind === "scalar"     ? "^" :
                           v.kind === "origin"     ? "+" : "~";
            grid[row][col] = marker;
        }
    }

    return grid.map(r => r.join("")).join("\n");
};

// Structured data renderer: returns the frame as a flat array of records.
// Feed this into any downstream consumer (WebGL, chart libraries, etc.).
export const renderAsData = (frame: RenderFrame): Record<string, number>[] => {
    return frame.samples.flat().map(s => ({
        x: s.x, y: s.y, z: s.z,
        n: s.normalised,
        gx: s.gradient[0],
        gy: s.gradient[1],
    }));
};

