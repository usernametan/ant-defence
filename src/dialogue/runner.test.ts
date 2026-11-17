import { describe, expect, it, vi } from 'vitest';
import { TypedEventBus } from '../shared/events';
import type { DialogueNode } from '../shared/types';
import { DialogueRunner } from './runner';

const NODES: Record<string, DialogueNode> = {
  intro: {
    id: 'intro',
    speaker: 'Son',
    text: 'Father, the well is singing again.',
    next: 'reply',
    onEnter: ['village_intro'],
  },
  reply: {
    id: 'reply',
    speaker: 'Father',
    text: 'Singing? Show me.',
    choices: [
      { text: 'Follow him', next: 'follow' },
      { text: 'Finish your chores first', next: 'chores' },
    ],
  },
  follow: {
    id: 'follow',
    speaker: 'Son',
    text: 'This way!',
    onEnter: ['met_masked_man'],
  },
  chores: {
    id: 'chores',
    speaker: 'Son',
    text: 'But father...',
    next: 'missing',
  },
};

function setup() {
  const localBus = new TypedEventBus();
  const start = vi.fn();
  const end = vi.fn();
  const flag = vi.fn();
  localBus.on('dialogue:start', start);
  localBus.on('dialogue:end', end);
  localBus.on('quest:flag', flag);
  return { localBus, start, end, flag };
}

describe('DialogueRunner', () => {
  it('walks a linear node chain and ends exactly once', () => {
    const { localBus, start, end, flag } = setup();
    const runner = new DialogueRunner(NODES, {
      scriptId: 'act1',
      bus: localBus,
    });

    const first = runner.start('intro');
    expect(first?.id).toBe('intro');
    expect(runner.active).toBe(true);
    expect(start).toHaveBeenCalledWith({
      scriptId: 'act1',
      node: NODES.intro,
    });

    const second = runner.advance();
    expect(second?.id).toBe('reply');
    expect(runner.currentNode?.id).toBe('reply');

    expect(runner.advance()?.id).toBe('reply');

    expect(runner.choose(0)?.id).toBe('follow');
    expect(flag).toHaveBeenCalledWith({
      flag: 'village_intro',
      value: true,
    });
    expect(flag).toHaveBeenCalledWith({
      flag: 'met_masked_man',
      value: true,
    });

    expect(runner.advance()).toBeNull();
    expect(runner.active).toBe(false);
    expect(end).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledWith({ scriptId: 'act1' });

    runner.advance();
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('only accepts valid choice indexes', () => {
    const { localBus } = setup();
    const runner = new DialogueRunner(NODES, { bus: localBus });

    runner.start('reply');
    expect(runner.currentNode?.id).toBe('reply');
    expect(runner.choose(7)?.id).toBe('reply');
    expect(runner.choose(-1)?.id).toBe('reply');
    expect(runner.choose(1)?.id).toBe('chores');
  });

  it('ends when a node points at a missing target', () => {
    const { localBus, end } = setup();
    const runner = new DialogueRunner(NODES, { bus: localBus });

    runner.start('chores');
    expect(runner.advance()).toBeNull();
    expect(end).toHaveBeenCalledTimes(1);
    expect(runner.active).toBe(false);
  });

  it('ignores unknown start ids, invalid flags, and supports stop', () => {
    const { localBus, end, flag } = setup();
    const nodes: Record<string, DialogueNode> = {
      only: {
        id: 'only',
        speaker: 'Villager',
        text: 'The river is high today.',
        onEnter: ['not_a_real_flag', 'village_intro'],
      },
    };
    const runner = new DialogueRunner(nodes, { bus: localBus });

    expect(runner.start('missing')).toBeNull();
    expect(runner.active).toBe(false);

    runner.start('only');
    expect(flag).toHaveBeenCalledTimes(1);
    expect(flag).toHaveBeenCalledWith({
      flag: 'village_intro',
      value: true,
    });

    runner.stop();
    expect(end).toHaveBeenCalledTimes(1);
    runner.stop();
    expect(end).toHaveBeenCalledTimes(1);
  });
});
