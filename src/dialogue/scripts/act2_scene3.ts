import type { DialogueNode } from '../../shared/types';

export const act2Scene3: DialogueNode[] = [
  {
    id: 'a2s3_saint_1',
    speaker: 'Saint',
    text: 'People see fire appear from nothing and call it magic.',
    next: 'a2s3_father_1',
  },
  {
    id: 'a2s3_father_1',
    speaker: 'Father',
    text: 'Is it not?',
    next: 'a2s3_saint_2',
  },
  {
    id: 'a2s3_saint_2',
    speaker: 'Saint',
    text: 'What if I told you that everything in this world follows a pattern? Every substance, every element, every transformation.',
    next: 'a2s3_vessel',
  },
  {
    id: 'a2s3_vessel',
    speaker: 'Narrator',
    text: 'The saint picks up two different minerals and places them inside a small vessel.',
    next: 'a2s3_saint_3',
  },
  {
    id: 'a2s3_saint_3',
    speaker: 'Saint',
    text: 'When substances meet, they react. When conditions change, their nature may change. What you see as a miracle may simply be a process you do not understand.',
    next: 'a2s3_father_2',
  },
  {
    id: 'a2s3_father_2',
    speaker: 'Father',
    text: 'Then magic is...?',
    next: 'a2s3_saint_4',
  },
  {
    id: 'a2s3_saint_4',
    speaker: 'Saint',
    text: 'Alchemy. The art of understanding matter, energy and transformation.',
    next: 'a2s3_saint_5',
  },
  {
    id: 'a2s3_saint_5',
    speaker: 'Saint',
    text: 'Magic is chemistry, my child. But chemistry understood beyond the knowledge of ordinary men.',
  },
];
