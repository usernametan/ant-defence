import type { MapData, Vec2 } from '../shared/types';

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Checks unobstructed line of sight across wall tiles using grid DDA. */
export function hasLineOfSight(
  map: MapData,
  from: Vec2,
  to: Vec2,
): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;

  const stepSize = Math.max(6, map.tileSize * 0.25);
  const steps = Math.ceil(dist / stepSize);
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = from.x + dx * t;
    const y = from.y + dy * t;
    const col = Math.floor(x / map.tileSize);
    const row = Math.floor(y / map.tileSize);
    if (col < 0 || row < 0 || col >= map.width || row >= map.height) {
      return false;
    }
    if (map.tiles[row][col] === 'wall') {
      return false;
    }
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
    {
      x1: origin.x - radius,
      y1: origin.y - radius,
      x2: origin.x + radius,
      y2: origin.y - radius,
    },
    {
      x1: origin.x + radius,
      y1: origin.y - radius,
      x2: origin.x + radius,
      y2: origin.y + radius,
    },
    {
      x1: origin.x + radius,
      y1: origin.y + radius,
      x2: origin.x - radius,
      y2: origin.y + radius,
    },
    {
      x1: origin.x - radius,
      y1: origin.y + radius,
      x2: origin.x - radius,
      y2: origin.y - radius,
    },
  ];

  const isWall = (r: number, c: number) =>
    r >= 0 && c >= 0 && r < map.height && c < map.width && map.tiles[r][c] === 'wall';

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      if (map.tiles[row][col] !== 'wall') continue;
      const x = col * ts;
      const y = row * ts;
      if (!isWall(row - 1, col)) segments.push({ x1: x, y1: y, x2: x + ts, y2: y });
      if (!isWall(row + 1, col))
        segments.push({ x1: x, y1: y + ts, x2: x + ts, y2: y + ts });
      if (!isWall(row, col - 1)) segments.push({ x1: x, y1: y, x2: x, y2: y + ts });
      if (!isWall(row, col + 1))
        segments.push({ x1: x + ts, y1: y, x2: x + ts, y2: y + ts });
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

  // Add corner rays for crisp shadow edges (bounded for 60fps performance)
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
