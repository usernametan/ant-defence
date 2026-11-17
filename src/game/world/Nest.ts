import type {
  DamageContext,
  DamageResult,
  Damageable,
  Team,
} from "../combat/Damage";
import type {
  NestDef,
  NestGuardianDef,
  NestNodeDef,
  NestSpawnPointDef,
} from "../content/territories";
import type { Vec2 } from "../core/types";

export type NestState = "active" | "weakened" | "cleared" | "inactive";

const DEFAULT_NODE_RADIUS = 15;
const DEFAULT_NODE_HEALTH = 90;

export class NestNode implements Damageable {
  readonly id: string;
  readonly team: Team = "hostile";
  readonly radius: number;
  readonly maxHealth: number;
  private readonly position: Vec2;
  private currentHealth: number;
  private flash = 0;

  constructor(node: NestNodeDef) {
    this.id = node.id;
    this.position = { x: node.x, y: node.y };
    this.radius = node.radius ?? DEFAULT_NODE_RADIUS;
    this.maxHealth = node.maxHealth ?? DEFAULT_NODE_HEALTH;
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
  }

  reset(): void {
    this.currentHealth = this.maxHealth;
    this.flash = 0;
  }
}

export class Nest {
  readonly id: string;
  readonly name: string;
  readonly territoryId: string;
  readonly x: number;
  readonly y: number;
  readonly activationRadius: number;
  readonly nodes: readonly NestNode[];
  readonly spawnInterval: number;
  readonly maxActive: number;
  readonly guardian: NestGuardianDef | null;
  private readonly spawnPoints: readonly NestSpawnPointDef[];
  private activated = false;
  private guardianSpawned = false;
  private spawnTimer = 0;
  private nextSpawnIndex = 0;

  constructor(readonly def: NestDef) {
    this.id = def.id;
    this.name = def.name;
    this.territoryId = def.territoryId;
    this.x = def.x;
    this.y = def.y;
    this.activationRadius = def.activationRadius;
    this.nodes = def.nodes.map((node) => new NestNode(node));
    this.spawnInterval = def.spawn.intervalSeconds;
    this.maxActive = def.spawn.maxActive;
    this.guardian = def.guardian ?? null;
    this.spawnPoints = def.spawn.points;
  }

  get state(): NestState {
    if (this.nodes.every((node) => !node.alive)) {
      return "cleared";
    }

    if (!this.activated) {
      return "inactive";
    }

    if (
      this.nodes.some((node) => !node.alive) ||
      this.health < this.maxHealth
    ) {
      return "weakened";
    }

    return "active";
  }

  get isActivated(): boolean {
    return this.activated;
  }

  get isCleared(): boolean {
    return this.nodes.every((node) => !node.alive);
  }

  get health(): number {
    return this.nodes.reduce((total, node) => total + node.health, 0);
  }

  get maxHealth(): number {
    return this.nodes.reduce((total, node) => total + node.maxHealth, 0);
  }

  get destroyedNodes(): number {
    return this.nodes.reduce(
      (total, node) => total + (node.alive ? 0 : 1),
      0,
    );
  }

  get clearingProgress(): number {
    return this.nodes.length === 0
      ? 0
      : this.destroyedNodes / this.nodes.length;
  }

  get spawnReady(): boolean {
    return this.activated && !this.isCleared && this.spawnTimer <= 0;
  }

  get guardianReady(): boolean {
    return (
      this.activated &&
      !this.isCleared &&
      this.guardian !== null &&
      !this.guardianSpawned
    );
  }

  update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    for (const node of this.nodes) {
      node.update(deltaSeconds);
    }

    if (!this.activated || this.isCleared) {
      return;
    }

    this.spawnTimer = Math.max(0, this.spawnTimer - deltaSeconds);
  }

  activate(): boolean {
    if (this.activated || this.isCleared) {
      return false;
    }

    this.activated = true;
    this.spawnTimer = Math.min(1.2, this.spawnInterval * 0.35);

    return true;
  }

  nextSpawnPoint(): NestSpawnPointDef | null {
    if (!this.spawnReady || this.spawnPoints.length === 0) {
      return null;
    }

    const point = this.spawnPoints[this.nextSpawnIndex % this.spawnPoints.length];
    this.nextSpawnIndex = (this.nextSpawnIndex + 1) % this.spawnPoints.length;

    return point;
  }

  confirmSpawn(): void {
    this.spawnTimer = this.spawnInterval;
  }

  markGuardianSpawned(): void {
    this.guardianSpawned = true;
  }

  retrySpawn(): void {
    this.spawnTimer = Math.min(1, this.spawnInterval);
  }

  findNode(id: string): NestNode | null {
    return this.nodes.find((node) => node.id === id) ?? null;
  }

  reset(): void {
    this.activated = false;
    this.guardianSpawned = false;
    this.spawnTimer = 0;
    this.nextSpawnIndex = 0;

    for (const node of this.nodes) {
      node.reset();
    }
  }
}
