/**
 * MediaSubstrate  —  MIA (Media Intelligence Architecture)
 * =========================================================
 * LOOSE COUPLING: This is a purely OPTIONAL registry/event-bus.
 * Every media engine works 100% standalone without it.
 * Engines register here only when cross-engine coordination is desired.
 *
 * Dimensional coordinates:
 *   drill("assets", "<id>")           → registered media asset
 *   drill("scenes", "<id>", "mood")   → scene mood dimension
 *   drill("characters", "<id>")       → character dimension
 *   drill("events", "<channel>")      → pub/sub event channel
 *   drill("registry", "<engineName>") → registered engine reference
 */

import { BaseSubstrate, SubstrateConfig } from "./base-substrate";

// ── Types ────────────────────────────────────────────────────────────────────

export type AssetKind = "image" | "video" | "audio" | "script" | "storyboard" | "score";

export interface MediaAsset {
  id: string;
  kind: AssetKind;
  label: string;
  uri?: string;           // file path / blob URL / object URL
  meta: Record<string, unknown>;
  createdAt: number;
}

export type SceneMood =
  | "neutral" | "tense" | "joyful" | "melancholy"
  | "action"  | "romantic" | "horror" | "comedic" | "epic";

export interface SceneDescriptor {
  id: string;
  label: string;
  startMs: number;
  endMs: number;
  mood: SceneMood;
  characters: string[];  // character IDs present in scene
  notes: string;
}

export interface CharacterDescriptor {
  id: string;
  name: string;
  role: "protagonist" | "antagonist" | "supporting" | "narrator";
  voiceProfile?: string; // reference to audio asset id
  themeId?: string;      // reference to score asset id
}

// ── MediaSubstrate ───────────────────────────────────────────────────────────

export class MediaSubstrate extends BaseSubstrate<null> {

  constructor(config?: Partial<SubstrateConfig>) {
    super({ name: "mia", version: "1.0.0", ...config }, null);
  }

  static create(config?: Partial<SubstrateConfig>): MediaSubstrate {
    return new MediaSubstrate(config);
  }

  // ── Asset registry ────────────────────────────────────────────────────────

  registerAsset(asset: MediaAsset): void {
    this.drill("assets", asset.id).value = asset;
  }

  getAsset(id: string): MediaAsset | undefined {
    return this.drill<MediaAsset>("assets", id).value;
  }

  // ── Scene registry ────────────────────────────────────────────────────────

  registerScene(scene: SceneDescriptor): void {
    this.drill("scenes", scene.id).value = scene;
    this.drill("scenes", scene.id, "mood").value = scene.mood;
  }

  getScene(id: string): SceneDescriptor | undefined {
    return this.drill<SceneDescriptor>("scenes", id).value;
  }

  sceneMood(id: string): SceneMood {
    return this.drill<SceneMood>("scenes", id, "mood").value ?? "neutral";
  }

  // ── Character registry ────────────────────────────────────────────────────

  registerCharacter(char: CharacterDescriptor): void {
    this.drill("characters", char.id).value = char;
  }

  getCharacter(id: string): CharacterDescriptor | undefined {
    return this.drill<CharacterDescriptor>("characters", id).value;
  }

  // ── Engine registry (loose coupling) ─────────────────────────────────────

  registerEngine(name: string, engine: object): void {
    this.drill("registry", name).value = engine;
  }

  getEngine<T = unknown>(name: string): T | undefined {
    return this.drill<T>("registry", name).value;
  }

  // ── Event bus ─────────────────────────────────────────────────────────────

  emit(channel: string, payload: unknown): void {
    const ch = this.drill("events", channel);
    ch.value = { payload, ts: Date.now() };
  }

  onEvent(channel: string, handler: (payload: unknown) => void): () => void {
    return this.drill("events", channel).observe((v) => {
      if (v && typeof v === "object" && "payload" in (v as object)) {
        handler((v as { payload: unknown }).payload);
      }
    });
  }

  // ── BaseSubstrate contract ────────────────────────────────────────────────

  reset(): void {
    // MIA is a live registry — reset clears registrations only
    this.drill("assets").value   = null;
    this.drill("scenes").value   = null;
    this.drill("registry").value = null;
    this.drill("events").value   = null;
  }

  serialize(): Record<string, unknown> {
    return {
      name: this.name,
      version: this._config.version
    };
  }

  hydrate(_state: unknown): void { /* stateless registry — nothing to hydrate */ }
}

