import { useMemo, useState } from 'react';
import { CUISINE_INFO } from '../data/cuisines';
import { recipePhoto, thumbBackground } from '../data/photos';
import type { Cuisine } from '../data/types';
import { cookSessions } from '../engine/cooking';
import { mealReasons, type Reason } from '../engine/explain';
import { recipeById } from '../engine/nutrition';
import { generatePlan, regenerateFrom, setMeal, swapOptions } from '../engine/planner';
import { buildShoppingList } from '../engine/shopping';
import type { DayView, MealView } from '../engine/week';
import { enPlural, roPlural, texts } from '../i18n';
import { INGREDIENTS } from '../data/ingredients';
import { COMMON, dayLabel, ingredientName, recipeName } from '../i18n/common';
import { useLang, useStore } from '../state/store';
import { CuisineSwipe } from './CuisineSwipe';
import { DishSwipe } from './DishSwipe';
import { Kitchen } from './Kitchen';
import { MatchGame } from './MatchGame';
import { Bar, grams, Icon, money, Sheet } from './kit';
import { RecipeSheet } from './RecipeSheet';

const T = texts({
  en: {
    weekOf: (d: string) => `Week of ${d}`,
    onTarget: (ok: number, n: number) => `${ok}/${n} days on target`,
    checkout: 'Checkout',
    ofBudget: (b: string) => `of ${b} budget`,
    misses: (n: number, list: string) => `${enPlural(n, 'day', 'days')} can’t fully meet your targets with these filters: ${list}. Try a swap, add a snack, or widen your diet filters.`,
    protShort: (g: number) => `−${g} g protein`,
    kcalOff: (k: number) => `${k > 0 ? '+' : ''}${k} kcal`,
    thisWeek: 'This week:',
    anyCuisine: 'any cuisine',
    swipeCuisines: '🎲 Swipe cuisines',
    locked: 'Locked',
    eatingOut: 'Eating out',
    removed: 'Removed',
    household: (f: number) => `+${f}× household`,
    outNote: 'Not cooked, not on the shopping list — the rest of the day stays as planned.',
    skippedNote: 'Removed from this day — the other meals grew to keep you on target.',
    restore: 'Bring it back',
    mealLine: (g: string, kcal: number, p: number, active: number, total: number) =>
      `${g} · ${kcal} kcal · ${p} g protein · ${total > active ? `${active} min hands-on, ${total} total` : `${total} min`}`,
    swap: 'Swap',
    lock: 'Lock — keep when re-planning',
    unlock: 'Unlock',
    eatOut: 'I’m eating out for this meal',
    redoFrom: (d: string) => `Redo from ${d}`,
    newWeek: 'New week',
    toastBack: 'Back on the plan',
    toastOut: 'Marked as eaten out — removed from shopping list',
    toastSkip: 'Meal removed — the rest of the day re-portioned',
    toastRestore: 'Meal is back',
    toastSwapped: 'Swapped',
    toastRedo: (d: string) => `Re-planned ${d} onwards (locked meals kept)`,
    toastNew: (c: string) => (c ? `New week: ${c}` : 'New week ready'),
    toastTheme: (c: string) => (c ? `Re-planned around ${c} — locked meals kept` : 'Re-planned with any cuisine'),
    clearAny: 'Clear — any cuisine',
    skipAny: 'Skip — any cuisine',
    // day card
    status: { ok: 'On target', out: 'Includes a meal out — totals are for home meals' },
    statusShort: (g: number) => `${g} g short of your protein floor`,
    statusKcal: (k: number) => `${k > 0 ? '+' : ''}${k} kcal outside your band`,
    calories: 'Calories',
    protein: 'Protein',
    floor: 'floor',
    macros: (c: number, f: number, fi: number) => `Carbs ${c} g · Fat ${f} g · Fibre ${fi} g`,
    // reasons
    why: {
      batch: (n: number) => `cook once → ${enPlural(n, 'meal', 'meals')}`,
      soupPot: (n: number) => `one pot → ${enPlural(n, 'day', 'days')}`,
      leftover: (d: string) => `leftovers from ${d}`,
      theme: 'this week’s cuisine',
      home: (list: string) => `uses your ${list}`,
      favorite: '♥ favourite',
      protein: (pct: number) => `high protein (${pct} %)`,
      budget: 'budget-friendly',
      quick: 'quick',
      weekend: 'weekend cook',
    },
    howTitle: 'How is this week planned?',
    how: [
      'It isn’t random. Every possible week is scored, and the planner keeps improving it for a few thousand rounds (simulated annealing), keeping the best one it finds.',
      'Hard rules first: your diet, allergies, dislikes, time limit and skill level decide which recipes are even allowed.',
      'Every single day must clear your protein floor and land within ±5 % of your calories. Portions are tuned per meal — lean meat or fish can be boosted — so the numbers work without you weighing anything extra.',
      'Cooking effort: dishes repeat the way you asked (variety, balanced or meal prep), batches never outlive their fridge life, and a soup pot covers about three days.',
      'Long cooks (braises, sarmale, proper ragù) are only planned for Saturday or Sunday; their leftovers can carry into the week.',
      'Taste and habits: this week’s swiped cuisines, your favourites, never the same dish for lunch and dinner, and no dish more than a few times a week.',
      'Money: the whole shopping list is priced at your store, in real pack sizes, and steered towards your budget.',
      'The small chips under each meal say why that dish is there.',
    ],
    // list sheet
    listTitle: (slot: string) => `Swap ${slot}`,
    listIntro: (name: string, day: string) => `Instead of ${name}. Best fits for ${day} first — portions are re-tuned automatically.`,
    portion: (k: number, p: number, m: number) => `Your portion ${k} kcal · ${p} g protein · ${m} min`,
    sameDay: ' · already on this day',
    dayFits: 'Day fits',
    dayShortB: (g: number) => `Day −${g} g protein`,
    dayKcalB: 'Day kcal off',
    inPlan: 'in plan',
    thisWeekB: 'this week',
    showAll: (n: number) => `Show all ${n} options`,
    none: 'No other recipes fit your filters for this meal.',
    swipeView: 'Swipe view',
    kitchen: '🧺 Cook from what I have',
    kitchenTitle: 'What’s in my kitchen?',
    usingUp: (n: number) => `Planned around ${enPlural(n, 'thing', 'things')} you have`,
    stopUsing: 'Stop',
    toastKitchen: (n: number) => `Re-planned to use up ${enPlural(n, 'item', 'items')} from home — locked meals kept`,
    toastKitchenOff: 'No longer planning around your kitchen',
    today: '🍳 What to cook today?',
    together: '💞 Decide together',
    todayTitle: 'What to cook today?',
    todayIntro: (day: string) => `Planned for ${day}:`,
    nothingToday: 'No lunch or dinner is planned for this day.',
    otherDish: 'Swipe for something else',
    surprise: '🎲 Surprise me',
    togetherSub: 'Swipe with your partner on your own phones and cook what you both like.',
    toastTonight: (name: string) => `${name} it is!`,
    toastTogether: 'Week re-planned around what you both like',
  },
  ro: {
    weekOf: (d: string) => `Săptămâna din ${d}`,
    onTarget: (ok: number, n: number) => `${ok}/${n} zile în țintă`,
    checkout: 'La casă',
    ofBudget: (b: string) => `din bugetul de ${b}`,
    misses: (n: number, list: string) => `${roPlural(n, 'zi nu își poate', 'zile nu își pot')} atinge complet țintele cu filtrele astea: ${list}. Încearcă o înlocuire, adaugă o gustare sau relaxează filtrele.`,
    protShort: (g: number) => `−${g} g proteine`,
    kcalOff: (k: number) => `${k > 0 ? '+' : ''}${k} kcal`,
    thisWeek: 'Săptămâna asta:',
    anyCuisine: 'orice bucătărie',
    swipeCuisines: '🎲 Alege bucătării',
    locked: 'Blocată',
    eatingOut: 'Mănânc în oraș',
    removed: 'Scoasă',
    household: (f: number) => `+${f}× familie`,
    outNote: 'Nu se gătește și nu intră pe lista de cumpărături — restul zilei rămâne cum a fost planificat.',
    skippedNote: 'Scoasă din ziua asta — celelalte mese au crescut ca să rămâi în țintă.',
    restore: 'Pune-o înapoi',
    mealLine: (g: string, kcal: number, p: number, active: number, total: number) =>
      `${g} · ${kcal} kcal · ${p} g proteine · ${total > active ? `${active} min efectiv, ${total} în total` : `${total} min`}`,
    swap: 'Schimbă',
    lock: 'Blochează — rămâne la replanificare',
    unlock: 'Deblochează',
    eatOut: 'La masa asta mănânc în oraș',
    redoFrom: (d: string) => `Refă de ${d}`,
    newWeek: 'Săptămână nouă',
    toastBack: 'Înapoi în plan',
    toastOut: 'Marcată „în oraș” — scoasă de pe lista de cumpărături',
    toastSkip: 'Masă scoasă — restul zilei a fost reporționat',
    toastRestore: 'Masa e înapoi',
    toastSwapped: 'Schimbat',
    toastRedo: (d: string) => `Replanificat de ${d} încolo (mesele blocate rămân)`,
    toastNew: (c: string) => (c ? `Săptămână nouă: ${c}` : 'Săptămâna nouă e gata'),
    toastTheme: (c: string) => (c ? `Replanificat în jurul bucătăriilor: ${c} — mesele blocate rămân` : 'Replanificat cu orice bucătărie'),
    clearAny: 'Șterge — orice bucătărie',
    skipAny: 'Sari peste — orice bucătărie',
    status: { ok: 'În țintă', out: 'Include o masă în oraș — totalurile sunt pentru mesele de acasă' },
    statusShort: (g: number) => `Lipsesc ${g} g până la minimul de proteine`,
    statusKcal: (k: number) => `${k > 0 ? '+' : ''}${k} kcal în afara intervalului`,
    calories: 'Calorii',
    protein: 'Proteine',
    floor: 'minim',
    macros: (c: number, f: number, fi: number) => `Carbohidrați ${c} g · Grăsimi ${f} g · Fibre ${fi} g`,
    why: {
      batch: (n: number) => `gătești o dată → ${roPlural(n, 'masă', 'mese')}`,
      soupPot: (n: number) => `o oală → ${roPlural(n, 'zi', 'zile')}`,
      leftover: (d: string) => `rămas de ${d}`,
      theme: 'bucătăria săptămânii',
      home: (list: string) => `folosește ${list} de acasă`,
      favorite: '♥ favorit',
      protein: (pct: number) => `bogat în proteine (${pct} %)`,
      budget: 'ieftin',
      quick: 'rapid',
      weekend: 'de gătit în weekend',
    },
    howTitle: 'Cum e gândită săptămâna?',
    how: [
      'Nu e la întâmplare. Fiecare variantă de săptămână primește un scor, iar planificatorul o tot îmbunătățește câteva mii de runde (simulated annealing) și păstrează cea mai bună variantă găsită.',
      'Întâi regulile ferme: dieta, alergiile, ce nu-ți place, timpul maxim și nivelul de dificultate decid ce rețete au voie să apară.',
      'Fiecare zi în parte trebuie să atingă minimul de proteine și să rămână în ±5 % din calorii. Porțiile se potrivesc la fiecare masă — carnea slabă sau peștele pot fi mărite — ca cifrele să iasă fără să cântărești nimic în plus.',
      'Efortul de gătit: felurile se repetă cum ai ales (variat, echilibrat sau la grămadă), nimic nu stă în frigider mai mult decât ține, iar o oală de ciorbă acoperă cam trei zile.',
      'Rețetele lungi (tocănițe, sarmale, ragù adevărat) se planifică doar sâmbăta sau duminica; ce rămâne poate merge în timpul săptămânii.',
      'Gust și obiceiuri: bucătăriile alese săptămâna asta, favoritele tale, niciodată același fel la prânz și la cină și niciun fel de prea multe ori pe săptămână.',
      'Bani: toată lista de cumpărături e calculată la magazinul tău, în ambalaje reale, și ținută cât se poate în buget.',
      'Etichetele mici de sub fiecare masă îți spun de ce e acolo felul respectiv.',
    ],
    listTitle: (slot: string) => `Schimbă ${slot}`,
    listIntro: (name: string, day: string) => `În loc de ${name}. Primele sunt cele care se potrivesc cel mai bine pentru ${day} — porțiile se recalculează automat.`,
    portion: (k: number, p: number, m: number) => `Porția ta ${k} kcal · ${p} g proteine · ${m} min`,
    sameDay: ' · deja în ziua asta',
    dayFits: 'Ziua iese',
    dayShortB: (g: number) => `Ziua −${g} g proteine`,
    dayKcalB: 'Ziua iese din calorii',
    inPlan: 'în plan',
    thisWeekB: 'săptămâna asta',
    showAll: (n: number) => `Arată toate cele ${n} variante`,
    none: 'Nicio altă rețetă nu se potrivește filtrelor pentru masa asta.',
    swipeView: 'Înapoi la carduri',
    kitchen: '🧺 Gătesc din ce am',
    kitchenTitle: 'Ce am în casă?',
    usingUp: (n: number) => `Planificat în jurul a ${roPlural(n, 'produs', 'produse')} de acasă`,
    stopUsing: 'Oprește',
    toastKitchen: (n: number) => `Replanificat ca să folosească ${roPlural(n, 'produs', 'produse')} de acasă — mesele blocate rămân`,
    toastKitchenOff: 'Nu mai planificăm în jurul a ce ai acasă',
    today: '🍳 Ce gătesc azi?',
    together: '💞 Hotărâți împreună',
    todayTitle: 'Ce gătesc azi?',
    todayIntro: (day: string) => `Planificat pentru ${day}:`,
    nothingToday: 'Nu e planificat niciun prânz sau cină în ziua asta.',
    otherDish: 'Alege altceva cu swipe',
    surprise: '🎲 Surprinde-mă',
    togetherSub: 'Alegeți împreună, fiecare pe telefonul lui, și gătiți ce vă place amândurora.',
    toastTonight: (name: string) => `Rămâne ${name}!`,
    toastTogether: 'Săptămâna e replanificată după ce vă place amândurora',
  },
});

export function PlanTab({ toast }: { toast: (m: string) => void }) {
  const { state, dispatch, targets, week } = useStore();
  const { lang, s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const plan = state.plan!;
  const p = state.profile!;
  const tg = targets!;
  const days = week!;
  const todayIdx = days.findIndex((d) => d.date.toDateString() === new Date().toDateString());
  const [sel, setSel] = useState(Math.max(0, todayIdx));
  const [open, setOpen] = useState<MealView | null>(null);
  const [swap, setSwap] = useState<{ meal: MealView; view: 'swipe' | 'list' } | null>(null);
  const [deck, setDeck] = useState<'reshape' | 'new' | null>(null);
  const [showHow, setShowHow] = useState(false);
  const [kitchen, setKitchen] = useState(false);
  const [kitchenRecipe, setKitchenRecipe] = useState<string | null>(null);
  const [today, setToday] = useState(false);
  const [match, setMatch] = useState(false);
  const day = days[Math.min(sel, days.length - 1)];

  const sessions = useMemo(() => cookSessions(days), [days]);
  const shop = useMemo(() => buildShoppingList(days, state.pantry, p.store), [days, state.pantry, p.store]);
  const okDays = days.filter((d) => d.status === 'ok').length;
  const misses = days.filter((d) => d.status === 'short' || d.status === 'kcal');
  const overBudget = p.budget > 0 && Math.round(shop.checkout) > p.budget;
  const cuisineList = (list: Cuisine[]) => list.map((x) => c.cuisine[x]).join(', ');

  const update = (d: number, m: number, patch: Parameters<typeof setMeal>[3]) => dispatch({ type: 'setPlan', plan: setMeal(plan, d, m, patch) });

  const applyCuisines = (cuisines: Cuisine[]) => {
    if (deck === 'new') {
      dispatch({ type: 'setPlan', plan: generatePlan(p, Date.now(), cuisines) });
      setSel(0);
      toast(t.toastNew(cuisineList(cuisines)));
    } else {
      // Keep locked and eaten-out meals; re-plan the rest around the new cuisines.
      dispatch({ type: 'setPlan', plan: regenerateFrom({ ...plan, cuisines }, p, 0) });
      toast(t.toastTheme(cuisineList(cuisines)));
    }
    setDeck(null);
  };

  const reasonText = (r: Reason): string => {
    switch (r.kind) {
      case 'batch':
        return t.why.batch(r.meals);
      case 'soupPot':
        return t.why.soupPot(r.meals);
      case 'leftover':
        return t.why.leftover(dayLabel(days[r.cookedDay].date, lang));
      case 'protein':
        return t.why.protein(Math.round(r.share * 100));
      case 'home':
        return t.why.home(r.ids.map((id) => (INGREDIENTS[id] ? ingredientName(INGREDIENTS[id], lang) : id)).join(', '));
      default:
        return t.why[r.kind];
    }
  };

  // Keep locked, eaten-out and removed meals; re-plan the rest of the week (from today) around what's at home.
  const planAround = (useUp: string[]) => {
    dispatch({ type: 'setPlan', plan: regenerateFrom({ ...plan, useUp }, p, Math.max(0, todayIdx)) });
    setKitchen(false);
    toast(useUp.length ? t.toastKitchen(useUp.length) : t.toastKitchenOff);
  };

  // "Today" is the real today when the plan covers it, otherwise the day you're looking at.
  const cookDay = days[todayIdx >= 0 ? todayIdx : day.index];
  const mains = cookDay.meals.filter((m) => (m.slot === 'lunch' || m.slot === 'dinner') && !m.skipped && !m.eatenOut);
  const tonight = cookDay.meals.find((m) => m.slot === 'dinner') ?? cookDay.meals.find((m) => m.slot === 'lunch');

  const cookTonight = (id: string) => {
    if (!tonight) return;
    update(tonight.dayIndex, tonight.mealIndex, { recipeId: id, skipped: false });
    setMatch(false);
    setToday(false);
    toast(t.toastTonight(recipeName(recipeById(id), lang)));
  };

  const surprise = () => {
    if (!tonight) return;
    const all = swapOptions(plan, p, tonight.dayIndex, tonight.mealIndex);
    const fitting = all.filter((o) => o.ok);
    const pickFrom = (fitting.length ? fitting : all).slice(0, 8);
    if (pickFrom.length) cookTonight(pickFrom[Math.floor(Math.random() * pickFrom.length)].recipe.id);
  };

  const planTogether = (cuisines: Cuisine[], ids: string[]) => {
    dispatch({ type: 'setPlan', plan: regenerateFrom({ ...plan, cuisines: cuisines.length ? cuisines : plan.cuisines, prefer: ids }, p, Math.max(0, todayIdx)) });
    setMatch(false);
    toast(t.toastTogether);
  };

  const swapOpts = useMemo(() => (swap ? swapOptions(plan, p, swap.meal.dayIndex, swap.meal.mealIndex) : []), [swap, plan, p]);

  return (
    <div className="stack">
      <div className="card">
        <div className="spread">
          <div>
            <div className="muted small">{t.weekOf(dayLabel(days[0].date, lang, true))}</div>
            <h2>{t.onTarget(okDays, days.length)}</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="muted small">{t.checkout}</div>
            <b style={{ color: overBudget ? 'var(--accent)' : undefined }}>{money(shop.checkout)}</b>
            {p.budget > 0 && <div className="muted tiny">{t.ofBudget(money(p.budget))}</div>}
          </div>
        </div>
        {misses.length > 0 && (
          <div className="callout small" style={{ marginTop: 10 }}>
            {t.misses(misses.length, misses.map((d) => `${dayLabel(d.date, lang)} ${d.proteinShort ? t.protShort(d.proteinShort) : t.kcalOff(d.kcalOff)}`).join(', '))}
          </div>
        )}
        <div className="spread" style={{ marginTop: 10, alignItems: 'center' }}>
          <div className="row wrap" style={{ gap: 5 }}>
            <span className="muted small">{t.thisWeek}</span>
            {plan.cuisines?.length ? (
              plan.cuisines.map((x) => (
                <span key={x} className="theme-chip" style={{ background: `linear-gradient(135deg, ${CUISINE_INFO[x].from}, ${CUISINE_INFO[x].to})` }}>
                  {CUISINE_INFO[x].emoji} {c.cuisine[x]}
                </span>
              ))
            ) : (
              <span className="small">{t.anyCuisine}</span>
            )}
          </div>
          <button className="btn sm" onClick={() => setDeck('reshape')}>
            {t.swipeCuisines}
          </button>
        </div>
        <div className="spread" style={{ marginTop: 8, alignItems: 'center' }}>
          {plan.useUp?.length ? (
            <span className="small">
              {t.usingUp(plan.useUp.length)}{' '}
              <button className="btn ghost sm" onClick={() => planAround([])}>
                {t.stopUsing}
              </button>
            </span>
          ) : (
            <span />
          )}
          <button className="btn sm" onClick={() => setKitchen(true)}>
            {t.kitchen}
          </button>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn sm grow" onClick={() => setToday(true)}>
            {t.today}
          </button>
          <button className="btn sm grow" onClick={() => setMatch(true)}>
            {t.together}
          </button>
        </div>
        <button className="btn ghost sm" style={{ marginTop: 6, paddingLeft: 0 }} onClick={() => setShowHow(!showHow)} aria-expanded={showHow}>
          <Icon name="info" size={16} /> {t.howTitle}
        </button>
        {showHow && (
          <ul className="small muted" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {t.how.map((line) => (
              <li key={line} style={{ marginBottom: 4 }}>
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="days" role="tablist">
        {days.map((d) => (
          <button key={d.index} role="tab" aria-selected={d.index === day.index} className={`day-btn ${d.index === day.index ? 'on' : ''}`} onClick={() => setSel(d.index)}>
            <span className="d">{dayLabel(d.date, lang)}</span>
            <span className="n">{d.date.getDate()}</span>
            <span className={`dot ${d.status}`} />
          </button>
        ))}
      </div>

      <DayCard day={day} kcal={tg.kcal} kcalMin={tg.kcalMin} kcalMax={tg.kcalMax} protein={tg.protein} />

      {day.meals.map((m) => {
        const weight = m.lines.reduce((sum, l) => sum + l.g, 0);
        const reasons = m.eatenOut || m.skipped ? [] : mealReasons(m, sessions, plan, p);
        return (
          <div key={m.mealIndex} className={`card meal ${m.eatenOut ? 'out' : ''} ${m.skipped ? 'skipped' : ''}`}>
            <div className="pic">{m.recipe.emoji}</div>
            <div className="grow stack" style={{ gap: 4 }}>
              <div className="row wrap" style={{ gap: 6 }}>
                <span className="slot-label">{c.slot[m.slot]}</span>
                {m.locked && <span className="badge ok">{t.locked}</span>}
                {m.eatenOut && <span className="badge">{t.eatingOut}</span>}
                {m.skipped && <span className="badge bad">{t.removed}</span>}
                {m.othersFactor > 0 && !m.eatenOut && !m.skipped && <span className="badge">{t.household(m.othersFactor)}</span>}
              </div>
              <button className="name" onClick={() => setOpen(m)}>
                {recipeName(m.recipe, lang)}
              </button>
              {m.skipped ? (
                <>
                  <div className="muted small">{t.skippedNote}</div>
                  <button
                    className="btn sm"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => {
                      update(m.dayIndex, m.mealIndex, { skipped: false });
                      toast(t.toastRestore);
                    }}
                  >
                    <Icon name="undo" size={16} /> {t.restore}
                  </button>
                </>
              ) : (
                <>
                  <div className="muted small">
                    {m.eatenOut ? t.outNote : t.mealLine(grams(weight), Math.round(m.n.kcal), Math.round(m.n.protein), m.recipe.activeMinutes, m.recipe.minutes)}
                  </div>
                  {reasons.length > 0 && (
                    <div className="why">
                      {reasons.map((r) => (
                        <span key={r.kind}>{reasonText(r)}</span>
                      ))}
                    </div>
                  )}
                  <div className="row" style={{ marginTop: 4 }}>
                    <button className="btn sm" onClick={() => setSwap({ meal: m, view: 'swipe' })} disabled={m.locked}>
                      <Icon name="swap" size={16} /> {t.swap}
                    </button>
                    <button className={`icon-btn ${m.locked ? 'on' : ''}`} aria-label={m.locked ? t.unlock : t.lock} title={m.locked ? t.unlock : t.lock} onClick={() => update(m.dayIndex, m.mealIndex, { locked: !m.locked })}>
                      <Icon name={m.locked ? 'lock' : 'unlock'} size={17} />
                    </button>
                    <button
                      className={`icon-btn ${m.eatenOut ? 'on-accent' : ''}`}
                      aria-label={t.eatOut}
                      title={t.eatOut}
                      onClick={() => {
                        update(m.dayIndex, m.mealIndex, { eatenOut: !m.eatenOut });
                        toast(m.eatenOut ? t.toastBack : t.toastOut);
                      }}
                    >
                      <Icon name="out" size={17} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}

      <div className="row wrap no-print" style={{ marginTop: 6 }}>
        <button
          className="btn grow"
          onClick={() => {
            dispatch({ type: 'setPlan', plan: regenerateFrom(plan, p, day.index) });
            toast(t.toastRedo(dayLabel(day.date, lang)));
          }}
        >
          <Icon name="refresh" size={17} /> {t.redoFrom(dayLabel(day.date, lang))}
        </button>
        <button className="btn grow" onClick={() => setDeck('new')}>
          {t.newWeek}
        </button>
      </div>

      {deck && (
        <CuisineSwipe profile={p} onDone={applyCuisines} onSkip={() => applyCuisines([])} onClose={() => setDeck(null)} skipLabel={deck === 'new' ? t.skipAny : t.clearAny} />
      )}
      {open && <RecipeSheet recipeId={open.recipe.id} meal={open} onClose={() => setOpen(null)} onToast={toast} />}
      {kitchen && !kitchenRecipe && (
        <Sheet onClose={() => setKitchen(false)} title={t.kitchenTitle}>
          <Kitchen onOpenRecipe={setKitchenRecipe} onPlanAround={planAround} />
        </Sheet>
      )}
      {today && (
        <Sheet onClose={() => setToday(false)} title={t.todayTitle}>
          <div className="stack">
            {mains.length ? (
              <>
                <p className="muted small" style={{ margin: 0 }}>
                  {t.todayIntro(dayLabel(cookDay.date, lang))}
                </p>
                <div className="list">
                  {mains.map((m) => (
                    <button
                      key={m.mealIndex}
                      className="item match-dish"
                      style={{ border: 0, background: 'none', textAlign: 'left', width: '100%' }}
                      onClick={() => {
                        setToday(false);
                        setOpen(m);
                      }}
                    >
                      <span className="match-thumb" style={{ background: thumbBackground(recipePhoto(m.recipe.id), CUISINE_INFO[m.recipe.cuisine].from, CUISINE_INFO[m.recipe.cuisine].to) }}>
                        {!recipePhoto(m.recipe.id) && m.recipe.emoji}
                      </span>
                      <span className="grow">
                        <span className="slot-label">{c.slot[m.slot]}</span>
                        <b className="small" style={{ display: 'block' }}>
                          {recipeName(m.recipe, lang)}
                        </b>
                        <span className="muted tiny">{c.minutes(m.recipe.minutes)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted">{t.nothingToday}</p>
            )}
            {tonight && (
              <div className="row">
                <button
                  className="btn grow"
                  onClick={() => {
                    setToday(false);
                    setSwap({ meal: tonight, view: 'swipe' });
                  }}
                >
                  {t.otherDish}
                </button>
                <button className="btn grow" onClick={surprise}>
                  {t.surprise}
                </button>
              </div>
            )}
            <button
              className="btn primary block"
              onClick={() => {
                setToday(false);
                setMatch(true);
              }}
            >
              {t.together}
            </button>
            <p className="muted tiny" style={{ margin: 0, textAlign: 'center' }}>
              {t.togetherSub}
            </p>
          </div>
        </Sheet>
      )}
      {match && <MatchGame onClose={() => setMatch(false)} onCookTonight={cookTonight} onPlanWeek={planTogether} toast={toast} />}
      {kitchenRecipe && <RecipeSheet recipeId={kitchenRecipe} onClose={() => setKitchenRecipe(null)} onToast={toast} />}
      {swap?.view === 'swipe' && (
        <DishSwipe
          meal={swap.meal}
          options={swapOpts}
          profile={p}
          proteinTarget={tg.protein}
          onPick={(id) => {
            update(swap.meal.dayIndex, swap.meal.mealIndex, { recipeId: id, skipped: false });
            setSwap(null);
            toast(t.toastSwapped);
          }}
          onSkip={() => {
            update(swap.meal.dayIndex, swap.meal.mealIndex, { skipped: true });
            setSwap(null);
            toast(t.toastSkip);
          }}
          onList={() => setSwap({ ...swap, view: 'list' })}
          onClose={() => setSwap(null)}
        />
      )}
      {swap?.view === 'list' && (
        <SwapList
          meal={swap.meal}
          day={days[swap.meal.dayIndex]}
          options={swapOpts}
          proteinTarget={tg.protein}
          onClose={() => setSwap(null)}
          onSwipe={() => setSwap({ ...swap, view: 'swipe' })}
          onPick={(id) => {
            update(swap.meal.dayIndex, swap.meal.mealIndex, { recipeId: id, skipped: false });
            setSwap(null);
            toast(t.toastSwapped);
          }}
        />
      )}
    </div>
  );
}

function DayCard({ day, kcal, kcalMin, kcalMax, protein }: { day: DayView; kcal: number; kcalMin: number; kcalMax: number; protein: number }) {
  const { lang, s } = useLang();
  const t = s(T);
  const n = day.n;
  const msg =
    day.status === 'ok' ? t.status.ok : day.status === 'out' ? t.status.out : day.status === 'short' ? t.statusShort(day.proteinShort) : t.statusKcal(day.kcalOff);
  return (
    <div className="card stack" style={{ gap: 10 }}>
      <div className="spread">
        <h3>{dayLabel(day.date, lang, true)}</h3>
        <span className={`badge ${day.status === 'ok' ? 'ok' : day.status === 'out' ? '' : 'warn'}`}>
          {day.status === 'ok' && <Icon name="check" size={13} />} {msg}
        </span>
      </div>
      <div>
        <div className="spread small">
          <span>{t.calories}</span>
          <span>
            <b>{Math.round(n.kcal)}</b> <span className="muted">/ {kcal} kcal</span>
          </span>
        </div>
        <Bar value={n.kcal} max={kcal * 1.25} band={[kcalMin, kcalMax]} tone={day.kcalOff && day.status !== 'out' ? 'warn' : undefined} />
      </div>
      <div>
        <div className="spread small">
          <span>{t.protein}</span>
          <span>
            <b>{Math.round(n.protein)} g</b> <span className="muted">/ {protein} g {t.floor}</span>
          </span>
        </div>
        <Bar value={n.protein} max={protein * 1.25} band={[protein, protein * 1.25]} tone={day.proteinShort && day.status !== 'out' ? 'warn' : undefined} />
      </div>
      <div className="muted tiny">{t.macros(Math.round(n.carbs), Math.round(n.fat), Math.round(n.fiber))}</div>
    </div>
  );
}

function SwapList({
  meal,
  day,
  options,
  proteinTarget,
  onClose,
  onPick,
  onSwipe,
}: {
  meal: MealView;
  day: DayView;
  options: ReturnType<typeof swapOptions>;
  proteinTarget: number;
  onClose: () => void;
  onPick: (id: string) => void;
  onSwipe: () => void;
}) {
  const { lang, s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const [all, setAll] = useState(false);
  const shown = all ? options : options.slice(0, 10);
  const shortBy = (p: number) => Math.max(0, proteinTarget - p);
  return (
    <Sheet onClose={onClose} title={t.listTitle(c.slotLower[meal.slot])}>
      <div className="spread" style={{ marginTop: -4 }}>
        <p className="muted small" style={{ margin: 0 }}>
          {t.listIntro(recipeName(meal.recipe, lang), dayLabel(day.date, lang, true))}
        </p>
        <button className="btn sm" onClick={onSwipe}>
          {t.swipeView}
        </button>
      </div>
      <div className="list">
        {shown.map((o) => (
          <button key={o.recipe.id} className="item" style={{ border: 0, background: 'none', textAlign: 'left', width: '100%' }} onClick={() => onPick(o.recipe.id)}>
            <span style={{ fontSize: 26 }}>{o.recipe.emoji}</span>
            <span className="grow">
              <b>{recipeName(o.recipe, lang)}</b>
              <div className="muted small">
                {t.portion(o.mealKcal, o.mealProtein, o.recipe.minutes)}
                {o.sameDay && t.sameDay}
              </div>
            </span>
            <span className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
              <span className={`badge ${o.ok ? 'ok' : 'warn'}`}>{o.ok ? t.dayFits : shortBy(o.protein) > 0 ? t.dayShortB(shortBy(o.protein)) : t.dayKcalB}</span>
              {o.inPlan && <span className="badge">{t.inPlan}</span>}
              {o.onTheme && <span className="badge ok">{CUISINE_INFO[o.recipe.cuisine].emoji} {t.thisWeekB}</span>}
            </span>
          </button>
        ))}
      </div>
      {!all && options.length > shown.length && (
        <button className="btn block" onClick={() => setAll(true)}>
          {t.showAll(options.length)}
        </button>
      )}
      {options.length === 0 && <p className="muted">{t.none}</p>}
    </Sheet>
  );
}
