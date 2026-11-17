/** Deterministic tuning constants. All values are in world units / seconds. */

export const TILE_SIZE = 32;
export const MAP_WIDTH = 60;
export const MAP_HEIGHT = 40;
export const FIXED_DT = 1 / 60;
export const MAX_SUBSTEPS = 5;

export const UNIT_RADIUS = 11;
export const UNIT_MAX_SPEED = 230;
export const UNIT_ACCEL = 1900;
export const UNIT_FRICTION = 9;

export const DASH_SPEED = 660;
export const DASH_DURATION = 0.17;
export const DASH_COOLDOWN = 2.6;

export const PLAYER_MAX_HP = 100;
export const REGEN_DELAY = 5;
export const REGEN_RATE = 9;

export const RESPAWN_DELAY_PLAYER = 4;
export const RESPAWN_DELAY_ENEMY = 5;

export const COVER_HP = 100;
export const ZONE_RADIUS = 112;
export const BASE_RADIUS = 110;
export const BASE_CORE_DPS = 14;
export const BASE_DAMAGE_EVENT_INTERVAL = 0.5;

export const ZONE_CAPTURE_RATE = 0.28;
export const ZONE_SCORE_RATE = 2;
export const KILL_SCORE = 3;
export const MATCH_TIME_LIMIT = 300;

export const PICKUP_LIFETIME = 22;
export const PICKUP_PICKUP_RADIUS = 30;
export const INTERACT_RADIUS = 48;
export const CRATE_SPAWN_INTERVAL = 18;
export const DROP_BETTER_CHANCE = 0.35;

export const BOT_AGGRO_RANGE = 520;
export const SPATIAL_CELL = 128;
