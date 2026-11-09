import type { Nutrients, PlannedMeal, Profile, Recipe, Slot, WeekPlan } from '../data/types';
import { add, ingredient, recipeById, ZERO } from './nutrition';
import { linesNutrients, portionDay, portionLines, roundGrams, type Line, type Portion } from './portion';
import type { Targets } from './targets';

export interface MealView {
  dayIndex: number;
  mealIndex: number;
  slot: Slot;
  recipe: Recipe;
  locked: boolean;
  eatenOut: boolean;
  skipped: boolean;
  portion: Portion;
  /** Your portion, rounded grams. */
  lines: Line[];
  n: Nutrients;
  /** People eating this meal, in standard-serving equivalents beyond yours. */
  othersFactor: number;
  /** Everything that goes in the pot for this meal (you + household). */
  potLines: Line[];
}

export type DayStatus = 'ok' | 'short' | 'kcal' | 'out';

export interface DayView {
  index: number;
  date: Date;
  meals: MealView[];
  /** Totals for the meals you eat at home. */
  n: Nutrients;
  status: DayStatus;
  proteinShort: number;
  kcalOff: number;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The next date (today included) that falls on the chosen weekday. */
export function nextStartDate(startDay: number, from = new Date()): string {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const offset = (startDay - weekdayIndex(base) + 7) % 7;
  base.setDate(base.getDate() + offset);
  return isoDate(base);
}

export function dayDate(plan: WeekPlan, i: number): Date {
  const d = parseIso(plan.startDate);
  d.setDate(d.getDate() + i);
  return d;
}

export function dayLabel(d: Date, long = false): string {
  const name = DAY_NAMES[weekdayIndex(d)];
  const month = d.toLocaleString('en-GB', { month: 'short' });
  return long ? `${name} ${d.getDate()} ${month}` : name;
}

export function othersFactor(p: Profile, slot: Slot): number {
  if (!p.householdSlots.includes(slot)) return 0;
  return p.household.reduce((s, m) => s + m.factor, 0);
}

function mealView(dayIndex: number, mealIndex: number, m: PlannedMeal, por: Portion, p: Profile): MealView {
  const recipe = recipeById(m.recipeId);
  const lines = portionLines(m.recipeId, por);
  const others = m.skipped ? 0 : othersFactor(p, m.slot);
  const potLines = recipe.ingredients.map((l, i) => ({
    ing: ingredient(l.id),
    g: lines[i].g + (others > 0 ? roundGrams(l.g * others) : 0),
  }));
  return {
    dayIndex,
    mealIndex,
    slot: m.slot,
    recipe,
    locked: m.locked,
    eatenOut: m.eatenOut,
    skipped: !!m.skipped,
    portion: por,
    lines,
    n: linesNutrients(lines),
    othersFactor: others,
    potLines,
  };
}

export function buildDay(plan: WeekPlan, i: number, p: Profile, t: Targets): DayView {
  const day = plan.days[i];
  // Skipped meals are left out of the day; the others are portioned to cover it.
  const active = day.meals.filter((m) => !m.skipped);
  const activePor = portionDay(active.map((m) => ({ id: m.recipeId, slot: m.slot })), t.kcal, t.protein);
  let k = 0;
  const meals = day.meals.map((m, j) => mealView(i, j, m, m.skipped ? { scale: 0, boost: 1 } : activePor[k++], p));
  const home = meals.filter((m) => !m.eatenOut && !m.skipped);
  const n = home.reduce((acc, m) => add(acc, m.n), ZERO);
  // A gram or so under the floor is rounding, not a miss (and would show as "−1 g").
  const gap = t.protein - n.protein;
  const proteinShort = gap >= 1.5 ? Math.round(gap) : 0;
  const kcalOff = n.kcal < t.kcalMin ? Math.round(n.kcal - t.kcalMin) : n.kcal > t.kcalMax ? Math.round(n.kcal - t.kcalMax) : 0;
  let status: DayStatus = 'ok';
  if (meals.some((m) => m.eatenOut)) status = 'out';
  else if (proteinShort > 0) status = 'short';
  else if (kcalOff !== 0) status = 'kcal';
  return { index: i, date: dayDate(plan, i), meals, n, status, proteinShort, kcalOff };
}

export function buildWeek(plan: WeekPlan, p: Profile, t: Targets): DayView[] {
  return plan.days.map((_, i) => buildDay(plan, i, p, t));
}
