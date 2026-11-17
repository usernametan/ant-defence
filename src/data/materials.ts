import type { Material } from '../shared/types';

export const materials: Material[] = [
  {
    id: 'turmeric',
    name: 'Turmeric (Haldi)',
    description:
      'Golden rhizome rich in curcumin, a natural acid-base indicator that turns deep crimson in alkaline solutions.',
    tags: ['inert', 'luminous'],
    icon: 'icon:turmeric',
  },
  {
    id: 'lime',
    name: 'Slaked Lime (Chuna)',
    description:
      'Calcium hydroxide prepared from burnt limestone or shells, forming a strongly alkaline paste in water.',
    tags: ['basic'],
    icon: 'icon:lime',
  },
  {
    id: 'tamarind',
    name: 'Tamarind (Imli)',
    description:
      'Tangy fruit pulp rich in tartaric acid, capable of dissolving metal oxides and neutralizing alkalis.',
    tags: ['acidic'],
    icon: 'icon:tamarind',
  },
  {
    id: 'camphor',
    name: 'Camphor (Karpura)',
    description:
      'Aromatic crystalline terpene that sublimates readily at room temperature and burns with a bright, clean flame.',
    tags: ['flammable', 'volatile'],
    icon: 'icon:camphor',
  },
  {
    id: 'sulfur',
    name: 'Sulfur (Gandhaka)',
    description:
      'Yellow volcanic mineral that ignites easily into acrid fumes and binds eagerly with metals.',
    tags: ['flammable', 'toxic'],
    icon: 'icon:sulfur',
  },
  {
    id: 'salt',
    name: 'Rock Salt (Saindhava)',
    description:
      'Crystalline sodium chloride mined from ancient beds, forming an electrically conductive electrolyte when dissolved.',
    tags: ['conductive', 'inert'],
    icon: 'icon:salt',
  },
  {
    id: 'alum',
    name: 'Alum (Phitkari)',
    description:
      'Double sulfate salt that acts as a mild acid, clarifier, and oxidizing mordant in traditional Rasashastra.',
    tags: ['acidic', 'oxidizing'],
    icon: 'icon:alum',
  },
  {
    id: 'copper',
    name: 'Copper (Tamra)',
    description:
      'Ductile reddish metal prized for high electrical conductivity and its vivid green-blue salts.',
    tags: ['conductive'],
    icon: 'icon:copper',
  },
  {
    id: 'iron',
    name: 'Iron (Loha)',
    description:
      'Magnetic, conductive metal that readily exchanges electrons in redox reactions and passivates in certain salts.',
    tags: ['conductive'],
    icon: 'icon:iron',
  },
  {
    id: 'neem',
    name: 'Neem (Nimba)',
    description:
      'Bitter medicinal leaf extract containing azadirachtin, harmless to healers in balm yet toxic to pests.',
    tags: ['toxic'],
    icon: 'icon:neem',
  },
  {
    id: 'ash',
    name: 'Sacred Ash (Bhasma)',
    description:
      'Calcined plant ash rich in potassium carbonate, yielding a mild alkaline solution when mixed with moisture.',
    tags: ['basic', 'inert'],
    icon: 'icon:ash',
  },
  {
    id: 'honey',
    name: 'Forest Honey (Madhu)',
    description:
      'Viscous, hygroscopic nectar whose low water activity and natural enzymes preserve medicinal extracts.',
    tags: ['inert'],
    icon: 'icon:honey',
  },
  {
    id: 'mercury',
    name: 'Mercury (Parada)',
    description:
      'Dense liquid metal that conducts current, forms amalgams with other metals, and releases toxic vapor when heated.',
    tags: ['toxic', 'volatile', 'conductive'],
    icon: 'icon:mercury',
  },
  {
    id: 'suryakanti',
    name: 'Suryakanti Stone',
    description:
      'Rare photoluminescent mineral that absorbs sunlight and releases stored energy as a steady golden glow.',
    tags: ['luminous', 'oxidizing'],
    icon: 'icon:suryakanti',
  },
];
