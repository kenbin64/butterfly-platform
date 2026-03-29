"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushforwardVectorField = exports.sampleTensorWorld = exports.sampleVectorWorld = exports.sampleScalarWorld = void 0;
const transform_1 = require("../transform/transform");
// Sample a scalar field at a world-space point.
const sampleScalarWorld = (F, chart, world) => {
    const local = (0, transform_1.applyTransform)(chart.toLocal, world);
    return F.valueAt(local);
};
exports.sampleScalarWorld = sampleScalarWorld;
// Sample a vector field at a world-space point.
const sampleVectorWorld = (F, chart, world) => {
    const local = (0, transform_1.applyTransform)(chart.toLocal, world);
    return F.valueAt(local);
};
exports.sampleVectorWorld = sampleVectorWorld;
// Sample a tensor field at a world-space point.
const sampleTensorWorld = (F, chart, world) => {
    const local = (0, transform_1.applyTransform)(chart.toLocal, world);
    return F.valueAt(local);
};
exports.sampleTensorWorld = sampleTensorWorld;
// Push a vector field forward through a world-space transform.
// This is the ND analogue of a pushforward map.
const pushforwardVectorField = (F, chart, T) => {
    return {
        valueAt: (p) => {
            const v = F.valueAt(p);
            return (0, transform_1.applyTransform)({ M: T.M, t: Array(v.length).fill(0) }, v);
        },
    };
};
exports.pushforwardVectorField = pushforwardVectorField;
