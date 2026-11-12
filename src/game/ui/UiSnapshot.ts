import {
  DEFAULT_COMBAT_CONFIG,
} from "../combat/CombatSystem";
import { STARTER_WEAPONS } from "../content/equipment";
import { GAME_IDENTITY } from "../content";
import type { GamePhase, Size } from "../core/types";
import { DEFAULT_PLAYER_CONFIG } from "../entities/Player";

export interface WeaponSnapshot {
  id: string;
  name: string;
  slot: number;
  energyCost: number;
  selected: boolean;
}

export interface CombatSnapshot {
  weaponId: string;
  weaponName: string;
  weaponSlot: number;
  weaponCount: number;
  energy: number;
  maxEnergy: number;
  energyCost: number;
  cooldown: number;
  cooldownMax: number;
  ready: boolean;
  projectilesActive: number;
  projectilesMax: number;
  targetsAlive: number;
  targetsTotal: number;
  enemiesAlive: number;
  enemiesTotal: number;
  kills: number;
  weapons: readonly WeaponSnapshot[];
}

export interface PlayerSnapshot {
  x: number;
  y: number;
  facing: number;
  speed: number;
  stamina: number;
  maxStamina: number;
  sprinting: boolean;
  dodging: boolean;
  invulnerable: boolean;
  dodgeCooldown: number;
  dodgeCooldownMax: number;
  health: number;
  maxHealth: number;
  alive: boolean;
  respawnRemaining: number;
}

export interface UiSnapshot {
  phase: GamePhase;
  title: string;
  kicker: string;
  stage: string;
  version: string;
  region: string;
  world: Size;
  camera: {
    x: number;
    y: number;
    viewportWidth: number;
    viewportHeight: number;
  };
  player: PlayerSnapshot;
  combat: CombatSnapshot;
  frame: number;
  elapsed: number;
  fps: number;
  interpolation: number;
  debug: boolean;
  updatedAt: number;
}

export function createInitialSnapshot(): UiSnapshot {
  return {
    phase: "menu",
    title: GAME_IDENTITY.wordmark,
    kicker: GAME_IDENTITY.kicker,
    stage: GAME_IDENTITY.stage,
    version: GAME_IDENTITY.version,
    region: GAME_IDENTITY.firstRegion,
    world: { width: 0, height: 0 },
    camera: {
      x: 0,
      y: 0,
      viewportWidth: 0,
      viewportHeight: 0,
    },
    player: {
      x: 0,
      y: 0,
      facing: 0,
      speed: 0,
      stamina: 0,
      maxStamina: 0,
      sprinting: false,
      dodging: false,
      invulnerable: false,
      dodgeCooldown: 0,
      dodgeCooldownMax: 0,
      health: DEFAULT_PLAYER_CONFIG.maxHealth,
      maxHealth: DEFAULT_PLAYER_CONFIG.maxHealth,
      alive: true,
      respawnRemaining: 0,
    },
    combat: {
      weaponId: STARTER_WEAPONS[0].id,
      weaponName: STARTER_WEAPONS[0].name,
      weaponSlot: STARTER_WEAPONS[0].slot,
      weaponCount: STARTER_WEAPONS.length,
      energy: DEFAULT_COMBAT_CONFIG.maxEnergy,
      maxEnergy: DEFAULT_COMBAT_CONFIG.maxEnergy,
      energyCost: STARTER_WEAPONS[0].energyCost,
      cooldown: 0,
      cooldownMax: STARTER_WEAPONS[0].cooldown,
      ready: true,
      projectilesActive: 0,
      projectilesMax: 0,
      targetsAlive: 3,
      targetsTotal: 3,
      enemiesAlive: 0,
      enemiesTotal: 0,
      kills: 0,
      weapons: STARTER_WEAPONS.map((weapon, index) => ({
        id: weapon.id,
        name: weapon.name,
        slot: weapon.slot,
        energyCost: weapon.energyCost,
        selected: index === 0,
      })),
    },
    frame: 0,
    elapsed: 0,
    fps: 0,
    interpolation: 0,
    debug: false,
    updatedAt: 0,
  };
}

export type SnapshotListener = () => void;

export class SnapshotStore {
  private current: UiSnapshot;
  private pending: UiSnapshot | null = null;
  private readonly listeners = new Set<SnapshotListener>();
  private lastEmitAt = Number.NEGATIVE_INFINITY;

  constructor(
    initial: UiSnapshot = createInitialSnapshot(),
    private readonly intervalMs = 100,
  ) {
    this.current = initial;
  }

  subscribe = (listener: SnapshotListener): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): UiSnapshot => this.current;

  update(
    patch: Partial<UiSnapshot>,
    now = performance.now(),
    force = false,
  ): void {
    this.pending = {
      ...(this.pending ?? this.current),
      ...patch,
    };

    if (force || now - this.lastEmitAt >= this.intervalMs) {
      this.commit(now);
    }
  }

  flush(now = performance.now()): void {
    if (this.pending && now - this.lastEmitAt >= this.intervalMs) {
      this.commit(now);
    }
  }

  private commit(now: number): void {
    if (!this.pending) {
      return;
    }

    this.current = {
      ...this.current,
      ...this.pending,
      updatedAt: now,
    };
    this.pending = null;
    this.lastEmitAt = now;

    for (const listener of [...this.listeners]) {
      listener();
    }
  }
}

export function selectIsPaused(snapshot: UiSnapshot): boolean {
  return snapshot.phase === "paused";
}

export function selectIsPlaying(snapshot: UiSnapshot): boolean {
  return snapshot.phase === "playing";
}

export function selectCameraReadout(snapshot: UiSnapshot): string {
  return `${Math.round(snapshot.camera.x)} / ${Math.round(snapshot.camera.y)}`;
}

export function selectPlayerReadout(snapshot: UiSnapshot): string {
  return `${Math.round(snapshot.player.x)} / ${Math.round(snapshot.player.y)}`;
}

export function selectStaminaPercent(snapshot: UiSnapshot): number {
  if (snapshot.player.maxStamina <= 0) {
    return 0;
  }

  return Math.round(
    (snapshot.player.stamina / snapshot.player.maxStamina) * 100,
  );
}

export function selectHealthPercent(snapshot: UiSnapshot): number {
  if (snapshot.player.maxHealth <= 0) {
    return 0;
  }

  return Math.round(
    (snapshot.player.health / snapshot.player.maxHealth) * 100,
  );
}

export function selectDodgeReady(snapshot: UiSnapshot): boolean {
  return snapshot.player.dodgeCooldown <= 0.001;
}

export function selectDodgeLabel(snapshot: UiSnapshot): string {
  return selectDodgeReady(snapshot)
    ? "Ready"
    : `${snapshot.player.dodgeCooldown.toFixed(1)}s`;
}

export function selectEnergyPercent(snapshot: UiSnapshot): number {
  if (snapshot.combat.maxEnergy <= 0) {
    return 0;
  }

  return Math.round(
    (snapshot.combat.energy / snapshot.combat.maxEnergy) * 100,
  );
}

export function selectWeaponStatus(snapshot: UiSnapshot): string {
  if (snapshot.combat.ready) {
    return "Ready";
  }

  if (snapshot.combat.energy < snapshot.combat.energyCost) {
    return "Low cell";
  }

  return `${snapshot.combat.cooldown.toFixed(1)}s`;
}

export function selectTargetsReadout(snapshot: UiSnapshot): string {
  return `${snapshot.combat.targetsAlive} / ${snapshot.combat.targetsTotal}`;
}

export function selectEnemiesReadout(snapshot: UiSnapshot): string {
  return `${snapshot.combat.enemiesAlive} / ${snapshot.combat.enemiesTotal}`;
}

export function selectHostilesReadout(snapshot: UiSnapshot): string {
  return `${snapshot.combat.targetsAlive + snapshot.combat.enemiesAlive}`;
}

export function selectPhaseLabel(snapshot: UiSnapshot): string {
  switch (snapshot.phase) {
    case "menu":
      return "Awaiting expedition";
    case "playing":
      return "Test arena online";
    case "paused":
      return "Expedition paused";
  }
}
