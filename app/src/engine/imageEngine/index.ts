// app/src/engine/imageEngine/index.ts
// Image engine substrates — each is fully standalone, no cross-dependencies.

export { ImageRestorationSubstrate }  from "./image-restoration-substrate";
export type { RGBA as RestRGBA, DamageKind, RestorationConfig, RestorationStats }
  from "./image-restoration-substrate";

export { ImageEnhancementSubstrate }  from "./image-enhancement-substrate";
export type { RGBA as EnhRGBA, ToneMapOperator, UpscaleMode,
              FaceRegion, EnhancementConfig, EnhancementMeta }
  from "./image-enhancement-substrate";

