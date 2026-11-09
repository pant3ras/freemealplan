import { useMemo, useState } from 'react';
import { INGREDIENT_LIST, INGREDIENTS } from '../data/ingredients';
import { AISLE_ORDER, SLOTS, type Ingredient, type Slot } from '../data/types';
import { isPerishable, kitchenMatches, useUpList } from '../engine/kitchen';
import { enPlural, roPlural, texts } from '../i18n';
import { COMMON, ingredientName, recipeName } from '../i18n/common';
import { useLang, useStore } from '../state/store';
import { Icon, Seg } from './kit';

const T = texts({
  en: {
    intro: 'Tick what’s in your fridge and cupboards. Dishes that use it come first, and anything you have stays off the shopping list.',
    search: 'Search ingredients…',
    atHome: (n: number) => `At home (${n})`,
    nothing: 'Nothing ticked yet — start with what’s in the fridge.',
    clearFresh: 'Clear all',
    staples: 'Cupboard basics (oil, salt, spices…) — assumed at home',
    showStaples: 'Show cupboard basics',
    hideStaples: 'Hide cupboard basics',
    spoils: 'use soon',
    youCanCook: 'What you can cook',
    allSlots: 'Any meal',
    ready: 'You have everything',
    missing: (list: string) => `Buy: ${list}`,
    minor: (list: string) => `small amounts: ${list}`,
    uses: (list: string) => `Uses your ${list}`,
    cover: (pct: number) => `${pct} % from home`,
    noMatch: 'No dish fits your filters with what’s ticked. Add a few more ingredients, or allow one more item to buy.',
    maxMissing: 'Main things to buy',
    upTo: (n: number) => (n === 0 ? 'none' : `≤ ${n}`),
    planAround: (n: number) => `Plan the week around ${enPlural(n, 'item', 'items')} I have`,
    planNote: 'Re-plans unlocked meals so they use up what you have (fresh food first). Your targets and budget still apply.',
    more: (n: number) => `Show ${n} more`,
  },
  ro: {
    intro: 'Bifează ce ai în frigider și în cămară. Felurile care le folosesc apar primele, iar ce ai deja nu mai intră pe lista de cumpărături.',
    search: 'Caută ingrediente…',
    atHome: (n: number) => `Acasă (${n})`,
    nothing: 'Nimic bifat încă — începe cu ce e în frigider.',
    clearFresh: 'Debifează tot',
    staples: 'Bazele din cămară (ulei, sare, condimente…) — le considerăm acasă',
    showStaples: 'Arată bazele din cămară',
    hideStaples: 'Ascunde bazele din cămară',
    spoils: 'de folosit repede',
    youCanCook: 'Ce poți găti',
    allSlots: 'Orice masă',
    ready: 'Ai tot ce trebuie',
    missing: (list: string) => `De cumpărat: ${list}`,
    minor: (list: string) => `puțin: ${list}`,
    uses: (list: string) => `Folosește ${list}`,
    cover: (pct: number) => `${pct} % din ce ai`,
    noMatch: 'Cu ce ai bifat nu iese niciun fel care să respecte filtrele. Mai adaugă câteva ingrediente sau acceptă încă un produs de cumpărat.',
    maxMissing: 'Ingrediente principale de cumpărat',
    upTo: (n: number) => (n === 0 ? 'nimic' : `≤ ${n}`),
    planAround: (n: number) => `Planifică săptămâna în jurul a ${roPlural(n, 'produs', 'produse')} de acasă`,
    planNote: 'Replanifică mesele neblocate ca să folosească ce ai (întâi ce se strică repede). Țintele și bugetul rămân valabile.',
    more: (n: number) => `Arată încă ${n}`,
  },
});

/**
 * "What's in my kitchen?" — tick ingredients you have, see the dishes you can make
 * with the fewest things to buy, and (optionally) re-plan the week around them.
 */
export function Kitchen({ onOpenRecipe, onPlanAround }: { onOpenRecipe: (id: string) => void; onPlanAround?: (useUp: string[]) => void }) {
  const { state, dispatch } = useStore();
  const { lang, s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const p = state.profile!;
  const [q, setQ] = useState('');
  const [staples, setStaples] = useState(false);
  const [slot, setSlot] = useState<Slot | 'all'>('all');
  const [maxMissing, setMaxMissing] = useState(2);
  const [limit, setLimit] = useState(12);

  const home = state.pantry;
  const fresh = useMemo(() => useUpList(home), [home]);
  const name = (id: string) => (INGREDIENTS[id] ? ingredientName(INGREDIENTS[id], lang) : id);
  const toggle = (id: string) => dispatch({ type: 'togglePantry', id });

  const term = q.trim().toLowerCase();
  const shown = INGREDIENT_LIST.filter((i) => (staples || !i.staple) && (!term || i.name.toLowerCase().includes(term) || ingredientName(i, 'ro').toLowerCase().includes(term)));
  const byAisle = AISLE_ORDER.map((a) => ({ aisle: a, items: shown.filter((i) => i.aisle === a).sort((x, y) => ingredientName(x, lang).localeCompare(ingredientName(y, lang), lang)) })).filter((g) => g.items.length);

  // Custom recipes and ingredients are part of the key: they change what the lists contain.
  const matches = useMemo(() => kitchenMatches(p, home, slot, maxMissing), [p, home, slot, maxMissing, state.customRecipes, state.customIngredients]);

  const chip = (i: Ingredient) => {
    const on = home.includes(i.id);
    return (
      <button key={i.id} className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(i.id)}>
        {ingredientName(i, lang)}
      </button>
    );
  };

  return (
    <div className="stack">
      <p className="muted small" style={{ margin: 0 }}>
        {t.intro}
      </p>

      <div className="card stack" style={{ gap: 8 }}>
        <div className="spread">
          <b>{t.atHome(fresh.length)}</b>
          {fresh.length > 0 && (
            <button className="btn ghost sm" onClick={() => fresh.forEach(toggle)}>
              {t.clearFresh}
            </button>
          )}
        </div>
        {fresh.length ? (
          <div className="row wrap">
            {fresh.map((id) => (
              <button key={id} className="chip on" onClick={() => toggle(id)}>
                {name(id)}
                {isPerishable(id) && <span className="tiny" style={{ opacity: 0.8 }}> · {t.spoils}</span>} ✕
              </button>
            ))}
          </div>
        ) : (
          <p className="muted small" style={{ margin: 0 }}>
            {t.nothing}
          </p>
        )}
        {onPlanAround && fresh.length > 0 && (
          <>
            <button className="btn primary" onClick={() => onPlanAround(fresh)}>
              <Icon name="refresh" size={17} /> {t.planAround(fresh.length)}
            </button>
            <p className="muted tiny" style={{ margin: 0 }}>
              {t.planNote}
            </p>
          </>
        )}
      </div>

      <input className="input" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.search} />
      <div className="card stack kitchen-aisles" style={{ gap: 10 }}>
        {byAisle.map((g) => (
          <div key={g.aisle}>
            <div className="muted tiny" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {c.aisle[g.aisle]}
            </div>
            <div className="row wrap" style={{ gap: 5 }}>
              {g.items.map(chip)}
            </div>
          </div>
        ))}
        <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => setStaples(!staples)} title={t.staples}>
          {staples ? t.hideStaples : t.showStaples}
        </button>
      </div>

      <div className="section-title">{t.youCanCook}</div>
      <div className="row wrap">
        {(['all', ...SLOTS.filter((x) => p.slots.includes(x))] as const).map((x) => (
          <button key={x} className={`chip ${slot === x ? 'on' : ''}`} onClick={() => setSlot(x)}>
            {x === 'all' ? t.allSlots : c.slot[x]}
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <span className="muted small">{t.maxMissing}</span>
        <Seg value={maxMissing} options={[0, 1, 2, 3].map((n) => ({ value: n, label: t.upTo(n) }))} onChange={setMaxMissing} />
      </div>

      <div className="card list" style={{ padding: '0 14px' }}>
        {matches.slice(0, limit).map((m) => (
          <button key={m.recipe.id} className="item" style={{ border: 0, background: 'none', textAlign: 'left', width: '100%' }} onClick={() => onOpenRecipe(m.recipe.id)}>
            <span style={{ fontSize: 26 }}>{m.recipe.emoji}</span>
            <span className="grow">
              <b>{recipeName(m.recipe, lang)}</b>
              <div className="small" style={{ color: 'var(--ok, #2e7d32)' }}>
                {t.uses(m.have.map(name).join(', '))}
              </div>
              <div className="muted small">
                {m.missing.length === 0
                  ? t.ready
                  : [
                      m.missingMain.length > 0 && t.missing(m.missingMain.map(name).join(', ')),
                      m.missing.length > m.missingMain.length && t.minor(m.missing.slice(m.missingMain.length).map(name).join(', ')),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
              </div>
            </span>
            <span className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
              <span className={`badge ${m.missingMain.length === 0 ? 'ok' : ''}`}>{t.cover(Math.round(m.coverage * 100))}</span>
              {m.perishables.length > 0 && <span className="badge warn">{t.spoils}</span>}
            </span>
          </button>
        ))}
        {matches.length === 0 && <p className="muted small">{fresh.length ? t.noMatch : t.nothing}</p>}
      </div>
      {matches.length > limit && (
        <button className="btn block" onClick={() => setLimit(limit + 12)}>
          {t.more(Math.min(12, matches.length - limit))}
        </button>
      )}
    </div>
  );
}
