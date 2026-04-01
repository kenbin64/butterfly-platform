// Manifold Engine Substrates
// All engines operate through dimensional programming - drill to coordinates, not iterate.
// Every export is independently importable — loose coupling, no cross-engine hard deps.

// Physics — gravity, collisions, forces
export { PhysicsSubstrate, Vec3, PhysicsBodyState, PhysicsWorldConfig } from "./physicsengine";

// Video pixel pipeline — frames, regions, colour
export { VideoSubstrate, RGBA, RGB } from "./videoEngine";

// Audio — tracks, samples, effects, DAW integration
export { AudioSubstrate, AudioSample, TrackConfig } from "./audeoEngine";

// Game — entities, components, systems (ECS)
export { GameSubstrate, EntityState, ComponentData } from "./gameengine";

// Autonomous — agents, behaviours, goals, perceptions
export { AutonomousSubstrate, AgentGoal, Perception, BehaviorState } from "./atomomousEngine";

// ── Media Intelligence Architecture (MIA) ────────────────────────────────────
// Image engine — restoration (grain/scratch/crease) + HDR enhancement
export { ImageEngine }                    from "./image-engine";
export type { ImageEngineConfig }         from "./image-engine";
export {
  ImageRestorationSubstrate,
  ImageEnhancementSubstrate,
} from "./imageEngine";
export type {
  RestRGBA, DamageKind, RestorationConfig, RestorationStats,
  EnhRGBA, ToneMapOperator, UpscaleMode, FaceRegion, EnhancementConfig, EnhancementMeta,
} from "./imageEngine";

// Video editor engine — Hollywood-grade multi-track editor
export { VideoEditorEngine }              from "./video-editor-engine";
export type { VideoEditorConfig }         from "./video-editor-engine";
export {
  VideoProductionSubstrate,
  AVSyncSubstrate,
  ScoreSubstrate,
  StorySubstrate,
} from "./videoEditorEngine";
export type {
  Clip, Track, Transition, TransitionKind, TrackKind,
  Phoneme, Viseme, PhonemeEntry, VisemeEntry, MixChannel, SyncMeta,
  MusicalKey, Mode, Stem, Instrument, SceneTheme, CharacterMotif,
  ScriptLineKind, ScriptLine, ScriptBeat,
  ShotSize, CameraMove, Shot, StoryPanel, SceneMeta,
} from "./videoEditorEngine";

