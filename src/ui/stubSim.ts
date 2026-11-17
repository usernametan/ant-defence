import { WEAPON_DEFS } from '../shared/api';
import type { SimApi } from '../shared/api';
import { bus } from '../shared/events';
import type {
  GameState,
  InputState,
  MatchConfig,
  Projectile,
  Team,
  Unit,
  WeaponId,
} from '../shared/types';
import { generatePreviewMap } from './previewMap';

const DEFAULT_CONFIG: MatchConfig = {
  seed: 4242,
  difficulty: 'normal',
  scoreToWin: 100,
  enemyCount: 4,
  startingWeapon: 'rifle',
};

/**
 * Deterministic stub simulation implementing SimApi for the ?showcase=1 mode
 * and isolated UI/Render testing without importing src/sim/.
 */
export class StubSim implements SimApi {
  private state: GameState;
  private input: InputState = {
    moveX: 0,
    moveY: 0,
    aimX: 960,
    aimY: 640,
    firing: false,
    reload: false,
    interact: false,
    swapWeapon: false,
    dash: false,
  };
  private projSeq = 1;
  private lastAutoEventAt = 0;

  constructor(config: MatchConfig = DEFAULT_CONFIG) {
    this.state = this.createInitialState(config);
  }

  start(config: MatchConfig): void {
    this.state = this.createInitialState(config);
    bus.emit('match:start', { config });
  }

  setInput(input: InputState): void {
    this.input = input;
  }

  pause(): void {
    this.state = { ...this.state, status: 'paused' };
  }

  resume(): void {
    this.state = { ...this.state, status: 'playing' };
  }

  restart(): void {
    this.start(this.state.matchConfig);
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  step(dtSeconds: number): void {
    if (this.state.status !== 'playing') return;
    const dt = Math.min(0.05, Math.max(0.001, dtSeconds));
    const nextTick = this.state.tick + 1;
    const nextTime = this.state.time + dt;

    const units = this.state.units.map((u) => ({
      ...u,
      pos: { ...u.pos },
      vel: { ...u.vel },
    }));

    const player = units.find((u) => u.id === this.state.playerId);
    if (player) {
      if (player.dead) {
        player.respawnIn = Math.max(0, player.respawnIn - dt);
        if (player.respawnIn === 0) {
          player.dead = false;
          player.hp = player.maxHp;
          bus.emit('unit:respawned', { unitId: player.id });
        }
      } else {
        const hasManualMove = Math.abs(this.input.moveX) > 0.05 || Math.abs(this.input.moveY) > 0.05;
        if (hasManualMove) {
          player.vel.x = this.input.moveX * 210;
          player.vel.y = this.input.moveY * 210;
          player.pos.x += player.vel.x * dt;
          player.pos.y += player.vel.y * dt;
        } else {
          // Orbit gently around Zone B in showcase mode
          const cx = 30.5 * 32;
          const cy = 20.5 * 32;
          const nx = cx + Math.cos(nextTime * 0.7) * 90;
          const ny = cy + Math.sin(nextTime * 0.7) * 65;
          player.vel.x = (nx - player.pos.x) / dt;
          player.vel.y = (ny - player.pos.y) / dt;
          player.pos.x = nx;
          player.pos.y = ny;
        }
        player.angle = Math.atan2(
          this.input.aimY - player.pos.y,
          this.input.aimX - player.pos.x,
        );
        if (player.reloading) {
          player.reloadProgress = Math.min(1, player.reloadProgress + dt * 0.65);
          if (player.reloadProgress >= 1) {
            player.reloading = false;
            player.reloadProgress = 0;
            player.ammoInMag = WEAPON_DEFS[player.weaponId].magSize;
            bus.emit('reload:end');
          }
        }
      }
    }

    // Move bots in scenic tactical patrols
    for (let i = 0; i < units.length; i += 1) {
      const u = units[i];
      if (u.isPlayer || u.dead) continue;
      const phase = nextTime * 0.9 + i * 1.4;
      const anchorX = u.team === 'player' ? 24 * 32 : 37 * 32;
      const anchorY = (14 + (i % 3) * 6) * 32;
      u.pos.x = anchorX + Math.cos(phase) * 75;
      u.pos.y = anchorY + Math.sin(phase * 1.2) * 55;
      u.angle = Math.atan2(
        (player?.pos.y ?? 640) - u.pos.y,
        (player?.pos.x ?? 960) - u.pos.x,
      );
    }

    // Advance projectiles
    const projectiles: Projectile[] = [];
    for (const p of this.state.projectiles) {
      const life = p.life - dt;
      if (life <= 0) {
        if (p.splashRadius > 0) {
          bus.emit('explosion', { pos: p.pos, radius: p.splashRadius });
        }
        continue;
      }
      projectiles.push({
        ...p,
        life,
        pos: {
          x: p.pos.x + p.vel.x * dt,
          y: p.pos.y + p.vel.y * dt,
        },
      });
    }

    // Periodic looping combat showcase effects
    if (nextTime - this.lastAutoEventAt >= 1.1) {
      this.lastAutoEventAt = nextTime;
      if (player && !player.dead) {
        const w = WEAPON_DEFS[player.weaponId];
        const speed = w.projectileSpeed;
        const proj: Projectile = {
          id: `stub-p-${this.projSeq++}`,
          team: 'player',
          pos: { x: player.pos.x, y: player.pos.y },
          vel: {
            x: Math.cos(player.angle) * speed,
            y: Math.sin(player.angle) * speed,
          },
          weaponId: player.weaponId,
          ownerId: player.id,
          life: 0.75,
          damage: w.damage,
          splashRadius: w.splashRadius,
        };
        projectiles.push(proj);
        bus.emit('shot', {
          unitId: player.id,
          weaponId: player.weaponId,
          pos: { ...player.pos },
          angle: player.angle,
        });
      }

      const enemy = units.find((u) => u.team === 'enemy' && !u.dead);
      if (enemy) {
        const ew = WEAPON_DEFS[enemy.weaponId];
        projectiles.push({
          id: `stub-p-${this.projSeq++}`,
          team: 'enemy',
          pos: { x: enemy.pos.x, y: enemy.pos.y },
          vel: {
            x: Math.cos(enemy.angle) * ew.projectileSpeed * 0.7,
            y: Math.sin(enemy.angle) * ew.projectileSpeed * 0.7,
          },
          weaponId: enemy.weaponId,
          ownerId: enemy.id,
          life: 0.65,
          damage: ew.damage,
          splashRadius: ew.splashRadius,
        });
        bus.emit('shot', {
          unitId: enemy.id,
          weaponId: enemy.weaponId,
          pos: { ...enemy.pos },
          angle: enemy.angle,
        });
      }
    }

    // Animate Zone B progress
    const zones = this.state.zones.map((z) => {
      if (z.id === 'B') {
        const progress = Math.sin(nextTime * 0.45);
        return {
          ...z,
          progress,
          contested: Math.abs(progress) < 0.35,
          owner:
            progress > 0.35
              ? ('player' as const)
              : progress < -0.35
                ? ('enemy' as const)
                : z.owner,
        };
      }
      return z;
    });

    this.state = {
      ...this.state,
      tick: nextTick,
      time: nextTime,
      units,
      projectiles,
      zones,
    };
  }

  triggerDamage(amount: number): void {
    const units = this.state.units.map((u) => ({ ...u }));
    const player = units.find((u) => u.id === this.state.playerId);
    const enemy = units.find((u) => u.team === 'enemy');
    if (!player) return;
    player.hp = Math.max(8, player.hp - amount);
    this.state = { ...this.state, units };
    bus.emit('hit', {
      targetId: player.id,
      damage: amount,
      pos: enemy ? { ...enemy.pos } : { x: player.pos.x + 120, y: player.pos.y - 40 },
      killed: false,
    });
  }

  triggerLowHealth(): void {
    const units = this.state.units.map((u) => ({ ...u }));
    const player = units.find((u) => u.id === this.state.playerId);
    if (!player) return;
    player.hp = 22;
    this.state = { ...this.state, units };
    bus.emit('hit', {
      targetId: player.id,
      damage: 45,
      pos: { x: player.pos.x + 100, y: player.pos.y + 60 },
      killed: false,
    });
  }

  triggerHeal(): void {
    const units = this.state.units.map((u) => ({ ...u }));
    const player = units.find((u) => u.id === this.state.playerId);
    if (!player) return;
    player.hp = Math.min(player.maxHp, player.hp + 35);
    this.state = { ...this.state, units };
  }

  triggerZoneCapture(zoneId = 'B', team: Team = 'player'): void {
    const zones = this.state.zones.map((z) =>
      z.id === zoneId
        ? { ...z, owner: team, progress: team === 'player' ? 1 : -1, contested: false }
        : z,
    );
    this.state = {
      ...this.state,
      zones,
      score: {
        ...this.state.score,
        [team]: Math.min(this.state.matchConfig.scoreToWin, this.state.score[team] + 12),
      },
    };
    bus.emit('zone:captured', { zoneId, team });
  }

  triggerZoneContested(zoneId = 'B'): void {
    const zones = this.state.zones.map((z) =>
      z.id === zoneId ? { ...z, contested: true } : z,
    );
    this.state = { ...this.state, zones };
    bus.emit('zone:contested', { zoneId });
  }

  triggerKillStreak(): void {
    const enemy = this.state.units.find((u) => u.team === 'enemy');
    const player = this.state.units.find((u) => u.id === this.state.playerId);
    if (!enemy || !player) return;
    bus.emit('hit', {
      targetId: enemy.id,
      damage: 95,
      pos: { ...enemy.pos },
      killed: true,
    });
    bus.emit('kill', {
      killerId: player.id,
      victimId: enemy.id,
      weaponId: player.weaponId,
    });
  }

  triggerExplosion(): void {
    const player = this.state.units.find((u) => u.id === this.state.playerId);
    if (!player) return;
    bus.emit('explosion', {
      pos: { x: player.pos.x + 120, y: player.pos.y - 30 },
      radius: 130,
    });
  }

  triggerSpawnPickup(weaponId: WeaponId = 'sniper'): void {
    const player = this.state.units.find((u) => u.id === this.state.playerId);
    if (!player) return;
    const pickup = {
      id: `stub-pickup-${this.projSeq++}`,
      pos: { x: player.pos.x + 16, y: player.pos.y + 8 },
      weaponId,
      rarity: WEAPON_DEFS[weaponId].rarity,
      ttl: 22,
    };
    this.state = {
      ...this.state,
      pickups: [...this.state.pickups.slice(-4), pickup],
    };
    bus.emit('pickup:spawned', { pickup });
  }

  triggerSwapWeapon(): void {
    const order: WeaponId[] = ['pistol', 'smg', 'shotgun', 'rifle', 'sniper', 'rocket'];
    const units = this.state.units.map((u) => ({ ...u }));
    const player = units.find((u) => u.id === this.state.playerId);
    if (!player) return;
    const next = order[(order.indexOf(player.weaponId) + 1) % order.length];
    player.weaponId = next;
    player.ammoInMag = WEAPON_DEFS[next].magSize;
    player.reserveAmmo = WEAPON_DEFS[next].magSize * 4;
    this.state = { ...this.state, units };
    bus.emit('pickup:collected', { unitId: player.id, weaponId: next });
  }

  triggerReload(): void {
    const units = this.state.units.map((u) => ({ ...u }));
    const player = units.find((u) => u.id === this.state.playerId);
    if (!player) return;
    player.reloading = true;
    player.reloadProgress = 0.05;
    player.ammoInMag = Math.max(1, Math.floor(WEAPON_DEFS[player.weaponId].magSize * 0.2));
    this.state = { ...this.state, units };
    bus.emit('reload:start');
  }

  triggerRespawnPreview(): void {
    const units = this.state.units.map((u) => ({ ...u }));
    const player = units.find((u) => u.id === this.state.playerId);
    const enemy = units.find((u) => u.team === 'enemy');
    if (!player || !enemy) return;
    player.dead = true;
    player.respawnIn = 3.6;
    this.state = { ...this.state, units };
    bus.emit('kill', {
      killerId: enemy.id,
      victimId: player.id,
      weaponId: enemy.weaponId,
    });
  }

  private createInitialState(config: MatchConfig): GameState {
    const map = generatePreviewMap(config.seed);
    const weapon = WEAPON_DEFS[config.startingWeapon];
    const playerUnit: Unit = {
      id: 'player',
      team: 'player',
      pos: { x: 30 * 32, y: 20 * 32 },
      vel: { x: 0, y: 0 },
      angle: 0,
      hp: 82,
      maxHp: 100,
      weaponId: config.startingWeapon,
      ammoInMag: weapon.magSize,
      reserveAmmo: weapon.magSize * 4,
      reloading: false,
      reloadProgress: 0,
      isPlayer: true,
      dead: false,
      respawnIn: 0,
      kills: 7,
      deaths: 2,
    };

    const ally: Unit = {
      id: 'ally-1',
      team: 'player',
      pos: { x: 24 * 32, y: 17 * 32 },
      vel: { x: 0, y: 0 },
      angle: 0.2,
      hp: 94,
      maxHp: 100,
      weaponId: 'smg',
      ammoInMag: 24,
      reserveAmmo: 90,
      reloading: false,
      reloadProgress: 0,
      isPlayer: false,
      dead: false,
      respawnIn: 0,
      aiState: 'engage',
      kills: 4,
      deaths: 1,
    };

    const enemies: Unit[] = Array.from({ length: config.enemyCount }, (_, i) => ({
      id: `enemy-${i + 1}`,
      team: 'enemy',
      pos: { x: (36 + (i % 2) * 3) * 32, y: (14 + i * 3) * 32 },
      vel: { x: 0, y: 0 },
      angle: Math.PI,
      hp: i === 0 ? 64 : 100,
      maxHp: 100,
      weaponId: i === 0 ? 'rocket' : i % 2 === 0 ? 'rifle' : 'shotgun',
      ammoInMag: 12,
      reserveAmmo: 60,
      reloading: false,
      reloadProgress: 0,
      isPlayer: false,
      dead: false,
      respawnIn: 0,
      aiState: 'engage',
      kills: 2,
      deaths: 3,
    }));

    return {
      tick: 0,
      time: 0,
      map,
      units: [playerUnit, ally, ...enemies],
      projectiles: [],
      pickups: [
        {
          id: 'p-epic-1',
          pos: { x: 30 * 32 + 24, y: 20 * 32 + 12 },
          weaponId: 'sniper',
          rarity: 'epic',
          ttl: 20,
        },
        {
          id: 'p-rare-1',
          pos: { x: 26 * 32, y: 14 * 32 },
          weaponId: 'shotgun',
          rarity: 'rare',
          ttl: 18,
        },
      ],
      zones: [
        { id: 'A', owner: 'player', progress: 1, contested: false },
        { id: 'B', owner: 'neutral', progress: 0.2, contested: true },
        { id: 'C', owner: 'enemy', progress: -1, contested: false },
      ],
      score: { player: 48, enemy: 39 },
      baseHp: { player: 460, enemy: 410 },
      status: 'playing',
      playerId: 'player',
      matchConfig: config,
    };
  }
}
