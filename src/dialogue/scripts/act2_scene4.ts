import type { DialogueNode } from '../../shared/types';

export const act2Scene4: DialogueNode[] = [
  {
    id: 'a2s4_father_1',
    speaker: 'Father',
    text: 'And how will this help me defeat that man?',
    next: 'a2s4_saint_1',
  },
  {
    id: 'a2s4_saint_1',
    speaker: 'Saint',
    text: 'You are asking how to fight before learning how to understand.',
    next: 'a2s4_father_2',
  },
  {
    id: 'a2s4_father_2',
    speaker: 'Father',
    text: "I don't have time for endless lessons. My son is out there!",
    next: 'a2s4_saint_2',
  },
  {
    id: 'a2s4_saint_2',
    speaker: 'Saint',
    text: 'And rushing blindly will only lead you to another defeat.',
    next: 'a2s4_lesson_hub',
  },
  {
    id: 'a2s4_lesson_hub',
    speaker: 'Saint',
    text: 'Three pillars govern all alchemy: Matter, Reaction, and Transformation. Which lesson will you study?',
    choices: [
      { text: '1. Matter — Understanding the substances around you', next: 'a2s4_matter_1' },
      { text: '2. Reaction — Understanding how substances interact', next: 'a2s4_reaction_1' },
      { text: '3. Transformation — Learning how one substance becomes another', next: 'a2s4_transformation_1' },
      { text: 'I am ready to conclude the lesson.', next: 'a2s4_closing' },
    ],
  },
  {
    id: 'a2s4_matter_1',
    speaker: 'Saint',
    text: 'Matter: every herb, salt, and ore carries distinct properties. Some are acidic like tamarind, some basic like lime, others volatile like camphor or luminous like Suryakanti.',
    next: 'a2s4_matter_2',
  },
  {
    id: 'a2s4_matter_2',
    speaker: 'Saint',
    text: 'Before you combine two reagents, read their nature. True sight begins with knowing what each substance already holds.',
    onEnter: ['learned_matter'],
    next: 'a2s4_lesson_hub',
  },
  {
    id: 'a2s4_reaction_1',
    speaker: 'Saint',
    text: 'Reaction: when opposing natures meet, energy is released or balanced. Acid and base neutralize; fuel and oxidizer ignite into flame.',
    next: 'a2s4_reaction_2',
  },
  {
    id: 'a2s4_reaction_2',
    speaker: 'Saint',
    text: 'Even a gentle indicator like turmeric shifts to kumkum red in lime, revealing hidden alkalinity where none seemed present.',
    onEnter: ['learned_reaction'],
    next: 'a2s4_lesson_hub',
  },
  {
    id: 'a2s4_transformation_1',
    speaker: 'Saint',
    text: 'Transformation: under heat, moisture, or a catalyst, substances rearrange into new forms—tarnished copper yields verdigris, salt and alum crystallize into stone.',
    next: 'a2s4_transformation_2',
  },
  {
    id: 'a2s4_transformation_2',
    speaker: 'Saint',
    text: 'Nothing is destroyed or conjured from void; matter merely trades its bonds to serve a new purpose.',
    onEnter: ['learned_transformation'],
    next: 'a2s4_lesson_hub',
  },
  {
    id: 'a2s4_closing',
    speaker: 'Saint',
    text: 'Remember this. Alchemy is not about creating something from nothing. It is about understanding what already exists and learning what it can become.',
  },
];
