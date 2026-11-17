import type { DialogueNode } from '../../shared/types';
import {
  act1Scene1,
  act1Villager1,
  act1Villager2,
  act1Villager3,
} from './act1_scene1';
import { act1Scene2 } from './act1_scene2';
import { act1Scene3 } from './act1_scene3';
import { act2Scene1 } from './act2_scene1';
import { act2Scene2 } from './act2_scene2';
import { act2Scene3 } from './act2_scene3';
import { act2Scene4 } from './act2_scene4';
import { act2Scene5 } from './act2_scene5';
import { act2Scene6 } from './act2_scene6';

export {
  act1Scene1,
  act1Scene2,
  act1Scene3,
  act1Villager1,
  act1Villager2,
  act1Villager3,
  act2Scene1,
  act2Scene2,
  act2Scene3,
  act2Scene4,
  act2Scene5,
  act2Scene6,
};

export const dialogueScripts: Record<string, DialogueNode[]> = {
  act1_scene1: act1Scene1,
  act1_scene2: act1Scene2,
  act1_scene3: act1Scene3,
  act1_villager_1: act1Villager1,
  act1_villager_2: act1Villager2,
  act1_villager_3: act1Villager3,
  act2_scene1: act2Scene1,
  act2_scene2: act2Scene2,
  act2_scene3: act2Scene3,
  act2_scene4: act2Scene4,
  act2_scene5: act2Scene5,
  act2_scene6: act2Scene6,
};
