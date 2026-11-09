import type { Cuisine, Difficulty, Recipe, Slot, Text } from './types';

type Line = [id: string, grams: number];

export const MAIN: Slot[] = ['lunch', 'dinner'];
/** A soup that works as a starter course or as a light main. */
export const SOUP: Slot[] = ['soup', 'lunch', 'dinner'];

/** How recipes are written in src/data/recipe-book/*. Grams are for one standard serving. */
export interface RecipeDef {
  id: string;
  emoji: string;
  slots: Slot[];
  cuisine: Cuisine;
  /** Total minutes including simmering, rising, marinating. */
  minutes: number;
  /** Hands-on minutes. */
  active: number;
  difficulty: Difficulty;
  keepsDays: number;
  name: Text;
  lines: Line[];
  extras?: Text[];
  steps: { en: string[]; ro: string[] };
  tip?: Text;
}

export function def(d: RecipeDef): Recipe {
  return {
    id: d.id,
    name: d.name,
    emoji: d.emoji,
    slots: d.slots,
    cuisine: d.cuisine,
    minutes: d.minutes,
    activeMinutes: d.active,
    difficulty: d.difficulty,
    keepsDays: d.keepsDays,
    ingredients: d.lines.map(([id, g]) => ({ id, g })),
    extras: d.extras ?? [],
    steps: d.steps,
    tip: d.tip,
  };
}

/** The original, terser format — kept until every recipe has moved to the recipe book. */
export function recipe(
  id: string,
  name: string,
  emoji: string,
  slots: Slot[],
  cuisine: Cuisine,
  minutes: number,
  keepsDays: number,
  lines: Line[],
  steps: string[],
): Recipe {
  return def({ id, emoji, slots, cuisine, minutes, active: minutes, difficulty: 'easy', keepsDays, name: { en: name, ro: name }, lines, steps: { en: steps, ro: steps } });
}
