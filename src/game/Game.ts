import { CombatSfx } from "./audio/CombatSfx";
import { CombatSystem } from "./combat/CombatSystem";
import { applyDamage, type Damageable } from "./combat/Damage";
import { ProjectileSystem } from "./combat/ProjectileSystem";
import { GAME_IDENTITY } from "./content";
import { EventBus } from "./core/EventBus";
import {
  FixedStepLoop,
  browserFrameScheduler,
  type FrameScheduler,
} from "./core/Loop";
import {
  DEFAULT_GAME_CONFIG,
  type GameConfig,
  type GamePhase,
  type Vec2,
} from "./core/types";
import type { Creature, CreatureAttackIntent } from "./entities/Creature";
import { Player } from "./entities/Player";
import {
  createTrainingDummies,
  type TargetDummy,
} from "./entities/TargetDummy";
import {
  InputRouter,
  type InputAction,
  type PointerState,
} from "./input/InputRouter";
import { Camera } from "./render/Camera";
import { ImpactEffects } from "./render/effects";
import { Renderer } from "./render/Renderer";
import { SpawnDirector } from "./systems/SpawnDirector";
import { SnapshotStore } from "./ui/UiSnapshot";
import { SpatialHash } from "./world/SpatialHash";
import { createGreenreachMap } from "./content/maps/greenreach";
import { loadMap } from "./world/MapLoader";
import type { LoadedWorld } from "./world/MapDef";

type GameEvents = {
  "game:phase-changed": {
    from: GamePhase;
    to: GamePhase;
  };
  "combat:weapon-fired": {
    weaponId: string;
    x: number;
    y: number;
    projectiles: number;
  };
  "combat:target-hit": {
    targetId: string;
    weaponId: string;
    damage: number;
    killed: boolean;
    x: number;
    y: number;
  };
  "combat:player-hit": {
    sourceId: string;
    damage: number;
    health: number;
    killed: boolean;
  };
  "combat:creature-killed": {
    creatureId: string;
    archetypeId: string;
    x: number;
    y: number;
  };
};

export interface GameOptions {
  config?: Partial<GameConfig>;
  scheduler?: FrameScheduler;
  snapshotStore?: SnapshotStore;
}

export class Game {
  readonly snapshots: SnapshotStore;

  private readonly config: GameConfig;
  private readonly scheduler: FrameScheduler;
  private readonly camera: Camera;
  private readonly renderer: Renderer;
  private readonly input: InputRouter;
  private readonly loop: FixedStepLoop;
  private readonly world: LoadedWorld;
  private readonly player: Player;
  private readonly combat: CombatSystem;
  private readonly projectiles: ProjectileSystem;
  private readonly spawnDirector: SpawnDirector;
  private readonly spatialHash = new SpatialHash<Creature>(120);
  private readonly effects = new ImpactEffects();
  private readonly sfx = new CombatSfx();
  private readonly targets: readonly TargetDummy[];
  private readonly events = new EventBus<GameEvents>();
  private phase: GamePhase = "menu";
  private playerRespawnRemaining = 0;
  private frame = 0;
  private elapsed = 0;
  private visualTime = 0;
  private fps = 0;
  private interpolation = 0;
  private debug = false;
  private lastRenderAt = 0;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: GameOptions = {}) {
    this.config = {
      ...DEFAULT_GAME_CONFIG,
      ...options.config,
    };
    this.scheduler = options.scheduler ?? browserFrameScheduler;
    this.world = loadMap(createGreenreachMap());
    this.config.worldWidth = this.world.width;
    this.config.worldHeight = this.world.height;
    this.config.tileSize = this.world.tileSize;
    this.camera = new Camera(this.config);
    this.renderer = new Renderer(canvas, this.config, this.camera);
    this.snapshots =
      options.snapshotStore ??
      new SnapshotStore(undefined, this.config.snapshotIntervalMs);
    this.player = new Player(this.world.spawn);
    this.combat = new CombatSystem();
    this.projectiles = new ProjectileSystem();
    this.spawnDirector = new SpawnDirector(this.world.creatureSpawns);
    this.targets = createTrainingDummies(this.world.targets);
    this.camera.moveTo(this.player.x, this.player.y);
    this.input = new InputRouter(window, canvas, {
      onAction: this.handleAction,
      onBlur: this.handleBlur,
    });
    this.loop = new FixedStepLoop(this.scheduler, {
      fixedStep: this.config.fixedStep,
      maxCatchUpSteps: this.config.maxCatchUpSteps,
      maxFrameDelta: this.config.maxFrameDelta,
      onUpdate: this.update,
      onRender: this.render,
      onError: this.handleError,
    });

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.publish(true);
  }

  get currentPhase(): GamePhase {
    return this.phase;
  }

  get isDebug(): boolean {
    return this.debug;
  }

  start(): void {
    if (this.destroyed) {
      return;
    }

    this.input.attach();
    this.loop.start(this.scheduler.now());
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.loop.stop();
    this.input.detach();
    this.renderer.destroy();
    this.sfx.dispose();
    this.events.clear();
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
  }

  enterPreview(): void {
    if (this.phase === "playing") {
      return;
    }

    if (this.phase === "menu") {
      this.resetRun();
    }

    this.setPhase("playing");
  }

  pause(): void {
    if (this.phase !== "playing") {
      return;
    }

    this.setPhase("paused");
  }

  resume(): void {
    if (this.phase !== "paused") {
      return;
    }

    this.setPhase("playing");
  }

  returnToMenu(): void {
    if (this.phase === "menu") {
      return;
    }

    this.resetRun();
    this.setPhase("menu");
  }

  toggleDebug(): void {
    this.debug = !this.debug;
    this.publish(true);
  }

  private resetRun(): void {
    this.player.reset(this.world.spawn);
    this.camera.moveTo(this.player.x, this.player.y);
    this.combat.reset();
    this.projectiles.clear();
    this.spawnDirector.reset(this.world);
    this.effects.clear();
    this.playerRespawnRemaining = 0;

    for (const target of this.targets) {
      target.reset();
    }

    this.elapsed = 0;
    this.frame = 0;
    this.interpolation = 0;
  }

  private readonly handleAction = (action: InputAction): void => {
    switch (action) {
      case "start":
        if (this.phase === "menu") {
          this.enterPreview();
        } else if (this.phase === "paused") {
          this.resume();
        }
        break;
      case "pause":
        if (this.phase === "playing") {
          this.pause();
        } else if (this.phase === "paused") {
          this.resume();
        }
        break;
      case "toggleDebug":
        this.toggleDebug();
        break;
      case "dodge":
        if (this.phase === "menu") {
          this.enterPreview();
        } else if (this.phase === "paused") {
          this.resume();
        } else if (
          this.player.requestDodge(this.input.getMovementIntent())
        ) {
          this.publish(true);
        }
        break;
      case "weapon1":
        this.selectWeapon(0);
        break;
      case "weapon2":
        this.selectWeapon(1);
        break;
      case "weapon3":
        this.selectWeapon(2);
        break;
    }
  };

  private selectWeapon(index: number): void {
    if (this.phase === "menu") {
      return;
    }

    if (this.combat.selectWeapon(index)) {
      this.publish(true);
    }
  }

  private readonly update = (stepSeconds: number): void => {
    if (this.phase !== "playing") {
      return;
    }

    this.elapsed += stepSeconds;
    this.frame += 1;

    const pointer = this.input.getPointer();
    const aim = this.getAimWorld(pointer);

    if (!this.player.alive) {
      if (this.playerRespawnRemaining <= 0) {
        this.playerRespawnRemaining = 1.6;
      }

      this.playerRespawnRemaining = Math.max(
        0,
        this.playerRespawnRemaining - stepSeconds,
      );
      this.player.update(
        stepSeconds,
        this.input.getMovementIntent(),
        this.input.isSprinting(),
        this.world,
        aim,
      );

      if (this.playerRespawnRemaining <= 0) {
        this.player.reset(this.world.spawn);
        this.camera.moveTo(this.player.x, this.player.y);
        this.effects.spawnImpact(
          this.player.x,
          this.player.y,
          "#75f5cb",
          "#e9fff8",
          14,
        );
      }
    } else {
      this.player.update(
        stepSeconds,
        this.input.getMovementIntent(),
        this.input.isSprinting(),
        this.world,
        aim,
      );
    }

    if (this.player.alive) {
      const muzzle = this.getMuzzlePosition(aim);
      const shot = this.combat.update(stepSeconds, {
        firing: this.input.isFiring(),
        origin: muzzle,
        aim,
      });

      if (shot) {
        for (const spawn of shot.spawns) {
          this.projectiles.spawn({
            ...spawn,
            x: muzzle.x,
            y: muzzle.y,
            ownerTeam: "player",
          });
        }

        this.effects.spawnMuzzle(
          muzzle.x,
          muzzle.y,
          shot.spawns[0]?.angle ?? this.player.facingAngle,
          shot.weapon.projectile.color,
          shot.weapon.projectile.coreColor,
        );
        this.events.emit("combat:weapon-fired", {
          weaponId: shot.weapon.id,
          x: muzzle.x,
          y: muzzle.y,
          projectiles: shot.spawns.length,
        });
        this.sfx.shoot(shot.weapon.category);
      }
    }

    for (const target of this.targets) {
      target.update(stepSeconds);
    }

    this.updateCreatures(stepSeconds);

    const impacts = this.projectiles.update(
      stepSeconds,
      this.world,
      this.collectDamageTargets(),
    );

    for (const impact of impacts) {
      const creature =
        impact.kind === "target" && impact.targetId
          ? this.findCreature(impact.targetId)
          : null;
      const killed = impact.killed ?? false;

      this.effects.spawnImpact(
        impact.x,
        impact.y,
        impact.color,
        impact.coreColor,
        impact.kind === "target" ? (creature && killed ? 16 : 10) : 6,
      );

      if (impact.kind !== "target" || !impact.targetId) {
        continue;
      }

      if (impact.targetId === this.player.id) {
        if ((impact.damageApplied ?? 0) > 0) {
          this.events.emit("combat:player-hit", {
            sourceId: impact.weaponId,
            damage: impact.damageApplied ?? 0,
            health: this.player.health,
            killed,
          });
          this.sfx.playerHit();
        }

        if (killed) {
          this.playerRespawnRemaining = 1.6;
        }

        continue;
      }

      this.events.emit("combat:target-hit", {
        targetId: impact.targetId,
        weaponId: impact.weaponId,
        damage: impact.damageApplied ?? 0,
        killed,
        x: impact.x,
        y: impact.y,
      });

      if (creature && killed) {
        this.events.emit("combat:creature-killed", {
          creatureId: creature.id,
          archetypeId: creature.archetype.id,
          x: creature.x,
          y: creature.y,
        });
        this.sfx.creatureDeath();
      } else {
        this.sfx.hit(killed);
      }
    }

    this.spawnDirector.update(stepSeconds, this.world);
    this.effects.update(stepSeconds);
  };

  private updateCreatures(deltaSeconds: number): void {
    const creatures = this.spawnDirector.creatures;

    this.spatialHash.clear();

    for (const creature of creatures) {
      if (creature.alive) {
        this.spatialHash.insert(creature);
      }
    }

    for (const creature of creatures) {
      if (!creature.alive) {
        continue;
      }

      const allies = this.spatialHash
        .query(creature.x, creature.y, 140)
        .filter((ally) => ally !== creature);
      const attack = creature.update(deltaSeconds, {
        world: this.world,
        target: this.player.alive ? this.player : null,
        allies,
        time: this.elapsed,
      });

      if (attack) {
        this.handleCreatureAttack(attack);
      }
    }
  }

  private handleCreatureAttack(attack: CreatureAttackIntent): void {
    if (attack.kind === "melee") {
      if (!this.player.alive) {
        return;
      }

      const distance = Math.hypot(
        this.player.x - attack.x,
        this.player.y - attack.y,
      );

      if (distance > attack.range + this.player.radius * 0.35) {
        return;
      }

      const hit = applyDamage(this.player, attack.damage, {
        sourceId: attack.creatureId,
        weaponId: `${attack.archetypeId}-melee`,
        direction: attack.direction,
      });

      if (hit.applied <= 0) {
        return;
      }

      this.effects.spawnImpact(
        this.player.x,
        this.player.y,
        "#ff8b73",
        "#fff0ec",
        8,
      );
      this.sfx.enemyAttack("melee");
      this.events.emit("combat:player-hit", {
        sourceId: attack.creatureId,
        damage: hit.applied,
        health: hit.remainingHealth,
        killed: hit.killed,
      });

      if (hit.killed) {
        this.playerRespawnRemaining = 1.6;
      }

      return;
    }

    const projectile = attack.projectile;

    if (!projectile) {
      return;
    }

    const offset = 24;
    const spawned = this.projectiles.spawn({
      x: attack.x + Math.cos(attack.angle) * offset,
      y: attack.y + Math.sin(attack.angle) * offset,
      angle: attack.angle,
      speed: projectile.speed,
      life: projectile.life,
      radius: projectile.radius,
      damage: projectile.damage,
      pierce: 0,
      weaponId: `${attack.archetypeId}-spit`,
      ownerTeam: "hostile",
      color: projectile.color,
      coreColor: projectile.coreColor,
    });

    if (!spawned) {
      return;
    }

    this.effects.spawnMuzzle(
      attack.x + Math.cos(attack.angle) * offset,
      attack.y + Math.sin(attack.angle) * offset,
      attack.angle,
      projectile.color,
      projectile.coreColor,
    );
    this.sfx.enemyAttack("projectile");
  }

  private collectDamageTargets(): Damageable[] {
    return [
      this.player,
      ...this.spawnDirector.creatures,
      ...this.targets,
    ];
  }

  private findCreature(id: string): Creature | null {
    for (const creature of this.spawnDirector.creatures) {
      if (creature.id === id) {
        return creature;
      }
    }

    return null;
  }

  private readonly render = (interpolation: number): void => {
    const now = this.scheduler.now();
    const deltaSeconds =
      this.lastRenderAt === 0 ? 0 : (now - this.lastRenderAt) / 1000;
    this.lastRenderAt = now;

    if (deltaSeconds > 0 && deltaSeconds < 1) {
      const instantFps = 1 / deltaSeconds;
      this.fps =
        this.fps === 0 ? instantFps : this.fps * 0.9 + instantFps * 0.1;
    }

    if (deltaSeconds > 0) {
      this.visualTime += Math.min(deltaSeconds, this.config.maxFrameDelta);
    }

    const pointer = this.input.getPointer();
    const playerPosition = this.player.getRenderPosition(interpolation);
    let aim = this.getAimWorld(pointer);

    if (this.phase === "playing") {
      const lookAhead = aim
        ? {
            x: aim.x - playerPosition.x,
            y: aim.y - playerPosition.y,
          }
        : undefined;

      this.camera.follow(
        playerPosition,
        Math.min(deltaSeconds, this.config.maxFrameDelta),
        {
          deadzone: 30,
          smoothing: 9,
          lookAhead,
          maxLookAhead: 90,
        },
      );
      aim = this.getAimWorld(pointer);
    }

    const creatures = this.spawnDirector.creatures;

    this.interpolation = interpolation;
    this.renderer.render({
      timeSeconds: this.visualTime,
      debug: this.debug,
      world: this.world,
      player: this.player.getRenderState(interpolation),
      aim,
      projectiles: this.projectiles,
      targets: this.targets,
      creatures,
      creatureStates: creatures.map((creature) =>
        creature.getRenderState(interpolation),
      ),
      effects: this.effects,
      combat: {
        weaponName: this.combat.currentWeapon.name,
        energy: this.combat.currentEnergy,
        maxEnergy: this.combat.maxEnergy,
        cooldown: this.combat.currentCooldownRemaining,
        projectileCount: this.projectiles.activeCount,
        targetsAlive: this.countAliveTargets(),
        targetsTotal: this.targets.length,
        enemiesAlive: this.spawnDirector.aliveCount,
        enemiesTotal: this.spawnDirector.maxAlive,
        kills: this.spawnDirector.defeatedCount,
        playerHealth: this.player.health,
        playerMaxHealth: this.player.maxHealth,
      },
    });
    this.publish();
  };

  private getAimWorld(pointer: PointerState): Vec2 | null {
    if (!pointer.inside) {
      return null;
    }

    return this.camera.screenToWorld({
      x: pointer.normalizedX * this.config.viewportWidth,
      y: pointer.normalizedY * this.config.viewportHeight,
    });
  }

  private getMuzzlePosition(aim: Vec2 | null): Vec2 {
    const angle = aim
      ? Math.atan2(aim.y - this.player.y, aim.x - this.player.x)
      : this.player.facingAngle;
    const distance = this.player.radius + 8;

    return {
      x: this.player.x + Math.cos(angle) * distance,
      y: this.player.y + Math.sin(angle) * distance,
    };
  }

  private countAliveTargets(): number {
    let alive = 0;

    for (const target of this.targets) {
      if (target.alive) {
        alive += 1;
      }
    }

    return alive;
  }

  private setPhase(nextPhase: GamePhase): void {
    if (this.phase === nextPhase) {
      return;
    }

    const previousPhase = this.phase;
    this.phase = nextPhase;
    this.events.emit("game:phase-changed", {
      from: previousPhase,
      to: nextPhase,
    });
    this.publish(true);
  }

  private publish(force = false): void {
    this.snapshots.update(
      {
        phase: this.phase,
        title: GAME_IDENTITY.wordmark,
        kicker: GAME_IDENTITY.kicker,
        stage: GAME_IDENTITY.stage,
        version: GAME_IDENTITY.version,
        region: GAME_IDENTITY.firstRegion,
        world: {
          width: this.world.width,
          height: this.world.height,
        },
        camera: {
          x: this.camera.x,
          y: this.camera.y,
          viewportWidth: this.camera.width,
          viewportHeight: this.camera.height,
        },
        player: {
          x: this.player.x,
          y: this.player.y,
          facing: this.player.facingAngle,
          speed: this.player.speed,
          stamina: this.player.currentStamina,
          maxStamina: this.player.maxStamina,
          sprinting: this.player.isSprinting,
          dodging: this.player.isDodging,
          invulnerable: this.player.isInvulnerable,
          dodgeCooldown: this.player.dodgeCooldownRemaining,
          dodgeCooldownMax: this.player.dodgeCooldownMax,
          health: this.player.health,
          maxHealth: this.player.maxHealth,
          alive: this.player.alive,
          respawnRemaining: this.playerRespawnRemaining,
        },
        combat: {
          weaponId: this.combat.currentWeapon.id,
          weaponName: this.combat.currentWeapon.name,
          weaponSlot: this.combat.currentWeapon.slot,
          weaponCount: this.combat.availableWeapons.length,
          energy: this.combat.currentEnergy,
          maxEnergy: this.combat.maxEnergy,
          energyCost: this.combat.currentWeapon.energyCost,
          cooldown: this.combat.currentCooldownRemaining,
          cooldownMax: this.combat.currentCooldownMax,
          ready: this.combat.isReady,
          projectilesActive: this.projectiles.activeCount,
          projectilesMax: this.projectiles.maxProjectiles,
          targetsAlive: this.countAliveTargets(),
          targetsTotal: this.targets.length,
          enemiesAlive: this.spawnDirector.aliveCount,
          enemiesTotal: this.spawnDirector.maxAlive,
          kills: this.spawnDirector.defeatedCount,
          weapons: this.combat.availableWeapons.map((weapon) => ({
            id: weapon.id,
            name: weapon.name,
            slot: weapon.slot,
            energyCost: weapon.energyCost,
            selected: weapon.id === this.combat.currentWeapon.id,
          })),
        },
        frame: this.frame,
        elapsed: this.elapsed,
        fps: this.fps,
        interpolation: this.interpolation,
        debug: this.debug,
      },
      this.scheduler.now(),
      force,
    );
  }

  private readonly handleBlur = (): void => {
    if (this.phase === "playing") {
      this.pause();
    }
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.handleBlur();
    }
  };

  private readonly handleError = (error: unknown): void => {
    console.error("[MonsterFrontier] frame error", error);
  };
}
