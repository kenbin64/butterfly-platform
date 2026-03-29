"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyCross = exports.applyPairwise = void 0;
// Apply a binary interaction to all pairs in a list.
// The interaction is run from both perspectives: interaction(A,B) updates A,
// and interaction(B,A) updates B. This ensures both sides are correctly modified.
const applyPairwise = (items, interaction) => {
    const updated = [...items];
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            const resultA = interaction(updated[i], updated[j]);
            const resultB = interaction(updated[j], updated[i]);
            updated[i] = resultA.updated;
            updated[j] = resultB.updated;
        }
    }
    return updated;
};
exports.applyPairwise = applyPairwise;
// Apply interactions between two different sets.
const applyCross = (setA, setB, interaction) => {
    const updated = [...setA];
    for (let i = 0; i < setA.length; i++) {
        for (let j = 0; j < setB.length; j++) {
            const result = interaction(updated[i], setB[j]);
            updated[i] = result.updated;
        }
    }
    return updated;
};
exports.applyCross = applyCross;
