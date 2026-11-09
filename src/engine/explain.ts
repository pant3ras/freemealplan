import { quoteFor, type StoreChoice } from '../data/prices';
import { RECIPES } from '../data/recipes';
import type { Profile, Recipe, Slot, WeekPlan } from '../data/types';
import type { CookSession } from './cooking';
import { ingredient, proteinShare, recipeBase } from './nutrition';
import type { MealView } from './week';

export type Reason =
  | { kind: 'batch'; meals: number }
  | { kind: 'leftover'; cookedDay: number }
  | { kind: 'soupPot'; meals: number }
  | { kind: 'theme' }
  | { kind: 'home'; ids: string[] }
  | { kind: 'favorite' }
  | { kind: 'protein'; share: number }
  | { kind: 'budget' }
  | { kind: 'quick' }
  | { kind: 'weekend' };

const costCache = new Map<string, number>();

/** Food cost of one standard serving at the chosen store (what the meal's ingredients are worth, not whole packs). */
export function servingCost(r: Recipe, store: StoreChoice): number {
  const key = `${store}:${r.id}`;
  let c = costCache.get(key);
  if (c === undefined) {
    c = r.ingredients.reduce((sum, l) => {
      const ing = ingredient(l.id);
      return ing.staple ? sum : sum + quoteFor(ing, l.g, store).food;
    }, 0);
    costCache.set(key, c);
  }
  return c;
}

/** The cheapest third of recipes for a slot counts as "budget-friendly". */
function cheapThreshold(slot: Slot, store: StoreChoice): number {
  const costs = RECIPES.filter((r) => r.slots.includes(slot))
    .map((r) => servingCost(r, store))
    .sort((a, b) => a - b);
  return costs[Math.floor(costs.length / 3)] ?? 0;
}

/** Why the planner put this dish here — shown as small chips under each meal. */
export function mealReasons(meal: MealView, sessions: CookSession[], plan: WeekPlan, p: Profile): Reason[] {
  const out: Reason[] = [];
  const r = meal.recipe;
  const session = sessions.find((s) => s.meals.includes(meal));
  if (session && session.meals.length > 1) {
    if (session.meals[0] === meal) out.push(meal.slot === 'soup' ? { kind: 'soupPot', meals: session.meals.length } : { kind: 'batch', meals: session.meals.length });
    else out.push({ kind: 'leftover', cookedDay: session.dayIndex });
  }
  if (plan.cuisines?.includes(r.cuisine)) out.push({ kind: 'theme' });
  const home = [...new Set(r.ingredients.map((l) => l.id).filter((id) => plan.useUp?.includes(id)))];
  if (home.length) out.push({ kind: 'home', ids: home });
  if (p.favorites.includes(r.id)) out.push({ kind: 'favorite' });
  const share = proteinShare(recipeBase(r.id));
  if (share >= 0.3) out.push({ kind: 'protein', share });
  if (servingCost(r, p.store) <= cheapThreshold(meal.slot, p.store)) out.push({ kind: 'budget' });
  if (r.activeMinutes > p.maxMinutes) out.push({ kind: 'weekend' });
  else if (r.activeMinutes <= 20 && meal.slot !== 'snack') out.push({ kind: 'quick' });
  return out;
}
