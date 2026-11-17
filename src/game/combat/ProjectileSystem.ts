import type { Vec2 } from "../core/types";
import {
  segmentAabbHit,
  segmentCircleHit,
  type CollisionWorld,
} from "../world/Collision";
import {
  applyDamage,
  type Damageable,
  type Team,
} from "./Damage";

export interface ProjectileSpawn {
  x: number;
  y: number;
  angle: number;
  speed: number;
  life: number;
  radius: number;
  damage: number;
  pierce: number;
  weaponId: string;
  ownerTeam: Team;
  color: string;
  coreColor: string;
}

export interface ProjectileImpact {
  kind: "wall" | "target";
  x: number;
  y: number;
  weaponId: string;
  direction: Vec2;
  color: string;
  coreColor: string;
  targetId?: string;
  damageApplied?: number;
  armorAbsorbed?: number;
  remainingArmor?: number;
  killed?: boolean;
}

interface Projectile {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  damage: number;
  remainingLife: number;
  remainingPierces: number;
  weaponId: string;
  ownerTeam: Team;
  color: string;
  coreColor: string;
  hitTargetIds: Set<string>;
}

type HitCandidate =
  | { kind: "wall"; time: number }
  | { kind: "target"; time: number; target: Damageable };

const DEFAULT_CAPACITY = 160;

export class ProjectileSystem {
  private readonly pool: Projectile[] = [];
  private active = 0;

  constructor(private readonly capacity = DEFAULT_CAPACITY) {}

  get activeCount(): number {
    return this.active;
  }

  get maxProjectiles(): number {
    return this.capacity;
  }

  get allocatedCount(): number {
    return this.pool.length;
  }

  spawn(spec: ProjectileSpawn): boolean {
    if (
      this.active >= this.capacity ||
      !Number.isFinite(spec.speed) ||
      spec.speed <= 0 ||
      !Number.isFinite(spec.life) ||
      spec.life <= 0 ||
      !Number.isFinite(spec.radius) ||
      spec.radius < 0
    ) {
      return false;
    }

    const projectile = this.pool[this.active] ?? this.createProjectile();
    projectile.x = spec.x;
    projectile.y = spec.y;
    projectile.previousX = spec.x;
    projectile.previousY = spec.y;
    projectile.velocityX = Math.cos(spec.angle) * spec.speed;
    projectile.velocityY = Math.sin(spec.angle) * spec.speed;
    projectile.radius = spec.radius;
    projectile.damage = spec.damage;
    projectile.remainingLife = spec.life;
    projectile.remainingPierces = Math.max(0, Math.floor(spec.pierce));
    projectile.weaponId = spec.weaponId;
    projectile.ownerTeam = spec.ownerTeam;
    projectile.color = spec.color;
    projectile.coreColor = spec.coreColor;
    projectile.hitTargetIds.clear();
    this.active += 1;

    return true;
  }

  update(
    deltaSeconds: number,
    world: CollisionWorld,
    targets: readonly Damageable[],
  ): ProjectileImpact[] {
    const impacts: ProjectileImpact[] = [];

    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return impacts;
    }

    let index = 0;

    while (index < this.active) {
      const projectile = this.pool[index];
      projectile.previousX = projectile.x;
      projectile.previousY = projectile.y;

      if (
        this.advanceProjectile(
          projectile,
          deltaSeconds,
          world,
          targets,
          impacts,
        )
      ) {
        index += 1;
      } else {
        this.removeActive(index);
      }
    }

    return impacts;
  }

  forEachActive(callback: (projectile: Readonly<Projectile>) => void): void {
    for (let index = 0; index < this.active; index += 1) {
      callback(this.pool[index]);
    }
  }

  clear(): void {
    this.active = 0;
  }

  private advanceProjectile(
    projectile: Projectile,
    deltaSeconds: number,
    world: CollisionWorld,
    targets: readonly Damageable[],
    impacts: ProjectileImpact[],
  ): boolean {
    const speed = Math.hypot(projectile.velocityX, projectile.velocityY);

    if (speed < 1e-6) {
      return false;
    }

    const directionX = projectile.velocityX / speed;
    const directionY = projectile.velocityY / speed;
    let travel = speed * deltaSeconds;
    let startX = projectile.x;
    let startY = projectile.y;
    let iterations = 0;

    while (travel > 1e-5 && iterations < 8) {
      iterations += 1;
      const endX = startX + directionX * travel;
      const endY = startY + directionY * travel;
      const start = { x: startX, y: startY };
      const end = { x: endX, y: endY };
      const hit = this.findNearestHit(
        projectile,
        start,
        end,
        world,
        targets,
      );

      if (!hit) {
        projectile.x = endX;
        projectile.y = endY;
        break;
      }

      const hitX = startX + (endX - startX) * hit.time;
      const hitY = startY + (endY - startY) * hit.time;
      projectile.x = hitX;
      projectile.y = hitY;

      if (hit.kind === "wall") {
        impacts.push({
          kind: "wall",
          x: hitX,
          y: hitY,
          weaponId: projectile.weaponId,
          direction: { x: directionX, y: directionY },
          color: projectile.color,
          coreColor: projectile.coreColor,
        });
        return false;
      }

      projectile.hitTargetIds.add(hit.target.id);
      const damage = applyDamage(hit.target, projectile.damage, {
        weaponId: projectile.weaponId,
        direction: { x: directionX, y: directionY },
      });

      impacts.push({
        kind: "target",
        x: hitX,
        y: hitY,
        weaponId: projectile.weaponId,
        direction: { x: directionX, y: directionY },
        color: projectile.color,
        coreColor: projectile.coreColor,
        targetId: hit.target.id,
        damageApplied: damage.applied,
        armorAbsorbed: damage.armorAbsorbed,
        remainingArmor: damage.remainingArmor,
        killed: damage.killed,
      });

      if (projectile.remainingPierces <= 0) {
        return false;
      }

      projectile.remainingPierces -= 1;
      travel *= 1 - hit.time;
      startX = hitX;
      startY = hitY;
    }

    projectile.remainingLife -= deltaSeconds;

    if (projectile.remainingLife <= 0) {
      return false;
    }

    return !this.isOutsideWorld(projectile, world);
  }

  private findNearestHit(
    projectile: Projectile,
    start: Vec2,
    end: Vec2,
    world: CollisionWorld,
    targets: readonly Damageable[],
  ): HitCandidate | null {
    let nearest: HitCandidate | null = null;

    for (const obstacle of world.obstacles) {
      const time = segmentAabbHit(
        start,
        end,
        obstacle,
        projectile.radius,
      );

      if (time !== null && (!nearest || time < nearest.time)) {
        nearest = { kind: "wall", time };
      }
    }

    for (const target of targets) {
      if (
        !target.alive ||
        target.team === projectile.ownerTeam ||
        projectile.hitTargetIds.has(target.id)
      ) {
        continue;
      }

      const time = segmentCircleHit(
        start,
        end,
        { x: target.x, y: target.y },
        target.radius + projectile.radius,
      );

      if (time !== null && (!nearest || time < nearest.time)) {
        nearest = { kind: "target", time, target };
      }
    }

    return nearest;
  }

  private isOutsideWorld(
    projectile: Projectile,
    world: CollisionWorld,
  ): boolean {
    const margin = projectile.radius;

    return (
      projectile.x < -margin ||
      projectile.y < -margin ||
      projectile.x > world.width + margin ||
      projectile.y > world.height + margin
    );
  }

  private removeActive(index: number): void {
    const lastIndex = this.active - 1;

    if (index !== lastIndex) {
      const last = this.pool[lastIndex];
      this.pool[lastIndex] = this.pool[index];
      this.pool[index] = last;
    }

    this.active -= 1;
  }

  private createProjectile(): Projectile {
    const projectile: Projectile = {
      x: 0,
      y: 0,
      previousX: 0,
      previousY: 0,
      velocityX: 0,
      velocityY: 0,
      radius: 0,
      damage: 0,
      remainingLife: 0,
      remainingPierces: 0,
      weaponId: "",
      ownerTeam: "player",
      color: "#67f5cf",
      coreColor: "#e9fff8",
      hitTargetIds: new Set<string>(),
    };

    this.pool.push(projectile);

    return projectile;
  }
}

export type ActiveProjectile = Readonly<Projectile>;
