import type { Recipe } from '../types';
import { AMERICAS_INDIA_MIDEAST } from './americas-india-mideast';
import { ASIAN } from './asian';
import { DESSERTS } from './desserts';
import { EVERYDAY } from './everyday';
import { ITALIAN_GREEK_MED } from './italian-greek-med';
import { MORE_AMERICAS } from './more-americas';
import { MORE_ASIA } from './more-asia';
import { MORE_EUROPE } from './more-europe';
import { MORE_INDIA_MIDEAST } from './more-india-mideast';
import { MORE_LOWFODMAP } from './more-lowfodmap';
import { ROMANIAN } from './romanian';

/** The full recipe book. Each entry replaces any older recipe with the same id. */
export const RECIPE_BOOK: Recipe[] = [
  ...ROMANIAN,
  ...ITALIAN_GREEK_MED,
  ...ASIAN,
  ...AMERICAS_INDIA_MIDEAST,
  ...EVERYDAY,
  ...DESSERTS,
  ...MORE_EUROPE,
  ...MORE_ASIA,
  ...MORE_AMERICAS,
  ...MORE_INDIA_MIDEAST,
  ...MORE_LOWFODMAP,
];
