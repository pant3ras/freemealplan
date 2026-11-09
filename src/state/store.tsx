import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { registerCustom } from '../data/custom';
import { RECIPE_MAP } from '../data/recipes';
import { CUISINES, type Ingredient, type Profile, type Recipe, type WeekPlan } from '../data/types';
import { DEFAULT_PANTRY, DEFAULT_PROFILE } from '../engine/defaults';
import { reconcile } from '../engine/planner';
import { computeTargets, type Targets } from '../engine/targets';
import { buildWeek, type DayView } from '../engine/week';
import { detectLang, type Lang } from '../i18n';
import { persistNative } from '../native';

export interface AppState {
  version: 1;
  lang: Lang;
  profile: Profile | null;
  plan: WeekPlan | null;
  /** Ingredient ids already at home. */
  pantry: string[];
  /** Shopping list items ticked off. */
  checked: string[];
  /** Recipes and ingredients the user wrote themselves. */
  customRecipes: Recipe[];
  customIngredients: Ingredient[];
}

type Action =
  | { type: 'setLang'; lang: Lang }
  | { type: 'setProfile'; profile: Profile }
  | { type: 'setPlan'; plan: WeekPlan }
  | { type: 'setBoth'; profile: Profile; plan: WeekPlan }
  | { type: 'togglePantry'; id: string }
  | { type: 'toggleChecked'; id: string }
  | { type: 'clearChecked' }
  | { type: 'saveRecipe'; recipe: Recipe }
  | { type: 'deleteRecipe'; id: string }
  | { type: 'saveIngredient'; ingredient: Ingredient }
  | { type: 'reset' };

const KEY = 'weekplate:v1';
const INITIAL: AppState = {
  version: 1,
  lang: detectLang(),
  profile: null,
  plan: null,
  pantry: DEFAULT_PANTRY,
  checked: [],
  customRecipes: [],
  customIngredients: [],
};

/** Meals pointing at a recipe that no longer exists (renamed in an update, or deleted) get re-planned. */
function repairPlan(plan: WeekPlan | null, profile: Profile | null): WeekPlan | null {
  if (!plan || !profile) return plan;
  const broken = plan.days.some((d) => d.meals.some((m) => m.recipeId && !RECIPE_MAP[m.recipeId]));
  if (!broken) return plan;
  const cleaned = { ...plan, days: plan.days.map((d) => ({ meals: d.meals.map((m) => (RECIPE_MAP[m.recipeId] ? m : { ...m, recipeId: '', locked: false })) })) };
  return reconcile(cleaned, profile);
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s.version === 1) {
        // State saved by older builds misses newer fields (store, lang, custom recipes…) and
        // may name cuisines that were since split up (the old "Asian").
        const state: AppState = { ...INITIAL, ...s };
        state.profile = s.profile ? { ...DEFAULT_PROFILE, ...s.profile } : null;
        if (state.profile) state.profile.cuisines = state.profile.cuisines.filter((c) => CUISINES.includes(c));
        registerCustom(state.customRecipes, state.customIngredients);
        state.plan = repairPlan(state.plan, state.profile);
        return state;
      }
    }
  } catch {
    // Private mode or unreadable data: keep a copy so a fresh start doesn't destroy it.
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) localStorage.setItem(`${KEY}:backup`, raw);
    } catch {
      // Storage blocked entirely.
    }
  }
  return INITIAL;
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const upsert = <T extends { id: string }>(list: T[], item: T) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'setLang':
      return { ...s, lang: a.lang };
    case 'setProfile':
      return { ...s, profile: a.profile };
    case 'setPlan':
      return { ...s, plan: a.plan, checked: [] };
    case 'setBoth':
      return { ...s, profile: a.profile, plan: a.plan, checked: [] };
    case 'togglePantry':
      return { ...s, pantry: toggle(s.pantry, a.id) };
    case 'toggleChecked':
      return { ...s, checked: toggle(s.checked, a.id) };
    case 'clearChecked':
      return { ...s, checked: [] };
    case 'saveRecipe': {
      const customRecipes = upsert(s.customRecipes, a.recipe);
      registerCustom(customRecipes, s.customIngredients);
      return { ...s, customRecipes };
    }
    case 'deleteRecipe': {
      const customRecipes = s.customRecipes.filter((r) => r.id !== a.id);
      registerCustom(customRecipes, s.customIngredients);
      const profile = s.profile && { ...s.profile, favorites: s.profile.favorites.filter((x) => x !== a.id) };
      return { ...s, customRecipes, profile, plan: repairPlan(s.plan, profile) };
    }
    case 'saveIngredient': {
      const customIngredients = upsert(s.customIngredients, a.ingredient);
      registerCustom(s.customRecipes, customIngredients);
      return { ...s, customIngredients };
    }
    case 'reset':
      return { ...INITIAL, lang: s.lang };
  }
}

interface Store {
  state: AppState;
  dispatch: (a: Action) => void;
  targets: Targets | null;
  week: DayView[] | null;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    // savedAt lets the Android app tell which of its two copies is newer (see native.ts).
    const raw = JSON.stringify({ ...state, savedAt: Date.now() });
    try {
      localStorage.setItem(KEY, raw);
    } catch {
      // Storage full or blocked — the app still works for this session.
    }
    persistNative(raw);
  }, [state]);

  useEffect(() => {
    document.documentElement.lang = state.lang;
  }, [state.lang]);

  const targets = useMemo(() => (state.profile ? computeTargets(state.profile) : null), [state.profile]);
  const week = useMemo(
    () => (state.profile && state.plan && targets ? buildWeek(state.plan, state.profile, targets) : null),
    // Custom recipes change what a recipe id means, so they're part of the key too.
    [state.plan, state.profile, targets, state.customRecipes, state.customIngredients],
  );

  return <Ctx.Provider value={{ state, dispatch, targets, week }}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

/** The current language and a picker for a screen's strings. */
export function useLang() {
  const { state } = useStore();
  const lang = state.lang;
  return {
    lang,
    s: <T,>(d: { en: T; ro: T }): T => d[lang],
  };
}
