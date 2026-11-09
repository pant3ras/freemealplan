import type { Recipe } from '../data/types';

/*
 * Low FODMAP check, simplified from the Monash University guide. A recipe counts as
 * low FODMAP when none of its ingredients is on this list. The list is deliberately
 * cautious: wheat, most legumes, garlic and onion, and the sweeteners that are high
 * in fructose. Check with a dietitian if you follow the diet strictly.
 */
export const HIGH_FODMAP = new Set<string>([
  // alliums
  'onion', 'red-onion', 'garlic', 'leek', 'kimchi',
  // fructans and wheat
  'wholegrain-bread', 'rye-bread', 'tortilla', 'flour', 'pasta', 'couscous', 'bulgur', 'orzo',
  'egg-noodles', 'burger-buns', 'pita', 'semolina', 'panko', 'breadcrumbs', 'puff-pastry',
  'filo-pastry', 'hoagie-rolls', 'lentil-pasta',
  // legumes
  'chickpeas', 'hummus', 'kidney-beans', 'white-beans', 'black-beans', 'brown-lentils', 'red-lentils',
  // other high-FODMAP foods
  'mushrooms', 'dried-shiitake', 'cauliflower', 'apple', 'honey', 'sweetcorn', 'cashews', 'milk', 'ricotta',
  // pastes and sauces that usually contain garlic, onion or wheat
  'gochujang', 'doenjang', 'doubanjiang', 'massaman-curry-paste', 'red-curry-paste', 'chipotle-in-adobo', 'harissa',
  // batch 2 additions
  'borlotti-beans', 'white-bread', 'bors', 'pearl-barley', 'korean-pear', 'nam-prik-pao', 'buttermilk',
]);

export function isLowFodmap(r: Pick<Recipe, 'ingredients'>): boolean {
  return !r.ingredients.some((l) => HIGH_FODMAP.has(l.id));
}
