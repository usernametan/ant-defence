import type { DialogueNode } from '../../shared/types';

export const act1Scene2: DialogueNode[] = [
  {
    id: 'a1s2_silence',
    speaker: 'Narrator',
    text: 'As the day comes to an end, the birds fall silent. A mysterious masked stranger steps into the village.',
    onEnter: ['met_masked_man'],
    next: 'a1s2_father_1',
  },
  {
    id: 'a1s2_father_1',
    speaker: 'Father',
    text: 'Who are you? What do you want?',
    next: 'a1s2_approach',
  },
  {
    id: 'a1s2_approach',
    speaker: 'Narrator',
    text: 'The stranger does not respond. He slowly approaches the child.',
    next: 'a1s2_father_2',
  },
  {
    id: 'a1s2_father_2',
    speaker: 'Father',
    text: 'Stay away from him!',
    next: 'a1s2_force',
  },
  {
    id: 'a1s2_force',
    speaker: 'Narrator',
    text: 'The masked man raises his hand. A strange magical force surrounds the child.',
    next: 'a1s2_son_1',
  },
  {
    id: 'a1s2_son_1',
    speaker: 'Son',
    text: 'FATHER!',
    next: 'a1s2_father_3',
  },
  {
    id: 'a1s2_father_3',
    speaker: 'Father',
    text: 'NO! LET HIM GO!',
    next: 'a1s2_knockback',
  },
  {
    id: 'a1s2_knockback',
    speaker: 'Narrator',
    text: 'You charge toward the stranger, but an unseen wave hurls you backward into the dust.',
    next: 'a1s2_father_4',
  },
  {
    id: 'a1s2_father_4',
    speaker: 'Father',
    text: 'You will have to go through me!',
    next: 'a1s2_masked_1',
  },
  {
    id: 'a1s2_masked_1',
    speaker: 'Masked Man',
    text: 'You do not understand what you are standing against.',
    next: 'a1s2_vanish',
  },
  {
    id: 'a1s2_vanish',
    speaker: 'Narrator',
    text: 'The strange force closes around the boy, and in a blink the masked man vanishes with him.',
    onEnter: ['son_kidnapped'],
  },
];
