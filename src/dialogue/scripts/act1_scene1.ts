import type { DialogueNode } from '../../shared/types';

export const act1Scene1: DialogueNode[] = [
  {
    id: 'a1s1_intro',
    speaker: 'Narrator',
    text: 'An ancient Indian village surrounded by forests, rivers, and mountains. Sunlight warms the courtyard.',
    onEnter: ['village_intro'],
    next: 'a1s1_son_1',
  },
  {
    id: 'a1s1_son_1',
    speaker: 'Son',
    text: 'Father! Father! Look what I found!',
    next: 'a1s1_father_1',
  },
  {
    id: 'a1s1_father_1',
    speaker: 'Father',
    text: 'What is it this time?',
    next: 'a1s1_son_2',
  },
  {
    id: 'a1s1_son_2',
    speaker: 'Son',
    text: 'A stone! Look, it shines when the sunlight touches it!',
    next: 'a1s1_father_2',
  },
  {
    id: 'a1s1_father_2',
    speaker: 'Father',
    text: 'Haha! You find treasures in the strangest places.',
    next: 'a1s1_son_3',
  },
  {
    id: 'a1s1_son_3',
    speaker: 'Son',
    text: 'When I grow up, I want to be strong like you.',
    next: 'a1s1_father_3',
  },
  {
    id: 'a1s1_father_3',
    speaker: 'Father',
    text: 'Then remember one thing, my son. Strength is not about how hard you can strike. It is about what you choose to protect.',
  },
];

export const act1Villager1: DialogueNode[] = [
  {
    id: 'a1_villager_1',
    speaker: 'Village Herbalist',
    text: 'Fresh turmeric and neem from the riverbank! Boil them together and even the worst fever yields.',
  },
];

export const act1Villager2: DialogueNode[] = [
  {
    id: 'a1_villager_2',
    speaker: 'Village Potter',
    text: 'The river clay dries fast today. Keep tamarind water handy if you need to scrub verdigris off your copper pots.',
  },
];

export const act1Villager3: DialogueNode[] = [
  {
    id: 'a1_villager_3',
    speaker: 'Village Elder',
    text: 'Your boy has sharp eyes—that glowing pebble looks like Suryakanti stone from the high ridge. Rare, even in tales.',
  },
];
