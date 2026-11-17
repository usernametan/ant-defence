import type { DialogueSource } from './types';

/**
 * TEMP — placeholder Act 1 dialogue owned by the OpenCode track.
 *
 * Antigravity owns `src/dialogue/scripts/`. Until those scripts are merged,
 * this module drives every village beat. `dialogueSource.ts` is the single
 * swap point: point it at the real scripts module and keep the same
 * `DialogueSource` shape.
 *
 * Node ids are stable and referenced by VillageScene:
 *  - son_intro / son_after
 *  - villager_potter / villager_elder / villager_child
 *  - masked_appear (met_masked_man, then fight)
 *  - first_defeat (end of Act 1)
 */
export const ACT1_SCRIPTS: DialogueSource = {
  son_intro: {
    id: 'son_intro',
    entry: 'son_1',
    nodes: {
      son_1: {
        id: 'son_1',
        speaker: 'AARAV',
        text: 'Baba! The old well is humming again. Like a bee trapped under the stone.',
        next: 'son_2',
      },
      son_2: {
        id: 'son_2',
        speaker: 'FATHER',
        text: 'The light is turning, beta. Stay close to the hut.',
        choices: [
          { text: 'Show me the well.', next: 'son_eager' },
          { text: 'Finish your sweeping first.', next: 'son_wait' },
        ],
      },
      son_eager: {
        id: 'son_eager',
        speaker: 'AARAV',
        text: 'It is louder when the sun goes down. Come quickly!',
        onEnter: ['village_intro'],
      },
      son_wait: {
        id: 'son_wait',
        speaker: 'AARAV',
        text: 'But baba... it only sings at dusk.',
        next: 'son_wait_2',
        onEnter: ['village_intro'],
      },
      son_wait_2: {
        id: 'son_wait_2',
        speaker: 'FATHER',
        text: 'Then we go now. Stay behind me.',
      },
    },
  },

  son_after: {
    id: 'son_after',
    entry: 'son_after_1',
    nodes: {
      son_after_1: {
        id: 'son_after_1',
        speaker: 'AARAV',
        text: 'The well has gone quiet, baba. Why is the sky purple?',
        next: 'son_after_2',
      },
      son_after_2: {
        id: 'son_after_2',
        speaker: 'FATHER',
        text: 'Go inside. Lock the door. I will be right behind you.',
      },
    },
  },

  villager_potter: {
    id: 'villager_potter',
    entry: 'potter_1',
    nodes: {
      potter_1: {
        id: 'potter_1',
        speaker: 'POTTER MAYA',
        text: 'Clay remembers every hand that shapes it. Be careful what you teach it.',
        next: 'potter_2',
      },
      potter_2: {
        id: 'potter_2',
        speaker: 'POTTER MAYA',
        text: 'If the river rises tonight, my pots will swim before I do.',
      },
    },
  },

  villager_elder: {
    id: 'villager_elder',
    entry: 'elder_1',
    nodes: {
      elder_1: {
        id: 'elder_1',
        speaker: 'ELDER RAMA',
        text: 'A masked rider was seen at the north ridge before dawn. He did not cast a shadow.',
        choices: [
          { text: 'Ask what he wants.', next: 'elder_ask' },
          { text: 'Leave the old man be.', next: 'elder_leave' },
        ],
      },
      elder_ask: {
        id: 'elder_ask',
        speaker: 'ELDER RAMA',
        text: 'They say he collects children with the sight. Keep your boy close tonight.',
      },
      elder_leave: {
        id: 'elder_leave',
        speaker: 'ELDER RAMA',
        text: 'Wise. Some questions bite the hand that asks them.',
      },
    },
  },

  villager_child: {
    id: 'villager_child',
    entry: 'child_1',
    nodes: {
      child_1: {
        id: 'child_1',
        speaker: 'MEERA',
        text: 'Have you seen my goat? She has one gold horn and a very bad attitude.',
        next: 'child_2',
      },
      child_2: {
        id: 'child_2',
        speaker: 'MEERA',
        text: 'I named her Marigold. She eats the marigolds. It is a whole thing.',
      },
    },
  },

  masked: {
    id: 'masked',
    entry: 'masked_1',
    nodes: {
      masked_1: {
        id: 'masked_1',
        speaker: 'MASKED MAN',
        text: 'The boy carries the mark. Hand him to me, alchemist, and the village may keep its dawn.',
        next: 'masked_2',
        onEnter: ['met_masked_man'],
      },
      masked_2: {
        id: 'masked_2',
        speaker: 'FATHER',
        text: 'You will not touch my son.',
        next: 'masked_3',
      },
      masked_3: {
        id: 'masked_3',
        speaker: 'MASKED MAN',
        text: 'Then learn what the dusk is for.',
      },
    },
  },

  first_defeat: {
    id: 'first_defeat',
    entry: 'defeat_1',
    nodes: {
      defeat_1: {
        id: 'defeat_1',
        speaker: 'AARAV  (far away)',
        text: 'Baba... it is so cold up here...',
        next: 'defeat_2',
      },
      defeat_2: {
        id: 'defeat_2',
        speaker: 'FATHER',
        text: 'AARAV!',
        next: 'defeat_3',
      },
      defeat_3: {
        id: 'defeat_3',
        speaker: 'NARRATOR',
        text: 'The masked man folds the dusk around them both. The village holds its breath, and the last warm light goes out.',
      },
    },
  },
};
