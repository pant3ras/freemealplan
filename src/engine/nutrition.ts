import { isLowFodmap } from './fodmap';
import { INGREDIENTS } from '../data/ingredients';
import { RECIPE_MAP } from '../data/recipes';
import { DIFFICULTIES, type Allergen, type Diet, type FoodGroup, type Ingredient, type Nutrients, type Profile, type Recipe, type Slot } from '../data/types';

/** On weekends (if allowed) recipes up to this long can be planned — slow braises, proper sarmale. */
export const WEEKEND_MINUTES = 300;

export const ZERO: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

export function add(a: Nutrients, b: Nutrients, k = 1): Nutrients {
  return {
    kcal: a.kcal + b.kcal * k,
    protein: a.protein + b.protein * k,
    carbs: a.carbs + b.carbs * k,
    fat: a.fat + b.fat * k,
    fiber: a.fiber + b.fiber * k,
  };
}

export function ingredient(id: string): Ingredient {
  const i = INGREDIENTS[id];
  if (!i) throw new Error(`Unknown ingredient ${id}`);
  return i;
}

export function recipeById(id: string): Recipe {
  const r = RECIPE_MAP[id];
  if (!r) throw new Error(`Unknown recipe ${id}`);
  return r;
}

export function nutrientsOf(lines: { id: string; g: number }[]): Nutrients {
  return lines.reduce((acc, l) => add(acc, ingredient(l.id).per100, l.g / 100), ZERO);
}

/**
 * Lean protein sources (≥ 45 % of their calories from protein) are the ingredients the
 * planner may portion up more than the rest of the dish to reach a protein floor.
 */
export function isLean(id: string): boolean {
  const n = ingredient(id).per100;
  return n.kcal > 0 && (n.protein * 4) / n.kcal >= 0.45;
}

export interface RecipeSplit {
  lean: Nutrients;
  rest: Nutrients;
}

const splitCache = new Map<string, RecipeSplit>();

/** Call after recipes or ingredients change at runtime (the user edited their own). */
export function clearNutritionCache(): void {
  splitCache.clear();
}

export function recipeSplit(id: string): RecipeSplit {
  let s = splitCache.get(id);
  if (!s) {
    const r = recipeById(id);
    s = {
      lean: nutrientsOf(r.ingredients.filter((l) => isLean(l.id))),
      rest: nutrientsOf(r.ingredients.filter((l) => !isLean(l.id))),
    };
    splitCache.set(id, s);
  }
  return s;
}

export function recipeBase(id: string): Nutrients {
  const s = recipeSplit(id);
  return add(s.lean, s.rest);
}

export function recipeAllergens(r: Recipe): Allergen[] {
  return [...new Set(r.ingredients.flatMap((l) => ingredient(l.id).allergens))];
}

export function recipeGroups(r: Recipe): Set<FoodGroup> {
  return new Set(r.ingredients.map((l) => ingredient(l.id).group));
}

const MEAT: FoodGroup[] = ['pork', 'red-meat', 'poultry'];
const SEA: FoodGroup[] = ['fish', 'seafood'];
const ANIMAL: FoodGroup[] = [...MEAT, ...SEA, 'dairy', 'egg', 'honey'];

export function fitsDiet(r: Recipe, diet: Diet): boolean {
  const g = recipeGroups(r);
  const has = (list: FoodGroup[]) => list.some((x) => g.has(x));
  switch (diet) {
    case 'omnivore':
      return true;
    case 'pescatarian':
      return !has(MEAT);
    case 'vegetarian':
      return !has(MEAT) && !has(SEA);
    case 'vegan':
      return !has(ANIMAL);
  }
}

export function carbShare(n: Nutrients): number {
  return n.kcal > 0 ? (n.carbs * 4) / n.kcal : 0;
}

export function proteinShare(n: Nutrients): number {
  return n.kcal > 0 ? (n.protein * 4) / n.kcal : 0;
}

/** Hard filters: anything that would make a meal unsafe or unwanted. */
export function isEligible(r: Recipe, p: Profile, slot: Slot): boolean {
  if (!r.slots.includes(slot)) return false;
  if (p.bannedRecipes.includes(r.id)) return false;
  // With soup as its own course, a soup isn't also served as lunch or dinner.
  if ((slot === 'lunch' || slot === 'dinner') && r.slots.includes('soup') && p.slots.includes('soup')) return false;
  // Weekday limit is hands-on time: an overnight soak or a long braise is fine if you're not stirring it.
  // Long total times are only allowed when weekend cooking is on (planner places them on weekends).
  const longWeekend = p.weekendCooking && r.minutes <= WEEKEND_MINUTES;
  if (slot !== 'snack' && r.activeMinutes > p.maxMinutes && !longWeekend) return false;
  if (DIFFICULTIES.indexOf(r.difficulty) > DIFFICULTIES.indexOf(p.skill)) return false;
  if (!fitsDiet(r, p.diet)) return false;
  const groups = recipeGroups(r);
  const allergens = recipeAllergens(r);
  if (p.halal && groups.has('pork')) return false;
  for (const x of p.exclude) {
    if (x === 'pork' && groups.has('pork')) return false;
    if (x === 'red-meat' && groups.has('red-meat')) return false;
    if (x === 'dairy' && groups.has('dairy')) return false;
    if (x === 'gluten' && allergens.includes('gluten')) return false;
    if (x === 'egg' && allergens.includes('eggs')) return false;
    if (x === 'nuts' && (allergens.includes('nuts') || allergens.includes('peanuts'))) return false;
  }
  if (allergens.some((a) => p.allergens.includes(a))) return false;
  if (r.ingredients.some((l) => p.dislikes.includes(l.id))) return false;
  return true;
}

export function recipeBadges(r: Recipe): string[] {
  const out: string[] = [];
  if (fitsDiet(r, 'vegan')) out.push('Vegan');
  else if (fitsDiet(r, 'vegetarian')) out.push('Vegetarian');
  else if (fitsDiet(r, 'pescatarian')) out.push('Pescatarian');
  const allergens = recipeAllergens(r);
  if (!allergens.includes('gluten')) out.push('Gluten-free');
  if (!recipeGroups(r).has('dairy')) out.push('Dairy-free');
  const base = recipeBase(r.id);
  if (proteinShare(base) >= 0.3) out.push('High protein');
  if (carbShare(base) <= 0.3) out.push('Low carb');
  if (isLowFodmap(r)) out.push('Low FODMAP');
  return out;
}
