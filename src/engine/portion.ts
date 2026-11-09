import type { Ingredient, Nutrients, Slot } from '../data/types';
import { add, ingredient, isLean, nutrientsOf, recipeById, recipeSplit, ZERO } from './nutrition';

/** Overall portion multiplier relative to the recipe's standard serving. */
export const SCALE_MIN = 0.6;
export const SCALE_MAX = 1.5;
/** Extra multiplier on lean-protein ingredients only. */
export const BOOST_MAX = 1.6;
/** Cap on scale × boost, so a portion never holds more than ~1.8× the recipe's meat or fish. */
export const LEAN_MAX = 1.8;

/** Soup as a starter course is a smaller bowl of the same recipe (~60 % of a main-size serving). */
const SLOT_SIZE: Partial<Record<Slot, number>> = { soup: 0.6 };

export interface Portion {
  scale: number;
  boost: number;
}

/** A meal as the portioner sees it: which recipe, in which slot. */
export interface MealRef {
  id: string;
  slot: Slot;
}

interface Part {
  lean: Nutrients;
  rest: Nutrients;
  min: number;
  max: number;
  leanMax: number;
}

function partOf(m: MealRef): Part {
  const size = SLOT_SIZE[m.slot] ?? 1;
  return { ...recipeSplit(m.id), min: SCALE_MIN * size, max: SCALE_MAX * size, leanMax: LEAN_MAX * size };
}

const kcalOf = (p: Part, b: number) => p.lean.kcal * b + p.rest.kcal;
const maxScale = (p: Part, por: Portion) => (p.lean.kcal > 0 ? Math.min(p.max, p.leanMax / por.boost) : p.max);
const protOf = (p: Part, b: number) => p.lean.protein * b + p.rest.protein;

function totals(parts: Part[], por: Portion[]) {
  let kcal = 0;
  let protein = 0;
  parts.forEach((p, i) => {
    kcal += por[i].scale * kcalOf(p, por[i].boost);
    protein += por[i].scale * protOf(p, por[i].boost);
  });
  return { kcal, protein };
}

/** Rescale the meals that still have room so the day lands on the calorie target. */
function fitKcal(parts: Part[], por: Portion[], target: number) {
  for (let pass = 0; pass < 4; pass++) {
    const { kcal } = totals(parts, por);
    const gap = target - kcal;
    if (Math.abs(gap) < 1) return;
    const movable = por
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => (gap > 0 ? p.scale < maxScale(parts[i], p) : p.scale > parts[i].min));
    const movableKcal = movable.reduce((s, { p, i }) => s + p.scale * kcalOf(parts[i], p.boost), 0);
    if (movableKcal <= 0) return;
    const f = 1 + gap / movableKcal;
    for (const { p, i } of movable) p.scale = Math.min(maxScale(parts[i], p), Math.max(parts[i].min, p.scale * f));
  }
}

/**
 * Choose a portion size for every meal of a day so that calories hit the target and
 * protein clears the floor where possible. Greedy: start from a standard serving (a
 * smaller bowl for a soup course), then repeatedly take whichever small move raises
 * protein most at constant calories — either boosting a meal's lean-protein ingredient,
 * or shifting calories from the least to the most protein-dense meal.
 */
export function portionDay(meals: MealRef[], kcalTarget: number, proteinFloor: number): Portion[] {
  const parts: Part[] = meals.map(partOf);
  const por: Portion[] = meals.map((m) => ({ scale: SLOT_SIZE[m.slot] ?? 1, boost: 1 }));
  if (parts.length === 0) return por;
  fitKcal(parts, por, kcalTarget);

  for (let iter = 0; iter < 40; iter++) {
    const before = totals(parts, por).protein;
    if (before >= proteinFloor) break;

    let best: Portion[] | null = null;
    let bestProtein = before + 0.2;

    // Move A: boost one meal's lean protein.
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].lean.protein <= 0 || por[i].boost >= BOOST_MAX) continue;
      const trial = por.map((x) => ({ ...x }));
      trial[i].boost = Math.min(BOOST_MAX, trial[i].boost + 0.1);
      trial[i].scale = Math.min(trial[i].scale, parts[i].leanMax / trial[i].boost);
      fitKcal(parts, trial, kcalTarget);
      const t = totals(parts, trial);
      if (t.protein > bestProtein && Math.abs(t.kcal - kcalTarget) < kcalTarget * 0.03) {
        best = trial;
        bestProtein = t.protein;
      }
    }

    // Move B: move ~40 kcal from the least to the most protein-dense meal.
    const density = parts.map((p, i) => protOf(p, por[i].boost) / Math.max(1, kcalOf(p, por[i].boost)));
    const order = density.map((d, i) => ({ d, i })).sort((a, b) => b.d - a.d);
    const hi = order.find(({ i }) => por[i].scale < maxScale(parts[i], por[i]));
    const lo = [...order].reverse().find(({ i }) => por[i].scale > parts[i].min);
    if (hi && lo && hi.i !== lo.i) {
      const trial = por.map((x) => ({ ...x }));
      const kHi = kcalOf(parts[hi.i], trial[hi.i].boost);
      const kLo = kcalOf(parts[lo.i], trial[lo.i].boost);
      trial[hi.i].scale = Math.min(maxScale(parts[hi.i], trial[hi.i]), trial[hi.i].scale + 40 / kHi);
      trial[lo.i].scale = Math.max(parts[lo.i].min, trial[lo.i].scale - 40 / kLo);
      fitKcal(parts, trial, kcalTarget);
      const t = totals(parts, trial);
      if (t.protein > bestProtein) {
        best = trial;
        bestProtein = t.protein;
      }
    }

    if (!best) break;
    for (let i = 0; i < por.length; i++) por[i] = best[i];
  }
  return por;
}

export function quickTotals(recipeIds: string[], por: Portion[]): Nutrients {
  return recipeIds.reduce((acc, id, i) => {
    const s = recipeSplit(id);
    return add(add(acc, s.lean, por[i].scale * por[i].boost), s.rest, por[i].scale);
  }, ZERO);
}

/** Display rounding: 5 g steps for bulk items, 1 g for small amounts like spices and oil. */
export function roundGrams(g: number): number {
  if (g <= 0) return 0;
  if (g < 25) return Math.max(1, Math.round(g));
  return Math.round(g / 5) * 5;
}

export interface Line {
  ing: Ingredient;
  g: number;
}

/** Your portion of one meal, in rounded grams — the numbers every total is computed from. */
export function portionLines(recipeId: string, por: Portion): Line[] {
  return recipeById(recipeId).ingredients.map((l) => ({
    ing: ingredient(l.id),
    g: roundGrams(l.g * por.scale * (isLean(l.id) ? por.boost : 1)),
  }));
}

export function linesNutrients(lines: Line[]): Nutrients {
  return nutrientsOf(lines.map((l) => ({ id: l.ing.id, g: l.g })));
}
