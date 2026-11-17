import type {
  DialogueNode,
  InventoryItem,
  QuestFlag,
  Reaction,
  ReactionEffect,
  Vec2,
} from './types';

export interface EventMap {
  'dialogue:start': { scriptId: string; node: DialogueNode };
  'dialogue:end': { scriptId: string };
  'quest:flag': { flag: QuestFlag; value: boolean };
  'reaction:performed': {
    reactionId: string;
    effect: ReactionEffect;
    origin?: Vec2;
  };
  'reaction:discovered': { reaction: Reaction };
  'gauntlet:open': { slot?: number };
  'gauntlet:close': undefined;
  'inventory:changed': { inventory: InventoryItem[] };
  'scene:change': { from?: string; to: string; spawn?: Vec2 };
  'player:damaged': { amount: number; currentHp: number; maxHp: number };
  'cutscene:play': { cutsceneId: string };
  'objective:set': {
    id: string;
    text: string;
    targetX?: number;
    targetY?: number;
  };
  'objective:complete': { id: string };
  'minigame:start': {
    kind: 'hold' | 'timing' | 'rhythm';
    label: string;
  };
  'minigame:progress': { progress: number };
  'minigame:end': { success: boolean };
  'interact:prompt': { text: string | null };
}

export type EventKey = keyof EventMap;
export type EventHandler<K extends EventKey> = (payload: EventMap[K]) => void;

type HandlerSet<K extends EventKey> = Set<EventHandler<K>>;

export class TypedEventBus {
  private listeners: { [K in EventKey]?: HandlerSet<K> } = {};

  on<K extends EventKey>(event: K, handler: EventHandler<K>): () => void {
    let set = this.listeners[event] as HandlerSet<K> | undefined;
    if (!set) {
      set = new Set<EventHandler<K>>();
      this.listeners[event] = set as (typeof this.listeners)[K];
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  off<K extends EventKey>(event: K, handler: EventHandler<K>): void {
    const set = this.listeners[event] as HandlerSet<K> | undefined;
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      delete this.listeners[event];
    }
  }

  emit<K extends EventKey>(
    event: K,
    ...args: EventMap[K] extends undefined ? [payload?: undefined] : [payload: EventMap[K]]
  ): void {
    const set = this.listeners[event] as HandlerSet<K> | undefined;
    if (!set) return;
    const payload = args[0] as EventMap[K];
    for (const handler of [...set]) {
      handler(payload);
    }
  }

  clear(): void {
    this.listeners = {};
  }
}

export const bus = new TypedEventBus();
