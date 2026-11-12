import { hashString } from "../core/rng";
import {
  type LoadedWorld,
  type MapDecorationDef,
  type TerrainKind,
  terrainAt,
} from "../world/MapDef";

const TERRAIN_COLORS: Record<TerrainKind, string> = {
  grass: "#1f4334",
  "grass-deep": "#17362b",
  meadow: "#2a503b",
  dirt: "#584832",
  path: "#78613f",
  water: "#1d4b50",
  bank: "#4d4732",
  stone: "#384944",
};

export class TileRenderer {
  private readonly canvas: HTMLCanvasElement | null;
  private cachedMapId = "";
  private built = false;

  constructor() {
    this.canvas =
      typeof document === "undefined" ? null : document.createElement("canvas");
  }

  draw(
    context: CanvasRenderingContext2D,
    world: LoadedWorld,
    view: { left: number; top: number; right: number; bottom: number },
  ): void {
    if (!this.canvas) {
      return;
    }

    if (!this.built || this.cachedMapId !== world.id) {
      this.build(world);
    }

    const sourceX = Math.max(0, Math.floor(view.left));
    const sourceY = Math.max(0, Math.floor(view.top));
    const sourceWidth = Math.min(
      world.width - sourceX,
      Math.ceil(view.right - view.left) + 2,
    );
    const sourceHeight = Math.min(
      world.height - sourceY,
      Math.ceil(view.bottom - view.top) + 2,
    );

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return;
    }

    context.drawImage(
      this.canvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
    );
  }

  private build(world: LoadedWorld): void {
    const canvas = this.canvas;

    if (!canvas) {
      return;
    }

    canvas.width = world.width;
    canvas.height = world.height;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.imageSmoothingEnabled = false;

    for (let tileY = 0; tileY < world.rows; tileY += 1) {
      for (let tileX = 0; tileX < world.columns; tileX += 1) {
        this.drawTerrainTile(context, world, tileX, tileY);
      }
    }

    this.drawMossPatches(context, world);

    for (const decoration of world.decorations) {
      this.drawDecoration(context, decoration);
    }

    this.cachedMapId = world.id;
    this.built = true;
  }

  private drawTerrainTile(
    context: CanvasRenderingContext2D,
    world: LoadedWorld,
    tileX: number,
    tileY: number,
  ): void {
    const kind = terrainAt(world, tileX, tileY);
    const x = tileX * world.tileSize;
    const y = tileY * world.tileSize;
    const seed = hashString(`${world.id}:${tileX}:${tileY}`);
    const variation = (seed % 100) / 100;

    context.fillStyle = TERRAIN_COLORS[kind];
    context.fillRect(x, y, world.tileSize, world.tileSize);

    if (variation > 0.55) {
      context.fillStyle =
        kind === "water" || kind === "stone"
          ? "rgba(226, 255, 245, 0.035)"
          : "rgba(247, 191, 91, 0.035)";
      context.fillRect(x, y, world.tileSize, world.tileSize);
    }

    if (variation < 0.18) {
      context.fillStyle = "rgba(2, 12, 9, 0.08)";
      context.fillRect(x, y, world.tileSize, world.tileSize);
    }

    switch (kind) {
      case "grass":
      case "grass-deep":
      case "meadow":
        this.drawGrassTexture(context, x, y, world.tileSize, seed, kind);
        break;
      case "dirt":
      case "path":
      case "bank":
        this.drawPathTexture(context, x, y, world.tileSize, seed, kind);
        break;
      case "water":
        this.drawWaterTexture(context, x, y, world.tileSize, seed);
        break;
      case "stone":
        this.drawStoneTexture(context, x, y, world.tileSize, seed);
        break;
    }
  }

  private drawGrassTexture(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    seed: number,
    kind: TerrainKind,
  ): void {
    const strokeCount = kind === "grass-deep" ? 4 : 3;

    context.strokeStyle =
      kind === "meadow"
        ? "rgba(247, 191, 91, 0.08)"
        : "rgba(117, 245, 203, 0.075)";
    context.lineWidth = 1;

    for (let index = 0; index < strokeCount; index += 1) {
      const localSeed = hashString(`${seed}:${index}`);
      const offsetX = (localSeed % 1000) / 1000;
      const offsetY = ((localSeed >>> 10) % 1000) / 1000;

      context.beginPath();
      context.moveTo(x + offsetX * size, y + offsetY * size);
      context.lineTo(
        x + offsetX * size + (localSeed % 2 === 0 ? 2 : -2),
        y + offsetY * size - 5,
      );
      context.stroke();
    }
  }

  private drawPathTexture(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    seed: number,
    kind: TerrainKind,
  ): void {
    if (kind === "bank") {
      context.fillStyle = "rgba(117, 245, 203, 0.08)";
    } else {
      context.fillStyle = "rgba(255, 226, 173, 0.09)";
    }

    for (let index = 0; index < 3; index += 1) {
      const localSeed = hashString(`${seed}:grit:${index}`);
      const offsetX = (localSeed % 1000) / 1000;
      const offsetY = ((localSeed >>> 10) % 1000) / 1000;
      const width = 2 + (localSeed % 3);

      context.fillRect(
        x + offsetX * (size - width),
        y + offsetY * (size - 2),
        width,
        2,
      );
    }
  }

  private drawWaterTexture(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    seed: number,
  ): void {
    context.strokeStyle = "rgba(159, 226, 255, 0.2)";
    context.lineWidth = 1;

    for (let index = 0; index < 3; index += 1) {
      const localSeed = hashString(`${seed}:wave:${index}`);
      const offsetY = 5 + (((localSeed >>> 8) % 1000) / 1000) * (size - 10);
      const startX = x + 3 + (localSeed % 8);
      const endX = x + size - 4 - ((localSeed >>> 4) % 9);

      context.beginPath();
      context.moveTo(startX, y + offsetY);
      context.quadraticCurveTo(
        x + size / 2,
        y + offsetY - 3,
        endX,
        y + offsetY,
      );
      context.stroke();
    }
  }

  private drawStoneTexture(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    seed: number,
  ): void {
    if (seed % 5 !== 0) {
      return;
    }

    context.strokeStyle = "rgba(2, 12, 9, 0.22)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x + 5, y + (seed % size));
    context.lineTo(x + size - 6, y + ((seed >>> 4) % size));
    context.stroke();
  }

  private drawMossPatches(
    context: CanvasRenderingContext2D,
    world: LoadedWorld,
  ): void {
    context.save();

    for (let index = 0; index < 120; index += 1) {
      const seed = hashString(`${world.id}:moss:${index}`);
      const x = (seed % 1000) / 1000 * world.width;
      const y = (((seed >>> 10) % 1000) / 1000) * world.height;
      const radiusX = 24 + ((seed >>> 20) % 60);
      const radiusY = 12 + ((seed >>> 16) % 34);

      context.fillStyle =
        index % 3 === 0
          ? "rgba(117, 245, 203, 0.025)"
          : "rgba(2, 12, 9, 0.045)";
      context.beginPath();
      context.ellipse(x, y, radiusX, radiusY, seed % 6, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }

  private drawDecoration(
    context: CanvasRenderingContext2D,
    decoration: MapDecorationDef,
  ): void {
    const scale = decoration.scale ?? 1;

    context.save();
    context.translate(decoration.x, decoration.y);
    context.rotate(decoration.rotation ?? 0);
    context.scale(scale, scale);

    switch (decoration.kind) {
      case "grass-tuft":
        context.strokeStyle = "rgba(141, 204, 151, 0.42)";
        context.lineWidth = 1.2;
        context.beginPath();
        context.moveTo(-4, 4);
        context.lineTo(-2, -5);
        context.moveTo(0, 4);
        context.lineTo(0, -7);
        context.moveTo(4, 4);
        context.lineTo(3, -4);
        context.stroke();
        break;
      case "fern":
        context.strokeStyle = "rgba(117, 245, 203, 0.36)";
        context.lineWidth = 1.2;
        context.beginPath();
        context.moveTo(0, 5);
        context.lineTo(0, -7);
        context.moveTo(0, -2);
        context.lineTo(-5, -6);
        context.moveTo(0, -4);
        context.lineTo(5, -8);
        context.stroke();
        break;
      case "flower":
        context.fillStyle =
          decoration.x > 1200
            ? "rgba(185, 151, 255, 0.72)"
            : "rgba(247, 191, 91, 0.7)";
        context.beginPath();
        context.arc(0, -2, 1.8, 0, Math.PI * 2);
        context.fill();
        break;
      case "pebble":
        context.fillStyle = "rgba(139, 160, 148, 0.52)";
        context.beginPath();
        context.ellipse(0, 0, 3.5, 2, 0.3, 0, Math.PI * 2);
        context.fill();
        break;
      case "debris":
        context.strokeStyle = "rgba(255, 113, 92, 0.35)";
        context.lineWidth = 1.4;
        context.beginPath();
        context.moveTo(-5, 2);
        context.lineTo(1, -2);
        context.lineTo(5, 3);
        context.stroke();
        break;
      case "mushroom":
        context.fillStyle = "rgba(243, 236, 255, 0.42)";
        context.fillRect(-1, -1, 2, 4);
        context.fillStyle = "rgba(255, 113, 92, 0.48)";
        context.beginPath();
        context.arc(0, -2, 3, Math.PI, Math.PI * 2);
        context.fill();
        break;
      case "reeds":
        context.strokeStyle = "rgba(117, 245, 203, 0.42)";
        context.lineWidth = 1.1;
        context.beginPath();
        context.moveTo(-4, 4);
        context.lineTo(-5, -6);
        context.moveTo(0, 4);
        context.lineTo(1, -9);
        context.moveTo(4, 4);
        context.lineTo(6, -5);
        context.stroke();
        break;
    }

    context.restore();
  }
}

export function minimapTerrainColor(kind: TerrainKind): string {
  switch (kind) {
    case "water":
      return "#245b61";
    case "bank":
      return "#665b3d";
    case "dirt":
      return "#6d573a";
    case "path":
      return "#97784b";
    case "stone":
      return "#52645c";
    case "meadow":
      return "#356148";
    case "grass-deep":
      return "#1e4334";
    case "grass":
      return "#294f3d";
  }
}
