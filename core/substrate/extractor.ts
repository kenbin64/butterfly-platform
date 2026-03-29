import { VecN } from "../geometry/vector";
import { GeometricFeature, FeatureKind } from "../geometry/saddle";
import { SaddleField } from "./saddlefield";
import { SaddleNetwork } from "./saddlenetwork";

// An ExtractionResult is the structured output of reading
// geometric features from a SaddleField along a traced path.
// This is how raw shape becomes addressable data.
export interface ExtractionResult {
    readonly path: VecN[];               // the path that was traced
    readonly features: GeometricFeature[]; // what was found along it
    readonly values: number[];            // z values along the path
    readonly summary: FeatureSummary;
}

export interface FeatureSummary {
    readonly zeroCount: number;
    readonly turningCount: number;
    readonly inflectionCount: number;
    readonly minValue: number;
    readonly maxValue: number;
    readonly totalVariation: number; // sum of |Δz| along path — information density
}

// Trace a straight path across a SaddleField and extract features from it.
// path: sequence of [x,y] sample points
export const extractAlongPath = (
    field: SaddleField,
    path: [number, number][]
): ExtractionResult => {
    const vecPath: VecN[] = path.map(([x, y]) => [x, y]);
    const values: number[] = path.map(([x, y]) => field.scalarAt([x, y]));
    const features = extractFeaturesFromValues(path, values);

    return {
        path: vecPath,
        values,
        features,
        summary: summarize(values, features),
    };
};

// Trace a grid of horizontal and vertical paths across a SaddleField.
// This gives a full 2D read of the information encoded in the field.
export const extractGrid = (
    field: SaddleField,
    xs: number[],
    ys: number[]
): ExtractionResult[] => {
    const results: ExtractionResult[] = [];

    // Horizontal paths: fix y, walk x
    for (const y of ys) {
        const path: [number, number][] = xs.map(x => [x, y]);
        results.push(extractAlongPath(field, path));
    }

    // Vertical paths: fix x, walk y
    for (const x of xs) {
        const path: [number, number][] = ys.map(y => [x, y]);
        results.push(extractAlongPath(field, path));
    }

    return results;
};

// Extract outputs from every node in a SaddleNetwork.
export const extractNetwork = (
    network: SaddleNetwork
): Record<string, number> => {
    return network.readAll();
};

// ---- internal helpers ----

const extractFeaturesFromValues = (
    path: [number, number][],
    zs: number[]
): GeometricFeature[] => {
    if (path.length < 3) return [];
    const features: GeometricFeature[] = [];

    for (let i = 1; i < path.length - 1; i++) {
        const [x, y] = path[i];
        const z = zs[i];

        if ((zs[i - 1] < 0 && z >= 0) || (zs[i - 1] > 0 && z <= 0)) {
            features.push({ kind: "zero", position: [x, y, z], value: z });
        }

        const before = z - zs[i - 1];
        const after  = zs[i + 1] - z;
        if ((before > 0 && after < 0) || (before < 0 && after > 0)) {
            features.push({ kind: "turning", position: [x, y, z], value: z });
        }

        if (i >= 2) {
            const d2Prev = zs[i]     - 2 * zs[i - 1] + zs[i - 2];
            const d2Curr = zs[i + 1] - 2 * zs[i]     + zs[i - 1];
            if ((d2Prev > 0 && d2Curr < 0) || (d2Prev < 0 && d2Curr > 0)) {
                features.push({ kind: "inflection", position: [x, y, z], value: z });
            }
        }
    }

    return features;
};

const summarize = (values: number[], features: GeometricFeature[]): FeatureSummary => {
    const count = (k: FeatureKind) => features.filter(f => f.kind === k).length;
    const min = values.reduce((a, b) => Math.min(a, b), Infinity);
    const max = values.reduce((a, b) => Math.max(a, b), -Infinity);
    let tv = 0;
    for (let i = 1; i < values.length; i++) tv += Math.abs(values[i] - values[i - 1]);

    return {
        zeroCount:       count("zero"),
        turningCount:    count("turning"),
        inflectionCount: count("inflection"),
        minValue:        min === Infinity ? 0 : min,
        maxValue:        max === -Infinity ? 0 : max,
        totalVariation:  tv,
    };
};

