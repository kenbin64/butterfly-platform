"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNetwork = exports.extractGrid = exports.extractAlongPath = void 0;
// Trace a straight path across a SaddleField and extract features from it.
// path: sequence of [x,y] sample points
const extractAlongPath = (field, path) => {
    const vecPath = path.map(([x, y]) => [x, y]);
    const values = path.map(([x, y]) => field.scalarAt([x, y]));
    const features = extractFeaturesFromValues(path, values);
    return {
        path: vecPath,
        values,
        features,
        summary: summarize(values, features),
    };
};
exports.extractAlongPath = extractAlongPath;
// Trace a grid of horizontal and vertical paths across a SaddleField.
// This gives a full 2D read of the information encoded in the field.
const extractGrid = (field, xs, ys) => {
    const results = [];
    // Horizontal paths: fix y, walk x
    for (const y of ys) {
        const path = xs.map(x => [x, y]);
        results.push((0, exports.extractAlongPath)(field, path));
    }
    // Vertical paths: fix x, walk y
    for (const x of xs) {
        const path = ys.map(y => [x, y]);
        results.push((0, exports.extractAlongPath)(field, path));
    }
    return results;
};
exports.extractGrid = extractGrid;
// Extract outputs from every node in a SaddleNetwork.
const extractNetwork = (network) => {
    return network.readAll();
};
exports.extractNetwork = extractNetwork;
// ---- internal helpers ----
const extractFeaturesFromValues = (path, zs) => {
    if (path.length < 3)
        return [];
    const features = [];
    for (let i = 1; i < path.length - 1; i++) {
        const [x, y] = path[i];
        const z = zs[i];
        if ((zs[i - 1] < 0 && z >= 0) || (zs[i - 1] > 0 && z <= 0)) {
            features.push({ kind: "zero", position: [x, y, z], value: z });
        }
        const before = z - zs[i - 1];
        const after = zs[i + 1] - z;
        if ((before > 0 && after < 0) || (before < 0 && after > 0)) {
            features.push({ kind: "turning", position: [x, y, z], value: z });
        }
        if (i >= 2) {
            const d2Prev = zs[i] - 2 * zs[i - 1] + zs[i - 2];
            const d2Curr = zs[i + 1] - 2 * zs[i] + zs[i - 1];
            if ((d2Prev > 0 && d2Curr < 0) || (d2Prev < 0 && d2Curr > 0)) {
                features.push({ kind: "inflection", position: [x, y, z], value: z });
            }
        }
    }
    return features;
};
const summarize = (values, features) => {
    const count = (k) => features.filter(f => f.kind === k).length;
    const min = values.reduce((a, b) => Math.min(a, b), Infinity);
    const max = values.reduce((a, b) => Math.max(a, b), -Infinity);
    let tv = 0;
    for (let i = 1; i < values.length; i++)
        tv += Math.abs(values[i] - values[i - 1]);
    return {
        zeroCount: count("zero"),
        turningCount: count("turning"),
        inflectionCount: count("inflection"),
        minValue: min === Infinity ? 0 : min,
        maxValue: max === -Infinity ? 0 : max,
        totalVariation: tv,
    };
};
