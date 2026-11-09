import { useEffect, useState } from 'react';
import { CUISINE_INFO } from '../data/cuisines';
import { cardBackground, recipePhoto } from '../data/photos';
import type { Profile } from '../data/types';
import { servingCost } from '../engine/explain';
import { ingredient } from '../engine/nutrition';
import type { SwapOption } from '../engine/planner';
import type { MealView } from '../engine/week';
import { texts } from '../i18n';
import { COMMON, ingredientName, recipeName } from '../i18n/common';
import { useLang } from '../state/store';
import { Icon, money } from './kit';
import { Stamps, useSwipe } from './swipe';

const T = texts({
  en: {
    title: (slot: string, name: string) => `Instead of ${name} (${slot})`,
    yum: 'TAKE IT',
    nope: 'NEXT',
    portion: (kcal: number, p: number) => `Your portion: ${kcal} kcal · ${p} g protein`,
    dayFits: 'Day stays on target',
    dayShort: (g: number) => `Day ${g} g short on protein`,
    dayKcal: 'Day misses its calories',
    inPlan: 'already in your week — less shopping',
    theme: 'this week’s cuisine',
    home: (list: string) => `🧺 uses your ${list}`,
    favourite: 'favourite',
    keeps: (d: number) => `keeps ${d} days`,
    perServing: (lei: string) => `≈ ${lei} per serving`,
    hint: 'Swipe right to take it, left for the next one',
    skip: 'Remove this meal',
    skipHint: 'The rest of the day gets bigger portions to stay on target.',
    list: 'List view',
    end: 'That’s every dish that fits this meal.',
    restart: 'Start over',
    undo: 'Back',
    count: (i: number, n: number) => `${i}/${n}`,
  },
  ro: {
    title: (slot: string, name: string) => `În loc de ${name} (${slot})`,
    yum: 'IA-L',
    nope: 'URMĂTORUL',
    portion: (kcal: number, p: number) => `Porția ta: ${kcal} kcal · ${p} g proteine`,
    dayFits: 'Ziua rămâne în țintă',
    dayShort: (g: number) => `Zilei îi lipsesc ${g} g de proteine`,
    dayKcal: 'Ziua iese din calorii',
    inPlan: 'deja în săptămâna ta — cumperi mai puțin',
    theme: 'bucătăria săptămânii',
    home: (list: string) => `🧺 folosește ${list}`,
    favourite: 'favorit',
    keeps: (d: number) => `ține ${d} zile`,
    perServing: (lei: string) => `≈ ${lei} porția`,
    hint: 'Trage la dreapta ca să-l alegi, la stânga pentru următorul',
    skip: 'Scoate masa asta',
    skipHint: 'Celelalte mese ale zilei cresc ca să rămâi în țintă.',
    list: 'Vezi lista',
    end: 'Acestea sunt toate felurile potrivite pentru masa asta.',
    restart: 'Ia-o de la capăt',
    undo: 'Înapoi',
    count: (i: number, n: number) => `${i}/${n}`,
  },
});

interface Props {
  meal: MealView;
  options: SwapOption[];
  profile: Profile;
  proteinTarget: number;
  onPick: (id: string) => void;
  onSkip: () => void;
  onList: () => void;
  onClose: () => void;
}

/** Tinder-style replacement picker: the best-fitting dishes first, one card at a time. */
export function DishSwipe({ meal, options, profile, proteinTarget, onPick, onSkip, onList, onClose }: Props) {
  const { lang, s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const [index, setIndex] = useState(0);
  const current = options[index];

  const swipe = useSwipe((yes) => {
    if (yes) onPick(current.recipe.id);
    else setIndex((i) => i + 1);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (!current) return;
      if (e.key === 'ArrowRight') swipe.decide(true);
      else if (e.key === 'ArrowLeft') swipe.decide(false);
      else if (e.key === 'Backspace') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const card = (o: SwapOption, under = false) => {
    const info = CUISINE_INFO[o.recipe.cuisine];
    const short = Math.max(0, proteinTarget - o.protein);
    const photo = recipePhoto(o.recipe.id);
    return (
      <div
        key={o.recipe.id}
        className={`swipe-card dish ${photo ? 'photo' : ''} ${under ? 'under' : ''}`}
        style={{ background: cardBackground(photo, info.from, info.to), ...(under ? {} : swipe.style) }}
        {...(under ? {} : swipe.bind)}
        aria-hidden={under}
      >
        {!under && <Stamps yes={swipe.yes} no={swipe.no} yesLabel={t.yum} noLabel={t.nope} />}
        <div className="swipe-emoji" style={{ fontSize: 70 }}>
          {o.recipe.emoji}
        </div>
        <h2 className="swipe-title" style={{ fontSize: 24 }}>
          {recipeName(o.recipe, lang)}
        </h2>
        <p className="swipe-tagline">
          {info.emoji} {c.cuisine[o.recipe.cuisine]} · {c.minutes(o.recipe.minutes)} · {c.difficulty[o.recipe.difficulty]}
        </p>
        <div className="swipe-dish" style={{ width: '100%', textAlign: 'center' }}>
          {t.portion(o.mealKcal, o.mealProtein)}
          <div className="tiny" style={{ opacity: 0.9 }}>
            {o.ok ? `✓ ${t.dayFits}` : short > 0 ? `⚠ ${t.dayShort(short)}` : `⚠ ${t.dayKcal}`} · {t.perServing(money(servingCost(o.recipe, profile.store), 2))}
          </div>
        </div>
        <div className="row wrap" style={{ justifyContent: 'center', gap: 5 }}>
          {o.onTheme && <span className="swipe-tag">{t.theme}</span>}
          {o.fromHome.length > 0 && <span className="swipe-tag">{t.home(o.fromHome.map((id) => ingredientName(ingredient(id), lang)).join(', '))}</span>}
          {o.inPlan && <span className="swipe-tag">{t.inPlan}</span>}
          {profile.favorites.includes(o.recipe.id) && <span className="swipe-tag">♥ {t.favourite}</span>}
          {o.recipe.keepsDays >= 3 && <span className="swipe-tag">{t.keeps(o.recipe.keepsDays)}</span>}
        </div>
        <div className="swipe-ingredients">
          {o.recipe.ingredients
            .slice(0, 6)
            .map((l) => ingredientName(ingredient(l.id), lang))
            .join(' · ')}
        </div>
      </div>
    );
  };

  return (
    <div className="swipe-overlay" role="dialog" aria-modal aria-label={t.title(c.slotLower[meal.slot], recipeName(meal.recipe, lang))}>
      <div className="swipe-wrap">
        <div className="spread">
          <button className="icon-btn" onClick={onClose} aria-label={c.close}>
            <Icon name="x" size={18} />
          </button>
          <b className="small" style={{ textAlign: 'center' }}>
            {t.title(c.slotLower[meal.slot], recipeName(meal.recipe, lang))}
          </b>
          <span className="muted small" style={{ minWidth: 34, textAlign: 'right' }}>
            {current ? t.count(index + 1, options.length) : ''}
          </span>
        </div>

        {current ? (
          <>
            <div className="swipe-stack">
              {options[index + 1] && card(options[index + 1], true)}
              {card(current)}
            </div>
            <div className="swipe-actions">
              <button className="swipe-btn no" onClick={() => swipe.decide(false)} aria-label={t.nope}>
                <Icon name="x" size={28} />
              </button>
              <button className="swipe-btn small" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} aria-label={t.undo}>
                <Icon name="refresh" size={20} />
              </button>
              <button className="swipe-btn yes" onClick={() => swipe.decide(true)} aria-label={t.yum}>
                <Icon name="check" size={28} />
              </button>
            </div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <span className="muted tiny">{t.hint}</span>
            </div>
          </>
        ) : (
          <div className="stack swipe-summary" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44 }}>🍽️</div>
            <p className="muted">{t.end}</p>
            <button className="btn" onClick={() => setIndex(0)}>
              {t.restart}
            </button>
          </div>
        )}

        <div className="row">
          <button className="btn grow" onClick={onList}>
            {t.list}
          </button>
          <button className="btn grow danger" onClick={onSkip} title={t.skipHint}>
            <Icon name="trash" size={16} /> {t.skip}
          </button>
        </div>
        <p className="muted tiny" style={{ margin: 0, textAlign: 'center' }}>
          {t.skipHint}
        </p>
      </div>
    </div>
  );
}

