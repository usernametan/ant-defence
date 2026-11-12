import type { Rect, Vec2 } from "../core/types";

export type ArenaObstacleKind = "wall" | "crate" | "rock";

export interface ArenaObstacle extends Rect {
  id: string;
  kind: ArenaObstacleKind;
}

export interface TestArena {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  spawn: Vec2;
  obstacles: readonly ArenaObstacle[];
}

export function createTestArena(
  width = 2048,
  height = 1280,
  tileSize = 64,
): TestArena {
  return {
    id: "test-arena",
    name: "Greenreach Test Grounds",
    width,
    height,
    tileSize,
    spawn: { x: 520, y: 640 },
    obstacles: [
      {
        id: "wall-west-upper",
        kind: "wall",
        x: 280,
        y: 330,
        width: 52,
        height: 260,
      },
      {
        id: "wall-west-lower",
        kind: "wall",
        x: 280,
        y: 720,
        width: 52,
        height: 230,
      },
      {
        id: "ruin-core",
        kind: "wall",
        x: 920,
        y: 500,
        width: 240,
        height: 220,
      },
      {
        id: "ruin-wing",
        kind: "wall",
        x: 1160,
        y: 570,
        width: 190,
        height: 52,
      },
      {
        id: "wall-east",
        kind: "wall",
        x: 1510,
        y: 300,
        width: 52,
        height: 430,
      },
      {
        id: "wall-south",
        kind: "wall",
        x: 920,
        y: 1000,
        width: 430,
        height: 52,
      },
      {
        id: "crate-alpha",
        kind: "crate",
        x: 720,
        y: 720,
        width: 84,
        height: 84,
      },
      {
        id: "crate-beta",
        kind: "crate",
        x: 826,
        y: 820,
        width: 84,
        height: 84,
      },
      {
        id: "rock-spire",
        kind: "rock",
        x: 1270,
        y: 910,
        width: 150,
        height: 110,
      },
      {
        id: "rock-north",
        kind: "rock",
        x: 720,
        y: 240,
        width: 190,
        height: 120,
      },
    ],
  };
}
