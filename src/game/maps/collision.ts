import { TILE_SIZE, isSolidTile } from './tiles';
import type { Rect, VillageMap } from './villageMap';

export interface MoveResult {
  x: number;
  y: number;
  hitX: boolean;
  hitY: boolean;
}

function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Tile + prop AABB collision. Movement resolves each axis separately, which
 * produces natural sliding along walls and water edges.
 */
export class CollisionWorld {
  private readonly map: VillageMap;

  constructor(map: VillageMap) {
    this.map = map;
  }

  isSolidRect(rect: Rect): boolean {
    if (
      rect.x < 0 ||
      rect.y < 0 ||
      rect.x + rect.width > this.map.width * TILE_SIZE ||
      rect.y + rect.height > this.map.height * TILE_SIZE
    ) {
      return true;
    }

    const x0 = Math.max(0, Math.floor(rect.x / TILE_SIZE));
    const y0 = Math.max(0, Math.floor(rect.y / TILE_SIZE));
    const x1 = Math.min(
      this.map.width - 1,
      Math.floor((rect.x + rect.width - 0.001) / TILE_SIZE),
    );
    const y1 = Math.min(
      this.map.height - 1,
      Math.floor((rect.y + rect.height - 0.001) / TILE_SIZE),
    );

    for (let y = y0; y <= y1; y += 1) {
      const row = this.map.tiles[y];
      if (!row) continue;
      for (let x = x0; x <= x1; x += 1) {
        const tile = row[x];
        if (tile === undefined) continue;
        if (isSolidTile(tile)) return true;
      }
    }

    for (const solid of this.map.solids) {
      if (intersects(rect, solid)) return true;
    }

    return false;
  }

  isSolidAt(x: number, y: number): boolean {
    return this.isSolidRect({ x, y, width: 1, height: 1 });
  }

  moveRect(
    x: number,
    y: number,
    width: number,
    height: number,
    dx: number,
    dy: number,
  ): MoveResult {
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    const steps = Math.max(1, Math.ceil(distance / 2));
    const stepX = dx / steps;
    const stepY = dy / steps;

    let nextX = x;
    let nextY = y;
    let hitX = false;
    let hitY = false;

    for (let step = 0; step < steps; step += 1) {
      if (!hitX && stepX !== 0) {
        const candidateX = nextX + stepX;
        if (
          this.isSolidRect({
            x: candidateX,
            y: nextY,
            width,
            height,
          })
        ) {
          hitX = true;
        } else {
          nextX = candidateX;
        }
      }

      if (!hitY && stepY !== 0) {
        const candidateY = nextY + stepY;
        if (
          this.isSolidRect({
            x: nextX,
            y: candidateY,
            width,
            height,
          })
        ) {
          hitY = true;
        } else {
          nextY = candidateY;
        }
      }
    }

    return { x: nextX, y: nextY, hitX, hitY };
  }
}
