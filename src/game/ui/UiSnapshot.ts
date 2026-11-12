import { GAME_IDENTITY } from "../content";
import type { GamePhase, Size } from "../core/types";

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

export function selectDodgeReady(snapshot: UiSnapshot): boolean {
  return snapshot.player.dodgeCooldown <= 0.001;
}

export function selectDodgeLabel(snapshot: UiSnapshot): string {
  return selectDodgeReady(snapshot)
    ? "Ready"
    : `${snapshot.player.dodgeCooldown.toFixed(1)}s`;
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
