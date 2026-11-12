import type { ProjectileSystem } from "../combat/ProjectileSystem";
import { clamp } from "../core/math";
import type { GameConfig, Vec2 } from "../core/types";
import type { Creature, CreatureRenderState } from "../entities/Creature";
import type { PlayerRenderState } from "../entities/Player";
import type { TargetDummy } from "../entities/TargetDummy";
import type { ArenaObstacle, TestArena } from "../world/TestArena";
import type { Camera } from "./Camera";
import { drawCreature } from "./drawCreature";
import { drawDebugOverlay, drawWorldDebug } from "./drawDebug";
import { drawPlayer } from "./drawPlayer";
import { drawProjectiles } from "./drawProjectiles";
import { drawTargetDummy } from "./drawTargetDummy";
import type { ImpactEffects } from "./effects";

export interface CombatRenderState {
  weaponName: string;
  energy: number;
  maxEnergy: number;
  cooldown: number;
  projectileCount: number;
  targetsAlive: number;
  targetsTotal: number;
  enemiesAlive: number;
  enemiesTotal: number;
  kills: number;
  playerHealth: number;
  playerMaxHealth: number;
}

export interface RenderState {
  timeSeconds: number;
  debug: boolean;
  arena: TestArena;
  player: PlayerRenderState;
  aim: Vec2 | null;
  projectiles: ProjectileSystem;
  targets: readonly TargetDummy[];
  creatures: readonly Creature[];
  creatureStates: readonly CreatureRenderState[];
  effects: ImpactEffects;
  combat: CombatRenderState;
}

const GRID_COLOR = "rgba(117, 245, 203, 0.07)";
const MAJOR_GRID_COLOR = "rgba(117, 245, 203, 0.16)";
const WORLD_EDGE_COLOR = "rgba(247, 191, 91, 0.48)";

export class Renderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly resizeObserver: ResizeObserver | null;
  private scaleX = 1;
  private scaleY = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly config: GameConfig,
    private readonly camera: Camera,
  ) {
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("Canvas 2D is unavailable");
    }

    this.context = context;
    this.resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => this.resize());
    this.resizeObserver?.observe(canvas);
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = rect.width || this.config.viewportWidth;
    const cssHeight = rect.height || this.config.viewportHeight;
    const dpr = clamp(
      typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
      1,
      this.config.dprCap,
    );
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    this.scaleX = width / this.config.viewportWidth;
    this.scaleY = height / this.config.viewportHeight;
  }

  render(state: RenderState): void {
    const context = this.context;
    const { viewportWidth, viewportHeight } = this.config;

    context.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
    context.clearRect(0, 0, viewportWidth, viewportHeight);

    this.drawBackdrop(state.timeSeconds);

    context.save();
    context.translate(-this.camera.left, -this.camera.top);
    this.drawArena(state.arena, state.timeSeconds);

    for (const target of state.targets) {
      drawTargetDummy(context, target);
    }

    for (const creature of state.creatureStates) {
      drawCreature(context, creature, state.timeSeconds);
    }

    drawPlayer(context, state.player, state.timeSeconds);
    drawProjectiles(context, state.projectiles);
    this.drawAimGuide(state.player, state.aim, state.timeSeconds);
    state.effects.draw(context);

    if (state.debug) {
      drawWorldDebug(context, {
        camera: this.camera,
        config: this.config,
        arena: state.arena,
        player: state.player,
        aim: state.aim,
        targets: state.targets,
        creatures: state.creatures,
      });
    }

    context.restore();

    if (state.debug) {
      context.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
      drawDebugOverlay(context, {
        camera: this.camera,
        config: this.config,
        arena: state.arena,
        player: state.player,
        aim: state.aim,
        combat: state.combat,
      });
    }

    this.drawVignette();
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
  }

  private drawBackdrop(timeSeconds: number): void {
    const context = this.context;
    const { viewportWidth, viewportHeight } = this.config;
    const gradient = context.createLinearGradient(0, 0, 0, viewportHeight);
    gradient.addColorStop(0, "#061210");
    gradient.addColorStop(0.46, "#09211c");
    gradient.addColorStop(1, "#0b2a23");
    context.fillStyle = gradient;
    context.fillRect(0, 0, viewportWidth, viewportHeight);

    const pulse = 0.5 + Math.sin(timeSeconds * 0.35) * 0.08;
    const glow = context.createRadialGradient(
      viewportWidth * 0.68,
      viewportHeight * 0.36,
      12,
      viewportWidth * 0.68,
      viewportHeight * 0.36,
      viewportWidth * 0.72,
    );
    glow.addColorStop(0, `rgba(44, 172, 139, ${0.2 * pulse})`);
    glow.addColorStop(0.48, "rgba(21, 86, 73, 0.08)");
    glow.addColorStop(1, "rgba(3, 10, 9, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, viewportWidth, viewportHeight);
  }

  private drawArena(arena: TestArena, timeSeconds: number): void {
    const context = this.context;
    const camera = this.camera;

    context.fillStyle = "#0a241e";
    context.fillRect(0, 0, arena.width, arena.height);

    const viewLeft = clamp(camera.left, 0, arena.width);
    const viewTop = clamp(camera.top, 0, arena.height);
    const viewRight = clamp(camera.right, 0, arena.width);
    const viewBottom = clamp(camera.bottom, 0, arena.height);

    this.drawGrid(
      viewLeft,
      viewTop,
      viewRight,
      viewBottom,
      arena.tileSize,
    );
    this.drawGroundContours(arena, timeSeconds);
    this.drawSpawnPad(arena);
    this.drawObstacles(arena.obstacles);

    context.strokeStyle = WORLD_EDGE_COLOR;
    context.lineWidth = 3;
    context.strokeRect(1.5, 1.5, arena.width - 3, arena.height - 3);

    context.fillStyle = "rgba(226, 255, 245, 0.26)";
    context.font = "500 11px 'IBM Plex Mono', monospace";
    context.textAlign = "left";
    context.fillText(
      `${arena.name.toUpperCase()} // ${arena.obstacles.length} SOLIDS`,
      52,
      arena.height - 42,
    );
  }

  private drawGrid(
    left: number,
    top: number,
    right: number,
    bottom: number,
    tileSize: number,
  ): void {
    const context = this.context;
    const startX = Math.floor(left / tileSize) * tileSize;
    const startY = Math.floor(top / tileSize) * tileSize;

    for (let x = startX; x <= right; x += tileSize) {
      const major = Math.round(x / tileSize) % 4 === 0;
      context.strokeStyle = major ? MAJOR_GRID_COLOR : GRID_COLOR;
      context.lineWidth = major ? 1.25 : 1;
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, bottom);
      context.stroke();
    }

    for (let y = startY; y <= bottom; y += tileSize) {
      const major = Math.round(y / tileSize) % 4 === 0;
      context.strokeStyle = major ? MAJOR_GRID_COLOR : GRID_COLOR;
      context.lineWidth = major ? 1.25 : 1;
      context.beginPath();
      context.moveTo(left, y);
      context.lineTo(right, y);
      context.stroke();
    }
  }

  private drawGroundContours(arena: TestArena, timeSeconds: number): void {
    const context = this.context;
    const centerX = arena.width / 2;
    const centerY = arena.height / 2;
    const drift = Math.sin(timeSeconds * 0.12) * 8;

    context.save();
    context.strokeStyle = "rgba(117, 245, 203, 0.075)";
    context.lineWidth = 1;

    for (let radius = 240; radius <= 720; radius += 120) {
      context.beginPath();
      context.ellipse(
        centerX + drift,
        centerY,
        radius * 1.2,
        radius * 0.56,
        -0.16,
        0,
        Math.PI * 2,
      );
      context.stroke();
    }

    context.restore();
  }

  private drawSpawnPad(arena: TestArena): void {
    const context = this.context;
    const { x, y } = arena.spawn;
    const time = performance.now() / 1000;
    const pulse = 0.5 + Math.sin(time * 2.2) * 0.5;

    context.save();
    context.strokeStyle = `rgba(247, 191, 91, ${0.3 + pulse * 0.25})`;
    context.lineWidth = 1.5;
    context.setLineDash([7, 6]);
    context.beginPath();
    context.arc(x, y, 52, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);

    context.strokeStyle = "rgba(247, 191, 91, 0.24)";
    context.beginPath();
    context.moveTo(x - 68, y);
    context.lineTo(x + 68, y);
    context.moveTo(x, y - 68);
    context.lineTo(x, y + 68);
    context.stroke();

    context.fillStyle = "rgba(247, 191, 91, 0.58)";
    context.font = "500 10px 'IBM Plex Mono', monospace";
    context.textAlign = "center";
    context.fillText("INSERTION", x, y + 72);
    context.restore();
  }

  private drawObstacles(obstacles: readonly ArenaObstacle[]): void {
    const context = this.context;

    for (const obstacle of obstacles) {
      context.fillStyle = "rgba(0, 0, 0, 0.34)";
      context.fillRect(
        obstacle.x + 9,
        obstacle.y + 11,
        obstacle.width,
        obstacle.height,
      );
    }

    for (const obstacle of obstacles) {
      const palette = this.getObstaclePalette(obstacle.kind);
      context.fillStyle = palette.fill;
      context.fillRect(
        obstacle.x,
        obstacle.y,
        obstacle.width,
        obstacle.height,
      );

      context.fillStyle = palette.top;
      context.fillRect(
        obstacle.x,
        obstacle.y,
        obstacle.width,
        Math.min(8, obstacle.height),
      );

      context.strokeStyle = palette.edge;
      context.lineWidth = 1.5;
      context.strokeRect(
        obstacle.x + 0.75,
        obstacle.y + 0.75,
        obstacle.width - 1.5,
        obstacle.height - 1.5,
      );

      if (obstacle.kind === "wall") {
        context.strokeStyle = "rgba(226, 255, 245, 0.07)";
        context.lineWidth = 1;

        for (let offset = 22; offset < obstacle.width; offset += 28) {
          context.beginPath();
          context.moveTo(obstacle.x + offset, obstacle.y + 8);
          context.lineTo(obstacle.x + offset, obstacle.y + obstacle.height);
          context.stroke();
        }
      }
    }
  }

  private getObstaclePalette(kind: ArenaObstacle["kind"]): {
    fill: string;
    top: string;
    edge: string;
  } {
    switch (kind) {
      case "crate":
        return {
          fill: "#5a4729",
          top: "rgba(255, 228, 174, 0.22)",
          edge: "rgba(247, 191, 91, 0.48)",
        };
      case "rock":
        return {
          fill: "#263a34",
          top: "rgba(139, 202, 183, 0.16)",
          edge: "rgba(139, 202, 183, 0.36)",
        };
      case "wall":
        return {
          fill: "#123b33",
          top: "rgba(117, 245, 203, 0.13)",
          edge: "rgba(117, 245, 203, 0.34)",
        };
    }
  }

  private drawAimGuide(
    player: PlayerRenderState,
    aim: Vec2 | null,
    timeSeconds: number,
  ): void {
    if (!aim) {
      return;
    }

    const context = this.context;
    const deltaX = aim.x - player.x;
    const deltaY = aim.y - player.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance > player.radius + 12) {
      const startX = player.x + (deltaX / distance) * (player.radius + 7);
      const startY = player.y + (deltaY / distance) * (player.radius + 7);

      context.strokeStyle = "rgba(226, 255, 245, 0.18)";
      context.lineWidth = 1;
      context.setLineDash([3, 6]);
      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(aim.x, aim.y);
      context.stroke();
      context.setLineDash([]);
    }

    context.save();
    context.translate(aim.x, aim.y);
    context.rotate(timeSeconds * 0.6);
    context.strokeStyle = "rgba(247, 191, 91, 0.9)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(0, 0, 10, 0, Math.PI * 2);
    context.stroke();

    for (let index = 0; index < 4; index += 1) {
      context.rotate(Math.PI / 2);
      context.beginPath();
      context.moveTo(13, 0);
      context.lineTo(20, 0);
      context.stroke();
    }

    context.fillStyle = "rgba(247, 191, 91, 0.9)";
    context.beginPath();
    context.arc(0, 0, 1.6, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  private drawVignette(): void {
    const context = this.context;
    const { viewportWidth, viewportHeight } = this.config;
    const vignette = context.createRadialGradient(
      viewportWidth / 2,
      viewportHeight / 2,
      viewportHeight * 0.18,
      viewportWidth / 2,
      viewportHeight / 2,
      viewportWidth * 0.72,
    );
    vignette.addColorStop(0, "rgba(1, 8, 7, 0)");
    vignette.addColorStop(1, "rgba(1, 8, 7, 0.62)");
    context.fillStyle = vignette;
    context.fillRect(0, 0, viewportWidth, viewportHeight);
  }
}
