import { useState } from 'react';
import { ALLERGENS, type Profile } from '../data/types';
import type { CookSession } from '../engine/cooking';
import { recipePhoto } from '../data/photos';
import { ingredient, nutrientsOf, recipeAllergens, recipeBadges, recipeById } from '../engine/nutrition';
import { reconcile } from '../engine/planner';
import { linesNutrients, type Line } from '../engine/portion';
import type { MealView } from '../engine/week';
import { pick, roPlural, texts } from '../i18n';
import { COMMON, ingredientName, recipeName } from '../i18n/common';
import { useLang, useStore } from '../state/store';
import { grams, Icon, Seg, Sheet, unitHint } from './kit';
import { RecipeEditor } from './RecipeEditor';

const T = texts({
  en: {
    keeps: (d: number) => `keeps ${d} days`,
    fresh: 'eat fresh',
    handsOn: (m: number) => `${m} min hands-on`,
    contains: 'Contains:',
    yourPortion: (slot: string, pct: number, boost: number) =>
      `${slot} · your portion is ${pct} % of a standard serving${boost > 0 ? ` with ${boost} % extra of the protein ingredient` : ''} to hit your day.`,
    batch: (n: number, servings: string) => `Cook once, covers ${n} meals ≈ ${servings} standard servings. Split into boxes as listed in the cooking plan.`,
    per: (what: string) => `Per ${what}`,
    whole: 'whole batch',
    pot: 'whole pot',
    mine: 'your portion',
    standard: 'standard serving',
    servings: (n: number) => (n === 1 ? '1 serving' : `${n} servings`),
    servingsLabel: 'Servings',
    fewerServings: 'Fewer servings',
    moreServings: 'More servings',
    ingredients: (what: string) => `Ingredients · ${what}`,
    potTab: (f: number) => `Whole pot (+${f}×)`,
    mineTab: 'Your portion',
    also: 'Also',
    neverUse: (name: string) => `Never use ${name}`,
    removed: (name: string) => `${name} removed — affected meals re-planned`,
    method: 'Method',
    tip: 'Tip',
    how: 'How we compute this',
    howText: 'Each ingredient’s grams × its values per 100 g from its USDA FoodData Central record (SR Legacy). Tap a record number to check it on the USDA site. The totals below are exactly what the day check uses.',
    yourValues: 'your values',
    closest: 'closest match',
    cols: ['Ingredient', 'g', 'kcal/100 g', 'kcal', 'protein'],
    total: 'Total',
    fav: 'Favourite',
    faved: 'Favourited',
    favOn: 'Added to favourites — it will come up more often',
    favOff: 'Removed from favourites',
    ban: 'Never suggest',
    unban: 'Allow again',
    banned: 'Won’t suggest this again — re-planned',
    unbanned: 'Recipe allowed again',
    mine2: 'Your recipe',
    deleteConfirm: 'Delete this recipe? Meals that use it will be re-planned.',
    deleted: 'Recipe deleted',
    myVersion: 'My version',
    badges: { Vegan: 'Vegan', Vegetarian: 'Vegetarian', Pescatarian: 'Pescatarian', 'Gluten-free': 'Gluten-free', 'Dairy-free': 'Dairy-free', 'High protein': 'High protein', 'Low carb': 'Low carb', 'Low FODMAP': 'Low FODMAP' } as Record<string, string>,
  },
  ro: {
    keeps: (d: number) => `ține ${roPlural(d, 'zi', 'zile')}`,
    fresh: 'se mănâncă proaspăt',
    handsOn: (m: number) => `${m} min de lucru efectiv`,
    contains: 'Conține:',
    yourPortion: (slot: string, pct: number, boost: number) =>
      `${slot} · porția ta are ${pct} % dintr-o porție standard${boost > 0 ? `, cu ${boost} % în plus din ingredientul proteic` : ''}, ca ziua să iasă în țintă.`,
    batch: (n: number, servings: string) => `Gătești o dată pentru ${roPlural(n, 'masă', 'mese')} ≈ ${servings} porții standard. Împarte în caserole cum scrie în planul de gătit.`,
    per: (what: string) => `Pentru ${what}`,
    whole: 'toată tranșa',
    pot: 'toată oala',
    mine: 'porția ta',
    standard: 'o porție standard',
    servings: (n: number) => roPlural(n, 'porție', 'porții'),
    servingsLabel: 'Porții',
    fewerServings: 'Mai puține porții',
    moreServings: 'Mai multe porții',
    ingredients: (what: string) => `Ingrediente · ${what}`,
    potTab: (f: number) => `Toată oala (+${f}×)`,
    mineTab: 'Porția ta',
    also: 'Mai ai nevoie de',
    neverUse: (name: string) => `Nu folosi niciodată ${name}`,
    removed: (name: string) => `${name} scos — mesele afectate au fost replanificate`,
    method: 'Mod de preparare',
    tip: 'Sfat',
    how: 'Cum calculăm',
    howText: 'Gramele fiecărui ingredient × valorile la 100 g din fișa lui USDA FoodData Central (SR Legacy). Atinge numărul fișei ca s-o vezi pe site-ul USDA. Totalurile de mai jos sunt exact cele folosite la verificarea zilei.',
    yourValues: 'valorile tale',
    closest: 'cea mai apropiată fișă',
    cols: ['Ingredient', 'g', 'kcal/100 g', 'kcal', 'proteine'],
    total: 'Total',
    fav: 'Favorit',
    faved: 'E favorit',
    favOn: 'Adăugat la favorite — va apărea mai des',
    favOff: 'Scos de la favorite',
    ban: 'Nu mai propune',
    unban: 'Permite din nou',
    banned: 'Nu o mai propunem — am replanificat',
    unbanned: 'Rețeta e din nou permisă',
    mine2: 'Rețeta ta',
    deleteConfirm: 'Ștergi rețeta? Mesele care o folosesc vor fi replanificate.',
    deleted: 'Rețetă ștearsă',
    myVersion: 'Varianta mea',
    badges: { Vegan: 'Vegan', Vegetarian: 'Vegetarian', Pescatarian: 'Pescetarian', 'Gluten-free': 'Fără gluten', 'Dairy-free': 'Fără lactate', 'High protein': 'Bogat în proteine', 'Low carb': 'Puțini carbohidrați', 'Low FODMAP': 'FODMAP scăzut' },
  },
});

interface Props {
  recipeId: string;
  onClose: () => void;
  meal?: MealView;
  session?: CookSession;
  onToast?: (msg: string) => void;
}

export function RecipeSheet({ recipeId, onClose, meal, session, onToast }: Props) {
  const { state, dispatch } = useStore();
  const { lang, s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const p = state.profile!;
  const r = recipeById(recipeId);
  const [servings, setServings] = useState(1);
  const standard: Line[] = r.ingredients.map((l) => ({ ing: ingredient(l.id), g: l.g * servings }));
  const hasPot = !!meal && meal.othersFactor > 0;
  const [view, setView] = useState<'mine' | 'pot'>('mine');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const lines = session ? session.lines : meal ? (view === 'pot' && hasPot ? meal.potLines : meal.lines) : standard;
  const n = session ? linesNutrients(session.lines) : meal ? meal.n : nutrientsOf(r.ingredients);
  const perLabel = session ? t.whole : meal ? (view === 'pot' && hasPot ? t.pot : t.mine) : t.standard;
  // For a batch, show macros per one of your portions rather than for the whole pot.
  const shown = session ? session.meals[0].n : view === 'pot' && meal ? meal.n : n;

  const fav = p.favorites.includes(r.id);
  const banned = p.bannedRecipes.includes(r.id);

  const updateProfile = (next: Profile, msg: string) => {
    if (state.plan) dispatch({ type: 'setBoth', profile: next, plan: reconcile(state.plan, next) });
    else dispatch({ type: 'setProfile', profile: next });
    onToast?.(msg);
  };

  const allergenLabels = recipeAllergens(r).map((a) => c.allergen[a] ?? ALLERGENS.find((x) => x.id === a)?.label ?? a);
  const steps = r.steps[lang].length ? r.steps[lang] : r.steps.en;

  if (editing) return <RecipeEditor recipe={r} onClose={() => setEditing(false)} onToast={onToast} />;

  return (
    <Sheet
      onClose={onClose}
      title={
        <span>
          {r.emoji} {recipeName(r, lang)}
        </span>
      }
    >
      <div className="stack">
        {recipePhoto(r.id) && <img className="recipe-hero" src={recipePhoto(r.id)} alt="" />}
        <div className="row wrap">
          <span className="badge">
            <Icon name="clock" size={13} /> {c.minutes(r.minutes)}
          </span>
          {r.activeMinutes < r.minutes && <span className="badge">{t.handsOn(r.activeMinutes)}</span>}
          <span className={`badge difficulty-${r.difficulty}`}>{c.difficulty[r.difficulty]}</span>
          <span className="badge">{c.cuisine[r.cuisine]}</span>
          <span className="badge">{r.keepsDays > 1 ? t.keeps(r.keepsDays) : t.fresh}</span>
          {r.custom && <span className="badge ok">{t.mine2}</span>}
          {recipeBadges(r).map((b) => (
            <span key={b} className="badge ok">
              {t.badges[b] ?? b}
            </span>
          ))}
        </div>
        {allergenLabels.length > 0 && (
          <div className="muted small">
            {t.contains} {allergenLabels.join(', ')}
          </div>
        )}

        {meal && (
          <div className="muted small">
            {t.yourPortion(c.slot[meal.slot], Math.round(meal.portion.scale * 100), meal.portion.boost > 1.01 ? Math.round((meal.portion.boost - 1) * 100) : 0)}
          </div>
        )}
        {session && <div className="callout ok small">{t.batch(session.meals.length, session.servings.toFixed(1))}</div>}

        <div>
          <div className="spread" style={{ marginBottom: 6 }}>
            <span className="slot-label">{t.per(session ? t.mine : perLabel)}</span>
          </div>
          <div className="macros">
            {(
              [
                [shown.kcal, c.kcal],
                [shown.protein, c.protein],
                [shown.carbs, c.carbs],
                [shown.fat, c.fat],
                [shown.fiber, c.fibre],
              ] as const
            ).map(([v, label]) => (
              <div key={label}>
                <b>{Math.round(v)}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card flat">
          <h3 style={{ marginBottom: 4 }}>{t.ingredients(!meal && !session && servings > 1 ? t.servings(servings) : perLabel)}</h3>
          {hasPot && (
            <div style={{ margin: '6px 0' }}>
              <Seg
                value={view}
                options={[
                  { value: 'mine', label: t.mineTab },
                  { value: 'pot', label: t.potTab(meal!.othersFactor) },
                ]}
                onChange={setView}
              />
            </div>
          )}
          {!meal && !session && (
            <div className="row spread" style={{ margin: '6px 0' }}>
              <span className="muted small">{t.servingsLabel}</span>
              <div className="row">
                <button className="btn ghost sm" disabled={servings <= 1} aria-label={t.fewerServings} onClick={() => setServings(servings - 1)}>
                  −
                </button>
                <b style={{ minWidth: 96, textAlign: 'center' }}>{t.servings(servings)}</b>
                <button className="btn ghost sm" disabled={servings >= 8} aria-label={t.moreServings} onClick={() => setServings(servings + 1)}>
                  +
                </button>
              </div>
            </div>
          )}
          <div className="list">
            {lines.map((l) => (
              <div key={l.ing.id} className="item" style={{ position: 'relative' }}>
                <span className="grow">
                  {ingredientName(l.ing, lang)}
                  {unitHint(l.ing, l.g, lang) && <span className="muted small"> · {unitHint(l.ing, l.g, lang)}</span>}
                </span>
                <b style={{ fontVariantNumeric: 'tabular-nums' }}>{grams(l.g)}</b>
                <button
                  className="icon-btn"
                  style={{ width: 28, height: 28 }}
                  aria-label={t.neverUse(ingredientName(l.ing, lang))}
                  onClick={() => setMenuFor(menuFor === l.ing.id ? null : l.ing.id)}
                >
                  ⋯
                </button>
                {menuFor === l.ing.id && (
                  <div className="card" style={{ position: 'absolute', right: 0, top: 40, zIndex: 2, padding: 6 }}>
                    <button
                      className="btn ghost sm danger"
                      onClick={() => {
                        setMenuFor(null);
                        updateProfile({ ...p, dislikes: [...p.dislikes, l.ing.id] }, t.removed(ingredientName(l.ing, lang)));
                        onClose();
                      }}
                    >
                      <Icon name="ban" size={16} /> {t.neverUse(ingredientName(l.ing, lang).toLowerCase())}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {r.extras.length > 0 && (
            <p className="small" style={{ margin: '8px 0 0' }}>
              <b>{t.also}:</b> <span className="muted">{r.extras.map((x) => pick(x, lang)).join(' · ')}</span>
            </p>
          )}
        </div>

        <div className="card flat">
          <h3 style={{ marginBottom: 8 }}>{t.method}</h3>
          <ol style={{ margin: 0, paddingLeft: 20 }} className="steps-list">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {r.tip && (
            <div className="callout ok small" style={{ marginTop: 10 }}>
              <b>💡 {t.tip}:</b> {pick(r.tip, lang)}
            </div>
          )}
        </div>

        <details className="card flat">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t.how}</summary>
          <p className="muted small">{t.howText}</p>
          <table className="math">
            <thead>
              <tr>
                {t.cols.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.ing.id}>
                  <td>
                    {ingredientName(l.ing, lang)}
                    <div className="tiny">
                      {l.ing.fdc ? (
                        <a href={`https://fdc.nal.usda.gov/food-details/${l.ing.fdc.id}/nutrients`} target="_blank" rel="noreferrer" title={l.ing.fdc.description} style={{ color: 'var(--primary)' }}>
                          FDC {l.ing.fdc.id}
                        </a>
                      ) : (
                        <span className="muted">{t.yourValues}</span>
                      )}
                      {l.ing.fdc?.note && (
                        <span className="muted" title={l.ing.fdc.note}>
                          {' '}
                          · {t.closest}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{l.g}</td>
                  <td>{l.ing.per100.kcal}</td>
                  <td>{Math.round((l.ing.per100.kcal * l.g) / 100)}</td>
                  <td>{((l.ing.per100.protein * l.g) / 100).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>{t.total}</td>
                <td>{lines.reduce((sum, l) => sum + l.g, 0)}</td>
                <td />
                <td>{Math.round(n.kcal)}</td>
                <td>{n.protein.toFixed(1)}</td>
              </tr>
            </tfoot>
          </table>
        </details>

        <div className="row">
          <button
            className={`btn grow ${fav ? 'primary' : ''}`}
            onClick={() => {
              dispatch({ type: 'setProfile', profile: { ...p, favorites: fav ? p.favorites.filter((x) => x !== r.id) : [...p.favorites, r.id] } });
              onToast?.(fav ? t.favOff : t.favOn);
            }}
          >
            <Icon name="heart" size={18} /> {fav ? t.faved : t.fav}
          </button>
          {r.custom ? (
            <>
              <button className="btn grow" onClick={() => setEditing(true)}>
                <Icon name="edit" size={18} /> {c.edit}
              </button>
              <button
                className="btn danger"
                aria-label={c.delete}
                onClick={() => {
                  if (!confirm(t.deleteConfirm)) return;
                  dispatch({ type: 'deleteRecipe', id: r.id });
                  onToast?.(t.deleted);
                  onClose();
                }}
              >
                <Icon name="trash" size={18} />
              </button>
            </>
          ) : (
            <>
            <button className="btn grow" onClick={() => setEditing(true)} title={t.myVersion}>
              <Icon name="edit" size={18} /> {t.myVersion}
            </button>
            <button
              className="btn grow danger"
              onClick={() => {
                const next = banned ? { ...p, bannedRecipes: p.bannedRecipes.filter((x) => x !== r.id) } : { ...p, bannedRecipes: [...p.bannedRecipes, r.id] };
                updateProfile(next, banned ? t.unbanned : t.banned);
                onClose();
              }}
            >
              <Icon name="ban" size={18} /> {banned ? t.unban : t.ban}
            </button>
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}
