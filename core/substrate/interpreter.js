"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupByKind = exports.reduce = exports.interpretExtraction = exports.interpret = exports.defaultRules = void 0;
// Default rules: the library's built-in interpretation of saddle geometry.
exports.defaultRules = [
    // Saddle point → origin anchor (value = 0 by definition)
    f => f.kind === "saddle"
        ? { kind: "origin", value: 0, position: f.position, confidence: 1.0 }
        : null,
    // Zero crossing → boundary marker (sign change = structural boundary)
    f => f.kind === "zero"
        ? { kind: "boundary", value: f.value, position: f.position, confidence: 1.0 }
        : null,
    // Turning point → scalar data (a peak or trough IS a measured value)
    f => f.kind === "turning"
        ? { kind: "scalar", value: f.value, position: f.position, confidence: Math.min(1, Math.abs(f.value)) }
        : null,
    // Inflection point → type transition (curvature reversal = state change)
    f => f.kind === "inflection"
        ? { kind: "transition", value: f.value, position: f.position, confidence: 0.5 }
        : null,
];
// Interpret a list of features using a set of rules.
// Rules are tried in order; the first non-null result wins.
const interpret = (features, rules = exports.defaultRules) => {
    const out = [];
    for (const f of features) {
        for (const rule of rules) {
            const v = rule(f);
            if (v !== null) {
                out.push(v);
                break;
            }
        }
    }
    return out;
};
exports.interpret = interpret;
// Interpret a full ExtractionResult.
const interpretExtraction = (result, rules) => (0, exports.interpret)(result.features, rules);
exports.interpretExtraction = interpretExtraction;
const reduce = (values, mode = "sum") => {
    const scalars = values.filter(v => v.kind === "scalar").map(v => v.value);
    if (scalars.length === 0)
        return 0;
    switch (mode) {
        case "sum": return scalars.reduce((a, b) => a + b, 0);
        case "mean": return scalars.reduce((a, b) => a + b, 0) / scalars.length;
        case "max": return Math.max(...scalars);
        case "min": return Math.min(...scalars);
        case "count": return scalars.length;
    }
};
exports.reduce = reduce;
// Map interpreted values to a typed output by kind.
const groupByKind = (values) => ({
    scalar: values.filter(v => v.kind === "scalar"),
    boundary: values.filter(v => v.kind === "boundary"),
    transition: values.filter(v => v.kind === "transition"),
    origin: values.filter(v => v.kind === "origin"),
});
exports.groupByKind = groupByKind;
