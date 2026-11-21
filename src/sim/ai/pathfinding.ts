import type { MapData, Vec2 } from '../../shared/types';
import { isPassable, tileCenter, type TileCoord } from '../map';

/** Zero-allocation typed-array scratchpad for integer-keyed 8-directional A*. */
class AStarScratch {
  private capacity = 0;
  private gen = 1;
  gStamp = new Uint32Array(0);
  closedStamp = new Uint32Array(0);
  gScore = new Float32Array(0);
  parent = new Int32Array(0);
  heapIdx = new Int32Array(0);
  heapPrio = new Float32Array(0);
  heapSize = 0;

  prepare(area: number): number {
    if (area > this.capacity) {
      const cap = Math.max(area, 256);
      this.capacity = cap;
      this.gStamp = new Uint32Array(cap);
      this.closedStamp = new Uint32Array(cap);
      this.gScore = new Float32Array(cap);
      this.parent = new Int32Array(cap);
      this.heapIdx = new Int32Array(cap * 2);
      this.heapPrio = new Float32Array(cap * 2);
      this.gen = 1;
    } else {
      this.gen += 1;
      if (this.gen >= 0xffffff00) {
        this.gStamp.fill(0);
        this.closedStamp.fill(0);
        this.gen = 1;
      }
    }
    this.heapSize = 0;
    return this.gen;
  }

  push(idx: number, prio: number): void {
    let pos = this.heapSize;
    if (pos >= this.heapIdx.length) {
      const nextIdx = new Int32Array(this.heapIdx.length * 2);
      nextIdx.set(this.heapIdx);
      this.heapIdx = nextIdx;
      const nextPrio = new Float32Array(this.heapPrio.length * 2);
      nextPrio.set(this.heapPrio);
      this.heapPrio = nextPrio;
    }
    this.heapIdx[pos] = idx;
    this.heapPrio[pos] = prio;
    this.heapSize = pos + 1;

    while (pos > 0) {
      const p = (pos - 1) >> 1;
      if (this.heapPrio[p] <= this.heapPrio[pos]) break;
      const tmpIdx = this.heapIdx[p];
      const tmpPrio = this.heapPrio[p];
      this.heapIdx[p] = this.heapIdx[pos];
      this.heapPrio[p] = this.heapPrio[pos];
      this.heapIdx[pos] = tmpIdx;
      this.heapPrio[pos] = tmpPrio;
      pos = p;
    }
  }

  popIdx(): number {
    if (this.heapSize === 0) return -1;
    const top = this.heapIdx[0];
    this.heapSize -= 1;
    if (this.heapSize > 0) {
      this.heapIdx[0] = this.heapIdx[this.heapSize];
      this.heapPrio[0] = this.heapPrio[this.heapSize];
      let pos = 0;
      for (;;) {
        const left = pos * 2 + 1;
        const right = left + 1;
        let smallest = pos;
        if (left < this.heapSize && this.heapPrio[left] < this.heapPrio[smallest]) {
          smallest = left;
        }
        if (right < this.heapSize && this.heapPrio[right] < this.heapPrio[smallest]) {
          smallest = right;
        }
        if (smallest === pos) break;
        const tmpIdx = this.heapIdx[pos];
        const tmpPrio = this.heapPrio[pos];
        this.heapIdx[pos] = this.heapIdx[smallest];
        this.heapPrio[pos] = this.heapPrio[smallest];
        this.heapIdx[smallest] = tmpIdx;
        this.heapPrio[smallest] = tmpPrio;
        pos = smallest;
      }
    }
    return top;
  }
}

const SHARED_SCRATCH = new AStarScratch();

const NEIGHBOUR_DX = [1, -1, 0, 0, 1, 1, -1, -1];
const NEIGHBOUR_DY = [0, 0, 1, -1, 1, -1, 1, -1];
const NEIGHBOUR_COST = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

/**
 * 8-directional A* over walkable tiles using integer indices and reusable typed arrays.
 * Diagonal corner-cutting through solid tiles is disallowed.
 */
export function findPath(
  map: MapData,
  start: TileCoord,
  goal: TileCoord,
  scratch: AStarScratch = SHARED_SCRATCH,
): Vec2[] {
  const width = map.width;
  const height = map.height;
  if (
    start.x < 0 ||
    start.y < 0 ||
    start.x >= width ||
    start.y >= height ||
    !isPassable(map, goal.x, goal.y)
  ) {
    return [];
  }

  const startIdx = start.y * width + start.x;
  const goalIdx = goal.y * width + goal.x;
  if (startIdx === goalIdx) return [tileCenter(goal.x, goal.y)];

  const area = width * height;
  const gen = scratch.prepare(area);
  scratch.gStamp[startIdx] = gen;
  scratch.gScore[startIdx] = 0;
  scratch.parent[startIdx] = -1;
  scratch.push(startIdx, heuristic(start.x, start.y, goal.x, goal.y));

  let iterations = 0;
  const limit = area * 4;

  while (scratch.heapSize > 0 && iterations < limit) {
    iterations += 1;
    const currentIdx = scratch.popIdx();
    if (currentIdx < 0) break;
    if (scratch.closedStamp[currentIdx] === gen) continue;
    scratch.closedStamp[currentIdx] = gen;

    if (currentIdx === goalIdx) {
      const indices: number[] = [];
      let cursor = goalIdx;
      while (cursor !== startIdx && cursor >= 0) {
        indices.push(cursor);
        cursor = scratch.parent[cursor];
      }
      const path: Vec2[] = new Array<Vec2>(indices.length);
      for (let i = 0; i < indices.length; i += 1) {
        const idx = indices[indices.length - 1 - i];
        path[i] = tileCenter(idx % width, (idx / width) | 0);
      }
      return path;
    }

    const cx = currentIdx % width;
    const cy = (currentIdx / width) | 0;
    const currentG = scratch.gScore[currentIdx];

    for (let dir = 0; dir < 8; dir += 1) {
      const dx = NEIGHBOUR_DX[dir];
      const dy = NEIGHBOUR_DY[dir];
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isPassable(map, nx, ny)) continue;
      if (dx !== 0 && dy !== 0) {
        if (!isPassable(map, cx + dx, cy)) continue;
        if (!isPassable(map, cx, cy + dy)) continue;
      }

      const nIdx = ny * width + nx;
      if (scratch.closedStamp[nIdx] === gen) continue;

      const tentative = currentG + NEIGHBOUR_COST[dir];
      if (scratch.gStamp[nIdx] === gen && tentative >= scratch.gScore[nIdx]) continue;

      scratch.gStamp[nIdx] = gen;
      scratch.gScore[nIdx] = tentative;
      scratch.parent[nIdx] = currentIdx;
      scratch.push(nIdx, tentative + heuristic(nx, ny, goal.x, goal.y));
    }
  }

  return [];
}

interface CacheEntry {
  version: number;
  path: Vec2[];
}

/** Caches A* results keyed by numeric tile pairs, with per-tick A* cap support. */
export class PathCache {
  private readonly cache = new Map<number, CacheEntry>();
  private readonly scratch = new AStarScratch();
  private readonly maxEntries = 300;
  misses = 0;

  get(map: MapData, from: TileCoord, to: TileCoord, version: number): Vec2[] {
    const res = this.getWithinBudget(map, from, to, version, Infinity);
    return res ?? [];
  }

  /**
   * Look up a cached path, or compute one if `misses < maxMissesThisTick`.
   * Returns `null` when cache missed and this tick's A* budget is exhausted.
   */
  getWithinBudget(
    map: MapData,
    from: TileCoord,
    to: TileCoord,
    version: number,
    maxMissesThisTick: number,
  ): Vec2[] | null {
    const area = map.width * map.height;
    const fromIdx = from.y * map.width + from.x;
    const toIdx = to.y * map.width + to.x;
    const cacheKey = fromIdx * area + toIdx;
    const hit = this.cache.get(cacheKey);
    if (hit && hit.version === version) return hit.path;

    if (this.misses >= maxMissesThisTick) {
      return null;
    }

    this.misses += 1;
    const path = findPath(map, from, to, this.scratch);
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(cacheKey, { version, path });
    return path;
  }

  clear(): void {
    this.cache.clear();
  }
}
