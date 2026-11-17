export interface SpatialItem {
  x: number;
  y: number;
}

export class SpatialHash<T extends SpatialItem> {
  private readonly cells = new Map<string, T[]>();

  constructor(private readonly cellSize = 128) {}

  clear(): void {
    this.cells.clear();
  }

  insert(item: T): void {
    const key = this.getKey(item.x, item.y);
    const cell = this.cells.get(key);

    if (cell) {
      cell.push(item);
      return;
    }

    this.cells.set(key, [item]);
  }

  query(x: number, y: number, radius: number): T[] {
    const results: T[] = [];
    const seen = new Set<T>();
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);

    for (let cellX = minX; cellX <= maxX; cellX += 1) {
      for (let cellY = minY; cellY <= maxY; cellY += 1) {
        const cell = this.cells.get(`${cellX},${cellY}`);

        if (!cell) {
          continue;
        }

        for (const item of cell) {
          if (seen.has(item)) {
            continue;
          }

          seen.add(item);
          results.push(item);
        }
      }
    }

    return results;
  }

  private getKey(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }
}
