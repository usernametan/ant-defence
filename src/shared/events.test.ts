import { describe, expect, it, vi } from 'vitest';
import { TypedEventBus, bus } from './events';

describe('TypedEventBus', () => {
  it('subscribes, emits typed payloads, and unsubscribes cleanly', () => {
    const localBus = new TypedEventBus();
    const handler = vi.fn();

    const unsubscribe = localBus.on('quest:flag', handler);
    localBus.emit('quest:flag', { flag: 'village_intro', value: true });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ flag: 'village_intro', value: true });

    unsubscribe();
    localBus.emit('quest:flag', { flag: 'met_masked_man', value: true });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports singleton bus and void-payload events', () => {
    const closeSpy = vi.fn();
    bus.on('gauntlet:close', closeSpy);
    bus.emit('gauntlet:close');
    expect(closeSpy).toHaveBeenCalledTimes(1);
    bus.off('gauntlet:close', closeSpy);
  });
});
