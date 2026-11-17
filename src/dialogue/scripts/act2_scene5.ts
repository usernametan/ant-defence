import type { DialogueNode } from '../../shared/types';

export const act2Scene5: DialogueNode[] = [
  {
    id: 'a2s5_father_1',
    speaker: 'Father',
    text: 'I understand the basics now. Teach me how to use it against the masked man.',
    next: 'a2s5_saint_1',
  },
  {
    id: 'a2s5_saint_1',
    speaker: 'Saint',
    text: 'You have learned how to understand alchemy. But you have not yet learned how to wield it.',
    next: 'a2s5_father_2',
  },
  {
    id: 'a2s5_father_2',
    speaker: 'Father',
    text: 'Then what must I do?',
    next: 'a2s5_saint_2',
  },
  {
    id: 'a2s5_saint_2',
    speaker: 'Saint',
    text: 'There is a creature dwelling beyond these forests. A dragon, ancient and immensely powerful.',
    next: 'a2s5_father_3',
  },
  {
    id: 'a2s5_father_3',
    speaker: 'Father',
    text: 'A dragon?',
    next: 'a2s5_saint_3',
  },
  {
    id: 'a2s5_saint_3',
    speaker: 'Saint',
    text: 'It carries a power unlike anything you have encountered. Those who successfully hunt it and overcome its power may obtain a special ability associated with its nature.',
    next: 'a2s5_father_4',
  },
  {
    id: 'a2s5_father_4',
    speaker: 'Father',
    text: 'And this will make me strong enough?',
    next: 'a2s5_saint_4',
  },
  {
    id: 'a2s5_saint_4',
    speaker: 'Saint',
    text: 'Strength is not guaranteed. What you gain will depend on the nature of the creature and what you are capable of mastering.',
    onEnter: ['dragon_quest_started'],
  },
];
