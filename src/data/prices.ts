import PRICES from './prices.json';
import type { Ingredient } from './types';

export type ChainId = 'kaufland' | 'lidl' | 'carrefour' | 'mega' | 'selgros';
/** A single chain, or buy every item wherever it is cheapest. */
export type StoreChoice = ChainId | 'mix';

export const CHAIN_IDS: ChainId[] = ['kaufland', 'lidl', 'carrefour', 'mega', 'selgros'];

/** Cash & carry: shopping there needs a customer card. */
export const NEEDS_CARD: ChainId[] = ['selgros'];

export interface StorePrice {
  product: string;
  price: number;
  /** Pack weight in grams; null when sold by weight (price is per kg). */
  grams: number | null;
  perKg: number;
  promo: boolean;
  date?: string;
}

interface ChainData {
  name: string;
  store: { id: string; name: string; address?: string; distanceKm: number | null } | null;
  items: Record<string, StorePrice>;
}

const DATA = PRICES as unknown as {
  source: string;
  fetchedAt: string;
  location: { label: string };
  chains: Record<ChainId, ChainData>;
};

export const PRICE_SOURCE = { source: DATA.source, fetchedAt: DATA.fetchedAt, location: DATA.location.label };

export function chainName(c: ChainId): string {
  return DATA.chains[c]?.name ?? c;
}

export function chainStore(c: ChainId): ChainData['store'] {
  return DATA.chains[c]?.store ?? null;
}

export function storePrice(c: ChainId, ingredientId: string): StorePrice | undefined {
  return DATA.chains[c]?.items[ingredientId];
}

const medianCache = new Map<string, number | null>();

/** Median price per kg across the chains that report this ingredient. */
export function medianPerKg(ingredientId: string): number | null {
  if (!medianCache.has(ingredientId)) {
    const list = CHAIN_IDS.map((c) => storePrice(c, ingredientId)?.perKg).filter((x): x is number => !!x).sort((a, b) => a - b);
    const mid = list.length >> 1;
    medianCache.set(ingredientId, list.length ? (list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2) : null);
  }
  return medianCache.get(ingredientId)!;
}

export interface Quote {
  chain: ChainId;
  /** What to pick up: the store's product name, or our generic pack when estimated. */
  product: string;
  packs: number;
  /** Grams per pack; null = loose, weighed at the till. */
  packGrams: number | null;
  /** Price of one pack (or per kg when loose). */
  unitPrice: number;
  checkout: number;
  food: number;
  leftover: number;
  perKg: number;
  promo: boolean;
  /** No price reported by this chain — derived from the other chains or our fallback table. */
  estimated: boolean;
}

/** What buying `grams` of an ingredient costs at a chain. Loose goods are weighed in 50 g steps. */
export function quote(ing: Ingredient, grams: number, chain: ChainId): Quote {
  const sp = storePrice(chain, ing.id);
  if (sp && sp.grams) {
    const packs = Math.max(1, Math.ceil(grams / sp.grams - 1e-6));
    return {
      chain,
      product: sp.product,
      packs,
      packGrams: sp.grams,
      unitPrice: sp.price,
      checkout: packs * sp.price,
      food: (grams / 1000) * sp.perKg,
      leftover: packs * sp.grams - grams,
      perKg: sp.perKg,
      promo: sp.promo,
      estimated: false,
    };
  }
  if (sp) {
    const bought = Math.max(50, Math.ceil(grams / 50) * 50);
    return {
      chain,
      product: sp.product,
      packs: 1,
      packGrams: null,
      unitPrice: sp.perKg,
      checkout: (bought / 1000) * sp.perKg,
      food: (grams / 1000) * sp.perKg,
      leftover: bought - grams,
      perKg: sp.perKg,
      promo: sp.promo,
      estimated: false,
    };
  }
  const perKg = medianPerKg(ing.id) ?? (ing.pack.price / ing.pack.grams) * 1000;
  const packPrice = (perKg * ing.pack.grams) / 1000;
  const packs = Math.max(1, Math.ceil(grams / ing.pack.grams - 1e-6));
  return {
    chain,
    product: `${ing.name}, ${ing.pack.label}`,
    packs,
    packGrams: ing.pack.grams,
    unitPrice: packPrice,
    checkout: packs * packPrice,
    food: (grams / 1000) * perKg,
    leftover: packs * ing.pack.grams - grams,
    perKg,
    promo: false,
    estimated: true,
  };
}

/** Cheapest real quote across chains; an estimate only when no chain reports the item. */
export function bestQuote(ing: Ingredient, grams: number): Quote {
  const quotes = CHAIN_IDS.map((c) => quote(ing, grams, c));
  const real = quotes.filter((q) => !q.estimated);
  return (real.length ? real : quotes).reduce((a, b) => (b.checkout < a.checkout ? b : a));
}

export function quoteFor(ing: Ingredient, grams: number, store: StoreChoice): Quote {
  return store === 'mix' ? bestQuote(ing, grams) : quote(ing, grams, store);
}
