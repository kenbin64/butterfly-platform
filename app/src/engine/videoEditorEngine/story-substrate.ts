/**
 * StorySubstrate  —  Script Writing, Shot Lists & Storyboard
 * ===========================================================
 * STANDALONE — depends only on core primitives.
 *
 * Capabilities:
 *   • Three-act script structure    (acts → sequences → scenes → beats)
 *   • Dialogue lines + action lines (slugline, parenthetical, character cues)
 *   • Shot list                     (coverage, lens, movement, blocking)
 *   • Storyboard panels             (visual description, camera angle, mood)
 *   • Scene-mood tagging            (shared mood vocabulary with score substrate)
 *   • Character arc tracking        (emotional state per scene)
 *
 * Coordinate space:
 *   drill("script","act<n>","seq<n>","scene<n>","beat<n>") → ScriptBeat
 *   drill("shots",  "<sceneId>","<shotId>")                → Shot
 *   drill("board",  "<sceneId>","<panelId>")               → StoryPanel
 *   drill("chars",  "<charId>",  "<sceneId>")              → CharArcPoint
 *   drill("meta",   "<sceneId>")                           → SceneMeta
 */

import { BaseSubstrate, SubstrateConfig } from "../../../../core/substrate/base-substrate";
import type { SceneMood } from "../../../../core/substrate/media-substrate";

// ── Script types ──────────────────────────────────────────────────────────────

export type ScriptLineKind = "slugline" | "action" | "character" | "dialogue" | "parenthetical" | "transition";

export interface ScriptLine {
  kind: ScriptLineKind;
  text: string;
  pageNumber?: number;
}

export interface ScriptBeat {
  id: string;
  act: number;           // 1, 2a, 2b → use 1,2,3,4
  sequence: number;
  scene: number;
  beat: number;
  lines: ScriptLine[];
  characters: string[];  // character IDs present
  mood: SceneMood;
  durationEstimateSec?: number;
}

// ── Shot types ────────────────────────────────────────────────────────────────

export type ShotSize     = "ECU"|"CU"|"MCU"|"MS"|"MLS"|"LS"|"ELS"|"POV"|"OTS"|"INSERT";
export type CameraMove   = "static"|"pan"|"tilt"|"dolly"|"crane"|"handheld"|"steadicam"|"drone";
export type LensSize     = "fisheye"|"wide"|"normal"|"telephoto"|"macro";

export interface Shot {
  id: string;
  sceneId: string;
  number: number;
  size: ShotSize;
  lens: LensSize;
  move: CameraMove;
  description: string;
  characters: string[];
  durationSec: number;
  notes: string;
}

// ── Storyboard types ──────────────────────────────────────────────────────────

export interface StoryPanel {
  id: string;
  sceneId: string;
  panelIndex: number;
  shotId?: string;
  visualDescription: string;   // what the frame looks like
  cameraAngle: string;         // "low angle", "bird's-eye", etc.
  mood: SceneMood;
  dialogue?: string;           // spoken text visible in panel
  actionNote?: string;
}

// ── Character arc ─────────────────────────────────────────────────────────────

export interface CharArcPoint {
  charId: string;
  sceneId: string;
  emotionalState: string;   // e.g. "fearful", "determined", "heartbroken"
  desireLevel: number;      // 0-1 how badly they want their goal
  conflictLevel: number;    // 0-1 how much opposition they face
}

// ── Scene metadata ────────────────────────────────────────────────────────────

export interface SceneMeta {
  id: string;
  title: string;
  location: string;
  timeOfDay: "dawn"|"day"|"dusk"|"night"|"unknown";
  interior: boolean;
  mood: SceneMood;
  pageCount: number;
  estimatedDurationSec: number;
}

// ── StorySubstrate ────────────────────────────────────────────────────────────

export class StorySubstrate extends BaseSubstrate<null> {

  constructor(config?: Partial<SubstrateConfig>) {
    super({ name: "story", version: "1.0.0", ...config }, null);
  }

  static create(config?: Partial<SubstrateConfig>): StorySubstrate {
    return new StorySubstrate(config);
  }

  // ── Script management ─────────────────────────────────────────────────────

  addBeat(beat: ScriptBeat): void {
    const path = `act${beat.act}`;
    this.drill("script", path, `seq${beat.sequence}`, `scene${beat.scene}`, `beat${beat.beat}`).value = beat;
  }

  getBeat(act: number, seq: number, scene: number, beat: number): ScriptBeat | undefined {
    return this.drill<ScriptBeat>("script", `act${act}`, `seq${seq}`, `scene${scene}`, `beat${beat}`).value;
  }

  /** Search all beats with a given mood */
  beatsByMood(mood: SceneMood): ScriptBeat[] {
    return this.search([/script/, /.*/, /.*/, /.*/, /.*/])
      .map(d => d.value as ScriptBeat)
      .filter(b => b && b.mood === mood);
  }

  // ── Shot list ─────────────────────────────────────────────────────────────

  addShot(shot: Shot): void {
    this.drill("shots", shot.sceneId, shot.id).value = shot;
  }

  getShot(sceneId: string, shotId: string): Shot | undefined {
    return this.drill<Shot>("shots", sceneId, shotId).value;
  }

  getShotsForScene(sceneId: string): Shot[] {
    return this.drill("shots", sceneId).match(/.*/).map(d => d.value as Shot).filter(Boolean)
      .sort((a, b) => a.number - b.number);
  }

  // ── Storyboard panels ─────────────────────────────────────────────────────

  addPanel(panel: StoryPanel): void {
    this.drill("board", panel.sceneId, panel.id).value = panel;
  }

  getPanel(sceneId: string, panelId: string): StoryPanel | undefined {
    return this.drill<StoryPanel>("board", sceneId, panelId).value;
  }

  getPanelsForScene(sceneId: string): StoryPanel[] {
    return this.drill("board", sceneId).match(/.*/).map(d => d.value as StoryPanel).filter(Boolean)
      .sort((a, b) => a.panelIndex - b.panelIndex);
  }

  // ── Character arc ─────────────────────────────────────────────────────────

  setCharArc(point: CharArcPoint): void {
    this.drill("chars", point.charId, point.sceneId).value = point;
  }

  getCharArc(charId: string, sceneId: string): CharArcPoint | undefined {
    return this.drill<CharArcPoint>("chars", charId, sceneId).value;
  }

  // ── Scene metadata ────────────────────────────────────────────────────────

  setSceneMeta(meta: SceneMeta): void {
    this.drill<SceneMeta>("meta", meta.id).value = meta;
  }

  getSceneMeta(id: string): SceneMeta | undefined {
    return this.drill<SceneMeta>("meta", id).value;
  }

  // ── BaseSubstrate contract ────────────────────────────────────────────────

  reset(): void {
    this.drill("script").value = null;
    this.drill("shots").value  = null;
    this.drill("board").value  = null;
    this.drill("chars").value  = null;
    this.drill("meta").value   = null;
  }

  serialize(): Record<string, unknown> { return { name: this.name }; }
  hydrate(_state: unknown): void { /* reconstruct from imported script data */ }
}

