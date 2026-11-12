import { hashString } from "../core/rng";
import type { Creature } from "../entities/Creature";
import type { PlayerRenderState } from "../entities/Player";
import type { TargetDummy } from "../entities/TargetDummy";
import {
  terrainAt,
  type LoadedWorld,
  type PointOfInterestKind,
  type TerrainKind,
} from "../world/MapDef";
import type { Camera } from "./Camera";
import { minimapTerrainColor } from "./TileRenderer";

const MAP_WIDTH = 192;
const MAP_HEIGHT = 120;

export class MinimapRenderer {
  private readonly terrainCanvas: HTMLCanvasElement | null;
  private cachedMapId = "";
  private built = false;

  constructor() {
    this.terrainCanvas =
      typeof document === "undefined" ? null : document.createElement("canvas");
  }

  draw(
    context: CanvasRenderingContext2D,
    world: LoadedWorld,
    camera: Camera,
    player: PlayerRenderState,
    creatures: readonly Creature[],
    targets: readonly TargetDummy[],
    viewportWidth: number,
  ): void {
    const width = 164;
    const height = Math.round((width * world.height) / world.width);
    const x = viewportWidth - width - 22;
    const y = 76;
    const innerWidth = width - 12;
    const innerHeight = height - 12;
    const scaleX = innerWidth / world.width;
    const scaleY = innerHeight / world.height;

    if (!this.built || this.cachedMapId !== world.id) {
      this.build(world);
    }

    context.save();
    context.fillStyle = "rgba(2, 12, 9, 0.78)";
    context.beginPath();
    context.roundRect(x, y, width, height, 8);
    context.fill();
    context.strokeStyle = "rgba(247, 191, 91, 0.34)";
    context.lineWidth = 1;
    context.stroke();

    if (this.terrainCanvas) {
      context.drawImage(
        this.terrainCanvas,
        x + 6,
        y + 6,
        innerWidth,
        innerHeight,
      );
    }

    context.save();
    context.beginPath();
    context.roundRect(x + 6, y + 6, innerWidth, innerHeight, 4);
    context.clip();

    context.strokeStyle = "rgba(247, 191, 91, 0.62)";
    context.lineWidth = 1;
    context.setLineDash([3, 3]);
    context.strokeRect(
      x + 6 + camera.left * scaleX,
      y + 6 + camera.top * scaleY,
      camera.width * scaleX,
      camera.height * scaleY,
    );
    context.setLineDash([]);

    for (const poi of world.pointsOfInterest) {
      context.fillStyle = poiColor(poi.kind);
      context.fillRect(
        x + 6 + poi.x * scaleX - 1.5,
        y + 6 + poi.y * scaleY - 1.5,
        3,
        3,
      );
    }

    for (const target of targets) {
      context.fillStyle = "rgba(159, 226, 255, 0.9)";
      context.fillRect(
        x + 6 + target.x * scaleX - 1.5,
        y + 6 + target.y * scaleY - 1.5,
        3,
        3,
      );
    }

    for (const creature of creatures) {
      if (!creature.alive) {
        continue;
      }

      context.fillStyle = "rgba(255, 113, 92, 0.92)";
      context.beginPath();
      context.arc(
        x + 6 + creature.x * scaleX,
        y + 6 + creature.y * scaleY,
        2,
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    context.fillStyle = "#f7bf5b";
    context.beginPath();
    context.arc(
      x + 6 + player.x * scaleX,
      y + 6 + player.y * scaleY,
      2.8,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.86)";
    context.lineWidth = 1;
    context.stroke();

    context.restore();

    context.fillStyle = "rgba(226, 255, 245, 0.56)";
    context.font = "500 8px 'IBM Plex Mono', monospace";
    context.textAlign = "left";
    context.fillText("GREENREACH WILDS", x + 7, y + height - 2);
    context.textAlign = "right";
    context.fillText("N", x + width - 7, y + height - 2);
    context.restore();
  }

  private build(world: LoadedWorld): void {
    const canvas = this.terrainCanvas;

    if (!canvas) {
      return;
    }

    canvas.width = MAP_WIDTH;
    canvas.height = MAP_HEIGHT;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const scaleX = MAP_WIDTH / world.width;
    const scaleY = MAP_HEIGHT / world.height;

    for (let pixelY = 0; pixelY < MAP_HEIGHT; pixelY += 1) {
      for (let pixelX = 0; pixelX < MAP_WIDTH; pixelX += 1) {
        const worldX = (pixelX + 0.5) / scaleX;
        const worldY = (pixelY + 0.5) / scaleY;
        const tileX = Math.floor(worldX / world.tileSize);
        const tileY = Math.floor(worldY / world.tileSize);
        const kind = terrainAt(world, tileX, tileY);

        context.fillStyle = minimapColor(kind, pixelX, pixelY, world.id);
        context.fillRect(pixelX, pixelY, 1, 1);
      }
    }

    for (const prop of world.solidProps) {
      const seed = hashString(prop.id);
      context.fillStyle =
        prop.kind === "tree" || prop.kind === "bush"
          ? "rgba(8, 32, 23, 0.7)"
          : "rgba(26, 35, 31, 0.62)";
      context.fillRect(
        prop.x * scaleX,
        prop.y * scaleY,
        Math.max(1, prop.width * scaleX),
        Math.max(1, prop.height * scaleY),
      );

      if (seed % 3 === 0) {
        context.fillStyle = "rgba(117, 245, 203, 0.08)";
        context.fillRect(prop.x * scaleX, prop.y * scaleY, 1, 1);
      }
    }

    this.cachedMapId = world.id;
    this.built = true;
  }
}

function minimapColor(
  kind: TerrainKind,
  x: number,
  y: number,
  worldId: string,
): string {
  if (kind === "path" || kind === "dirt") {
    return minimapTerrainColor(kind);
  }

  const seed = hashString(`${worldId}:mini:${x}:${y}`);

  if (seed % 9 === 0) {
    return kind === "water" ? "#2f6d73" : "#315e44";
  }

  return minimapTerrainColor(kind);
}

function poiColor(kind: PointOfInterestKind): string {
  switch (kind) {
    case "waystation":
      return "rgba(117, 245, 203, 0.9)";
    case "ruin":
      return "rgba(247, 191, 91, 0.85)";
    case "crossing":
      return "rgba(159, 226, 255, 0.85)";
    case "forest":
      return "rgba(141, 204, 151, 0.85)";
    case "rocky":
      return "rgba(200, 191, 160, 0.85)";
    case "meadow":
      return "rgba(238, 198, 129, 0.72)";
  }
}
