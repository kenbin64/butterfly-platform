"use strict";
// app/src/engine/imageEngine/index.ts
// Image engine substrates — each is fully standalone, no cross-dependencies.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageEnhancementSubstrate = exports.ImageRestorationSubstrate = void 0;
var image_restoration_substrate_1 = require("./image-restoration-substrate");
Object.defineProperty(exports, "ImageRestorationSubstrate", { enumerable: true, get: function () { return image_restoration_substrate_1.ImageRestorationSubstrate; } });
var image_enhancement_substrate_1 = require("./image-enhancement-substrate");
Object.defineProperty(exports, "ImageEnhancementSubstrate", { enumerable: true, get: function () { return image_enhancement_substrate_1.ImageEnhancementSubstrate; } });
