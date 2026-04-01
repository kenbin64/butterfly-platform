"use strict";
// app/src/engine/videoEditorEngine/index.ts
// Video-editor substrates — each is fully standalone, no cross-dependencies.
// Import any one in isolation without pulling in the rest.
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorySubstrate = exports.ScoreSubstrate = exports.AVSyncSubstrate = exports.VideoProductionSubstrate = void 0;
// ── Timeline / Multi-track Production ────────────────────────────────────────
var video_production_substrate_1 = require("./video-production-substrate");
Object.defineProperty(exports, "VideoProductionSubstrate", { enumerable: true, get: function () { return video_production_substrate_1.VideoProductionSubstrate; } });
// ── Audio-Visual Sync / Lip-Sync / Sound Mixing ───────────────────────────────
var av_sync_substrate_1 = require("./av-sync-substrate");
Object.defineProperty(exports, "AVSyncSubstrate", { enumerable: true, get: function () { return av_sync_substrate_1.AVSyncSubstrate; } });
// ── Original Score / Mood-Driven Orchestration ────────────────────────────────
var score_substrate_1 = require("./score-substrate");
Object.defineProperty(exports, "ScoreSubstrate", { enumerable: true, get: function () { return score_substrate_1.ScoreSubstrate; } });
// ── Script / Shot-List / Storyboard ───────────────────────────────────────────
var story_substrate_1 = require("./story-substrate");
Object.defineProperty(exports, "StorySubstrate", { enumerable: true, get: function () { return story_substrate_1.StorySubstrate; } });
