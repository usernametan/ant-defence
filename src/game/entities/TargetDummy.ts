import type {
  DamageContext,
  DamageResult,
  Damageable,
  Team,
} from "../combat/Damage";
import type { Vec2 } from "../core/types";

export interface TargetDummySpawn extends Vec2 {
  id: string;
  radius?: number;
  maxHealth?: number;
}

const DEFAULT_RADIUS = 22;
const DEFAULT_MAX_HEALTH = 120;
const DEFAULT_RESPAWN_DELAY = 4;

export class TargetDummy implements Damageable {
  readonly id: string;
  readonly team: Team = "hostile";
  readonly radius: number;
  readonly maxHealth: number;
  readonly respawnDelay = DEFAULT_RESPAWN_DELAY;
  private position: Vec2;
  private currentHealth: number;
  private flash = 0;
  private respawnRemainingSeconds = 0;

  constructor(spawn: TargetDummySpawn) {
    this.id = spawn.id;
    this.position = { x: spawn.x, y: spawn.y };
    this.radius = spawn.radius ?? DEFAULT_RADIUS;
    this.maxHealth = spawn.maxHealth ?? DEFAULT_MAX_HEALTH;
    this.currentHealth = this.maxHealth;
  }

  get x(): number {
    return this.position.x;
  }

  get y(): number {
    return this.position.y;
  }

  get health(): number {
    return this.currentHealth;
  }

  get alive(): boolean {
    return this.currentHealth > 0;
  }

  get hitFlash(): number {
    return this.flash;
  }

  get respawnRemaining(): number {
    return this.respawnRemainingSeconds;
  }

  takeDamage(amount: number, _context: DamageContext): DamageResult {
    if (!this.alive || !Number.isFinite(amount) || amount <= 0) {
      return {
        applied: 0,
        killed: false,
        remainingHealth: this.currentHealth,
      };
    }

    const applied = Math.min(this.currentHealth, amount);
    this.currentHealth = Math.max(0, this.currentHealth - amount);
    this.flash = 1;

    if (this.currentHealth === 0) {
      this.respawnRemainingSeconds = this.respawnDelay;
    }

    return {
      applied,
      killed: this.currentHealth === 0,
      remainingHealth: this.currentHealth,
    };
  }

  update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    this.flash = Math.max(0, this.flash - deltaSeconds * 4);

    if (this.alive) {
      return;
    }

    this.respawnRemainingSeconds = Math.max(
      0,
      this.respawnRemainingSeconds - deltaSeconds,
    );

    if (this.respawnRemainingSeconds < 1e-6) {
      this.reset();
    }
  }

  reset(): void {
    this.currentHealth = this.maxHealth;
    this.flash = 0;
    this.respawnRemainingSeconds = 0;
  }
}

export function createTrainingDummies(): TargetDummy[] {
  return [
    new TargetDummy({ id: "dummy-alpha", x: 760, y: 560 }),
    new TargetDummy({ id: "dummy-beta", x: 1240, y: 840 }),
    new TargetDummy({ id: "dummy-gamma", x: 1480, y: 760 }),
  ];
}
