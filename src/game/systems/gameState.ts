import type {
  InventoryItem,
  QuestFlag,
  SaveData,
  Vec2,
} from '../../shared/types';

/**
 * Runtime quest / inventory state. Shared by scenes, HUD and save helpers.
 * The bus remains the only source of flag changes during dialogue.
 */
export class GameState {
  private readonly flags = new Set<QuestFlag>();
  private readonly discovered = new Set<string>();
  private inventory: InventoryItem[] = [];
  private readonly listeners = new Set<() => void>();

  hasFlag(flag: QuestFlag): boolean {
    return this.flags.has(flag);
  }

  setFlag(flag: QuestFlag, value: boolean): void {
    if (value) {
      if (this.flags.has(flag)) return;
      this.flags.add(flag);
    } else {
      if (!this.flags.delete(flag)) return;
    }
    this.notify();
  }

  allFlags(): QuestFlag[] {
    return [...this.flags];
  }

  addDiscovered(reactionId: string): void {
    if (this.discovered.has(reactionId)) return;
    this.discovered.add(reactionId);
    this.notify();
  }

  discoveredReactions(): string[] {
    return [...this.discovered];
  }

  setInventory(inventory: InventoryItem[]): void {
    this.inventory = inventory.map((item) => ({ ...item }));
    this.notify();
  }

  getInventory(): InventoryItem[] {
    return this.inventory.map((item) => ({ ...item }));
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  toSaveData(playerPos: Vec2, sceneKey: string): SaveData {
    return {
      flags: this.allFlags(),
      inventory: this.getInventory(),
      discoveredReactions: this.discoveredReactions(),
      playerPos: { x: Math.round(playerPos.x), y: Math.round(playerPos.y) },
      sceneKey,
    };
  }

  applySaveData(save: SaveData): void {
    this.flags.clear();
    for (const flag of save.flags) this.flags.add(flag);
    this.discovered.clear();
    for (const id of save.discoveredReactions) this.discovered.add(id);
    this.inventory = save.inventory.map((item) => ({ ...item }));
    this.notify();
  }

  reset(): void {
    this.flags.clear();
    this.discovered.clear();
    this.inventory = [];
    this.notify();
  }

  private notify(): void {
    for (const listener of [...this.listeners]) {
      listener();
    }
  }
}

export const gameState = new GameState();
