// app/src/engine/videoEditorEngine/index.ts
// Video-editor substrates — each is fully standalone, no cross-dependencies.
// Import any one in isolation without pulling in the rest.

// ── Timeline / Multi-track Production ────────────────────────────────────────
export { VideoProductionSubstrate } from "./video-production-substrate";
export type {
  Clip,
  Track,
  Transition,
  TransitionKind,
  TrackKind,
} from "./video-production-substrate";

// ── Audio-Visual Sync / Lip-Sync / Sound Mixing ───────────────────────────────
export { AVSyncSubstrate } from "./av-sync-substrate";
export type {
  Phoneme,
  Viseme,
  PhonemeEntry,
  VisemeEntry,
  MixChannel,
  SyncMeta,
} from "./av-sync-substrate";

// ── Original Score / Mood-Driven Orchestration ────────────────────────────────
export { ScoreSubstrate } from "./score-substrate";
export type {
  MusicalKey,
  Mode,
  Stem,
  Instrument,
  SceneTheme,
  CharacterMotif,
} from "./score-substrate";

// ── Script / Shot-List / Storyboard ───────────────────────────────────────────
export { StorySubstrate } from "./story-substrate";
export type {
  ScriptLineKind,
  ScriptLine,
  ScriptBeat,
  ShotSize,
  CameraMove,
  Shot,
  StoryPanel,
  SceneMeta,
} from "./story-substrate";

