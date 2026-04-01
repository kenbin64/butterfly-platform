// core/engine/index.ts
// ================================================================
//  ENGINE EXPORTS
// ================================================================

export { type IEngine, type EngineStats, EngineState, EngineSuite } from "./engine-interface";
export { PhysicsEngine, type PhysicsConfig } from "./physics-engine";
export { AudioEngine, type AudioConfig } from "./audio-engine";
export { RenderEngine, type RenderConfig } from "./render-engine";
export { ThreeRenderEngine, type ThreeRenderConfig } from "./three-render-engine";
export { GameEngine, type GameConfig } from "./game-engine";
export { RulesEngine, type RulesConfig, type RuleDefinition, type RuleContext, type RulePredicate, type RuleAction } from "./rules-engine";
export { CharacterEngine, type CharacterConfig, type CharacterDefinition, type Character, type BehaviorFn } from "./character-engine";
export { EngineRegistry, defaultRegistry, type RegistryConfig, type EngineFactory, type ProfileEntry } from "./engine-registry";

