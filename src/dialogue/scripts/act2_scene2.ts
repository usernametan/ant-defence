import type { DialogueNode } from '../../shared/types';

export const act2Scene2: DialogueNode[] = [
  {
    id: 'a2s2_saint_1',
    speaker: 'Saint',
    text: 'You have travelled a long way, yet your mind remains restless.',
    onEnter: ['met_saint'],
    next: 'a2s2_father_1',
  },
  {
    id: 'a2s2_father_1',
    speaker: 'Father',
    text: 'You know why I am here?',
    next: 'a2s2_saint_2',
  },
  {
    id: 'a2s2_saint_2',
    speaker: 'Saint',
    text: 'A man who walks into these woods carrying such sorrow does not come seeking shelter.',
    next: 'a2s2_father_2',
  },
  {
    id: 'a2s2_father_2',
    speaker: 'Father',
    text: 'A masked man took my son. He possessed powers I could not understand. I fought him, but my strength meant nothing.',
    next: 'a2s2_saint_3',
  },
  {
    id: 'a2s2_saint_3',
    speaker: 'Saint',
    text: 'And now you seek the same power?',
    next: 'a2s2_father_3',
  },
  {
    id: 'a2s2_father_3',
    speaker: 'Father',
    text: 'I seek the power to bring my son back.',
    next: 'a2s2_saint_4',
  },
  {
    id: 'a2s2_saint_4',
    speaker: 'Saint',
    text: 'Then you must first understand the force you are trying to fight.',
  },
];
