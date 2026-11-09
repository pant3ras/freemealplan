import { RECIPES } from '../data/recipes';
import type { Profile, Recipe, Slot } from '../data/types';
import { ingredient, isEligible } from './nutrition';

export interface KitchenMatch {
  recipe: Recipe;
  /** Non-staple ingredients you already have. */
  have: string[];
  /** Non-staple ingredients you'd still need to buy (main ones first). */
  missing: string[];
  /** The ones the dish is built on — anything above a garnish amount. */
  missingMain: string[];
  /** Share of the dish (by weight, staples left out) you can make from home. */
  coverage: number;
  /** At-home items that spoil within a week that this dish uses up. */
  perishables: string[];
}

/** Ingredients that go off within a week — the ones worth cooking first. */
export const isPerishable = (id: string) => ingredient(id).shelfDays <= 7;

/** Per serving, less than this is a garnish or aromatic (a clove of garlic, some herbs, a squeeze of lemon). */
const MINOR_GRAMS = 25;

export function matchRecipe(r: Recipe, home: Set<string>): KitchenMatch {
  const have: string[] = [];
  const missing: string[] = [];
  const main = new Set<string>();
  let total = 0;
  let got = 0;
  for (const l of r.ingredients) {
    const ing = ingredient(l.id);
    // Oil, salt, spices: everyone has them, so they don't decide anything.
    if (ing.staple) continue;
    total += l.g;
    if (home.has(l.id)) {
      got += l.g;
      if (!have.includes(l.id)) have.push(l.id);
    } else {
      if (!missing.includes(l.id)) missing.push(l.id);
      if (l.g >= MINOR_GRAMS) main.add(l.id);
    }
  }
  const missingMain = missing.filter((id) => main.has(id));
  return {
    recipe: r,
    have,
    missing: [...missingMain, ...missing.filter((id) => !main.has(id))],
    missingMain,
    coverage: total ? got / total : 0,
    perishables: have.filter(isPerishable),
  };
}

/**
 * Dishes you can make from what's at home, best first: fewest main things to buy, then
 * the most of the dish already in the kitchen, then the most fresh food used up.
 * Only dishes that use at least one thing you have are listed; `maxMissing` limits the
 * main ingredients still to buy (small garnishes don't count against it).
 */
export function kitchenMatches(p: Profile, home: string[], slot: Slot | 'all' = 'all', maxMissing = 3): KitchenMatch[] {
  const set = new Set(home);
  return RECIPES.filter((r) => (slot === 'all' ? r.slots.some((s) => isEligible(r, p, s)) : isEligible(r, p, slot)))
    .map((r) => matchRecipe(r, set))
    .filter((m) => m.have.length > 0 && m.missingMain.length <= maxMissing)
    .sort(
      (a, b) =>
        a.missingMain.length - b.missingMain.length ||
        b.coverage - a.coverage ||
        b.perishables.length - a.perishables.length ||
        b.have.length - a.have.length,
    );
}

/** Non-staple things at home — what "plan around my kitchen" tries to use up. */
export function useUpList(home: string[]): string[] {
  return home.filter((id) => {
    try {
      return !ingredient(id).staple;
    } catch {
      return false;
    }
  });
}
