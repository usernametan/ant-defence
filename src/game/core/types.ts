export type GamePhase = "menu" | "playing" | "paused" | "victory";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Vec2, Size {}

export interface GameConfig {
  viewportWidth: number;
  viewportHeight: number;
  worldWidth: number;
  worldHeight: number;
  tileSize: number;
  fixedStep: number;
  maxCatchUpSteps: number;
  maxFrameDelta: number;
  snapshotIntervalMs: number;
  dprCap: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  viewportWidth: 960,
  viewportHeight: 540,
  worldWidth: 2048,
  worldHeight: 1280,
  tileSize: 32,
  fixedStep: 1 / 60,
  maxCatchUpSteps: 5,
  maxFrameDelta: 0.25,
  snapshotIntervalMs: 100,
  dprCap: 2,
};
