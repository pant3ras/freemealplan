import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../data/ingredients';
import { RECIPES } from '../data/recipes';
import type { Profile } from '../data/types';
import { cookSessions } from './cooking';
import { DEFAULT_PANTRY, DEFAULT_PROFILE } from './defaults';
import { fitsDiet, isEligible, recipeAllergens } from './nutrition';
import { cuisineOptions, generatePlan, reconcile, regenerateFrom, setMeal, swapOptions } from './planner';
import { CHAIN_IDS, quote, storePrice } from '../data/prices';
import { buildShoppingList, compareStores } from './shopping';
import { computeTargets } from './targets';
import { buildWeek } from './week';
import { kitchenMatches, matchRecipe, useUpList } from './kitchen';

const profile = (patch: Partial<Profile> = {}): Profile => ({ ...DEFAULT_PROFILE, ...patch });

describe('data', () => {
  it('every recipe ingredient exists', () => {
    for (const r of RECIPES) for (const l of r.ingredients) expect(INGREDIENTS[l.id], `${r.id} → ${l.id}`).toBeDefined();
  });
  it('every ingredient carries a USDA FoodData Central record, or is marked as an estimate', () => {
    for (const ing of Object.values(INGREDIENTS)) {
      // Estimated ingredients (no USDA key yet) use fdc.id 0 and are checked by the Atwater rule below.
      if (ing.fdc?.id !== 0) expect(ing.fdc?.id, ing.id).toBeGreaterThan(100000);
      expect(ing.per100.kcal, ing.id).toBeGreaterThan(0);
      if (ing.fdc?.id === 0) continue; // estimates have no Atwater check (alcohol and rounding make it unreliable)
      // Atwater sanity check (fibre at ~2 kcal/g): within 15 % + 20 kcal of the record's energy.
      const { protein, carbs, fat, fiber } = ing.per100;
      const atwater = protein * 4 + Math.max(0, carbs - fiber) * 4 + fiber * 2 + fat * 9;
      expect(Math.abs(atwater - ing.per100.kcal), ing.id).toBeLessThan(ing.per100.kcal * 0.15 + 20);
    }
  });
  it('recipe ids are unique', () => {
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
  });
});

describe('targets', () => {
  it('follows Mifflin–St Jeor for a 84 kg / 180 cm / 32 y male, active, losing fat', () => {
    const t = computeTargets(profile());
    // BMR = 840 + 1125 − 160 + 5 = 1810; × 1.55 = 2805.5; × 0.8 = 2244.4 → 2250
    expect(t.kcal).toBe(2250);
    // BMI-25 weight = 81 kg → 178.6 lb × 1 g → 180 g; ceiling 0.35×2250/4 = 196.9 → 195
    expect(t.protein).toBe(180);
    expect(t.kcalMin).toBe(2138);
  });
  it('caps protein at 35 % of calories', () => {
    const t = computeTargets(profile({ sex: 'female', weightKg: 60, heightCm: 165, age: 50, activity: 1.2 }));
    expect(t.protein * 4).toBeLessThanOrEqual(0.35 * t.kcal + 20);
  });
  it('uses custom targets when given', () => {
    const t = computeTargets(profile({ customTargets: { kcal: 2000, protein: 150 } }));
    expect([t.kcal, t.protein, t.custom]).toEqual([2000, 150, true]);
  });
});

describe('planner', () => {
  it('builds a full week where most days clear the protein floor', () => {
    const p = profile();
    const plan = generatePlan(p, 42);
    expect(plan.days).toHaveLength(7);
    expect(plan.days.every((d) => d.meals.length === 5 && d.meals.some((m) => m.slot === 'soup'))).toBe(true);
    const week = buildWeek(plan, p, computeTargets(p));
    const ok = week.filter((d) => d.status === 'ok').length;
    expect(ok).toBeGreaterThanOrEqual(6);
  });

  it('never plans something the diet or allergens forbid', () => {
    const p = profile({ diet: 'vegan', allergens: ['soy'], slots: ['breakfast', 'lunch', 'dinner'] });
    const plan = generatePlan(p, 7);
    for (const d of plan.days)
      for (const m of d.meals) {
        const r = RECIPES.find((x) => x.id === m.recipeId)!;
        expect(fitsDiet(r, 'vegan')).toBe(true);
        expect(recipeAllergens(r)).not.toContain('soy');
      }
  });

  it('reuses dishes when meal-prep repetition is chosen', () => {
    const p = profile({ repetition: 'mealprep' });
    const plan = generatePlan(p, 3);
    const distinct = new Set(plan.days.flatMap((d) => d.meals.map((m) => m.recipeId))).size;
    expect(distinct).toBeLessThanOrEqual(14);
  });

  it('keeps locked meals when regenerating the rest of the week', () => {
    const p = profile();
    let plan = generatePlan(p, 11);
    plan = setMeal(plan, 3, 2, { locked: true });
    const locked = plan.days[3].meals[2].recipeId;
    const next = regenerateFrom(plan, p, 2, 99);
    expect(next.days[3].meals[2].recipeId).toBe(locked);
    expect(next.days[0]).toEqual(plan.days[0]);
  });

  it('replaces meals that use a newly disliked ingredient', () => {
    const p = profile();
    const plan = generatePlan(p, 5);
    const used = plan.days[0].meals[1].recipeId;
    const ing = RECIPES.find((r) => r.id === used)!.ingredients[0].id;
    const p2 = profile({ dislikes: [ing] });
    const next = reconcile(plan, p2, 6);
    for (const d of next.days) for (const m of d.meals) expect(isEligible(RECIPES.find((r) => r.id === m.recipeId)!, p2, m.slot)).toBe(true);
  });

  it('resizes to fewer days and drops a slot', () => {
    const plan = generatePlan(profile(), 8);
    const next = reconcile(plan, profile({ days: 5, slots: ['lunch', 'dinner'] }), 9);
    expect(next.days).toHaveLength(5);
    expect(next.days.every((d) => d.meals.map((m) => m.slot).join() === 'lunch,dinner')).toBe(true);
  });

  it('builds lunches and dinners around the swiped cuisines', () => {
    const p = profile();
    const plan = generatePlan(p, 31, ['Italian', 'Chinese']);
    const mains = plan.days.flatMap((d) => d.meals.filter((m) => m.slot === 'lunch' || m.slot === 'dinner'));
    const cuisines = mains.map((m) => RECIPES.find((r) => r.id === m.recipeId)!.cuisine);
    expect(cuisines.filter((c) => c === 'Italian' || c === 'Chinese').length).toBeGreaterThanOrEqual(mains.length - 2);
    expect(cuisines).toContain('Italian');
    expect(cuisines).toContain('Chinese');
    expect(plan.cuisines).toEqual(['Italian', 'Chinese']);
  });

  it('offers a swipe card only for cuisines with dishes that fit', () => {
    const vegan = cuisineOptions(profile({ diet: 'vegan' }));
    for (const recipes of vegan.values()) for (const r of recipes) expect(fitsDiet(r, 'vegan')).toBe(true);
    expect(cuisineOptions(profile()).get('Italian')!.length).toBeGreaterThan(5);
  });

  it('offers swap alternatives ranked by fit', () => {
    const p = profile();
    const plan = generatePlan(p, 21);
    const opts = swapOptions(plan, p, 0, 2);
    expect(opts.length).toBeGreaterThan(5);
    expect(opts[0].penalty).toBeLessThanOrEqual(opts[opts.length - 1].penalty);
  });
});

describe('shopping & cooking', () => {
  it('buys whole packs and leaves staples in the pantry', () => {
    const p = profile();
    const plan = generatePlan(p, 4);
    const week = buildWeek(plan, p, computeTargets(p));
    for (const store of [...CHAIN_IDS, 'mix' as const]) {
      const list = buildShoppingList(week, DEFAULT_PANTRY, store);
      expect(list.checkout).toBeGreaterThanOrEqual(list.food - 0.01);
      const items = list.sections.flatMap((s) => s.aisles.flatMap((a) => a.items));
      for (const i of items) expect(i.quote.packGrams === null ? i.grams + i.quote.leftover : i.quote.packs * i.quote.packGrams).toBeGreaterThanOrEqual(i.grams - 0.01);
      expect(items.some((i) => i.ing.staple)).toBe(false);
    }
  });

  it('prices the mix no higher than any single chain', () => {
    const p = profile();
    const week = buildWeek(generatePlan(p, 4), p, computeTargets(p));
    const rows = compareStores(week, DEFAULT_PANTRY);
    const mix = rows.find((r) => r.store === 'mix')!;
    for (const r of rows) expect(mix.checkout).toBeLessThanOrEqual(r.checkout + 0.01);
  });

  it('falls back to an estimate when a chain does not report an item', () => {
    const ing = INGREDIENTS['oregano'];
    const q = quote(ing, 3, 'kaufland');
    expect(q.checkout).toBeGreaterThan(0);
    if (!storePrice('kaufland', 'oregano')) expect(q.estimated).toBe(true);
  });

  it('drops eaten-out meals from the list and adds household portions', () => {
    const p = profile({ household: [{ id: 'a', name: 'Ana', factor: 1 }] });
    const t = computeTargets(p);
    let plan = generatePlan(p, 4);
    const before = buildShoppingList(buildWeek(plan, p, t), [], 'lidl').food;
    plan = setMeal(plan, 0, 2, { eatenOut: true });
    const after = buildShoppingList(buildWeek(plan, p, t), [], 'lidl').food;
    expect(after).toBeLessThan(before);
    const solo = buildShoppingList(buildWeek(plan, profile(), t), [], 'lidl').food;
    expect(solo).toBeLessThan(after);
  });

  it('groups batch-cooked meals into one session', () => {
    const p = profile({ repetition: 'mealprep' });
    const week = buildWeek(generatePlan(p, 12), p, computeTargets(p));
    const sessions = cookSessions(week);
    const meals = week.reduce((s, d) => s + d.meals.length, 0);
    expect(sessions.length).toBeLessThan(meals);
  });
});

describe('cooking from what you have', () => {
  const home = [...DEFAULT_PANTRY, 'chicken-breast', 'rice', 'onion', 'carrot', 'bell-pepper', 'eggs'].filter((id) => INGREDIENTS[id]);

  it('ranks dishes by fewest things to buy, and ignores staples', () => {
    const list = kitchenMatches(profile(), home, 'all', 3);
    expect(list.length).toBeGreaterThan(0);
    for (let i = 1; i < list.length; i++) expect(list[i].missingMain.length).toBeGreaterThanOrEqual(list[i - 1].missingMain.length);
    for (const m of list) {
      expect(m.have.length).toBeGreaterThan(0);
      for (const id of [...m.have, ...m.missing]) expect(INGREDIENTS[id].staple).toBeFalsy();
    }
  });

  it('a full kitchen covers a dish completely', () => {
    const r = RECIPES[0];
    const m = matchRecipe(r, new Set(r.ingredients.map((l) => l.id)));
    expect(m.missing).toEqual([]);
    expect(m.coverage).toBe(1);
  });

  it('planning around the kitchen uses more of what you have', () => {
    const p = profile();
    const useUp = useUpList(home);
    expect(useUp).not.toContain('salt');
    const count = (plan: ReturnType<typeof generatePlan>) =>
      new Set(plan.days.flatMap((d) => d.meals.flatMap((m) => RECIPES.find((r) => r.id === m.recipeId)!.ingredients.map((l) => l.id))).filter((id) => useUp.includes(id))).size;
    const plain = generatePlan(p, 5);
    const around = generatePlan(p, 5, [], useUp);
    expect(around.useUp).toEqual(useUp);
    expect(count(around)).toBeGreaterThanOrEqual(count(plain));
    expect(count(around)).toBe(useUp.length);
  });
});
