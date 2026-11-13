import { CombatSfx } from "./audio/CombatSfx";
import { CombatSystem } from "./combat/CombatSystem";
import { applyDamage, type Damageable } from "./combat/Damage";
import { ProjectileSystem } from "./combat/ProjectileSystem";
import { GAME_IDENTITY } from "./content";
import { getEquipmentDef, type EquipmentSlot } from "./content/upgrades";
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
import {
  InventorySystem,
  type InventoryAcquireResult,
  type InventoryItemKind,
} from "./systems/InventorySystem";
import { ItemPickupSystem } from "./systems/ItemPickupSystem";
import { MissionSystem } from "./systems/MissionSystem";
import { PickupSystem } from "./systems/PickupSystem";
import { SpawnDirector } from "./systems/SpawnDirector";
import {
  SnapshotStore,
  type SurvivalNoticeTone,
} from "./ui/UiSnapshot";
import { SpatialHash } from "./world/SpatialHash";
import { TriggerSystem } from "./world/Triggers";
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
  private readonly inventory: InventorySystem;
  private readonly combat: CombatSystem;
  private readonly projectiles: ProjectileSystem;
  private readonly spawnDirector: SpawnDirector;
  private readonly pickups: PickupSystem;
  private readonly worldItems: ItemPickupSystem;
  private readonly triggers: TriggerSystem;
  private readonly missions: MissionSystem;
  private readonly spatialHash = new SpatialHash<Creature>(120);
  private readonly effects = new ImpactEffects();
  private readonly sfx = new CombatSfx();
  private readonly targets: readonly TargetDummy[];
  private readonly events = new EventBus<GameEvents>();
  private phase: GamePhase = "menu";
  private playerRespawnRemaining = 0;
  private feedbackText = "";
  private feedbackTone: SurvivalNoticeTone = "health";
  private feedbackRemaining = 0;
  private frame = 0;
  private elapsed = 0;
  private visualTime = 0;
  private fps = 0;
  private interpolation = 0;
  private debug = false;
  private inventoryOpen = false;
  private fireFeedbackCooldown = 0;
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
    this.inventory = new InventorySystem();
    this.combat = new CombatSystem();
    this.projectiles = new ProjectileSystem();
    this.spawnDirector = new SpawnDirector(this.world.creatureSpawns);
    this.pickups = new PickupSystem(this.world.pickups);
    this.worldItems = new ItemPickupSystem(this.world.items);
    this.triggers = new TriggerSystem(
      this.world.pointsOfInterest,
      this.world.interactables,
    );
    this.missions = new MissionSystem(undefined, {
      pointsOfInterest: this.world.pointsOfInterest,
      interactables: this.world.interactables,
    });
    this.targets = createTrainingDummies(this.world.targets);
    this.applyInventoryModifiers();
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
    if (this.phase === "playing" || this.phase === "victory") {
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

    this.inventoryOpen = false;
    this.setPhase("paused");
  }

  resume(): void {
    if (this.phase !== "paused") {
      return;
    }

    this.setPhase("playing");
  }

  restartMission(): void {
    if (this.phase !== "victory") {
      return;
    }

    this.resetRun();
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

  toggleInventory(): void {
    if (this.phase !== "playing") {
      return;
    }

    this.inventoryOpen = !this.inventoryOpen;
    this.publish(true);
  }

  equipInventoryItem(itemId: string): boolean {
    if (this.phase === "menu" || !this.inventory.equip(itemId)) {
      return false;
    }

    this.applyInventoryModifiers();
    this.showFeedback(
      `${this.itemLabel("equipment", itemId).toUpperCase()} · EQUIPPED`,
      "module",
      1.6,
    );
    this.sfx.equip();

    return true;
  }

  unequipInventorySlot(slot: EquipmentSlot): boolean {
    if (this.phase === "menu" || !this.inventory.unequip(slot)) {
      return false;
    }

    this.applyInventoryModifiers();
    this.showFeedback("MODULE RELEASED · EFFECT OFFLINE", "module", 1.4);
    this.sfx.equip();

    return true;
  }

  private resetRun(): void {
    this.inventory.reset();
    this.player.reset(this.world.spawn);
    this.applyInventoryModifiers();
    this.camera.moveTo(this.player.x, this.player.y);
    this.combat.reset();
    this.projectiles.clear();
    this.spawnDirector.reset(this.world);
    this.pickups.reset();
    this.worldItems.reset();
    this.triggers.reset();
    this.missions.reset();
    this.missions.drainEvents();
    this.effects.clear();
    this.playerRespawnRemaining = 0;
    this.feedbackText = "";
    this.feedbackRemaining = 0;
    this.inventoryOpen = false;
    this.fireFeedbackCooldown = 0;

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
        } else if (this.phase === "victory") {
          this.restartMission();
        }
        break;
      case "pause":
        if (this.phase === "playing" && this.inventoryOpen) {
          this.inventoryOpen = false;
          this.publish(true);
        } else if (this.phase === "playing") {
          this.pause();
        } else if (this.phase === "paused") {
          this.resume();
        }
        break;
      case "toggleDebug":
        this.toggleDebug();
        break;
      case "interact":
        this.handleInteract();
        break;
      case "inventory":
        this.toggleInventory();
        break;
      case "dodge":
        if (this.phase === "menu") {
          this.enterPreview();
        } else if (this.phase === "paused") {
          this.resume();
        } else if (
          this.phase === "playing" &&
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
    if (this.phase === "menu" || this.phase === "victory") {
      return;
    }

    const weapon = this.inventory.getWeaponBySlot(index);
    const combatIndex = weapon
      ? this.combat.availableWeapons.findIndex(
          (entry) => entry.id === weapon.id,
        )
      : -1;

    if (!weapon || combatIndex < 0) {
      this.showFeedback(
        `WEAPON SLOT ${index + 1} OFFLINE · FIND A MODULE`,
        "energy",
        1.4,
      );
      this.sfx.denied();
      return;
    }

    if (this.combat.selectWeapon(combatIndex)) {
      this.showFeedback(
        `${index + 1} · ${weapon.name.toUpperCase()}`,
        "energy",
        0.9,
      );
      this.sfx.weaponSwitch();
      this.publish(true);
    }
  }

  private readonly update = (stepSeconds: number): void => {
    if (this.phase !== "playing") {
      return;
    }

    if (this.inventoryOpen) {
      this.feedbackRemaining = Math.max(
        0,
        this.feedbackRemaining - stepSeconds,
      );

      if (this.feedbackRemaining === 0) {
        this.feedbackText = "";
      }

      return;
    }

    this.elapsed += stepSeconds;
    this.frame += 1;
    this.fireFeedbackCooldown = Math.max(
      0,
      this.fireFeedbackCooldown - stepSeconds,
    );
    this.feedbackRemaining = Math.max(
      0,
      this.feedbackRemaining - stepSeconds,
    );

    if (this.feedbackRemaining === 0) {
      this.feedbackText = "";
    }

    const pointer = this.input.getPointer();
    const aim = this.getAimWorld(pointer);

    if (!this.player.alive) {
      if (this.playerRespawnRemaining <= 0) {
        this.handlePlayerDeath();
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
        this.player.respawn(this.world.spawn);
        this.camera.moveTo(this.player.x, this.player.y);
        this.effects.spawnImpact(
          this.player.x,
          this.player.y,
          "#75f5cb",
          "#e9fff8",
          14,
        );
        this.sfx.pickup("health");
        this.showFeedback("WAYSTATION RELINK · SHIELD ACTIVE", "respawn", 2.2);
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
      this.updateTriggers();
    }

    this.pickups.update(stepSeconds);

    if (this.player.alive) {
      this.collectPickups();
      this.collectWorldItems();

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
      } else if (this.input.isFiring()) {
        this.handleFireFailure();
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
          this.showDamageFeedback(
            impact.damageApplied ?? 0,
            impact.armorAbsorbed ?? 0,
          );
        }

        if (killed) {
          this.handlePlayerDeath();
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
        this.missions.recordCreatureKill(
          creature.archetype.id,
          creature.x,
          creature.y,
        );
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
    this.processMissionEvents();
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
      this.showDamageFeedback(hit.applied, hit.armorAbsorbed ?? 0);

      if (hit.killed) {
        this.handlePlayerDeath();
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

  private collectPickups(): void {
    const collected = this.pickups.collect(this.player);

    for (const drop of collected) {
      const type = this.pickups.getType(drop.pickup.kind);

      this.missions.recordCollect(drop.pickup.kind);

      this.effects.spawnImpact(
        drop.pickup.x,
        drop.pickup.y,
        type.color,
        type.coreColor,
        12,
      );
      this.sfx.pickup(drop.pickup.kind);
      this.showFeedback(
        `${drop.pickup.kind === "health" ? "BIO RECOVERED" : "PLATING RESTORED"} +${Math.round(drop.restored)}`,
        drop.pickup.kind,
        1.5,
      );
    }
  }

  private collectWorldItems(): void {
    const results = new Map<string, InventoryAcquireResult>();
    const collected = this.worldItems.collect(this.player, (item) => {
      const result = this.inventory.acquire(item.kind, item.itemId);
      results.set(item.id, result);

      return result.status !== "invalid" && result.status !== "full";
    });

    if (collected.length === 0) {
      return;
    }

    let loadoutChanged = false;

    for (const item of collected) {
      const result = results.get(item.id);

      if (!result) {
        continue;
      }

      const type = this.worldItems.getType(item);
      const label = this.itemLabel(item.kind, item.itemId).toUpperCase();

      this.missions.recordCollect(item.itemId);

      this.effects.spawnImpact(
        item.x,
        item.y,
        type.color,
        type.coreColor,
        16,
      );

      if (result.status === "duplicate") {
        const armor = result.salvageArmor
          ? this.player.restoreArmor(result.salvageArmor)
          : 0;
        const energy = result.salvageEnergy
          ? this.combat.restoreEnergy(result.salvageEnergy)
          : 0;
        const salvage =
          armor > 0
            ? `+${Math.round(armor)} ARMOR`
            : energy > 0
              ? `+${Math.round(energy)} CELL`
              : "RECYCLED";

        this.sfx.item(item.kind);
        this.showFeedback(
          `${label} · DUPLICATE ${salvage}`,
          item.kind === "weapon" ? "energy" : "module",
          1.8,
        );
        continue;
      }

      loadoutChanged = true;
      this.sfx.item(item.kind);
      this.showFeedback(
        `${label} · ${result.status === "equipped" ? "EQUIPPED" : "STORED"} · I INVENTORY`,
        item.kind === "weapon" ? "energy" : "module",
        2.2,
      );
    }

    if (loadoutChanged) {
      this.applyInventoryModifiers();
    }
  }

  private handleInteract(): void {
    if (
      this.phase !== "playing" ||
      this.inventoryOpen ||
      !this.player.alive
    ) {
      return;
    }

    const interactable = this.triggers.activateNearby(this.player);

    if (!interactable) {
      this.showFeedback(
        "NO FIELD INTERFACE IN RANGE",
        "energy",
        0.9,
      );
      this.sfx.denied();
      return;
    }

    this.missions.recordInteract(interactable.id);
    this.effects.spawnImpact(
      interactable.x,
      interactable.y,
      "#f7bf5b",
      "#e9fff8",
      18,
    );
    this.sfx.equip();
    this.showFeedback(
      `${interactable.name.toUpperCase()} · ONLINE`,
      "respawn",
      2.2,
    );
    this.processMissionEvents();
    this.publish(true);
  }

  private updateTriggers(): void {
    const result = this.triggers.update(this.player);

    for (const point of result.enteredPoints) {
      this.missions.recordReach(point.id);
      this.showFeedback(
        `${point.name.toUpperCase()} · REACHED`,
        "respawn",
        1.6,
      );
    }
  }

  private processMissionEvents(): void {
    for (const event of this.missions.drainEvents()) {
      switch (event.type) {
        case "mission-activated":
          this.sfx.weaponSwitch();
          this.showFeedback(
            `MISSION ACTIVE · ${event.title.toUpperCase()}`,
            "energy",
            2.4,
          );
          break;
        case "objective-completed":
          this.sfx.equip();
          this.showFeedback(
            `${event.optional ? "OPTIONAL" : "OBJECTIVE"} · ${event.title.toUpperCase()}`,
            "respawn",
            1.8,
          );
          break;
        case "mission-completed":
          this.completeMission(event.title, event.rewards);
          break;
        case "mission-failed":
          this.showFeedback(
            `MISSION FAILED · ${event.reason.toUpperCase()}`,
            "death",
            2.4,
          );
          break;
      }
    }
  }

  private completeMission(
    title: string,
    rewards: {
      armor?: number;
      energy?: number;
      summary: string;
    } | null,
  ): void {
    if (rewards?.armor) {
      this.player.restoreArmor(rewards.armor);
    }

    if (rewards?.energy) {
      this.combat.restoreEnergy(rewards.energy);
    }

    this.effects.spawnImpact(
      this.player.x,
      this.player.y,
      "#75f5cb",
      "#e9fff8",
      24,
    );
    this.sfx.equip();
    this.feedbackText = `MISSION COMPLETE · ${title.toUpperCase()}`;
    this.feedbackTone = "respawn";
    this.feedbackRemaining = 3;
    this.setPhase("victory");
  }

  private handleFireFailure(): void {
    const failure = this.combat.lastFireFailure;

    if (
      (failure !== "energy" && failure !== "cooldown") ||
      this.fireFeedbackCooldown > 0
    ) {
      return;
    }

    this.showFeedback(
      failure === "energy" ? "CELL DEPLETED · RECHARGING" : "WEAPON CYCLING",
      "energy",
      0.8,
    );
    this.sfx.denied();
    this.fireFeedbackCooldown = 0.75;
  }

  private applyInventoryModifiers(): void {
    this.player.applyModifiers(this.inventory.playerModifiers);
    this.combat.applyModifiers(this.inventory.combatModifiers);
  }

  private itemLabel(kind: InventoryItemKind, itemId: string): string {
    if (kind === "weapon") {
      return (
        this.combat.availableWeapons.find((weapon) => weapon.id === itemId)
          ?.name ?? itemId
      );
    }

    return getEquipmentDef(itemId)?.name ?? itemId;
  }

  private showDamageFeedback(healthDamage: number, armorAbsorbed: number): void {
    if (healthDamage <= 0 && armorAbsorbed <= 0) {
      return;
    }

    const healthText = `-${Math.ceil(healthDamage)} HP`;
    const armorText =
      armorAbsorbed > 0 ? ` · -${Math.ceil(armorAbsorbed)} ARM` : "";

    this.showFeedback(`IMPACT ${healthText}${armorText}`, "damage", 0.9);
  }

  private handlePlayerDeath(): void {
    if (this.playerRespawnRemaining <= 0) {
      this.playerRespawnRemaining = 1.6;
    }

    this.inventoryOpen = false;
    this.showFeedback("SIGNAL LOST · REDEPLOYING", "death", 2);
  }

  private showFeedback(
    text: string,
    tone: SurvivalNoticeTone,
    seconds: number,
  ): void {
    this.feedbackText = text;
    this.feedbackTone = tone;
    this.feedbackRemaining = seconds;
    this.publish(true);
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
    const missionSnapshot = this.missions.snapshot();

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
      pickups: this.pickups,
      items: this.worldItems,
      interactables: this.triggers.interactables,
      missionMarkers: missionSnapshot.markers,
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
        playerArmor: this.player.armor,
        playerMaxArmor: this.player.maxArmor,
        pickupsActive: this.pickups.activeCount,
        pickupsTotal: this.pickups.totalCount,
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
    const inventorySnapshot = this.inventory.snapshot();
    const weaponSnapshots = this.combat.availableWeapons.map((weapon) => ({
      id: weapon.id,
      name: weapon.name,
      slot: weapon.slot,
      energyCost: weapon.energyCost,
      description: weapon.description,
      range: weapon.projectile.range,
      selected: weapon.id === this.combat.currentWeapon.id,
      owned: inventorySnapshot.weapons.some(
        (entry) => entry.id === weapon.id && entry.owned,
      ),
    }));

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
          armor: this.player.armor,
          maxArmor: this.player.maxArmor,
          alive: this.player.alive,
          respawnRemaining: this.playerRespawnRemaining,
        },
        missions: this.missions.snapshot(),
        interaction: this.triggers.nearbyInteractable
          ? {
              id: this.triggers.nearbyInteractable.id,
              name: this.triggers.nearbyInteractable.name,
              prompt: this.triggers.nearbyInteractable.prompt,
            }
          : null,
        survival: {
          pickupsActive: this.pickups.activeCount,
          pickupsTotal: this.pickups.totalCount,
          notice: this.feedbackText
            ? {
                text: this.feedbackText,
                tone: this.feedbackTone,
                remaining: this.feedbackRemaining,
              }
            : null,
        },
        combat: {
          weaponId: this.combat.currentWeapon.id,
          weaponName: this.combat.currentWeapon.name,
          weaponSlot: this.combat.currentWeapon.slot,
          weaponCount: this.combat.availableWeapons.length,
          description: this.combat.currentWeapon.description,
          range: this.combat.currentWeapon.projectile.range,
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
          fireFailure: this.combat.lastFireFailure,
          weapons: weaponSnapshots,
        },
        inventory: {
          open: this.inventoryOpen,
          capacity: inventorySnapshot.capacity,
          used: inventorySnapshot.used,
          weapons: weaponSnapshots,
          equipped: inventorySnapshot.equipped,
          stored: inventorySnapshot.stored,
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
