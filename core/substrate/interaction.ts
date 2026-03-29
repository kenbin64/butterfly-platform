import { VecN } from "../geometry/vector";
import { Particle } from "./particle";
import { Signal } from "./signal";
import { Agent } from "./agent";
import { ScalarField, VectorField, TensorField } from "./field";

// InteractionResult describes how an interaction modifies entities.
export interface InteractionResult<T> {
    readonly updated: T;
    readonly emittedSignals?: Signal[];
    readonly spawnedParticles?: Particle[];
    readonly stateChanges?: Record<string, unknown>;
}

// Interaction between two particles.
export type ParticleInteraction = (A: Particle, B: Particle) => InteractionResult<Particle>;

// Interaction between a particle and a signal.
export type ParticleSignalInteraction = (P: Particle, S: Signal) => InteractionResult<Particle>;

// Interaction between two signals.
export type SignalInteraction = (A: Signal, B: Signal) => InteractionResult<Signal>;

// Interaction between an agent and a particle.
export type AgentParticleInteraction = (A: Agent, P: Particle) => InteractionResult<Agent>;

// Interaction between an agent and a signal.
export type AgentSignalInteraction = (A: Agent, S: Signal) => InteractionResult<Agent>;

// Interaction between an agent and a field (scalar, vector, tensor).
export type AgentFieldInteraction = (
    A: Agent,
    F: ScalarField | VectorField | TensorField
) => InteractionResult<Agent>;

// Apply a binary interaction to all pairs in a list.
// The interaction is run from both perspectives: interaction(A,B) updates A,
// and interaction(B,A) updates B. This ensures both sides are correctly modified.
export const applyPairwise = <T>(
    items: T[],
    interaction: (a: T, b: T) => InteractionResult<T>
): T[] => {
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

// Apply interactions between two different sets.
export const applyCross = <A, B>(
    setA: A[],
    setB: B[],
    interaction: (a: A, b: B) => InteractionResult<A>
): A[] => {
    const updated = [...setA];

    for (let i = 0; i < setA.length; i++) {
        for (let j = 0; j < setB.length; j++) {
            const result = interaction(updated[i], setB[j]);
            updated[i] = result.updated;
        }
    }

    return updated;
};