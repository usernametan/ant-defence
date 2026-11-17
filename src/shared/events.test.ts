import { describe, expect, it, vi } from 'vitest';
import { TypedEventBus, bus } from './events';

describe('TypedEventBus', () => {
  it('subscribes, emits a typed payload, and unsubscribes cleanly', () => {
    const localBus = new TypedEventBus();
    const handler = vi.fn();

    const unsubscribe = localBus.on('shot', handler);
    const payload = {
      unitId: 'u1',
      weaponId: 'pistol' as const,
      pos: { x: 10, y: 20 },
      angle: 1.5,
    };
    localBus.emit('shot', payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);

    unsubscribe();
    localBus.emit('shot', payload);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports void-payload events', () => {
    const localBus = new TypedEventBus();
    const start = vi.fn();
    const end = vi.fn();

    localBus.on('reload:start', start);
    localBus.on('reload:end', end);
    localBus.emit('reload:start');
    localBus.emit('reload:end');

    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(undefined);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('fires once handlers a single time', () => {
    const localBus = new TypedEventBus();
    const handler = vi.fn();

    localBus.once('zone:contested', handler);
    localBus.emit('zone:contested', { zoneId: 'z1' });
    localBus.emit('zone:contested', { zoneId: 'z1' });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('exposes a working singleton bus', () => {
    const handler = vi.fn();
    bus.on('unit:respawned', handler);
    bus.emit('unit:respawned', { unitId: 'u9' });
    expect(handler).toHaveBeenCalledWith({ unitId: 'u9' });
    bus.off('unit:respawned', handler);

    bus.emit('unit:respawned', { unitId: 'u10' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('clears all listeners', () => {
    const localBus = new TypedEventBus();
    const handler = vi.fn();
    localBus.on('explosion', handler);
    localBus.clear();
    localBus.emit('explosion', { pos: { x: 0, y: 0 }, radius: 10 });
    expect(handler).not.toHaveBeenCalled();
  });
});
