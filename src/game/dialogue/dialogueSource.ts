import type { DialogueSource } from './types';
// TEMP: the only line to change when Antigravity's Act 1 scripts land.
// Expected export: a DialogueSource (Record<scriptId, { id, entry, nodes }>).
import { ACT1_SCRIPTS } from './tempScripts';

export const GAME_DIALOGUE: DialogueSource = ACT1_SCRIPTS;
