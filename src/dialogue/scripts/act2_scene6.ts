import type { DialogueNode } from '../../shared/types';

export const act2Scene6: DialogueNode[] = [
  {
    id: 'a2s6_saint_1',
    speaker: 'Saint',
    text: 'Wait.',
    next: 'a2s6_father_1',
  },
  {
    id: 'a2s6_father_1',
    speaker: 'Father',
    text: 'What is this?',
    next: 'a2s6_saint_2',
  },
  {
    id: 'a2s6_saint_2',
    speaker: 'Saint',
    text: 'An alchemical gauntlet. It will help you channel and control the reactions you have learned.',
    onEnter: ['received_gauntlet'],
    next: 'a2s6_saint_3',
  },
  {
    id: 'a2s6_saint_3',
    speaker: 'Saint',
    text: 'Without control, knowledge can become your greatest enemy.',
    next: 'a2s6_father_2',
  },
  {
    id: 'a2s6_father_2',
    speaker: 'Father',
    text: 'Why are you helping me?',
    next: 'a2s6_saint_4',
  },
  {
    id: 'a2s6_saint_4',
    speaker: 'Saint',
    text: 'I am not giving you power. I am giving you the means to discover it.',
    next: 'a2s6_father_3',
  },
  {
    id: 'a2s6_father_3',
    speaker: 'Father',
    text: 'I will return.',
    next: 'a2s6_saint_5',
  },
  {
    id: 'a2s6_saint_5',
    speaker: 'Saint',
    text: 'Do not return merely stronger. Return wiser.',
    next: 'a2s6_gauntlet_glow',
  },
  {
    id: 'a2s6_gauntlet_glow',
    speaker: 'Narrator',
    text: 'You slip on the brass gauntlet. Its etched symbols flare briefly, and you turn toward the distant mountains.',
    next: 'a2s6_father_4',
  },
  {
    id: 'a2s6_father_4',
    speaker: 'Father',
    text: 'Hold on, my son. I am coming.',
  },
];
