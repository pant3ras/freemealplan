import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../ingredients';
import type { Recipe } from '../types';

/*
 * Checks every file in src/data/recipe-book. Run just this with:
 *   npx vitest run src/data/recipe-book
 */
const modules = import.meta.glob<Record<string, unknown>>('./*.ts', { eager: true });
const files = Object.entries(modules)
  .filter(([path]) => !path.endsWith('.test.ts') && !path.endsWith('index.ts'))
  .map(([path, mod]) => ({ path, recipes: Object.values(mod).filter(Array.isArray).flat() as Recipe[] }));

function kcalAndProtein(r: Recipe) {
  let kcal = 0;
  let protein = 0;
  for (const l of r.ingredients) {
    const ing = INGREDIENTS[l.id];
    if (!ing) continue;
    kcal += (ing.per100.kcal * l.g) / 100;
    protein += (ing.per100.protein * l.g) / 100;
  }
  return { kcal, protein };
}

/** Plausible calories for one standard serving, by what the recipe is used for. */
function kcalRange(r: Recipe): [number, number] {
  const s = r.slots;
  if (s.includes('lunch') || s.includes('dinner')) return [300, 950];
  if (s.includes('breakfast')) return [250, 750];
  if (s.includes('soup')) return [120, 500];
  return [80, 380];
}

const allIds = files.flatMap((f) => f.recipes.map((r) => r.id));

describe('recipe book', () => {
  it('has unique ids across all files', () => {
    const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  for (const { path, recipes } of files)
    describe(path, () => {
      for (const r of recipes)
        it(r.id, () => {
          const unknown = r.ingredients.filter((l) => !INGREDIENTS[l.id]).map((l) => l.id);
          expect(unknown, 'unknown ingredient ids').toEqual([]);
          expect(r.name.en.length, 'English name').toBeGreaterThan(2);
          expect(r.name.ro.length, 'Romanian name').toBeGreaterThan(2);
          expect(r.steps.ro.length, 'same number of en/ro steps').toBe(r.steps.en.length);
          expect(r.steps.en.length, 'steps').toBeGreaterThanOrEqual(r.difficulty === 'easy' ? 3 : 5);
          for (const x of r.extras) expect(x.ro.length && x.en.length, 'extras in both languages').toBeTruthy();
          if (r.tip) expect(r.tip.ro.length && r.tip.en.length, 'tip in both languages').toBeTruthy();
          expect(r.activeMinutes, 'active ≤ total minutes').toBeLessThanOrEqual(r.minutes);
          expect(r.slots.length).toBeGreaterThan(0);
          if (r.slots.includes('soup')) expect(r.keepsDays, 'a soup pot should keep 3+ days').toBeGreaterThanOrEqual(3);
          const { kcal } = kcalAndProtein(r);
          const [lo, hi] = kcalRange(r);
          expect(kcal, `kcal per serving (${Math.round(kcal)})`).toBeGreaterThanOrEqual(lo);
          expect(kcal, `kcal per serving (${Math.round(kcal)})`).toBeLessThanOrEqual(hi);
          for (const l of r.ingredients) expect(l.g, `${l.id} grams`).toBeGreaterThan(0);
        });
    });
});
