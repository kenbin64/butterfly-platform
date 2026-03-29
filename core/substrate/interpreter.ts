import { GeometricFeature } from "../geometry/saddle";
import { ExtractionResult, FeatureSummary } from "./extractor";

// An InterpretedValue is what a geometric feature means.
// The geometry encodes the data; the interpreter decodes it.
export type ValueKind =
    | "scalar"    // a numeric measurement (from z at a turning point)
    | "boundary"  // a transition marker (from a zero crossing)
    | "transition"// a type-change event (from an inflection)
    | "origin";   // the root anchor (from a saddle point)

export interface InterpretedValue {
    readonly kind: ValueKind;
    readonly value: number;
    readonly position: number[]; // [x, y, z] in field space
    readonly confidence: number; // 0–1, based on feature sharpness
}

// An InterpretationRule maps a geometric feature to an interpreted value.
// The library ships with defaults; callers supply custom rules for their domain.
export type InterpretationRule = (f: GeometricFeature) => InterpretedValue | null;

// Default rules: the library's built-in interpretation of saddle geometry.
export const defaultRules: InterpretationRule[] = [
    // Saddle point → origin anchor (value = 0 by definition)
    f => f.kind === "saddle"
        ? { kind: "origin",     value: 0,       position: f.position, confidence: 1.0 }
        : null,

    // Zero crossing → boundary marker (sign change = structural boundary)
    f => f.kind === "zero"
        ? { kind: "boundary",   value: f.value, position: f.position, confidence: 1.0 }
        : null,

    // Turning point → scalar data (a peak or trough IS a measured value)
    f => f.kind === "turning"
        ? { kind: "scalar",     value: f.value, position: f.position, confidence: Math.min(1, Math.abs(f.value)) }
        : null,

    // Inflection point → type transition (curvature reversal = state change)
    f => f.kind === "inflection"
        ? { kind: "transition", value: f.value, position: f.position, confidence: 0.5 }
        : null,
];

// Interpret a list of features using a set of rules.
// Rules are tried in order; the first non-null result wins.
export const interpret = (
    features: GeometricFeature[],
    rules: InterpretationRule[] = defaultRules
): InterpretedValue[] => {
    const out: InterpretedValue[] = [];
    for (const f of features) {
        for (const rule of rules) {
            const v = rule(f);
            if (v !== null) { out.push(v); break; }
        }
    }
    return out;
};

// Interpret a full ExtractionResult.
export const interpretExtraction = (
    result: ExtractionResult,
    rules?: InterpretationRule[]
): InterpretedValue[] => interpret(result.features, rules);

// Reduce a set of interpreted values to a single number.
// Useful for reading a SaddleField region as one computed output.
export type Reduction = "sum" | "mean" | "max" | "min" | "count";

export const reduce = (values: InterpretedValue[], mode: Reduction = "sum"): number => {
    const scalars = values.filter(v => v.kind === "scalar").map(v => v.value);
    if (scalars.length === 0) return 0;
    switch (mode) {
        case "sum":   return scalars.reduce((a, b) => a + b, 0);
        case "mean":  return scalars.reduce((a, b) => a + b, 0) / scalars.length;
        case "max":   return Math.max(...scalars);
        case "min":   return Math.min(...scalars);
        case "count": return scalars.length;
    }
};

// Map interpreted values to a typed output by kind.
export const groupByKind = (values: InterpretedValue[]): Record<ValueKind, InterpretedValue[]> => ({
    scalar:     values.filter(v => v.kind === "scalar"),
    boundary:   values.filter(v => v.kind === "boundary"),
    transition: values.filter(v => v.kind === "transition"),
    origin:     values.filter(v => v.kind === "origin"),
});

