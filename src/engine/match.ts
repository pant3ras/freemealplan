import { CUISINES, type Cuisine, type Recipe } from '../data/types';
import { RECIPE_BOOK } from '../data/recipe-book';
import { rng } from './planner';

/**
 * The match game: two people swipe the same deck on their own phones and swap a short
 * code (by message, no server), then see the cuisines and dishes they both liked.
 *
 * The deck comes from a seed and only uses built-in recipes, so both phones build the
 * same cards whatever their profiles are.
 */
export type MatchMode = 'tonight' | 'week';

export type MatchCard = { kind: 'cuisine'; cuisine: Cuisine } | { kind: 'dish'; recipe: Recipe };

export interface MatchVotes {
  mode: MatchMode;
  seed: number;
  likes: boolean[];
  name: string;
}

const PREFIX = 'WP1';
/** Changes when the recipe book does, so a code from another app version is spotted. */
const BOOK = RECIPE_BOOK.length.toString(36);
const SIZE: Record<MatchMode, { cuisines: number; dishes: number }> = {
  tonight: { cuisines: 0, dishes: 15 },
  week: { cuisines: 8, dishes: 20 },
};

const isMainDish = (r: Recipe) => r.slots.includes('dinner') || r.slots.includes('lunch');

function shuffled<T>(list: T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function matchDeck(mode: MatchMode, seed: number): MatchCard[] {
  const rand = rng(seed);
  const size = SIZE[mode];
  const cuisines = shuffled(
    CUISINES.filter((c) => c !== 'Classic'),
    rand,
  ).slice(0, size.cuisines);
  // Spread the dishes over cuisines so one cuisine can't fill the deck.
  const byCuisine = new Map<Cuisine, Recipe[]>();
  for (const r of shuffled(RECIPE_BOOK.filter(isMainDish), rand)) byCuisine.set(r.cuisine, [...(byCuisine.get(r.cuisine) ?? []), r]);
  const dishes: Recipe[] = [];
  for (let round = 0; dishes.length < size.dishes && round < 20; round++)
    for (const list of shuffled([...byCuisine.values()], rand)) if (list[round] && dishes.length < size.dishes) dishes.push(list[round]);
  return [...cuisines.map((cuisine) => ({ kind: 'cuisine' as const, cuisine })), ...dishes.map((recipe) => ({ kind: 'dish' as const, recipe }))];
}

export const newSeed = () => Math.floor(Math.random() * 36 ** 6);

/** Likes as a compact base-36 bit string, four cards per character. */
function packLikes(likes: boolean[]): string {
  let out = '';
  for (let i = 0; i < likes.length; i += 4) {
    let n = 0;
    for (let b = 0; b < 4; b++) if (likes[i + b]) n |= 1 << b;
    out += n.toString(16);
  }
  return out;
}

function unpackLikes(s: string, count: number): boolean[] {
  const likes: boolean[] = [];
  for (let i = 0; i < count; i++) likes.push(((parseInt(s[i >> 2] ?? '0', 16) >> (i % 4)) & 1) === 1);
  return likes;
}

/** WP1.<mode>.<book>.<seed>.<likes>.<name> */
export function encodeVotes(v: MatchVotes): string {
  const name = v.name.trim().replace(/[.\s]+/g, '_').slice(0, 20);
  return [PREFIX, v.mode === 'week' ? 'w' : 't', BOOK, v.seed.toString(36), packLikes(v.likes), encodeURIComponent(name)].join('.');
}

export type Decoded = { ok: true; votes: MatchVotes } | { ok: false; reason: 'invalid' | 'version' };

/** Finds and reads a code anywhere in a pasted message. */
export function decodeVotes(text: string): Decoded {
  const m = text.match(/WP1\.([tw])\.([0-9a-z]+)\.([0-9a-z]+)\.([0-9a-f]+)\.?([^\s]*)/i);
  if (!m) return { ok: false, reason: 'invalid' };
  if (m[2].toLowerCase() !== BOOK) return { ok: false, reason: 'version' };
  const mode: MatchMode = m[1].toLowerCase() === 'w' ? 'week' : 'tonight';
  const seed = parseInt(m[3], 36);
  const count = matchDeck(mode, seed).length;
  if (!Number.isFinite(seed) || m[4].length !== Math.ceil(count / 4)) return { ok: false, reason: 'invalid' };
  let name = '';
  try {
    name = decodeURIComponent(m[5] ?? '').replace(/_/g, ' ');
  } catch {
    name = '';
  }
  return { ok: true, votes: { mode, seed, likes: unpackLikes(m[4].toLowerCase(), count), name } };
}

export interface MatchResult {
  cuisines: Cuisine[];
  dishes: Recipe[];
  /** Dishes only one of you liked: a fallback when nothing matched. */
  maybe: Recipe[];
}

export function compareVotes(a: MatchVotes, b: MatchVotes): MatchResult {
  const deck = matchDeck(a.mode, a.seed);
  const cuisines: Cuisine[] = [];
  const dishes: Recipe[] = [];
  const maybe: Recipe[] = [];
  deck.forEach((card, i) => {
    const both = a.likes[i] && b.likes[i];
    if (card.kind === 'cuisine') {
      if (both) cuisines.push(card.cuisine);
    } else if (both) dishes.push(card.recipe);
    else if (a.likes[i] || b.likes[i]) maybe.push(card.recipe);
  });
  return { cuisines, dishes, maybe };
}

export const sameDeck = (a: MatchVotes, b: MatchVotes) => a.mode === b.mode && a.seed === b.seed;
