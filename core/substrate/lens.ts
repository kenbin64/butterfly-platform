import { VecN } from "../geometry/vector";
import { Observer, observerToWorld, worldToObserver } from "../manifold/observer";
import { ScalarField, VectorField, TensorField } from "./field";
import { particleToWorld } from "./particle";

// A Lens defines how an observer samples the substrate.
// It is a projection operator from world-space → observer-space → signal.
export interface Lens {
    // Project a world-space point into an observer-relative signal.
    projectPoint: (O: Observer, world: VecN) => number | VecN | number[][];
    
    // Project a particle into an observer-relative signal.
    projectParticle: (O: Observer, P: { position: VecN; chart: any }) => number | VecN | number[][];
}

// A scalar lens: observer samples a scalar field.
export const scalarLens = (F: ScalarField): Lens => ({
    projectPoint: (O, world) => {
        const local = worldToObserver(O, world);
        return F.valueAt(local);
    },
    projectParticle: (O, P) => {
        const world = particleToWorld(P);
        const local = worldToObserver(O, world);
        return F.valueAt(local);
    }
});

// A vector lens: observer samples a vector field.
export const vectorLens = (F: VectorField): Lens => ({
    projectPoint: (O, world) => {
        const local = worldToObserver(O, world);
        return F.valueAt(local);
    },
    projectParticle: (O, P) => {
        const world = particleToWorld(P);
        const local = worldToObserver(O, world);
        return F.valueAt(local);
    }
});

// A tensor lens: observer samples a tensor field.
export const tensorLens = (F: TensorField): Lens => ({
    projectPoint: (O, world) => {
        const local = worldToObserver(O, world);
        return F.valueAt(local);
    },
    projectParticle: (O, P) => {
        const world = particleToWorld(P);
        const local = worldToObserver(O, world);
        return F.valueAt(local);
    }
});

// A custom lens: user-defined projection logic.
export const customLens = (
    projectPoint: (O: Observer, world: VecN) => any,
    projectParticle: (O: Observer, P: any) => any
): Lens => ({
    projectPoint,
    projectParticle
});