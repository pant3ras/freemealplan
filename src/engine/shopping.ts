import { CHAIN_IDS, quoteFor, type ChainId, type Quote, type StoreChoice } from '../data/prices';
import { AISLE_ORDER, type Aisle, type Ingredient } from '../data/types';
import type { DayView } from './week';

export interface ShopItem {
  ing: Ingredient;
  /** What the week's meals use. */
  grams: number;
  /** Where and what to buy, priced at the chosen store. */
  quote: Quote;
  have: boolean;
  /** Which meals use it. */
  usedIn: { dayIndex: number; mealIndex: number }[];
}

export interface ShopSection {
  /** Null when everything comes from one store. */
  chain: ChainId | null;
  aisles: { aisle: Aisle; items: ShopItem[] }[];
  checkout: number;
}

export interface ShoppingList {
  sections: ShopSection[];
  /** Items marked as already at home (cupboard staples by default). */
  pantry: ShopItem[];
  food: number;
  checkout: number;
  itemCount: number;
  estimatedCount: number;
}

/** Grams of every ingredient the week needs, with the meals that use it (eaten-out meals excluded). */
function weekNeeds(week: DayView[]) {
  const map = new Map<string, { ing: Ingredient; grams: number; usedIn: ShopItem['usedIn'] }>();
  for (const day of week)
    for (const meal of day.meals) {
      if (meal.eatenOut || meal.skipped) continue;
      for (const l of meal.potLines) {
        let need = map.get(l.ing.id);
        if (!need) map.set(l.ing.id, (need = { ing: l.ing, grams: 0, usedIn: [] }));
        need.grams += l.g;
        need.usedIn.push({ dayIndex: meal.dayIndex, mealIndex: meal.mealIndex });
      }
    }
  return [...map.values()].sort((a, b) => a.ing.name.localeCompare(b.ing.name));
}

const byAisle = (items: ShopItem[]) =>
  AISLE_ORDER.map((aisle) => ({ aisle, items: items.filter((i) => i.ing.aisle === aisle) })).filter((a) => a.items.length);

export function buildShoppingList(week: DayView[], pantry: string[], store: StoreChoice): ShoppingList {
  const items: ShopItem[] = weekNeeds(week).map((n) => ({ ...n, quote: quoteFor(n.ing, n.grams, store), have: pantry.includes(n.ing.id) }));
  const toBuy = items.filter((i) => !i.have);
  const sum = (list: ShopItem[]) => list.reduce((s, i) => s + i.quote.checkout, 0);
  const sections: ShopSection[] =
    store === 'mix'
      ? CHAIN_IDS.map((chain) => toBuy.filter((i) => i.quote.chain === chain))
          .map((list, k) => ({ chain: CHAIN_IDS[k], aisles: byAisle(list), checkout: sum(list) }))
          .filter((s) => s.aisles.length)
      : [{ chain: null, aisles: byAisle(toBuy), checkout: sum(toBuy) }];
  return {
    sections,
    pantry: items.filter((i) => i.have),
    food: toBuy.reduce((s, i) => s + i.quote.food, 0),
    checkout: sum(toBuy),
    itemCount: toBuy.length,
    estimatedCount: toBuy.filter((i) => i.quote.estimated).length,
  };
}

export interface StoreComparison {
  store: StoreChoice;
  checkout: number;
  /** Items this store actually reports a price for. */
  priced: number;
  items: number;
  /** For the mix: how many different chains you would visit. */
  chains?: number;
}

/** This week's list priced at each chain, and as a cheapest-per-item mix. */
export function compareStores(week: DayView[], pantry: string[]): StoreComparison[] {
  const needs = weekNeeds(week).filter((n) => !pantry.includes(n.ing.id));
  const rows: StoreComparison[] = [...CHAIN_IDS, 'mix' as const].map((store) => {
    const quotes = needs.map((n) => quoteFor(n.ing, n.grams, store));
    return {
      store,
      checkout: quotes.reduce((s, q) => s + q.checkout, 0),
      priced: quotes.filter((q) => !q.estimated).length,
      items: quotes.length,
      chains: store === 'mix' ? new Set(quotes.map((q) => q.chain)).size : undefined,
    };
  });
  return rows;
}
