"use strict";
// Manifold Engine Substrates
// All engines operate through dimensional programming - drill to coordinates, not iterate
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousSubstrate = exports.GameSubstrate = exports.AudioSubstrate = exports.VideoSubstrate = exports.PhysicsSubstrate = void 0;
// Physics - gravity, collisions, forces
var physicsengine_1 = require("./physicsengine");
Object.defineProperty(exports, "PhysicsSubstrate", { enumerable: true, get: function () { return physicsengine_1.PhysicsSubstrate; } });
// Video - pixels, colors, frames, regions
var videoEngine_1 = require("./videoEngine");
Object.defineProperty(exports, "VideoSubstrate", { enumerable: true, get: function () { return videoEngine_1.VideoSubstrate; } });
// Audio - tracks, samples, effects, DAW integration  
var audeoEngine_1 = require("./audeoEngine");
Object.defineProperty(exports, "AudioSubstrate", { enumerable: true, get: function () { return audeoEngine_1.AudioSubstrate; } });
// Game - entities, components, systems (ECS)
var gameengine_1 = require("./gameengine");
Object.defineProperty(exports, "GameSubstrate", { enumerable: true, get: function () { return gameengine_1.GameSubstrate; } });
// Autonomous - agents, behaviors, goals, perceptions
var atomomousEngine_1 = require("./atomomousEngine");
Object.defineProperty(exports, "AutonomousSubstrate", { enumerable: true, get: function () { return atomomousEngine_1.AutonomousSubstrate; } });
