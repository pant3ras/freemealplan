import { useMemo, useState } from 'react';
import { isLowFodmap } from '../engine/fodmap';
import { CUISINE_INFO } from '../data/cuisines';
import { RECIPES } from '../data/recipes';
import { CUISINES, SLOTS, type Cuisine, type Recipe, type Slot } from '../data/types';
import { isEligible, recipeBadges, recipeBase } from '../engine/nutrition';
import { texts } from '../i18n';
import { COMMON, recipeName } from '../i18n/common';
import { useLang, useStore } from '../state/store';
import { Icon, Seg } from './kit';
import { Kitchen } from './Kitchen';
import { RecipeEditor } from './RecipeEditor';
import { RecipeSheet } from './RecipeSheet';

const T = texts({
  en: {
    views: { all: 'All recipes', kitchen: 'From my kitchen', mine: 'My recipes' },
    search: 'Search recipes or cuisines…',
    all: 'All',
    allCuisines: 'All cuisines',
    cuisine: 'Cuisine',
    fits: 'Fits my diet & filters',
    lowFodmap: 'Low FODMAP only',
    favs: 'Favourites',
    line: (kcal: number, p: number) => `${kcal} kcal · ${p} g protein`,
    none: 'Nothing matches.',
    note: 'Nutrition shown per standard serving. In your plan, portions are scaled to your targets.',
    badge: {
      Vegan: 'Vegan',
      Vegetarian: 'Vegetarian',
      Pescatarian: 'Pescatarian',
      'Gluten-free': 'Gluten-free',
      'Dairy-free': 'Dairy-free',
      'High protein': 'High protein',
      'Low carb': 'Low carb',
      'Low FODMAP': 'Low FODMAP',
    } as Record<string, string>,
    newRecipe: 'Write a new recipe',
    mineIntro: 'Recipes you write are planned, portioned, priced and put on the shopping list exactly like the built-in ones. To start from a built-in dish, open it and tap “My version”.',
    noMine: 'You haven’t written any recipes yet.',
    notPlanned: 'outside your filters',
    confirmDelete: (n: string) => `Delete “${n}”? Meals using it will be re-planned.`,
    deleted: 'Recipe deleted',
  },
  ro: {
    views: { all: 'Toate rețetele', kitchen: 'Din ce am acasă', mine: 'Rețetele mele' },
    search: 'Caută rețete sau bucătării…',
    all: 'Toate',
    allCuisines: 'Toate bucătăriile',
    cuisine: 'Bucătărie',
    fits: 'Se potrivește dietei și filtrelor mele',
    lowFodmap: 'Doar FODMAP scăzut',
    favs: 'Favorite',
    line: (kcal: number, p: number) => `${kcal} kcal · ${p} g proteine`,
    none: 'Nimic nu se potrivește.',
    note: 'Valorile nutriționale sunt pentru o porție standard. În plan, porțiile sunt ajustate după țintele tale.',
    badge: {
      Vegan: 'Vegan',
      Vegetarian: 'Vegetarian',
      Pescatarian: 'Pescetarian',
      'Gluten-free': 'Fără gluten',
      'Dairy-free': 'Fără lactate',
      'High protein': 'Bogat în proteine',
      'Low FODMAP': 'FODMAP scăzut',
      'Low carb': 'Puțini carbohidrați',
    },
    newRecipe: 'Scrie o rețetă nouă',
    mineIntro:
      'Rețetele scrise de tine sunt planificate, porționate, calculate la preț și puse pe lista de cumpărături exact ca cele incluse. Ca să pornești de la o rețetă existentă, deschide-o și apasă „Varianta mea”.',
    noMine: 'Încă nu ai scris nicio rețetă.',
    notPlanned: 'în afara filtrelor tale',
    confirmDelete: (n: string) => `Ștergi „${n}”? Mesele care o folosesc vor fi replanificate.`,
    deleted: 'Rețetă ștearsă',
  },
});

type View = 'all' | 'kitchen' | 'mine';

export function RecipesTab({ toast }: { toast: (m: string) => void }) {
  const { state, dispatch } = useStore();
  const { lang, s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const p = state.profile!;
  const [view, setView] = useState<View>('all');
  const [q, setQ] = useState('');
  const [slot, setSlot] = useState<Slot | 'all'>('all');
  const [cuisine, setCuisine] = useState<Cuisine | 'all'>('all');
  const [fitsOnly, setFitsOnly] = useState(true);
  const [favOnly, setFavOnly] = useState(false);
  const [lowOnly, setLowOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return RECIPES.filter((r) => slot === 'all' || r.slots.includes(slot))
      .filter((r) => cuisine === 'all' || r.cuisine === cuisine)
      .filter((r) => !fitsOnly || r.slots.some((x) => isEligible(r, p, x)))
      .filter((r) => !favOnly || p.favorites.includes(r.id))
      .filter((r) => !lowOnly || isLowFodmap(r))
      .filter(
        (r) =>
          !term ||
          r.name.en.toLowerCase().includes(term) ||
          r.name.ro.toLowerCase().includes(term) ||
          r.cuisine.toLowerCase().includes(term) ||
          c.cuisine[r.cuisine].toLowerCase().includes(term),
      );
    // Custom recipes and ingredients change RECIPES in place, so they're part of the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, slot, cuisine, fitsOnly, favOnly, lowOnly, p, c, state.customRecipes, state.customIngredients]);

  const row = (r: Recipe, extra?: React.ReactNode) => {
    const n = recipeBase(r.id);
    return (
      <button key={r.id} className="item" style={{ border: 0, background: 'none', textAlign: 'left', width: '100%' }} onClick={() => setOpen(r.id)}>
        <span className="meal">
          <span className="pic" style={{ width: 46, height: 46, fontSize: 24 }}>
            {r.emoji}
          </span>
        </span>
        <span className="grow">
          <b>
            {recipeName(r, lang)} {p.favorites.includes(r.id) && <span style={{ color: 'var(--accent)' }}>♥</span>}
          </b>
          <div className="muted small">
            {r.slots.map((x) => c.slot[x]).join(' / ')} · {c.minutes(r.minutes)} · {t.line(Math.round(n.kcal), Math.round(n.protein))}
          </div>
          <div className="row wrap" style={{ gap: 4, marginTop: 3 }}>
            <span className={`badge difficulty-${r.difficulty}`}>{c.difficulty[r.difficulty]}</span>
            {recipeBadges(r)
              .slice(0, 2)
              .map((b) => (
                <span key={b} className="badge">
                  {t.badge[b] ?? b}
                </span>
              ))}
            {extra}
          </div>
        </span>
        <Icon name="book" size={16} />
      </button>
    );
  };

  return (
    <div className="stack">
      <Seg value={view} options={(['all', 'kitchen', 'mine'] as const).map((v) => ({ value: v, label: t.views[v] }))} onChange={setView} />

      {view === 'kitchen' && <Kitchen onOpenRecipe={setOpen} />}

      {view === 'mine' && (
        <>
          <p className="muted small" style={{ margin: 0 }}>
            {t.mineIntro}
          </p>
          <button className="btn primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size={17} /> {t.newRecipe}
          </button>
          <div className="card list" style={{ padding: '0 14px' }}>
            {state.customRecipes.map((r) => (
              <div key={r.id} className="row" style={{ alignItems: 'center' }}>
                <div className="grow">{row(r, !r.slots.some((x) => isEligible(r, p, x)) && <span className="badge warn">{t.notPlanned}</span>)}</div>
                <button className="icon-btn" aria-label={c.edit} title={c.edit} onClick={() => setEditing(r)}>
                  <Icon name="edit" size={17} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={c.delete}
                  title={c.delete}
                  onClick={() => {
                    if (confirm(t.confirmDelete(recipeName(r, lang)))) {
                      dispatch({ type: 'deleteRecipe', id: r.id });
                      toast(t.deleted);
                    }
                  }}
                >
                  <Icon name="trash" size={17} />
                </button>
              </div>
            ))}
            {state.customRecipes.length === 0 && <p className="muted">{t.noMine}</p>}
          </div>
        </>
      )}

      {view === 'all' && (
        <>
          <input className="input" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.search} />
          <div className="row wrap">
            {(['all', ...SLOTS] as const).map((x) => (
              <button key={x} className={`chip ${slot === x ? 'on' : ''}`} onClick={() => setSlot(x)}>
                {x === 'all' ? t.all : c.slot[x]}
              </button>
            ))}
            <select className="input" style={{ width: 'auto', minHeight: 34, padding: '4px 10px' }} value={cuisine} onChange={(e) => setCuisine(e.target.value as Cuisine | 'all')} aria-label={t.cuisine}>
              <option value="all">{t.allCuisines}</option>
              {CUISINES.map((x) => (
                <option key={x} value={x}>
                  {CUISINE_INFO[x].emoji} {c.cuisine[x]}
                </option>
              ))}
            </select>
          </div>
          <div className="row wrap">
            <label className="row small" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={fitsOnly} onChange={(e) => setFitsOnly(e.target.checked)} /> {t.fits}
            </label>
            <label className="row small" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} /> {t.favs}
            </label>
            <label className="row small" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> {t.lowFodmap}
            </label>
            <span className="grow" />
            <span className="muted small">{c.recipes(list.length)}</span>
          </div>

          <div className="card list" style={{ padding: '0 14px' }}>
            {list.map((r) => row(r))}
            {list.length === 0 && <p className="muted">{t.none}</p>}
          </div>
          <p className="muted tiny">{t.note}</p>
        </>
      )}

      {open && <RecipeSheet recipeId={open} onClose={() => setOpen(null)} onToast={toast} />}
      {editing && <RecipeEditor recipe={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onToast={toast} />}
    </div>
  );
}
