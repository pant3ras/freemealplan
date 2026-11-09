import { useEffect, useMemo, useState } from 'react';
import { CUISINE_INFO } from '../data/cuisines';
import { cardBackground, cuisinePhoto } from '../data/photos';
import { CUISINES, type Cuisine, type Profile, type Recipe } from '../data/types';
import { cuisineOptions } from '../engine/planner';
import { pick, roPlural, texts } from '../i18n';
import { COMMON, recipeName } from '../i18n/common';
import { useLang } from '../state/store';
import { Icon } from './kit';
import { Stamps, useSwipe } from './swipe';

const T = texts({
  en: {
    title: 'What are we craving this week?',
    dialog: "Pick this week's cuisines",
    yum: 'YUM',
    nope: 'NOPE',
    hint: 'Swipe right for yes, left for no · arrow keys work too',
    skip: 'Skip — any cuisine',
    done: (n: number) => `Done · ${n} picked`,
    surprise: '🎲 Surprise me',
    spinning: 'Spinning…',
    menu: 'This week’s menu',
    nothing: 'Nothing caught your eye?',
    fate: 'Letting fate decide',
    summary: (n: number) => `${n} lunch and dinner dishes to build your week from. Tap one to drop it.`,
    dice: 'Let the dice pick three for you, or go again.',
    build: 'Build this week',
    again: 'Swipe again',
    fit: (n: number) => `${n} dishes fit your diet`,
    no: (c: string) => `Not ${c} this week`,
    yes: (c: string) => `Yes to ${c}`,
    undo: 'Undo',
  },
  ro: {
    title: 'Ce poftă avem săptămâna asta?',
    dialog: 'Alege bucătăriile săptămânii',
    yum: 'DA!',
    nope: 'NU',
    hint: 'Trage la dreapta pentru da, la stânga pentru nu · merg și săgețile',
    skip: 'Sari peste — orice bucătărie',
    done: (n: number) => `Gata · ${roPlural(n, 'aleasă', 'alese')}`,
    surprise: '🎲 Surprinde-mă',
    spinning: 'Se învârte…',
    menu: 'Meniul săptămânii',
    nothing: 'Nimic nu ți-a făcut poftă?',
    fate: 'Lăsăm norocul să aleagă',
    summary: (n: number) => `${roPlural(n, 'fel', 'feluri')} de prânz și cină din care se face săptămâna. Atinge unul ca să-l scoți.`,
    dice: 'Lasă zarurile să aleagă trei sau mai încearcă o dată.',
    build: 'Construiește săptămâna',
    again: 'Mai trage o dată',
    fit: (n: number) => `${roPlural(n, 'fel se potrivește', 'feluri se potrivesc')} dietei tale`,
    no: (c: string) => `Fără bucătăria ${c} săptămâna asta`,
    yes: (c: string) => `Da la bucătăria ${c}`,
    undo: 'Anulează',
  },
});

interface Props {
  profile: Profile;
  onDone: (cuisines: Cuisine[]) => void;
  onSkip: () => void;
  onClose?: () => void;
  skipLabel?: string;
}

export const shuffle = <T,>(list: T[]): T[] => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * Tinder-style deck: one card per cuisine with a few dishes that fit your diet.
 * Swipe right to put it on this week's menu, left to skip it.
 */
export function CuisineSwipe({ profile, onDone, onSkip, onClose, skipLabel }: Props) {
  const { s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const options = useMemo(() => cuisineOptions(profile), [profile]);
  const [deck] = useState<Cuisine[]>(() => shuffle(CUISINES.filter((x) => x !== 'Classic' && (options.get(x)?.length ?? 0) >= 2)));
  const [samples] = useState<Map<Cuisine, Recipe[]>>(() => new Map(deck.map((x) => [x, shuffle(options.get(x) ?? []).slice(0, 3)])));
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<Cuisine[]>([]);
  const [history, setHistory] = useState<{ cuisine: Cuisine; yes: boolean }[]>([]);
  const [phase, setPhase] = useState<'swipe' | 'summary'>('swipe');
  const [spinning, setSpinning] = useState<Cuisine[] | null>(null);

  const current = deck[index];
  const finished = index >= deck.length;

  const swipe = useSwipe((yes) => {
    setHistory((h) => [...h, { cuisine: current, yes }]);
    if (yes) setLiked((l) => [...l, current]);
    setIndex((i) => i + 1);
    if (index + 1 >= deck.length) setPhase('summary');
  });

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    if (last.yes) setLiked((l) => l.filter((x) => x !== last.cuisine));
    setIndex((i) => i - 1);
    setPhase('swipe');
  };

  const surprise = () => {
    let tick = 0;
    const spin = () => {
      const picked = shuffle(deck).slice(0, 3);
      setSpinning(picked);
      tick++;
      if (tick < 16) window.setTimeout(spin, 50 + tick * 14);
      else
        window.setTimeout(() => {
          setLiked(picked);
          setSpinning(null);
          setPhase('summary');
        }, 450);
    };
    setPhase('summary');
    spin();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
      if (phase !== 'swipe' || finished) return;
      if (e.key === 'ArrowRight') swipe.decide(true);
      else if (e.key === 'ArrowLeft') swipe.decide(false);
      else if (e.key === 'Backspace') undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const dishCount = liked.reduce((sum, x) => sum + (options.get(x)?.length ?? 0), 0);
  const shown = spinning ?? liked;

  return (
    <div className="swipe-overlay" role="dialog" aria-modal aria-label={t.dialog}>
      <div className="swipe-wrap">
        <div className="spread">
          {onClose ? (
            <button className="icon-btn" onClick={onClose} aria-label={c.close}>
              <Icon name="x" size={18} />
            </button>
          ) : (
            <span />
          )}
          <b>{t.title}</b>
          <span className="muted small" style={{ minWidth: 34, textAlign: 'right' }}>
            {phase === 'swipe' && !finished ? `${index + 1}/${deck.length}` : ''}
          </span>
        </div>

        {phase === 'swipe' && !finished && (
          <>
            <div className="swipe-stack">
              {deck[index + 1] && <CuisineCard key={deck[index + 1]} cuisine={deck[index + 1]} dishes={samples.get(deck[index + 1]) ?? []} count={options.get(deck[index + 1])?.length ?? 0} under />}
              <CuisineCard key={current} cuisine={current} dishes={samples.get(current) ?? []} count={options.get(current)?.length ?? 0} style={swipe.style} {...swipe.bind}>
                <Stamps yes={swipe.yes} no={swipe.no} yesLabel={t.yum} noLabel={t.nope} />
              </CuisineCard>
            </div>
            <div className="swipe-actions">
              <button className="swipe-btn no" onClick={() => swipe.decide(false)} aria-label={t.no(c.cuisine[current])}>
                <Icon name="x" size={28} />
              </button>
              <button className="swipe-btn small" onClick={undo} disabled={!history.length} aria-label={t.undo}>
                <Icon name="refresh" size={20} />
              </button>
              <button className="swipe-btn yes" onClick={() => swipe.decide(true)} aria-label={t.yes(c.cuisine[current])}>
                <Icon name="heart" size={28} />
              </button>
            </div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <span className="muted tiny">{t.hint}</span>
            </div>
            <div className="row">
              <button className="btn ghost grow" onClick={onSkip}>
                {skipLabel ?? t.skip}
              </button>
              <button className="btn grow" onClick={() => (liked.length ? setPhase('summary') : surprise())}>
                {liked.length ? t.done(liked.length) : t.surprise}
              </button>
            </div>
          </>
        )}

        {(phase === 'summary' || finished) && (
          <div className="stack swipe-summary">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44 }}>{spinning ? '🎰' : shown.length ? '🎉' : '🤷'}</div>
              <h2>{spinning ? t.spinning : shown.length ? t.menu : t.nothing}</h2>
              <p className="muted small" style={{ margin: '4px 0 0' }}>
                {spinning ? t.fate : shown.length ? t.summary(dishCount) : t.dice}
              </p>
            </div>
            <div className="row wrap" style={{ justifyContent: 'center' }}>
              {shown.map((x) => (
                <button
                  key={x}
                  className="chip on swipe-chip"
                  style={{ background: `linear-gradient(135deg, ${CUISINE_INFO[x].from}, ${CUISINE_INFO[x].to})`, borderColor: 'transparent' }}
                  onClick={() => !spinning && setLiked((l) => l.filter((y) => y !== x))}
                  disabled={!!spinning}
                >
                  {CUISINE_INFO[x].emoji} {c.cuisine[x]}
                </button>
              ))}
            </div>
            <button className="btn primary block" disabled={!liked.length || !!spinning} onClick={() => onDone(liked)}>
              {t.build}
            </button>
            <div className="row">
              <button className="btn grow" onClick={surprise} disabled={!!spinning}>
                {t.surprise}
              </button>
              <button
                className="btn grow"
                disabled={!!spinning}
                onClick={() => {
                  setIndex(0);
                  setLiked([]);
                  setHistory([]);
                  setPhase('swipe');
                }}
              >
                {t.again}
              </button>
            </div>
            <button className="btn ghost" onClick={onSkip} disabled={!!spinning}>
              {skipLabel ?? t.skip}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CuisineCard({
  cuisine,
  dishes,
  count,
  under,
  children,
  ...rest
}: { cuisine: Cuisine; dishes: Recipe[]; count: number; under?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  const { lang, s } = useLang();
  const info = CUISINE_INFO[cuisine];
  const photo = cuisinePhoto(cuisine);
  return (
    <div className={`swipe-card ${photo ? 'photo' : ''} ${under ? 'under' : ''}`} {...rest} style={{ background: cardBackground(photo, info.from, info.to), ...rest.style }} aria-hidden={under}>
      {children}
      <div className="swipe-emoji">{info.emoji}</div>
      <h2 className="swipe-title">
        {photo && `${info.emoji} `}
        {s(COMMON).cuisine[cuisine]}
      </h2>
      <p className="swipe-tagline">{pick(info.tagline, lang)}</p>
      <div className="swipe-dishes">
        {dishes.map((r) => (
          <div key={r.id} className="swipe-dish">
            <span>{r.emoji}</span> {recipeName(r, lang)}
          </div>
        ))}
      </div>
      <div className="swipe-count">{s(T).fit(count)}</div>
    </div>
  );
}
