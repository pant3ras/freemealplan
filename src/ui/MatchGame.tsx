import { useEffect, useMemo, useState } from 'react';
import { CUISINE_INFO } from '../data/cuisines';
import { cardBackground, cuisinePhoto, recipePhoto, thumbBackground } from '../data/photos';
import type { Cuisine } from '../data/types';
import { compareVotes, decodeVotes, encodeVotes, matchDeck, newSeed, sameDeck, type MatchCard, type MatchMode, type MatchVotes } from '../engine/match';
import { pick, roPlural, texts } from '../i18n';
import { COMMON, recipeName } from '../i18n/common';
import { isNative, shareText } from '../native';
import { useLang } from '../state/store';
import { Icon } from './kit';
import { RecipeSheet } from './RecipeSheet';
import { Stamps, useSwipe } from './swipe';

const T = texts({
  en: {
    dialog: 'Decide together',
    title: 'What are we eating?',
    intro: 'You both swipe the same cards on your own phones, swap a short code by message, and see what you both like. Nothing goes through a server.',
    tonight: "What's for tonight",
    tonightSub: '15 dishes · about a minute',
    week: 'Plan the week together',
    weekSub: '8 cuisines and 20 dishes',
    yourName: 'Your name (shown to your partner)',
    joinTitle: 'Got a code from your partner?',
    joinHint: 'Paste their whole message here',
    join: 'Join their game',
    invalid: 'That doesn’t look like a WeekPlate match code.',
    version: 'That code comes from a different version of the app. Update both phones and play again.',
    otherDeck: 'That code is for a different set of cards. Ask your partner to join with your code instead.',
    yum: 'YUM',
    nope: 'NOPE',
    count: (i: number, n: number) => `${i}/${n}`,
    hint: 'Swipe right for yes, left for no',
    undo: 'Undo',
    sharedTitle: 'Your turn is done!',
    sharedSub: 'Send this code to your partner. When they have swiped, ask them to send their code back and paste it below.',
    send: 'Send to partner',
    copied: 'Copied — paste it in a message',
    message: (code: string) => `Let's decide what to eat! Open WeekPlate → Plan → Decide together, paste this code and swipe:\n\n${code}`,
    pasteBack: 'Paste your partner’s code',
    see: 'See our matches',
    matchTitle: (name: string) => (name ? `You and ${name} both like…` : 'You both like…'),
    noMatch: 'No dish you both liked this time.',
    maybeTitle: 'Liked by one of you',
    cuisines: 'Cuisines',
    dishes: 'Dishes',
    cookTonight: 'Cook tonight',
    planWeek: 'Plan the week around these',
    sendBack: 'Send my answers back',
    again: 'Play again',
    fits: (n: number) => `${n} dishes`,
  },
  ro: {
    dialog: 'Hotărâți împreună',
    title: 'Ce mâncăm?',
    intro: 'Amândoi trageți aceleași cartonașe, fiecare pe telefonul lui, vă trimiteți un cod scurt prin mesaj și vedeți ce vă place la amândoi. Nimic nu trece printr-un server.',
    tonight: 'Ce mâncăm diseară',
    tonightSub: '15 feluri · cam un minut',
    week: 'Planificăm săptămâna împreună',
    weekSub: '8 bucătării și 20 de feluri',
    yourName: 'Numele tău (îl vede partenerul)',
    joinTitle: 'Ai primit un cod de la partener?',
    joinHint: 'Lipește aici tot mesajul primit',
    join: 'Intră în jocul lui',
    invalid: 'Nu pare a fi un cod de joc WeekPlate.',
    version: 'Codul vine din altă versiune a aplicației. Actualizați amândoi telefoanele și jucați din nou.',
    otherDeck: 'Codul e pentru alte cartonașe. Roagă-ți partenerul să intre în joc cu codul tău.',
    yum: 'DA!',
    nope: 'NU',
    count: (i: number, n: number) => `${i}/${n}`,
    hint: 'Trage la dreapta pentru da, la stânga pentru nu',
    undo: 'Anulează',
    sharedTitle: 'Ai terminat!',
    sharedSub: 'Trimite codul partenerului. După ce trage și el cartonașele, roagă-l să-ți trimită codul lui și lipește-l mai jos.',
    send: 'Trimite partenerului',
    copied: 'Copiat — lipește-l într-un mesaj',
    message: (code: string) => `Hai să hotărâm ce mâncăm! Deschide WeekPlate → Plan → Hotărâți împreună, lipește codul și alege:\n\n${code}`,
    pasteBack: 'Lipește codul partenerului',
    see: 'Vezi potrivirile',
    matchTitle: (name: string) => (name ? `Ție și lui ${name} vă place…` : 'Amândurora vă place…'),
    noMatch: 'De data asta nu e niciun fel care să vă placă amândurora.',
    maybeTitle: 'Le-a plăcut doar unuia dintre voi',
    cuisines: 'Bucătării',
    dishes: 'Feluri',
    cookTonight: 'Gătește diseară',
    planWeek: 'Planifică săptămâna cu acestea',
    sendBack: 'Trimite-i răspunsurile mele',
    again: 'Mai jucăm o dată',
    fits: (n: number) => roPlural(n, 'fel', 'feluri'),
  },
});

/** The last round you played, so a partner's code can be pasted in later. Per device only. */
const KEY = 'weekplate:match';
const load = (): MatchVotes | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MatchVotes) : null;
  } catch {
    return null;
  }
};
const save = (v: MatchVotes) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // Only a convenience.
  }
};

interface Props {
  onClose: () => void;
  onCookTonight: (recipeId: string) => void;
  onPlanWeek: (cuisines: Cuisine[], recipeIds: string[]) => void;
  toast: (msg: string) => void;
}

export function MatchGame({ onClose, onCookTonight, onPlanWeek, toast }: Props) {
  const { lang, s } = useLang();
  const t = s(T);
  const c = s(COMMON);
  const [saved] = useState(load);
  const [phase, setPhase] = useState<'start' | 'swipe' | 'share' | 'results'>(saved ? 'share' : 'start');
  const [game, setGame] = useState<{ mode: MatchMode; seed: number } | null>(saved ? { mode: saved.mode, seed: saved.seed } : null);
  const [likes, setLikes] = useState<boolean[]>([]);
  const [mine, setMine] = useState<MatchVotes | null>(saved);
  const [partner, setPartner] = useState<MatchVotes | null>(null);
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState(saved?.name ?? '');
  const [paste, setPaste] = useState('');
  const [error, setError] = useState('');
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);

  const deck = useMemo(() => (game ? matchDeck(game.mode, game.seed) : []), [game]);
  const index = likes.length;
  const current = deck[index];

  const start = (mode: MatchMode) => {
    setGame({ mode, seed: newSeed() });
    setLikes([]);
    setPartner(null);
    setJoined(false);
    setPhase('swipe');
  };

  const readCode = (text: string): MatchVotes | null => {
    const d = decodeVotes(text);
    if (!d.ok) {
      setError(d.reason === 'version' ? t.version : t.invalid);
      return null;
    }
    setError('');
    return d.votes;
  };

  const join = () => {
    const v = readCode(paste);
    if (!v) return;
    setPartner(v);
    setJoined(true);
    setGame({ mode: v.mode, seed: v.seed });
    setLikes([]);
    setPaste('');
    setPhase('swipe');
  };

  const finish = (all: boolean[]) => {
    const v: MatchVotes = { mode: game!.mode, seed: game!.seed, likes: all, name };
    setMine(v);
    save(v);
    setPhase(partner ? 'results' : 'share');
  };

  const swipe = useSwipe((yes) => {
    const next = [...likes, yes];
    setLikes(next);
    if (next.length >= deck.length) finish(next);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (phase !== 'swipe' || !current) return;
      if (e.key === 'ArrowRight') swipe.decide(true);
      else if (e.key === 'ArrowLeft') swipe.decide(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const send = async () => {
    if (!mine) return;
    const text = t.message(encodeVotes(mine));
    try {
      if (isNative) await shareText(t.dialog, text);
      else if (navigator.share) await navigator.share({ title: t.dialog, text });
      else {
        await navigator.clipboard.writeText(text);
        toast(t.copied);
      }
    } catch {
      // The person closed the share sheet.
    }
  };

  const compare = () => {
    const v = readCode(paste);
    if (!v || !mine) return;
    if (!sameDeck(v, mine)) return setError(t.otherDeck);
    setPartner(v);
    setPaste('');
    setPhase('results');
  };

  const result = mine && partner ? compareVotes(mine, partner) : null;

  return (
    <div className="swipe-overlay" role="dialog" aria-modal aria-label={t.dialog}>
      <div className="swipe-wrap">
        <div className="spread">
          <button className="icon-btn" onClick={onClose} aria-label={c.close}>
            <Icon name="x" size={18} />
          </button>
          <b>{t.dialog}</b>
          <span className="muted small" style={{ minWidth: 34, textAlign: 'right' }}>
            {phase === 'swipe' && current ? t.count(index + 1, deck.length) : ''}
          </span>
        </div>

        {phase === 'start' && (
          <div className="stack">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44 }}>💞</div>
              <h2 style={{ margin: '4px 0' }}>{t.title}</h2>
              <p className="muted small" style={{ margin: 0 }}>
                {t.intro}
              </p>
            </div>
            <input className="input" placeholder={t.yourName} value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn primary block match-mode" onClick={() => start('tonight')}>
              <span>🍽️ {t.tonight}</span>
              <small>{t.tonightSub}</small>
            </button>
            <button className="btn block match-mode" onClick={() => start('week')}>
              <span>📅 {t.week}</span>
              <small>{t.weekSub}</small>
            </button>
            <div className="card flat stack" style={{ gap: 8 }}>
              <b>{t.joinTitle}</b>
              <textarea className="input" rows={3} placeholder={t.joinHint} value={paste} onChange={(e) => setPaste(e.target.value)} />
              {error && <div className="callout small">{error}</div>}
              <button className="btn" disabled={!paste.trim()} onClick={join}>
                {t.join}
              </button>
            </div>
          </div>
        )}

        {phase === 'swipe' && current && (
          <>
            <div className="swipe-stack">
              {deck[index + 1] && <MatchCardView key={cardKey(deck[index + 1])} card={deck[index + 1]} under />}
              <MatchCardView key={cardKey(current)} card={current} style={swipe.style} {...swipe.bind}>
                <Stamps yes={swipe.yes} no={swipe.no} yesLabel={t.yum} noLabel={t.nope} />
              </MatchCardView>
            </div>
            <div className="swipe-actions">
              <button className="swipe-btn no" onClick={() => swipe.decide(false)} aria-label={t.nope}>
                <Icon name="x" size={28} />
              </button>
              <button className="swipe-btn small" onClick={() => setLikes((l) => l.slice(0, -1))} disabled={!index} aria-label={t.undo}>
                <Icon name="refresh" size={20} />
              </button>
              <button className="swipe-btn yes" onClick={() => swipe.decide(true)} aria-label={t.yum}>
                <Icon name="heart" size={28} />
              </button>
            </div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <span className="muted tiny">{t.hint}</span>
            </div>
          </>
        )}

        {phase === 'share' && mine && (
          <div className="stack">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44 }}>📨</div>
              <h2 style={{ margin: '4px 0' }}>{t.sharedTitle}</h2>
              <p className="muted small" style={{ margin: 0 }}>
                {t.sharedSub}
              </p>
            </div>
            <code className="match-code">{encodeVotes(mine)}</code>
            <button className="btn primary block" onClick={() => void send()}>
              <Icon name="share" size={16} /> {t.send}
            </button>
            <textarea className="input" rows={3} placeholder={t.pasteBack} value={paste} onChange={(e) => setPaste(e.target.value)} />
            {error && <div className="callout small">{error}</div>}
            <button className="btn block" disabled={!paste.trim()} onClick={compare}>
              {t.see}
            </button>
            <button className="btn ghost" onClick={() => setPhase('start')}>
              {t.again}
            </button>
          </div>
        )}

        {phase === 'results' && result && mine && (
          <div className="stack">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44 }}>{result.dishes.length || result.cuisines.length ? '🎉' : '🤷'}</div>
              <h2 style={{ margin: '4px 0' }}>{result.dishes.length || result.cuisines.length ? t.matchTitle(partner?.name ?? '') : t.noMatch}</h2>
            </div>
            {result.cuisines.length > 0 && (
              <div className="row wrap" style={{ justifyContent: 'center' }}>
                {result.cuisines.map((x) => (
                  <span key={x} className="chip on swipe-chip" style={{ background: `linear-gradient(135deg, ${CUISINE_INFO[x].from}, ${CUISINE_INFO[x].to})`, borderColor: 'transparent' }}>
                    {CUISINE_INFO[x].emoji} {c.cuisine[x]}
                  </span>
                ))}
              </div>
            )}
            {(result.dishes.length ? result.dishes : result.maybe).length > 0 && (
              <div className="card flat">
                <h3 style={{ marginBottom: 6 }}>{result.dishes.length ? t.dishes : t.maybeTitle}</h3>
                <div className="list">
                  {(result.dishes.length ? result.dishes : result.maybe).map((r) => (
                    <div key={r.id} className="item match-dish">
                      <button className="match-thumb" style={{ background: thumbBackground(recipePhoto(r.id), CUISINE_INFO[r.cuisine].from, CUISINE_INFO[r.cuisine].to) }} onClick={() => setOpenRecipe(r.id)} aria-label={recipeName(r, lang)}>
                        {!recipePhoto(r.id) && r.emoji}
                      </button>
                      <button className="grow" style={{ border: 0, background: 'none', textAlign: 'left', padding: 0 }} onClick={() => setOpenRecipe(r.id)}>
                        <b className="small">{recipeName(r, lang)}</b>
                        <div className="muted tiny">
                          {c.cuisine[r.cuisine]} · {c.minutes(r.minutes)}
                        </div>
                      </button>
                      <button className="btn sm" onClick={() => onCookTonight(r.id)}>
                        {t.cookTonight}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {mine.mode === 'week' && (result.cuisines.length > 0 || result.dishes.length > 0) && (
              <button className="btn primary block" onClick={() => onPlanWeek(result.cuisines, result.dishes.map((r) => r.id))}>
                {t.planWeek}
              </button>
            )}
            {joined && (
              <button className="btn block" onClick={() => void send()}>
                <Icon name="share" size={16} /> {t.sendBack}
              </button>
            )}
            <button className="btn ghost" onClick={() => setPhase('start')}>
              {t.again}
            </button>
          </div>
        )}
      </div>
      {openRecipe && <RecipeSheet recipeId={openRecipe} onClose={() => setOpenRecipe(null)} onToast={toast} />}
    </div>
  );
}

const cardKey = (card: MatchCard) => (card.kind === 'dish' ? card.recipe.id : card.cuisine);

function MatchCardView({ card, under, children, ...rest }: { card: MatchCard; under?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  const { lang, s } = useLang();
  const c = s(COMMON);
  const t = s(T);
  if (card.kind === 'cuisine') {
    const info = CUISINE_INFO[card.cuisine];
    const photo = cuisinePhoto(card.cuisine);
    return (
      <div className={`swipe-card ${photo ? 'photo' : ''} ${under ? 'under' : ''}`} {...rest} style={{ background: cardBackground(photo, info.from, info.to), ...rest.style }} aria-hidden={under}>
        {children}
        <div className="swipe-emoji">{info.emoji}</div>
        <h2 className="swipe-title">
          {photo && `${info.emoji} `}
          {c.cuisine[card.cuisine]}
        </h2>
        <p className="swipe-tagline">{pick(info.tagline, lang)}</p>
        <div className="swipe-count">{t.cuisines}</div>
      </div>
    );
  }
  const r = card.recipe;
  const info = CUISINE_INFO[r.cuisine];
  const photo = recipePhoto(r.id);
  return (
    <div className={`swipe-card dish ${photo ? 'photo' : ''} ${under ? 'under' : ''}`} {...rest} style={{ background: cardBackground(photo, info.from, info.to), ...rest.style }} aria-hidden={under}>
      {children}
      <div className="swipe-emoji" style={{ fontSize: 70 }}>
        {r.emoji}
      </div>
      <h2 className="swipe-title" style={{ fontSize: 26 }}>
        {recipeName(r, lang)}
      </h2>
      <p className="swipe-tagline">
        {info.emoji} {c.cuisine[r.cuisine]} · {c.minutes(r.minutes)} · {c.difficulty[r.difficulty]}
      </p>
    </div>
  );
}
