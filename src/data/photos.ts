import type { Cuisine } from './types';
import CREDITS from './photo-credits.json';

/**
 * Food photos from Wikimedia Commons, bundled in public/food (picked with
 * scripts/fetch-photos.mjs). Every one is CC0, public domain or CC BY / BY-SA,
 * so the app lists a credit line for each in the Me tab.
 */
export interface PhotoCredit {
  file: string;
  page: string;
  author: string;
  licence: string;
  licenceUrl: string;
}

export const PHOTO_CREDITS = CREDITS as Record<string, PhotoCredit>;

const url = (key: string) => (PHOTO_CREDITS[key] ? `${import.meta.env.BASE_URL}food/${key}.webp` : undefined);

/** Photo for a built-in recipe; own recipes and a few dishes without a fitting free photo have none. */
export const recipePhoto = (id: string) => url(id);

export const cuisineKey = (c: Cuisine) => `cuisine-${c.toLowerCase().replace(/\s+/g, '-')}`;
export const cuisinePhoto = (c: Cuisine) => url(cuisineKey(c));

/** A small square thumbnail: just the photo, or the cuisine colours behind the emoji. */
export const thumbBackground = (photo: string | undefined, from: string, to: string) =>
  photo ? `url("${photo}") center / cover no-repeat` : `linear-gradient(135deg, ${from}, ${to})`;

/** The card background: the photo under a dark fade so white text stays readable, or the cuisine colours. */
export function cardBackground(photo: string | undefined, from: string, to: string): string {
  const colours = `linear-gradient(160deg, ${from}, ${to})`;
  if (!photo) return colours;
  return `linear-gradient(180deg, rgba(0,0,0,0) 22%, rgba(0,0,0,0.55) 52%, rgba(0,0,0,0.88) 100%), url("${photo}") center / cover no-repeat, ${colours}`;
}
