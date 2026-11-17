import type { DialogueNode } from '../../shared/types';

export const act1Scene3: DialogueNode[] = [
  {
    id: 'a1s3_search',
    speaker: 'Narrator',
    text: 'You search every path until nightfall, finding no trace of your son—only the bitter truth of how powerless you were.',
    onEnter: ['first_defeat'],
    next: 'a1s3_father_1',
  },
  {
    id: 'a1s3_father_1',
    speaker: 'Father',
    text: 'I will find you, my son. No matter what it takes.',
  },
];
