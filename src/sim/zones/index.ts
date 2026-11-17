import { bus } from '../../shared/events';
import type { Team } from '../../shared/types';
import {
  BASE_DAMAGE_EVENT_INTERVAL,
  BASE_CORE_DPS,
  MATCH_TIME_LIMIT,
  ZONE_CAPTURE_RATE,
  ZONE_SCORE_RATE,
} from '../constants';
import type { SimWorld } from '../world';

function clampProgress(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

/** Presence-based capture, contest detection, and per-second score for owners. */
export function updateZones(world: SimWorld, dt: number): void {
  const state = world.state;

  for (const zoneState of state.zones) {
    const zoneDef = state.map.zones.find((zone) => zone.id === zoneState.id);
    if (!zoneDef) continue;

    let playerCount = 0;
    let enemyCount = 0;
    for (const unit of world.livingUnits()) {
      if (Math.hypot(unit.pos.x - zoneDef.center.x, unit.pos.y - zoneDef.center.y) > zoneDef.radius) continue;
      if (unit.team === 'player') playerCount += 1;
      else enemyCount += 1;
    }

    const previousOwner = zoneState.owner;
    const previousProgress = zoneState.progress;

    if (playerCount > enemyCount) {
      const advantage = Math.min(playerCount - enemyCount, 3);
      zoneState.progress = clampProgress(
        zoneState.progress + ZONE_CAPTURE_RATE * (1 + advantage * 0.25) * dt,
      );
    } else if (enemyCount > playerCount) {
      const advantage = Math.min(enemyCount - playerCount, 3);
      zoneState.progress = clampProgress(
        zoneState.progress - ZONE_CAPTURE_RATE * (1 + advantage * 0.25) * dt,
      );
    }

    const contested = playerCount > 0 && enemyCount > 0 && playerCount === enemyCount;
    if (contested && !zoneState.contested) {
      bus.emit('zone:contested', { zoneId: zoneState.id });
    }
    zoneState.contested = contested;

    let owner = previousOwner;
    if (zoneState.progress >= 1) owner = 'player';
    else if (zoneState.progress <= -1) owner = 'enemy';
    else if (previousProgress > 0 !== zoneState.progress > 0 && previousProgress !== 0) {
      owner = 'neutral';
    }
    zoneState.owner = owner;

    if (owner !== previousOwner && owner !== 'neutral') {
      bus.emit('zone:captured', { zoneId: zoneState.id, team: owner });
    }

    if (owner !== 'neutral') {
      const carry = (world.zoneScoreCarry[zoneState.id] ?? 0) + ZONE_SCORE_RATE * dt;
      const whole = Math.floor(carry);
      world.zoneScoreCarry[zoneState.id] = carry - whole;
      if (whole > 0) state.score[owner] += whole;
    }
  }
}

/** A base core takes damage only while enemies are inside and defenders are not. */
export function updateBaseCores(world: SimWorld, dt: number): void {
  const state = world.state;
  for (const base of state.map.bases) {
    let friendly = 0;
    let enemies = 0;
    for (const unit of world.livingUnits()) {
      if (Math.hypot(unit.pos.x - base.center.x, unit.pos.y - base.center.y) > base.radius) continue;
      if (unit.team === base.team) friendly += 1;
      else enemies += 1;
    }
    if (enemies === 0 || friendly > 0) continue;

    const damage = BASE_CORE_DPS * dt * Math.min(enemies, 3);
    state.baseHp[base.team] = Math.max(0, state.baseHp[base.team] - damage);
    world.baseDamageTimer[base.team] -= dt;
    if (world.baseDamageTimer[base.team] <= 0) {
      world.baseDamageTimer[base.team] = BASE_DAMAGE_EVENT_INTERVAL;
      bus.emit('base:damaged', { team: base.team, hpLeft: state.baseHp[base.team] });
    }
  }
}

/** Score, core destruction, and the time limit all resolve the match. */
export function checkWin(world: SimWorld): void {
  const state = world.state;
  if (state.status !== 'playing') return;

  let winner: Team | null = null;
  if (state.score.player >= state.matchConfig.scoreToWin) winner = 'player';
  else if (state.score.enemy >= state.matchConfig.scoreToWin) winner = 'enemy';
  else if (state.baseHp.enemy <= 0) winner = 'player';
  else if (state.baseHp.player <= 0) winner = 'enemy';
  else if (state.time >= MATCH_TIME_LIMIT) {
    if (state.score.player !== state.score.enemy) {
      winner = state.score.player > state.score.enemy ? 'player' : 'enemy';
    } else if (state.baseHp.player !== state.baseHp.enemy) {
      winner = state.baseHp.player > state.baseHp.enemy ? 'player' : 'enemy';
    } else {
      winner = 'player';
    }
  }

  if (!winner) return;
  state.status = winner === 'player' ? 'won' : 'lost';
  bus.emit('match:end', { winner });
}
