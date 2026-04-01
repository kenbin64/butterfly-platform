"use strict";
// Manifold Engine Substrates
// All engines operate through dimensional programming - drill to coordinates, not iterate.
// Every export is independently importable — loose coupling, no cross-engine hard deps.
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorySubstrate = exports.ScoreSubstrate = exports.AVSyncSubstrate = exports.VideoProductionSubstrate = exports.VideoEditorEngine = exports.ImageEnhancementSubstrate = exports.ImageRestorationSubstrate = exports.ImageEngine = exports.AutonomousSubstrate = exports.GameSubstrate = exports.AudioSubstrate = exports.VideoSubstrate = exports.PhysicsSubstrate = void 0;
// Physics — gravity, collisions, forces
var physicsengine_1 = require("./physicsengine");
Object.defineProperty(exports, "PhysicsSubstrate", { enumerable: true, get: function () { return physicsengine_1.PhysicsSubstrate; } });
// Video pixel pipeline — frames, regions, colour
var videoEngine_1 = require("./videoEngine");
Object.defineProperty(exports, "VideoSubstrate", { enumerable: true, get: function () { return videoEngine_1.VideoSubstrate; } });
// Audio — tracks, samples, effects, DAW integration
var audeoEngine_1 = require("./audeoEngine");
Object.defineProperty(exports, "AudioSubstrate", { enumerable: true, get: function () { return audeoEngine_1.AudioSubstrate; } });
// Game — entities, components, systems (ECS)
var gameengine_1 = require("./gameengine");
Object.defineProperty(exports, "GameSubstrate", { enumerable: true, get: function () { return gameengine_1.GameSubstrate; } });
// Autonomous — agents, behaviours, goals, perceptions
var atomomousEngine_1 = require("./atomomousEngine");
Object.defineProperty(exports, "AutonomousSubstrate", { enumerable: true, get: function () { return atomomousEngine_1.AutonomousSubstrate; } });
// ── Media Intelligence Architecture (MIA) ────────────────────────────────────
// Image engine — restoration (grain/scratch/crease) + HDR enhancement
var image_engine_1 = require("./image-engine");
Object.defineProperty(exports, "ImageEngine", { enumerable: true, get: function () { return image_engine_1.ImageEngine; } });
var imageEngine_1 = require("./imageEngine");
Object.defineProperty(exports, "ImageRestorationSubstrate", { enumerable: true, get: function () { return imageEngine_1.ImageRestorationSubstrate; } });
Object.defineProperty(exports, "ImageEnhancementSubstrate", { enumerable: true, get: function () { return imageEngine_1.ImageEnhancementSubstrate; } });
// Video editor engine — Hollywood-grade multi-track editor
var video_editor_engine_1 = require("./video-editor-engine");
Object.defineProperty(exports, "VideoEditorEngine", { enumerable: true, get: function () { return video_editor_engine_1.VideoEditorEngine; } });
var videoEditorEngine_1 = require("./videoEditorEngine");
Object.defineProperty(exports, "VideoProductionSubstrate", { enumerable: true, get: function () { return videoEditorEngine_1.VideoProductionSubstrate; } });
Object.defineProperty(exports, "AVSyncSubstrate", { enumerable: true, get: function () { return videoEditorEngine_1.AVSyncSubstrate; } });
Object.defineProperty(exports, "ScoreSubstrate", { enumerable: true, get: function () { return videoEditorEngine_1.ScoreSubstrate; } });
Object.defineProperty(exports, "StorySubstrate", { enumerable: true, get: function () { return videoEditorEngine_1.StorySubstrate; } });
