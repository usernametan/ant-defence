import type {
  InventoryItem,
  SaveData,
  Vec2,
} from '../../shared/types';
import { isQuestFlag } from '../../dialogue/runner';

const SAVE_KEY = 'art-of-alchemy:save:v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isVec2(value: unknown): value is Vec2 {
  if (!isRecord(value)) return false;
  return typeof value.x === 'number' && typeof value.y === 'number';
}

function isInventoryItem(value: unknown): value is InventoryItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.materialId === 'string' &&
    typeof value.quantity === 'number'
  );
}

export function isSaveData(value: unknown): value is SaveData {
  if (!isRecord(value)) return false;

  const flags = value.flags;
  const inventory = value.inventory;
  const discovered = value.discoveredReactions;

  if (
    !Array.isArray(flags) ||
    !flags.every((flag) => typeof flag === 'string' && isQuestFlag(flag))
  ) {
    return false;
  }
  if (!Array.isArray(inventory) || !inventory.every(isInventoryItem)) {
    return false;
  }
  if (
    !Array.isArray(discovered) ||
    !discovered.every((id) => typeof id === 'string')
  ) {
    return false;
  }
  if (!isVec2(value.playerPos)) return false;
  return typeof value.sceneKey === 'string';
}

/** Reads the single save slot. Returns null when absent, corrupt, or blocked. */
export function loadSave(): SaveData | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSaveData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSave(save: SaveData): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage can be unavailable in private modes; the game still runs.
  }
}

export function clearSave(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore blocked storage.
  }
}
