export const GAME_IDENTITY = {
  title: "Monster Frontier",
  wordmark: "MONSTER FRONTIER",
  kicker: "PROJECT VERDANT",
  stage: "Stage 7 — Equipment & Inventory",
  version: "0.7.0",
  tagline:
    "Greenreach Wilds is hostile. Tune your blaster loadout, recover field modules, and survive the roads beyond Waystation Echo.",
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
  { label: "Health", detail: "Clamped vitals · hit feedback" },
  { label: "Armor", detail: "Absorbs impacts first" },
  { label: "Loadout", detail: "3 blasters · 3 modules" },
  { label: "Inventory", detail: "Collect · equip · swap" },
  { label: "Recovery", detail: "Caches · duplicate salvage" },
  { label: "Respawn", detail: "Waystation relink shield" },
] as const;
