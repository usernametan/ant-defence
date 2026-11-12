export const GAME_IDENTITY = {
  title: "Monster Frontier",
  wordmark: "MONSTER FRONTIER",
  kicker: "PROJECT VERDANT",
  stage: "Stage 4 — Creature Foundation",
  version: "0.4.0",
  tagline:
    "The frontier is waking. Three creature archetypes now hunt the range, and the spawn director keeps the pressure on.",
  firstRegion: "Greenreach Wilds",
  regions: [
    "Greenreach Wilds",
    "Rustline City",
    "Verdant Jungle",
    "Frostfall Reach",
    "The Laboratory",
    "Homeland",
  ],
} as const;

export const PROTOTYPE_CHECKS = [
  { label: "Creatures", detail: "Crawler · Stalker · Spitter" },
  { label: "AI", detail: "Chase · flank · ranged" },
  { label: "Spawns", detail: "Budgeted · timed refill" },
  { label: "Combat", detail: "Melee · acid projectiles" },
  { label: "Movement", detail: "WASD · sprint · dodge" },
  { label: "Camera", detail: "Damped follow + bounds" },
] as const;
