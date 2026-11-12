import type { Vec2 } from "../core/types";

export type CreatureArchetypeId = "crawler" | "stalker" | "spitter";
export type CreatureBehaviorKind = "chaser" | "strafer" | "ranged";
export type CreatureAttackKind = "melee" | "projectile";

export interface CreatureProjectileDef {
  damage: number;
  speed: number;
  life: number;
  radius: number;
  color: string;
  coreColor: string;
}

export interface CreatureAttackDef {
  kind: CreatureAttackKind;
  damage: number;
  range: number;
  windup: number;
  recovery: number;
  cooldown: number;
  projectile?: CreatureProjectileDef;
}

export interface CreatureArchetype {
  id: CreatureArchetypeId;
  name: string;
  behavior: CreatureBehaviorKind;
  radius: number;
  maxHealth: number;
  moveSpeed: number;
  detectionRange: number;
  loseRange: number;
  preferredRange: number;
  packBonus: number;
  bodyColor: string;
  accentColor: string;
  coreColor: string;
  attack: CreatureAttackDef;
}

export interface CreatureSpawnPoint extends Vec2 {
  id: string;
  archetypeId: CreatureArchetypeId;
}

export const CREATURE_ARCHETYPES: readonly CreatureArchetype[] = [
  {
    id: "crawler",
    name: "Crawler",
    behavior: "chaser",
    radius: 16,
    maxHealth: 46,
    moveSpeed: 132,
    detectionRange: 540,
    loseRange: 760,
    preferredRange: 48,
    packBonus: 0.035,
    bodyColor: "#79563f",
    accentColor: "#ffbf69",
    coreColor: "#f6dfbd",
    attack: {
      kind: "melee",
      damage: 9,
      range: 62,
      windup: 0.28,
      recovery: 0.34,
      cooldown: 1.05,
    },
  },
  {
    id: "stalker",
    name: "Stalker",
    behavior: "strafer",
    radius: 19,
    maxHealth: 74,
    moveSpeed: 156,
    detectionRange: 620,
    loseRange: 820,
    preferredRange: 124,
    packBonus: 0.012,
    bodyColor: "#39695c",
    accentColor: "#c8ff76",
    coreColor: "#ecfff0",
    attack: {
      kind: "melee",
      damage: 14,
      range: 76,
      windup: 0.34,
      recovery: 0.42,
      cooldown: 1.3,
    },
  },
  {
    id: "spitter",
    name: "Spitter",
    behavior: "ranged",
    radius: 18,
    maxHealth: 58,
    moveSpeed: 116,
    detectionRange: 680,
    loseRange: 860,
    preferredRange: 340,
    packBonus: 0,
    bodyColor: "#56487a",
    accentColor: "#b997ff",
    coreColor: "#f3ecff",
    attack: {
      kind: "projectile",
      damage: 10,
      range: 500,
      windup: 0.56,
      recovery: 0.48,
      cooldown: 2.15,
      projectile: {
        damage: 10,
        speed: 260,
        life: 2.4,
        radius: 6,
        color: "#a986ff",
        coreColor: "#f3ecff",
      },
    },
  },
];

export const CREATURE_ARCHETYPE_BY_ID: Record<
  CreatureArchetypeId,
  CreatureArchetype
> = {
  crawler: CREATURE_ARCHETYPES[0],
  stalker: CREATURE_ARCHETYPES[1],
  spitter: CREATURE_ARCHETYPES[2],
};

export const CREATURE_SPAWNS: readonly CreatureSpawnPoint[] = [
  { id: "spawn-crawler-west", archetypeId: "crawler", x: 820, y: 380 },
  { id: "spawn-stalker-east", archetypeId: "stalker", x: 1640, y: 600 },
  { id: "spawn-spitter-south", archetypeId: "spitter", x: 1320, y: 1120 },
  { id: "spawn-crawler-south", archetypeId: "crawler", x: 620, y: 1050 },
  { id: "spawn-stalker-north", archetypeId: "stalker", x: 980, y: 280 },
  { id: "spawn-spitter-east", archetypeId: "spitter", x: 1710, y: 900 },
  { id: "spawn-crawler-southeast", archetypeId: "crawler", x: 1450, y: 1040 },
  { id: "spawn-stalker-southwest", archetypeId: "stalker", x: 760, y: 960 },
  { id: "spawn-spitter-north", archetypeId: "spitter", x: 1180, y: 300 },
];

export function getCreatureArchetype(
  id: CreatureArchetypeId,
): CreatureArchetype {
  return CREATURE_ARCHETYPE_BY_ID[id];
}
