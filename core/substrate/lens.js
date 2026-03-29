"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customLens = exports.tensorLens = exports.vectorLens = exports.scalarLens = void 0;
const observer_1 = require("../manifold/observer");
const particle_1 = require("./particle");
// A scalar lens: observer samples a scalar field.
const scalarLens = (F) => ({
    projectPoint: (O, world) => {
        const local = (0, observer_1.worldToObserver)(O, world);
        return F.valueAt(local);
    },
    projectParticle: (O, P) => {
        const world = (0, particle_1.particleToWorld)(P);
        const local = (0, observer_1.worldToObserver)(O, world);
        return F.valueAt(local);
    }
});
exports.scalarLens = scalarLens;
// A vector lens: observer samples a vector field.
const vectorLens = (F) => ({
    projectPoint: (O, world) => {
        const local = (0, observer_1.worldToObserver)(O, world);
        return F.valueAt(local);
    },
    projectParticle: (O, P) => {
        const world = (0, particle_1.particleToWorld)(P);
        const local = (0, observer_1.worldToObserver)(O, world);
        return F.valueAt(local);
    }
});
exports.vectorLens = vectorLens;
// A tensor lens: observer samples a tensor field.
const tensorLens = (F) => ({
    projectPoint: (O, world) => {
        const local = (0, observer_1.worldToObserver)(O, world);
        return F.valueAt(local);
    },
    projectParticle: (O, P) => {
        const world = (0, particle_1.particleToWorld)(P);
        const local = (0, observer_1.worldToObserver)(O, world);
        return F.valueAt(local);
    }
});
exports.tensorLens = tensorLens;
// A custom lens: user-defined projection logic.
const customLens = (projectPoint, projectParticle) => ({
    projectPoint,
    projectParticle
});
exports.customLens = customLens;
