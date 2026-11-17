import type { MapData, Vec2 } from '../../shared/types';
import { isPassable, tileCenter, type TileCoord } from '../map';

interface HeapItem {
  tile: TileCoord;
  priority: number;
}

/** Small binary min-heap for the A* open set. */
class MinHeap {
  private items: HeapItem[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: HeapItem): void {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.items[parent].priority <= this.items[index].priority) break;
      const swap = this.items[parent];
      this.items[parent] = this.items[index];
      this.items[index] = swap;
      index = parent;
    }
  }

  pop(): HeapItem | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop();
    if (last && this.items.length > 0) {
      this.items[0] = last;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) {
          smallest = left;
        }
        if (right < this.items.length && this.items[right].priority < this.items[smallest].priority) {
          smallest = right;
        }
        if (smallest === index) break;
        const swap = this.items[index];
        this.items[index] = this.items[smallest];
        this.items[smallest] = swap;
        index = smallest;
      }
    }
    return top;
  }
}

const NEIGHBOURS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

function key(x: number, y: number): string {
  return `${x},${y}`;
}

function heuristic(a: TileCoord, b: TileCoord): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

/**
 * 8-directional A* over walkable tiles. Diagonal corner-cutting through solid
 * tiles is disallowed, and the returned path is a list of world-space waypoints.
 */
export function findPath(map: MapData, start: TileCoord, goal: TileCoord): Vec2[] {
  if (!isPassable(map, goal.x, goal.y)) return [];
  const startKey = key(start.x, start.y);
  const goalKey = key(goal.x, goal.y);
  if (startKey === goalKey) return [tileCenter(goal.x, goal.y)];

  const gScore = new Map<string, number>([[startKey, 0]]);
  const cameFrom = new Map<string, string>();
  const closed = new Set<string>();
  const open = new MinHeap();
  open.push({ tile: start, priority: heuristic(start, goal) });

  let iterations = 0;
  const limit = map.width * map.height * 4;

  while (open.size > 0 && iterations < limit) {
    iterations += 1;
    const current = open.pop();
    if (!current) break;
    const currentKey = key(current.tile.x, current.tile.y);
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    if (currentKey === goalKey) {
      const path: Vec2[] = [];
      let cursor = goalKey;
      while (cursor !== startKey) {
        const [x, y] = cursor.split(',').map(Number);
        path.push(tileCenter(x, y));
        const previous = cameFrom.get(cursor);
        if (!previous) break;
        cursor = previous;
      }
      return path.reverse();
    }

    for (const offset of NEIGHBOURS) {
      const x = current.tile.x + offset.x;
      const y = current.tile.y + offset.y;
      if (!isPassable(map, x, y)) continue;
      if (offset.x !== 0 && offset.y !== 0) {
        if (!isPassable(map, current.tile.x + offset.x, current.tile.y)) continue;
        if (!isPassable(map, current.tile.x, current.tile.y + offset.y)) continue;
      }
      const neighbourKey = key(x, y);
      if (closed.has(neighbourKey)) continue;
      const step = offset.x !== 0 && offset.y !== 0 ? Math.SQRT2 : 1;
      const tentative = (gScore.get(currentKey) ?? Infinity) + step;
      if (tentative >= (gScore.get(neighbourKey) ?? Infinity)) continue;
      cameFrom.set(neighbourKey, currentKey);
      gScore.set(neighbourKey, tentative);
      open.push({
        tile: { x, y },
        priority: tentative + heuristic({ x, y }, goal),
      });
    }
  }
  return [];
}

interface CacheEntry {
  version: number;
  path: Vec2[];
}

/** Caches A* results, invalidating them when destructible cover changes the map. */
export class PathCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxEntries = 300;

  get(map: MapData, from: TileCoord, to: TileCoord, version: number): Vec2[] {
    const cacheKey = `${key(from.x, from.y)}>${key(to.x, to.y)}`;
    const hit = this.cache.get(cacheKey);
    if (hit && hit.version === version) return hit.path;

    const path = findPath(map, from, to);
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
