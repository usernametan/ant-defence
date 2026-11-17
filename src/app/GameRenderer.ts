import { WEAPON_DEFS } from '../shared/api';
import type { GameState, MapData, Team, Unit, Vec2 } from '../shared/types';
import { TILE_SIZE } from '../sim/constants';
import type { GameController } from './GameController';

const TEAM_COLOR: Record<Team, string> = {
  player: '#4dc9ff',
  enemy: '#ff5d6c',
};

const RARITY_COLOR = {
  common: '#9fb2c8',
  rare: '#4dc9ff',
  epic: '#c77dff',
};

/** Lightweight Canvas 2D view that reads state and feeds the camera to input. */
export class GameRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private camera: Vec2 = { x: 0, y: 0 };
  private dpr = 1;
  private width = 1;
  private height = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly controller: GameController,
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    this.ctx = context;
    this.resize();
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, this.canvas.clientWidth);
    this.height = Math.max(1, this.canvas.clientHeight);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  }

  render(): void {
    const state = this.controller.getState();
    const player = state.units.find((unit) => unit.id === state.playerId);
    if (player) {
      const smoothing = 0.18;
      this.camera.x += (player.pos.x - this.camera.x) * smoothing;
      this.camera.y += (player.pos.y - this.camera.y) * smoothing;
    } else {
      this.camera.x = state.map.width * TILE_SIZE / 2;
      this.camera.y = state.map.height * TILE_SIZE / 2;
    }

    const scale = 1;
    const offsetX = this.width / 2 - this.camera.x * scale;
    const offsetY = this.height / 2 - this.camera.y * scale;
    this.controller.setViewTransform({ offsetX, offsetY, scale });

    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#070b12';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    this.drawTiles(state.map);
    this.drawZones(state);
    this.drawBases(state);
    this.drawPickups(state);
    this.drawProjectiles(state);
    for (const unit of state.units) this.drawUnit(unit);

    ctx.restore();
  }

  private drawTiles(map: MapData): void {
    const ctx = this.ctx;
    const minX = Math.max(0, Math.floor((-this.width / 2 + this.camera.x) / TILE_SIZE) - 1);
    const maxX = Math.min(map.width - 1, Math.ceil((this.width / 2 + this.camera.x) / TILE_SIZE) + 1);
    const minY = Math.max(0, Math.floor((-this.height / 2 + this.camera.y) / TILE_SIZE) - 1);
    const maxY = Math.min(map.height - 1, Math.ceil((this.height / 2 + this.camera.y) / TILE_SIZE) + 1);

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const kind = map.tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (kind === 'wall') {
          ctx.fillStyle = '#1a2433';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#2b3b52';
          ctx.fillRect(px, py, TILE_SIZE, 4);
        } else if (kind === 'lowCover') {
          const key = `${x},${y}`;
          const hp = map.coverHp[key] ?? 100;
          ctx.fillStyle = hp > 40 ? '#5c6b7d' : '#7a5b52';
          ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
          ctx.strokeStyle = '#96a7bb';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 3.5, py + 3.5, TILE_SIZE - 7, TILE_SIZE - 7);
        } else if (kind === 'water') {
          ctx.fillStyle = '#153b52';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = 'rgba(77, 201, 255, 0.12)';
          ctx.fillRect(px, py + 6, TILE_SIZE, 2);
          ctx.fillRect(px, py + 20, TILE_SIZE, 2);
        } else {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#101823' : '#121c28';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
        if (kind === 'spawnPlayer' || kind === 'spawnEnemy') {
          ctx.fillStyle = kind === 'spawnPlayer' ? 'rgba(77,201,255,0.22)' : 'rgba(255,93,108,0.22)';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private drawZones(state: Readonly<GameState>): void {
    const ctx = this.ctx;
    for (const zone of state.map.zones) {
      const status = state.zones.find((item) => item.id === zone.id);
      const owner = status?.owner ?? 'neutral';
      const color = owner === 'neutral' ? '#9fb2c8' : TEAM_COLOR[owner];
      ctx.beginPath();
      ctx.arc(zone.center.x, zone.center.y, zone.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${color}18`;
      ctx.fill();
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = status?.contested ? '#ffd166' : color;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);

      const progress = status?.progress ?? 0;
      if (Math.abs(progress) > 0.02) {
        ctx.beginPath();
        ctx.arc(zone.center.x, zone.center.y, zone.radius - 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.abs(progress));
        ctx.strokeStyle = progress > 0 ? TEAM_COLOR.player : TEAM_COLOR.enemy;
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.font = '600 16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(zone.id.replace('zone-', 'Z'), zone.center.x, zone.center.y + 6);
    }
  }

  private drawBases(state: Readonly<GameState>): void {
    const ctx = this.ctx;
    for (const base of state.map.bases) {
      const color = TEAM_COLOR[base.team];
      ctx.beginPath();
      ctx.arc(base.center.x, base.center.y, base.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `${color}88`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(base.center.x, base.center.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      const hpRatio = Math.max(0, Math.min(1, state.baseHp[base.team] / base.coreHp));
      ctx.fillStyle = '#0b111a';
      ctx.fillRect(base.center.x - 34, base.center.y - 32, 68, 7);
      ctx.fillStyle = color;
      ctx.fillRect(base.center.x - 34, base.center.y - 32, 68 * hpRatio, 7);
    }
  }

  private drawPickups(state: Readonly<GameState>): void {
    const ctx = this.ctx;
    for (const pickup of state.pickups) {
      const color = RARITY_COLOR[pickup.rarity];
      ctx.save();
      ctx.translate(pickup.pos.x, pickup.pos.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = color;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.restore();
      ctx.fillStyle = '#07101a';
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(WEAPON_DEFS[pickup.weaponId].name[0], pickup.pos.x, pickup.pos.y + 4);
    }
  }

  private drawProjectiles(state: Readonly<GameState>): void {
    const ctx = this.ctx;
    for (const projectile of state.projectiles) {
      ctx.beginPath();
      ctx.arc(projectile.pos.x, projectile.pos.y, projectile.splashRadius > 0 ? 6 : 3, 0, Math.PI * 2);
      ctx.fillStyle = projectile.splashRadius > 0 ? '#ffb347' : TEAM_COLOR[projectile.team];
      ctx.fill();
    }
  }

  private drawUnit(unit: Unit): void {
    if (unit.dead) return;
    const ctx = this.ctx;
    const color = TEAM_COLOR[unit.team];

    ctx.beginPath();
    ctx.moveTo(unit.pos.x, unit.pos.y);
    ctx.lineTo(unit.pos.x + Math.cos(unit.angle) * 24, unit.pos.y + Math.sin(unit.angle) * 24);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(unit.pos.x, unit.pos.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = unit.isPlayer ? '#ffffff' : '#0b111a';
    ctx.lineWidth = unit.isPlayer ? 3 : 2;
    ctx.stroke();

    const hpRatio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
    ctx.fillStyle = '#0b111a';
    ctx.fillRect(unit.pos.x - 16, unit.pos.y - 22, 32, 4);
    ctx.fillStyle = hpRatio > 0.35 ? '#5ce6a0' : '#ff5d6c';
    ctx.fillRect(unit.pos.x - 16, unit.pos.y - 22, 32 * hpRatio, 4);
  }
}
