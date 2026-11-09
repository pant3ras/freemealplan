import { clearNutritionCache } from '../engine/nutrition';
import { INGREDIENT_LIST, INGREDIENTS } from './ingredients';
import { RECIPE_MAP, RECIPES } from './recipes';
import type { Ingredient, Recipe } from './types';

/**
 * The user's own recipes and ingredients live in app state; this slots them into the
 * same tables the built-in ones use, so the planner, shopping list and recipe screens
 * treat them exactly alike. Idempotent: call it with the full current lists.
 */
export function registerCustom(recipes: Recipe[], ingredients: Ingredient[]): void {
  for (let i = INGREDIENT_LIST.length - 1; i >= 0; i--) if (INGREDIENT_LIST[i].custom) INGREDIENT_LIST.splice(i, 1);
  for (const id of Object.keys(INGREDIENTS)) if (INGREDIENTS[id].custom) delete INGREDIENTS[id];
  for (const ing of ingredients) {
    INGREDIENT_LIST.push(ing);
    INGREDIENTS[ing.id] = ing;
  }

  for (let i = RECIPES.length - 1; i >= 0; i--) if (RECIPES[i].custom) RECIPES.splice(i, 1);
  for (const id of Object.keys(RECIPE_MAP)) if (RECIPE_MAP[id].custom) delete RECIPE_MAP[id];
  // A recipe whose custom ingredient was deleted can't be cooked or costed; leave it out.
  for (const r of recipes)
    if (r.ingredients.every((l) => INGREDIENTS[l.id])) {
      RECIPES.push(r);
      RECIPE_MAP[r.id] = r;
    }
  clearNutritionCache();
}

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
