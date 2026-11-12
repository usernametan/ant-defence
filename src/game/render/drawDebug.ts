import type { GameConfig, Vec2 } from "../core/types";
import type { Creature } from "../entities/Creature";
import type { PlayerRenderState } from "../entities/Player";
import type { TargetDummy } from "../entities/TargetDummy";
import type { TestArena } from "../world/TestArena";
import type { Camera } from "./Camera";

export interface DebugCombatState {
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

export interface DebugRenderState {
  camera: Camera;
  config: GameConfig;
  arena: TestArena;
  player: PlayerRenderState;
  aim: Vec2 | null;
  targets?: readonly TargetDummy[];
  creatures?: readonly Creature[];
  combat?: DebugCombatState;
}

export function drawWorldDebug(
  context: CanvasRenderingContext2D,
  state: DebugRenderState,
): void {
  const { player, aim, arena, targets = [], creatures = [] } = state;

  context.save();
  context.strokeStyle = "rgba(247, 191, 91, 0.82)";
  context.lineWidth = 1;
  context.setLineDash([5, 4]);

  for (const obstacle of arena.obstacles) {
    context.strokeRect(
      obstacle.x + 0.5,
      obstacle.y + 0.5,
      obstacle.width - 1,
      obstacle.height - 1,
    );
  }

  context.setLineDash([3, 3]);
  context.strokeStyle = "rgba(159, 211, 255, 0.62)";

  for (const target of targets) {
    context.beginPath();
    context.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    context.stroke();
  }

  context.setLineDash([2, 4]);
  context.font = "500 9px 'IBM Plex Mono', monospace";
  context.textAlign = "center";

  for (const creature of creatures) {
    if (!creature.alive) {
      continue;
    }

    context.strokeStyle = "rgba(255, 113, 92, 0.72)";
    context.beginPath();
    context.arc(creature.x, creature.y, creature.radius, 0, Math.PI * 2);
    context.stroke();

    context.strokeStyle = "rgba(255, 191, 105, 0.24)";
    context.beginPath();
    context.arc(
      creature.x,
      creature.y,
      creature.archetype.attack.range,
      0,
      Math.PI * 2,
    );
    context.stroke();

    context.fillStyle = "rgba(255, 191, 105, 0.88)";
    context.fillText(
      `${creature.state.toUpperCase()} ${Math.ceil(creature.health)}`,
      creature.x,
      creature.y - creature.radius - 19,
    );
  }

  context.setLineDash([]);
  context.strokeStyle = "rgba(117, 245, 203, 0.9)";
  context.beginPath();
  context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  context.stroke();

  context.setLineDash([]);
  context.strokeStyle = "rgba(247, 191, 91, 0.9)";
  context.beginPath();
  context.moveTo(player.x, player.y);
  context.lineTo(
    player.x + Math.cos(player.facing) * (player.radius + 30),
    player.y + Math.sin(player.facing) * (player.radius + 30),
  );
  context.stroke();

  context.strokeStyle = "rgba(159, 211, 255, 0.8)";
  context.beginPath();
  context.moveTo(player.x, player.y);
  context.lineTo(
    player.x + player.velocityX * 0.16,
    player.y + player.velocityY * 0.16,
  );
  context.stroke();

  if (aim) {
    context.setLineDash([2, 5]);
    context.strokeStyle = "rgba(226, 255, 245, 0.44)";
    context.beginPath();
    context.moveTo(player.x, player.y);
    context.lineTo(aim.x, aim.y);
    context.stroke();
    context.setLineDash([]);
  }

  context.fillStyle = "rgba(247, 191, 91, 0.9)";
  context.font = "500 10px 'IBM Plex Mono', monospace";
  context.textAlign = "center";
  context.fillText("PLAYER", player.x, player.y - player.radius - 12);

  context.restore();
}

export function drawDebugOverlay(
  context: CanvasRenderingContext2D,
  state: DebugRenderState,
): void {
  const { camera, config, arena, player, aim, combat } = state;
  const lines = [
    `CAM ${Math.round(camera.x)} / ${Math.round(camera.y)}`,
    `PLAYER ${Math.round(player.x)} / ${Math.round(player.y)}`,
    `VEL ${Math.hypot(player.velocityX, player.velocityY).toFixed(0)}`,
    `DODGE ${player.dodgeCooldown.toFixed(2)}s`,
    `STAMINA ${player.stamina.toFixed(0)} / ${player.maxStamina}`,
    `HEALTH ${player.health.toFixed(0)} / ${player.maxHealth}`,
    `AIM ${aim ? `${Math.round(aim.x)} / ${Math.round(aim.y)}` : "outside"}`,
  ];

  if (combat) {
    lines.push(
      `WEAPON ${combat.weaponName.toUpperCase()}`,
      `ENERGY ${combat.energy.toFixed(0)} / ${combat.maxEnergy}`,
      `COOLDOWN ${combat.cooldown.toFixed(2)}s`,
      `PROJECTILES ${combat.projectileCount}`,
      `TARGETS ${combat.targetsAlive} / ${combat.targetsTotal}`,
      `ENEMIES ${combat.enemiesAlive} / ${combat.enemiesTotal}`,
      `KILLS ${combat.kills}`,
    );
  }

  lines.push(
    `ARENA ${arena.width} x ${arena.height} / ${arena.obstacles.length} solids`,
    `WORLD ${config.worldWidth} x ${config.worldHeight}`,
  );
  const panelWidth = 318;
  const panelHeight = 26 + lines.length * 18;

  context.save();
  context.fillStyle = "rgba(4, 14, 12, 0.82)";
  context.fillRect(18, 18, panelWidth, panelHeight);
  context.strokeStyle = "rgba(247, 191, 91, 0.48)";
  context.lineWidth = 1;
  context.strokeRect(18.5, 18.5, panelWidth - 1, panelHeight - 1);

  context.fillStyle = "rgba(226, 255, 245, 0.88)";
  context.font = "500 11px 'IBM Plex Mono', monospace";
  context.textAlign = "left";

  lines.forEach((line, index) => {
    context.fillText(line, 32, 40 + index * 18);
  });

  context.strokeStyle = "rgba(117, 245, 203, 0.42)";
  context.setLineDash([6, 5]);
  context.strokeRect(
    12.5,
    12.5,
    config.viewportWidth - 25,
    config.viewportHeight - 25,
  );
  context.setLineDash([]);
  context.restore();
}
