import { describe, expect, it } from 'vitest';
import { SpatialHash } from './SpatialHash';

interface Item {
  id: string;
  x: number;
  y: number;
}

describe('SpatialHash', () => {
  it('returns nearby items without duplicates across cell boundaries', () => {
    const hash = new SpatialHash<Item>(64);
    const items = [
      { id: 'a', x: 40, y: 40 },
      { id: 'b', x: 70, y: 40 },
      { id: 'c', x: 400, y: 400 },
    ];

    for (const item of items) {
      hash.insert(item);
    }

    const nearby = hash.query(64, 64, 60).map((item) => item.id).sort();

    expect(nearby).toEqual(['a', 'b']);
    expect(hash.query(64, 64, 60)).toHaveLength(2);
  });

  it('clears all cells before a rebuild', () => {
    const hash = new SpatialHash<Item>(32);

    hash.insert({ id: 'a', x: 10, y: 10 });
    expect(hash.query(10, 10, 4)).toHaveLength(1);

    hash.clear();
    expect(hash.query(10, 10, 4)).toEqual([]);
  });
});
