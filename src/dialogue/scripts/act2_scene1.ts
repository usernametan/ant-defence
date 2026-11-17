import type { DialogueNode } from '../../shared/types';

export const act2Scene1: DialogueNode[] = [
  {
    id: 'a2s1_rumours',
    speaker: 'Narrator',
    text: 'Rumours in the village speak of an old saint deep within the jungle—a sage said to understand forces beyond ordinary sight.',
    next: 'a2s1_cave',
  },
  {
    id: 'a2s1_cave',
    speaker: 'Narrator',
    text: 'Beyond tangled roots and mountain mist, you discover an ancient stone cave lit by glowing embers and jars of mineral dust.',
    onEnter: ['found_cave'],
  },
];
