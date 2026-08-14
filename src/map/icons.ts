import type { Poi, PoiCategory } from '../types';

const CATEGORY_ICONS: Record<PoiCategory, string> = {
  animal: '🦜', show: '🎭', food: '🍽️', toilets: '🚻',
  shop: '🛍️', info: 'ℹ️', water: '🚰', entrance: '🚪'
};

/**
 * Hand-curated per-POI icons keyed by OSM id — ids survive data rebuilds
 * (names and coordinates may shift with each OSM import). Covers every
 * animal enclosure so the map shows the animal actually on display there
 * instead of the generic park parrot.
 */
const POI_ICONS: Record<string, string> = {
  'node/347312075': '🦍',  // Gorillas
  'node/347312287': '🐧',  // Planet Penguin
  'node/347312606': '🦭',  // Sea Lions
  'node/347312713': '🐅',  // Tigers Island
  'node/667357972': '🐦',  // Katandra Treetops (walk-through aviary)
  'node/2652526870': '🐋', // Orca Ocean Show
  'node/2652526875': '🦜', // Loro Show (parrots — the one place the default fits)
  'node/2652526883': '🐠', // Acuario
  'node/3926074074': '🐊', // American Alligator
  'node/3926097588': '🦜', // Parrots
  'node/3931047335': '🦇', // Bat grotto
  'node/3931052397': '🐵', // Chimpanzees
  'node/3931078345': '🐿️', // Meerkat (closest emoji to the upright pose)
  'node/3931078468': '🐒', // Ring-tailed lemur
  'node/3931099460': '🦈', // Shark
  'node/3931130505': '🦝', // Red Panda (no red-panda emoji; raccoon is the stand-in)
  'node/3932900418': '🐆', // Jaguar
  'node/3932945933': '🌺', // Orchidarium
  'node/3932954380': '🐟', // Koi Carp
  'node/3940347557': '🦩', // Flamingos
  'node/3940354035': '🦦', // Otters
  'node/3940354788': '🐬', // Dolphins
  'node/3940355476': '🦥', // Two Toed Sloths
  'node/3940363713': '🐒', // Emperor Marmosets
  'node/3940371792': '🐜', // Anteaters (no anteater emoji; the ants hint at it)
  'node/3940403262': '🐢', // Giant tortoises
  'node/5792885920': '🦁', // Lions
  'node/5829604140': '🐾', // Animal Embassy (mixed ambassador animals)
  'node/11114140333': '🦁', // Lion's Kingdom
  'node/268100176': '🛕',  // Pueblo Thai (Thai village, not an enclosure)
  'way/389953812': '🎢'    // Orca-train roller-coaster
};

export const iconFor = (category: PoiCategory): string => CATEGORY_ICONS[category];

export const poiIcon = (poi: Pick<Poi, 'id' | 'category'>): string =>
  POI_ICONS[poi.id] ?? CATEGORY_ICONS[poi.category];
