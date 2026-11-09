import { INGREDIENT_LIST } from '../data/ingredients';
import type { Profile } from '../data/types';

export const DEFAULT_PROFILE: Profile = {
  goal: 'lose',
  sex: 'male',
  age: 32,
  heightCm: 180,
  weightKg: 84,
  activity: 1.55,
  customTargets: null,

  diet: 'omnivore',
  lowCarb: false,
  halal: false,
  exclude: [],
  allergens: [],
  dislikes: [],
  bannedRecipes: [],
  favorites: [],

  // Soup is a course of its own here, as on most Romanian tables: one pot covers ~3 days.
  slots: ['breakfast', 'soup', 'lunch', 'dinner', 'snack'],
  cuisines: [],
  maxMinutes: 60,
  weekendCooking: true,
  skill: 'hard',
  repetition: 'balanced',

  household: [],
  householdSlots: ['soup', 'lunch', 'dinner'],
  budget: 450,
  store: 'lidl',

  days: 7,
  startDay: 0,
};

/** Cupboard staples start out ticked as "already at home". */
export const DEFAULT_PANTRY = INGREDIENT_LIST.filter((i) => i.staple).map((i) => i.id);
