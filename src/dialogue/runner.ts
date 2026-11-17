import { TypedEventBus, bus } from '../shared/events';
import type { DialogueNode, QuestFlag } from '../shared/types';

const QUEST_FLAGS: readonly QuestFlag[] = [
  'village_intro',
  'met_masked_man',
  'son_kidnapped',
  'first_defeat',
  'found_cave',
  'met_saint',
  'learned_matter',
  'learned_reaction',
  'learned_transformation',
  'received_gauntlet',
  'dragon_quest_started',
];

function isQuestFlag(value: string): value is QuestFlag {
  return (QUEST_FLAGS as readonly string[]).includes(value);
}

export interface DialogueRunnerOptions {
  scriptId?: string;
  bus?: TypedEventBus;
}

/**
 * Small deterministic dialogue state machine.
 *
 * Nodes are looked up by id from a plain record, so scripts can stay as pure
 * data. Bus events are the only integration surface:
 *  - `dialogue:start` once when `start()` is called
 *  - `quest:flag` for every `onEnter` flag of every visited node
 *  - `dialogue:end` once when the tree terminates or `stop()` is called
 *
 * The UI layer reads `currentNode` after each transition; there is no
 * `dialogue:node` contract event yet.
 */
export class DialogueRunner {
  private readonly nodes: Record<string, DialogueNode>;
  private readonly bus: TypedEventBus;
  private readonly scriptId: string;
  private currentId: string | null = null;

  constructor(
    nodes: Record<string, DialogueNode>,
    options: DialogueRunnerOptions = {},
  ) {
    this.nodes = nodes;
    this.bus = options.bus ?? bus;
    this.scriptId = options.scriptId ?? 'dialogue';
  }

  get currentNode(): DialogueNode | null {
    if (!this.currentId) return null;
    return this.nodes[this.currentId] ?? null;
  }

  get active(): boolean {
    return this.currentNode !== null;
  }

  start(nodeId: string): DialogueNode | null {
    const node = this.nodes[nodeId];
    if (!node) {
      return null;
    }

    this.currentId = nodeId;
    this.bus.emit('dialogue:start', {
      scriptId: this.scriptId,
      node,
    });
    this.emitEnterFlags(node);
    return node;
  }

  advance(): DialogueNode | null {
    const current = this.currentNode;
    if (!current) return null;

    if (current.choices && current.choices.length > 0) {
      return current;
    }

    if (current.next) {
      return this.goTo(current.next);
    }

    this.finish();
    return null;
  }

  choose(index: number): DialogueNode | null {
    const current = this.currentNode;
    if (!current || !current.choices) return current;

    const choice = current.choices[index];
    if (!choice) return current;

    return this.goTo(choice.next);
  }

  stop(): void {
    if (!this.currentId) return;
    this.finish();
  }

  private goTo(nodeId: string): DialogueNode | null {
    const node = this.nodes[nodeId];
    if (!node) {
      this.finish();
      return null;
    }

    this.currentId = nodeId;
    this.emitEnterFlags(node);
    return node;
  }

  private emitEnterFlags(node: DialogueNode): void {
    for (const flag of node.onEnter ?? []) {
      if (isQuestFlag(flag)) {
        this.bus.emit('quest:flag', { flag, value: true });
      }
    }
  }

  private finish(): void {
    this.currentId = null;
    this.bus.emit('dialogue:end', { scriptId: this.scriptId });
  }
}
