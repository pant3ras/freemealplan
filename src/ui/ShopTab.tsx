import { useMemo } from 'react';
import { chainName, chainStore, CHAIN_IDS, NEEDS_CARD, PRICE_SOURCE, type StoreChoice } from '../data/prices';
import { buildShoppingList, compareStores, type ShopItem, type ShoppingList } from '../engine/shopping';
import { enPlural, roPlural, texts, type Lang } from '../i18n';
import { COMMON, dayLabel, ingredientName } from '../i18n/common';
import { isNative, shareText } from '../native';
import { useLang, useStore } from '../state/store';
import { Bar, grams, Icon, money } from './kit';

const T = texts({
  en: {
    mix: 'Cheapest mix',
    byWeight: (g: string, perKg: string) => `${g} by weight · ${perKg}/kg`,
    packs: (n: number, size: string, price: string) => `${n} × ${size} · ${price} each`,
    textTitle: (week: string, store: string) => `Shopping list — week of ${week} (${store})`,
    need: (g: string) => `need ${g}`,
    estCheckout: (m: string) => `Estimated checkout: ${m}`,
    shareTitle: 'Shopping list',
    copied: 'Shopping list copied — paste it into notes or a chat',
    food: 'This week’s food',
    foodHint: 'what the meals actually use',
    atCheckout: (store: string) => `At the checkout · ${store}`,
    checkoutHint: 'whole packs; the rest carries over',
    over: (by: string, budget: string) => `${by} over your ${budget} budget.`,
    left: (rest: string, budget: string) => `${rest} left of your ${budget} budget.`,
    share: 'Share / copy',
    print: 'Print',
    untick: 'Untick all',
    counts: (items: number, done: number, est: number) =>
      `${enPlural(items, 'item', 'items')} · ${done} in the basket${est ? ` · ${est} estimated (not reported by the store)` : ''}`,
    compare: 'Compare stores for this list',
    cheapest: 'cheapest store',
    mixLine: (n: number) => `each item where it’s cheapest · ${enPlural(n, 'store', 'stores')}`,
    priced: (a: number, b: number) => `${a}/${b} items priced`,
    card: 'customer card needed',
    est: 'est.',
    estTitle: 'This store doesn’t report this item to the price monitor; priced at the other stores’ median.',
    promo: 'promo',
    leftover: (g: string, keeps: string) => `${g} left over · keeps ~${keeps}`,
    months: (n: number) => enPlural(n, 'month', 'months'),
    days: (n: number) => enPlural(n, 'day', 'days'),
    freeze: ' — freeze or use early next week',
    forMeals: (list: string) => `For ${list}`,
    got: (n: string) => `Got ${n}`,
    have: 'Already have it',
    haveA: (n: string) => `Already have ${n}`,
    atHome: 'Already at home',
    atHomeNote: 'Not counted in the totals. Tap one to put it back on the list. Manage everything you have under Recipes → From my kitchen.',
    needs: (g: string) => `Needs ${g}`,
    source: (src: string, date: string, where: string, stores: string) =>
      `Shelf prices from ${src}, reported by the stores on ${date} near ${where} (${stores}). Shelf prices can differ; promotions are used only when there is no regular price.`,
  },
  ro: {
    mix: 'Cel mai ieftin mix',
    byWeight: (g: string, perKg: string) => `${g} la cântar · ${perKg}/kg`,
    packs: (n: number, size: string, price: string) => `${n} × ${size} · ${price} bucata`,
    textTitle: (week: string, store: string) => `Lista de cumpărături — săptămâna din ${week} (${store})`,
    need: (g: string) => `trebuie ${g}`,
    estCheckout: (m: string) => `Total estimat la casă: ${m}`,
    shareTitle: 'Listă de cumpărături',
    copied: 'Lista a fost copiată — lipește-o în notițe sau într-un chat',
    food: 'Mâncarea săptămânii',
    foodHint: 'cât folosesc efectiv mesele',
    atCheckout: (store: string) => `La casă · ${store}`,
    checkoutHint: 'ambalaje întregi; restul rămâne pentru data viitoare',
    over: (by: string, budget: string) => `Cu ${by} peste bugetul de ${budget}.`,
    left: (rest: string, budget: string) => `Îți mai rămân ${rest} din bugetul de ${budget}.`,
    share: 'Trimite / copiază',
    print: 'Tipărește',
    untick: 'Debifează tot',
    counts: (items: number, done: number, est: number) =>
      `${roPlural(items, 'produs', 'produse')} · ${done} în coș${est ? ` · ${est} estimate (magazinul nu le raportează)` : ''}`,
    compare: 'Compară magazinele pentru lista asta',
    cheapest: 'cel mai ieftin',
    mixLine: (n: number) => `fiecare produs de unde e mai ieftin · ${roPlural(n, 'magazin', 'magazine')}`,
    priced: (a: number, b: number) => `${a}/${b} produse cu preț`,
    card: 'necesită card de client',
    est: 'estimat',
    estTitle: 'Magazinul nu raportează produsul la monitorul de prețuri; am folosit mediana celorlalte magazine.',
    promo: 'promoție',
    leftover: (g: string, keeps: string) => `rămân ${g} · țin ~${keeps}`,
    months: (n: number) => roPlural(n, 'lună', 'luni'),
    days: (n: number) => roPlural(n, 'zi', 'zile'),
    freeze: ' — congelează sau folosește-le la începutul săptămânii viitoare',
    forMeals: (list: string) => `Pentru ${list}`,
    got: (n: string) => `Am luat ${n}`,
    have: 'Am deja',
    haveA: (n: string) => `Am deja ${n}`,
    atHome: 'Am deja acasă',
    atHomeNote: 'Nu intră în totaluri. Apasă pe unul ca să-l pui înapoi pe listă. Tot ce ai acasă găsești la Rețete → Din ce am acasă.',
    needs: (g: string) => `Trebuie ${g}`,
    source: (src: string, date: string, where: string, stores: string) =>
      `Prețuri de raft din ${src}, raportate de magazine pe ${date} lângă ${where} (${stores}). Prețul de la raft poate diferi; promoțiile sunt folosite doar când nu există preț normal.`,
  },
});

export const storeLabel = (st: StoreChoice, lang: Lang = 'en') => (st === 'mix' ? T[lang].mix : chainName(st));

function buyText(i: ShopItem, lang: Lang) {
  const t = T[lang];
  const q = i.quote;
  if (q.packGrams === null) return t.byWeight(grams(i.grams + q.leftover), money(q.perKg, 2));
  return t.packs(q.packs, grams(q.packGrams), money(q.unitPrice, 2));
}

function asText(list: ShoppingList, weekLabel: string, store: StoreChoice, lang: Lang): string {
  const t = T[lang];
  const c = COMMON[lang];
  const out = [t.textTitle(weekLabel, storeLabel(store, lang)), ''];
  for (const sec of list.sections) {
    if (sec.chain) out.push(`== ${chainName(sec.chain)} ==`);
    for (const a of sec.aisles) {
      out.push(c.aisle[a.aisle].toUpperCase());
      for (const i of a.items) out.push(`☐ ${ingredientName(i.ing, lang)} — ${i.quote.product} — ${buyText(i, lang)} (${t.need(grams(i.grams))})`);
      out.push('');
    }
  }
  out.push(t.estCheckout(money(list.checkout)));
  return out.join('\n');
}

export function ShopTab({ toast }: { toast: (m: string) => void }) {
  const { state, dispatch, week } = useStore();
  const { lang, s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const p = state.profile!;
  const days = week!;
  const list = useMemo(() => buildShoppingList(days, state.pantry, p.store), [days, state.pantry, p.store]);
  const compare = useMemo(() => compareStores(days, state.pantry), [days, state.pantry]);
  const allItems = list.sections.flatMap((x) => x.aisles.flatMap((a) => a.items));
  const done = allItems.filter((i) => state.checked.includes(i.ing.id)).length;
  const budget = p.budget;
  // Compare what's shown: 450.3 lei reads as 450 lei, which is not "over" a 450 lei budget.
  const over = budget > 0 && Math.round(list.checkout) > budget;
  const cheapest = Math.min(...compare.filter((x) => x.store !== 'mix').map((x) => x.checkout));

  const setStore = (store: StoreChoice) => dispatch({ type: 'setProfile', profile: { ...p, store } });

  const share = async () => {
    const text = asText(list, dayLabel(days[0].date, lang, true), p.store, lang);
    try {
      if (isNative) await shareText(t.shareTitle, text);
      else if (navigator.share) await navigator.share({ title: t.shareTitle, text });
      else {
        await navigator.clipboard.writeText(text);
        toast(t.copied);
      }
    } catch {
      // Share sheet dismissed.
    }
  };

  const usedIn = (i: ShopItem) => {
    const labels = [...new Set(i.usedIn.map((u) => `${dayLabel(days[u.dayIndex].date, lang)} ${c.slotLower[days[u.dayIndex].meals[u.mealIndex].slot]}`))];
    return labels.length > 3 ? `${labels.slice(0, 3).join(', ')} +${labels.length - 3}` : labels.join(', ');
  };

  return (
    <div className="stack">
      <div className="card stack" style={{ gap: 10 }}>
        <div className="grid2">
          <div>
            <div className="muted small">{t.food}</div>
            <div className="big-num" style={{ fontSize: 26 }}>
              {money(list.food)}
            </div>
            <div className="muted tiny">{t.foodHint}</div>
          </div>
          <div>
            <div className="muted small">{t.atCheckout(storeLabel(p.store, lang))}</div>
            <div className="big-num" style={{ fontSize: 26, color: over ? 'var(--accent)' : undefined }}>
              {money(list.checkout)}
            </div>
            <div className="muted tiny">{t.checkoutHint}</div>
          </div>
        </div>
        {budget > 0 && (
          <>
            <Bar value={list.checkout} max={Math.max(budget, list.checkout) * 1.1} band={[budget, budget]} tone={over ? 'bad' : undefined} />
            <div className="small">
              {over ? <span style={{ color: 'var(--accent)' }}>{t.over(money(list.checkout - budget), money(budget))}</span> : <span className="muted">{t.left(money(Math.max(0, budget - list.checkout)), money(budget))}</span>}
            </div>
          </>
        )}
        <div className="row no-print">
          <button className="btn sm" onClick={share}>
            <Icon name="share" size={16} /> {t.share}
          </button>
          {/* An Android WebView can't print; sharing to a notes app or chat covers it there. */}
          {!isNative && (
            <button className="btn sm" onClick={() => window.print()}>
              <Icon name="print" size={16} /> {t.print}
            </button>
          )}
          <span className="grow" />
          {done > 0 && (
            <button className="btn sm ghost" onClick={() => dispatch({ type: 'clearChecked' })}>
              {t.untick}
            </button>
          )}
        </div>
        <div className="muted tiny">{t.counts(list.itemCount, done, list.estimatedCount)}</div>
      </div>

      <div className="no-print">
        <div className="section-title">{t.compare}</div>
        <div className="card list" style={{ padding: '0 14px' }}>
          {compare.map((x) => {
            const on = x.store === p.store;
            const store = x.store === 'mix' ? null : chainStore(x.store);
            return (
              <button key={x.store} className="item" style={{ border: 0, background: 'none', textAlign: 'left', width: '100%' }} onClick={() => setStore(x.store)} aria-pressed={on}>
                <span className={`check ${on ? 'on' : ''}`} style={{ borderRadius: '50%' }}>
                  {on && <Icon name="check" size={14} />}
                </span>
                <span className="grow">
                  <b>{storeLabel(x.store, lang)}</b>
                  {x.store !== 'mix' && x.checkout === cheapest && (
                    <span className="badge ok" style={{ marginLeft: 6 }}>
                      {t.cheapest}
                    </span>
                  )}
                  <div className="muted tiny">
                    {x.store === 'mix'
                      ? t.mixLine(x.chains ?? 0)
                      : `${store?.name ?? ''}${store?.distanceKm != null ? ` · ${store.distanceKm} km` : ''} · ${t.priced(x.priced, x.items)}${NEEDS_CARD.includes(x.store) ? ` · ${t.card}` : ''}`}
                  </div>
                </span>
                <b style={{ fontVariantNumeric: 'tabular-nums' }}>{money(x.checkout)}</b>
              </button>
            );
          })}
        </div>
      </div>

      {list.sections.map((sec) => (
        <div key={sec.chain ?? 'one'}>
          {sec.chain && (
            <h3 style={{ margin: '14px 2px 0' }}>
              {chainName(sec.chain)} <span className="muted small">· {money(sec.checkout)}</span>
            </h3>
          )}
          {sec.aisles.map((a) => (
            <div key={a.aisle}>
              <div className="section-title">{c.aisle[a.aisle]}</div>
              <div className="card list" style={{ padding: '0 14px' }}>
                {a.items.map((i) => {
                  const checked = state.checked.includes(i.ing.id);
                  const name = ingredientName(i.ing, lang);
                  const keeps = i.ing.shelfDays >= 60 ? t.months(Math.round(i.ing.shelfDays / 30)) : t.days(i.ing.shelfDays);
                  return (
                    <div key={i.ing.id} className={`item ${checked ? 'done' : ''}`}>
                      <button className={`check ${checked ? 'on' : ''}`} aria-label={t.got(name)} aria-pressed={checked} onClick={() => dispatch({ type: 'toggleChecked', id: i.ing.id })}>
                        {checked && <Icon name="check" size={14} />}
                      </button>
                      <div className="grow">
                        <div className="spread" style={{ alignItems: 'flex-start' }}>
                          <b>{name}</b>
                          <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{money(i.quote.checkout, 2)}</span>
                        </div>
                        <div className="small" style={{ overflowWrap: 'anywhere' }}>
                          {i.quote.estimated ? (
                            <span className="badge warn" title={t.estTitle}>
                              {t.est}
                            </span>
                          ) : (
                            <span className="muted">{i.quote.product}</span>
                          )}
                          {i.quote.promo && (
                            <span className="badge ok" style={{ marginLeft: 4 }}>
                              {t.promo}
                            </span>
                          )}
                        </div>
                        <div className="muted small">
                          {buyText(i, lang)} · {t.need(grams(i.grams))}
                        </div>
                        {i.quote.leftover >= 1 && i.quote.packGrams !== null && (
                          <div className="tiny" style={{ color: i.ing.shelfDays <= 5 ? 'var(--warn)' : 'var(--muted)' }}>
                            {t.leftover(grams(i.quote.leftover), keeps)}
                            {i.ing.shelfDays <= 3 && t.freeze}
                          </div>
                        )}
                        <div className="muted tiny">{t.forMeals(usedIn(i))}</div>
                      </div>
                      <button className="btn sm ghost no-print" title={t.have} aria-label={t.haveA(name)} onClick={() => dispatch({ type: 'togglePantry', id: i.ing.id })}>
                        <Icon name="home" size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      {list.pantry.length > 0 && (
        <div className="no-print">
          <div className="section-title">{t.atHome}</div>
          <div className="card">
            <p className="muted small" style={{ marginTop: 0 }}>
              {t.atHomeNote}
            </p>
            <div className="row wrap">
              {list.pantry.map((i) => (
                <button key={i.ing.id} className="chip" onClick={() => dispatch({ type: 'togglePantry', id: i.ing.id })} title={t.needs(grams(i.grams))}>
                  {ingredientName(i.ing, lang)} · {grams(i.grams)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="muted tiny">
        {t.source(
          PRICE_SOURCE.source,
          PRICE_SOURCE.fetchedAt,
          PRICE_SOURCE.location,
          CHAIN_IDS.map((x) => chainStore(x)?.name)
            .filter(Boolean)
            .join(', '),
        )}
      </p>
    </div>
  );
}
