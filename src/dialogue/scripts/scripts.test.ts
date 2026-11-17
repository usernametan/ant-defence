import { describe, expect, it } from 'vitest';
import type { QuestFlag } from '../../shared/types';
import { dialogueScripts } from './index';

describe('Dialogue scripts', () => {
  it('contains all Act 1 and Act 2 scenes plus 3 Act 1 villager lines', () => {
    const expectedKeys = [
      'act1_scene1',
      'act1_scene2',
      'act1_scene3',
      'act1_villager_1',
      'act1_villager_2',
      'act1_villager_3',
      'act2_scene1',
      'act2_scene2',
      'act2_scene3',
      'act2_scene4',
      'act2_scene5',
      'act2_scene6',
    ];
    for (const key of expectedKeys) {
      expect(dialogueScripts[key]).toBeDefined();
      expect(dialogueScripts[key].length).toBeGreaterThan(0);
    }
  });

  it('has unique node ids and valid next/choice links within every script', () => {
    for (const [scriptId, nodes] of Object.entries(dialogueScripts)) {
      const ids = new Set<string>();
      for (const node of nodes) {
        expect(ids.has(node.id), `Duplicate node id ${node.id} in ${scriptId}`).toBe(
          false,
        );
        ids.add(node.id);
      }

      for (const node of nodes) {
        if (node.next !== undefined) {
          expect(
            ids.has(node.next),
            `Missing next target ${node.next} in ${scriptId}`,
          ).toBe(true);
        }
        if (node.choices !== undefined) {
          for (const choice of node.choices) {
            expect(
              ids.has(choice.next),
              `Missing choice target ${choice.next} in ${scriptId}`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it('emits every QuestFlag across the story scripts', () => {
    const emitted = new Set<string>();
    for (const nodes of Object.values(dialogueScripts)) {
      for (const node of nodes) {
        for (const flag of node.onEnter ?? []) {
          emitted.add(flag);
        }
      }
    }

    const expectedFlags: QuestFlag[] = [
      'village_intro',
      'met_masked_man',
      'son_kidnapped',
      'first_defeat',
      'found_cave',
      'met_saint',
      'learned_matter',
      'learned_reaction',
      'learned_transformation',
      'received_gauntlet',
      'dragon_quest_started',
    ];

    for (const flag of expectedFlags) {
      expect(emitted.has(flag), `Missing QuestFlag ${flag}`).toBe(true);
    }
  });
});
