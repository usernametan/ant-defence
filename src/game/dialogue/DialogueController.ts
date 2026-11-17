import type { DialogueNode } from '../../shared/types';
import { DialogueRunner } from '../../dialogue/runner';
import type { DialogueSource } from './types';

export interface DialogueView {
  showDialogue(node: DialogueNode, selectedIndex: number): void;
  hideDialogue(): void;
}

/**
 * Wires the shared DialogueRunner to a scene view and exposes the small
 * "advance or confirm" surface the game input uses. Ending a script fires
 * `onEnd` exactly once, which VillageScene uses for story beats.
 */
export class DialogueController {
  private readonly source: DialogueSource;
  private readonly view: DialogueView;
  private readonly onEnd: (scriptId: string) => void;
  private runner: DialogueRunner | null = null;
  private scriptId: string | null = null;
  private selectedIndex = 0;

  constructor(
    source: DialogueSource,
    view: DialogueView,
    onEnd: (scriptId: string) => void = () => undefined,
  ) {
    this.source = source;
    this.view = view;
    this.onEnd = onEnd;
  }

  get isOpen(): boolean {
    return this.runner !== null;
  }

  start(scriptId: string, entry?: string): boolean {
    if (this.runner) return false;
    const script = this.source[scriptId];
    if (!script) return false;

    const runner = new DialogueRunner(script.nodes, { scriptId });
    const node = runner.start(entry ?? script.entry);
    if (!node) return false;

    this.runner = runner;
    this.scriptId = scriptId;
    this.selectedIndex = 0;
    this.sync();
    return true;
  }

  advance(): void {
    const runner = this.runner;
    if (!runner) return;
    const node = runner.currentNode;
    if (!node) {
      this.finish();
      return;
    }

    if (node.choices && node.choices.length > 0) {
      const target = runner.choose(this.selectedIndex);
      if (!target) {
        this.finish();
      } else {
        this.selectedIndex = 0;
        this.sync();
      }
      return;
    }

    const next = runner.advance();
    if (!next) {
      this.finish();
    } else {
      this.sync();
    }
  }

  choose(index: number): void {
    const runner = this.runner;
    if (!runner) return;
    const node = runner.currentNode;
    if (!node?.choices) return;
    if (index < 0 || index >= node.choices.length) return;

    const next = runner.choose(index);
    if (!next) {
      this.finish();
    } else {
      this.selectedIndex = 0;
      this.sync();
    }
  }

  moveSelection(delta: number): void {
    const node = this.runner?.currentNode;
    if (!node?.choices || node.choices.length === 0) return;
    const count = node.choices.length;
    this.selectedIndex = (this.selectedIndex + delta + count) % count;
    this.view.showDialogue(node, this.selectedIndex);
  }

  stop(): void {
    this.runner?.stop();
    this.runner = null;
    this.scriptId = null;
    this.view.hideDialogue();
  }

  private sync(): void {
    const node = this.runner?.currentNode;
    if (!node) {
      this.finish();
      return;
    }
    if (node.choices && node.choices.length > 0) {
      this.selectedIndex = Math.min(this.selectedIndex, node.choices.length - 1);
    } else {
      this.selectedIndex = 0;
    }
    this.view.showDialogue(node, this.selectedIndex);
  }

  private finish(): void {
    const scriptId = this.scriptId;
    this.runner = null;
    this.scriptId = null;
    this.selectedIndex = 0;
    this.view.hideDialogue();
    if (scriptId) this.onEnd(scriptId);
  }
}
