export const GAME_IDENTITY = {
  title: "Monster Frontier",
  wordmark: "MONSTER FRONTIER",
  kicker: "PROJECT VERDANT",
  stage: "Stage 5 — World & Map Systems",
  version: "0.5.0",
  tagline:
    "Greenreach Wilds is open. Follow the old waystation roads through broken ruins, dark woods, and creature-held ground.",
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
  { label: "World", detail: "Greenreach 2048 × 1280" },
  { label: "Terrain", detail: "8 painterly surfaces" },
  { label: "Landmarks", detail: "Waystation · ruins · ford" },
  { label: "Collision", detail: "Props · trees · boundaries" },
  { label: "Camera", detail: "Explore · aim offset" },
  { label: "Spawns", detail: "Authored map points" },
] as const;
