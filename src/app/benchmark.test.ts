import { describe, expect, it } from 'vitest';
import { formatBenchmark, runBenchmark } from './benchmark';

const BUDGET_MS_PER_STEP = 3;

describe('headless benchmark', () => {
  it('runs 2000 ticks with 20 enemies under the 3 ms step budget', () => {
    const result = runBenchmark(2000, 20);
    console.log(formatBenchmark(result));
    expect(result.ticks).toBe(2000);
    // 20 enemies + 10 allied bots + the player.
    expect(result.units).toBe(31);
    expect(result.averageMs).toBeLessThan(BUDGET_MS_PER_STEP);
  });
});
