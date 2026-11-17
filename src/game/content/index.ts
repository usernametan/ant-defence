export const GAME_IDENTITY = {
  title: "Monster Frontier",
  wordmark: "MONSTER FRONTIER",
  kicker: "PROJECT VERDANT",
  stage: "Stage 9 — Nests & Territory Control",
  version: "0.9.0",
  tagline:
    "Greenreach Wilds is contested. Burn out the Bloom Nest, secure the watchpost, and hold the roads beyond Waystation Echo.",
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
  { label: "Territory", detail: "Contest · capture · secure" },
  { label: "Nest", detail: "Bloom nodes · spawn pressure" },
  { label: "Relay", detail: "E interaction · field order" },
  { label: "Respawn", detail: "Safe-zone relink shield" },
] as const;
