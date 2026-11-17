export type PropertyTag =
  | 'acidic'
  | 'basic'
  | 'flammable'
  | 'volatile'
  | 'conductive'
  | 'oxidizing'
  | 'inert'
  | 'toxic'
  | 'luminous';

export interface Material {
  id: string;
  name: string;
  description: string;
  tags: PropertyTag[];
  icon: string;
}

export type ReactionEffect =
  | {
      kind: 'projectile';
      damage: number;
      speed: number;
      radius: number;
      element: PropertyTag;
      tint: number;
    }
  | {
      kind: 'shield';
      absorb: number;
      durationMs: number;
      reflectTag?: PropertyTag;
      tint: number;
    }
  | {
      kind: 'trap';
      damage: number;
      radius: number;
      durationMs: number;
      slowFactor: number;
      tint: number;
    }
  | {
      kind: 'terrain';
      surface: 'acid_pool' | 'fire_patch' | 'crystal_wall' | 'smoke_cloud';
      radius: number;
      durationMs: number;
      damagePerSecond: number;
      tint: number;
    }
  | {
      kind: 'heal';
      amount: number;
      cleanseTags?: PropertyTag[];
      tint: number;
    }
  | {
      kind: 'neutralize';
      targetTags: PropertyTag[];
      radius: number;
      bonusDamage: number;
      tint: number;
    };

export interface Reaction {
  id: string;
  inputs: [string, string];
  catalyst?: string;
  effect: ReactionEffect;
  discoveryText: string;
}

export interface DialogueChoice {
  text: string;
  next: string;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  next?: string;
  choices?: DialogueChoice[];
  onEnter?: string[];
}

export type QuestFlag =
  | 'village_intro'
  | 'met_masked_man'
  | 'son_kidnapped'
  | 'first_defeat'
  | 'found_cave'
  | 'met_saint'
  | 'learned_matter'
  | 'learned_reaction'
  | 'learned_transformation'
  | 'received_gauntlet'
  | 'dragon_quest_started';

export interface InventoryItem {
  materialId: string;
  quantity: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface SaveData {
  flags: QuestFlag[];
  inventory: InventoryItem[];
  discoveredReactions: string[];
  playerPos: Vec2;
  sceneKey: string;
}
