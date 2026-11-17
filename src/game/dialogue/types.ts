import type { DialogueNode } from '../../shared/types';

export interface DialogueScript {
  id: string;
  entry: string;
  nodes: Record<string, DialogueNode>;
}

export type DialogueSource = Record<string, DialogueScript>;
