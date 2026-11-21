import type { MapData, Vec2 } from '../shared/types';

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Exact 2D grid DDA line-of-sight traversal across `'wall'` tiles.
 * Visits each intersected tile along `(from -> to)` without fixed-step gaps.
 */
export function hasLineOfSight(
  map: MapData,
  from: Vec2,
  to: Vec2,
): boolean {
  const ts = map.tileSize;
  const x0 = from.x / ts;
  const y0 = from.y / ts;
  const x1 = to.x / ts;
  const y1 = to.y / ts;

  let col = Math.floor(x0);
  let row = Math.floor(y0);
  const endCol = Math.floor(x1);
  const endRow = Math.floor(y1);

  if (col < 0 || row < 0 || col >= map.width || row >= map.height) return false;
  if (endCol < 0 || endRow < 0 || endCol >= map.width || endRow >= map.height) return false;
  if (map.tiles[row][col] === 'wall') return false;
  if (col === endCol && row === endRow) return true;

  const dx = x1 - x0;
  const dy = y1 - y0;
  const stepX = dx >= 0 ? 1 : -1;
  const stepY = dy >= 0 ? 1 : -1;

  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;

  let tMaxX = dx > 0 ? (col + 1 - x0) * tDeltaX : dx < 0 ? (x0 - col) * tDeltaX : Infinity;
  let tMaxY = dy > 0 ? (row + 1 - y0) * tDeltaY : dy < 0 ? (y0 - row) * tDeltaY : Infinity;

  const maxSteps = Math.abs(endCol - col) + Math.abs(endRow - row) + 2;
  for (let step = 0; step < maxSteps; step += 1) {
    if (col === endCol && row === endRow) return true;
    if (tMaxX < tMaxY) {
      tMaxX += tDeltaX;
      col += stepX;
    } else if (tMaxY < tMaxX) {
      tMaxY += tDeltaY;
      row += stepY;
    } else {
      tMaxX += tDeltaX;
      tMaxY += tDeltaY;
      col += stepX;
      row += stepY;
    }
    if (col < 0 || row < 0 || col >= map.width || row >= map.height) return false;
    if (map.tiles[row][col] === 'wall') return false;
  }

  return true;
}

function raySegmentIntersect(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  seg: Segment,
): number | null {
  const sx = seg.x2 - seg.x1;
  const sy = seg.y2 - seg.y1;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-7) return null;

  const qpx = seg.x1 - ox;
  const qpy = seg.y1 - oy;
  const t = (qpx * sy - qpy * sx) / denom;
  const u = (qpx * dy - qpy * dx) / denom;
  if (t >= 0 && u >= -1e-4 && u <= 1 + 1e-4) {
    return t;
  }
  return null;
}

/** Collects wall edges inside the visibility box around the origin. */
export function extractWallSegments(
  map: MapData,
  origin: Vec2,
  radius: number,
): Segment[] {
  const ts = map.tileSize;
  const minCol = Math.max(0, Math.floor((origin.x - radius) / ts));
  const maxCol = Math.min(map.width - 1, Math.floor((origin.x + radius) / ts));
  const minRow = Math.max(0, Math.floor((origin.y - radius) / ts));
  const maxRow = Math.min(map.height - 1, Math.floor((origin.y + radius) / ts));

  const segments: Segment[] = [
    { x1: origin.x - radius, y1: origin.y - radius, x2: origin.x + radius, y2: origin.y - radius },
    { x1: origin.x + radius, y1: origin.y - radius, x2: origin.x + radius, y2: origin.y + radius },
    { x1: origin.x + radius, y1: origin.y + radius, x2: origin.x - radius, y2: origin.y + radius },
    { x1: origin.x - radius, y1: origin.y + radius, x2: origin.x - radius, y2: origin.y - radius },
  ];

  const isWall = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < map.height && c < map.width && map.tiles[r][c] === 'wall';

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      if (map.tiles[row][col] !== 'wall') continue;
      const x = col * ts;
      const y = row * ts;
      if (!isWall(row - 1, col)) segments.push({ x1: x, y1: y, x2: x + ts, y2: y });
      if (!isWall(row + 1, col)) segments.push({ x1: x, y1: y + ts, x2: x + ts, y2: y + ts });
      if (!isWall(row, col - 1)) segments.push({ x1: x, y1: y, x2: x, y2: y + ts });
      if (!isWall(row, col + 1)) segments.push({ x1: x + ts, y1: y, x2: x + ts, y2: y + ts });
    }
  }

  return segments;
}

/** Computes a 2D visibility polygon around `origin` up to `radius`. */
export function computeVisibilityPolygon(
  map: MapData,
  origin: Vec2,
  radius: number,
  rayCount = 72,
): Vec2[] {
  const segments = extractWallSegments(map, origin, radius);
  const angles: number[] = [];

  for (let i = 0; i < rayCount; i += 1) {
    angles.push((i / rayCount) * Math.PI * 2 - Math.PI);
  }

  const maxCorners = Math.min(segments.length, 48);
  for (let i = 0; i < maxCorners; i += 1) {
    const seg = segments[i];
    const a1 = Math.atan2(seg.y1 - origin.y, seg.x1 - origin.x);
    angles.push(a1 - 0.002, a1 + 0.002);
  }

  angles.sort((a, b) => a - b);

  const points: Vec2[] = [];
  for (const angle of angles) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let minT = radius;
    for (let i = 0; i < segments.length; i += 1) {
      const t = raySegmentIntersect(origin.x, origin.y, dx, dy, segments[i]);
      if (t !== null && t < minT) {
        minT = t;
      }
    }
    points.push({
      x: origin.x + dx * minT,
      y: origin.y + dy * minT,
    });
  }

  return points;
}

/**
 * Throttled zero-allocation visibility polygon & wall-segment cache.
 * Stores local relative `(x - origin.x, y - origin.y)` ray vertices in a Float32Array
 * and recomputes only when player moved > `6 px`, rayCount changed, or `wallRevision` changed.
 */
export class VisibilityPolygonCache {
  private lastX = Infinity;
  private lastY = Infinity;
  private lastWallRev = -1;
  private lastSeed = -1;
  private lastRayCount = -1;

  private segCenterCol = -1;
  private segCenterRow = -1;
  private segSeed = -1;
  private segWallRev = -1;
  private cachedWallSegs: Segment[] = [];

  private angles: number[] = [];
  relativePoints = new Float32Array(512);
  originX = 0;
  originY = 0;
  pointCount = 0;
  recomputeCount = 0;

  clear(): void {
    this.lastX = Infinity;
    this.lastY = Infinity;
    this.lastWallRev = -1;
    this.lastSeed = -1;
    this.lastRayCount = -1;
    this.segCenterCol = -1;
    this.segCenterRow = -1;
    this.pointCount = 0;
    this.recomputeCount = 0;
  }

  private getWallSegments(map: MapData, origin: Vec2, radius: number, wallRev: number): Segment[] {
    const bucketCol = Math.floor(origin.x / (map.tileSize * 2));
    const bucketRow = Math.floor(origin.y / (map.tileSize * 2));
    if (
      bucketCol === this.segCenterCol &&
      bucketRow === this.segCenterRow &&
      map.seed === this.segSeed &&
      wallRev === this.segWallRev
    ) {
      return this.cachedWallSegs;
    }

    const paddedRadius = radius + map.tileSize * 2;
    const ts = map.tileSize;
    const minCol = Math.max(0, Math.floor((origin.x - paddedRadius) / ts));
    const maxCol = Math.min(map.width - 1, Math.floor((origin.x + paddedRadius) / ts));
    const minRow = Math.max(0, Math.floor((origin.y - paddedRadius) / ts));
    const maxRow = Math.min(map.height - 1, Math.floor((origin.y + paddedRadius) / ts));

    const segs: Segment[] = [];
    const isWall = (r: number, c: number) =>
      r >= 0 && c >= 0 && r < map.height && c < map.width && map.tiles[r][c] === 'wall';

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        if (map.tiles[row][col] !== 'wall') continue;
        const x = col * ts;
        const y = row * ts;
        if (!isWall(row - 1, col)) segs.push({ x1: x, y1: y, x2: x + ts, y2: y });
        if (!isWall(row + 1, col)) segs.push({ x1: x, y1: y + ts, x2: x + ts, y2: y + ts });
        if (!isWall(row, col - 1)) segs.push({ x1: x, y1: y, x2: x, y2: y + ts });
        if (!isWall(row, col + 1)) segs.push({ x1: x + ts, y1: y, x2: x + ts, y2: y + ts });
      }
    }

    this.cachedWallSegs = segs;
    this.segCenterCol = bucketCol;
    this.segCenterRow = bucketRow;
    this.segSeed = map.seed;
    this.segWallRev = wallRev;
    return segs;
  }

  /** Returns true when recomputed; `relativePoints` stores `(dx, dy)` relative to `(originX, originY)`. */
  update(map: MapData, origin: Vec2, radius: number, rayCount: number): boolean {
    const wallRev = map.wallRevision ?? 0;
    const moveSq = (origin.x - this.lastX) ** 2 + (origin.y - this.lastY) ** 2;
    if (
      this.pointCount > 0 &&
      moveSq <= 36 &&
      wallRev === this.lastWallRev &&
      map.seed === this.lastSeed &&
      rayCount === this.lastRayCount
    ) {
      return false;
    }

    const wallSegs = this.getWallSegments(map, origin, radius, wallRev);
    const angles = this.angles;
    angles.length = 0;

    for (let i = 0; i < rayCount; i += 1) {
      angles.push((i / rayCount) * Math.PI * 2 - Math.PI);
    }

    const maxCorners = Math.min(wallSegs.length, 44);
    for (let i = 0; i < maxCorners; i += 1) {
      const seg = wallSegs[i];
      const a1 = Math.atan2(seg.y1 - origin.y, seg.x1 - origin.x);
      angles.push(a1 - 0.002, a1 + 0.002);
    }

    angles.sort((a, b) => a - b);

    const neededFloats = angles.length * 2;
    if (this.relativePoints.length < neededFloats) {
      this.relativePoints = new Float32Array(Math.max(neededFloats, this.relativePoints.length * 2));
    }

    const ox = origin.x;
    const oy = origin.y;
    for (let k = 0; k < angles.length; k += 1) {
      const angle = angles[k];
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      // Ray-vs-box fast clamp to local square [-radius, +radius]
      let minT = radius;
      if (dx > 1e-6) minT = Math.min(minT, radius / dx);
      else if (dx < -1e-6) minT = Math.min(minT, -radius / dx);
      if (dy > 1e-6) minT = Math.min(minT, radius / dy);
      else if (dy < -1e-6) minT = Math.min(minT, -radius / dy);

      for (let i = 0; i < wallSegs.length; i += 1) {
        const t = raySegmentIntersect(ox, oy, dx, dy, wallSegs[i]);
        if (t !== null && t < minT) {
          minT = t;
        }
      }

      this.relativePoints[k * 2] = dx * minT;
      this.relativePoints[k * 2 + 1] = dy * minT;
    }

    this.originX = ox;
    this.originY = oy;
    this.pointCount = angles.length;
    this.lastX = ox;
    this.lastY = oy;
    this.lastWallRev = wallRev;
    this.lastSeed = map.seed;
    this.lastRayCount = rayCount;
    this.recomputeCount += 1;
    return true;
  }
}
