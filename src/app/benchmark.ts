import type { GameState, MatchConfig } from '../shared/types';
import { createSim } from '../sim';
import { FIXED_DT } from '../sim/constants';

export interface BenchmarkResult {
  ticks: number;
  units: number;
  totalMs: number;
  averageMs: number;
}

/**
 * Dev-only headless stress run. Not imported by the game bundle. Measures raw
 * SimApi.step() cost with a full bot roster and no presentation tracks.
 */
export function runBenchmark(ticks = 2000, enemyCount = 20): BenchmarkResult {
  const config: MatchConfig = {
    seed: 20240617,
    difficulty: 'normal',
    scoreToWin: 10000,
    enemyCount,
    startingWeapon: 'rifle',
  };
  const sim = createSim();
  sim.start(config);

  // Keep the match alive for the whole measurement window.
  const state = sim.getState() as GameState;
  state.baseHp.player = 1e9;
  state.baseHp.enemy = 1e9;

  const started = performance.now();
  for (let tick = 0; tick < ticks; tick += 1) {
    sim.step(FIXED_DT);
  }
  const totalMs = performance.now() - started;

  return {
    ticks,
    units: sim.getState().units.length,
    totalMs,
    averageMs: totalMs / ticks,
  };
}

export function formatBenchmark(result: BenchmarkResult): string {
  return (
    `benchmark: ${result.ticks} ticks, ${result.units} units, ` +
    `${result.totalMs.toFixed(1)} ms total, ${result.averageMs.toFixed(3)} ms/step`
  );
}
