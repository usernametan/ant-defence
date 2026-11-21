import { afterEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../shared/events';
import type { GameState, InputState, MatchConfig } from '../shared/types';
import { createSim } from './index';

const unsubscribers: Array<() => void> = [];
afterEach(() => {
  unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  bus.clear();
});

const CONFIG: MatchConfig = {
  seed: 424242,
  difficulty: 'normal',
  scoreToWin: 100,
  enemyCount: 4,
  startingWeapon: 'rifle',
};

function hashState(state: Readonly<GameState>): string {
  return JSON.stringify({
    tick: state.tick,
    time: state.time.toFixed(6),
    status: state.status,
    score: state.score,
    baseHp: state.baseHp,
    zones: state.zones,
    mapSeed: state.map.seed,
    coverHp: state.map.coverHp,
    units: state.units.map((unit) => ({
      id: unit.id,
      team: unit.team,
      posX: unit.pos.x.toFixed(6),
      posY: unit.pos.y.toFixed(6),
      velX: unit.vel.x.toFixed(6),
      velY: unit.vel.y.toFixed(6),
      angle: unit.angle.toFixed(6),
      hp: unit.hp.toFixed(6),
      weaponId: unit.weaponId,
      ammoInMag: unit.ammoInMag,
      reserveAmmo: unit.reserveAmmo,
      reloading: unit.reloading,
      dead: unit.dead,
      kills: unit.kills,
      deaths: unit.deaths,
    })),
    projectiles: state.projectiles.map((projectile) => ({
      id: projectile.id,
      posX: projectile.pos.x.toFixed(6),
      posY: projectile.pos.y.toFixed(6),
      life: projectile.life.toFixed(6),
    })),
    pickups: state.pickups.map((pickup) => ({ id: pickup.id, ttl: pickup.ttl.toFixed(6) })),
  });
}

function scriptedInput(tick: number): InputState {
  return {
    moveX: tick % 180 < 90 ? 1 : -1,
    moveY: tick % 120 < 60 ? 0.4 : -0.4,
    aimX: 400 + Math.sin(tick / 30) * 300,
    aimY: 640 + Math.cos(tick / 27) * 200,
    firing: tick % 20 < 8,
    reload: tick % 300 === 0,
    interact: tick % 90 === 0,
    dash: tick % 150 === 0,
  };
}

describe('simulation integration', () => {
  it('emits match:start with the configured match', () => {
    const started = vi.fn();
    unsubscribers.push(bus.on('match:start', started));
    const sim = createSim();
    sim.start(CONFIG);
    expect(started).toHaveBeenCalledWith({ config: CONFIG });
    expect(sim.getState().status).toBe('playing');
    expect(sim.getState().units.some((unit) => unit.isPlayer)).toBe(true);
    expect(sim.getState().units.filter((unit) => unit.team === 'enemy')).toHaveLength(4);
    expect(sim.getState().units.filter((unit) => unit.team === 'player' && !unit.isPlayer)).toHaveLength(3);
    expect(sim.getState().units.filter((unit) => unit.team === 'player')).toHaveLength(4);
  });

  it('produces identical state for identical seeds and inputs over 1000 ticks', () => {
    const a = createSim();
    const b = createSim();
    a.start(CONFIG);
    b.start(CONFIG);

    for (let tick = 0; tick < 1000; tick += 1) {
      const input = scriptedInput(tick);
      a.setInput(input);
      b.setInput(input);
      a.step(1 / 60);
      b.step(1 / 60);
    }

    expect(hashState(a.getState())).toBe(hashState(b.getState()));
    expect(a.getState().tick).toBe(1000);
  });

  it('uses fixed steps regardless of frame delta', () => {
    const sim = createSim();
    sim.start(CONFIG);
    for (let i = 0; i < 60; i += 1) sim.step(1 / 120);
    expect(sim.getState().tick).toBe(30);
    for (let i = 0; i < 10; i += 1) sim.step(1 / 30);
    expect(sim.getState().tick).toBe(50);
  });

  it('moves the player from injected input', () => {
    const sim = createSim();
    sim.start(CONFIG);
    const start = { ...sim.getState().units.find((unit) => unit.isPlayer)!.pos };
    for (let i = 0; i < 90; i += 1) {
      sim.setInput({
        moveX: 1, moveY: 0,
        aimX: start.x + 400, aimY: start.y,
        firing: false, reload: false, interact: false, dash: false,
      });
      sim.step(1 / 60);
    }
    const player = sim.getState().units.find((unit) => unit.isPlayer)!;
    expect(player.pos.x).toBeGreaterThan(start.x + 20);
    expect(player.angle).toBeCloseTo(0, 2);
  });

  it('pauses, resumes and restarts a match', () => {
    const sim = createSim();
    sim.start(CONFIG);
    for (let i = 0; i < 10; i += 1) sim.step(1 / 60);
    const tickBeforePause = sim.getState().tick;

    sim.pause();
    for (let i = 0; i < 10; i += 1) sim.step(1 / 60);
    expect(sim.getState().status).toBe('paused');
    expect(sim.getState().tick).toBe(tickBeforePause);

    sim.resume();
    sim.step(1 / 60);
    expect(sim.getState().tick).toBe(tickBeforePause + 1);

    sim.restart();
    expect(sim.getState().tick).toBe(0);
    expect(sim.getState().status).toBe('playing');
    expect(sim.getState().score).toEqual({ player: 0, enemy: 0 });
  });

  it('ends the match on score and emits match:end', () => {
    const ended = vi.fn();
    unsubscribers.push(bus.on('match:end', ended));
    const sim = createSim();
    sim.start({ ...CONFIG, scoreToWin: 3 });
    const state = sim.getState() as GameState;
    state.score.player = 3;
    sim.step(1 / 60);
    expect(sim.getState().status).toBe('won');
    expect(ended).toHaveBeenCalledWith({ winner: 'player' });
  });

  it('emits gameplay events while bots fight', () => {
    const shot = vi.fn();
    const kill = vi.fn();
    unsubscribers.push(bus.on('shot', shot), bus.on('kill', kill));
    const sim = createSim();
    sim.start({ ...CONFIG, enemyCount: 6 });
    for (let i = 0; i < 900; i += 1) sim.step(1 / 60);

    expect(shot.mock.calls.length).toBeGreaterThan(0);
    expect(kill.mock.calls.length).toBeGreaterThan(0);
  });

  it('spawns 2 default grenades and supports Rampage FFA mode where bots fight each other', () => {
    const kills: Array<{ killerId: string; victimId: string }> = [];
    unsubscribers.push(bus.on('kill', ({ killerId, victimId }) => kills.push({ killerId, victimId })));

    const sim = createSim();
    sim.start({
      seed: 9876,
      mode: 'rampage',
      difficulty: 'hard',
      scoreToWin: 15,
      enemyCount: 6,
      startingWeapon: 'rifle',
    });

    const initial = sim.getState();
    expect(initial.units).toHaveLength(7); // player + 6 bots, no allies
    expect(initial.units.every((u) => u.grenades === 2)).toBe(true);
    expect(initial.units.filter((u) => !u.isPlayer).every((u) => u.team === 'enemy')).toBe(true);

    // Throw a grenade with G intent
    const player = initial.units.find((u) => u.isPlayer)!;
    sim.setInput({
      moveX: 0,
      moveY: 0,
      aimX: player.pos.x + 200,
      aimY: player.pos.y,
      firing: false,
      reload: false,
      interact: false,
      dash: false,
      throwGrenade: true,
    });
    sim.step(1 / 60);
    expect(sim.getState().units.find((u) => u.isPlayer)!.grenades).toBe(1);
    expect(sim.getState().grenades?.length).toBe(1);

    // Let Rampage bots fight each other
    sim.setInput({
      moveX: 0,
      moveY: 0,
      aimX: player.pos.x + 200,
      aimY: player.pos.y,
      firing: false,
      reload: false,
      interact: false,
      dash: false,
      throwGrenade: false,
    });
    for (let i = 0; i < 1200; i += 1) sim.step(1 / 60);

    // Bots must kill other bots in FFA
    const botOnBotKill = kills.some(
      (k) => k.killerId !== initial.playerId && k.victimId !== initial.playerId,
    );
    expect(botOnBotKill).toBe(true);
  });
});
