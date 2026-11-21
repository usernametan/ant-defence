import type {
  BossKind,
  HellcellBoss,
  KillSource,
  MatchConfig,
  Pickup,
  Team,
  Vec2,
  WeaponId,
} from './types';

export type BossActionKind =
  | 'chargeWarning'
  | 'chargeDash'
  | 'electricWarning'
  | 'electricPulse'
  | 'weakPointHit';

/** All gameplay events. Payloads are the single source of truth for emitters and listeners. */
export interface EventMap {
  'shot': { unitId: string; weaponId: WeaponId; pos: Vec2; angle: number };
  'grenade:thrown': { unitId: string; pos: Vec2; angle: number };
  'hit': { targetId: string; damage: number; pos: Vec2; killed: boolean };
  'kill': { killerId: string; victimId: string; weaponId: KillSource };
  'cover:damaged': { tile: string; hpLeft: number };
  'cover:destroyed': { tile: string };
  'explosion': { pos: Vec2; radius: number };
  'zone:captured': { zoneId: string; team: Team };
  'zone:contested': { zoneId: string };
  'pickup:spawned': { pickup: Pickup };
  'pickup:collected': { unitId: string; weaponId: WeaponId };
  'unit:respawned': { unitId: string };
  'base:damaged': { team: Team; hpLeft: number };
  'match:start': { config: MatchConfig };
  'match:end': { winner: Team; winnerId?: string };
  'reload:start': undefined;
  'reload:end': undefined;
  'hellcell:warning': { countdown: number };
  'hellcell:start': { boss: HellcellBoss };
  'hellcell:defeated': { winner: Team; blueDamage: number; redDamage: number };
  'hellcell:resumed': undefined;
  'ceasefire:spark': { pos: Vec2 };
  'boss:action': {
    kind: BossKind;
    action: BossActionKind;
    pos: Vec2;
    angle?: number;
    radius?: number;
  };
}

export type EventKey = keyof EventMap;
export type EventHandler<K extends EventKey> = (payload: EventMap[K]) => void;

type HandlerSet<K extends EventKey> = Set<EventHandler<K>>;

/** Minimal typed pub/sub. No dependencies, no runtime reflection. */
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

  once<K extends EventKey>(event: K, handler: EventHandler<K>): () => void {
    const unsubscribe = this.on(event, ((payload: EventMap[K]) => {
      unsubscribe();
      handler(payload);
    }) as EventHandler<K>);
    return unsubscribe;
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
    ...args: EventMap[K] extends undefined
      ? [payload?: undefined]
      : [payload: EventMap[K]]
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

/** Process-wide bus shared by the sim, renderer, UI, and audio tracks. */
export const bus = new TypedEventBus();
