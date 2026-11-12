export const GAME_IDENTITY = {
  title: "Monster Frontier",
  wordmark: "MONSTER FRONTIER",
  kicker: "PROJECT VERDANT",
  stage: "Stage 1 — Project Foundation",
  version: "0.1.0",
  tagline:
    "The frontier is waking. A new expedition is being assembled beyond the last safe light.",
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

export const FOUNDATION_CHECKS = [
  { label: "Renderer", detail: "Canvas 2D online" },
  { label: "Simulation", detail: "Fixed 60 Hz step" },
  { label: "Camera", detail: "World bounds locked" },
  { label: "UI bridge", detail: "Snapshots throttled" },
] as const;
