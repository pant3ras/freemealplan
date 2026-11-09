import type { StoreChoice } from './prices';

/** `soup` is an optional starter course (a Romanian ciorbă before lunch): one pot covers ~3 days. */
export type Slot = 'breakfast' | 'soup' | 'lunch' | 'dinner' | 'snack';
export const SLOTS: Slot[] = ['breakfast', 'soup', 'lunch', 'dinner', 'snack'];

export type Aisle =
  | 'Produce'
  | 'Meat & Fish'
  | 'Dairy & Eggs'
  | 'Bakery'
  | 'Grains & Pasta'
  | 'Canned & Jars'
  | 'Frozen'
  | 'Nuts & Seeds'
  | 'Oils, Spices & Sauces';

export const AISLE_ORDER: Aisle[] = [
  'Produce',
  'Bakery',
  'Meat & Fish',
  'Dairy & Eggs',
  'Grains & Pasta',
  'Canned & Jars',
  'Frozen',
  'Nuts & Seeds',
  'Oils, Spices & Sauces',
];

/** The 14 allergens EU law (Reg. 1169/2011) requires labels to declare. */
export type Allergen =
  | 'gluten'
  | 'crustaceans'
  | 'eggs'
  | 'fish'
  | 'peanuts'
  | 'soy'
  | 'milk'
  | 'nuts'
  | 'celery'
  | 'mustard'
  | 'sesame'
  | 'sulphites'
  | 'lupin'
  | 'molluscs';

export const ALLERGENS: { id: Allergen; label: string }[] = [
  { id: 'gluten', label: 'Gluten' },
  { id: 'crustaceans', label: 'Crustaceans' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'fish', label: 'Fish' },
  { id: 'peanuts', label: 'Peanuts' },
  { id: 'soy', label: 'Soy' },
  { id: 'milk', label: 'Milk' },
  { id: 'nuts', label: 'Tree nuts' },
  { id: 'celery', label: 'Celery' },
  { id: 'mustard', label: 'Mustard' },
  { id: 'sesame', label: 'Sesame' },
  { id: 'sulphites', label: 'Sulphites' },
  { id: 'lupin', label: 'Lupin' },
  { id: 'molluscs', label: 'Molluscs' },
];

/** What kind of food an ingredient is — drives diet compatibility. */
export type FoodGroup = 'pork' | 'red-meat' | 'poultry' | 'fish' | 'seafood' | 'dairy' | 'egg' | 'honey' | 'plant';

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Ingredient {
  id: string;
  name: string;
  /** Only set on ingredients the user adds; built-ins take their Romanian name from ingredient-names-ro.ts. */
  nameRo?: string;
  aisle: Aisle;
  /** Per 100 g, edible portion, from the USDA FoodData Central record below (or typed in by the user). */
  per100: Nutrients;
  fdc?: { id: number; description: string; note?: string };
  /** Added by the user in the app: their own values and price. */
  custom?: boolean;
  group: FoodGroup;
  allergens: Allergen[];
  /** The smallest pack a typical shop sells, with an estimated price in RON. */
  pack: { grams: number; price: number; label: string };
  /** How long the rest of an opened pack keeps, in days. */
  shelfDays: number;
  /** Optional count unit for display, e.g. 1 egg ≈ 55 g. */
  unit?: { name: string; grams: number };
  /** Cupboard basics most kitchens already have (oil, salt, spices). */
  staple?: boolean;
}

export type Cuisine =
  | 'Romanian'
  | 'Italian'
  | 'American'
  | 'Mexican'
  | 'Chinese'
  | 'Japanese'
  | 'Thai'
  | 'Korean'
  | 'Indian'
  | 'Greek'
  | 'Middle Eastern'
  | 'Mediterranean'
  /** Everyday breakfasts and snacks that don't belong to one cuisine. */
  | 'Classic';

export const CUISINES: Cuisine[] = [
  'Romanian',
  'Italian',
  'American',
  'Mexican',
  'Chinese',
  'Japanese',
  'Thai',
  'Korean',
  'Indian',
  'Greek',
  'Middle Eastern',
  'Mediterranean',
  'Classic',
];

/** A piece of text in both app languages. */
export interface Text {
  en: string;
  ro: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

export interface Recipe {
  id: string;
  name: Text;
  emoji: string;
  slots: Slot[];
  cuisine: Cuisine;
  /** Total time for one batch, including simmering, resting and marinating. */
  minutes: number;
  /** Hands-on time. */
  activeMinutes: number;
  difficulty: Difficulty;
  /** How many days cooked leftovers keep in the fridge (1 = eat the same day). */
  keepsDays: number;
  /** Grams per standard serving. */
  ingredients: { id: string; g: number }[];
  /** Untracked seasonings and odds and ends: salt, pepper, bay leaves, a stock cube… */
  extras: Text[];
  steps: { en: string[]; ro: string[] };
  tip?: Text;
  /** Written by the user in the app. */
  custom?: boolean;
}

export type Goal = 'lose' | 'maintain' | 'gain';
export type Sex = 'male' | 'female';
export type Diet = 'omnivore' | 'pescatarian' | 'vegetarian' | 'vegan';
export type Exclusion = 'pork' | 'red-meat' | 'gluten' | 'dairy' | 'egg' | 'nuts';
export type Repetition = 'variety' | 'balanced' | 'mealprep';

export interface HouseholdMember {
  id: string;
  name: string;
  /** Portion size relative to a standard serving (child ≈ 0.6, adult 1, big eater 1.3). */
  factor: number;
}

export interface Profile {
  goal: Goal;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  /** Mifflin–St Jeor activity multiplier (1.2 … 1.9). */
  activity: number;
  /** Overrides the calculated targets when set. */
  customTargets: { kcal: number; protein: number } | null;

  diet: Diet;
  lowCarb: boolean;
  halal: boolean;
  exclude: Exclusion[];
  allergens: Allergen[];
  /** Ingredients the user never wants to see. */
  dislikes: string[];
  /** Recipes the user never wants to see. */
  bannedRecipes: string[];
  favorites: string[];

  slots: Slot[];
  cuisines: Cuisine[];
  /** Longest total cooking time on a weekday, in minutes. */
  maxMinutes: number;
  /** Allow longer cooks (up to ~5 h) on Saturday and Sunday; their leftovers can run into the week. */
  weekendCooking: boolean;
  /** Hardest recipes to suggest. */
  skill: Difficulty;
  repetition: Repetition;

  household: HouseholdMember[];
  /** Which meals the rest of the household eats with you. */
  householdSlots: Slot[];
  /** Weekly grocery budget in RON (0 = no budget). */
  budget: number;
  /** Where the shopping list is priced: one chain, or each item at its cheapest chain. */
  store: StoreChoice;

  days: number;
  /** 0 = Monday … 6 = Sunday. */
  startDay: number;
}

export interface PlannedMeal {
  slot: Slot;
  recipeId: string;
  locked: boolean;
  /** Eaten elsewhere: not cooked, and the rest of the day stays as planned. */
  eatenOut: boolean;
  /** Removed from the day: not cooked, and the other meals grow to keep the day on target. */
  skipped?: boolean;
}

export interface DayPlan {
  meals: PlannedMeal[];
}

export interface WeekPlan {
  seed: number;
  createdAt: string;
  /** ISO date (yyyy-mm-dd) of the first day. */
  startDate: string;
  /** This week's cuisines, picked in the swipe deck (missing or empty = any). */
  cuisines?: Cuisine[];
  /** Ingredients at home this week was planned around (missing or empty = none). */
  useUp?: string[];
  /** Dishes both partners liked in the match game; the planner leans towards them. */
  prefer?: string[];
  days: DayPlan[];
}
