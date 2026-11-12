import type { ProjectileSystem } from "../combat/ProjectileSystem";
import { clamp } from "../core/math";
import type { GameConfig, Vec2 } from "../core/types";
import type { Creature, CreatureRenderState } from "../entities/Creature";
import type { PlayerRenderState } from "../entities/Player";
import type { TargetDummy } from "../entities/TargetDummy";
import type { ItemPickupSystem } from "../systems/ItemPickupSystem";
import type { PickupSystem } from "../systems/PickupSystem";
import type { LoadedWorld } from "../world/MapDef";
import type { Camera } from "./Camera";
import { drawCreature } from "./drawCreature";
import { drawDebugOverlay, drawWorldDebug } from "./drawDebug";
import { drawPickup } from "./drawPickups";
import { drawPlayer } from "./drawPlayer";
import { drawWorldItem } from "./drawWorldItems";
import { drawProjectiles } from "./drawProjectiles";
import { drawTargetDummy } from "./drawTargetDummy";
import {
  drawWorldGroundProp,
  drawWorldPropBase,
  drawWorldPropOverhead,
  isWorldPropVisible,
  worldPropSortY,
} from "./drawWorld";
import type { ImpactEffects } from "./effects";
import { MinimapRenderer } from "./MinimapRenderer";
import { TileRenderer } from "./TileRenderer";

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
  playerArmor: number;
  playerMaxArmor: number;
  pickupsActive: number;
  pickupsTotal: number;
}

export interface RenderState {
  timeSeconds: number;
  debug: boolean;
  world: LoadedWorld;
  player: PlayerRenderState;
  aim: Vec2 | null;
  projectiles: ProjectileSystem;
  targets: readonly TargetDummy[];
  creatures: readonly Creature[];
  creatureStates: readonly CreatureRenderState[];
  pickups: PickupSystem;
  items: ItemPickupSystem;
  effects: ImpactEffects;
  combat: CombatRenderState;
}

interface SceneItem {
  y: number;
  draw: () => void;
}

const WORLD_EDGE_COLOR = "rgba(247, 191, 91, 0.48)";

export class Renderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly resizeObserver: ResizeObserver | null;
  private readonly tileRenderer = new TileRenderer();
  private readonly minimapRenderer = new MinimapRenderer();
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
    const { world } = state;

    context.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
    context.clearRect(0, 0, viewportWidth, viewportHeight);
    this.drawBackdrop(state.timeSeconds);

    context.save();
    context.translate(-this.camera.left, -this.camera.top);
    this.drawWorld(state);

    context.strokeStyle = WORLD_EDGE_COLOR;
    context.lineWidth = 3;
    context.strokeRect(1.5, 1.5, world.width - 3, world.height - 3);

    context.fillStyle = "rgba(226, 255, 245, 0.22)";
    context.font = "500 11px 'IBM Plex Mono', monospace";
    context.textAlign = "left";
    context.fillText(
      `${world.name.toUpperCase()} // ${world.solidProps.length} SOLIDS`,
      52,
      world.height - 42,
    );

    if (state.debug) {
      drawWorldDebug(context, {
        camera: this.camera,
        config: this.config,
        world,
        player: state.player,
        aim: state.aim,
        targets: state.targets,
        creatures: state.creatures,
      });
    }

    context.restore();

    this.drawSurvivalOverlay(state);

    if (state.debug) {
      context.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
      drawDebugOverlay(context, {
        camera: this.camera,
        config: this.config,
        world,
        player: state.player,
        aim: state.aim,
        combat: state.combat,
      });
    }

    this.drawVignette();

    if (!state.debug) {
      this.minimapRenderer.draw(
        context,
        world,
        this.camera,
        state.player,
        state.creatures,
        state.targets,
        viewportWidth,
      );
    }
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
  }

  private drawWorld(state: RenderState): void {
    const context = this.context;
    const { world, timeSeconds } = state;

    this.tileRenderer.draw(context, world, {
      left: this.camera.left,
      top: this.camera.top,
      right: this.camera.right,
      bottom: this.camera.bottom,
    });

    for (const prop of world.props) {
      if (
        prop.layer === "ground" &&
        isWorldPropVisible(prop, this.camera, 20)
      ) {
        drawWorldGroundProp(context, prop);
      }
    }

    this.drawSpawnPad(world.spawn, timeSeconds);
    this.drawScene(state);

    for (const prop of world.props) {
      if (
        prop.layer === "object" &&
        prop.kind === "tree" &&
        isWorldPropVisible(prop, this.camera)
      ) {
        drawWorldPropOverhead(context, prop, timeSeconds);
      }
    }
  }

  private drawScene(state: RenderState): void {
    const context = this.context;
    const { world } = state;
    const items: SceneItem[] = [];

    for (const prop of world.props) {
      if (
        prop.layer !== "object" ||
        !isWorldPropVisible(prop, this.camera)
      ) {
        continue;
      }

      items.push({
        y: worldPropSortY(prop),
        draw: () => drawWorldPropBase(context, prop),
      });
    }

    for (const target of state.targets) {
      items.push({
        y: target.y,
        draw: () => drawTargetDummy(context, target),
      });
    }

    for (const pickup of state.pickups.pickups) {
      if (!pickup.active) {
        continue;
      }

      items.push({
        y: pickup.y,
        draw: () => drawPickup(context, pickup, state.timeSeconds),
      });
    }

    for (const item of state.items.items) {
      if (!item.active) {
        continue;
      }

      items.push({
        y: item.y,
        draw: () => drawWorldItem(context, item, state.timeSeconds),
      });
    }

    for (const creature of state.creatureStates) {
      items.push({
        y: creature.y,
        draw: () => drawCreature(context, creature, state.timeSeconds),
      });
    }

    items.push({
      y: state.player.y,
      draw: () => drawPlayer(context, state.player, state.timeSeconds),
    });

    items.sort((first, second) => first.y - second.y);

    for (const item of items) {
      item.draw();
    }

    drawProjectiles(context, state.projectiles);
    this.drawAimGuide(state.player, state.aim, state.timeSeconds);
    state.effects.draw(context);
  }

  private drawSpawnPad(spawn: Vec2, timeSeconds: number): void {
    const context = this.context;
    const pulse = 0.5 + Math.sin(timeSeconds * 2.2) * 0.5;

    context.save();
    context.strokeStyle = `rgba(247, 191, 91, ${0.22 + pulse * 0.2})`;
    context.lineWidth = 1.5;
    context.setLineDash([7, 7]);
    context.beginPath();
    context.arc(spawn.x, spawn.y, 48, 0, Math.PI * 2);
    context.stroke();
    context.setLineDash([]);

    context.strokeStyle = "rgba(247, 191, 91, 0.18)";
    context.beginPath();
    context.moveTo(spawn.x - 62, spawn.y);
    context.lineTo(spawn.x + 62, spawn.y);
    context.moveTo(spawn.x, spawn.y - 62);
    context.lineTo(spawn.x, spawn.y + 62);
    context.stroke();

    context.fillStyle = "rgba(247, 191, 91, 0.52)";
    context.font = "500 10px 'IBM Plex Mono', monospace";
    context.textAlign = "center";
    context.fillText("WAYSTATION", spawn.x, spawn.y + 68);
    context.restore();
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

  private drawSurvivalOverlay(state: RenderState): void {
    const { player } = state;
    const healthRatio =
      player.maxHealth > 0
        ? clamp(player.health / player.maxHealth, 0, 1)
        : 0;
    const hitGlow = clamp(player.hitFlash, 0, 1) * 0.34;
    const lowHealthGlow =
      player.alive && healthRatio < 0.3
        ? (0.3 - healthRatio) * 0.8
        : 0;
    const intensity = Math.max(hitGlow, lowHealthGlow);

    if (intensity <= 0.001) {
      return;
    }

    const context = this.context;
    const { viewportWidth, viewportHeight } = this.config;
    const gradient = context.createRadialGradient(
      viewportWidth / 2,
      viewportHeight / 2,
      viewportHeight * 0.22,
      viewportWidth / 2,
      viewportHeight / 2,
      viewportWidth * 0.74,
    );
    gradient.addColorStop(0, "rgba(160, 28, 18, 0)");
    gradient.addColorStop(0.62, `rgba(160, 28, 18, ${intensity * 0.18})`);
    gradient.addColorStop(1, `rgba(178, 25, 13, ${intensity})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, viewportWidth, viewportHeight);
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
