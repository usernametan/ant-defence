export const GAME_IDENTITY = {
  title: "Monster Frontier",
  wordmark: "MONSTER FRONTIER",
  kicker: "PROJECT VERDANT",
  stage: "Stage 8 — Missions & Objectives",
  version: "0.8.0",
  tagline:
    "Greenreach Wilds is hostile. Take the field order, restore the watchpost relay, and hold the roads beyond Waystation Echo.",
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
  { label: "Loadout", detail: "3 blasters · 3 modules" },
  { label: "Inventory", detail: "Collect · equip · swap" },
  { label: "Mission", detail: "Track · complete · reward" },
  { label: "Relay", detail: "E interaction · field order" },
  { label: "Respawn", detail: "Waystation relink shield" },
] as const;
