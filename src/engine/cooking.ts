import type { Recipe } from '../data/types';
import type { Line } from './portion';
import type { DayView, MealView } from './week';

export interface CookSession {
  recipe: Recipe;
  /** The day you cook it. */
  dayIndex: number;
  meals: MealView[];
  /** Total grams for the whole batch. */
  lines: Line[];
  /** Standard-serving equivalents in the pot. */
  servings: number;
}

/**
 * Group the week's meals into cooking sessions: a dish is cooked once and covers the
 * following meals that use it while the leftovers still keep (recipe.keepsDays).
 */
export function cookSessions(week: DayView[]): CookSession[] {
  const sessions: CookSession[] = [];
  const open = new Map<string, CookSession>();
  for (const day of week)
    for (const meal of day.meals) {
      if (meal.eatenOut || meal.skipped) continue;
      const s = open.get(meal.recipe.id);
      if (s && day.index - s.dayIndex < meal.recipe.keepsDays) {
        s.meals.push(meal);
        continue;
      }
      const fresh: CookSession = { recipe: meal.recipe, dayIndex: day.index, meals: [meal], lines: [], servings: 0 };
      sessions.push(fresh);
      open.set(meal.recipe.id, fresh);
    }

  for (const s of sessions) {
    s.lines = s.recipe.ingredients.map((_, i) => ({
      ing: s.meals[0].potLines[i].ing,
      g: s.meals.reduce((sum, m) => sum + m.potLines[i].g, 0),
    }));
    s.servings = s.meals.reduce((sum, m) => sum + m.portion.scale + m.othersFactor, 0);
  }
  return sessions.sort((a, b) => a.dayIndex - b.dayIndex);
}
