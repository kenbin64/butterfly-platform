// Manifold Engine Substrates
// All engines operate through dimensional programming - drill to coordinates, not iterate

// Physics - gravity, collisions, forces
export { PhysicsSubstrate, Vec3, PhysicsBodyState, PhysicsWorldConfig } from "./physicsengine";

// Video - pixels, colors, frames, regions
export { VideoSubstrate, RGBA, RGB } from "./videoEngine";

// Audio - tracks, samples, effects, DAW integration  
export { AudioSubstrate, AudioSample, TrackConfig } from "./audeoEngine";

// Game - entities, components, systems (ECS)
export { GameSubstrate, EntityState, ComponentData } from "./gameengine";

// Autonomous - agents, behaviors, goals, perceptions
export { AutonomousSubstrate, AgentGoal, Perception, BehaviorState } from "./atomomousEngine";

