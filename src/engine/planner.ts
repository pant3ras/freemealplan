import { quoteFor } from '../data/prices';
import { RECIPES } from '../data/recipes';
import { SLOTS, type Cuisine, type DayPlan, type PlannedMeal, type Profile, type Recipe, type Slot, type WeekPlan } from '../data/types';
import { carbShare, ingredient, isEligible, isLean, proteinShare, recipeBase, recipeById } from './nutrition';
import { portionDay, quickTotals, type MealRef, type Portion } from './portion';
import { computeTargets, type Targets } from './targets';
import { dayDate, nextStartDate, othersFactor, weekdayIndex } from './week';

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function slotPool(p: Profile, slot: Slot): Recipe[] {
  return RECIPES.filter((r) => isEligible(r, p, slot));
}

/** The meal slots that will actually appear in a plan (enabled and with at least one recipe). */
export function activeSlots(p: Profile): Slot[] {
  return SLOTS.filter((s) => p.slots.includes(s) && slotPool(p, s).length > 0);
}

/** Enabled slots for which the user's filters leave no recipe at all. */
export function emptySlots(p: Profile): Slot[] {
  return SLOTS.filter((s) => p.slots.includes(s) && slotPool(p, s).length === 0);
}

/** How many consecutive days one dish covers, by the repetition setting. A soup pot always covers three. */
export function runLength(p: Profile, slot: Slot): number {
  if (slot === 'soup') return 3;
  const base = p.repetition === 'variety' ? 1 : p.repetition === 'balanced' ? 2 : 3;
  return p.repetition !== 'variety' && (slot === 'breakfast' || slot === 'snack') ? base + 1 : base;
}

interface Ctx {
  p: Profile;
  t: Targets;
  pools: Record<Slot, Recipe[]>;
  memo: Map<string, { por: Portion[]; kcal: number; protein: number; carbs: number }>;
  /** This week's cuisines from the swipe deck; empty = no theme. */
  theme: Cuisine[];
  /** Saturday/Sunday by day index — when recipes longer than the weekday limit may be cooked. */
  weekend: boolean[];
  /** Ingredients at home the week should use up (fresh ones first). */
  useUp: Set<string>;
  /** Dishes picked together in the match game. */
  prefer: Set<string>;
}

function makeCtx(p: Profile, plan?: WeekPlan): Ctx {
  const pools = Object.fromEntries(SLOTS.map((s) => [s, slotPool(p, s)])) as Record<Slot, Recipe[]>;
  const weekend = plan ? plan.days.map((_, i) => weekdayIndex(dayDate(plan, i)) >= 5) : [];
  return { p, t: computeTargets(p), pools, memo: new Map(), theme: plan?.cuisines ?? [], weekend, useUp: new Set(plan?.useUp ?? []), prefer: new Set(plan?.prefer ?? []) };
}

const refsOf = (day: DayPlan): MealRef[] => day.meals.filter((m) => !m.skipped).map((m) => ({ id: m.recipeId, slot: m.slot }));

const isMain = (slot: Slot) => slot === 'lunch' || slot === 'dinner';

/** Lunch and dinner recipes per cuisine that fit the profile — what the swipe deck can offer. */
export function cuisineOptions(p: Profile): Map<Cuisine, Recipe[]> {
  const out = new Map<Cuisine, Recipe[]>();
  for (const r of RECIPES)
    if (r.slots.some(isMain) && r.slots.some((s) => isMain(s) && isEligible(r, p, s))) out.set(r.cuisine, [...(out.get(r.cuisine) ?? []), r]);
  return out;
}

function evalDay(ctx: Ctx, meals: MealRef[]) {
  const key = meals.map((m) => (m.slot === 'soup' ? `s:${m.id}` : m.id)).join('|');
  let e = ctx.memo.get(key);
  if (!e) {
    const por = portionDay(meals, ctx.t.kcal, ctx.t.protein);
    const n = quickTotals(
      meals.map((m) => m.id),
      por,
    );
    e = { por, kcal: n.kcal, protein: n.protein, carbs: n.carbs };
    ctx.memo.set(key, e);
  }
  return e;
}

function dayPenalty(ctx: Ctx, meals: MealRef[]): number {
  const e = evalDay(ctx, meals);
  const { t, p } = ctx;
  let pen = 0;
  const short = Math.max(0, t.protein - e.protein);
  if (short > 0.5) pen += 20 + (short / t.protein) * 400;
  const dev = Math.abs(e.kcal - t.kcal) / t.kcal;
  if (dev > 0.04) pen += (dev - 0.04) * 500;
  if (p.lowCarb) {
    const share = (e.carbs * 4) / Math.max(1, e.kcal);
    if (share > 0.3) pen += (share - 0.3) * 200;
  }
  return pen;
}

/** Estimated checkout total (whole packs, staples excluded) — used to steer toward the budget. */
export function estimateCheckout(ctx: Ctx, plan: WeekPlan): number {
  const grams = new Map<string, number>();
  plan.days.forEach((day) => {
    const e = evalDay(ctx, refsOf(day));
    day.meals
      .filter((m) => !m.skipped)
      .forEach((m, j) => {
      if (m.eatenOut) return;
      const por = e.por[j];
      const others = othersFactor(ctx.p, m.slot);
      for (const l of recipeById(m.recipeId).ingredients) {
        const g = l.g * por.scale * (isLean(l.id) ? por.boost : 1) + l.g * others;
        grams.set(l.id, (grams.get(l.id) ?? 0) + g);
      }
    });
  });
  let total = 0;
  for (const [id, g] of grams) {
    const ing = ingredient(id);
    if (!ing.staple) total += quoteFor(ing, g, ctx.p.store).checkout;
  }
  return total;
}

function score(ctx: Ctx, plan: WeekPlan): number {
  const { p } = ctx;
  let pen = 0;
  for (const day of plan.days) {
    pen += dayPenalty(ctx, refsOf(day));
    const lunch = day.meals.find((m) => m.slot === 'lunch' && !m.skipped);
    const dinner = day.meals.find((m) => m.slot === 'dinner' && !m.skipped);
    if (lunch && dinner && lunch.recipeId === dinner.recipeId) pen += 40;
    // The soup course and the main shouldn't be the same pot.
    const soup = day.meals.find((m) => m.slot === 'soup' && !m.skipped);
    if (soup && (soup.recipeId === lunch?.recipeId || soup.recipeId === dinner?.recipeId)) pen += 40;
  }

  for (const slot of SLOTS) {
    const seq = plan.days.flatMap((d, di) => d.meals.filter((m) => m.slot === slot && !m.skipped).map((m) => ({ d: di, id: m.recipeId })));
    if (seq.length === 0) continue;
    const distinct = new Set(seq.map((x) => x.id)).size;
    const starts = seq.map((x, i) => i === 0 || seq[i - 1].id !== x.id || seq[i - 1].d !== x.d - 1);
    const runs = starts.filter(Boolean).length;
    const wanted = Math.min(ctx.pools[slot].length, Math.ceil(seq.length / runLength(p, slot)));
    pen += Math.abs(distinct - wanted) * 10;
    // The same dish coming back after a gap means cooking it twice.
    pen += (runs - distinct) * 5;
    let run = 0;
    for (let i = 0; i < seq.length; i++) {
      const r = recipeById(seq[i].id);
      run = starts[i] ? 1 : run + 1;
      // Batch-cooking a dish past the days it keeps.
      if (run > Math.max(r.keepsDays, slot === 'breakfast' || slot === 'snack' ? 7 : 1)) pen += 15;
      // Long cooks happen at the weekend; their leftovers can still run into the week.
      if (starts[i] && r.activeMinutes > p.maxMinutes && !ctx.weekend[seq[i].d]) pen += 40;
      // A soup pot is meant to cover three days.
      const runEnds = i === seq.length - 1 || starts[i + 1];
      if (slot === 'soup' && runEnds && seq[i].d < plan.days.length - 1) pen += Math.max(0, Math.min(3, r.keepsDays) - run) * 8;
    }
  }

  // Hitting protein with the same dish every day is not a plan anyone follows.
  const uses = new Map<string, number>();
  for (const day of plan.days) for (const m of day.meals) if (!m.skipped && m.slot !== 'soup') uses.set(m.recipeId, (uses.get(m.recipeId) ?? 0) + 1);
  const maxUses = Math.ceil(({ variety: 2, balanced: 4, mealprep: 5 }[p.repetition] * plan.days.length) / 7);
  for (const n of uses.values()) if (n > maxUses) pen += (n - maxUses) * 50;

  // A swiped weekly theme is a strong wish for lunches and dinners; the profile's
  // standing cuisine likes are a gentle nudge.
  const theme = ctx.theme;
  const liked = theme.length ? theme : p.cuisines;
  const themeHits = new Map<Cuisine, number>();
  for (const day of plan.days)
    for (const m of day.meals) {
      if (m.skipped) continue;
      const cuisine = recipeById(m.recipeId).cuisine;
      if (p.favorites.includes(m.recipeId)) pen -= 2.5;
      if (ctx.prefer.has(m.recipeId)) pen -= 4;
      if (liked.length && !liked.includes(cuisine)) pen += theme.length ? (isMain(m.slot) ? 15 : 0) : 3;
      if (theme.includes(cuisine) && isMain(m.slot)) themeHits.set(cuisine, (themeHits.get(cuisine) ?? 0) + 1);
    }
  // Every cuisine you swiped right on should actually show up this week.
  for (const c of theme) if (!themeHits.get(c) && (ctx.pools.dinner.some((r) => r.cuisine === c) || ctx.pools.lunch.some((r) => r.cuisine === c))) pen += 35;

  // Planning around the kitchen: every at-home ingredient no dish uses is a miss,
  // and fresh ones (that will spoil) count double.
  if (ctx.useUp.size) {
    const used = new Set<string>();
    for (const day of plan.days)
      for (const m of day.meals) if (!m.skipped) for (const l of recipeById(m.recipeId).ingredients) if (ctx.useUp.has(l.id)) used.add(l.id);
    for (const id of ctx.useUp) if (!used.has(id)) pen += ingredient(id).shelfDays <= 7 ? 16 : 8;
  }

  if (p.budget > 0) {
    const checkout = estimateCheckout(ctx, plan);
    if (checkout > p.budget) pen += ((checkout - p.budget) / p.budget) * 250;
    pen += (checkout / p.budget) * 4;
  }
  return pen;
}

function weightOf(ctx: Ctx, r: Recipe): number {
  const base = recipeBase(r.id);
  let w = 1 + proteinShare(base) * 3;
  if (ctx.p.favorites.includes(r.id)) w += 2;
  if (ctx.prefer.has(r.id)) w += 6;
  if (ctx.theme.includes(r.cuisine)) w += 4;
  else if (ctx.p.cuisines.includes(r.cuisine)) w += 1.5;
  if (ctx.p.lowCarb && carbShare(base) > 0.35) w *= 0.3;
  if (ctx.useUp.size) w += Math.min(3, r.ingredients.filter((l) => ctx.useUp.has(l.id)).length) * 2;
  return w;
}

function pick(ctx: Ctx, slot: Slot, rand: () => number, avoid: Set<string>): string {
  const pool = ctx.pools[slot];
  const fresh = pool.filter((r) => !avoid.has(r.id));
  const list = fresh.length ? fresh : pool;
  const weights = list.map((r) => weightOf(ctx, r));
  let x = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) {
    x -= weights[i];
    if (x <= 0) return list[i].id;
  }
  return list[list.length - 1].id;
}

const clone = (plan: WeekPlan): WeekPlan => ({ ...plan, days: plan.days.map((d) => ({ meals: d.meals.map((m) => ({ ...m })) })) });

type Pos = { d: number; m: number };

/** Fill every free position with a first guess, continuing runs of the same dish. */
function seedFill(ctx: Ctx, plan: WeekPlan, free: Pos[], rand: () => number) {
  const isFree = new Set(free.map((x) => `${x.d}:${x.m}`));
  for (const slot of SLOTS) {
    const used = new Set<string>();
    let runLeft = 0;
    let current = '';
    plan.days.forEach((day, d) => {
      const m = day.meals.findIndex((x) => x.slot === slot);
      if (m < 0) return;
      const meal = day.meals[m];
      if (!isFree.has(`${d}:${m}`)) {
        used.add(meal.recipeId);
        runLeft = 0;
        return;
      }
      if (runLeft <= 0 || !current) {
        current = pick(ctx, slot, rand, used);
        runLeft = runLength(ctx.p, slot);
        used.add(current);
      }
      meal.recipeId = current;
      runLeft--;
    });
  }
}

/**
 * Simulated annealing over the free meal positions. Moves: put a new dish on a
 * position (optionally as a short run), extend a neighbour's dish, or swap two days.
 */
export function optimize(plan: WeekPlan, p: Profile, free: Pos[], seed: number, iterations = 2500): WeekPlan {
  const ctx = makeCtx(p, plan);
  const rand = rng(seed);
  let cur = clone(plan);
  if (free.length === 0) return cur;
  seedFill(ctx, cur, free, rand);
  let curScore = score(ctx, cur);
  let best = clone(cur);
  let bestScore = curScore;
  const freeSet = new Set(free.map((x) => `${x.d}:${x.m}`));

  for (let it = 0; it < iterations; it++) {
    const temp = 6 * Math.pow(0.02 / 6, it / iterations);
    const next = clone(cur);
    const pos = free[Math.floor(rand() * free.length)];
    const meal = next.days[pos.d].meals[pos.m];
    const slot = meal.slot;
    const r = rand();
    if (r < 0.5) {
      const id = pick(ctx, slot, rand, new Set([meal.recipeId]));
      const len = 1 + Math.floor(rand() * runLength(p, slot));
      for (let k = 0; k < len && pos.d + k < next.days.length; k++) {
        const mi = next.days[pos.d + k].meals.findIndex((x) => x.slot === slot);
        if (mi < 0 || !freeSet.has(`${pos.d + k}:${mi}`)) break;
        next.days[pos.d + k].meals[mi].recipeId = id;
      }
    } else if (r < 0.75) {
      const nd = pos.d + (rand() < 0.5 ? -1 : 1);
      const neighbour = next.days[nd]?.meals.find((x) => x.slot === slot);
      if (!neighbour) continue;
      meal.recipeId = neighbour.recipeId;
    } else {
      const others = free.filter((x) => x.d !== pos.d && next.days[x.d].meals[x.m].slot === slot);
      if (!others.length) continue;
      const o = others[Math.floor(rand() * others.length)];
      const other = next.days[o.d].meals[o.m];
      [meal.recipeId, other.recipeId] = [other.recipeId, meal.recipeId];
    }
    const s = score(ctx, next);
    if (s < curScore || rand() < Math.exp((curScore - s) / temp)) {
      cur = next;
      curScore = s;
      if (s < bestScore) {
        best = clone(next);
        bestScore = s;
      }
    }
  }
  return best;
}

function blankDay(slots: Slot[]): DayPlan {
  return { meals: slots.map((slot) => ({ slot, recipeId: '', locked: false, eatenOut: false })) };
}

function allPositions(plan: WeekPlan): Pos[] {
  return plan.days.flatMap((d, di) => d.meals.map((_, mi) => ({ d: di, m: mi })));
}

export function generatePlan(p: Profile, seed = Date.now(), cuisines: Cuisine[] = [], useUp: string[] = []): WeekPlan {
  const slots = activeSlots(p);
  const plan: WeekPlan = {
    seed,
    createdAt: new Date().toISOString(),
    startDate: nextStartDate(p.startDay),
    cuisines,
    useUp,
    days: Array.from({ length: p.days }, () => blankDay(slots)),
  };
  return optimize(plan, p, allPositions(plan), seed);
}

/**
 * Bring an existing plan in line with an edited profile: add/remove days and meal
 * slots, and re-plan only the meals that are new or no longer allowed (a disliked
 * ingredient, a new allergen, a tighter time limit…). Everything else is kept.
 */
export function reconcile(plan: WeekPlan, p: Profile, seed = Date.now()): WeekPlan {
  const slots = activeSlots(p);
  const days: DayPlan[] = Array.from({ length: p.days }, (_, i) => {
    const old = plan.days[i];
    return {
      meals: slots.map((slot): PlannedMeal => {
        const prev = old?.meals.find((m) => m.slot === slot);
        return prev ? { ...prev } : { slot, recipeId: '', locked: false, eatenOut: false };
      }),
    };
  });
  const next: WeekPlan = { ...plan, days };
  const free = allPositions(next).filter(({ d, m }) => {
    const meal = next.days[d].meals[m];
    return !meal.recipeId || !isEligible(recipeById(meal.recipeId), p, meal.slot);
  });
  return optimize(next, p, free, seed);
}

/** "Start the rest of the week over": re-plan every unlocked meal from a given day on. */
export function regenerateFrom(plan: WeekPlan, p: Profile, fromDay: number, seed = Date.now()): WeekPlan {
  const free = allPositions(plan).filter(({ d, m }) => {
    const meal = plan.days[d].meals[m];
    return d >= fromDay && !meal.locked && !meal.eatenOut && !meal.skipped;
  });
  return { ...optimize(plan, p, free, seed), seed };
}

export function setStartDay(plan: WeekPlan, startDay: number): WeekPlan {
  return { ...plan, startDate: nextStartDate(startDay) };
}

export interface SwapOption {
  recipe: Recipe;
  /** Whole-day totals after the swap. */
  kcal: number;
  protein: number;
  /** Your portion of the new meal after the day is re-tuned. */
  mealKcal: number;
  mealProtein: number;
  /** The dish is already on this day in another slot. */
  sameDay: boolean;
  ok: boolean;
  /** Already in this week's plan for the same slot — reuse means less shopping. */
  inPlan: boolean;
  /** Belongs to one of this week's swiped cuisines. */
  onTheme: boolean;
  /** At-home ingredients (from the week's use-up list) it would use. */
  fromHome: string[];
  penalty: number;
}

export function swapOptions(plan: WeekPlan, p: Profile, d: number, m: number): SwapOption[] {
  const ctx = makeCtx(p, plan);
  const meal = plan.days[d].meals[m];
  const ids = plan.days[d].meals.map((x) => x.recipeId);
  const inPlan = new Set(plan.days.flatMap((day) => day.meals.filter((x) => x.slot === meal.slot).map((x) => x.recipeId)));
  // The day as it would be with the swap: the replaced meal is back on (even if it was skipped).
  const trialRefs = (id: string) =>
    plan.days[d].meals.flatMap((x, j) => (j === m ? [{ id, slot: x.slot }] : x.skipped ? [] : [{ id: x.recipeId, slot: x.slot }]));
  const at = plan.days[d].meals.slice(0, m).filter((x) => !x.skipped).length;
  return ctx.pools[meal.slot]
    .filter((r) => r.id !== meal.recipeId)
    .map((r) => {
      const trial = trialRefs(r.id);
      const e = evalDay(ctx, trial);
      const meal = quickTotals([r.id], [e.por[at]]);
      const sameDay = ids.some((id, j) => j !== m && id === r.id && !plan.days[d].meals[j].skipped);
      const onTheme = ctx.theme.includes(r.cuisine);
      const offTheme = ctx.theme.length > 0 && !onTheme && isMain(plan.days[d].meals[m].slot);
      const fromHome = [...new Set(r.ingredients.map((l) => l.id).filter((id) => ctx.useUp.has(id)))];
      const penalty =
        dayPenalty(ctx, trial) +
        (p.favorites.includes(r.id) ? -2 : 0) +
        (sameDay ? 40 : 0) +
        (inPlan.has(r.id) ? -1 : 0) +
        (offTheme ? 6 : 0) -
        Math.min(3, fromHome.length) * 2;
      return {
        onTheme,
        fromHome,
        recipe: r,
        kcal: Math.round(e.kcal),
        protein: Math.round(e.protein),
        mealKcal: Math.round(meal.kcal),
        mealProtein: Math.round(meal.protein),
        sameDay,
        ok: e.protein >= ctx.t.protein - 0.5 && Math.abs(e.kcal - ctx.t.kcal) <= ctx.t.kcal * 0.05,
        inPlan: inPlan.has(r.id),
        penalty,
      };
    })
    .sort((a, b) => a.penalty - b.penalty || b.protein - a.protein);
}

export function setMeal(plan: WeekPlan, d: number, m: number, patch: Partial<PlannedMeal>): WeekPlan {
  const next = clone(plan);
  Object.assign(next.days[d].meals[m], patch);
  return next;
}
